import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MessageTemplate from '../models/MessageTemplate.js';

dotenv.config();

const templates = [
    {
        name: 'Order Confirmation - Beautiful',
        type: 'OrderConfirmation',
        content: `✨ *Dear {{clientName}}* ✨

🙏 *Thank you for choosing THE DARJI!*

We're thrilled to craft your perfect outfit! Your order has been confirmed and our artisans are ready to work their magic.

━━━━━━━━━━━━━━━━━━━
📋 *ORDER DETAILS*
━━━━━━━━━━━━━━━━━━━

🔖 Order Number: *{{orderNumber}}*
📅 Expected Delivery: *{{deliveryDate}}*

💰 *PAYMENT SUMMARY*
• Total Amount: ₹{{totalAmount}}
• Advance Paid: ✅ ₹{{advance}}
• Balance Due: ₹{{balance}}

━━━━━━━━━━━━━━━━━━━

📎 *Your invoice is attached for your records.*

We'll keep you updated at every step of the crafting process. Your garments will be tailored with precision, care, and attention to every detail.

💬 Have questions? We're just a message away!

With warm regards,
*THE DARJI TEAM* 👔
_Crafting Excellence Since Day One_`,
        isActive: true
    },
    {
        name: 'Trial Reminder - Beautiful',
        type: 'TrialReminder',
        content: `👔 *Dear {{clientName}}*,

⏰ *FRIENDLY REMINDER* ⏰

Your trial fitting is just around the corner!

━━━━━━━━━━━━━━━━━━━
📅 *APPOINTMENT DETAILS*
━━━━━━━━━━━━━━━━━━━

🔖 Order #: *{{orderNumber}}*
📆 Trial Date: *{{trialDate}}*
🕐 Time: *{{trialTime}}*
📍 Location: THE DARJI Store

━━━━━━━━━━━━━━━━━━━

✨ This fitting session ensures your garments fit you *perfectly*. Our master tailors will make any necessary adjustments to achieve that impeccable fit you deserve!

💡 *Pro Tip:* Bring along:
• Any reference garment you love
• The shoes you plan to wear
• A positive attitude! 😊

We're looking forward to seeing you!

Best regards,
*THE DARJI TEAM* 👔
_Perfection in Every Stitch_`,
        isActive: true
    },
    {
        name: 'Delivery Ready - Beautiful',
        type: 'DeliveryReminder',
        content: `🎊 *Dear {{clientName}}* 🎊

✨ *EXCITING NEWS!* ✨

Your beautifully crafted garments are ready and waiting for you! 

━━━━━━━━━━━━━━━━━━━
📦 *DELIVERY DETAILS*
━━━━━━━━━━━━━━━━━━━

🔖 Order #: *{{orderNumber}}*
👔 Items Ready: {{items}}

💳 *PAYMENT DETAILS*
Balance Due: ₹{{balance}}

━━━━━━━━━━━━━━━━━━━

🏪 *COLLECTION OPTIONS:*

1️⃣ *Visit Our Store*
   Drop by at your convenience
   Payment: Cash/Card/UPI

2️⃣ *Home Delivery*
   We'll deliver to your doorstep
   Just let us know!

━━━━━━━━━━━━━━━━━━━

✨ We hope you absolutely *LOVE* your new outfit!

📸 *Share the Joy!*
Post your pictures and tag us - we'd love to see you shine!

Thank you for trusting THE DARJI with your style!

With pride,
*THE DARJI TEAM* 👔
_Your Style, Our Passion_`,
        isActive: true
    },
    {
        name: 'Payment Reminder - Gentle',
        type: 'PaymentReminder',
        content: `🙏 *Dear {{clientName}}*,

Hope you're enjoying your garments from THE DARJI!

This is a gentle reminder about the pending payment for your order.

━━━━━━━━━━━━━━━━━━━
💳 *PAYMENT DETAILS*
━━━━━━━━━━━━━━━━━━━

🔖 Order #: *{{orderNumber}}*
📅 Delivery Date: {{deliveryDate}}
💰 Balance Due: *₹{{balance}}*

━━━━━━━━━━━━━━━━━━━

💳 *EASY PAYMENT OPTIONS:*

✅ UPI (Instant)
✅ Bank Transfer
✅ Cash at Store
✅ Card Payment

━━━━━━━━━━━━━━━━━━━

We understand life gets busy! Whenever it's convenient for you, we'd appreciate clearing the pending amount.

💬 Having any payment concerns? Let's talk! We're here to help.

Thank you for your cooperation!

Warm regards,
*THE DARJI TEAM* 👔`,
        isActive: true
    },
    {
        name: 'Payment Reminder - Urgent',
        type: 'PaymentReminder',
        content: `⚠️ *IMPORTANT - Dear {{clientName}}*

*FINAL PAYMENT REMINDER*

This is our final reminder regarding the outstanding payment for your order.

━━━━━━━━━━━━━━━━━━━
💰 *PAYMENT OVERDUE*
━━━━━━━━━━━━━━━━━━━

🔖 Order #: *{{orderNumber}}*
📅 Due Since: {{deliveryDate}}
💸 Amount Outstanding: *₹{{balance}}*

━━━━━━━━━━━━━━━━━━━

⏰ *IMMEDIATE ACTION REQUIRED*

We kindly request you to settle this amount at the earliest to avoid any inconvenience in our future services.

💬 *Facing Difficulties?*
Please contact us immediately. We're willing to discuss payment arrangements that work for you.

━━━━━━━━━━━━━━━━━━━

We value your patronage and hope to continue serving you.

Sincerely,
*THE DARJI TEAM* 👔`,
        isActive: false
    },
    {
        name: 'Reconnection - We Miss You',
        type: 'InactiveClient',
        content: `👋 *Hello {{clientName}}!*

✨ *WE MISS YOU!* ✨

It's been {{daysSinceLastOrder}} days since we last had the pleasure of serving you, and we've been thinking about you!

━━━━━━━━━━━━━━━━━━━
🎁 *EXCLUSIVE WELCOME BACK OFFER!*
━━━━━━━━━━━━━━━━━━━

As one of our valued customers, we're rolling out the red carpet for your return:

⭐ *Special Discount* on your next order
⭐ *Priority Service* - Skip the queue
⭐ *Complimentary Alterations* worth ₹500
⭐ *Free Consultation* with master tailor

━━━━━━━━━━━━━━━━━━━

Whether it's:
👔 A fresh wardrobe for the new season
🎩 Special occasion wear
👕 Your everyday essentials

We're here to craft the *perfect fit* just for you!

━━━━━━━━━━━━━━━━━━━

📞 *Ready to Look Your Best?*

Give us a call or drop by the store. Let's create something amazing together!

We look forward to serving you again!

With warm regards,
*THE DARJI TEAM* 👔
_Your Style Partner_`,
        isActive: true
    },
    {
        name: 'Festival Special - Limited Time',
        type: 'InactiveClient',
        content: `🎊 *{{clientName}}, The Festival Season is Here!* 🎊

✨ *TIME TO SHINE IN STYLE!* ✨

Make this festive season unforgettable with premium tailored outfits that turn heads!

━━━━━━━━━━━━━━━━━━━
🎁 *EXCLUSIVE FESTIVAL OFFERS*
━━━━━━━━━━━━━━━━━━━

✨ *15% OFF* on ALL orders
🎁 *FREE Premium Finishing*
⚡ *Express Delivery* available
👔 *Complimentary Accessories* worth ₹300

*VALID THIS MONTH ONLY!*

━━━━━━━━━━━━━━━━━━━

💫 *TRENDING THIS SEASON:*

• Designer Kurtas
• Festive Sherwanis  
• Premium Blazers
• Traditional Bandhgalas

━━━━━━━━━━━━━━━━━━━

⏰ *LIMITED SLOTS AVAILABLE!*

Book your measurements TODAY before we're fully booked!

📞 Call now: [Your Number]
📍 Visit: THE DARJI Store

Let's create the *perfect festive look* for you!

Festive wishes,
*THE DARJI TEAM* 👔
_Celebrating Style, Celebrating You!_`,
        isActive: true
    }
];

async function seedTemplates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear all existing templates to avoid conflicts
        await MessageTemplate.deleteMany({});
        console.log('🗑️  Cleared existing templates');

        // Insert new beautiful templates
        await MessageTemplate.insertMany(templates);
        console.log('✨ Created all beautiful templates!');

        console.log('\n🎉 Template seeding completed!');
        console.log(`\n📊 Summary:`);
        console.log(`   - Order Confirmation: 1 template (with invoice note)`);
        console.log(`   - Trial Reminder: 1 template`);
        console.log(`   - Delivery Notification: 1 template`);
        console.log(`   - Payment Reminder: 2 templates (gentle + urgent)`);
        console.log(`   - Client Re-engagement: 2 templates`);
        console.log(`\n   Total: 7 Beautiful Templates ✨`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedTemplates();
