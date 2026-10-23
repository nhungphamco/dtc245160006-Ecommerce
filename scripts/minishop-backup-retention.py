#!/usr/bin/env python3
"""Keep seven completed MiniShop automatic backups; default is preview only."""
import argparse
import fcntl
import gzip
import hashlib
import os
from pathlib import Path
import re
import stat

ROOT = Path('/home/minishop/minishop-backups/automatic')
NAME = re.compile(r'backup-[0-9]{8}T[0-9]{6}Z-[A-Za-z0-9]{6}')
EXPECTED = {'database.sql.gz', 'SHA256SUMS', 'metadata.txt', 'COMPLETE', 'dump.stderr.partial'}

def checked_root(root):
    st = root.lstat()
    if not stat.S_ISDIR(st.st_mode) or root.resolve() != root or st.st_uid != 0 or stat.S_IMODE(st.st_mode) != 0o700:
        raise RuntimeError('BACKUP_ROOT_UNSAFE')

def inventory(root):
    checked_root(root)
    completed = []
    retained_other = 0
    for folder in root.iterdir():
        if not NAME.fullmatch(folder.name) or folder.is_symlink() or not folder.is_dir():
            retained_other += 1
            continue
        if not (folder / 'COMPLETE').is_file():
            retained_other += 1
            continue
        st = folder.lstat()
        if st.st_uid != 0 or stat.S_IMODE(st.st_mode) != 0o700:
            raise RuntimeError('COMPLETED_DIRECTORY_PERMISSIONS_UNEXPECTED')
        children = list(folder.iterdir())
        if {p.name for p in children} != EXPECTED:
            raise RuntimeError('COMPLETED_BACKUP_CONTENTS_UNEXPECTED')
        for item in children:
            st = item.lstat()
            if not stat.S_ISREG(st.st_mode) or st.st_uid != 0 or stat.S_IMODE(st.st_mode) != 0o600:
                raise RuntimeError('BACKUP_FILE_UNSAFE')
        if (folder / 'COMPLETE').read_text() != 'BACKUP_COMPLETE\n':
            raise RuntimeError('COMPLETE_MARKER_INVALID')
        manifest = (folder / 'SHA256SUMS').read_text()
        match = re.fullmatch(r'([a-f0-9]{64})  database[.]sql[.]gz\n', manifest)
        if not match:
            raise RuntimeError('MANIFEST_INVALID')
        digest = hashlib.sha256()
        with (folder / 'database.sql.gz').open('rb') as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                digest.update(chunk)
        if digest.hexdigest() != match.group(1):
            raise RuntimeError('BACKUP_CHECKSUM_MISMATCH_NO_DELETION')
        # Verify compression as well; stream without loading the SQL into memory.
        with gzip.open(folder / 'database.sql.gz', 'rb') as stream:
            while stream.read(1024 * 1024):
                pass
        completed.append(folder)
    completed.sort(key=lambda p: p.name, reverse=True)
    return completed[:7], completed[7:], retained_other

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='delete validated completed backups older than newest seven')
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise RuntimeError('ROOT_REQUIRED')
    with open('/run/lock/minishop-db-backup.lock', 'a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        kept, removed, other = inventory(ROOT)
        print(f'COMPLETED_VALIDATED={len(kept) + len(removed)} KEEP={len(kept)} DELETE_CANDIDATES={len(removed)} OTHER_RETAINED={other}')
        for folder in removed:
            print(('DELETE=' if args.apply else 'WOULD_DELETE=') + folder.name)
        if args.apply:
            # All complete backups were validated before any deletion. No recursive
            # delete: only the five known regular files inside a direct child.
            for folder in removed:
                if folder.parent != ROOT or folder.resolve().parent != ROOT:
                    raise RuntimeError('DELETION_PATH_UNSAFE')
                for name in sorted(EXPECTED):
                    (folder / name).unlink()
                folder.rmdir()
        print('RETENTION_APPLY_OK' if args.apply else 'RETENTION_PREVIEW_ONLY_NO_DELETION')

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('RETENTION_FAILED: ' + type(error).__name__)
        raise SystemExit(1)
