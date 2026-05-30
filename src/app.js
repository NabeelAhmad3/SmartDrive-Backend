const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth',  require('./routes/auth'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/gps',   require('./routes/gps'));
app.use('/api/admin', require('./routes/admin'));

app.get('/', (req, res) => {
  res.json({ status: 'SmartDrive API running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});