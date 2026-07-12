const express = require('express');
const router = express.Router();
const ControllerSupportRequest = require('../controllers/ControllerSupportRequest');
const ControllerJWT = require('../jwt/ControllerJWT');

router.get(
    '/support-requests/pending-count',
    ControllerJWT.verifyTokenStaff,
    ControllerSupportRequest.getPendingCount,
);
router.get(
    '/support-requests/staff-users',
    ControllerJWT.verifyTokenStaff,
    ControllerSupportRequest.getStaffUsers,
);
router.get('/support-requests', ControllerJWT.verifyTokenStaff, ControllerSupportRequest.list);
router.get('/support-requests/:id', ControllerJWT.verifyTokenStaff, ControllerSupportRequest.getById);
router.put('/support-requests/:id/accept', ControllerJWT.verifyTokenStaff, ControllerSupportRequest.accept);
router.put('/support-requests/:id/assign', ControllerJWT.verifyTokenStaff, ControllerSupportRequest.assign);
router.put('/support-requests/:id/status', ControllerJWT.verifyTokenStaff, ControllerSupportRequest.updateStatus);
router.put('/support-requests/:id/note', ControllerJWT.verifyTokenStaff, ControllerSupportRequest.addNote);
router.put('/support-requests/:id/reply', ControllerJWT.verifyTokenStaff, ControllerSupportRequest.addReply);

module.exports = router;
