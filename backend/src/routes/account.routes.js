const express = require('express');
const { createAccountController } = require('../controllers/account.controller');
const { createSessionGuard } = require('../middleware/accountSession');
const { createAuthOriginGuard } = require('../middleware/authOrigin');

function createAccountRouter({ authService, accountService }) {
    const router = express.Router();
    const controller = createAccountController(accountService);
    router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    router.use(createSessionGuard(authService));
    router.get('/profile', controller.profile);
    router.patch('/profile', createAuthOriginGuard(), controller.updateProfile);
    router.get('/orders', controller.orders);
    router.get('/orders/:id', controller.order);
    return router;
}
module.exports = { createAccountRouter };
