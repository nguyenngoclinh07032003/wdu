const express = require('express');
const router = express.Router();

const ControllerDoctor = require('../controllers/ControllerDoctor');
const ControllerJWT = require('../jwt/ControllerJWT');
const uploadDoctorCertificate = require('../middlewares/uploadDoctorCertificate');

router.get('/profile', ControllerJWT.verifyTokenDoctor, ControllerDoctor.getProfile);
router.put('/profile', ControllerJWT.verifyTokenDoctor, ControllerDoctor.updateProfile);
router.post(
    '/certificate',
    ControllerJWT.verifyTokenDoctor,
    uploadDoctorCertificate.single('certificate'),
    ControllerDoctor.uploadCertificate
);
router.get('/questions', ControllerJWT.verifyTokenDoctor, ControllerDoctor.getQuestions);
router.post('/questions', ControllerJWT.verifyTokenDoctor, ControllerDoctor.askQuestion);

router.get(
    '/admin/certificates',
    ControllerJWT.verifyTokenAdmin,
    ControllerDoctor.listCertificatesForAdmin
);
router.put(
    '/admin/certificates/:id/approve',
    ControllerJWT.verifyTokenAdmin,
    ControllerDoctor.approveCertificate
);
router.put(
    '/admin/certificates/:id/reject',
    ControllerJWT.verifyTokenAdmin,
    ControllerDoctor.rejectCertificate
);
router.get('/admin/questions', ControllerJWT.verifyTokenAdmin, ControllerDoctor.listQuestionsForAdmin);
router.put('/admin/questions/:id/answer', ControllerJWT.verifyTokenAdmin, ControllerDoctor.answerQuestionAsAdmin);

module.exports = router;
