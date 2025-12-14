const express = require('express');
const pool = require('./config/db');
const { authenticateToken, authorizeRoles } = require('./middleware/auth');
const { logAudit } = require('./middleware/audit');

const router = express.Router();

// Get all materials
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.query;
    let query = `
      SELECT m.*, p.name as project_name
      FROM materials m
      LEFT JOIN projects p ON m.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (project_id) {
      query += ' AND m.project_id = $1';
      params.push(project_id);
    }

    query += ' ORDER BY m.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get material by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, p.name as project_name
       FROM materials m
       LEFT JOIN projects p ON m.project_id = p.id
       WHERE m.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create material record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, unit, quantity, project_id, unit_price, supplier } = req.body;

    const result = await pool.query(
      `INSERT INTO materials (name, description, unit, quantity, current_balance, project_id, unit_price, supplier, created_at)
       VALUES ($1, $2, $3, $4, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [name, description, unit, quantity, project_id, unit_price, supplier]
    );

    const material = result.rows[0];
    await logAudit(req.user.id, 'CREATE', 'MATERIAL', material.id, { name, quantity });

    res.status(201).json(material);
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update material
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, unit, quantity, unit_price, supplier } = req.body;

    const result = await pool.query(
      `UPDATE materials 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           unit = COALESCE($3, unit),
           quantity = COALESCE($4, quantity),
           unit_price = COALESCE($5, unit_price),
           supplier = COALESCE($6, supplier),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, description, unit, quantity, unit_price, supplier, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    await logAudit(req.user.id, 'UPDATE', 'MATERIAL', id, req.body);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Record material usage
router.post('/:id/usage', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity_used, notes } = req.body;

    // Get current balance
    const materialResult = await pool.query('SELECT current_balance FROM materials WHERE id = $1', [id]);
    if (materialResult.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const currentBalance = materialResult.rows[0].current_balance;
    const newBalance = currentBalance - quantity_used;

    if (newBalance < 0) {
      return res.status(400).json({ error: 'Insufficient material balance' });
    }

    // Update balance
    await pool.query(
      'UPDATE materials SET current_balance = $1, updated_at = NOW() WHERE id = $2',
      [newBalance, id]
    );

    // Record usage
    const usageResult = await pool.query(
      `INSERT INTO material_usage (material_id, user_id, quantity_used, notes, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [id, req.user.id, quantity_used, notes]
    );

    await logAudit(req.user.id, 'UPDATE', 'MATERIAL_USAGE', id, { quantity_used, new_balance: newBalance });

    res.status(201).json(usageResult.rows[0]);
  } catch (error) {
    console.error('Record usage error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create material requisition
router.post('/requisitions', authenticateToken, async (req, res) => {
  try {
    const { material_id, quantity_requested, project_id, notes } = req.body;

    const result = await pool.query(
      `INSERT INTO material_requisitions (material_id, project_id, requested_by, quantity_requested, status, notes, created_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
       RETURNING *`,
      [material_id, project_id, req.user.id, quantity_requested, notes]
    );

    const requisition = result.rows[0];
    await logAudit(req.user.id, 'CREATE', 'MATERIAL_REQUISITION', requisition.id, { quantity_requested });

    res.status(201).json(requisition);
  } catch (error) {
    console.error('Create requisition error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get requisitions
router.get('/requisitions/all', authenticateToken, async (req, res) => {
  try {
    const { status, project_id } = req.query;
    let query = `
      SELECT mr.*, 
             m.name as material_name,
             p.name as project_name,
             u.full_name as requested_by_name
      FROM material_requisitions mr
      LEFT JOIN materials m ON mr.material_id = m.id
      LEFT JOIN projects p ON mr.project_id = p.id
      LEFT JOIN users u ON mr.requested_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND mr.status = $${paramCount++}`;
      params.push(status);
    }
    if (project_id) {
      query += ` AND mr.project_id = $${paramCount++}`;
      params.push(project_id);
    }

    query += ' ORDER BY mr.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get requisitions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve/reject requisition
router.patch('/requisitions/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approved_quantity } = req.body;

    const result = await pool.query(
      `UPDATE material_requisitions 
       SET status = $1, 
           approved_quantity = COALESCE($2, approved_quantity),
           approved_by = $3,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, approved_quantity, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    // If approved, update material balance
    if (status === 'approved' && approved_quantity) {
      const requisition = result.rows[0];
      await pool.query(
        `UPDATE materials 
         SET current_balance = current_balance + $1, updated_at = NOW()
         WHERE id = $2`,
        [approved_quantity, requisition.material_id]
      );
    }

    await logAudit(req.user.id, 'UPDATE', 'MATERIAL_REQUISITION', id, { status });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update requisition error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get material usage logs
router.get('/:id/usage', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mu.*, u.full_name as user_name
       FROM material_usage mu
       JOIN users u ON mu.user_id = u.id
       WHERE mu.material_id = $1
       ORDER BY mu.created_at DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get usage logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

