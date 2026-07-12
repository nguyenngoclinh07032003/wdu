const express = require('express');
const router = express.Router();
const ControllerCustomerSupport = require('../controllers/ControllerCustomerSupport');
const ControllerJWT = require('../jwt/ControllerJWT');

router.get('/support-requests/my', ControllerJWT.verifyToken, ControllerCustomerSupport.getMyRequests);
router.get(
    '/support-requests/my/:id',
    ControllerJWT.verifyToken,
    ControllerCustomerSupport.getMyRequestById,
);
router.get('/customer-notifications', ControllerJWT.verifyToken, ControllerCustomerSupport.getNotifications);
router.patch(
    '/customer-notifications/:id/read',
    ControllerJWT.verifyToken,
    ControllerCustomerSupport.markNotificationRead,
);
router.patch(
    '/customer-notifications/read-all',
    ControllerJWT.verifyToken,
    ControllerCustomerSupport.markAllNotificationsRead,
);

module.exports = router;
