const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { is_read } = req.query;

    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;
    const params = [req.user.id];
    let paramCount = 2;

    if (is_read !== undefined) {
      query += ` AND is_read = $${paramCount++}`;
      params.push(is_read === 'true');
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all as read
router.patch('/read-all', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications 
       SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create notification (internal function, can be called from other routes)
const createNotification = async (userId, type, title, message, entityType = null, entityId = null) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, type, title, message, entityType, entityId]
    );
  } catch (error) {
    console.error('Create notification error:', error);
  }
};

module.exports = { router, createNotification };

