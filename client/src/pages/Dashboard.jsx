import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { FiShoppingCart, FiDollarSign, FiUsers, FiBell, FiAlertTriangle, FiClock, FiX, FiChevronRight, FiCalendar } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reminders, setReminders] = useState(null);
    const [showReminders, setShowReminders] = useState(true);
    const [notificationPermission, setNotificationPermission] = useState(
        typeof Notification !== 'undefined' ? Notification.permission : 'denied'
    );

    useEffect(() => {
        fetchStats();
        fetchReminders();
        requestNotificationPermission();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/analytics/overview');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReminders = async () => {
        try {
            const [overdueRes, inactiveRes, todayRes] = await Promise.all([
                api.get('/analytics/overdue-reminders'),
                api.get('/analytics/inactive-clients?days=30'),
                api.get('/analytics/todays-reminders')
            ]);

            const reminderData = {
                ...overdueRes.data,
                inactiveClients: inactiveRes.data,
                ...todayRes.data
            };

            setReminders(reminderData);

            // Show browser notifications for today's items
            if (notificationPermission === 'granted') {
                showBrowserNotifications(todayRes.data);
            }
        } catch (error) {
            console.error('Error fetching reminders:', error);
        }
    };

    const requestNotificationPermission = async () => {
        if (typeof Notification === 'undefined') return;

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
        }
    };

    const showBrowserNotifications = (todayData) => {
        const { todaysTrials, todaysDeliveries } = todayData;

        if (todaysTrials && todaysTrials.length > 0) {
            new Notification('📋 Trial Reminder - The Darji', {
                body: `You have ${todaysTrials.length} trial${todaysTrials.length > 1 ? 's' : ''} scheduled for today`,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: 'todays-trials'
            });
        }

        if (todaysDeliveries && todaysDeliveries.length > 0) {
            new Notification('🚚 Delivery Reminder - The Darji', {
                body: `You have ${todaysDeliveries.length} deliver${todaysDeliveries.length > 1 ? 'ies' : 'y'} scheduled for today`,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: 'todays-deliveries'
            });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-darji-accent mb-4"></div>
                <p className="text-gray-500 font-medium">Loading dashboard...</p>
            </div>
        );
    }

    const statCards = [
        { label: 'Total Orders', value: stats?.totalOrders || 0, icon: FiShoppingCart, color: 'bg-blue-500' },
        { label: 'Total Revenue', value: `₹${stats?.totalRevenue?.toFixed(2) || 0}`, icon: FiDollarSign, color: 'bg-green-500' },
        { label: 'Profit/Loss', value: `₹${stats?.profit?.toFixed(2) || 0}`, icon: FiDollarSign, color: stats?.profit >= 0 ? 'bg-green-600' : 'bg-red-500' },
        { label: 'Total Clients', value: stats?.totalClients || 0, icon: FiUsers, color: 'bg-purple-500' },
        { label: 'Pending Orders', value: stats?.pendingOrders || 0, icon: FiBell, color: 'bg-orange-500' },
    ];

    return (
        <div className="fade-in max-w-7xl mx-auto space-y-8 pb-20 md:pb-0 px-4 md:px-0">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Overview of your tailoring business</p>
                </div>
                <div className="hidden md:block text-right">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>

            {/* Stats Grid - Premium Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    // Extract color base (e.g., 'blue' from 'bg-blue-500') roughly or use distinct styles
                    const colorClass = stat.color.replace('bg-', 'text-').replace('-500', '-600').replace('-600', '-600');
                    const bgClass = stat.color.replace('bg-', 'bg-').replace('-500', '-50').replace('-600', '-50');

                    return (
                        <div key={index} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                                    <h3 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight group-hover:text-darji-accent transition-colors">
                                        {stat.value}
                                    </h3>
                                </div>
                                <div className={`p-3 rounded-xl ${bgClass} ${colorClass} group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon size={24} />
                                </div>
                            </div>
                            {/* Decorative bottom line */}
                            <div className={`mt-4 h-1 w-full rounded-full ${bgClass} overflow-hidden`}>
                                <div className={`h-full w-1/3 ${stat.color} rounded-full`}></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Smart Reminders Section */}
            {reminders && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transform transition-all duration-300">
                    <div className="bg-gradient-to-r from-darji-primary to-darji-accent p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner">
                                <FiBell className="text-white" size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">Smart Reminders</h2>
                                <p className="text-blue-100 text-sm font-medium">Alerts & Follow-ups</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowReminders(!showReminders)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white active:scale-95"
                        >
                            <FiChevronRight size={20} className={`transition-transform duration-300 ${showReminders ? 'rotate-90' : ''}`} />
                        </button>
                    </div>

                    {showReminders && (
                        <div className="p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            {/* Overdue Trials */}
                            {reminders.overdueTrials && reminders.overdueTrials.length > 0 && (
                                <div className="bg-red-50 border border-red-100 p-4 rounded-xl shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                            <FiAlertTriangle size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-black text-red-900 mb-3 flex items-center gap-2">
                                                Overdue Trials
                                                <span className="bg-red-200 text-red-800 text-xs px-2 py-0.5 rounded-full">{reminders.overdueTrials.length}</span>
                                            </h3>
                                            <div className="space-y-2">
                                                {reminders.overdueTrials.slice(0, 3).map(order => (
                                                    <Link
                                                        key={order.id}
                                                        to={`/orders/${order.id}`}
                                                        className="flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-md transition-all group border border-red-100/50"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-gray-900">{order.client.name}</p>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="font-medium text-gray-500">#{order.orderNumber}</span>
                                                                <span className="text-red-600 font-bold">• {order.daysOverdue} days overdue</span>
                                                            </div>
                                                        </div>
                                                        <FiChevronRight className="text-gray-300 group-hover:text-red-500 transition-colors" />
                                                    </Link>
                                                ))}
                                                {reminders.overdueTrials.length > 3 && (
                                                    <p className="text-sm text-red-600 font-bold ml-1 hover:underline cursor-pointer">+{reminders.overdueTrials.length - 3} more overdue</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Overdue Deliveries */}
                            {reminders.overdueDeliveries && reminders.overdueDeliveries.length > 0 && (
                                <div className="bg-red-50 border border-red-100 p-4 rounded-xl shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                            <FiAlertTriangle size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-black text-red-900 mb-3 flex items-center gap-2">
                                                Overdue Deliveries
                                                <span className="bg-red-200 text-red-800 text-xs px-2 py-0.5 rounded-full">{reminders.overdueDeliveries.length}</span>
                                            </h3>
                                            <div className="space-y-2">
                                                {reminders.overdueDeliveries.slice(0, 3).map(order => (
                                                    <Link
                                                        key={order.id}
                                                        to={`/orders/${order.id}`}
                                                        className="flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-md transition-all group border border-red-100/50"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-gray-900">{order.client.name}</p>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="font-medium text-gray-500">#{order.orderNumber}</span>
                                                                <span className="text-red-600 font-bold">• {order.daysOverdue} days overdue</span>
                                                            </div>
                                                        </div>
                                                        <FiChevronRight className="text-gray-300 group-hover:text-red-600 transition-colors" />
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Pending Payments */}
                            {reminders.pendingPayments && reminders.pendingPayments.length > 0 && (
                                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                                            <FiDollarSign size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-black text-orange-900 mb-3 flex items-center gap-2">
                                                Pending Payments
                                                <span className="bg-orange-200 text-orange-800 text-xs px-2 py-0.5 rounded-full">{reminders.pendingPayments.length}</span>
                                            </h3>
                                            <div className="space-y-2">
                                                {reminders.pendingPayments.slice(0, 3).map(order => (
                                                    <Link
                                                        key={order.id}
                                                        to={`/orders/${order.id}`}
                                                        className="flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-md transition-all group border border-orange-100/50"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-gray-900">{order.client.name}</p>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="font-medium text-gray-500">#{order.orderNumber}</span>
                                                                <span className="text-orange-600 font-bold">• ₹{order.outstandingAmount.toFixed(0)} due</span>
                                                            </div>
                                                        </div>
                                                        <FiChevronRight className="text-gray-300 group-hover:text-orange-500 transition-colors" />
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Inactive Clients */}
                            {reminders.inactiveClients && reminders.inactiveClients.length > 0 && (
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                            <FiUsers size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-black text-blue-900 mb-3 flex items-center gap-2">
                                                Inactive Clients
                                                <span className="bg-blue-200 text-blue-800 text-xs px-2 py-0.5 rounded-full">{reminders.inactiveClients.length}</span>
                                            </h3>
                                            <div className="space-y-2">
                                                {reminders.inactiveClients.slice(0, 3).map(client => (
                                                    <a
                                                        key={client.clientId}
                                                        href={`https://wa.me/${client.clientPhone.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-md transition-all group border border-blue-100/50"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-gray-900">{client.clientName}</p>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="text-blue-600 font-bold">Last order {client.daysSince} days ago</span>
                                                            </div>
                                                        </div>
                                                        <FiChevronRight className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Today's Schedule */}
                            {((reminders.todaysTrials && reminders.todaysTrials.length > 0) ||
                                (reminders.todaysDeliveries && reminders.todaysDeliveries.length > 0)) && (
                                    <div className="bg-green-50 border border-green-100 p-4 rounded-xl shadow-sm">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                                <FiClock size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-black text-green-900 mb-3">Today's Schedule</h3>
                                                <div className="space-y-2">
                                                    {reminders.todaysTrials && reminders.todaysTrials.map(order => (
                                                        <Link
                                                            key={order.id}
                                                            to={`/orders/${order.id}`}
                                                            className="flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-md transition-all group border border-green-100/50"
                                                        >
                                                            <div>
                                                                <p className="font-bold text-gray-900">{order.client.name}</p>
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <span className="font-medium text-gray-500">#{order.orderNumber}</span>
                                                                    <span className="text-green-600 font-bold">• Trial Today</span>
                                                                </div>
                                                            </div>
                                                            <FiChevronRight className="text-gray-300 group-hover:text-green-500 transition-colors" />
                                                        </Link>
                                                    ))}
                                                    {reminders.todaysDeliveries && reminders.todaysDeliveries.map(order => (
                                                        <Link
                                                            key={order.id}
                                                            to={`/orders/${order.id}`}
                                                            className="flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-md transition-all group border border-green-100/50"
                                                        >
                                                            <div>
                                                                <p className="font-bold text-gray-900">{order.client.name}</p>
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <span className="font-medium text-gray-500">#{order.orderNumber}</span>
                                                                    <span className="text-green-600 font-bold">• Delivery Today</span>
                                                                </div>
                                                            </div>
                                                            <FiChevronRight className="text-gray-300 group-hover:text-green-500 transition-colors" />
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            {/* No Reminders */}
                            {!reminders.overdueTrials?.length &&
                                !reminders.overdueDeliveries?.length &&
                                !reminders.pendingPayments?.length &&
                                !reminders.inactiveClients?.length &&
                                !reminders.todaysTrials?.length &&
                                !reminders.todaysDeliveries?.length && (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <FiBell className="text-green-600" size={32} />
                                        </div>
                                        <p className="text-gray-600 font-medium">All caught up! No reminders at the moment.</p>
                                    </div>
                                )}
                        </div>
                    )}
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Quick Actions & Navigation */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Quick Actions */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-1 h-6 bg-darji-accent rounded-full inline-block"></span>
                            Quick Actions
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Link to="/new-order" className="flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-darji-accent hover:bg-blue-50/30 transition-all group shadow-sm hover:shadow-md">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <span className="text-2xl font-bold">+</span>
                                </div>
                                <span className="font-bold text-gray-700 group-hover:text-blue-700">New Order</span>
                            </Link>
                            <Link to="/clients" className="flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-purple-500 hover:bg-purple-50/30 transition-all group shadow-sm hover:shadow-md">
                                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <FiUsers size={24} />
                                </div>
                                <span className="font-bold text-gray-700 group-hover:text-purple-700">Clients</span>
                            </Link>
                            <Link to="/analytics" className="flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-green-500 hover:bg-green-50/30 transition-all group shadow-sm hover:shadow-md">
                                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <FiDollarSign size={24} />
                                </div>
                                <span className="font-bold text-gray-700 group-hover:text-green-700">Analytics</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Column: Upcoming Schedule */}
                <div className="space-y-6">
                    {(stats?.upcomingTrials?.length > 0 || stats?.upcomingDeliveries?.length > 0) ? (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transform transition-all hover:shadow-xl">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-5">
                                <h2 className="text-white font-bold flex items-center gap-2">
                                    <FiCalendar /> Upcoming Schedule
                                </h2>
                            </div>
                            <div className="p-5 space-y-6">
                                {stats.upcomingTrials?.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Upcoming Trials</h3>
                                        <div className="space-y-3">
                                            {stats.upcomingTrials.map(order => (
                                                <Link key={order.id} to={`/orders/${order.id}`} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:border-blue-100 hover:shadow-sm transition-all group">
                                                    <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center text-gray-700 font-bold shadow-sm shrink-0 border border-gray-100">
                                                        <span className="text-xs text-gray-400 uppercase">{new Date(order.trialDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                                                        <span className="text-lg leading-none">{new Date(order.trialDate).getDate()}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors">{order.client.name}</p>
                                                        <p className="text-xs text-gray-500">Order #{order.orderNumber}</p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {stats.upcomingDeliveries?.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Upcoming Deliveries</h3>
                                        <div className="space-y-3">
                                            {stats.upcomingDeliveries.map(order => (
                                                <Link key={order.id} to={`/orders/${order.id}`} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-green-50 hover:border-green-100 hover:shadow-sm transition-all group">
                                                    <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center text-gray-700 font-bold shadow-sm shrink-0 border border-gray-100">
                                                        <span className="text-xs text-gray-400 uppercase">{new Date(order.deliveryDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                                                        <span className="text-lg leading-none">{new Date(order.deliveryDate).getDate()}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-gray-800 truncate group-hover:text-green-600 transition-colors">{order.client.name}</p>
                                                        <p className="text-xs text-gray-500">Order #{order.orderNumber}</p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center shadow-sm">
                            <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiCalendar size={32} />
                            </div>
                            <h3 className="font-bold text-gray-800">Clear Schedule</h3>
                            <p className="text-gray-500 text-sm mt-1">No upcoming trials or deliveries this week.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
