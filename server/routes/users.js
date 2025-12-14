const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, full_name, role, is_active, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user (Admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { username, password, email, full_name, role } = req.body;

    const userCheck = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, password_hash, email, full_name, role, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING id, username, email, full_name, role, is_active, created_at`,
      [username, hashedPassword, email, full_name, role || 'worker']
    );

    const user = result.rows[0];
    await logAudit(req.user.id, 'CREATE', 'USER', user.id, { username, role: user.role });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, role, password } = req.body;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (email) {
      updateFields.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (full_name) {
      updateFields.push(`full_name = $${paramCount++}`);
      values.push(full_name);
    }
    if (role && req.user.role === 'admin') {
      updateFields.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push(`password_hash = $${paramCount++}`);
      values.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING id, username, email, full_name, role, is_active, created_at`,
      values
    );

    await logAudit(req.user.id, 'UPDATE', 'USER', id, req.body);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Deactivate user (Admin only)
router.patch('/:id/deactivate', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE users SET is_active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING id, username, email, full_name, role, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAudit(req.user.id, 'DEACTIVATE', 'USER', id);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Activate user (Admin only)
router.patch('/:id/activate', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE users SET is_active = true, updated_at = NOW()
       WHERE id = $1
       RETURNING id, username, email, full_name, role, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAudit(req.user.id, 'ACTIVATE', 'USER', id);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

