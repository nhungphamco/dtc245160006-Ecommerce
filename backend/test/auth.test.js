const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { createServer } = require("node:http");

const { createApp } = require("../src/app");
const {
    COOKIE_NAME,
    setSessionCookie
} = require("../src/middleware/sessionCookie");
const { createAuthService } = require("../src/services/auth.service");
const passwordService = require("../src/services/password.service");

function createFixture(options = {}) {
    const users = new Map();
    const sessions = new Map();
    let nextId = 1;
    let nextToken = 0;
    const repository = {
        async createUserAndSession({
            fullName,
            email,
            passwordHash,
            tokenHash
        }) {
            if (users.has(email)) {
                const error = new Error("Duplicate email");
                error.code = "ER_DUP_ENTRY";
                throw error;
            }

            const user = {
                id: nextId++,
                full_name: fullName,
                email,
                password_hash: passwordHash,
                role: "customer",
                is_active: true
            };
            users.set(email, user);
            sessions.set(tokenHash, user.id);
            return user;
        },
        async findUserByEmail(email) {
            return users.get(email) || null;
        },
        async createSession(session) {
            sessions.set(session.tokenHash, session.userId);
        },
        async findUserBySessionTokenHash(tokenHash) {
            const userId = sessions.get(tokenHash);
            return [...users.values()].find((user) => user.id === userId) || null;
        },
        async deleteSession(tokenHash) {
            sessions.delete(tokenHash);
        }
    };
    const passwords = {
        async hashPassword(password) {
            return `test-hash:${password}`;
        },
        async verifyPassword(hash, password) {
            return hash === `test-hash:${password}`;
        }
    };

    const authService = createAuthService({
        repository,
        passwords,
        createToken: () => `test-session-token-${String(++nextToken).padStart(30, "0")}`
    });
    const app = createApp({
        database: { query: async () => [[{ ok: 1 }]] },
        authService,
        loginRateLimit: options.loginRateLimit
    });
    const server = createServer(app);

    return {
        users,
        sessions,
        server,
        async start() {
            await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
            const address = server.address();
            this.baseUrl = `http://127.0.0.1:${address.port}`;
            this.origin = this.baseUrl;
        },
        async stop() {
            await new Promise((resolve, reject) => {
                server.close((error) => error ? reject(error) : resolve());
            });
        },
        async request(path, init = {}) {
            const headers = new Headers(init.headers);

            if (init.method && init.method !== "GET" && !headers.has("Origin")) {
                headers.set("Origin", this.origin);
            }

            return fetch(`${this.baseUrl}${path}`, {
                ...init,
                headers
            });
        }
    };
}

async function withFixture(run, options) {
    const fixture = createFixture(options);
    await fixture.start();

    try {
        await run(fixture);
    } finally {
        await fixture.stop();
    }
}

function sessionCookie(response) {
    const setCookie = response.headers.get("set-cookie");
    assert.ok(setCookie, "expected Set-Cookie header");
    return setCookie.split(";")[0];
}

test("register creates only a customer and never returns secrets", async () => {
    await withFixture(async (fixture) => {
        const response = await fixture.request("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Test Customer",
                email: "TEST@example.com",
                password: "correct-horse-battery",
                role: "admin"
            })
        });
        const body = await response.json();
        const cookie = response.headers.get("set-cookie");

        assert.equal(response.status, 201);
        assert.deepEqual(body.data.user, {
            id: 1,
            fullName: "Test Customer",
            email: "test@example.com",
            role: "customer"
        });
        assert.equal(JSON.stringify(body).includes("password_hash"), false);
        assert.equal(JSON.stringify(body).includes("test-session-token"), false);
        assert.match(cookie, /HttpOnly/i);
        assert.match(cookie, /SameSite=Lax/i);
        assert.doesNotMatch(cookie, /;\s*Secure/i);

        const savedUser = fixture.users.get("test@example.com");
        assert.equal(savedUser.role, "customer");
        assert.notEqual(savedUser.password_hash, "correct-horse-battery");

        const storedTokenHash = [...fixture.sessions.keys()][0];
        assert.match(storedTokenHash, /^[a-f0-9]{64}$/);
        assert.notEqual(storedTokenHash, cookie.split("=")[1]);
    });
});

