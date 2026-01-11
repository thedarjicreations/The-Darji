import mongoose from 'mongoose';

// Sub-schemas for embedded documents
const orderItemSchema = new mongoose.Schema({
    garmentType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GarmentType',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1'],
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative'],
    },
    cost: {
        type: Number,
        default: 0,
        min: [0, 'Cost cannot be negative'],
    },
    subtotal: {
        type: Number,
        required: true,
        min: [0, 'Subtotal cannot be negative'],
    },
}, { _id: true });

const additionalServiceSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount cannot be negative'],
    },
    cost: {
        type: Number,
        default: 0,
        min: [0, 'Cost cannot be negative'],
    },
}, { _id: true });

const specialRequirementSchema = new mongoose.Schema({
    note: {
        type: String,
        required: true,
        trim: true,
    },
    imageUrl: {
        type: String,
    },
    s3Key: {
        type: String, // For AWS S3
    },
    images: [{
        url: String,
        s3Key: String
    }],
}, { timestamps: true });

const trialNoteSchema = new mongoose.Schema({
    note: {
        type: String,
        required: true,
        trim: true,
    },
    imageUrl: {
        type: String,
    },
    s3Key: {
        type: String, // For AWS S3
    },
    images: [{
        url: String,
        s3Key: String
    }],
}, { timestamps: true });

// Main Order schema
const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client is required'],
        index: true,
    },
    status: {
        type: String,
        enum: {
            values: ['Pending', 'InProgress', 'Trial', 'Completed', 'Delivered', 'Cancelled'],
            message: '{VALUE} is not a valid status',
        },
        default: 'Pending',
        index: true,
    },
    items: {
        type: [orderItemSchema],
        validate: {
            validator: function (items) {
                return items && items.length > 0;
            },
            message: 'Order must have at least one item',
        },
    },
    additionalServices: [additionalServiceSchema],
    specialRequirements: [specialRequirementSchema],
    trialNotes: [trialNoteSchema],
    measurements: {
        type: mongoose.Schema.Types.Mixed, // Flexible JSON for various garment measurements
    },
    totalAmount: {
        type: Number,
        required: true,
        min: [0, 'Total amount cannot be negative'],
    },
    finalAmount: {
        type: Number,
        min: [0, 'Final amount cannot be negative'],
    },
    advance: {
        type: Number,
        default: 0,
        min: [0, 'Advance cannot be negative'],
    },
    trialDate: {
        type: Date,
        index: true,
    },
    deliveryDate: {
        type: Date,
        index: true,
    },
    completedAt: {
        type: Date,
    },
    cancelledAt: {
        type: Date,
    },
    cancellationReason: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Indexes for performance
orderSchema.index({ client: 1, createdAt: -1 });
orderSchema.index({ status: 1, deliveryDate: 1 });
orderSchema.index({ createdAt: -1 });

// Virtual for balance amount
orderSchema.virtual('balance').get(function () {
    const final = this.finalAmount || this.totalAmount;
    return final - (this.advance || 0);
});

// Virtual for items total (calculated)
orderSchema.virtual('itemsTotal').get(function () {
    if (!this.items) return 0;
    return this.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
});

// Virtual for services total
orderSchema.virtual('servicesTotal').get(function () {
    if (!this.additionalServices) return 0;
    return this.additionalServices.reduce((sum, service) => sum + (service.amount || 0), 0);
});

// Virtual for total cost
orderSchema.virtual('totalCost').get(function () {
    const itemsCost = this.items ? this.items.reduce((sum, item) => sum + ((item.cost || 0) * (item.quantity || 1)), 0) : 0;
    const servicesCost = this.additionalServices ? this.additionalServices.reduce((sum, service) => sum + (service.cost || 0), 0) : 0;
    return itemsCost + servicesCost;
});

// Virtual for profit
orderSchema.virtual('profit').get(function () {
    const final = this.finalAmount || this.totalAmount;
    return final - this.totalCost;
});

// Auto-generate order number before validation
orderSchema.pre('validate', async function () {
    if (!this.isNew || this.orderNumber) return;

    const year = new Date().getFullYear();

    // Find the highest order number for this year to avoid duplicates
    const lastOrder = await this.constructor
        .findOne({ orderNumber: new RegExp(`^TD-${year}-`) })
        .sort({ orderNumber: -1 })
        .select('orderNumber')
        .lean();

    let nextNumber = 1;
    if (lastOrder && lastOrder.orderNumber) {
        // Extract the number part from TD-2026-0001
        const match = lastOrder.orderNumber.match(/\d+$/);
        if (match) {
            nextNumber = parseInt(match[0]) + 1;
        }
    }

    this.orderNumber = `TD-${year}-${String(nextNumber).padStart(4, '0')}`;
});

// Update completedAt/cancelledAt based on status change
orderSchema.pre('save', async function () {
    if (this.isModified('status')) {
        if (this.status === 'Completed' && !this.completedAt) {
            this.completedAt = new Date();
        }
        if (this.status === 'Cancelled' && !this.cancelledAt) {
            this.cancelledAt = new Date();
        }
    }
});

// Validate finalAmount if provided
orderSchema.pre('save', async function () {
    if (this.finalAmount && this.finalAmount > this.totalAmount * 1.5) {
        throw new Error('Final amount cannot be more than 150% of total amount');
    }
});

export default mongoose.model('Order', orderSchema);
