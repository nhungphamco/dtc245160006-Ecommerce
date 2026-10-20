const {
    readSessionToken,
    setSessionCookie,
    clearSessionCookie
} = require("../middleware/sessionCookie");

function createAuthController(authService) {
    return {
        async register(req, res, next) {
            try {
                const session = await authService.register(req.body || {});
                setSessionCookie(res, req, session);

                res.status(201).json({
                    success: true,
                    data: { user: session.user }
                });
            } catch (error) {
                next(error);
            }
        },

        async login(req, res, next) {
            try {
                const session = await authService.login(req.body || {});
                setSessionCookie(res, req, session);

                res.status(200).json({
                    success: true,
                    data: { user: session.user }
                });
            } catch (error) {
                next(error);
            }
        },

        async logout(req, res, next) {
            try {
                await authService.logout(readSessionToken(req));
                clearSessionCookie(res, req);
                res.status(204).end();
            } catch (error) {
                next(error);
            }
        },

        async me(req, res, next) {
            try {
                const user = await authService.getUserForSession(
                    readSessionToken(req)
                );

                res.status(200).json({
                    success: true,
                    data: { user }
                });
            } catch (error) {
                next(error);
            }
        }
    };
}

module.exports = { createAuthController };
