import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { FiTrendingUp, FiUsers, FiShoppingBag, FiClock, FiActivity, FiDollarSign, FiCalendar, FiPieChart, FiBarChart2 } from 'react-icons/fi';

export default function Analytics() {
    const [overview, setOverview] = useState(null);
    const [revenueData, setRevenueData] = useState([]);
    const [garmentStats, setGarmentStats] = useState([]);
    const [orderStats, setOrderStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [revenuePeriod, setRevenuePeriod] = useState('month');

    useEffect(() => {
        fetchAnalytics();
    }, [revenuePeriod]);

    const fetchAnalytics = async () => {
        try {
            const [overviewRes, revenueRes, ordersRes, garmentsRes] = await Promise.all([
                api.get('/analytics/overview'),
                api.get(`/analytics/revenue?period=${revenuePeriod}`),
                api.get('/analytics/orders'),
                api.get('/analytics/garments')
            ]);

            setOverview(overviewRes.data);
            setRevenueData(revenueRes.data);
            setOrderStats(ordersRes.data.map(item => ({
                status: item.status,
                count: item._count
            })));
            setGarmentStats(garmentsRes.data.slice(0, 5)); // Top 5
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-12">Loading analytics...</div>;
    }

    const COLORS = ['#3498DB', '#E74C3C', '#F39C12', '#27AE60', '#9B59B6'];

    return (
        <div className="fade-in max-w-7xl mx-auto pb-20 md:pb-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pt-2">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Analytics Dashboard</h1>
                    <p className="text-gray-500 mt-2 font-medium">real-time business insights & performance</p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                    <FiCalendar className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-600">Last 30 Days</span>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-200 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FiActivity size={80} /></div>
                    <div className="text-emerald-100 font-medium mb-1 flex items-center gap-2"><FiActivity /> Total Revenue</div>
                    <div className="text-4xl font-black tracking-tight">₹{overview?.totalRevenue?.toLocaleString('en-IN') || '0'}</div>
                    <div className="mt-4 text-xs font-bold bg-white/20 inline-block px-2 py-1 rounded-lg">Gross Income</div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-2xl shadow-lg shadow-red-200 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FiDollarSign size={80} /></div>
                    <div className="text-red-100 font-medium mb-1 flex items-center gap-2"><FiDollarSign /> Total Cost</div>
                    <div className="text-4xl font-black tracking-tight">₹{overview?.totalCost?.toLocaleString('en-IN') || '0'}</div>
                    <div className="mt-4 text-xs font-bold bg-white/20 inline-block px-2 py-1 rounded-lg">Garments & Services</div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-violet-600 p-6 rounded-2xl shadow-lg shadow-blue-200 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FiTrendingUp size={80} /></div>
                    <div className="text-blue-100 font-medium mb-1 flex items-center gap-2"><FiTrendingUp /> Net Profit</div>
                    <div className="text-4xl font-black tracking-tight">₹{overview?.profit?.toLocaleString('en-IN') || '0'}</div>
                    <div className="mt-4 text-xs font-bold bg-white/20 inline-block px-2 py-1 rounded-lg">{overview?.profitMargin?.toFixed(1) || '0'}% Margin</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl shadow-lg shadow-orange-200 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FiShoppingBag size={80} /></div>
                    <div className="text-orange-100 font-medium mb-1 flex items-center gap-2"><FiShoppingBag /> Total Orders</div>
                    <div className="text-4xl font-black tracking-tight">{overview?.totalOrders || 0}</div>
                    <div className="mt-4 text-xs font-bold bg-white/20 inline-block px-2 py-1 rounded-lg">{overview?.pendingOrders || 0} Pending</div>
                </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><FiTrendingUp className="text-darji-accent" /> Revenue Trends</h2>
                        <p className="text-sm text-gray-500 mt-1">Financial performance over time</p>
                    </div>
                    <div className="bg-gray-50 p-1 rounded-xl border border-gray-200 flex text-sm font-bold">
                        <button onClick={() => setRevenuePeriod('day')} className={`px-4 py-2 rounded-lg transition-all ${revenuePeriod === 'day' ? 'bg-white text-darji-accent shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Daily</button>
                        <button onClick={() => setRevenuePeriod('month')} className={`px-4 py-2 rounded-lg transition-all ${revenuePeriod === 'month' ? 'bg-white text-darji-accent shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Monthly</button>
                        <button onClick={() => setRevenuePeriod('year')} className={`px-4 py-2 rounded-lg transition-all ${revenuePeriod === 'year' ? 'bg-white text-darji-accent shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Yearly</button>
                    </div>
                </div>

                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData}>
                            <defs>
                                <linearGradient id="colorRv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(value) => `₹${value / 1000}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                            />
                            <Area type="monotone" dataKey="amount" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorRv)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Order Status Distribution */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><FiPieChart className="text-purple-500" /> Order Status</h2>
                        <p className="text-sm text-gray-500 mt-1">Distribution by current status</p>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={orderStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="count"
                                >
                                    {orderStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ right: 0 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Garment Types */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><FiBarChart2 className="text-emerald-500" /> Top Products</h2>
                        <p className="text-sm text-gray-500 mt-1">Best performing garment types</p>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={garmentStats} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="garmentType" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 12, fill: '#4B5563', fontWeight: 600 }} />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                                />
                                <Bar dataKey="revenue" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Performance Breakdown</h2>
                    <p className="text-sm text-gray-500 mt-1">Detailed metrics per garment category</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Garment Type</th>
                                <th className="text-center py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Orders</th>
                                <th className="text-center py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Qty Sold</th>
                                <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Total Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {garmentStats.map((stat, index) => (
                                <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="py-4 px-6 font-bold text-gray-800">{stat.garmentType}</td>
                                    <td className="text-center py-4 px-6 text-gray-600 font-medium">
                                        <span className="bg-gray-100 px-2 py-1 rounded-md text-xs font-bold">{stat.orders}</span>
                                    </td>
                                    <td className="text-center py-4 px-6 text-gray-600">{stat.quantity}</td>
                                    <td className="text-right py-4 px-6 font-bold text-green-600">₹{stat.revenue.toLocaleString('en-IN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
