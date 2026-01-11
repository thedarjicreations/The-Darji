import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true,
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        unique: true,
    },
    pdfPath: {
        type: String, // Local path: invoices/Invoice_TD-2025-0001_JohnDoe.pdf
    },
    s3Key: {
        type: String, // S3 key if using AWS S3
    },
    pdfUrl: {
        type: String, // Presigned URL (temporary) or public URL
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Indexes
invoiceSchema.index({ createdAt: -1 });

// Virtual for determining storage type
invoiceSchema.virtual('storageType').get(function () {
    if (this.s3Key) return 'S3';
    if (this.pdfPath) return 'Local';
    return 'None';
});

export default mongoose.model('Invoice', invoiceSchema);
