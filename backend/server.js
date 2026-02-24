require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const socketModule = require('./utils/socket'); // Import socket manager

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
// Allow any localhost Vite dev port (5173-5179)
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    process.env.CLIENT_URL,
].filter(Boolean);

// Initialize Socket.io with the HTTP server and allowed origins
const io = socketModule.init(server, allowedOrigins);

app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static folder for file uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/participants', require('./routes/participants'));
app.use('/api/organizers', require('./routes/organizers'));
app.use('/api/events', require('./routes/events'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/messages', require('./routes/messages'));

// Database Connection
mongoose.connect(process.env.MONGO_URI, { family: 4 })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Health check
app.get('/', (req, res) => res.json({ message: 'Felicity API Running', version: '1.0.0' }));

// 404 handler
app.use((req, res) => res.status(404).json({ message: `Route ${req.originalUrl} not found` }));

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error', error: err.message });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
