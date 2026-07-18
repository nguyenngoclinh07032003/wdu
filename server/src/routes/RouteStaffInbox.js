const express = require('express');
const router = express.Router();

const ControllerStaffDashboard = require('../controllers/ControllerStaffDashboard');
const ControllerDoctorInbox = require('../controllers/ControllerDoctorInbox');
const ControllerJWT = require('../jwt/ControllerJWT');

router.get('/dashboard', ControllerJWT.verifyTokenStaff, ControllerStaffDashboard.getDashboard);

router.get('/inbox', ControllerJWT.verifyTokenStaff, ControllerDoctorInbox.getInboxForStaff);
router.put('/inbox/:id/answer', ControllerJWT.verifyTokenStaff, ControllerDoctorInbox.answerQuestionForStaff);
router.post('/inbox/:id/escalate', ControllerJWT.verifyTokenStaff, ControllerDoctorInbox.escalateToDoctor);
router.get('/inbox/unread-summary', ControllerJWT.verifyTokenStaff, ControllerStaffDashboard.getUnreadSummary);
router.patch('/inbox/:id/read', ControllerJWT.verifyTokenStaff, ControllerStaffDashboard.markConversationRead);

module.exports = router;
