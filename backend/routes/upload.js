const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up storage engine
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        cb(null, `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// Init upload
const upload = multer({
    storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        // Allowed ext
        const filetypes = /jpeg|jpg|png|gif|webp|pdf|zip|rar|doc|docx|txt|xls|xlsx|ppt|pptx/;
        // Check ext
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        // Check mime
        // For non-images, mimetype check can be complex, so we'll trust the extension for now but keep a basic list
        const mimetypes = /image|application\/pdf|application\/zip|application\/x-zip-compressed|application\/octet-stream|application\/msword|application\/vnd.openxmlformats-officedocument|text\/plain/;
        const mimetype = mimetypes.test(file.mimetype);

        if (extname) {
            return cb(null, true);
        } else {
            cb('Error: File type not supported!');
        }
    }
});

// @route   POST /api/upload
// @desc    Upload a file (e.g., payment proof or chat attachment)
// @access  Private
router.post('/', protect, (req, res) => {
    // Try 'image' or 'file' field names
    upload.fields([{ name: 'image', maxCount: 1 }, { name: 'file', maxCount: 1 }])(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: typeof err === 'string' ? err : err.message });
        }

        const uploadedFile = req.files['image']?.[0] || req.files['file']?.[0];

        if (!uploadedFile) {
            return res.status(400).json({ message: 'No file selected!' });
        }

        res.json({
            message: 'File uploaded successfully',
            url: `/uploads/${uploadedFile.filename}`
        });
    });
});

module.exports = router;
