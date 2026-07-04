const express = require('express');
const router = express.Router();

const ControllerVoucher = require('../controllers/ControllerVoucher');
const ControllerNotification = require('../controllers/ControllerNotification');
const ControllerJWT = require('../jwt/ControllerJWT');

// USER
router.get('/api/vouchers', ControllerVoucher.getPublic);

// ADMIN
router.get('/api/admin/vouchers', ControllerVoucher.getAll);
router.post('/api/admin/vouchers', ControllerVoucher.create);
router.put('/api/admin/vouchers/:id', ControllerVoucher.update);
router.delete('/api/admin/vouchers/:id', ControllerVoucher.delete);

// Notifications
router.get('/api/notifications/public', ControllerNotification.getPublic);
router.post('/api/notifications', ControllerNotification.create);

module.exports = router;
