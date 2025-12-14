const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.query;
    const projectFilter = project_id ? `AND project_id = ${project_id}` : '';

    // Get stats
    const stats = {};

    // Projects
    const projectsResult = await pool.query(
      `SELECT COUNT(*) as total, 
              COUNT(*) FILTER (WHERE status = 'active') as active,
              COUNT(*) FILTER (WHERE status = 'completed') as completed
       FROM projects ${project_id ? 'WHERE id = $1' : ''}`,
      project_id ? [project_id] : []
    );
    stats.projects = projectsResult.rows[0];

    // Tasks
    const tasksResult = await pool.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'pending') as pending,
              COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
              COUNT(*) FILTER (WHERE status = 'completed') as completed,
              COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed') as overdue
       FROM tasks ${project_id ? 'WHERE project_id = $1' : ''}`,
      project_id ? [project_id] : []
    );
    stats.tasks = tasksResult.rows[0];

    // Materials
    const materialsResult = await pool.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE current_balance < 10) as low_stock
       FROM materials ${project_id ? 'WHERE project_id = $1' : ''}`,
      project_id ? [project_id] : []
    );
    stats.materials = materialsResult.rows[0];

    // Equipment
    const equipmentResult = await pool.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'available') as available,
              COUNT(*) FILTER (WHERE status = 'in_use') as in_use,
              COUNT(*) FILTER (WHERE status = 'broken') as broken
       FROM equipment ${project_id ? 'WHERE project_id = $1' : ''}`,
      project_id ? [project_id] : []
    );
    stats.equipment = equipmentResult.rows[0];

    // Attendance (today)
    const today = new Date().toISOString().split('T')[0];
    const attendanceResult = await pool.query(
      `SELECT COUNT(*) as present_today
       FROM attendance 
       WHERE DATE(attendance_date) = $1 ${project_id ? 'AND project_id = $2' : ''}`,
      project_id ? [today, project_id] : [today]
    );
    stats.attendance = attendanceResult.rows[0];

    res.json(stats);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get progress report
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const { project_id, start_date, end_date } = req.query;

    let query = `
      SELECT 
        DATE(t.created_at) as date,
        COUNT(*) as tasks_created,
        COUNT(*) FILTER (WHERE t.status = 'completed') as tasks_completed,
        AVG(t.completion_percentage) as avg_completion
      FROM tasks t
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (project_id) {
      query += ` AND t.project_id = $${paramCount++}`;
      params.push(project_id);
    }
    if (start_date) {
      query += ` AND DATE(t.created_at) >= $${paramCount++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND DATE(t.created_at) <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ' GROUP BY DATE(t.created_at) ORDER BY date DESC LIMIT 30';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get progress report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get material usage report
router.get('/materials', authenticateToken, async (req, res) => {
  try {
    const { project_id, start_date, end_date } = req.query;

    let query = `
      SELECT 
        m.name,
        m.unit,
        m.quantity as initial_quantity,
        m.current_balance,
        COALESCE(SUM(mu.quantity_used), 0) as total_used
      FROM materials m
      LEFT JOIN material_usage mu ON m.id = mu.material_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (project_id) {
      query += ` AND m.project_id = $${paramCount++}`;
      params.push(project_id);
    }

    query += ' GROUP BY m.id, m.name, m.unit, m.quantity, m.current_balance ORDER BY m.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get material report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get equipment status report
router.get('/equipment', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.query;

    let query = `
      SELECT 
        e.*,
        p.name as project_name,
        COUNT(eb.id) as breakdown_count,
        COUNT(em.id) as maintenance_count
      FROM equipment e
      LEFT JOIN projects p ON e.project_id = p.id
      LEFT JOIN equipment_breakdowns eb ON e.id = eb.equipment_id
      LEFT JOIN equipment_maintenance em ON e.id = em.equipment_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (project_id) {
      query += ` AND e.project_id = $${paramCount++}`;
      params.push(project_id);
    }

    query += ' GROUP BY e.id, p.name ORDER BY e.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get equipment report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get attendance report
router.get('/attendance', authenticateToken, async (req, res) => {
  try {
    const { project_id, start_date, end_date } = req.query;

    let query = `
      SELECT 
        u.id,
        u.full_name,
        COUNT(a.id) as days_present,
        SUM(a.hours_worked) as total_hours,
        AVG(a.hours_worked) as avg_hours_per_day
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (project_id) {
      query += ` AND a.project_id = $${paramCount++}`;
      params.push(project_id);
    }
    if (start_date) {
      query += ` AND DATE(a.attendance_date) >= $${paramCount++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND DATE(a.attendance_date) <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ' GROUP BY u.id, u.full_name ORDER BY u.full_name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

