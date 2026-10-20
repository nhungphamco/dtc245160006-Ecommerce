const orderService = require('../services/order.service');
function createOrderController(service = orderService) {
    return async function createOrder(req, res, next) {
        try {
            const result = await service.placeOrder(req.body, req.accountUser?.id ?? null);
            res.status(201).json({ success: true, message: 'Dat hang thanh cong', data: result });
        } catch (error) { next(error); }
    };
}
module.exports = { createOrderController, createOrder: createOrderController() };
