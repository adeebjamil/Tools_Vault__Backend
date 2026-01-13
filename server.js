require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Connect to database
connectDB();

const app = express();

// ===========================================
// CLOUDFLARE & SECURITY CONFIGURATION
// ===========================================

// Trust proxy - Required for Cloudflare
app.set('trust proxy', 1);

// Helmet security headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

// Rate limiting configuration (fixed for IPv6)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Let express-rate-limit handle IP extraction automatically
    // It will use trust proxy settings
});

// Apply rate limiting to all requests
app.use(limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Only 10 login attempts per 15 minutes
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again after 15 minutes'
    },
});

// Body parser - increased limit for image uploads
app.use(express.json({ limit: '10mb' }));

// Enable CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://tools-vault-frontend.vercel.app', 'https://tools-vault.app', 'https://www.tools-vault.app']
        : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token'],
}));

// Parse URL-encoded bodies (for form data)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===========================================
// ROUTES
// ===========================================

// Apply stricter rate limit to auth routes
app.use('/api/auth', authLimiter, require('./routes/auth'));

// Blog routes (AI generation + CRUD)
app.use('/api/blog', require('./routes/blog'));

// Upload routes (image uploads via Cloudinary)
app.use('/api/upload', require('./routes/upload'));

// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'ToolsVault API is running',
        timestamp: new Date().toISOString(),
    });
});

// Home route
app.get('/', (req, res) => {
    res.json({
        name: 'ToolsVault API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            auth: '/api/auth',
            blog: '/api/blog',
            upload: '/api/upload',
            health: '/api/health',
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Server Error'
            : err.message
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║     🚀 ToolsVault Backend Server                  ║
╠═══════════════════════════════════════════════════╣
║  Status:    Running                               ║
║  Port:      ${PORT}                                  ║
║  Mode:      ${(process.env.NODE_ENV || 'development').padEnd(15)}                ║
║  Database:  MongoDB                               ║
╚═══════════════════════════════════════════════════╝
  `);
});
