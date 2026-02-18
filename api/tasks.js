const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET all tasks with filters
router.get('/', (req, res) => {
  const uid = req.userId;
  let tasks = db.getAll(uid, 'tasks');
  const { status, category, date } = req.query;
  if (status) tasks = tasks.filter(t => t.status === status);
  if (category) tasks = tasks.filter(t => t.category_id === Number(category));
  if (date) tasks = tasks.filter(t => t.due_date === date);

  const cats = db.getAll(uid, 'categories');
  tasks = tasks.map(t => {
    const cat = cats.find(c => c.id === t.category_id);
    return { ...t, category_name: cat?.name, category_color: cat?.color };
  });

  tasks.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  res.json(tasks);
});

// GET today's tasks
router.get('/today', (req, res) => {
  const uid = req.userId;
  const today = new Date().toISOString().split('T')[0];
  let tasks = db.getAll(uid, 'tasks').filter(t => t.due_date === today);
  const cats = db.getAll(uid, 'categories');
  tasks = tasks.map(t => {
    const cat = cats.find(c => c.id === t.category_id);
    return { ...t, category_name: cat?.name, category_color: cat?.color };
  });
  tasks.sort((a, b) => {
    if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
    return (b.priority || 0) - (a.priority || 0);
  });
  res.json(tasks);
});

// GET upcoming tasks with reminders
router.get('/upcoming', (req, res) => {
  const uid = req.userId;
  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 60 * 1000);

  let tasks = db.getAll(uid, 'tasks').filter(t => {
    if (t.status === 'completed' || !t.voice_reminder || !t.due_date || !t.due_time) return false;
    const taskDate = new Date(`${t.due_date}T${t.due_time}`);
    const reminderTime = new Date(taskDate.getTime() - (t.reminder_minutes_before || 10) * 60000);
    return reminderTime >= now && reminderTime <= soon;
  });

  res.json(tasks);
});

// GET one
router.get('/:id', (req, res) => {
  const task = db.getById(req.userId, 'tasks', req.params.id);
  if (!task) return res.status(404).json({ error: 'Tâche non trouvée' });
  res.json(task);
});

// POST
router.post('/', (req, res) => {
  const { title, description, category_id, priority, due_date, due_time,
    reminder_minutes_before, voice_reminder } = req.body;
  if (!title) return res.status(400).json({ error: 'Le titre est requis' });
  const task = db.insert(req.userId, 'tasks', {
    title, description: description || '',
    category_id: category_id ? Number(category_id) : null,
    priority: priority || 2,
    due_date: due_date || null, due_time: due_time || null,
    status: 'pending',
    reminder_minutes_before: reminder_minutes_before || 10,
    voice_reminder: voice_reminder !== false,
  });
  res.status(201).json(task);
});

// PUT
router.put('/:id', (req, res) => {
  if (req.body.category_id) req.body.category_id = Number(req.body.category_id);
  const task = db.update(req.userId, 'tasks', req.params.id, req.body);
  if (!task) return res.status(404).json({ error: 'Tâche non trouvée' });
  res.json(task);
});

// DELETE
router.delete('/:id', (req, res) => {
  db.delete(req.userId, 'tasks', req.params.id);
  res.json({ success: true });
});

module.exports = router;
