import mongoose from 'mongoose';

const messageTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        minlength: [3, 'Template name must be at least 3 characters'],
        maxlength: [100, 'Template name cannot exceed 100 characters'],
    },
    type: {
        type: String,
        enum: {
            values: [
                'OrderConfirmation',
                'TrialReminder',
                'DeliveryReminder',
                'PaymentReminder',
                'InactiveClient',
                'OrderReady',
                'PostDelivery',
                'Custom'
            ],
            message: '{VALUE} is not a valid template type',
        },
        required: true,
        index: true,
    },
    content: {
        type: String,
        required: true,
        minlength: [10, 'Content must be at least 10 characters'],
    },
    variables: {
        type: [String],
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    usageCount: {
        type: Number,
        default: 0,
    },
    lastUsedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

// Extract variables from content (e.g., {{clientName}}, {{orderNumber}})
messageTemplateSchema.pre('save', async function () {
    const regex = /\{\{(\w+)\}\}/g;
    const variables = [];
    let match;

    while ((match = regex.exec(this.content)) !== null) {
        if (!variables.includes(match[1])) {
            variables.push(match[1]);
        }
    }

    this.variables = variables;
});

// Method to replace variables in template
messageTemplateSchema.methods.render = function (data) {
    let content = this.content;

    this.variables.forEach(variable => {
        const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
        const value = data[variable] || `{{${variable}}}`;
        content = content.replace(regex, value);
    });

    return content;
};

// Index for quick lookups
messageTemplateSchema.index({ type: 1, isActive: 1 });

export default mongoose.model('MessageTemplate', messageTemplateSchema);
