const express = require('express');
const router = express.Router();

const ControllerShipper = require('../controllers/ControllerShipper');
const ControllerJWT = require('../jwt/ControllerJWT');

router.get('/api/shipper/orders', ControllerJWT.verifyTokenShipper, ControllerShipper.getMyOrders);
router.get('/api/shipper/history', ControllerJWT.verifyTokenShipper, ControllerShipper.getHistory);
router.get('/api/shipper/stats', ControllerJWT.verifyTokenShipper, ControllerShipper.getStats);
router.get('/api/shipper/overview', ControllerJWT.verifyTokenShipper, ControllerShipper.getOverview);

router.patch('/api/shipper/orders/:orderId/start', ControllerJWT.verifyTokenShipper, ControllerShipper.startDelivery);

router.patch('/api/shipper/orders/:orderId/status', ControllerJWT.verifyTokenShipper, ControllerShipper.updateDeliveryStatus);

module.exports = router;
