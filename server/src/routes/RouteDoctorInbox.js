const express = require('express');
const router = express.Router();

const ControllerDoctorInbox = require('../controllers/ControllerDoctorInbox');
const ControllerJWT = require('../jwt/ControllerJWT');

router.post('/ask', ControllerJWT.verifyToken, ControllerDoctorInbox.askDoctor);
router.get('/my-questions', ControllerJWT.verifyToken, ControllerDoctorInbox.getMyQuestions);

router.get('/conversation/:id', ControllerJWT.verifyToken, ControllerDoctorInbox.getConversation);
router.post('/conversation/:id/messages', ControllerJWT.verifyToken, ControllerDoctorInbox.sendMessage);

router.get('/approved-doctors', ControllerJWT.verifyTokenStaff, ControllerDoctorInbox.listApprovedDoctors);

router.get('/overview', ControllerJWT.verifyTokenDoctor, ControllerDoctorInbox.getOverviewForDoctor);
router.get('/inbox/unread-summary', ControllerJWT.verifyTokenDoctor, ControllerDoctorInbox.getUnreadSummaryForDoctor);
router.patch('/inbox/:id/read', ControllerJWT.verifyTokenDoctor, ControllerDoctorInbox.markConversationRead);
router.get('/inbox', ControllerJWT.verifyTokenDoctor, ControllerDoctorInbox.getInboxForDoctor);
router.put('/inbox/:id/answer', ControllerJWT.verifyTokenDoctor, ControllerDoctorInbox.answerQuestion);

router.post('/inbox/:id/request-info', ControllerJWT.verifyTokenDoctor, ControllerDoctorInbox.requestMoreInfo);
router.post('/inbox/:id/transfer-back', ControllerJWT.verifyTokenDoctor, ControllerDoctorInbox.transferBackToStaff);
router.post('/inbox/:id/reject', ControllerJWT.verifyTokenDoctor, ControllerDoctorInbox.rejectQuestion);
router.post('/inbox/:id/urgent', ControllerJWT.verifyTokenDoctor, ControllerDoctorInbox.markUrgent);
router.post('/inbox/:id/close', ControllerJWT.verifyToken, ControllerDoctorInbox.closeConversation);
router.post('/inbox/:id/internal-note', ControllerJWT.verifyToken, ControllerDoctorInbox.addInternalNote);

module.exports = router;
