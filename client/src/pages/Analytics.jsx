import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { FiTrendingUp, FiUsers, FiShoppingBag, FiClock, FiActivity, FiCreditCard, FiCalendar, FiPieChart, FiBarChart2, FiTag, FiFileText, FiTrendingDown, FiCheckCircle, FiPercent, FiList, FiChevronsUp } from 'react-icons/fi';

export default function Analytics() {
    const navigate = useNavigate();
    const [overview, setOverview] = useState(null);
    const [revenueData, setRevenueData] = useState([]);
    const [garmentStats, setGarmentStats] = useState([]);
    const [orderStats, setOrderStats] = useState([]);
    const [discountData, setDiscountData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [revenuePeriod, setRevenuePeriod] = useState('month');
    const [discountedOrders, setDiscountedOrders] = useState([]);
    const [showDiscountedOrders, setShowDiscountedOrders] = useState(false);

    useEffect(() => {
        fetchAnalytics();
    }, [revenuePeriod]);

    const fetchAnalytics = async () => {
        try {
            // Use backend analytics API for all calculations
            const [overviewRes, revenueRes, statusRes, garmentRes, profitRes, discountRes] = await Promise.all([
                api.get('/analytics/overview'),
                api.get('/analytics/revenue', { params: { groupBy: revenuePeriod } }),
                api.get('/analytics/status'),
                api.get('/analytics/garments'),
                api.get('/analytics/profit'),
                api.get('/analytics/discounts')
            ]);

            // Set overview data
            const { totalOrders, totalClients, totalRevenue, pendingOrders, pendingOrderRevenue } = overviewRes.data;
            const { totalCost, profit, profitMargin, potentialProfit } = profitRes.data;

            setOverview({
                totalRevenue,
                totalCost,
                profit,
                profitMargin,
                potentialProfit,
                totalOrders,
                pendingOrders,
                pendingOrderRevenue
            });

            // Process revenue data with better date formatting
            const revenueChartData = revenueRes.data.map(item => {
                let formattedDate = item._id;
                const dateObj = new Date(item._id);

                if (revenuePeriod === 'day') {
                    formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else if (revenuePeriod === 'month') {
                    // For month keys like "2023-01", parsing might need care or just use string splitting
                    // Assuming item._id is "YYYY-MM"
                    const [year, month] = item._id.split('-');
                    const date = new Date(year, month - 1);
                    formattedDate = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }

                return {
                    date: formattedDate,
                    amount: item.totalRevenue,
                    originalDate: item._id
                };
            });
            setRevenueData(revenueChartData);

            // Set order status distribution nicely
            const pieData = statusRes.data.map(item => ({
                name: item._id, // Changed from status to name for Recharts defaults
                value: item.count // Changed from count to value
            }));
            setOrderStats(pieData);

            // Transform garment stats to match expected field names
            const transformedGarmentStats = (garmentRes.data || []).map(item => ({
                garmentType: item.name || 'Unknown',
                orders: item.orderCount || 0,
                quantity: item.totalQuantity || 0,
                revenue: item.totalRevenue || 0,
                cost: item.totalCost || 0,
                profit: item.profit || 0
            }));
            setGarmentStats(transformedGarmentStats);
            setDiscountData(discountRes.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            setError('Failed to load analytics data. Please try refreshing.');
        } finally {
            setLoading(false);
        }
    };

    const fetchDiscountedOrders = async () => {
        try {
            const response = await api.get('/analytics/discounted-orders');
            setDiscountedOrders(response.data);
        } catch (error) {
            console.error('Error fetching discounted orders:', error);
        }
    };

    const handleToggleDiscountedOrders = async () => {
        if (!showDiscountedOrders && discountedOrders.length === 0) {
            await fetchDiscountedOrders();
        }
        setShowDiscountedOrders(!showDiscountedOrders);
    };

    if (loading) {
        return <div className="text-center py-12 text-slate-500 font-medium">Loading analytics...</div>;
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-rose-500 mb-4 text-xl font-bold">⚠️ {error}</div>
                <button onClick={fetchAnalytics} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-700 transition-colors">
                    Retry
                </button>
            </div>
        );
    }

    if (!overview) return null;

    const COLORS = ['#4f46e5', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

    return (
        <div className="fade-in w-full max-w-full mx-auto pb-6 md:pb-0 overflow-x-hidden px-3 md:px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pt-2">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Analytics Dashboard</h1>
                    <p className="text-slate-500 mt-2 font-medium">real-time business insights & performance</p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                    <FiCalendar className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-600">Last 30 Days</span>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-200 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform" style={{ maxWidth: '100%' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FiActivity size={80} /></div>
                    <div className="text-emerald-100 font-medium mb-1 flex items-center gap-2"><FiActivity /> Total Revenue</div>
                    <div className="text-xl sm:text-3xl font-black tracking-tight truncate">₹{overview?.totalRevenue?.toLocaleString('en-IN') || '0'}</div>
                    <div className="mt-4 text-xs font-bold bg-white/20 inline-block px-2 py-1 rounded-lg">Gross Income</div>
                </div>

                <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-6 rounded-2xl shadow-lg shadow-rose-200 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform" style={{ maxWidth: '100%' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FiCreditCard size={80} /></div>
                    <div className="text-rose-100 font-medium mb-1 flex items-center gap-2"><FiCreditCard /> Total Cost</div>
                    <div className="text-xl sm:text-3xl font-black tracking-tight truncate">₹{overview?.totalCost?.toLocaleString('en-IN') || '0'}</div>
                    <div className="mt-4 text-xs font-bold bg-white/20 inline-block px-2 py-1 rounded-lg">Garments & Services</div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-lg shadow-indigo-200 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform" style={{ maxWidth: '100%' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FiTrendingUp size={80} /></div>
                    <div className="text-indigo-100 font-medium mb-1 flex items-center gap-2"><FiTrendingUp /> Net Profit</div>
                    <div className="text-xl sm:text-3xl font-black tracking-tight truncate">₹{overview?.profit?.toLocaleString('en-IN') || '0'}</div>
                    <div className="mt-4 flex flex-col gap-1.5">
                        <div className="text-xs font-bold bg-white/20 inline-block px-2 py-1 rounded-lg w-fit">{overview?.profitMargin?.toFixed(1) || '0'}% Margin</div>
                        <div className="text-[10px] font-bold text-indigo-100/90 leading-tight">
                            + <span className="text-white">₹{overview?.potentialProfit?.toLocaleString('en-IN') || '0'}</span> Uncollected
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl shadow-lg shadow-orange-200 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform" style={{ maxWidth: '100%' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FiShoppingBag size={80} /></div>
                    <div className="text-orange-100 font-medium mb-1 flex items-center gap-2"><FiShoppingBag /> Total Orders</div>
                    <div className="text-xl sm:text-3xl font-black tracking-tight truncate">{overview?.totalOrders || 0}</div>
                    <div className="mt-4 text-xs font-bold bg-white/20 inline-block px-2 py-1 rounded-lg">
                        {overview?.pendingOrders || 0} Pending (₹{overview?.pendingOrderRevenue?.toLocaleString('en-IN') || '0'})
                    </div>
                </div>
            </div>

            {/* Discount Metrics Card */}
            {discountData && discountData.totalDiscounts > 0 && (
                <div className="bg-gradient-to-br from-slate-900 via-stone-900 to-slate-900 p-6 md:p-8 rounded-2xl mb-8 shadow-xl border border-slate-800 relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-2xl -ml-24 -mb-24"></div>

                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                                    <FiTag className="text-orange-500" size={28} />
                                </div>
                                <div>
                                    <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                                        Discount Analysis
                                    </h2>
                                    <p className="text-sm text-slate-400 mt-1 font-medium">Total bill adjustments & discounts given</p>
                                </div>
                            </div>
                            <span className="bg-slate-800 text-slate-300 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
                                {discountData.ordersWithDiscounts} Orders
                            </span>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            <div className="bg-slate-800/50 backdrop-blur-md p-4 md:p-5 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-all">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <FiFileText size={12} className="opacity-70" />
                                    Original Amount
                                </div>
                                <div className="text-xl md:text-2xl font-black text-white">₹{discountData.totalOriginalAmount.toLocaleString('en-IN')}</div>
                            </div>
                            <div className="bg-slate-800/50 backdrop-blur-md p-4 md:p-5 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-all">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <FiTrendingDown size={12} className="opacity-70" />
                                    Total Discounts
                                </div>
                                <div className="text-xl md:text-2xl font-black text-rose-400">-₹{discountData.totalDiscounts.toLocaleString('en-IN')}</div>
                            </div>
                            <div className="bg-slate-800/50 backdrop-blur-md p-4 md:p-5 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-all">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <FiCheckCircle size={12} className="opacity-70" />
                                    Final Revenue
                                </div>
                                <div className="text-xl md:text-2xl font-black text-emerald-400">₹{discountData.totalFinalAmount.toLocaleString('en-IN')}</div>
                            </div>
                            <div className="bg-slate-800/50 backdrop-blur-md p-4 md:p-5 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-all">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <FiPercent size={12} className="opacity-70" />
                                    Avg Discount
                                </div>
                                <div className="text-xl md:text-2xl font-black text-white">{discountData.avgDiscountPercentage}%</div>
                            </div>
                        </div>

                        {/* View Orders Button */}
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={handleToggleDiscountedOrders}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 border border-slate-700 shadow-lg transition-all"
                            >
                                {showDiscountedOrders ? <>
                                    <FiChevronsUp size={18} />
                                    Hide Orders
                                </> : <>
                                    <FiList size={18} />
                                    View Discounted Orders ({discountData.ordersWithDiscounts})
                                </>}
                            </button>
                        </div>

                        {/* Discounted Orders Table */}
                        {showDiscountedOrders && (
                            <div className="mt-6 bg-slate-800/40 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-800/60 border-b border-slate-700/50">
                                            <tr>
                                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Order #</th>
                                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Client</th>
                                                <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Original</th>
                                                <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Final</th>
                                                <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Discount</th>
                                                <th className="text-center px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">%</th>
                                                <th className="text-center px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                                <th className="text-center px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/50">
                                            {discountedOrders.length > 0 ? discountedOrders.map((order) => (
                                                <tr
                                                    key={order.orderId}
                                                    onClick={() => navigate(`/orders/${order.orderId}`)}
                                                    className="hover:bg-slate-800/80 transition-colors cursor-pointer"
                                                >
                                                    <td className="px-4 py-3 text-white font-bold text-sm">#{order.orderNumber}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-white font-medium text-sm">{order.clientName}</div>
                                                        <div className="text-slate-500 text-xs">{order.clientPhone}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-300 font-medium text-sm">₹{order.totalAmount.toLocaleString('en-IN')}</td>
                                                    <td className="px-4 py-3 text-right text-emerald-400 font-bold text-sm">₹{order.finalAmount.toLocaleString('en-IN')}</td>
                                                    <td className="px-4 py-3 text-right text-rose-400 font-bold text-sm">-₹{order.discountAmount.toLocaleString('en-IN')}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="bg-rose-500/10 text-rose-400 px-2 py-1 rounded-lg text-xs font-bold">{order.discountPercentage}%</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${order.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-400' :
                                                            order.status === 'Pending' ? 'bg-amber-500/10 text-amber-400' :
                                                                'bg-indigo-500/10 text-indigo-400'
                                                            }`}>{order.status}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-slate-400 text-xs">{new Date(order.orderDate).toLocaleDateString('en-IN')}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="8" className="px-4 py-8 text-center text-slate-500">Loading orders...</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Revenue Chart */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 mb-8 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><FiTrendingUp className="text-darji-accent" /> Revenue Trends</h2>
                        <p className="text-sm text-slate-500 mt-1">Financial performance over time</p>
                    </div>
                    <div className="bg-slate-50 p-1 rounded-xl border border-slate-200 flex text-sm font-bold">
                        <button onClick={() => setRevenuePeriod('day')} className={`px-4 py-2 rounded-lg transition-all ${revenuePeriod === 'day' ? 'bg-white text-darji-accent shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Daily</button>
                        <button onClick={() => setRevenuePeriod('month')} className={`px-4 py-2 rounded-lg transition-all ${revenuePeriod === 'month' ? 'bg-white text-darji-accent shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Monthly</button>
                        <button onClick={() => setRevenuePeriod('year')} className={`px-4 py-2 rounded-lg transition-all ${revenuePeriod === 'year' ? 'bg-white text-darji-accent shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Yearly</button>
                    </div>
                </div>

                <div className="h-[350px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                                dy={10}
                                minTickGap={30}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                                tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '12px' }}
                                itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                                formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                                labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="#4f46e5"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRv)"
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            {/* Key Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                {/* Order Status Distribution */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><FiPieChart className="text-indigo-500" /> Order Status</h2>
                        <p className="text-sm text-slate-500 mt-1">Distribution by current status</p>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <style>{`
                                    .recharts-surface:focus { outline: none !important; }
                                    .recharts-sector:focus { outline: none !important; }
                                `}</style>
                                <Pie
                                    data={orderStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={105}
                                    paddingAngle={5}
                                    dataKey="value"
                                    cornerRadius={8}
                                    style={{ outline: 'none' }}
                                >
                                    {orderStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} style={{ outline: 'none' }} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                                    formatter={(value, name) => [value + ' Orders', name]}
                                />
                                <Legend
                                    layout="horizontal"
                                    verticalAlign="bottom"
                                    align="center"
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '16px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Garment Types */}
                {/* Top Garment Types */}
                <div className="md:col-span-2 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><FiBarChart2 className="text-emerald-500" /> Top Products</h2>
                        <p className="text-sm text-slate-500 mt-1">Best performing garment types by revenue</p>
                    </div>
                    <div className="flex-1 min-h-[300px] flex flex-col justify-center">
                        {garmentStats && garmentStats.length > 0 ? (
                            <div className="space-y-5">
                                {garmentStats
                                    .sort((a, b) => b.revenue - a.revenue)
                                    .slice(0, 5) // Top 5
                                    .map((garment, index) => {
                                        const maxVal = Math.max(...garmentStats.map(g => g.revenue));
                                        const percentage = Math.round((garment.revenue / maxVal) * 100);

                                        return (
                                            <div key={index} className="relative group">
                                                <div className="flex justify-between items-end mb-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`
                                                            w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border
                                                            ${index === 0 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                index === 1 ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                                                    index === 2 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                                        'bg-slate-50 text-slate-500 border-slate-100'}
                                                        `}>
                                                            {index + 1}
                                                        </div>
                                                        <span className="font-bold text-slate-700 text-sm">{garment.garmentType}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold text-slate-900 text-sm block">₹{(garment.revenue || 0).toLocaleString('en-IN')}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">{garment.quantity} sold</span>
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${index === 0 ? 'bg-emerald-500' : 'bg-emerald-400/70'
                                                            }`}
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                                <div className="p-3 bg-slate-50 rounded-full mb-2">
                                    <FiActivity size={20} className="opacity-50" />
                                </div>
                                No product data available
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* Detailed Stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900">Performance Breakdown</h2>
                    <p className="text-sm text-slate-500 mt-1">Detailed metrics per garment category</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Garment Type</th>
                                <th className="text-center py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Orders</th>
                                <th className="text-center py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty Sold</th>
                                <th className="text-right py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {garmentStats.map((stat, index) => (
                                <tr key={index} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="py-4 px-6 font-bold text-slate-800">{stat.garmentType}</td>
                                    <td className="text-center py-4 px-6 text-slate-600 font-medium">
                                        <span className="bg-slate-100 px-2 py-1 rounded-md text-xs font-bold">{stat.orders}</span>
                                    </td>
                                    <td className="text-center py-4 px-6 text-slate-600">{stat.quantity}</td>
                                    <td className="text-right py-4 px-6 font-bold text-emerald-600">₹{(stat.revenue || 0).toLocaleString('en-IN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}
