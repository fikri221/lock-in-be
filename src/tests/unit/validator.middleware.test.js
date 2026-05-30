import { jest } from '@jest/globals';
import { validate, schemas } from '../../middlewares/validator.js';

describe('Validator Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
    });

    test('should call next() if schema validation passes', () => {
        req.body = {
            name: 'john',
            email: 'john@example.com',
            password: 'secretpassword'
        };

        const middleware = validate(schemas.register);
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 400 and validation error details if validation fails', () => {
        req.body = {
            name: 'j', // too short, min is 2
            email: 'invalid-email',
            password: '123' // too short, min is 6
        };

        const middleware = validate(schemas.register);
        middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Validation failed',
            details: expect.any(Array)
        }));
    });

    test('should strip unknown fields when validation passes', () => {
        req.body = {
            name: 'john',
            email: 'john@example.com',
            password: 'secretpassword',
            unknownField: 'hackersData'
        };

        const middleware = validate(schemas.register);
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.body.unknownField).toBeUndefined(); // Should be stripped by stripUnknown: true
    });
});
