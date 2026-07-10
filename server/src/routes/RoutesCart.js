const express = require('express');
const router = express.Router();

const ControllerCart = require('../controllers/ControllerCart');
const middlewareController = require('../jwt/ControllerJWT');

router.post('/api/addtocart', middlewareController.verifyToken, ControllerCart.AddToCart);
router.post('/api/deletecart', middlewareController.verifyToken, ControllerCart.DeleteCart);
router.get('/api/cart', middlewareController.verifyToken, ControllerCart.GetCart);
router.post('/api/update-info-cart', middlewareController.verifyToken, ControllerCart.updateInfoCart);
router.put('/api/update-quantity-cart', middlewareController.verifyToken, ControllerCart.UpdateQuantityCart);
router.post('/api/apply-voucher', middlewareController.verifyToken, ControllerCart.ApplyVoucher);
router.delete('/api/remove-voucher', middlewareController.verifyToken, ControllerCart.RemoveVoucher);

module.exports = router;
