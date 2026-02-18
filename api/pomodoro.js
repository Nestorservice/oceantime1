const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Start a pomodoro session
router.post('/start', (req, res) => {
  const { task_id, duration_minutes } = req.body;
  const session = db.insert(req.userId, 'pomodoro_sessions', {
    task_id: task_id ? Number(task_id) : null,
    duration_minutes: duration_minutes || 25,
    started_at: new Date().toISOString(),
    completed: false,
  });
  res.status(201).json(session);
});

// Complete a session
router.put('/:id/complete', (req, res) => {
  const session = db.update(req.userId, 'pomodoro_sessions', req.params.id, {
    completed: true,
    completed_at: new Date().toISOString(),
  });
  if (!session) return res.status(404).json({ error: 'Session non trouvée' });
  res.json(session);
});

// Cancel/delete a session
router.delete('/:id', (req, res) => {
  db.delete(req.userId, 'pomodoro_sessions', req.params.id);
  res.json({ success: true });
});

// Get today's sessions
router.get('/today', (req, res) => {
  const uid = req.userId;
  const today = new Date().toISOString().split('T')[0];
  let sessions = db.getAll(uid, 'pomodoro_sessions').filter(s =>
    s.started_at && s.started_at.startsWith(today)
  );
  const tasks = db.getAll(uid, 'tasks');
  sessions = sessions.map(s => {
    const task = tasks.find(t => t.id === s.task_id);
    return { ...s, task_title: task?.title };
  });
  res.json(sessions);
});

// Stats
router.get('/stats', (req, res) => {
  const uid = req.userId;
  const today = new Date().toISOString().split('T')[0];
  const sessions = db.getAll(uid, 'pomodoro_sessions');

  const todaySessions = sessions.filter(s => s.started_at?.startsWith(today) && s.completed);
  const totalMinutes = todaySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  // Streak
  const daySet = new Set();
  sessions.filter(s => s.completed).forEach(s => {
    if (s.started_at) daySet.add(s.started_at.split('T')[0]);
  });
  const sortedDays = [...daySet].sort().reverse();
  let streak = 0;
  let checkDate = new Date();
  for (const day of sortedDays) {
    const expected = checkDate.toISOString().split('T')[0];
    if (day === expected) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
    else break;
  }

  res.json({
    today: { completed: todaySessions.length, total_minutes: totalMinutes },
    streak: { length: streak },
  });
});

// Also accept POST for creating completed sessions (used by Pomodoro page)
router.post('/', (req, res) => {
  const session = db.insert(req.userId, 'pomodoro_sessions', {
    task_id: req.body.task_id ? Number(req.body.task_id) : null,
    duration_minutes: req.body.duration_minutes || 25,
    started_at: new Date().toISOString(),
    completed: req.body.completed || false,
    completed_at: req.body.completed ? new Date().toISOString() : null,
    session_date: req.body.session_date || new Date().toISOString().split('T')[0],
  });
  res.status(201).json(session);
});

module.exports = router;
