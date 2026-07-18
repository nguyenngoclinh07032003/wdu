const cron = require('node-cron');
const ModelReminder = require('../models/ModelReminder');
const ModelReminderLog = require('../models/ModelReminderLog');
const sendReminderMail = require('../SendMail/sendReminderMail');

const getNowTime = () => {
    const now = new Date();

    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const sameLocalDay = (a, b) => {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
};

const startReminderMailJob = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const nowTime = getNowTime();

            const reminders = await ModelReminder.find({
                isActive: true,
                times: nowTime,
                methods: 'email',
            });

            for (const reminder of reminders) {
                if (!reminder.userEmail) {
                    console.log('Reminder không có email:', reminder._id);
                    continue;
                }

                if (reminder.frequency === 'weekly') {
                    const createdDay = new Date(reminder.createdAt).getDay();
                    if (now.getDay() !== createdDay) {
                        continue;
                    }
                }

                if (reminder.lastSentAt) {
                    const last = new Date(reminder.lastSentAt);
                    const lastHm = `${String(last.getHours()).padStart(2, '0')}:${String(last.getMinutes()).padStart(2, '0')}`;
                    if (sameLocalDay(last, now) && lastHm === nowTime) {
                        continue;
                    }
                    // Tránh gửi trùng khi cron chạy lại trong cùng phút
                    if (Date.now() - last.getTime() < 90 * 1000) {
                        continue;
                    }
                }

                await sendReminderMail({
                    to: reminder.userEmail,
                    fullname: 'bạn',
                    title: reminder.title,
                    description: reminder.description,
                    time: nowTime,
                });

                reminder.lastSentAt = now;
                await reminder.save();

                await ModelReminderLog.create({
                    reminderId: reminder._id,
                    userId: reminder.userId,
                    status: 'completed',
                    type: 'email_sent',
                    note: 'Đã gửi email nhắc nhở',
                    completedAt: now,
                });

                console.log('Mail sent to:', reminder.userEmail);
            }
        } catch (error) {
            console.error('Reminder mail job error:', error);
        }
    });

    console.log('Reminder mail job started');
};

module.exports = startReminderMailJob;
