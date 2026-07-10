const express = require('express');
const router = express.Router();

const ControllerRegister = require('../controllers/ControllerRegister');

router.post('/send-otp', ControllerRegister.sendOtpRegister);
router.post('/verify-otp', ControllerRegister.verifyOtpRegister);

module.exports = router;
