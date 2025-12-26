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
        category: Joi.string().valid("OUTDOOR", "WORK", "HEALTH", "LEARNING", "OTHER"),
        icon: Joi.string().max(10),
        color: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
        habitType: Joi.string().valid("boolean", "measurable"),
        targetValue: Joi.number()
            .when('habitType', { is: 'measurable', then: Joi.number().required(), otherwise: Joi.forbidden() }),
        targetUnit: Joi.string()
            .when('habitType', { is: 'measurable', then: Joi.string().required(), otherwise: Joi.forbidden() }),
        targetCount: Joi.number()
            .when('habitType', { is: 'measurable', then: Joi.number().required(), otherwise: Joi.forbidden() }),
        scheduledTime: Joi.string()
            .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
            .optional()
            .allow(null),
        isWeatherDependent: Joi.boolean(),
        requiresGoodWeather: Joi.boolean(),
        targetDays: Joi.array()
            .items(Joi.number().valid(1, 2, 3, 4, 5, 6, 7))
            .min(1)
            .when('allowFlexible', { is: false, then: Joi.required(), otherwise: Joi.optional() }),
        allowFlexible: Joi.boolean(),
        reminderEnabled: Joi.boolean()
    }),

    updateHabit: Joi.object({
        name: Joi.string().min(2).max(255),
        description: Joi.string().allow('', null),
        category: Joi.string().valid("OUTDOOR", "WORK", "HEALTH", "LEARNING", "OTHER"),
        icon: Joi.string().max(10),
        color: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
        habitType: Joi.string().valid("boolean", "measurable"),
        targetValue: Joi.number()
            .when('habitType', { is: 'measurable', then: Joi.number().required(), otherwise: Joi.forbidden() }),
        targetUnit: Joi.string()
            .when('habitType', { is: 'measurable', then: Joi.string().required(), otherwise: Joi.forbidden() }),
        targetCount: Joi.number()
            .when('habitType', { is: 'measurable', then: Joi.number().required(), otherwise: Joi.forbidden() }),
        scheduledTime: Joi.string()
            .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
            .optional()
            .allow(null),
        isWeatherDependent: Joi.boolean(),
        requiresGoodWeather: Joi.boolean(),
        targetDays: Joi.array()
            .items(Joi.number().valid(1, 2, 3, 4, 5, 6, 7))
            .min(1)
            .when('allowFlexible', { is: false, then: Joi.required(), otherwise: Joi.optional() }),
        allowFlexible: Joi.boolean(),
        reminderEnabled: Joi.boolean(),
        isActive: Joi.boolean()
    }),

    logHabit: Joi.object({
        status: Joi.string().valid("COMPLETED", "FAILED", "SKIPPED").required(),
        actualValue: Joi.number().when('habitType', { is: 'measurable', then: Joi.number().required(), otherwise: Joi.forbidden() }),
        weather: Joi.object()
    }),

    logMoodEnergy: Joi.object({
        mood: Joi.number().valid(1, 2, 3, 4, 5).required(),
        energy: Joi.number().valid(1, 2, 3, 4, 5).required(),
        notes: Joi.string().allow('', null)
    })
};

export {
    validate,
    schemas
};