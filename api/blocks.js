const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET blocks (with optional date range)
router.get('/', (req, res) => {
  let blocks = db.getAll(req.userId, 'time_blocks');
  const { start, end } = req.query;
  if (start && end) {
    blocks = blocks.filter(b => b.end_datetime >= start && b.start_datetime <= end);
  }
  res.json(blocks);
});

// GET one
router.get('/:id', (req, res) => {
  const block = db.getById(req.userId, 'time_blocks', req.params.id);
  if (!block) return res.status(404).json({ error: 'Bloc non trouvé' });
  res.json(block);
});

// POST
router.post('/', (req, res) => {
  const { title, start_datetime, end_datetime, category_id, color } = req.body;
  if (!title || !start_datetime || !end_datetime) {
    return res.status(400).json({ error: 'Titre, début et fin requis' });
  }
  const block = db.insert(req.userId, 'time_blocks', {
    title, start_datetime, end_datetime,
    category_id: category_id ? Number(category_id) : null,
    color: color || '#4DA8DA',
  });
  res.status(201).json(block);
});

// PUT
router.put('/:id', (req, res) => {
  const block = db.update(req.userId, 'time_blocks', req.params.id, req.body);
  if (!block) return res.status(404).json({ error: 'Bloc non trouvé' });
  res.json(block);
});

// DELETE
router.delete('/:id', (req, res) => {
  db.delete(req.userId, 'time_blocks', req.params.id);
  res.json({ success: true });
});

module.exports = router;
