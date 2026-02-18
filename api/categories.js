const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET all
router.get('/', (req, res) => {
    res.json(db.getAll(req.userId, 'categories'));
});

// GET one
router.get('/:id', (req, res) => {
    const cat = db.getById(req.userId, 'categories', req.params.id);
    if (!cat) return res.status(404).json({ error: 'Catégorie non trouvée' });
    res.json(cat);
});

// POST
router.post('/', (req, res) => {
    const { name, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom est requis' });
    const cat = db.insert(req.userId, 'categories', { name, color: color || '#666', icon: icon || 'fas fa-tag' });
    res.status(201).json(cat);
});

// PUT
router.put('/:id', (req, res) => {
    const cat = db.update(req.userId, 'categories', req.params.id, req.body);
    if (!cat) return res.status(404).json({ error: 'Catégorie non trouvée' });
    res.json(cat);
});

// DELETE
router.delete('/:id', (req, res) => {
    db.delete(req.userId, 'categories', req.params.id);
    res.json({ success: true });
});

module.exports = router;
