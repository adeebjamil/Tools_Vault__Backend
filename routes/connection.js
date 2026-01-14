const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    const adminToken = req.headers['x-admin-token'];
    // Simple check for now, matching blog.js approach or verify JWT
    if (adminToken === process.env.ADMIN_SECRET_KEY || process.env.NODE_ENV !== 'production') {
        next();
    } else {
        res.status(403).json({ success: false, error: 'Admin access required' });
    }
};

// @route   POST /api/connections
// @desc    Create a new connection (public)
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { type, email, name, message } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        const connection = await Connection.create({
            type: type || 'contact',
            email,
            name,
            message
        });

        res.status(201).json({
            success: true,
            data: connection,
            message: 'Successfully submitted'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// @route   GET /api/connections
// @desc    Get all connections (admin)
// @access  Private (Admin)
router.get('/', isAdmin, async (req, res) => {
    try {
        const connections = await Connection.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: connections
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// @route   DELETE /api/connections/:id
// @desc    Delete a connection (admin)
// @access  Private (Admin)
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const connection = await Connection.findByIdAndDelete(req.params.id);
        if (!connection) {
            return res.status(404).json({ success: false, error: 'Connection not found' });
        }
        res.status(200).json({
            success: true,
            data: {},
            message: 'Connection deleted'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
