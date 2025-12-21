import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get business analytics overview
router.get('/overview', authenticate, async (req, res) => {
    try {
        // Total orders
        const totalOrders = await prisma.order.count();

        // Total clients
        const totalClients = await prisma.client.count();

        // Pending orders
        const pendingOrders = await prisma.order.count({
            where: {
                status: {
                    in: ['Pending', 'InProgress', 'Trial']
                }
            }
        });

        // Total revenue (from delivered orders)
        const deliveredOrders = await prisma.order.findMany({
            where: {
                status: 'Delivered'
            },
            select: {
                totalAmount: true,
                finalAmount: true
            }
        });

        const totalRevenue = deliveredOrders.reduce((sum, order) => {
            const revenue = order.finalAmount ?? order.totalAmount;
            return sum + revenue;
        }, 0);

        // Upcoming trials (2 days from now) - exclude completed/delivered orders
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
        const today = new Date();

        const upcomingTrials = await prisma.order.findMany({
            where: {
                trialDate: {
                    gte: today,
                    lte: twoDaysFromNow
                },
                status: {
                    notIn: ['Completed', 'Delivered']
                }
            },
            include: {
                client: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                trialDate: 'asc'
            }
        });

        // Upcoming deliveries (2 days from now) - exclude delivered orders
        const upcomingDeliveries = await prisma.order.findMany({
            where: {
                deliveryDate: {
                    gte: today,
                    lte: twoDaysFromNow
                },
                status: {
                    not: 'Delivered'
                }
            },
            include: {
                client: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                deliveryDate: 'asc'
            }
        });

        // Calculate profit/loss
        const completedOrders = await prisma.order.findMany({
            where: {
                status: 'Delivered'
            },
            include: {
                items: {
                    include: {
                        garmentType: true
                    }
                },
                additionalServiceItems: true
            }
        });

        // Calculate total cost and actual revenue (considering settled amounts)
        let actualRevenue = 0;
        const totalCost = completedOrders.reduce((sum, order) => {
            // Add to actual revenue (use finalAmount if settled, otherwise totalAmount)
            actualRevenue += (order.finalAmount ?? order.totalAmount);

            const orderCost = order.items.reduce((itemSum, item) => {
                return itemSum + (item.quantity * (item.garmentType.cost || 0));
            }, 0);

            const additionalItemsCost = order.additionalServiceItems
                ? order.additionalServiceItems.reduce((acc, item) => acc + (item.cost || 0), 0)
                : 0;

            const additionalCost = Math.max(additionalItemsCost, order.additionalServicesCost || 0);

            return sum + orderCost + additionalCost;
        }, 0);

        const profit = actualRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        res.json({
            totalOrders,
            totalClients,
            pendingOrders,
            totalRevenue,
            totalCost,
            profit,
            profitMargin,
            upcomingTrials,
            upcomingDeliveries
        });
    } catch (error) {
        console.error('Error fetching analytics overview:', error);
        res.status(500).json({ error: 'Failed to fetch analytics overview' });
    }
});

// Get revenue over time
router.get('/revenue', authenticate, async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        // Get orders grouped by date
        const orders = await prisma.order.findMany({
            where: { status: 'Delivered' },
            select: {
                totalAmount: true,
                finalAmount: true,
                createdAt: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // Group by period
        const revenueData = {};
        orders.forEach(order => {
            const date = new Date(order.createdAt);
            let key;

            if (period === 'day') {
                key = date.toISOString().split('T')[0];
            } else if (period === 'month') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            } else if (period === 'year') {
                key = String(date.getFullYear());
            }

            if (!revenueData[key]) {
                revenueData[key] = 0;
            }
            // Use settled amount if available, otherwise use total amount
            const revenue = order.finalAmount ?? order.totalAmount;
            revenueData[key] += revenue;
        });

        const result = Object.entries(revenueData).map(([date, amount]) => ({
            date,
            amount
        }));

        res.json(result);
    } catch (error) {
        console.error('Error fetching revenue analytics:', error);
        res.status(500).json({ error: 'Failed to fetch revenue analytics' });
    }
});

// Get order statistics
router.get('/orders', authenticate, async (req, res) => {
    try {
        const ordersByStatus = await prisma.order.groupBy({
            by: ['status'],
            _count: true
        });

        res.json(ordersByStatus);
    } catch (error) {
        console.error('Error fetching order analytics:', error);
        res.status(500).json({ error: 'Failed to fetch order analytics' });
    }
});

