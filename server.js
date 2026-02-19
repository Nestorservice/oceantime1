const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize database
const db = require('./db/database');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Auth routes (no middleware needed)
app.use('/api/auth', require('./api/auth'));

// Protected API Routes (require JWT)
app.use('/api/categories', authMiddleware, require('./api/categories'));
app.use('/api/tasks', authMiddleware, require('./api/tasks'));
app.use('/api/blocks', authMiddleware, require('./api/blocks'));
app.use('/api/pomodoro', authMiddleware, require('./api/pomodoro'));
app.use('/api/stats', authMiddleware, require('./api/stats'));
app.use('/api/settings', authMiddleware, require('./api/settings'));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler — catches unhandled errors in API routes
app.use((err, req, res, next) => {
  console.error('[Error]', req.method, req.path, '-', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: err.message || 'Erreur serveur interne' });
  }
});

app.listen(PORT, () => {
  console.log(`\nTimeMaster PWA demarre sur http://localhost:${PORT}\n`);
});
