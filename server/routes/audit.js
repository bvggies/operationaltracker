const express = require('express');
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get audit logs
router.get('/', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { entity_type, entity_id, user_id, start_date, end_date } = req.query;
    let query = `
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (entity_type) {
      query += ` AND al.entity_type = $${paramCount++}`;
      params.push(entity_type);
    }
    if (entity_id) {
      query += ` AND al.entity_id = $${paramCount++}`;
      params.push(entity_id);
    }
    if (user_id) {
      query += ` AND al.user_id = $${paramCount++}`;
      params.push(user_id);
    }
    if (start_date) {
      query += ` AND DATE(al.created_at) >= $${paramCount++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND DATE(al.created_at) <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ' ORDER BY al.created_at DESC LIMIT 500';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

