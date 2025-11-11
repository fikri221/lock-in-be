const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcryptjs = require("bcryptjs");

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
        allowNull: false,
    },
    timezone: {
        type: DataTypes.STRING,
        defaultValue: "Asia/Jakarta",
    },
}, {
    tableName: "users",
    hooks: {
        // Hash password before saving user
        beforeCreate: async (user) => {
            const salt = await bcryptjs.genSalt(10);
            user.password = await bcryptjs.hash(user.password, salt);
        },
        beforeUpdate: async (user) => {
            if (user.changed("password")) {
                const salt = await bcryptjs.genSalt(10);
                user.password = await bcryptjs.hash(user.password, salt);
            }
        },
    },
});

User.prototype.comparePassword = async function (newPassword) {
    return await bcryptjs.compare(newPassword, this.password);
}

User.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.password;

    return values;
}

module.exports = User;