const express = require('express');
const router = express.Router();

const ControllerDoctorInbox = require('../controllers/ControllerDoctorInbox');
const ControllerJWT = require('../jwt/ControllerJWT');

router.post('/ask', ControllerJWT.verifyToken, ControllerDoctorInbox.askDoctor);
router.get('/my-questions', ControllerJWT.verifyToken, ControllerDoctorInbox.getMyQuestions);

router.get('/conversation/:id', ControllerJWT.verifyToken, ControllerDoctorInbox.getConversation);
router.post('/conversation/:id/messages', ControllerJWT.verifyToken, ControllerDoctorInbox.sendMessage);

router.get('/inbox', ControllerJWT.verifyTokenDoctor, ControllerDoctorInbox.getInboxForDoctor);
router.put('/inbox/:id/answer', ControllerJWT.verifyTokenDoctor, ControllerDoctorInbox.answerQuestion);

module.exports = router;
