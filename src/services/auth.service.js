import { User, RefreshToken } from '../models/index.js';
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

            // Generate JWT tokens
            const { accessToken, refreshToken } = this.generateTokens(newUser.id);

            // Save refresh token to database
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

            await RefreshToken.create(
                {
                    token: refreshToken,
                    user_id: newUser.id,
                    expires_at: expiresAt
                },
                { transaction: t }
            );

            await t.commit();

            return {
                user: newUser.toJSON(),
                accessToken,
                refreshToken
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

        // Generate JWT tokens
        const { accessToken, refreshToken } = this.generateTokens(user.id);

        // Save refresh token to database
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await RefreshToken.create({
            token: refreshToken,
            user_id: user.id,
            expires_at: expiresAt
        });

        return {
            user: user.toJSON(),
            accessToken,
            refreshToken
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
     * Generate Access and Refresh tokens for user
     * @private
     * @param {string} userId - User ID
     * @returns {Object} { accessToken, refreshToken }
     */
    generateTokens(userId) {
        const accessToken = jwt.sign(
            { id: userId },
            process.env.JWT_SECRET,
            { expiresIn: '15m' } // Access token 15 minutes
        );

        const refreshToken = jwt.sign(
            { id: userId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // Refresh token 7 days
        );

        return { accessToken, refreshToken };
    }

    /**
     * Refresh auth token
     * @param {string} refreshToken - Refresh token string
     * @returns {Promise<Object>} { accessToken, refreshToken }
     */
    async refreshAuthToken(refreshTokenStr) {
        try {
            // Verify token signature with JWT
            const decoded = jwt.verify(refreshTokenStr, process.env.JWT_SECRET);

            // Check if token exists in database and is not expired
            const tokenRecord = await RefreshToken.findOne({
                where: { token: refreshTokenStr }
            });

            if (!tokenRecord || new Date() > tokenRecord.expires_at) {
                throw new Error('Refresh token is invalid or expired');
            }

            // Generate new tokens
            const { accessToken, refreshToken } = this.generateTokens(decoded.id);

            // Update refresh token in database (Rotation)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            await tokenRecord.update({
                token: refreshToken,
                expires_at: expiresAt
            });

            return { accessToken, refreshToken };
        } catch (error) {
            const authError = new Error('Invalid or expired refresh token');
            authError.statusCode = 401;
            authError.message = error;
            throw authError;
        }
    }

    /**
     * Logout user - removes refresh token from database
     * @param {string} refreshTokenStr - Refresh token string
     */
    async logout(refreshTokenStr) {
        if (refreshTokenStr) {
            await RefreshToken.destroy({
                where: { token: refreshTokenStr }
            });
        }
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
