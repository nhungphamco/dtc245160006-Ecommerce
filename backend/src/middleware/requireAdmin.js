function requireAdmin(req, res, next) {
    if (req.accountUser?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Can quyen quan tri vien' });
    }
    next();
}
module.exports = { requireAdmin };
