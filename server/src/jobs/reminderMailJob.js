const cron = require('node-cron');
const ModelReminder = require('../models/ModelReminder');
const ModelReminderLog = require('../models/ModelReminderLog');
const sendReminderMail = require('../SendMail/sendReminderMail');

const getNowTime = () => {
    const now = new Date();

    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const startReminderMailJob = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const nowTime = getNowTime();

            // console.log('Checking reminder at:', nowTime);

            const reminders = await ModelReminder.find({
                isActive: true,
                times: nowTime,
                methods: 'email',
            });

            // console.log('Reminder matched:', reminders.length);

            for (const reminder of reminders) {
                if (!reminder.userEmail) {
                    console.log('Reminder không có email:', reminder._id);
                    continue;
                }

                await sendReminderMail({
                    to: reminder.userEmail,
                    fullname: 'bạn',
                    title: reminder.title,
                    description: reminder.description,
                    time: nowTime,
                });

                await ModelReminderLog.create({
                    reminderId: reminder._id,
                    userId: reminder.userId,
                    status: 'completed',
                    type: 'email_sent',
                    note: 'Đã gửi email nhắc nhở',
                    completedAt: new Date(),
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
