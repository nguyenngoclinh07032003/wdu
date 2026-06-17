const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Blog route');
});

module.exports = router;
