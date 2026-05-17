import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import bcryptjs from "bcryptjs";

const User = sequelize.define("User", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    timezone: {
        type: DataTypes.STRING,
        defaultValue: "Asia/Jakarta",
    },
    notificationEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "notification_enabled",
        comment: "TRUE if user wants to receive notifications",
    },
    reminderTime: {
        type: DataTypes.TIME,
        defaultValue: "08:00",
        field: "reminder_time",
        comment: "Default time to send reminders",
    },
}, {
    tableName: "users",
    hooks: {
        // Hash password before saving user
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcryptjs.genSalt(10);
                user.password = await bcryptjs.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed("password") && user.password) {
                const salt = await bcryptjs.genSalt(10);
                user.password = await bcryptjs.hash(user.password, salt);
            }
        },
    },
});

User.prototype.comparePassword = async function (newPassword) {
    if (!this.password) return false;
    return await bcryptjs.compare(newPassword, this.password);
}

User.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.password;

    return values;
}

export default User;