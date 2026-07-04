const express = require('express');
const router = express.Router();

const {
    getAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
} = require('../controllers/ControllerAddress');

const authMiddleware = require('../jwt/ControllerJWT').verifyToken;

router.use(authMiddleware);
router.get('/', getAddresses);
router.post('/', createAddress);
router.put('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.patch('/:id/default', setDefaultAddress);

module.exports = router;
