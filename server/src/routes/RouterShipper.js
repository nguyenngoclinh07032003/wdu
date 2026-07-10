const express = require('express');
const router = express.Router();

const ControllerShipper = require('../controllers/ControllerShipper');
const ControllerJWT = require('../jwt/ControllerJWT');

const authShipperRequest = ControllerJWT.verifyToken;

router.get('/api/shipper/orders', authShipperRequest, ControllerShipper.getMyOrders);
router.get('/api/shipper/history', authShipperRequest, ControllerShipper.getHistory);
router.get('/api/shipper/stats', authShipperRequest, ControllerShipper.getStats);

router.patch('/api/shipper/orders/:orderId/start', authShipperRequest, ControllerShipper.startDelivery);
router.patch('/api/shipper/orders/:orderId/status', authShipperRequest, ControllerShipper.updateDeliveryStatus);

module.exports = router;
