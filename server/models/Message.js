import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: {
            values: [
                'OrderConfirmation',
                'TrialReminder',
                'DeliveryReminder',
                'PaymentReminder',
                'PostDelivery',
                'OrderReady',
                'InactiveClient',
                'ReEngagement',
                'Feedback',
                'Custom'
            ],
            message: '{VALUE} is not a valid message type',
        },
        required: true,
        index: true,
    },
    content: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: {
            values: ['Pending', 'Sent', 'Delivered', 'Failed', 'Read'],
            message: '{VALUE} is not a valid status',
        },
        default: 'Pending',
        index: true,
    },
    sentAt: {
        type: Date,
    },
    deliveredAt: {
        type: Date,
    },
    readAt: {
        type: Date,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed, // WhatsApp message ID, error details, etc.
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
    },
    sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});

// Indexes for performance
messageSchema.index({ client: 1, createdAt: -1 });
messageSchema.index({ status: 1, type: 1 });
messageSchema.index({ sentAt: -1 });

// Update sentAt when status changes to 'Sent'
messageSchema.pre('save', async function () {
    if (this.isModified('status')) {
        if (this.status === 'Sent' && !this.sentAt) {
            this.sentAt = new Date();
        }
        if (this.status === 'Delivered' && !this.deliveredAt) {
            this.deliveredAt = new Date();
        }
        if (this.status === 'Read' && !this.readAt) {
            this.readAt = new Date();
        }
    }
});

export default mongoose.model('Message', messageSchema);
