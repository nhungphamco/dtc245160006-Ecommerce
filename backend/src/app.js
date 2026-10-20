const express = require("express");
const helmet = require("helmet");
const { createAdminRouter } = require("./routes/admin.routes");
const { createAdminService } = require("./services/admin.service");
const { createAdminRepository } = require("./repositories/admin.repository");

const pool = require("./config/database");
const { createAuthRouter } = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const { createOrderRouter } = require("./routes/order.routes");
const { createAccountRouter } = require("./routes/account.routes");
const { createAccountService } = require("./services/account.service");
const { createAccountRepository } = require("./repositories/account.repository");
const { createOrderService } = require("./services/order.service");
const { createOrderRepository } = require("./repositories/order.repository");
const { createAuthService } = require("./services/auth.service");

function configureTrustProxy(app) {
    const trustedProxy = process.env.TRUST_PROXY;

    if (!trustedProxy) {
        return;
    }

    if (/^\d+$/.test(trustedProxy)) {
        app.set("trust proxy", Number(trustedProxy));
        return;
    }

    app.set(
        "trust proxy",
        trustedProxy.split(",").map((entry) => entry.trim()).filter(Boolean)
    );
}

function createApp({
    database = pool,
    authRepository,
    authService,
    accountRepository,
    adminRepository,
    orderRepository,
    loginRateLimit,
    registerRateLimit
} = {}) {
    const app = express();

    app.disable("x-powered-by");
    configureTrustProxy(app);

    app.use(helmet({
        strictTransportSecurity: false
    }));
    app.use(express.json({ limit: "100kb" }));

    app.get("/api/health", async (req, res) => {
        try {
            await database.query("SELECT 1");

            res.status(200).json({
                status: "ok",
                database: "connected"
            });
        } catch (error) {
            console.error("Database healthcheck failed:", error.message);

            res.status(503).json({
                status: "unavailable"
            });
        }
    });

    const resolvedAuthService = authService || createAuthService(
        authRepository ? { repository: authRepository } : undefined
    );

    app.use(
        "/api/auth",
        createAuthRouter({
            authService: resolvedAuthService,
            loginRateLimit,
            registerRateLimit
        })
    );
    app.use("/api/admin", createAdminRouter({
        authService: resolvedAuthService,
        adminService: createAdminService({ repository: adminRepository || createAdminRepository(database) })
    }));
    app.use("/api/products", productRoutes);
    app.use("/api/account", createAccountRouter({
        authService: resolvedAuthService,
        accountService: createAccountService({ repository: accountRepository || createAccountRepository(database) })
    }));
    app.use("/api/orders", createOrderRouter({
        authService: resolvedAuthService,
        orderService: createOrderService({ repository: orderRepository || createOrderRepository(database) })
    }));

    app.use((req, res) => {
        res.status(404).json({
            success: false,
            message: "API khong ton tai"
        });
    });

    app.use((err, req, res, next) => {
        const status =
            Number.isInteger(err.status) &&
            err.status >= 400 &&
            err.status <= 599
                ? err.status
                : 500;

        if (status >= 500) {
            console.error("API error:", err);
        }

        res.status(status).json({
            success: false,
            message: status < 500
                ? err.message
                : "Loi he thong"
        });
    });

    return app;
}

module.exports = { createApp };
