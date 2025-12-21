import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { findInactiveClients } from './messagingService.js';

const prisma = new PrismaClient();

/**
 * Check for upcoming trials and deliveries (2 days ahead)
 */
async function checkUpcomingReminders() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const twoDaysFromNow = new Date(today);
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
        twoDaysFromNow.setHours(23, 59, 59, 999);

        // Find orders with trial date in 2 days
        const upcomingTrials = await prisma.order.findMany({
            where: {
                trialDate: {
                    gte: twoDaysFromNow,
                    lte: twoDaysFromNow
                },
                status: { not: 'Delivered' }
            },
            include: {
                client: true
            }
        });

        // Find orders with delivery date in 2 days
        const upcomingDeliveries = await prisma.order.findMany({
            where: {
                deliveryDate: {
                    gte: twoDaysFromNow,
                    lte: twoDaysFromNow
                },
                status: { not: 'Delivered' }
            },
            include: {
                client: true
            }
        });

        if (upcomingTrials.length > 0) {
            console.log(`⏰ ${upcomingTrials.length} trial(s) scheduled for 2 days from now:`);
            upcomingTrials.forEach(order => {
                console.log(`   - Order #${order.orderNumber} for ${order.client.name}`);
            });
        }

        if (upcomingDeliveries.length > 0) {
            console.log(`📦 ${upcomingDeliveries.length} delivery(ies) scheduled for 2 days from now:`);
            upcomingDeliveries.forEach(order => {
                console.log(`   - Order #${order.orderNumber} for ${order.client.name}`);
            });
        }

        return { upcomingTrials, upcomingDeliveries };
    } catch (error) {
        console.error('Error checking upcoming reminders:', error);
    }
}

/**
 * Run re-engagement campaign for inactive clients
 */
async function runReEngagementCampaign() {
    try {
        const inactiveClients = await findInactiveClients();

        if (inactiveClients.length > 0) {
            console.log(`💌 ${inactiveClients.length} inactive client(s) identified for re-engagement:`);
            inactiveClients.forEach(client => {
                console.log(`   - ${client.name} (${client.phone})`);
            });
        }

        return inactiveClients;
    } catch (error) {
        console.error('Error running re-engagement campaign:', error);
    }
}

/**
 * Start the reminder service with cron jobs
 */
export function startReminderService() {
    // Daily check at 9 AM for upcoming reminders
    cron.schedule('0 9 * * *', async () => {
        console.log('🔔 Running daily reminder check...');
        await checkUpcomingReminders();
    });

    // Monthly re-engagement campaign on the 1st of each month at 10 AM
    cron.schedule('0 10 1 * *', async () => {
        console.log('📧 Running monthly re-engagement campaign...');
        await runReEngagementCampaign();
    });

    console.log('✅ Reminder service initialized');
    console.log('   - Daily reminder check: 9:00 AM');
    console.log('   - Monthly re-engagement: 1st of month, 10:00 AM');
}

// Export functions for manual triggering
export { checkUpcomingReminders, runReEngagementCampaign };
