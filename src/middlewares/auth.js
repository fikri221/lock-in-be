import authService from "../services/auth.service.js";


const auth = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "No authentication token provided" });
        }

        const token = authHeader.replace("Bearer ", "");

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

export default auth;