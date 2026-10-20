const pool = require('../config/database');
const { httpError } = require('../services/adminRules');

function createBootstrapRepository(database = pool) {
    return {
        async createFirstAdmin({ fullName, email, passwordHash }) {
            const connection = await database.getConnection();
            let locked = false;
            let started = false;
            try {
                const [[lock]] = await connection.execute("SELECT GET_LOCK('minishop-bootstrap-admin', 10) AS acquired");
                if (Number(lock.acquired) !== 1) throw httpError('Khong lay duoc khoa bootstrap. Thu lai sau', 409);
                locked = true;
                await connection.beginTransaction(); started = true;
                const [admins] = await connection.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1 FOR UPDATE");
                if (admins.length) throw httpError('Da ton tai Admin; khong duoc bootstrap lan nua', 409);
                const [result] = await connection.execute("INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'admin')", [fullName, email, passwordHash]);
                await connection.commit(); started = false;
                return { id: result.insertId, fullName, email, role: 'admin' };
            } catch (error) {
                if (started) {
                    try { await connection.rollback(); } catch { console.error('Bootstrap rollback failed'); }
                }
                if (error.code === 'ER_DUP_ENTRY') throw httpError('Email da duoc su dung. Khong tu nang quyen tai khoan cu', 409);
                throw error;
            } finally {
                let reusable = true;
                if (locked) {
                    try { await connection.execute("SELECT RELEASE_LOCK('minishop-bootstrap-admin')"); }
                    catch { reusable = false; connection.destroy(); }
                }
                if (reusable) connection.release();
            }
        }
    };
}
module.exports = { createBootstrapRepository };
