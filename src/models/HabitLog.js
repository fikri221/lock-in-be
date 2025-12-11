import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";


const HabitLog = sequelize.define("HabitLog", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    habitId: {
        type: DataTypes.UUID,
        allowNull: false,
        fields: "habit_id",
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        fields: "user_id",
    },
    logDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        fields: "log_date",
    },
    completedAt: {
        type: DataTypes.DATE,
        fields: "completed_at",
    },
    cancelledAt: {
        type: DataTypes.DATE,
        fields: "cancelled_at",
    },
    cancelledReason: {
        type: DataTypes.STRING,
        fields: "cancelled_reason",
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: "PENDING",
        validate: {
            isIn: [["PENDING", "COMPLETED", "FAILED", "SKIPPED", "CANCELLED"]],
        },
    },
    weather: {
        type: DataTypes.JSONB
    },
    notes: {
        type: DataTypes.TEXT
    },
    mood: {
        type: DataTypes.INTEGER,
        validate: {
            min: 1,
            max: 5
        }
    },
    energy: {
        type: DataTypes.INTEGER,
        validate: {
            min: 1,
            max: 5
        }
    },
}, {
    tableName: "habit_logs",
    indexes: [
        {
            unique: true,
            fields: ["habit_id", "log_date"]
        }
    ]
});

export default HabitLog;