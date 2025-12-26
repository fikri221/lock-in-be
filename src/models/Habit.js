import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";


const Habit = sequelize.define("Habit", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        fields: "user_id",
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: "OTHER",
        validate: {
            isIn: [["OUTDOOR", "WORK", "HEALTH", "LEARNING", "OTHER"]],
        },
    },
    icon: {
        type: DataTypes.STRING,
        defaultValue: "⭐",
    },
    color: {
        type: DataTypes.STRING,
        defaultValue: "#6b7280",
    },
    frequency: {
        type: DataTypes.STRING,
        defaultValue: "DAILY",
    },
    habitType: {
        type: DataTypes.STRING,
        defaultValue: "boolean",
        field: "habit_type",
    },
    targetValue: {
        type: DataTypes.INTEGER,
        field: "target_value",
    },
    targetUnit: {
        type: DataTypes.STRING,
        field: "target_unit",
    },
    targetCount: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: "target_count",
    },
    targetDays: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        field: "target_days",
        allowNull: true,
        comment: '[1,3,5] for Mon/Wed/Fri',
    },
    allowFlexible: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "allow_flexible",
    },
    scheduledTime: {
        type: DataTypes.TIME,
        fields: "scheduled_time",
    },
    isWeatherDependent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        fields: "is_weather_dependent",
    },
    requiresGoodWeather: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        fields: "requires_good_weather",
    },
    reminderEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        fields: "reminder_enabled",
    },
    currentStreak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        fields: "current_streak",
    },
    longestStreak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        fields: "longest_streak",
    },
    totalCompletions: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        fields: "total_completions",
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        fields: "is_active",
    },
}, {
    tableName: "habits",
});

export default Habit;