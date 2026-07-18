const express = require('express');
const router = express.Router();

const ControllerJWT = require('../jwt/ControllerJWT');
const ControllerDeliveryStatus = require('../controllers/ControllerDeliveryStatus');
const uploadDeliveryEvidence = require('../middlewares/uploadDeliveryEvidence');

router.get(
    '/api/orders/delivery/failure-reasons',
    ControllerJWT.verifyToken,
    ControllerDeliveryStatus.getFailureReasons,
);

router.get(
    '/api/orders/delivery-evidence',
    ControllerJWT.verifyToken,
    ControllerDeliveryStatus.serveEvidenceFile,
);

router.put(
    '/api/orders/:orderId/delivery-status',
    ControllerJWT.verifyToken,
    uploadDeliveryEvidence.single('evidenceImage'),
    ControllerDeliveryStatus.updateDeliveryStatus,
);

router.get(
    '/api/orders/:orderId/delivery',
    ControllerJWT.verifyToken,
    ControllerDeliveryStatus.getDelivery,
);

router.get(
    '/api/orders/:orderId/delivery-history',
    ControllerJWT.verifyToken,
    ControllerDeliveryStatus.getDeliveryHistory,
);

router.patch(
    '/api/orders/:orderId/confirm-return',
    ControllerJWT.verifyToken,
    ControllerDeliveryStatus.confirmReturn,
);

module.exports = router;
