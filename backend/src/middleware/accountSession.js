const { COOKIE_NAME, readSessionToken } = require('./sessionCookie');

// Detect presence separately: an empty/malformed cookie is not a guest session.
function hasSessionCookie(req) {
    return typeof req.headers.cookie === 'string' && req.headers.cookie.split(';')
        .some(entry => entry.trim().split('=')[0].trim() === COOKIE_NAME);
}

function createSessionGuard(authService, { optional = false } = {}) {
    return async function authenticateSession(req, res, next) {
        try {
            if (optional && !hasSessionCookie(req)) return next();
            req.accountUser = await authService.getUserForSession(readSessionToken(req));
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = { createSessionGuard, hasSessionCookie };
