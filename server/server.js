// Entry point for the HealthCare server
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('uploads'));

app.get('/', (req, res) => {
  res.send('HealthCare server is running');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
