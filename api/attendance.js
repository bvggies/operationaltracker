const express = require('express');
const pool = require('./config/db');
const { authenticateToken, authorizeRoles } = require('./middleware/auth');
const { logAudit } = require('./middleware/audit');

const router = express.Router();

// Get attendance records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { user_id, project_id, date, start_date, end_date } = req.query;
    let query = `
      SELECT a.*, 
             u.full_name as user_name,
             p.name as project_name
      FROM attendance a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (user_id) {
      query += ` AND a.user_id = $${paramCount++}`;
      params.push(user_id);
    }
    if (project_id) {
      query += ` AND a.project_id = $${paramCount++}`;
      params.push(project_id);
    }
    if (date) {
      query += ` AND DATE(a.attendance_date) = $${paramCount++}`;
      params.push(date);
    }
    if (start_date && end_date) {
      query += ` AND DATE(a.attendance_date) BETWEEN $${paramCount++} AND $${paramCount++}`;
      params.push(start_date, end_date);
    }

    query += ' ORDER BY a.attendance_date DESC, a.clock_in_time DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Clock in
router.post('/clock-in', authenticateToken, async (req, res) => {
  try {
    const { project_id, notes } = req.body;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Check if already clocked in today
    const existingCheck = await pool.query(
      `SELECT * FROM attendance 
       WHERE user_id = $1 AND DATE(attendance_date) = $2 AND clock_out_time IS NULL`,
      [userId, today]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already clocked in today' });
    }

    const result = await pool.query(
      `INSERT INTO attendance (user_id, project_id, attendance_date, clock_in_time, status, notes, created_at)
       VALUES ($1, $2, NOW(), NOW(), 'present', $3, NOW())
       RETURNING *`,
      [userId, project_id, notes]
    );

    await logAudit(userId, 'CREATE', 'ATTENDANCE', result.rows[0].id, { action: 'clock_in', project_id });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Clock out
router.post('/clock-out', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Find today's attendance record
    const attendanceResult = await pool.query(
      `SELECT * FROM attendance 
       WHERE user_id = $1 AND DATE(attendance_date) = $2 AND clock_out_time IS NULL`,
      [userId, today]
    );

    if (attendanceResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active clock-in found' });
    }

    const attendance = attendanceResult.rows[0];
    const clockOutTime = new Date();
    const clockInTime = new Date(attendance.clock_in_time);
    const hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60);

    const result = await pool.query(
      `UPDATE attendance 
       SET clock_out_time = NOW(),
           hours_worked = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [hoursWorked, attendance.id]
    );

    await logAudit(userId, 'UPDATE', 'ATTENDANCE', attendance.id, { action: 'clock_out', hours_worked });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark attendance (Supervisor/Admin)
router.post('/mark', authenticateToken, authorizeRoles('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const { user_id, project_id, attendance_date, status, clock_in_time, clock_out_time, notes } = req.body;

    const result = await pool.query(
      `INSERT INTO attendance (user_id, project_id, attendance_date, clock_in_time, clock_out_time, status, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [user_id, project_id, attendance_date, clock_in_time, clock_out_time, status, notes]
    );

    await logAudit(req.user.id, 'CREATE', 'ATTENDANCE', result.rows[0].id, { user_id, status });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update attendance
router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, clock_in_time, clock_out_time, notes } = req.body;

    const result = await pool.query(
      `UPDATE attendance 
       SET status = COALESCE($1, status),
           clock_in_time = COALESCE($2, clock_in_time),
           clock_out_time = COALESCE($3, clock_out_time),
           notes = COALESCE($4, notes),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [status, clock_in_time, clock_out_time, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    await logAudit(req.user.id, 'UPDATE', 'ATTENDANCE', id, req.body);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create leave request
router.post('/leave-requests', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, leave_type, reason } = req.body;

    const result = await pool.query(
      `INSERT INTO leave_requests (user_id, start_date, end_date, leave_type, reason, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING *`,
      [req.user.id, start_date, end_date, leave_type, reason]
    );

    const leaveRequest = result.rows[0];
    await logAudit(req.user.id, 'CREATE', 'LEAVE_REQUEST', leaveRequest.id, { start_date, end_date, leave_type });

    res.status(201).json(leaveRequest);
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leave requests
router.get('/leave-requests', authenticateToken, async (req, res) => {
  try {
    const { user_id, status } = req.query;
    let query = `
      SELECT lr.*, u.full_name as user_name
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (user_id) {
      query += ` AND lr.user_id = $${paramCount++}`;
      params.push(user_id);
    }
    if (status) {
      query += ` AND lr.status = $${paramCount++}`;
      params.push(status);
    }

    // Workers can only see their own requests
    if (req.user.role === 'worker' && !user_id) {
      query += ` AND lr.user_id = $${paramCount++}`;
      params.push(req.user.id);
    }

    query += ' ORDER BY lr.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve/reject leave request
router.patch('/leave-requests/:id', authenticateToken, authorizeRoles('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;

    const result = await pool.query(
      `UPDATE leave_requests 
       SET status = $1, 
           reviewed_by = $2,
           review_comments = $3,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, req.user.id, comments, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    await logAudit(req.user.id, 'UPDATE', 'LEAVE_REQUEST', id, { status });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update leave request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

