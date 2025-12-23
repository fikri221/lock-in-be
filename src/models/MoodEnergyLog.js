import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";


const MoodEnergyLog = sequelize.define("MoodEnergyLog", {
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
    logDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        fields: "log_date",
    },
    notes: {
        type: DataTypes.TEXT,
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
    tableName: "mood_energy_log",
    indexes: [
        {
            unique: true,
            fields: ["user_id", "log_date"]
        }
    ]
});

export default MoodEnergyLog;