function createAccountController(service) {
    const handle = action => async (req, res, next) => {
        try { res.json({ success: true, data: await action(req) }); }
        catch (error) { next(error); }
    };
    return {
        profile: handle(async req => ({ user: await service.getProfile(req.accountUser.id) })),
        updateProfile: handle(async req => ({ user: await service.updateProfile(req.accountUser.id, req.body) })),
        orders: handle(req => service.listOrders(req.accountUser.id, req.query)),
        order: handle(async req => ({ order: await service.getOrder(req.accountUser.id, req.params.id) }))
    };
}
module.exports = { createAccountController };
