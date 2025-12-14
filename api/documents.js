const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('./config/db');
const { authenticateToken } = require('./middleware/auth');
const { logAudit } = require('./middleware/audit');

const router = express.Router();

// Configure multer for file uploads (using memory storage for serverless)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// For serverless, we'll store file metadata and use a cloud storage service
// For now, we'll store base64 or use Vercel Blob Storage
// This is a simplified version - in production, use Vercel Blob or S3

// Get documents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { project_id, document_type } = req.query;
    let query = `
      SELECT d.*, 
             p.name as project_name,
             u.full_name as uploaded_by_name
      FROM documents d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (project_id) {
      query += ` AND d.project_id = $${paramCount++}`;
      params.push(project_id);
    }
    if (document_type) {
      query += ` AND d.document_type = $${paramCount++}`;
      params.push(document_type);
    }

    query += ' ORDER BY d.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload document (simplified for serverless - store metadata only)
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { project_id, document_type, description } = req.body;

    // For serverless, convert file to base64 or use cloud storage
    // This is a simplified approach - in production use Vercel Blob Storage
    const fileData = req.file.buffer.toString('base64');

    const result = await pool.query(
      `INSERT INTO documents (project_id, document_type, file_name, file_path, file_size, description, uploaded_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        project_id || null,
        document_type || 'other',
        req.file.originalname,
        fileData, // Store base64 for now (not ideal for large files)
        req.file.size,
        description,
        req.user.id
      ]
    );

    const document = result.rows[0];
    await logAudit(req.user.id, 'CREATE', 'DOCUMENT', document.id, { file_name: req.file.originalname, document_type });

    res.status(201).json(document);
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Download document
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = result.rows[0];
    
    // Convert base64 back to buffer
    const fileBuffer = Buffer.from(document.file_path, 'base64');
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = result.rows[0];

    // Check permissions
    if (req.user.role !== 'admin' && document.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Delete record
    await pool.query('DELETE FROM documents WHERE id = $1', [req.params.id]);

    await logAudit(req.user.id, 'DELETE', 'DOCUMENT', req.params.id);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
