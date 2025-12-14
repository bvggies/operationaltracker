const express = require('express');
const pool = require('./config/db');
const { authenticateToken, authorizeRoles } = require('./middleware/auth');
const { logAudit } = require('./middleware/audit');

const router = express.Router();

// Get all tasks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { project_id, assigned_to, status } = req.query;
    let query = `
      SELECT t.*, 
             p.name as project_name,
             u1.full_name as assigned_to_name,
             u2.full_name as created_by_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (project_id) {
      query += ` AND t.project_id = $${paramCount++}`;
      params.push(project_id);
    }
    if (assigned_to) {
      query += ` AND t.assigned_to = $${paramCount++}`;
      params.push(assigned_to);
    }
    if (status) {
      query += ` AND t.status = $${paramCount++}`;
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get task by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
              p.name as project_name,
              u1.full_name as assigned_to_name,
              u2.full_name as created_by_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u1 ON t.assigned_to = u1.id
       LEFT JOIN users u2 ON t.created_by = u2.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create task
router.post('/', authenticateToken, authorizeRoles('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const { title, description, project_id, assigned_to, priority, due_date, status } = req.body;

    const result = await pool.query(
      `INSERT INTO tasks (title, description, project_id, assigned_to, priority, due_date, status, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [title, description, project_id, assigned_to, priority || 'medium', due_date, status || 'pending', req.user.id]
    );

    const task = result.rows[0];
    await logAudit(req.user.id, 'CREATE', 'TASK', task.id, { title, project_id });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assigned_to, priority, due_date, status, progress_notes, completion_percentage } = req.body;

    // Check if task exists and user has permission
    const taskCheck = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskCheck.rows[0];

    // Workers can only update their own tasks
    if (req.user.role === 'worker' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await pool.query(
      `UPDATE tasks 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           assigned_to = COALESCE($3, assigned_to),
           priority = COALESCE($4, priority),
           due_date = COALESCE($5, due_date),
           status = COALESCE($6, status),
           progress_notes = COALESCE($7, progress_notes),
           completion_percentage = COALESCE($8, completion_percentage),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [title, description, assigned_to, priority, due_date, status, progress_notes, completion_percentage, id]
    );

    await logAudit(req.user.id, 'UPDATE', 'TASK', id, req.body);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Log activity
router.post('/:id/activity', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { activity_type, description, hours_worked } = req.body;

    const result = await pool.query(
      `INSERT INTO task_activities (task_id, user_id, activity_type, description, hours_worked, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [id, req.user.id, activity_type, description, hours_worked]
    );

    await logAudit(req.user.id, 'CREATE', 'TASK_ACTIVITY', result.rows[0].id, { task_id: id, activity_type });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get task activities
router.get('/:id/activities', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ta.*, u.full_name as user_name
       FROM task_activities ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = $1
       ORDER BY ta.created_at DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

