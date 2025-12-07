import authService from "../services/auth.service.js";


export const auth = async (req, res, next) => {
    try {
        // Extract token from Authorization header or Cookie
        let token;

        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.replace("Bearer ", "");
        }

        if (!token) {
            return res.status(401).json({ error: "No authentication token provided" });
        }

        // Use AuthService to verify token and get user
        const user = await authService.verifyToken(token);

        req.user = user;
        req.userId = user.id;
        next();
    } catch (error) {
        return res.status(401).json({
            error: error.message || "Invalid authentication token",
            details: error.message
        });
    }
}

export const optionalAuth = async (req, res, next) => {
    try {
        // Extract token from Authorization header or Cookie
        let token;

        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.replace("Bearer ", "");
        }

        if (!token) {
            req.user = null;
            return next();
        }

        // Use AuthService to verify token and get user
        try {
            const user = await authService.verifyToken(token);
            req.user = user;
            req.userId = user.id;
        } catch {
            // If token is invalid, we just treat it as anonymous
            req.user = null;
        }

        next();
    } catch {
        req.user = null;
        next();
    }
}

export default auth;