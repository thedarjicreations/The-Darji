import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import garmentRoutes from './routes/garments.js';
import clientRoutes from './routes/clients.js';
import orderRoutes from './routes/orders.js';
import invoiceRoutes from './routes/invoices.js';
import analyticsRoutes from './routes/analytics.js';
import messageRoutes from './routes/messages.js';
import measurementTemplateRoutes from './routes/measurementTemplates.js';
import messageTemplateRoutes from './routes/messageTemplates.js';
import { startReminderService } from './services/reminderService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (invoices)
app.use('/invoices', express.static('invoices'));

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve uploads using absolute path
const uploadsPath = path.resolve(__dirname, '../uploads');
console.log('Serving static files from:', uploadsPath);

app.use('/uploads', express.static(uploadsPath));

// Debug route for uploads (if file not found by static middleware)
app.use('/uploads', (req, res) => {
  console.log('File not found in uploads:', req.path);
  res.status(404).send(`File not found: ${req.path}`);
});

// Serve assets (logos, etc) using absolute path
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/garments', garmentRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/measurement-templates', measurementTemplateRoutes);
app.use('/api/message-templates', messageTemplateRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'The Darji API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);

  // Start background services
  startReminderService();
  console.log('⏰ Reminder service started');
});

export default app;
