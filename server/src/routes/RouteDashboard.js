const express = require('express');
const router = express.Router();

const ControllerDashboard = require('../controllers/ControllerDashboard');
const ControllerJWT = require('../jwt/ControllerJWT');

router.get('/dashboard', ControllerJWT.verifyToken, ControllerDashboard.getDashboard);

module.exports = router;
