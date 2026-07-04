const express = require('express');
const router = express.Router();

const ControllerPayments = require('../controllers/ControllerPayments');
const middlewareController = require('../jwt/ControllerJWT');

router.post('/payment', middlewareController.verifyToken, ControllerPayments.PaymentsMomo);
router.get('/checkdata', ControllerPayments.checkData);
router.get('/payment', middlewareController.verifyToken, ControllerPayments.getPayment);
router.post('/paymentcod', middlewareController.verifyToken, ControllerPayments.PaymentCod);
router.get('/payments', middlewareController.verifyToken, ControllerPayments.getPayments);
router.get('/dataorderuser', middlewareController.verifyToken, ControllerPayments.GetOrderUser);
router.post('/cancelorder', middlewareController.verifyToken, ControllerPayments.CancelOrder);
router.post('/paymentvnpay', middlewareController.verifyToken, ControllerPayments.paymentVnpay);
router.get('/check-payment-vnpay', ControllerPayments.checkPaymentVnpay);
router.post('/admin/update-order', middlewareController.verifyTokenAdmin, ControllerPayments.EditOrder);
router.post('/admin/cancelorder', middlewareController.verifyTokenAdmin, ControllerPayments.AdminCancelOrder);

module.exports = router;
