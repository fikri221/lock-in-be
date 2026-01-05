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
        field: "habit_id",
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
    },
    logDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "log_date",
    },
    completedAt: {
        type: DataTypes.DATE,
        field: "completed_at",
    },
    cancelledAt: {
        type: DataTypes.DATE,
        field: "cancelled_at",
    },
    cancelledReason: {
        type: DataTypes.STRING,
        field: "cancelled_reason",
    },
    actualValue: {
        type: DataTypes.DECIMAL,
        field: "actual_value",
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