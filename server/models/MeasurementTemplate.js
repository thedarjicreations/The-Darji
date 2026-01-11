import mongoose from 'mongoose';

const measurementTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: [3, 'Template name must be at least 3 characters'],
        maxlength: [100, 'Template name cannot exceed 100 characters'],
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
    },
    garmentType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GarmentType',
    },
    measurements: {
        type: mongoose.Schema.Types.Mixed, // Flexible JSON for various measurements
        required: true,
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
    usageCount: {
        type: Number,
        default: 0,
    },
    lastUsedAt: {
        type: Date,
    },
    notes: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});

// Indexes for performance
measurementTemplateSchema.index({ client: 1, garmentType: 1 });
measurementTemplateSchema.index({ name: 'text' });

// Validate that measurements object is not empty
// Validate that measurements object is not empty
measurementTemplateSchema.pre('save', async function () {
    if (!this.measurements) {
        throw new Error('Measurements cannot be empty');
    }

    if (typeof this.measurements === 'object' && Object.keys(this.measurements).length === 0) {
        throw new Error('Measurements cannot be empty');
    }
});

// Method to increment usage count
measurementTemplateSchema.methods.recordUsage = async function () {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
    await this.save();
};

export default mongoose.model('MeasurementTemplate', measurementTemplateSchema);
