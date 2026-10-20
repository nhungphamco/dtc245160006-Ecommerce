import { useEffect, useState } from 'react';
import { accountRequest } from '../services/accountApi';

export function useAccountResource(path) {
    const [version, setVersion] = useState(0);
    const [result, setResult] = useState(null);
    const key = `${path}:${version}`;
    useEffect(() => {
        const controller = new AbortController();
        accountRequest(path, { signal: controller.signal }).then(
            data => { if (!controller.signal.aborted) setResult({ key, data }); },
            error => { if (!controller.signal.aborted) setResult({ key, error }); }
        );
        return () => controller.abort();
    }, [path, key]);
    return {
        data: result?.key === key ? result.data : null,
        error: result?.key === key ? result.error : null,
        loading: result?.key !== key,
        retry: () => setVersion(value => value + 1)
    };
}
