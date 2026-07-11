const express = require('express');

const router = express.Router();

const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = (forwarded ? String(forwarded).split(',')[0] : req.socket?.remoteAddress || '').trim();

    return rawIp.replace('::ffff:', '');
};

router.get('/client-network', (req, res) => {
    return res.status(200).json({
        ip: getClientIp(req),
        source: 'server',
    });
});

module.exports = router;
