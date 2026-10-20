function parseAllowedOrigins() {
    const configuredOrigins = [
        process.env.APP_ORIGIN,
        ...(process.env.AUTH_ALLOWED_ORIGINS || "").split(",")
    ]
        .filter((origin) => typeof origin === "string")
        .map((origin) => origin.trim())
        .filter(Boolean);

    return new Set(configuredOrigins.map((origin) => new URL(origin).origin));
}

function createAuthOriginGuard({ allowedOrigins = parseAllowedOrigins() } = {}) {
    return function requireTrustedOrigin(req, res, next) {
        const requestOrigin = req.get("origin");

        if (!requestOrigin || requestOrigin === "null") {
            return res.status(403).json({
                success: false,
                message: "Nguon yeu cau khong duoc phep"
            });
        }

        let normalizedOrigin;

        try {
            const parsedOrigin = new URL(requestOrigin);

            if (
                !["http:", "https:"].includes(parsedOrigin.protocol) ||
                parsedOrigin.origin !== requestOrigin
            ) {
                throw new Error("Invalid origin");
            }

            normalizedOrigin = parsedOrigin.origin;
        } catch {
            return res.status(403).json({
                success: false,
                message: "Nguon yeu cau khong duoc phep"
            });
        }

        const expectedOrigin = allowedOrigins.size > 0
            ? allowedOrigins.has(normalizedOrigin)
            : normalizedOrigin === `${req.protocol}://${req.get("host")}`;

        if (!expectedOrigin) {
            return res.status(403).json({
                success: false,
                message: "Nguon yeu cau khong duoc phep"
            });
        }

        next();
    };
}

module.exports = { createAuthOriginGuard };
