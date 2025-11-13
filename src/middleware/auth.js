const jwt = require("jsonwebtoken");
const { User } = require("../models");


const auth = async (req, res, next) => {
    try {
        // Simulate authentication check
        const token = req.headers.authorization.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ error: "No authentication token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        req.user = user;
        req.userId = user.id;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid authentication token", details: error.message });
    }
}

module.exports = auth;