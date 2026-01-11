import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
    FiBarChart2, FiBox, FiClipboard, FiClock,
    FiSearch, FiMenu, FiX, FiCheckCircle,
    FiTrendingUp, FiCalendar, FiPlus,
    FiCreditCard, FiUsers, FiBell, FiShoppingCart,
    FiShoppingBag, FiScissors, FiFilter,
    FiChevronRight, FiChevronDown, FiArrowRight
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reminders, setReminders] = useState(null);
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        fetchDashboardData();
        updateGreeting();
    }, []);

    const updateGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    };

    const fetchDashboardData = async () => {
        try {
            const [overviewResponse, ordersResponse, profitResponse] = await Promise.all([
                api.get('/analytics/overview'),
                api.get('/orders', { params: { limit: 100 } }),
                api.get('/analytics/profit')
            ]);

            const { totalOrders, totalClients, totalRevenue, pendingOrders, pendingOrderRevenue } = overviewResponse.data;
            const allOrders = ordersResponse.data.orders || [];
            const { profit, profitMargin, potentialProfit } = profitResponse.data;

            // --- Stats Processing ---
            setStats({
                totalOrders,
                totalRevenue,
                profit: profit || 0,
                potentialProfit: potentialProfit || 0,
                profitMargin: profitMargin || 0,
                totalClients,
                pendingOrders,
                pendingOrderRevenue: pendingOrderRevenue || 0,
                recentOrders: allOrders.slice(0, 5)
            });

            // --- Reminders Processing ---
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);

            const overdueTrials = [];
            const todaysTrials = [];
            const upcomingTrials = []; // New
            const pendingPayments = [];

            allOrders.forEach(order => {
                const trialDate = order.trialDate ? new Date(order.trialDate) : null;

                // Reset time for accurate date comparison
                if (trialDate) trialDate.setHours(0, 0, 0, 0);

                // Overdue
                if (trialDate && trialDate < today && !['Ready for Trial', 'Delivered', 'Completed'].includes(order.status)) {
                    const daysOverdue = Math.floor((today - trialDate) / (1000 * 60 * 60 * 24));
                    overdueTrials.push({ ...order, daysOverdue });
                }

                // Today
                if (trialDate && trialDate.getTime() === today.getTime() && !['Completed', 'Delivered'].includes(order.status)) {
                    todaysTrials.push(order);
                }

                // Upcoming (Tomorrow to Next Week)
                if (trialDate && trialDate > today && trialDate <= nextWeek && !['Completed', 'Delivered'].includes(order.status)) {
                    upcomingTrials.push(order);
                }

                // Payments
                const outstanding = (parseFloat(order.totalAmount) || 0) - (parseFloat(order.advance) || 0);
                if (outstanding > 0 && !['Delivered', 'Cancelled'].includes(order.status)) {
                    pendingPayments.push({ ...order, outstandingAmount: outstanding });
                }
            });

            setReminders({
                overdueTrials,
                todaysTrials,
                upcomingTrials,
                pendingPayments
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Mock data for sparkline
    const sparklineData = [{ value: 400 }, { value: 300 }, { value: 500 }, { value: 280 }, { value: 590 }, { value: 320 }, { value: 450 }];

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-darji-accent border-t-transparent rounded-full" /></div>;

    return (
        <div className="w-full max-w-full mx-auto pb-6 md:pb-0 overflow-x-hidden px-3 md:px-0 space-y-8 animate-fade-in">
            {/* Hero Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <p className="text-slate-500 font-medium tracking-wide text-xs mb-2 uppercase">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        {greeting}, <span className="text-darji-accent">Kartik</span>
                    </h1>
                </div>
                <div className="flex gap-3">
                    <Link to="/orders" className="btn-secondary shadow-sm">View Orders</Link>
                    <Link to="/new-order" className="btn-primary flex items-center gap-2 shadow-lg shadow-darji-primary/20">
                        <span className="text-lg">+</span> New Order
                    </Link>
                </div>
            </div>

            {/* Stats Grid - Modern Slate */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {/* Revenue Card */}
                <div className="card-premium p-4 sm:p-6 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Revenue</p>
                            <h3 className="text-lg sm:text-3xl font-bold text-slate-900 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">₹{stats?.totalRevenue?.toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0 flex items-center justify-center h-8 w-8">
                            <FiBarChart2 size={18} />
                        </div>
                    </div>
                    <div className="h-12 w-full mt-2 -ml-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparklineData}>
                                <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} fill="url(#colorRevenue)" fillOpacity={0.1} />
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Profit Card */}
                <div className="card-premium p-4 sm:p-6 group">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Net Profit</p>
                            <h3 className="text-lg sm:text-3xl font-bold text-slate-900 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">₹{stats?.profit?.toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0 flex items-center justify-center h-8 w-8">
                            <FiTrendingUp size={18} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                            +{stats?.profitMargin}% Margin
                        </span>
                    </div>
                </div>

                {/* Orders Card */}
                <div className="card-premium p-4 sm:p-6 group">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Orders</p>
                            <h3 className="text-lg sm:text-3xl font-bold text-slate-900 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">{stats?.pendingOrders || 0}</h3>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0 flex items-center justify-center h-8 w-8">
                            <FiShoppingBag size={18} />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 font-medium">
                        {stats?.pendingOrders > 0 ? 'Requires attention soon' : 'All orders on track'}
                    </p>
                </div>

                {/* Pipeline Value */}
                <div className="bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-800 relative overflow-hidden group text-white">
                    <div className="absolute -bottom-6 -right-6 p-4 opacity-5 pointer-events-none">
                        <FiUsers size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider leading-tight pr-2">Uncollected Revenue</p>
                            <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 shrink-0">
                                <FiUsers size={14} />
                            </div>
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-white mb-2 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                            ₹{stats?.pendingOrderRevenue?.toLocaleString('en-IN') || '0'}
                        </h3>

                        <div className="flex flex-col gap-2 w-full">
                            <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1.5 rounded-lg w-full border border-emerald-500/10">
                                <div className="flex justify-between items-center w-full">
                                    <span className="text-[9px] text-emerald-500/70 uppercase font-bold">Pot. Profit</span>
                                    <span className="font-bold text-xs">₹{stats?.potentialProfit?.toLocaleString('en-IN') || 0}</span>
                                </div>
                            </div>
                            <div className="text-slate-400/80 text-[10px] leading-tight">
                                From pending orders
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Recent Activity - Modern Slate Card */}
                <div className="lg:col-span-2">
                    <div className="card-premium p-6 h-full">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-2">
                            <h2 className="text-xl font-bold text-slate-800">Recent Activity</h2>
                            <Link to="/orders" className="text-sm font-semibold text-darji-accent hover:text-darji-secondary flex items-center gap-1 transition-colors">
                                View All <FiArrowRight />
                            </Link>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {stats?.recentOrders?.map(order => (
                                <div key={order._id} className="py-5 flex items-center justify-between group hover:bg-slate-50/50 transition-colors -mx-2 px-2 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ${order.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                                            order.status === 'Pending' ? 'bg-amber-100 text-amber-600' :
                                                'bg-slate-100 text-slate-400'
                                            }`}>
                                            {order.client?.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 text-sm group-hover:text-darji-accent transition-colors">{order.client?.name}</p>
                                            <p className="text-xs text-slate-500 font-medium">#{order.orderNumber}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-6">
                                        <p className="font-bold text-slate-800 text-sm">₹{order.totalAmount?.toLocaleString('en-IN')}</p>
                                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${order.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            order.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                'bg-slate-50 text-slate-500 border-slate-100'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
                                <div className="py-12 text-center text-slate-400 font-medium">No recent activity</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Assistant / Reminders - Modern Slate Card */}
                <div className="space-y-6">
                    <div className="card-premium p-6">
                        <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4 flex items-center gap-2">
                            Studio Assistant
                            {reminders?.overdueTrials?.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-glow-red" />}
                        </h2>

                        <div className="space-y-4">
                            {/* Overdue Alerts - High Importance */}
                            {reminders?.overdueTrials?.map(item => (
                                <div key={item._id} className="bg-red-50 border border-red-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-3">
                                            <div className="mt-0.5 text-red-500"><FiBell /></div>
                                            <div>
                                                <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-0.5">Trial Overdue</p>
                                                <p className="font-bold text-slate-900 text-sm">{item.client?.name}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold bg-white text-red-600 px-2 py-1 rounded-lg border border-red-100 shadow-sm">
                                            {item.daysOverdue} Days
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* Today's Schedule - Modern */}
                            {reminders?.todaysTrials?.map(item => (
                                <div key={item._id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-darji-accent/50 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <FiClock size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Today's Schedule</p>
                                            <p className="font-bold text-slate-900 line-clamp-1">{item.client?.name} (Trial)</p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Upcoming Trials - Modern */}
                            {reminders?.upcomingTrials?.map(item => (
                                <div key={item._id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl hover:bg-white hover:shadow-sm transition-all">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                {new Date(item.trialDate).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                                            </p>
                                            <p className="font-bold text-slate-800 text-sm">{item.client?.name}</p>
                                        </div>
                                        <span className="text-xs font-semibold text-darji-accent bg-indigo-50 px-2 py-1 rounded-md">Trial</span>
                                    </div>
                                </div>
                            ))}

                            {reminders?.pendingPayments?.length > 0 && (
                                <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg shadow-slate-900/10">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                            <FiCreditCard className="text-white" size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Finance</p>
                                            <p className="font-bold text-white text-lg">{reminders.pendingPayments.length} Pending Payments</p>
                                        </div>
                                    </div>
                                    <Link to="/orders" className="block w-full text-center py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors uppercase tracking-wide">
                                        View Details
                                    </Link>
                                </div>
                            )}

                            {!reminders?.overdueTrials?.length && !reminders?.todaysTrials?.length && !reminders?.upcomingTrials?.length && (
                                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <FiCheckCircle size={24} className="mx-auto text-emerald-500 mb-2" />
                                    <p className="text-sm font-semibold text-slate-700">All caught up</p>
                                    <p className="text-xs text-slate-400">No urgent alerts for today.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
