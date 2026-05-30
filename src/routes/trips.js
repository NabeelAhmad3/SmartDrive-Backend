
const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.post('/start', auth, async (req, res) => {
  try {
    const result = await db.query(
      `INSERT INTO trips (user_id, start_time, status)
       VALUES ($1, NOW(), 'active') RETURNING *`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/end/:id', auth, async (req, res) => {
  const { totalDistance, maxSpeed, avgSpeed } = req.body;
  try {
    const result = await db.query(
      `UPDATE trips SET end_time=NOW(), status='completed',
       total_distance=$1, max_speed=$2, avg_speed=$3
       WHERE id=$4 RETURNING *`,
      [totalDistance, maxSpeed, avgSpeed, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM trips WHERE user_id=$1 ORDER BY start_time DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;