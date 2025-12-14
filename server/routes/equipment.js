const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// Get all equipment
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { project_id, status } = req.query;
    let query = `
      SELECT e.*, p.name as project_name
      FROM equipment e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (project_id) {
      query += ` AND e.project_id = $${paramCount++}`;
      params.push(project_id);
    }
    if (status) {
      query += ` AND e.status = $${paramCount++}`;
      params.push(status);
    }

    query += ' ORDER BY e.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get equipment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, p.name as project_name
       FROM equipment e
       LEFT JOIN projects p ON e.project_id = p.id
       WHERE e.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create equipment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type, serial_number, project_id, status, last_maintenance_date, next_maintenance_date } = req.body;

    const result = await pool.query(
      `INSERT INTO equipment (name, type, serial_number, project_id, status, last_maintenance_date, next_maintenance_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [name, type, serial_number, project_id, status || 'available', last_maintenance_date, next_maintenance_date]
    );

    const equipment = result.rows[0];
    await logAudit(req.user.id, 'CREATE', 'EQUIPMENT', equipment.id, { name, type });

    res.status(201).json(equipment);
  } catch (error) {
    console.error('Create equipment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update equipment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, serial_number, project_id, status, last_maintenance_date, next_maintenance_date } = req.body;

    const result = await pool.query(
      `UPDATE equipment 
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           serial_number = COALESCE($3, serial_number),
           project_id = COALESCE($4, project_id),
           status = COALESCE($5, status),
           last_maintenance_date = COALESCE($6, last_maintenance_date),
           next_maintenance_date = COALESCE($7, next_maintenance_date),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, type, serial_number, project_id, status, last_maintenance_date, next_maintenance_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    await logAudit(req.user.id, 'UPDATE', 'EQUIPMENT', id, req.body);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update equipment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Record breakdown
router.post('/:id/breakdown', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, severity, estimated_repair_date } = req.body;

    // Update equipment status
    await pool.query(
      'UPDATE equipment SET status = $1, updated_at = NOW() WHERE id = $2',
      ['broken', id]
    );

    // Record breakdown
    const result = await pool.query(
      `INSERT INTO equipment_breakdowns (equipment_id, reported_by, description, severity, estimated_repair_date, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'reported', NOW())
       RETURNING *`,
      [id, req.user.id, description, severity, estimated_repair_date]
    );

    await logAudit(req.user.id, 'CREATE', 'EQUIPMENT_BREAKDOWN', result.rows[0].id, { equipment_id: id, severity });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Record breakdown error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Record maintenance
router.post('/:id/maintenance', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { maintenance_type, description, cost, next_maintenance_date } = req.body;

    // Record maintenance
    const result = await pool.query(
      `INSERT INTO equipment_maintenance (equipment_id, performed_by, maintenance_type, description, cost, next_maintenance_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [id, req.user.id, maintenance_type, description, cost, next_maintenance_date]
    );

    // Update equipment
    await pool.query(
      `UPDATE equipment 
       SET last_maintenance_date = NOW(),
           next_maintenance_date = COALESCE($1, next_maintenance_date),
           status = 'available',
           updated_at = NOW()
       WHERE id = $2`,
      [next_maintenance_date, id]
    );

    await logAudit(req.user.id, 'CREATE', 'EQUIPMENT_MAINTENANCE', result.rows[0].id, { equipment_id: id, maintenance_type });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Record maintenance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get breakdowns
router.get('/:id/breakdowns', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT eb.*, u.full_name as reported_by_name
       FROM equipment_breakdowns eb
       JOIN users u ON eb.reported_by = u.id
       WHERE eb.equipment_id = $1
       ORDER BY eb.created_at DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get breakdowns error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get maintenance history
router.get('/:id/maintenance', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT em.*, u.full_name as performed_by_name
       FROM equipment_maintenance em
       JOIN users u ON em.performed_by = u.id
       WHERE em.equipment_id = $1
       ORDER BY em.created_at DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get maintenance history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

