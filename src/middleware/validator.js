import Joi from 'joi';

const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            return res.status(400).json({
                error: "Validation failed",
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }

        next();
    }
};

// Validation schema
const schemas = {
    // Auth schemas
    register: Joi.object({
        name: Joi.string().alphanum().min(2).max(255).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required()
    }),
    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    // Habit and HabitLog schemas
    createHabit: Joi.object({
        name: Joi.string().min(2).max(255).required(),
        description: Joi.string().allow('', null),
        type: Joi.string().valid("OUTDOOR", "WORK", "HEALTH", "LEARNING", "OTHER"),
        icon: Joi.string().max(10),
        color: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
        scheduledTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
        isWeatherDependent: Joi.boolean(),
        requiresGoodWeather: Joi.boolean(),
        reminderEnabled: Joi.boolean()
    }),

    updateHabit: Joi.object({
        name: Joi.string().min(2).max(255),
        description: Joi.string().allow('', null),
        type: Joi.string().valid("OUTDOOR", "WORK", "HEALTH", "LEARNING", "OTHER"),
        icon: Joi.string().max(10),
        color: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
        scheduledTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
        isWeatherDependent: Joi.boolean(),
        requiresGoodWeather: Joi.boolean(),
        reminderEnabled: Joi.boolean(),
        isActive: Joi.boolean()
    }),

    logHabit: Joi.object({
        status: Joi.string().valid("COMPLETED", "FAILED", "SKIPPED").required(),
        notes: Joi.string().allow('', null),
        mood: Joi.number().integer().min(1).max(5),
        energy: Joi.number().integer().min(1).max(5),
        weather: Joi.object()
    })
};

export {
    validate,
    schemas
};