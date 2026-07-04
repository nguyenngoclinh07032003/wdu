const express = require('express');
const router = express.Router();

const ControllerChatbot = require('../controllers/ControllerChatbot');
const ControllerJWT = require('../jwt/ControllerJWT');

router.post('/api/chatbot', ControllerJWT.optionalVerifyToken, ControllerChatbot.chat);

module.exports = router;
