const argon2 = require("argon2");

const options = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
};

async function hashPassword(password) {
    return argon2.hash(password, options);
}

async function verifyPassword(passwordHash, password) {
    return argon2.verify(passwordHash, password);
}

module.exports = { hashPassword, verifyPassword };
