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
            const { user, accessToken, refreshToken } = await authService.register(req.body);

            // Set httpOnly cookies
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.status(201).json({
                success: true,
                message: "User registered successfully",
                data: { user }
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
            const { user, accessToken, refreshToken } = await authService.login(email, password);

            // Set httpOnly cookies
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.status(200).json({
                success: true,
                message: "Login successful",
                data: { user }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Refresh access token using refresh token
     * POST /api/auth/refresh
     */
    refreshToken: async (req, res, next) => {
        try {
            const incomingRefreshToken = req.cookies.refreshToken;

            if (!incomingRefreshToken) {
                return res.status(401).json({ error: "No refresh token provided" });
            }

            const { accessToken, refreshToken } = await authService.refreshAuthToken(incomingRefreshToken);

            // Set new httpOnly cookies
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.status(200).json({
                success: true,
                message: "Token refreshed successfully"
            });
        } catch (error) {
            // Clear cookies if refresh token is invalid
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            next(error);
        }
    },

    /**
     * Get current user profile
     * GET /api/auth/me
     */
    me: async (req, res, next) => {
        try {
            // req.user is set by auth middleware (or optionalAuth)
            if (!req.user) {
                return res.status(200).json({
                    success: true,
                    data: { user: null }
                });
            }

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
    },

    /**
     * Logout user
     * POST /api/auth/logout
     */
    logout: async (req, res, next) => {
        try {
            const refreshToken = req.cookies.refreshToken;

            if (refreshToken) {
                await authService.logout(refreshToken);
            }

            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');

            res.status(200).json({
                success: true,
                message: "Logged out successfully"
            });
        } catch (error) {
            next(error);
        }
    }
};

export default authController;
