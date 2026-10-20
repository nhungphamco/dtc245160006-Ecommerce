const express = require('express');
const { createOrderController } = require('../controllers/order.controller');
const { createSessionGuard, hasSessionCookie } = require('../middleware/accountSession');
const { createAuthOriginGuard } = require('../middleware/authOrigin');

function createOrderRouter({ authService, orderService }) {
    const router = express.Router();
    const originGuard = createAuthOriginGuard();
    router.post('/', createSessionGuard(authService, { optional: true }), (req, res, next) => {
        // Preserve guest checkout; cookie-authenticated writes must pass CSRF protection.
        if (hasSessionCookie(req)) return originGuard(req, res, next);
        next();
    }, createOrderController(orderService));
    return router;
}
module.exports = { createOrderRouter };
