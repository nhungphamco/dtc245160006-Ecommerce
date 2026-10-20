function createAdminController(service) {
    const handle = (action, status = 200) => async (req, res, next) => {
        try { res.status(status).json({ success: true, data: await action(req) }); }
        catch (error) { next(error); }
    };
    return {
        dashboard: handle(() => service.dashboard()),
        products: handle(req => service.products(req.query)),
        product: handle(async req => ({ product: await service.product(req.params.id) })),
        createProduct: handle(async req => ({ product: await service.createProduct(req.body) }), 201),
        updateProduct: handle(async req => ({ product: await service.updateProduct(req.params.id, req.body) })),
        orders: handle(req => service.orders(req.query)),
        order: handle(async req => ({ order: await service.order(req.params.id) })),
        updateOrderStatus: handle(req => service.updateOrderStatus(req.params.id, req.body)),
        customers: handle(req => service.customers(req.query))
    };
}
module.exports = { createAdminController };
