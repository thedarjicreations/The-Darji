import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Client name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true,
        validate: {
            validator: function (v) {
                return /^\+?[1-9]\d{9,14}$/.test(v);
            },
            message: 'Please provide a valid phone number',
        },
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
            validator: function (v) {
                return !v || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
            },
            message: 'Please provide a valid email address',
        },
    },
    address: {
        type: String,
        trim: true,
        maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    notes: {
        type: String,
        trim: true,
    },
    tags: [{
        type: String,
        trim: true,
    }],
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Indexes for performance
clientSchema.index({ name: 'text' }); // Text search
clientSchema.index({ createdAt: -1 });

// Virtual for total orders
clientSchema.virtual('orders', {
    ref: 'Order',
    localField: '_id',
    foreignField: 'client',
});

export default mongoose.model('Client', clientSchema);
