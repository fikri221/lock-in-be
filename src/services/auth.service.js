import { User } from '../models/index.js';
import { sequelize } from '../config/database.js';
import jwt from 'jsonwebtoken';

/**
 * Auth Service - Contains all authentication business logic
 */
class AuthService {
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} { user, token }
     */
    async register(userData) {
        const t = await sequelize.transaction();

        try {
            const { name, email, password } = userData;

            // Check if user already exists
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                const error = new Error('Email is already registered');
                error.statusCode = 409;
                throw error;
            }

            // Create new user (password will be hashed by model hook)
            const newUser = await User.create(
                { name, email, password },
                { transaction: t }
            );

            // Generate JWT token
            const token = this.generateToken(newUser.id);

            await t.commit();

            return {
                user: newUser.toJSON(),
                token
            };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} { user, token }
     */
    async login(email, password) {
        // Find user by email
        const user = await User.findOne({ where: { email } });

        if (!user) {
            const error = new Error('Invalid email or password');
            error.statusCode = 401;
            throw error;
        }

        // Compare password using model instance method
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            const error = new Error('Invalid email or password');
            error.statusCode = 401;
            throw error;
        }

        // Generate JWT token
        const token = this.generateToken(user.id);

        return {
            user: user.toJSON(),
            token
        };
    }

    /**
     * Get user profile by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User object
     */
    async getUserById(userId) {
        const user = await User.findByPk(userId);

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        return user;
    }

    /**
     * Verify JWT token and get user
     * @param {string} token - JWT token
     * @returns {Promise<Object>} User object
     */
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await this.getUserById(decoded.id);
            return user;
        } catch {
            const authError = new Error('Invalid or expired token');
            authError.statusCode = 401;
            throw authError;
        }
    }

    /**
     * Generate JWT token for user
     * @private
     * @param {string} userId - User ID
     * @returns {string} JWT token
     */
    generateToken(userId) {
        return jwt.sign(
            { id: userId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
    }

    /**
     * Update user profile
     * @param {string} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated user
     */
    async updateProfile(userId, updateData) {
        const t = await sequelize.transaction();

        try {
            const user = await User.findByPk(userId);

            if (!user) {
                const error = new Error('User not found');
                error.statusCode = 404;
                throw error;
            }

            // Don't allow updating sensitive fields directly
            // eslint-disable-next-line no-unused-vars
            const { password, email, ...safeData } = updateData;

            await user.update(safeData, { transaction: t });
            await t.commit();

            return user.toJSON();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Change user password
     * @param {string} userId - User ID
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<void>}
     */
    async changePassword(userId, currentPassword, newPassword) {
        const t = await sequelize.transaction();

        try {
            const user = await User.findByPk(userId);

            if (!user) {
                const error = new Error('User not found');
                error.statusCode = 404;
                throw error;
            }

            // Verify current password
            const isPasswordValid = await user.comparePassword(currentPassword);
            if (!isPasswordValid) {
                const error = new Error('Current password is incorrect');
                error.statusCode = 401;
                throw error;
            }

            // Update password (will be hashed by model hook)
            await user.update({ password: newPassword }, { transaction: t });
            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
}

// Export singleton instance
export default new AuthService();
