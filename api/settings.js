const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET all settings
router.get('/', (req, res) => {
    res.json(db.getSettings(req.userId));
});

// PUT update settings
router.put('/', (req, res) => {
    const updated = db.updateSettings(req.userId, req.body);
    res.json(updated);
});

// POST export user data
router.post('/export', (req, res) => {
    const data = db.exportUserData(req.userId);
    res.json(data);
});

// POST import user data
router.post('/import', (req, res) => {
    try {
        db.importUserData(req.userId, req.body);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
