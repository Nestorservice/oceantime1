const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Daily stats
router.get('/daily', (req, res) => {
  const uid = req.userId;
  const today = new Date().toISOString().split('T')[0];
  const tasks = db.getAll(uid, 'tasks');
  const todayTasks = tasks.filter(t => t.due_date === today);
  const cats = db.getAll(uid, 'categories');

  const byCategory = {};
  todayTasks.forEach(t => {
    const catId = t.category_id || 0;
    if (!byCategory[catId]) {
      const cat = cats.find(c => c.id === catId);
      byCategory[catId] = { name: cat?.name || 'Sans catégorie', color: cat?.color || '#666', task_count: 0 };
    }
    byCategory[catId].task_count++;
  });

  res.json({
    total: todayTasks.length,
    completed: todayTasks.filter(t => t.status === 'completed').length,
    pending: todayTasks.filter(t => t.status !== 'completed').length,
    byCategory: Object.values(byCategory),
  });
});

// Weekly stats
router.get('/weekly', (req, res) => {
  const uid = req.userId;
  const tasks = db.getAll(uid, 'tasks');
  const sessions = db.getAll(uid, 'pomodoro_sessions');
  const cats = db.getAll(uid, 'categories');
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    const dayTasks = tasks.filter(t => t.due_date === dayStr);
    days.push(dayTasks.filter(t => t.status === 'completed').length);
  }

  // Category distribution
  const catMap = {};
  tasks.forEach(t => {
    const cid = t.category_id || 0;
    if (!catMap[cid]) {
      const cat = cats.find(c => c.id === cid);
      catMap[cid] = { name: cat?.name || 'Autre', color: cat?.color || '#999', count: 0 };
    }
    catMap[cid].count++;
  });

  res.json({
    days,
    categories: Object.values(catMap),
  });
});

// Focus / overall stats
router.get('/focus', (req, res) => {
  const uid = req.userId;
  const sessions = db.getAll(uid, 'pomodoro_sessions');
  const dayLabels = [];
  const mins = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    dayLabels.push(['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()]);
    const daySessions = sessions.filter(s => s.started_at?.startsWith(dayStr) && s.completed);
    mins.push(daySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0));
  }

  res.json({ days: dayLabels, minutes: mins });
});

module.exports = router;
