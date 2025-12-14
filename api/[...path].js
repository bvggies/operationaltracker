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

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'API is working!', 
    timestamp: new Date().toISOString(),
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl
  });
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
  try {
    // Vercel rewrites /api/* to /api/[...path]?path=...
    // The path segments from [...path] are available in req.query.path or req.url
    // We need to reconstruct the path without /api prefix for Express
    
    let path = '/';
    
    // Check if path is in query parameter (from rewrite)
    if (req.query && req.query.path) {
      path = '/' + req.query.path;
    } else {
      // Otherwise, get from URL and strip /api prefix
      const url = req.url || req.path || req.originalUrl || '/';
      path = url.startsWith('/api') ? url.replace(/^\/api/, '') || '/' : url;
    }
    
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // Log for debugging (remove in production if needed)
    console.log('API Request:', {
      originalUrl: req.url,
      originalPath: req.path,
      originalOriginalUrl: req.originalUrl,
      reconstructedPath: path,
      method: req.method,
      query: req.query
    });
    
    // Update request properties for Express
    req.url = path;
    req.path = path;
    req.originalUrl = path;
    
    // Remove baseUrl if it has /api
    if (req.baseUrl && req.baseUrl.startsWith('/api')) {
      req.baseUrl = req.baseUrl.replace(/^\/api/, '');
    }
    
    // Call Express app
    return app(req, res);
  } catch (error) {
    console.error('API Handler Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
};
