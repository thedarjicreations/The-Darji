import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Import configurations
import connectDB from './config/database.js';
import logger from './config/logger.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { sanitize } from './middleware/validation.js';

// Import routes
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import garmentRoutes from './routes/garments.js';
import orderRoutes from './routes/orders.js';
import invoiceRoutes from './routes/invoices.js';
import messageRoutes from './routes/messages.js';
import messageTemplateRoutes from './routes/messageTemplates.js';
import measurementTemplateRoutes from './routes/measurementTemplates.js';
import analyticsRoutes from './routes/analytics.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// CORS configuration
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'];
if (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*') {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 2000,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS configuration


// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize input to prevent NoSQL injection
app.use(sanitize);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/invoices', express.static(path.join(__dirname, '../invoices')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Health check endpoint (for Docker healthcheck and monitoring)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/garments', garmentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/message-templates', messageTemplateRoutes);
app.use('/api/measurement-templates', measurementTemplateRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'The Darji API is running',
    environment: process.env.NODE_ENV || 'development',
    database: 'MongoDB Atlas',
    version: '2.0.0',
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to The Darji API',
    status: 'running',
    documentation: '/api/docs' // Assuming there might be docs, or just a placeholder
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || '*'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

export default app;
