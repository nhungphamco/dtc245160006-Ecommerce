const passwords = require('./password.service');
const { createBootstrapRepository } = require('../repositories/bootstrap.repository');
const { httpError } = require('./adminRules');

function createBootstrapService({ repository = createBootstrapRepository(), passwordService = passwords } = {}) {
    return {
        async createFirstAdmin({ fullName, email, password, confirmation, approval }) {
            if (approval !== 'CREATE FIRST ADMIN') throw httpError('Chua xac nhan bootstrap');
            if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(fullName)) throw httpError('Ho ten khong hop le');
            if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError('Email khong hop le');
            if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 1024 || password !== confirmation) throw httpError('Mat khau toi thieu 12 ky tu, toi da 1024 byte va phai trung khop');
            return repository.createFirstAdmin({ fullName: fullName.trim(), email: email.trim().toLowerCase(), passwordHash: await passwordService.hashPassword(password) });
        }
    };
}
module.exports = { createBootstrapService };
