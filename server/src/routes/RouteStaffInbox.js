const express = require('express');
const router = express.Router();

const ControllerDoctorInbox = require('../controllers/ControllerDoctorInbox');
const ControllerJWT = require('../jwt/ControllerJWT');

router.get('/inbox', ControllerJWT.verifyTokenStaff, ControllerDoctorInbox.getInboxForStaff);
router.put('/inbox/:id/answer', ControllerJWT.verifyTokenStaff, ControllerDoctorInbox.answerQuestionForStaff);
router.post('/inbox/:id/escalate', ControllerJWT.verifyTokenStaff, ControllerDoctorInbox.escalateToDoctor);

module.exports = router;
