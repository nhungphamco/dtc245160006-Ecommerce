const { createHash, randomBytes } = require("node:crypto");

const authRepository = require("../repositories/auth.repository");
const passwordService = require("./password.service");

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 1024;

function createHttpError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

function validateEmail(email) {
    return typeof email === "string" &&
        email.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
    return typeof password === "string" &&
        password.length >= MIN_PASSWORD_LENGTH &&
        Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_BYTES;
}

function toPublicUser(user) {
    return {
        id: user.id,
        fullName: user.fullName ?? user.full_name,
        email: user.email,
        role: user.role
    };
}

function tokenHash(token) {
    return createHash("sha256").update(token, "utf8").digest("hex");
}

function toMySqlUtcDate(date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function createAuthService({
    repository = authRepository,
    passwords = passwordService,
    now = () => new Date(),
    createToken = () => randomBytes(32).toString("base64url")
} = {}) {
    const dummyHashPromise = passwords.hashPassword(
        randomBytes(32).toString("base64url")
    );

    async function issueSession(user) {
        const token = createToken();
        const expiresAt = new Date(now().getTime() + SESSION_TTL_MS);

        await repository.createSession({
            userId: user.id,
            tokenHash: tokenHash(token),
            expiresAt: toMySqlUtcDate(expiresAt)
        });

        return {
            user: toPublicUser(user),
            token,
            expiresAt
        };
    }

    return {
        async register({ fullName, email, password }) {
            if (
                typeof fullName !== "string" ||
                fullName.trim().length < 2 ||
                fullName.trim().length > 100
            ) {
                throw createHttpError("Thong tin dang ky khong hop le", 400);
            }

            if (!validateEmail(email)) {
                throw createHttpError("Thong tin dang ky khong hop le", 400);
            }

            if (!validatePassword(password)) {
                throw createHttpError(
                    "Mat khau phai co it nhat 12 ky tu va khong vuot qua 1024 byte",
                    400
                );
            }

            const normalizedEmail = normalizeEmail(email);
            const passwordHash = await passwords.hashPassword(password);
            const token = createToken();
            const expiresAt = new Date(now().getTime() + SESSION_TTL_MS);
            let user;

            try {
                user = await repository.createUserAndSession({
                    fullName: fullName.trim(),
                    email: normalizedEmail,
                    passwordHash,
                    tokenHash: tokenHash(token),
                    expiresAt: toMySqlUtcDate(expiresAt)
                });
            } catch (error) {
                if (error.code === "ER_DUP_ENTRY") {
                    throw createHttpError(
                        "Khong the tao tai khoan voi thong tin nay",
                        409
                    );
                }

                throw error;
            }

            return {
                user: toPublicUser(user),
                token,
                expiresAt
            };
        },

        async login({ email, password }) {
            if (
                !validateEmail(email) ||
                !validatePassword(password)
            ) {
                throw createHttpError("Email hoac mat khau khong dung", 401);
            }

            const user = await repository.findUserByEmail(
                normalizeEmail(email)
            );
            const passwordHash = user
                ? user.password_hash
                : await dummyHashPromise;
            const passwordMatches = await passwords.verifyPassword(
                passwordHash,
                password
            );

            if (!user || !user.is_active || !passwordMatches) {
                throw createHttpError("Email hoac mat khau khong dung", 401);
            }

            return issueSession(user);
        },

        async getUserForSession(token) {
            if (typeof token !== "string" || token.length < 32 || token.length > 128) {
                throw createHttpError("Can dang nhap", 401);
            }

            const user = await repository.findUserBySessionTokenHash(
                tokenHash(token)
            );

            if (!user) {
                throw createHttpError("Can dang nhap", 401);
            }

            return toPublicUser(user);
        },

        async logout(token) {
            if (typeof token === "string" && token.length >= 32 && token.length <= 128) {
                await repository.deleteSession(tokenHash(token));
            }
        }
    };
}

module.exports = { createAuthService };
