const productRepository = require("../repositories/product.repository");

// Lấy danh sách sản phẩm, hỗ trợ tìm kiếm, sắp xếp và phân trang
async function getProducts(query) {
    // 1. Xử lý từ khóa tìm kiếm
    const search = typeof query.search === "string"
        ? query.search.trim().slice(0, 100)
        : "";

    // 2. Kiểm tra kiểu sắp xếp
    const allowedSorts = [
        "newest",
        "price_asc",
        "price_desc"
    ];

    const sort = allowedSorts.includes(query.sort)
        ? query.sort
        : "newest";

    // 3. Hàm kiểm tra tham số phân trang
    function parsePositiveInteger(value, fallback, max) {
        if (value === undefined) {
            return fallback;
        }

        if (
            typeof value !== "string" ||
            !/^[1-9]\d*$/.test(value)
        ) {
            const error = new Error("Tham so phan trang khong hop le");
            error.status = 400;
            throw error;
        }

        const number = Number(value);

        if (
            !Number.isSafeInteger(number) ||
            number > max
        ) {
            const error = new Error("Tham so phan trang vuot gioi han");
            error.status = 400;
            throw error;
        }

        return number;
    }

    // 4. Xác định trang hiện tại và số sản phẩm mỗi trang
    const page = parsePositiveInteger(query.page, 1, 10000);
    const limit = parsePositiveInteger(query.limit, 8, 50);
    const offset = (page - 1) * limit;

    // 5. Truy vấn dữ liệu thông qua Repository
    const result = await productRepository.findAll({
        search,
        sort,
        limit,
        offset
    });

    // 6. Trả kết quả và thông tin phân trang
    return {
        products: result.rows,
        pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
        }
    };
}

// Lấy thông tin chi tiết một sản phẩm theo ID
async function getProductById(id) {
    // Kiểm tra ID hợp lệ
    if (
        !Number.isSafeInteger(id) ||
        id <= 0
    ) {
        const error = new Error("ID san pham khong hop le");
        error.status = 400;
        throw error;
    }

    // Truy vấn sản phẩm từ MySQL
    return await productRepository.findById(id);
}

// Xuất các hàm để Controller sử dụng
module.exports = {
    getProducts,
    getProductById
};