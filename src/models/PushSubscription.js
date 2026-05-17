import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const PushSubscription = sequelize.define("PushSubscription", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
        comment: "User ID who owns the subscription",
    },
    endpoint: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Subscription endpoint",
    },
    p256dh: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Subscription p256dh",
    },
    auth: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Subscription auth",
    },
    userAgent: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "user_agent",
        comment: "User agent of the device",
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
        comment: "TRUE if subscription is active, false if unsubscribed",
    },
}, {
    tableName: "push_subscriptions",
    timestamps: true,
});

export default PushSubscription;