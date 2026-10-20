const COOKIE_NAME = "minishop_session";

function readSessionToken(req) {
    const cookieHeader = req.headers.cookie;

    if (typeof cookieHeader !== "string") {
        return null;
    }

    for (const cookie of cookieHeader.split(";")) {
        const separator = cookie.indexOf("=");

        if (separator < 0 || cookie.slice(0, separator).trim() !== COOKIE_NAME) {
            continue;
        }

        const value = cookie.slice(separator + 1).trim();

        try {
            return decodeURIComponent(value);
        } catch {
            return null;
        }
    }

    return null;
}

function sessionCookieOptions(req, maxAge) {
    return {
        httpOnly: true,
        secure: req.secure,
        sameSite: "lax",
        path: "/",
        ...(maxAge === undefined ? {} : { maxAge })
    };
}

function setSessionCookie(res, req, session) {
    res.cookie(
        COOKIE_NAME,
        session.token,
        sessionCookieOptions(req, session.expiresAt.getTime() - Date.now())
    );
}

function clearSessionCookie(res, req) {
    res.clearCookie(COOKIE_NAME, sessionCookieOptions(req));
}

module.exports = {
    COOKIE_NAME,
    readSessionToken,
    setSessionCookie,
    clearSessionCookie
};
