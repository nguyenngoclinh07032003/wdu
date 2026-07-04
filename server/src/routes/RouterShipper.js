const express = require('express');
const router = express.Router();

const ControllerShipper = require('../controllers/ControllerShipper');
const ControllerJWT = require('../jwt/ControllerJWT');

router.get('/api/shipper/orders', ControllerJWT.verifyToken, ControllerShipper.getMyOrders);
router.get('/api/shipper/history', ControllerJWT.verifyToken, ControllerShipper.getHistory);
router.get('/api/shipper/stats', ControllerJWT.verifyToken, ControllerShipper.getStats);

router.patch('/api/shipper/orders/:orderId/start', ControllerJWT.verifyToken, ControllerShipper.startDelivery);

router.patch('/api/shipper/orders/:orderId/status', ControllerJWT.verifyToken, ControllerShipper.updateDeliveryStatus);

module.exports = router;
