const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.post('/sync', auth, async (req, res) => {
  const { points } = req.body;
  if (!points || !points.length) {
    return res.json({ synced: 0 });
  }
  try {
    for (const p of points) {
      await db.query(
        `INSERT INTO gps_points (trip_id,lat,lng,speed,timestamp)
         VALUES ($1,$2,$3,$4,$5)`,
        [p.tripId, p.lat, p.lng, p.speed, p.timestamp]
      );
    }
    res.json({ synced: points.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/trip/:tripId', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM gps_points WHERE trip_id=$1 ORDER BY timestamp ASC',
      [req.params.tripId]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;