const pool = require("../config/database");

async function createUserAndSession({
    fullName,
    email,
    passwordHash,
    tokenHash,
    expiresAt
}) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [userResult] = await connection.execute(
            `INSERT INTO users (full_name, email, password_hash, role)
             VALUES (?, ?, ?, 'customer')`,
            [fullName, email, passwordHash]
        );

        await connection.execute(
            `INSERT INTO sessions (user_id, token_hash, expires_at)
             VALUES (?, ?, ?)`,
            [userResult.insertId, tokenHash, expiresAt]
        );

        await connection.commit();

        return {
            id: userResult.insertId,
            fullName,
            email,
            role: "customer"
        };
    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error("Authentication transaction rollback failed:", rollbackError);
        }

        throw error;
    } finally {
        connection.release();
    }
}

async function findUserByEmail(email) {
    const [rows] = await pool.execute(
        `SELECT id, full_name, email, password_hash, role, is_active
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    return rows[0] || null;
}

async function createSession({ userId, tokenHash, expiresAt }) {
    await pool.execute(
        `INSERT INTO sessions (user_id, token_hash, expires_at)
         VALUES (?, ?, ?)`,
        [userId, tokenHash, expiresAt]
    );
}

async function findUserBySessionTokenHash(tokenHash) {
    const [rows] = await pool.execute(
        `SELECT u.id, u.full_name, u.email, u.role
         FROM sessions s
         INNER JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?
           AND s.expires_at > UTC_TIMESTAMP()
           AND u.is_active = TRUE
         LIMIT 1`,
        [tokenHash]
    );

    return rows[0] || null;
}

async function deleteSession(tokenHash) {
    await pool.execute(
        "DELETE FROM sessions WHERE token_hash = ?",
        [tokenHash]
    );
}

module.exports = {
    createUserAndSession,
    findUserByEmail,
    createSession,
    findUserBySessionTokenHash,
    deleteSession
};
