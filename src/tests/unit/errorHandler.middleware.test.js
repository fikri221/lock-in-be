import { jest } from '@jest/globals';
import errorHandler from '../../middlewares/errorHandler.js';

describe('Error Handler Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
    });

    test('should handle SequelizeValidationError and return status 400', () => {
        const err = {
            name: 'SequelizeValidationError',
            errors: [
                { message: 'Name is required' },
                { message: 'Email must be valid' }
            ]
        };

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: ['Name is required', 'Email must be valid']
        });
    });

    test('should handle SequelizeUniqueConstraintError and return status 400', () => {
        const err = {
            name: 'SequelizeUniqueConstraintError',
            errors: [
                { message: 'Email already exists' }
            ]
        };

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: ['Email already exists']
        });
    });

    test('should handle JsonWebTokenError and return status 401', () => {
        const err = { name: 'JsonWebTokenError' };

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    test('should handle TokenExpiredError and return status 401', () => {
        const err = { name: 'TokenExpiredError' };

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token has expired' });
    });

    test('should fallback to status 500 for generic/unknown errors', () => {
        const err = new Error('Database crash');

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
});
