const express = require('express');
const router = express.Router();
const ControllerContact = require('../controllers/ControllerContact');

router.post('/contact', ControllerContact.submit);

module.exports = router;
