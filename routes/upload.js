const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

// Middleware to check if user is admin (simplified)
const isAdmin = (req, res, next) => {
    // In production, verify JWT token and check admin role
    const adminToken = req.headers['x-admin-token'];
    if (adminToken === process.env.ADMIN_SECRET_KEY || process.env.NODE_ENV !== 'production') {
        next();
    } else {
        res.status(403).json({ success: false, error: 'Admin access required' });
    }
};

// Upload single image
router.post('/image', isAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        // The file has already been uploaded to Cloudinary by multer-storage-cloudinary
        // req.file contains the Cloudinary response
        res.json({
            success: true,
            data: {
                url: req.file.path, // Cloudinary URL
                public_id: req.file.filename, // Cloudinary public ID
                format: req.file.format,
                width: req.file.width,
                height: req.file.height,
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload image'
        });
    }
});

// Delete image by public_id
router.delete('/image/:publicId', isAdmin, async (req, res) => {
    try {
        const { publicId } = req.params;

        if (!publicId) {
            return res.status(400).json({
                success: false,
                error: 'Public ID is required'
            });
        }

        // Full public ID includes folder path
        const fullPublicId = `toolsvault/blog/${publicId}`;

        const result = await cloudinary.uploader.destroy(fullPublicId);

        if (result.result === 'ok') {
            res.json({
                success: true,
                message: 'Image deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Image not found or already deleted'
            });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete image'
        });
    }
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
    if (error instanceof require('multer').MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File size too large. Maximum size is 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }

    if (error) {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }

    next();
});

module.exports = router;
