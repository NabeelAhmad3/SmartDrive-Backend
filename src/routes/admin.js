const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// All trips (admin only)
router.get('/trips', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  const result = await db.query(
    `SELECT t.*, u.name as driver_name
     FROM trips t JOIN users u ON t.user_id=u.id
     ORDER BY t.start_time DESC`
  );
  res.json(result.rows);
});

// All drivers
router.get('/drivers', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  const result = await db.query(
    'SELECT id, name, email, is_active, created_at FROM users WHERE role=$1',
    ['driver']
  );
  res.json(result.rows);
});

// Analytics — trips per day
router.get('/analytics', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  const result = await db.query(
    `SELECT DATE(start_time) as date, COUNT(*) as total_trips,
     AVG(avg_speed) as avg_speed, SUM(total_distance) as total_distance
     FROM trips WHERE status='completed'
     GROUP BY DATE(start_time) ORDER BY date DESC LIMIT 30`
  );
  res.json(result.rows);
});

module.exports = router;