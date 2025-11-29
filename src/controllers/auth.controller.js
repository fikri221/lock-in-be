import authService from '../services/auth.service.js';

/**
 * Auth Controller - Handles HTTP requests/responses for authentication
 * All business logic is delegated to the service layer
 */
const authController = {
    /**
     * Register a new user
     * POST /api/auth/register
     */
    register: async (req, res, next) => {
        try {
            const { user, token } = await authService.register(req.body);

            res.status(201).json({
                success: true,
                message: "User registered successfully",
                data: { user, token }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Login user
     * POST /api/auth/login
     */
    login: async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const { user, token } = await authService.login(email, password);

            res.status(200).json({
                success: true,
                message: "Login successful",
                data: { user, token }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get current user profile
     * GET /api/auth/me
     */
    me: async (req, res, next) => {
        try {
            // req.user is set by auth middleware
            res.status(200).json({
                success: true,
                data: { user: req.user.toJSON() }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Update user profile
     * PUT /api/auth/profile
     */
    updateProfile: async (req, res, next) => {
        try {
            const user = await authService.updateProfile(req.userId, req.body);

            res.status(200).json({
                success: true,
                message: "Profile updated successfully",
                data: { user }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Change password
     * POST /api/auth/change-password
     */
    changePassword: async (req, res, next) => {
        try {
            const { currentPassword, newPassword } = req.body;
            await authService.changePassword(req.userId, currentPassword, newPassword);

            res.status(200).json({
                success: true,
                message: "Password changed successfully"
            });
        } catch (error) {
            next(error);
        }
    }
};

export default authController;
