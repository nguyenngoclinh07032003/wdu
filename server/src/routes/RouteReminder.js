const express = require('express');
const router = express.Router();

const ControllerReminder = require('../controllers/ControllerReminder');
const ControllerJWT = require('../jwt/ControllerJWT');

router.get('/api/reminders', ControllerJWT.verifyToken, ControllerReminder.getReminders);

router.post('/api/reminders', ControllerJWT.verifyToken, ControllerReminder.createReminder);

router.put('/api/reminders/:id', ControllerJWT.verifyToken, ControllerReminder.updateReminder);

router.delete('/api/reminders/:id', ControllerJWT.verifyToken, ControllerReminder.deleteReminder);

router.post('/api/reminders/:id/complete', ControllerJWT.verifyToken, ControllerReminder.completeReminder);

router.get('/api/reminder-logs', ControllerJWT.verifyToken, ControllerReminder.getReminderLogs);

module.exports = router;
