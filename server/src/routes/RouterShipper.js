const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Shipper route');
});

module.exports = router;
