import User from './User.js';
import Habit from './Habit.js';
import HabitLog from './HabitLog.js';

// Define associations
User.hasMany(Habit, { foreignKey: 'userId', as: 'habits' });
Habit.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(HabitLog, { foreignKey: 'userId', as: 'logs' });
HabitLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Habit.hasMany(HabitLog, { foreignKey: 'habitId', as: 'logs' });
HabitLog.belongsTo(Habit, { foreignKey: 'habitId', as: 'habit' });

export {
    User,
    Habit,
    HabitLog
};