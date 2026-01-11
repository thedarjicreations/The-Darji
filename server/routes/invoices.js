import express from 'express';
import fs from 'fs';
import path from 'path';
import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateInvoice } from '../services/invoiceService.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/invoices
 * @desc    Get all invoices
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const invoices = await Invoice.find()
        .populate({
            path: 'order',
            populate: { path: 'client', select: 'name phone' }
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await Invoice.countDocuments();

    res.json({
        invoices,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
}));

/**
 * @route   GET /api/invoices/order/:orderId
 * @desc    Get or generate invoice PDF by Order ID and stream it
 * @access  Private
 */
router.get('/order/:orderId', asyncHandler(async (req, res) => {
    // Check if order exists first
    const order = await Order.findById(req.params.orderId)
        .populate('client')
        .populate('items.garmentType');

    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.client) {
        return res.status(400).json({ error: 'Cannot generate invoice: Client data missing' });
    }

    let invoice = await Invoice.findOne({ order: req.params.orderId });

    // Always regenerate to ensure it matches latest order data
    // Pass existing invoice to reuse number/record
    invoice = await generateInvoice(order, req.user?._id, invoice);

    // Stream the file
    if (invoice.s3Key) {
        const { getObjectStream } = await import('../services/s3Service.js');
        const stream = await getObjectStream(invoice.s3Key, process.env.AWS_S3_INVOICE_BUCKET);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
        stream.pipe(res);
    } else if (invoice.pdfPath) {
        const filePath = path.join(process.cwd(), invoice.pdfPath);

        if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.status(404).json({ error: 'PDF file not found on server' });
        }
    } else {
        res.status(404).json({ error: 'Invoice record found but no file path available' });
    }
}));

/**
 * @route   GET /api/invoices/:id
 * @desc    Get invoice by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id)
        .populate({
            path: 'order',
            populate: [
                { path: 'client' },
                { path: 'items.garmentType' }
            ]
        });

    if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
}));

/**
 * @route   POST /api/invoices/generate/:orderId
 * @desc    Generate invoice for an order
 * @access  Private
 */
router.post('/generate/:orderId', asyncHandler(async (req, res) => {
    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ order: req.params.orderId });
    if (existingInvoice) {
        return res.status(400).json({
            error: 'Invoice already exists for this order',
            invoice: existingInvoice,
        });
    }

    // Get order with full details
    const order = await Order.findById(req.params.orderId)
        .populate('client')
        .populate('items.garmentType');

    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    // Generate invoice
    const invoice = await generateInvoice(order, req.userId);

    res.status(201).json({
        message: 'Invoice generated successfully',
        invoice,
    });
}));

/**
 * @route   GET /api/invoices/download/:id
 * @desc    Download invoice PDF
 * @access  Private
 */
router.get('/download/:id', asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
    }

    // If S3, generate presigned URL
    if (invoice.s3Key) {
        const { getPresignedUrl } = await import('../services/s3Service.js');
        const url = await getPresignedUrl(invoice.s3Key, process.env.AWS_S3_INVOICE_BUCKET, 300);
        return res.json({ url });
    }

    // If local, return file path
    if (invoice.pdfPath) {
        return res.json({ url: `/${invoice.pdfPath}` });
    }

    res.status(404).json({ error: 'PDF not found' });
}));

/**
 * @route   DELETE /api/invoices/:id
 * @desc    Delete invoice
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);

    if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
    }

    // TODO: Delete PDF file from storage

    res.json({
        message: 'Invoice deleted successfully',
        invoice,
    });
}));



export default router;
