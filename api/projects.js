const express = require('express');
const pool = require('./config/db');
const { authenticateToken, authorizeRoles } = require('./middleware/auth');
const { logAudit } = require('./middleware/audit');

const router = express.Router();

// Get all projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT p.*, 
             u.full_name as supervisor_name,
             COUNT(DISTINCT ps.user_id) as team_size
      FROM projects p
      LEFT JOIN users u ON p.supervisor_id = u.id
      LEFT JOIN project_staff ps ON p.id = ps.project_id
      GROUP BY p.id, u.full_name
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get project by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const projectResult = await pool.query(
      `SELECT p.*, u.full_name as supervisor_name
       FROM projects p
       LEFT JOIN users u ON p.supervisor_id = u.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Get team members
    const teamResult = await pool.query(
      `SELECT u.id, u.full_name, u.role, ps.assigned_at
       FROM project_staff ps
       JOIN users u ON ps.user_id = u.id
       WHERE ps.project_id = $1`,
      [req.params.id]
    );

    project.team = teamResult.rows;

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create project
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { name, description, location, start_date, end_date, supervisor_id, status } = req.body;

    const result = await pool.query(
      `INSERT INTO projects (name, description, location, start_date, end_date, supervisor_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [name, description, location, start_date, end_date, supervisor_id, status || 'planning']
    );

    const project = result.rows[0];
    await logAudit(req.user.id, 'CREATE', 'PROJECT', project.id, { name, location });

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update project
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, location, start_date, end_date, supervisor_id, status } = req.body;

    // Check permissions
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await pool.query(
      `UPDATE projects 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           location = COALESCE($3, location),
           start_date = COALESCE($4, start_date),
           end_date = COALESCE($5, end_date),
           supervisor_id = COALESCE($6, supervisor_id),
           status = COALESCE($7, status),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, description, location, start_date, end_date, supervisor_id, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await logAudit(req.user.id, 'UPDATE', 'PROJECT', id, req.body);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign team members to project
router.post('/:id/team', authenticateToken, authorizeRoles('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { user_ids } = req.body;

    // Remove existing assignments
    await pool.query('DELETE FROM project_staff WHERE project_id = $1', [id]);

    // Add new assignments
    for (const userId of user_ids) {
      await pool.query(
        'INSERT INTO project_staff (project_id, user_id, assigned_at) VALUES ($1, $2, NOW())',
        [id, userId]
      );
    }

    await logAudit(req.user.id, 'UPDATE', 'PROJECT_TEAM', id, { user_ids });

    res.json({ message: 'Team assigned successfully' });
  } catch (error) {
    console.error('Assign team error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