test("register validates input and handles duplicate email safely", async () => {
    await withFixture(async (fixture) => {
        const invalid = await fixture.request("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "A",
                email: "bad",
                password: "short"
            })
        });
        assert.equal(invalid.status, 400);

        const registration = {
            fullName: "Test Customer",
            email: "test@example.com",
            password: "correct-horse-battery"
        };

        const first = await fixture.request("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(registration)
        });
        const duplicate = await fixture.request("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(registration)
        });

        assert.equal(first.status, 201);
        assert.equal(duplicate.status, 409);
    });
});

test("login uses a generic failure and establishes an authenticated session", async () => {
    await withFixture(async (fixture) => {
        await fixture.request("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Test Customer",
                email: "test@example.com",
                password: "correct-horse-battery"
            })
        });

        const wrongPassword = await fixture.request("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "test@example.com",
                password: "wrong-password-123"
            })
        });
        const unknownUser = await fixture.request("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "missing@example.com",
                password: "wrong-password-123"
            })
        });

        assert.equal(wrongPassword.status, 401);
        assert.deepEqual(await wrongPassword.json(), await unknownUser.json());

        const login = await fixture.request("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "TEST@example.com",
                password: "correct-horse-battery"
            })
        });
        const body = await login.json();

        assert.equal(login.status, 200);
        assert.equal(body.data.user.email, "test@example.com");

        const me = await fixture.request("/api/auth/me", {
            headers: { Cookie: sessionCookie(login) }
        });

        assert.equal(me.status, 200);
        assert.equal((await me.json()).data.user.id, 1);
    });
});

test("me rejects missing or invalid session and logout revokes a valid session", async () => {
    await withFixture(async (fixture) => {
        const noSession = await fixture.request("/api/auth/me");
        assert.equal(noSession.status, 401);

        const registration = await fixture.request("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Test Customer",
                email: "test@example.com",
                password: "correct-horse-battery"
            })
        });
        const cookie = sessionCookie(registration);

        const logout = await fixture.request("/api/auth/logout", {
            method: "POST",
            headers: { Cookie: cookie }
        });
        assert.equal(logout.status, 204);
        assert.match(logout.headers.get("set-cookie"), /Expires=Thu, 01 Jan 1970/i);

        const afterLogout = await fixture.request("/api/auth/me", {
            headers: { Cookie: cookie }
        });
        assert.equal(afterLogout.status, 401);
        assert.equal(fixture.sessions.size, 0);
    });
});

test("mutating auth endpoints reject missing and untrusted Origin", async () => {
    await withFixture(async (fixture) => {
        const missingOrigin = await fetch(`${fixture.baseUrl}/api/auth/logout`, {
            method: "POST"
        });
        const untrustedOrigin = await fixture.request("/api/auth/logout", {
            method: "POST",
            headers: { Origin: "https://attacker.example" }
        });

        assert.equal(missingOrigin.status, 403);
        assert.equal(untrustedOrigin.status, 403);
    });
});

test("login endpoint rate limits repeated attempts", async () => {
    await withFixture(async (fixture) => {
        const attempt = () => fixture.request("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "missing@example.com",
                password: "wrong-password-123"
            })
        });

        assert.equal((await attempt()).status, 401);
        assert.equal((await attempt()).status, 429);
    }, {
        loginRateLimit: {
            windowMs: 60_000,
            limit: 1
        }
    });
});

test("Argon2id password hashes verify without storing the plaintext password", async () => {
    const password = "correct-horse-battery";
    const hash = await passwordService.hashPassword(password);

    assert.match(hash, /^\$argon2id\$/);
    assert.notEqual(hash, password);
    assert.equal(await passwordService.verifyPassword(hash, password), true);
    assert.equal(await passwordService.verifyPassword(hash, "different-password"), false);
});

test("session cookie is marked Secure when the request is HTTPS", () => {
    let cookieOptions;
    const response = {
        cookie(name, value, options) {
            assert.equal(name, COOKIE_NAME);
            assert.equal(value, "opaque-session-token");
            cookieOptions = options;
        }
    };

    setSessionCookie(
        response,
        { secure: true },
        {
            token: "opaque-session-token",
            expiresAt: new Date(Date.now() + 60_000)
        }
    );

    assert.equal(cookieOptions.httpOnly, true);
    assert.equal(cookieOptions.secure, true);
    assert.equal(cookieOptions.sameSite, "lax");
    assert.equal(cookieOptions.path, "/");
});
