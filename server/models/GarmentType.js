import mongoose from 'mongoose';

const garmentTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Garment name is required'],
        unique: true,
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
    },
    cost: {
        type: Number,
        default: 0,
        min: [0, 'Cost cannot be negative'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    category: {
        type: String,
        enum: ['Men', 'Women', 'Kids', 'Unisex'],
        default: 'Unisex',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Virtual for profit margin
garmentTypeSchema.virtual('profitMargin').get(function () {
    return this.price - this.cost;
});

// Virtual for profit margin percentage
garmentTypeSchema.virtual('profitMarginPercentage').get(function () {
    if (this.cost === 0) return 100;
    return ((this.price - this.cost) / this.cost * 100).toFixed(2);
});

// Ensure virtuals are included in JSON
garmentTypeSchema.set('toJSON', { virtuals: true });
garmentTypeSchema.set('toObject', { virtuals: true });

// Index for quick lookups
garmentTypeSchema.index({ category: 1 });

export default mongoose.model('GarmentType', garmentTypeSchema);
