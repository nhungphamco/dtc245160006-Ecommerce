const productRepository = require("../repositories/product.repository");

async function getProducts() {
    return await productRepository.findAll();
}

module.exports = { getProducts };