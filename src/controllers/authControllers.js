import { User } from "../models/index.js";
import { sequelize } from "../config/database.js";
import jwt from "jsonwebtoken";

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

const authControllers = {
    register: async (req, res, next) => {
        const t = await sequelize.transaction(); // start transaction
        try {
            const { name, email, password } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(409).json({ error: "Email is already registered" });
            }

            // Create new user
            const newUser = await User.create({ name, email, password }, { transaction: t });
            // Generate JWT token
            const token = generateToken(newUser.id);

            await t.commit(); // commit transaction

            res.status(201).json({
                message: "User registered successfully",
                user: newUser.toJSON(),
                token
            });
        } catch (error) {
            await t.rollback(); // rollback transaction on error
            next(error);
        }
    },

    login: async (req, res, next) => {
        try {
            const { email, password } = req.body;

            // Find user by email
            const user = await User.findOne({ where: { email } });
            if (!user) {
                return res.status(401).json({ error: "Invalid email or password" });
            }

            // Compare password
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(401).json({ error: "Invalid email or password" });
            }

            // Generate JWT token
            const token = generateToken(user.id);

            res.status(200).json({
                message: "Login successful",
                user: user.toJSON(),
                token
            });
        } catch (error) {
            next(error);
        }
    },

    me: async (req, res, next) => {
        try {
            res.json({
                user: req.user.toJSON()
            });
        } catch (error) {
            next(error);
        }
    }
};

export default authControllers;