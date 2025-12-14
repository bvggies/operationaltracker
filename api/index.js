// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.FRONTEND_URL || '*',
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

// Export as Vercel serverless function
module.exports = app;

