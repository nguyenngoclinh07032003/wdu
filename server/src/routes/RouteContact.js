const express = require('express');
const router = express.Router();
const ControllerContact = require('../controllers/ControllerContact');
const ControllerJWT = require('../jwt/ControllerJWT');

router.post('/contact', ControllerJWT.optionalVerifyToken, ControllerContact.submit);

module.exports = router;
