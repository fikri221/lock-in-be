
import dotenv from 'dotenv';
import { sequelize } from '../src/config/database.js';
import habitService from '../src/services/habit.service.js';
import { User, HabitLog } from '../src/models/index.js';
import { format, subDays } from 'date-fns';

dotenv.config();

async function runVerification() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Get or Create a User
        let user = await User.findOne();
        if (!user) {
            console.log('No user found, creating dummy user...');
            user = await User.create({
                email: 'test@example.com',
                password: 'hashedpassword',
                name: 'Test User'
            });
        }
        const userId = user.id;
        console.log(`Using user: ${userId}`);

        // 2. Create a Habit
        const habit = await habitService.createHabit({
            name: 'Test History Habit',
            frequency: 'DAILY',
            scheduledTime: '09:00'
        }, userId);
        console.log(`Created habit: ${habit.id}`);

        // 3. Create Logs for past dates
        const today = new Date();
        const yesterday = subDays(today, 1);
        const twoDaysAgo = subDays(today, 2);

        await HabitLog.create({
            habitId: habit.id,
            userId: userId,
            logDate: format(yesterday, 'yyyy-MM-dd'),
            status: 'COMPLETED'
        });
        console.log(`Created log for ${format(yesterday, 'yyyy-MM-dd')}`);

        // 4. Test getUserHabits with Range
        const startDate = format(twoDaysAgo, 'yyyy-MM-dd');
        const endDate = format(today, 'yyyy-MM-dd');

        console.log(`Fetching habits from ${startDate} to ${endDate}...`);
        const habitsRange = await habitService.getUserHabits(userId, { startDate, endDate });
        const targetHabitRange = habitsRange.find(h => h.id === habit.id);

        if (targetHabitRange && targetHabitRange.logs.length >= 1) {
            console.log(`✅ SUCCESS: Found ${targetHabitRange.logs.length} logs in range.`);
            targetHabitRange.logs.forEach(log => console.log(`   - Log Date: ${log.logDate}, Status: ${log.status}`));
        } else {
            console.error('❌ FAILED: Logs not found in range.');
        }

        // 5. Test getUserHabits with Single Date (Yesterday)
        const specificDate = format(yesterday, 'yyyy-MM-dd');
        console.log(`Fetching habits for specific date ${specificDate}...`);
        const habitsDate = await habitService.getUserHabits(userId, { date: specificDate });
        const targetHabitDate = habitsDate.find(h => h.id === habit.id);

        if (targetHabitDate && targetHabitDate.logs.length === 1 && targetHabitDate.logs[0].logDate === specificDate) {
            console.log(`✅ SUCCESS: Found log for specific date.`);
        } else {
            console.error('❌ FAILED: Log not found for specific date.');
        }

        // Cleanup
        await habit.destroy({ force: true }); // Hard delete handling if needed, or just let it be
        console.log('Cleanup done (if implemented).');

    } catch (error) {
        console.error('Verification Error:', error);
    } finally {
        await sequelize.close();
    }
}

runVerification();
