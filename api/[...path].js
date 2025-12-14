// Vercel catch-all serverless function for all API routes
// This file handles all /api/* requests
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: true, // Allow all origins in serverless
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import routes
app.use('/auth', require('./auth'));
app.use('/users', require('./users'));
app.use('/projects', require('./projects'));
app.use('/tasks', require('./tasks'));
app.use('/materials', require('./materials'));
app.use('/equipment', require('./equipment'));
app.use('/attendance', require('./attendance'));
app.use('/reports', require('./reports'));
app.use('/notifications', require('./notifications'));
app.use('/documents', require('./documents'));
app.use('/audit', require('./audit'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root API endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Operations Tracker API', version: '1.0.0' });
});

// 404 handler for API routes
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.path });
});

// Export as Vercel serverless function
// Handle the catch-all path: /api/[...path] -> /[...path]
module.exports = (req, res) => {
  // Vercel rewrites /api/* to /api/[...path]
  // We need to strip /api from the path so Express routes work correctly
  const originalUrl = req.url;
  const originalPath = req.path;
  
  // Remove /api prefix if present
  if (originalUrl.startsWith('/api')) {
    req.url = originalUrl.replace(/^\/api/, '') || '/';
  }
  if (originalPath && originalPath.startsWith('/api')) {
    req.path = originalPath.replace(/^\/api/, '') || '/';
  }
  
  // Also handle baseUrl if set
  if (req.baseUrl && req.baseUrl.startsWith('/api')) {
    req.baseUrl = req.baseUrl.replace(/^\/api/, '');
  }
  
  return app(req, res);
};
