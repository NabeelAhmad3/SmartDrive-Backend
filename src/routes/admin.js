const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// All trips (admin only)
router.get('/trips', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  try {
    const result = await db.query(
      `SELECT t.*, u.name as driver_name
       FROM trips t JOIN users u ON t.user_id=u.id
       ORDER BY t.start_time DESC`
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// All drivers
router.get('/drivers', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  try {
    const result = await db.query(
      `SELECT id, name, email, is_active, role, created_at FROM users WHERE role='driver'ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Toggle driver active status
router.put('/drivers/:id/status', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  const { is_active } = req.body;
  try {
    const result = await db.query(
      `UPDATE users SET is_active = $1
       WHERE id = $2 RETURNING id, name, is_active`,
      [is_active, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Analytics — trips per day
router.get('/analytics', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  try {
    const result = await db.query(
      `SELECT DATE(start_time) as date,
              COUNT(*) as total_trips,
              AVG(avg_speed) as avg_speed,
              SUM(total_distance) as total_distance
       FROM trips WHERE status = 'completed'
       GROUP BY DATE(start_time)
       ORDER BY date DESC LIMIT 30`
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// All overspeed alerts
router.get('/overspeed/all', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  try {
    const result = await db.query(
      `SELECT sa.*, u.name as driver_name, t.start_time as trip_date
       FROM speed_alerts sa
       JOIN users u ON sa.user_id = u.id
       JOIN trips t ON sa.trip_id = t.id
       ORDER BY sa.created_at DESC`
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Overspeed alerts for specific driver
router.get('/overspeed/:userId', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT sa.*, t.start_time, t.end_time
       FROM speed_alerts sa
       JOIN trips t ON sa.trip_id = t.id
       WHERE sa.user_id = $1
       ORDER BY sa.created_at DESC`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/overspeed', auth, async (req, res) => {
  const { tripId, speed, limitSet } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO speed_alerts (user_id, trip_id, speed, limit_set, timestamp)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, tripId, speed, limitSet, Date.now()]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Speed alert insert error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/trips/:id/points', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  try {
    const result = await db.query(
      `SELECT lat, lng, speed, timestamp
       FROM gps_points
       WHERE trip_id = $1
       ORDER BY timestamp ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/drivers/active', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  try {
    const result = await db.query(
      `SELECT DISTINCT user_id FROM trips WHERE status = 'active'`
    );
    res.json(result.rows.map(r => r.user_id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/drivers/live', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  try {
    const result = await db.query(
      `SELECT DISTINCT ON (t.user_id)
              t.user_id, u.name AS driver_name, t.id AS trip_id,
              gp.lat, gp.lng, gp.speed, gp.timestamp
       FROM trips t
       JOIN users u ON u.id = t.user_id
       JOIN gps_points gp ON gp.trip_id = t.id
       WHERE t.status = 'active'
       ORDER BY t.user_id, gp.timestamp DESC`
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;