// Vercel catch-all serverless function for all API routes
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Export as Vercel serverless function
module.exports = app;

