const express = require('express');
const { createSessionGuard } = require('../middleware/accountSession');
const { requireAdmin } = require('../middleware/requireAdmin');
const { createAuthOriginGuard } = require('../middleware/authOrigin');
const { createAdminController } = require('../controllers/admin.controller');

function createAdminRouter({ authService, adminService }) {
    const router = express.Router();
    const controller = createAdminController(adminService);
    const requireTrustedOrigin = createAuthOriginGuard();
    router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    router.use(createSessionGuard(authService), requireAdmin);
    router.use((req, res, next) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? next() : requireTrustedOrigin(req, res, next));
    router.get('/dashboard', controller.dashboard);
    router.get('/products', controller.products);
    router.post('/products', controller.createProduct);
    router.get('/products/:id', controller.product);
    router.patch('/products/:id', controller.updateProduct);
    router.get('/orders', controller.orders);
    router.get('/orders/:id', controller.order);
    router.patch('/orders/:id/status', controller.updateOrderStatus);
    router.get('/customers', controller.customers);
    return router;
}
module.exports = { createAdminRouter };