// Get top garment types
router.get('/garments', authenticate, async (req, res) => {
    try {
        const garmentStats = await prisma.orderItem.groupBy({
            by: ['garmentTypeId'],
            _sum: {
                quantity: true,
                subtotal: true
            },
            _count: true
        });

        // Get garment details
        const garmentIds = garmentStats.map(stat => stat.garmentTypeId);
        const garments = await prisma.garmentType.findMany({
            where: { id: { in: garmentIds } }
        });

        const result = garmentStats.map(stat => {
            const garment = garments.find(g => g.id === stat.garmentTypeId);
            return {
                garmentType: garment?.name || 'Unknown',
                quantity: stat._sum.quantity,
                revenue: stat._sum.subtotal,
                orders: stat._count
            };
        });

        res.json(result.sort((a, b) => b.revenue - a.revenue));
    } catch (error) {
        console.error('Error fetching garment analytics:', error);
        res.status(500).json({ error: 'Failed to fetch garment analytics' });
    }
});

// Get overdue reminders
router.get('/overdue-reminders', authenticate, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Overdue trials (trial date passed but not delivered)
        const overdueTrials = await prisma.order.findMany({
            where: {
                trialDate: { lt: today },
                status: { in: ['Pending', 'In Progress', 'Ready for Trial'] }
            },
            include: {
                client: { select: { name: true, phone: true } }
            },
            orderBy: { trialDate: 'asc' }
        });

        // Overdue deliveries (delivery date passed but not delivered)
        const overdueDeliveries = await prisma.order.findMany({
            where: {
                deliveryDate: { lt: today },
                status: { not: 'Delivered' }
            },
            include: {
                client: { select: { name: true, phone: true } }
            },
            orderBy: { deliveryDate: 'asc' }
        });

        // Pending payments (orders with outstanding dues)
        const allOrders = await prisma.order.findMany({
            where: {
                status: { not: 'Delivered' }
            },
            include: {
                client: { select: { name: true, phone: true } }
            }
        });

        const pendingPayments = allOrders.filter(order => {
            const totalDue = order.finalAmount ?? order.totalAmount;
            const paid = order.advance || 0;
            return (totalDue - paid) > 0;
        });

        res.json({
            overdueTrials: overdueTrials.map(order => ({
                ...order,
                daysOverdue: Math.floor((today - new Date(order.trialDate)) / (1000 * 60 * 60 * 24))
            })),
            overdueDeliveries: overdueDeliveries.map(order => ({
                ...order,
                daysOverdue: Math.floor((today - new Date(order.deliveryDate)) / (1000 * 60 * 60 * 24))
            })),
            pendingPayments: pendingPayments.map(order => {
                const totalDue = order.finalAmount ?? order.totalAmount;
                const paid = order.advance || 0;
                return {
                    ...order,
                    outstandingAmount: totalDue - paid
                };
            })
        });
    } catch (error) {
        console.error('Error fetching overdue reminders:', error);
        res.status(500).json({ error: 'Failed to fetch overdue reminders' });
    }
});

// Get inactive clients
router.get('/inactive-clients', authenticate, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const clients = await prisma.client.findMany({
            include: {
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        const inactiveClients = clients
            .filter(client => {
                if (client.orders.length === 0) return true;
                return new Date(client.orders[0].createdAt) < cutoffDate;
            })
            .map(client => {
                const lastOrderDate = client.orders.length > 0
                    ? new Date(client.orders[0].createdAt)
                    : null;
                const daysSince = lastOrderDate
                    ? Math.floor((new Date() - lastOrderDate) / (1000 * 60 * 60 * 24))
                    : null;

                return {
                    clientId: client.id,
                    clientName: client.name,
                    clientPhone: client.phone,
                    lastOrderDate,
                    daysSince,
                    totalOrders: client.orders.length
                };
            });

        res.json(inactiveClients);
    } catch (error) {
        console.error('Error fetching inactive clients:', error);
        res.status(500).json({ error: 'Failed to fetch inactive clients' });
    }
});

// Get today's reminders
router.get('/todays-reminders', authenticate, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Today's trials
        const todaysTrials = await prisma.order.findMany({
            where: {
                trialDate: {
                    gte: today,
                    lt: tomorrow
                },
                status: { not: 'Delivered' }
            },
            include: {
                client: { select: { name: true, phone: true } }
            },
            orderBy: { trialDate: 'asc' }
        });

        // Today's deliveries
        const todaysDeliveries = await prisma.order.findMany({
            where: {
                deliveryDate: {
                    gte: today,
                    lt: tomorrow
                },
                status: { not: 'Delivered' }
            },
            include: {
                client: { select: { name: true, phone: true } }
            },
            orderBy: { deliveryDate: 'asc' }
        });

        res.json({
            todaysTrials,
            todaysDeliveries
        });
    } catch (error) {
        console.error('Error fetching today\'s reminders:', error);
        res.status(500).json({ error: 'Failed to fetch today\'s reminders' });
    }
});

