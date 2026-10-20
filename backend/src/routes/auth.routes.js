const express = require("express");
const rateLimit = require("express-rate-limit");

const { createAuthController } = require("../controllers/auth.controller");
const { createAuthOriginGuard } = require("../middleware/authOrigin");
const { createAuthService } = require("../services/auth.service");

function createAuthRouter({
    authService = createAuthService(),
    loginRateLimit = {},
    registerRateLimit = {}
} = {}) {
    const router = express.Router();
    const controller = createAuthController(authService);
    const requireTrustedOrigin = createAuthOriginGuard();

    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: {
            success: false,
            message: "Qua nhieu lan thu dang nhap. Vui long thu lai sau."
        },
        ...loginRateLimit
    });

    const registerLimiter = rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 5,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: {
            success: false,
            message: "Qua nhieu lan dang ky. Vui long thu lai sau."
        },
        ...registerRateLimit
    });

    router.post(
        "/register",
        requireTrustedOrigin,
        registerLimiter,
        controller.register
    );
    router.post(
        "/login",
        requireTrustedOrigin,
        loginLimiter,
        controller.login
    );
    router.post("/logout", requireTrustedOrigin, controller.logout);
    router.get("/me", controller.me);

    return router;
}

module.exports = { createAuthRouter };
