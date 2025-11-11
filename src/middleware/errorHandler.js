

const errorHandler = (err, req, res, next) => {
    console.error("Error: ", err);


    // Sequelize validation error
    if (err.name === "SequelizeValidationError") {
        const messages = err.errors.map(e => e.message);
        return res.status(400).json({ error: messages });
    }
    // Sequelize unique constraint error
    if (err.name === "SequelizeUniqueConstraintError") {
        const messages = err.errors.map(e => e.message);
        return res.status(400).json({ error: messages });
    }

    // JWT error
    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Invalid token" });
    }
    // JWT expired error
    if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token has expired" });
    }

    // Default to 500 server error
    res.status(500).json({ error: "Internal Server Error" });
}

module.exports = errorHandler;