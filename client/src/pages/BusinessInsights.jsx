import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { FiUsers, FiTrendingUp, FiCreditCard, FiAlertCircle, FiAward, FiBarChart2, FiRefreshCw, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

export default function BusinessInsights() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [customerInsights, setCustomerInsights] = useState(null);
    const [profitability, setProfitability] = useState(null);

    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        setLoading(true);
        setError(null);
        try {
            // Use backend analytics APIs
            const [clientsRes, garmentsRes, profitRes] = await Promise.all([
                api.get('/analytics/clients'),
                api.get('/analytics/garments'),
                api.get('/analytics/profit')
            ]);

            // Customer Insights from API
            const clientData = clientsRes.data;
            const totalClients = clientData.length;
            const activeClients = clientData.filter(c => c.orderCount > 0).length;
            const repeatClients = clientData.filter(c => c.orderCount > 1).length;
            const repeatCustomerRate = totalClients > 0 ? ((repeatClients / totalClients) * 100).toFixed(1) : 0;
            const totalRevenue = clientData.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
            const avgLifetimeValue = activeClients > 0 ? (totalRevenue / activeClients).toFixed(0) : 0;
            const totalOrders = clientData.reduce((acc, c) => acc + c.orderCount, 0);
            const avgOrdersPerCustomer = activeClients > 0 ? (totalOrders / activeClients).toFixed(1) : 0;

            const topCustomers = [...clientData]
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .slice(0, 10)
                .map(c => ({
                    clientId: c._id,
                    name: c.name || 'Unknown',
                    orders: c.orderCount,
                    lifetimeValue: c.totalSpent || 0
                }));

            // Inactive clients (60+ days since last order)
            const today = new Date();
            const inactiveTimestamp = new Date();
            inactiveTimestamp.setDate(today.getDate() - 60);

            const inactiveClients = clientData
                .filter(c => {
                    if (!c.lastOrderDate || c.orderCount === 0) return false;
                    const lastOrder = new Date(c.lastOrderDate);
                    return lastOrder < inactiveTimestamp;
                })
                .map(c => {
                    const lastOrder = new Date(c.lastOrderDate);
                    return {
                        clientId: c._id,
                        name: c.name || 'Unknown',
                        orders: c.orderCount,
                        lifetimeValue: c.totalSpent || 0,
                        lastOrderDate: lastOrder,
                        daysSinceLastOrder: Math.floor((today - lastOrder) / (1000 * 60 * 60 * 24))
                    };
                })
                .sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder)
                .slice(0, 50);

            setCustomerInsights({
                summary: {
                    totalClients,
                    repeatCustomerRate,
                    avgOrdersPerCustomer,
                    avgLifetimeValue
                },
                topCustomers,
                inactiveClients
            });

            // Profitability Analysis from API
            const garmentData = garmentsRes.data;
            const garmentArray = garmentData.map(g => {
                const totalRevenue = g.totalRevenue || 0;
                const totalCost = g.totalCost || 0;
                const totalProfit = totalRevenue - totalCost;
                const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
                const avgPrice = g.totalQuantity > 0 ? (totalRevenue / g.totalQuantity).toFixed(0) : 0;
                const unitCost = g.totalQuantity > 0 ? totalCost / g.totalQuantity : 0;
                const recommendedPrice = unitCost > 0 ? Math.ceil((unitCost / (1 - 0.40)) / 50) * 50 : 0;

                return {
                    garmentId: g._id,
                    name: g.name,
                    totalSold: g.totalQuantity,
                    totalRevenue,
                    totalCost,
                    totalProfit,
                    profitMargin,
                    avgPrice,
                    recommendedPrice
                };
            });

            // Use authoritative stats from /profit endpoint for consistency with Analytics Dashboard
            const { totalRevenue: overallRevenue, totalCost: overallCost, profit: overallProfit, profitMargin: overallMargin } = profitRes.data;

            const mostProfitableByMargin = [...garmentArray].sort((a, b) => b.profitMargin - a.profitMargin).slice(0, 5);
            const lowMarginItems = garmentArray.filter(g => g.profitMargin < 30).slice(0, 10);
            const allGarments = [...garmentArray].sort((a, b) => b.totalProfit - a.totalProfit);

            setProfitability({
                summary: {
                    totalRevenue: overallRevenue,
                    totalCost: overallCost,
                    totalProfit: overallProfit,
                    averageMargin: overallMargin
                },
                mostProfitableByMargin,
                lowMarginItems,
                allGarments
            });

        } catch (error) {
            console.error('Error fetching insights:', error);
            setError('Failed to load business insights. Please try refreshing.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-darji-accent mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading insights...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-100 max-w-md">
                    <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h3>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={fetchInsights}
                        className="bg-red-500 text-white px-6 py-2 rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center gap-2 mx-auto"
                    >
                        <FiRefreshCw />
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!customerInsights || !profitability) return null;

    return (
        <div className="fade-in w-full max-w-full mx-auto pb-6 md:pb-0 overflow-x-hidden px-3 md:px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-xl md:text-4xl font-black text-gray-900 tracking-tight">
                        Business Insights
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Customer analytics & profitability analysis</p>
                </div>
                <button
                    onClick={fetchInsights}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-darji-accent text-white rounded-xl hover:bg-blue-600 font-bold shadow-md hover:shadow-lg transition-all active:scale-95 w-full md:w-auto"
                >
                    <FiRefreshCw size={18} />
                    Refresh
                </button>
            </div>

            {/* Customer Insights Section */}
            {customerInsights && (
                <div className="mb-12">
                    <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                        <FiUsers className="text-darji-accent" size={28} />
                        Customer Insights
                    </h2>

                    {/* Key Metrics - Responsive Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 md:p-6 text-white shadow-sm min-w-0 w-full" style={{ maxWidth: '100%' }}>
                            <div className="flex items-center justify-between mb-1.5 md:mb-2">
                                <FiUsers size={16} className="opacity-80" />
                                <span className="text-[9px] md:text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">Total</span>
                            </div>
                            <h3 className="text-lg md:text-4xl font-black mb-0.5 truncate text-white">{customerInsights.summary.totalClients}</h3>
                            <p className="text-[10px] md:text-sm opacity-90 font-medium truncate">Clients</p>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 md:p-6 text-white shadow-sm min-w-0 w-full" style={{ maxWidth: '100%' }}>
                            <div className="flex items-center justify-between mb-1.5 md:mb-2">
                                <FiTrendingUp size={16} className="opacity-80" />
                                <span className="text-[9px] md:text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">Rate</span>
                            </div>
                            <h3 className="text-lg md:text-4xl font-black mb-0.5 truncate text-white">{customerInsights.summary.repeatCustomerRate}%</h3>
                            <p className="text-[10px] md:text-sm opacity-90 font-medium truncate">Repeat</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 md:p-6 text-white shadow-sm min-w-0 w-full" style={{ maxWidth: '100%' }}>
                            <div className="flex items-center justify-between mb-1.5 md:mb-2">
                                <FiBarChart2 size={16} className="opacity-80" />
                                <span className="text-[9px] md:text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">Avg</span>
                            </div>
                            <h3 className="text-lg md:text-4xl font-black mb-0.5 truncate text-white">{customerInsights.summary.avgOrdersPerCustomer}</h3>
                            <p className="text-[10px] md:text-sm opacity-90 font-medium truncate">Orders</p>
                        </div>

                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-3 md:p-6 text-white shadow-sm min-w-0 w-full" style={{ maxWidth: '100%' }}>
                            <div className="flex items-center justify-between mb-1.5 md:mb-2">
                                <FiCreditCard size={16} className="opacity-80" />
                                <span className="text-[9px] md:text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">LTV</span>
                            </div>
                            <h3 className="text-lg md:text-4xl font-black mb-0.5 truncate text-white">₹{parseFloat(customerInsights.summary.avgLifetimeValue).toFixed(0)}</h3>
                            <p className="text-[10px] md:text-sm opacity-90 font-medium truncate">Value</p>
                        </div>
                    </div>

                    {/* Top Customers & Inactive Alerts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
                        {/* Top Customers */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-6 overflow-hidden">
                            <div className="flex items-center gap-2 mb-4">
                                <FiAward className="text-yellow-500" size={24} />
                                <h3 className="text-xl font-black text-gray-900">Top 10 Customers</h3>
                            </div>
                            <div className="space-y-3">
                                {customerInsights.topCustomers.length > 0 ? (
                                    customerInsights.topCustomers.map((customer, index) => (
                                        <div key={customer.clientId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${index === 0 ? 'bg-yellow-500 text-white' :
                                                index === 1 ? 'bg-gray-400 text-white' :
                                                    index === 2 ? 'bg-orange-600 text-white' :
                                                        'bg-gray-200 text-gray-600'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 truncate">{customer.name}</p>
                                                <p className="text-xs text-gray-500">{customer.orders} orders</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-black text-green-600">₹{customer.lifetimeValue.toFixed(0)}</p>
                                                <p className="text-xs text-gray-500">LTV</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-4">No customer data available yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Inactive Customers */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 overflow-hidden">
                            <div className="flex items-center gap-2 mb-4">
                                <FiAlertCircle className="text-red-500" size={24} />
                                <h3 className="text-xl font-black text-gray-900">Inactive Customers (60+ days)</h3>
                            </div>
                            {customerInsights.inactiveClients.length === 0 ? (
                                <div className="text-center py-8">
                                    <FiCheckCircle className="mx-auto text-green-500 mb-2" size={32} />
                                    <p className="text-gray-500 font-medium">No inactive customers found!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {customerInsights.inactiveClients.map((customer) => (
                                        <div key={customer.clientId} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 truncate">{customer.name}</p>
                                                <p className="text-xs text-gray-600">Last order: {customer.daysSinceLastOrder} days ago</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-black text-red-600">{customer.daysSinceLastOrder}d</p>
                                                <p className="text-xs text-gray-500">₹{customer.lifetimeValue.toFixed(0)} LTV</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Profit Margin Analysis Section */}
            {profitability && (
                <div>
                    <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                        <FiCreditCard className="text-green-600" size={24} />
                        Profit Margin Analysis
                    </h2>

                    {/* Overall Metrics - Responsive Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 md:p-6 min-w-0">
                            <p className="text-[10px] md:text-sm text-gray-500 font-bold mb-1 md:mb-2 truncate">Revenue</p>
                            <h3 className="text-base md:text-3xl font-black text-gray-900 truncate">₹{parseFloat(profitability.summary.totalRevenue).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 md:p-6 min-w-0">
                            <p className="text-[10px] md:text-sm text-gray-500 font-bold mb-1 md:mb-2 truncate">Cost</p>
                            <h3 className="text-base md:text-3xl font-black text-red-600 truncate">₹{parseFloat(profitability.summary.totalCost).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 md:p-6 min-w-0">
                            <p className="text-[10px] md:text-sm text-gray-500 font-bold mb-1 md:mb-2 truncate">Profit</p>
                            <h3 className="text-base md:text-3xl font-black text-green-600 truncate">₹{parseFloat(profitability.summary.totalProfit).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 md:p-6 min-w-0">
                            <p className="text-[10px] md:text-sm text-gray-500 font-bold mb-1 md:mb-2 truncate">Margin</p>
                            <h3 className="text-base md:text-3xl font-black text-blue-600 truncate">{profitability.summary.averageMargin}%</h3>
                        </div>
                    </div>

                    {/* Most Profitable & Low Margin Items */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6 mb-6 md:mb-8">
                        {/* Most Profitable by Margin */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 md:p-6 overflow-hidden">
                            <h3 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                                <FiAward className="text-green-600" size={20} /> Highest Profit Margin
                            </h3>
                            <div className="space-y-3">
                                {profitability.mostProfitableByMargin.length > 0 ? (
                                    profitability.mostProfitableByMargin.map((item, index) => (
                                        <div key={item.garmentId} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                                            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 truncate">{item.name}</p>
                                                <p className="text-xs text-gray-600">{item.totalSold.toFixed(0)} units sold</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-black text-green-600">{item.profitMargin}%</p>
                                                <p className="text-xs text-gray-500">₹{parseFloat(item.totalProfit).toFixed(0)}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-4">No data available.</p>
                                )}
                            </div>
                        </div>

                        {/* Low Margin Items */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 md:p-6 overflow-hidden">
                            <h3 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                                <FiAlertTriangle className="text-red-500" size={20} /> Low Margin Items (&lt;30%)
                            </h3>
                            {profitability.lowMarginItems.length === 0 ? (
                                <div className="text-center py-8">
                                    <FiCheckCircle className="mx-auto text-green-500 mb-2" size={32} />
                                    <p className="text-gray-500 font-medium">All items have healthy margins!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {profitability.lowMarginItems.map((item) => (
                                        <div key={item.garmentId} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 truncate">{item.name}</p>
                                                <p className="text-xs text-gray-600">Current: ₹{item.avgPrice} → Suggested: ₹{item.recommendedPrice}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-black text-red-600">{item.profitMargin}%</p>
                                                <p className="text-xs text-gray-500">margin</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* All Garments Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 md:p-6 overflow-hidden">
                        <h3 className="text-lg md:text-xl font-black text-gray-900 mb-3 md:mb-4">All Garment Profitability</h3>
                        <div className="overflow-x-auto w-full">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-200">
                                        <th className="text-left py-3 px-4 font-bold text-gray-700 text-sm">Garment</th>
                                        <th className="text-right py-3 px-4 font-bold text-gray-700 text-sm">Sold</th>
                                        <th className="text-right py-3 px-4 font-bold text-gray-700 text-sm">Revenue</th>
                                        <th className="text-right py-3 px-4 font-bold text-gray-700 text-sm">Cost</th>
                                        <th className="text-right py-3 px-4 font-bold text-gray-700 text-sm">Profit</th>
                                        <th className="text-right py-3 px-4 font-bold text-gray-700 text-sm">Margin</th>
                                        <th className="text-right py-3 px-4 font-bold text-gray-700 text-sm">Recommended Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profitability.allGarments.map((item) => (
                                        <tr key={item.garmentId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 font-bold text-gray-900">{item.name}</td>
                                            <td className="py-3 px-4 text-right text-gray-600">{item.totalSold}</td>
                                            <td className="py-3 px-4 text-right font-bold text-gray-900">₹{parseFloat(item.totalRevenue).toFixed(0)}</td>
                                            <td className="py-3 px-4 text-right text-red-600">₹{parseFloat(item.totalCost).toFixed(0)}</td>
                                            <td className="py-3 px-4 text-right font-bold text-green-600">₹{parseFloat(item.totalProfit).toFixed(0)}</td>
                                            <td className={`py-3 px-4 text-right font-black ${parseFloat(item.profitMargin) >= 40 ? 'text-green-600' :
                                                parseFloat(item.profitMargin) >= 30 ? 'text-yellow-600' :
                                                    'text-red-600'
                                                }`}>
                                                {item.profitMargin}%
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className="font-bold text-blue-600">₹{item.recommendedPrice}</span>
                                                {parseFloat(item.recommendedPrice) > parseFloat(item.avgPrice) && (
                                                    <span className="ml-2 text-xs text-gray-500">
                                                        (+₹{(parseFloat(item.recommendedPrice) - parseFloat(item.avgPrice)).toFixed(0)})
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
