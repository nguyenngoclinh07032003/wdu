const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Payments route');
});

module.exports = router;