// Get revenue trends over time
router.get('/revenue-trends', authenticate, async (req, res) => {
    try {
        const { period = '30' } = req.query; // days
        const days = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: startDate },
                status: 'Delivered'
            },
            select: {
                createdAt: true,
                totalAmount: true,
                finalAmount: true,
                items: {
                    select: { cost: true, quantity: true }
                },
                additionalServiceItems: {
                    select: { cost: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Group by date
        const revenueByDate = {};
        orders.forEach(order => {
            const date = new Date(order.createdAt).toISOString().split('T')[0];
            const revenue = order.finalAmount ?? order.totalAmount;

            // Calculate cost
            const itemCost = order.items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
            const serviceCost = order.additionalServiceItems.reduce((sum, s) => sum + s.cost, 0);
            const totalCost = itemCost + serviceCost;
            const profit = revenue - totalCost;

            if (!revenueByDate[date]) {
                revenueByDate[date] = { date, revenue: 0, cost: 0, profit: 0, orders: 0 };
            }
            revenueByDate[date].revenue += revenue;
            revenueByDate[date].cost += totalCost;
            revenueByDate[date].profit += profit;
            revenueByDate[date].orders += 1;
        });

        const trends = Object.values(revenueByDate).sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        res.json(trends);
    } catch (error) {
        console.error('Error fetching revenue trends:', error);
        res.status(500).json({ error: 'Failed to fetch revenue trends' });
    }
});

// Get top performing garments
router.get('/top-garments', authenticate, async (req, res) => {
    try {
        const { limit = '10' } = req.query;

        const garmentStats = await prisma.orderItem.groupBy({
            by: ['garmentTypeId'],
            _sum: {
                quantity: true,
                subtotal: true
            },
            _count: true
        });

        const garmentIds = garmentStats.map(stat => stat.garmentTypeId);
        const garments = await prisma.garmentType.findMany({
            where: { id: { in: garmentIds } }
        });

        const result = garmentStats.map(stat => {
            const garment = garments.find(g => g.id === stat.garmentTypeId);
            return {
                name: garment?.name || 'Unknown',
                quantity: stat._sum.quantity,
                revenue: stat._sum.subtotal,
                orders: stat._count,
                averagePrice: stat._sum.subtotal / stat._sum.quantity
            };
        });

        const sorted = result.sort((a, b) => b.revenue - a.revenue);
        res.json(sorted.slice(0, parseInt(limit)));
    } catch (error) {
        console.error('Error fetching top garments:', error);
        res.status(500).json({ error: 'Failed to fetch top garments' });
    }
});

// Get top clients by revenue
router.get('/top-clients', authenticate, async (req, res) => {
    try {
        const { limit = '10' } = req.query;

        const clients = await prisma.client.findMany({
            include: {
                orders: {
                    where: { status: 'Delivered' },
                    select: {
                        totalAmount: true,
                        finalAmount: true
                    }
                }
            }
        });

        const clientRevenue = clients.map(client => {
            const revenue = client.orders.reduce((sum, order) => {
                return sum + (order.finalAmount ?? order.totalAmount);
            }, 0);

            return {
                clientId: client.id,
                name: client.name,
                phone: client.phone,
                totalOrders: client.orders.length,
                totalRevenue: revenue,
                averageOrderValue: client.orders.length > 0 ? revenue / client.orders.length : 0
            };
        });

        const sorted = clientRevenue
            .filter(c => c.totalRevenue > 0)
            .sort((a, b) => b.totalRevenue - a.totalRevenue);

        res.json(sorted.slice(0, parseInt(limit)));
    } catch (error) {
        console.error('Error fetching top clients:', error);
        res.status(500).json({ error: 'Failed to fetch top clients' });
    }
});

// Get profit analysis
router.get('/profit-analysis', authenticate, async (req, res) => {
    try {
        const deliveredOrders = await prisma.order.findMany({
            where: { status: 'Delivered' },
            include: {
                items: {
                    select: { cost: true, quantity: true, subtotal: true }
                },
                additionalServiceItems: {
                    select: { cost: true, amount: true }
                }
            }
        });

        let totalRevenue = 0;
        let totalCost = 0;
        let orderCount = 0;

        const profitByOrder = deliveredOrders.map(order => {
            const revenue = order.finalAmount ?? order.totalAmount;
            const itemCost = order.items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
            const serviceCost = order.additionalServiceItems.reduce((sum, s) => sum + s.cost, 0);
            const cost = itemCost + serviceCost;
            const profit = revenue - cost;
            const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

            totalRevenue += revenue;
            totalCost += cost;
            orderCount++;

            return {
                orderNumber: order.orderNumber,
                revenue,
                cost,
                profit,
                margin
            };
        });

        const totalProfit = totalRevenue - totalCost;
        const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        res.json({
            summary: {
                totalRevenue,
                totalCost,
                totalProfit,
                averageMargin,
                orderCount
            },
            orders: profitByOrder.sort((a, b) => b.profit - a.profit).slice(0, 20)
        });
    } catch (error) {
        console.error('Error fetching profit analysis:', error);
        res.status(500).json({ error: 'Failed to fetch profit analysis' });
    }
});

// Get customer insights
router.get('/customer-insights', authenticate, async (req, res) => {
    try {
        const clients = await prisma.client.findMany({
            include: {
                orders: {
                    select: {
                        id: true,
                        createdAt: true,
                        totalAmount: true,
                        finalAmount: true,
                        status: true
                    }
                }
            }
        });

        // Calculate metrics
        const totalClients = clients.length;
        const clientsWithOrders = clients.filter(c => c.orders.length > 0).length;
        const repeatCustomers = clients.filter(c => c.orders.length > 1).length;
        const repeatCustomerRate = clientsWithOrders > 0 ? (repeatCustomers / clientsWithOrders) * 100 : 0;

        // Average orders per customer
        const totalOrders = clients.reduce((sum, c) => sum + c.orders.length, 0);
        const avgOrdersPerCustomer = clientsWithOrders > 0 ? totalOrders / clientsWithOrders : 0;

        // Customer lifetime value
        let totalRevenue = 0;
        const customerValues = clients.map(client => {
            const revenue = client.orders
                .filter(o => o.status === 'Delivered')
                .reduce((sum, order) => sum + (order.finalAmount ?? order.totalAmount), 0);
            totalRevenue += revenue;
            return {
                clientId: client.id,
                name: client.name,
                orders: client.orders.length,
                lifetimeValue: revenue,
                firstOrder: client.orders.length > 0 ? new Date(Math.min(...client.orders.map(o => new Date(o.createdAt)))) : null,
                lastOrder: client.orders.length > 0 ? new Date(Math.max(...client.orders.map(o => new Date(o.createdAt)))) : null
            };
        });

        const avgLifetimeValue = clientsWithOrders > 0 ? totalRevenue / clientsWithOrders : 0;

        // Customer acquisition trends (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const acquisitionByMonth = {};
        clients.forEach(client => {
            const createdDate = new Date(client.createdAt);
            if (createdDate >= sixMonthsAgo) {
                const monthKey = createdDate.toISOString().slice(0, 7); // YYYY-MM
                acquisitionByMonth[monthKey] = (acquisitionByMonth[monthKey] || 0) + 1;
            }
        });

        const acquisitionTrends = Object.entries(acquisitionByMonth)
            .map(([month, count]) => ({ month, newClients: count }))
            .sort((a, b) => a.month.localeCompare(b.month));

        // Inactive customers (60+ days)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const inactiveClients = customerValues
            .filter(c => c.lastOrder && c.lastOrder < sixtyDaysAgo && c.orders > 0)
            .map(c => ({
                ...c,
                daysSinceLastOrder: Math.floor((new Date() - c.lastOrder) / (1000 * 60 * 60 * 24))
            }))
            .sort((a, b) => b.lifetimeValue - a.lifetimeValue);

        // Top customers by lifetime value
        const topCustomers = customerValues
            .filter(c => c.lifetimeValue > 0)
            .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
            .slice(0, 10);

        res.json({
            summary: {
                totalClients,
                clientsWithOrders,
                repeatCustomers,
                repeatCustomerRate: repeatCustomerRate.toFixed(2),
                avgOrdersPerCustomer: avgOrdersPerCustomer.toFixed(2),
                avgLifetimeValue: avgLifetimeValue.toFixed(2),
                inactiveCount: inactiveClients.length
            },
            acquisitionTrends,
            topCustomers,
            inactiveClients: inactiveClients.slice(0, 20)
        });
    } catch (error) {
        console.error('Error fetching customer insights:', error);
        res.status(500).json({ error: 'Failed to fetch customer insights' });
    }
});

// Get profit margin analysis by garment
router.get('/garment-profitability', authenticate, async (req, res) => {
    try {
        const garmentTypes = await prisma.garmentType.findMany();

        const profitabilityData = await Promise.all(
            garmentTypes.map(async (garment) => {
                // Get all order items for this garment with order info
                const orderItems = await prisma.orderItem.findMany({
                    where: { garmentTypeId: garment.id },
                    include: {
                        order: {
                            select: { status: true }
                        }
                    }
                });

                // Filter only items from delivered orders
                const deliveredItems = orderItems.filter(item => item.order && item.order.status === 'Delivered');

                if (deliveredItems.length === 0) {
                    return {
                        garmentId: garment.id,
                        name: garment.name,
                        totalSold: 0,
                        totalRevenue: 0,
                        totalCost: 0,
                        totalProfit: 0,
                        profitMargin: 0,
                        avgPrice: garment.price,
                        avgCost: garment.cost,
                        recommendedPrice: garment.price,
                        orders: 0
                    };
                }

                const totalSold = deliveredItems.reduce((sum, item) => sum + item.quantity, 0);
                const totalRevenue = deliveredItems.reduce((sum, item) => sum + item.subtotal, 0);
                const totalCost = deliveredItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
                const totalProfit = totalRevenue - totalCost;
                const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
                const avgPrice = totalRevenue / totalSold;
                const avgCost = totalCost / totalSold;

                // Calculate recommended price (maintain 40% margin)
                const targetMargin = 0.40;
                const recommendedPrice = avgCost / (1 - targetMargin);

                return {
                    garmentId: garment.id,
                    name: garment.name,
                    totalSold,
                    totalRevenue,
                    totalCost,
                    totalProfit,
                    profitMargin: profitMargin.toFixed(2),
                    avgPrice: avgPrice.toFixed(2),
                    avgCost: avgCost.toFixed(2),
                    recommendedPrice: recommendedPrice.toFixed(2),
                    orders: deliveredItems.length
                };
            })
        );

        // Sort by profit margin
        const sortedByMargin = [...profitabilityData]
            .filter(item => item.totalSold > 0)
            .sort((a, b) => parseFloat(b.profitMargin) - parseFloat(a.profitMargin));

        // Sort by total profit
        const sortedByProfit = [...profitabilityData]
            .filter(item => item.totalSold > 0)
            .sort((a, b) => b.totalProfit - a.totalProfit);

        // Identify low margin items (below 30%)
        const lowMarginItems = profitabilityData
            .filter(item => item.totalSold > 0 && parseFloat(item.profitMargin) < 30)
            .sort((a, b) => parseFloat(a.profitMargin) - parseFloat(b.profitMargin));

        // Calculate overall metrics
        const overallRevenue = profitabilityData.reduce((sum, item) => sum + item.totalRevenue, 0);
        const overallCost = profitabilityData.reduce((sum, item) => sum + item.totalCost, 0);
        const overallProfit = overallRevenue - overallCost;
        const overallMargin = overallRevenue > 0 ? (overallProfit / overallRevenue) * 100 : 0;

        res.json({
            summary: {
                totalGarmentTypes: garmentTypes.length,
                totalRevenue: overallRevenue.toFixed(2),
                totalCost: overallCost.toFixed(2),
                totalProfit: overallProfit.toFixed(2),
                averageMargin: overallMargin.toFixed(2)
            },
            mostProfitableByMargin: sortedByMargin.slice(0, 5),
            mostProfitableByAmount: sortedByProfit.slice(0, 5),
            lowMarginItems,
            allGarments: profitabilityData.filter(item => item.totalSold > 0)
        });
    } catch (error) {
        console.error('Error fetching garment profitability:', error);
        res.status(500).json({ error: 'Failed to fetch garment profitability' });
    }
});

export default router;
