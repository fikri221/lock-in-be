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
    type: {
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
    scheduledTime: {
        type: DataTypes.STRING,
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