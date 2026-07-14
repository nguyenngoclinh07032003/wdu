const express = require('express');
const router = express.Router();

const ControllerUser = require('../controllers/ControllerUsers');
const ControllerJWT = require('../jwt/ControllerJWT');

const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve(__dirname, '../uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

router.post('/api/register', ControllerUser.Register);
router.post('/api/login', ControllerUser.Login);
router.post('/api/google-login', ControllerUser.GoogleLogin);
router.post('/api/facebook-login', ControllerUser.FacebookLogin);

router.get('/api/auth', ControllerJWT.verifyToken, ControllerUser.GetUser);

router.put(
    '/api/auth/update-profile',
    ControllerJWT.verifyToken,
    upload.single('avatar'),
    ControllerUser.UpdateProfile,
);

router.get('/api/me', ControllerJWT.verifyToken, async (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user,
    });
});
router.post('/api/logout', ControllerJWT.verifyToken, ControllerUser.Logout);

router.get('/api/getallorder', ControllerJWT.verifyTokenStaffOrAdmin, ControllerUser.GetOrder);
router.get('/api/getalluser', ControllerJWT.verifyTokenAdmin, ControllerUser.getAllUser);
router.delete('/api/deleteuser', ControllerJWT.verifyTokenAdmin, ControllerUser.DeleteUser);

router.post('/api/forgotpassword', ControllerUser.ForgotPassword);
router.post('/api/resetpassword', ControllerUser.ResetPassword);
router.get('/api/refresh-token', ControllerUser.RefreshToken);

router.put('/api/update-status-user/:id', ControllerJWT.verifyTokenAdmin, ControllerUser.UpdateStatusUser);
router.put('/api/update-user/:id', ControllerJWT.verifyTokenAdmin, ControllerUser.UpdateUser);
router.get('/api/user/:id', ControllerJWT.verifyTokenAdmin, ControllerUser.GetUserById);

router.get('/api/get-all-shipper', ControllerJWT.verifyTokenStaffOrAdmin, ControllerUser.GetAllShipper);
router.put('/api/assign-order-shipper/:orderId', ControllerJWT.verifyTokenStaffOrAdmin, ControllerUser.AssignOrderToShipper);
module.exports = router;
