import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { FiUsers, FiTrendingUp, FiDollarSign, FiAlertCircle, FiAward, FiBarChart2, FiRefreshCw } from 'react-icons/fi';

export default function BusinessInsights() {
    const [loading, setLoading] = useState(true);
    const [customerInsights, setCustomerInsights] = useState(null);
    const [profitability, setProfitability] = useState(null);

    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        setLoading(true);
        try {
            const [customerRes, profitRes] = await Promise.all([
                api.get('/analytics/customer-insights'),
                api.get('/analytics/garment-profitability')
            ]);
            setCustomerInsights(customerRes.data);
            setProfitability(profitRes.data);
        } catch (error) {
            console.error('Error fetching insights:', error);
            alert('Error loading insights: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-darji-accent mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading insights...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in max-w-7xl mx-auto pb-20 md:pb-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                        Business Insights
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Customer analytics & profitability analysis</p>
                </div>
                <button
                    onClick={fetchInsights}
                    className="flex items-center gap-2 px-6 py-3 bg-darji-accent text-white rounded-xl hover:bg-blue-600 font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                    <FiRefreshCw size={18} />
                    Refresh Data
                </button>
            </div>

            {/* Customer Insights Section */}
            {customerInsights && (
                <div className="mb-12">
                    <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                        <FiUsers className="text-darji-accent" size={28} />
                        Customer Insights
                    </h2>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-2">
                                <FiUsers size={24} className="opacity-80" />
                                <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">Total</span>
                            </div>
                            <h3 className="text-4xl font-black mb-1">{customerInsights.summary.totalClients}</h3>
                            <p className="text-sm opacity-90 font-medium">Total Clients</p>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-2">
                                <FiTrendingUp size={24} className="opacity-80" />
                                <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">Rate</span>
                            </div>
                            <h3 className="text-4xl font-black mb-1">{customerInsights.summary.repeatCustomerRate}%</h3>
                            <p className="text-sm opacity-90 font-medium">Repeat Customer Rate</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-2">
                                <FiBarChart2 size={24} className="opacity-80" />
                                <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">Avg</span>
                            </div>
                            <h3 className="text-4xl font-black mb-1">{customerInsights.summary.avgOrdersPerCustomer}</h3>
                            <p className="text-sm opacity-90 font-medium">Orders per Customer</p>
                        </div>

                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-2">
                                <FiDollarSign size={24} className="opacity-80" />
                                <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">LTV</span>
                            </div>
                            <h3 className="text-4xl font-black mb-1">₹{parseFloat(customerInsights.summary.avgLifetimeValue).toFixed(0)}</h3>
                            <p className="text-sm opacity-90 font-medium">Avg Lifetime Value</p>
                        </div>
                    </div>

                    {/* Top Customers & Inactive Alerts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Customers */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <FiAward className="text-yellow-500" size={24} />
                                <h3 className="text-xl font-black text-gray-900">Top 10 Customers</h3>
                            </div>
                            <div className="space-y-3">
                                {customerInsights.topCustomers.slice(0, 10).map((customer, index) => (
                                    <div key={customer.clientId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-yellow-500 text-white' :
                                            index === 1 ? 'bg-gray-400 text-white' :
                                                index === 2 ? 'bg-orange-600 text-white' :
                                                    'bg-gray-200 text-gray-600'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">{customer.name}</p>
                                            <p className="text-xs text-gray-500">{customer.orders} orders</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-green-600">₹{customer.lifetimeValue.toFixed(0)}</p>
                                            <p className="text-xs text-gray-500">LTV</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Inactive Customers */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <FiAlertCircle className="text-red-500" size={24} />
                                <h3 className="text-xl font-black text-gray-900">Inactive Customers (60+ days)</h3>
                            </div>
                            {customerInsights.inactiveClients.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 font-medium">🎉 No inactive customers!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {customerInsights.inactiveClients.slice(0, 10).map((customer) => (
                                        <div key={customer.clientId} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900">{customer.name}</p>
                                                <p className="text-xs text-gray-600">Last order: {customer.daysSinceLastOrder} days ago</p>
                                            </div>
                                            <div className="text-right">
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
                    <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                        <FiDollarSign className="text-green-600" size={28} />
                        Profit Margin Analysis
                    </h2>

                    {/* Overall Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <p className="text-sm text-gray-500 font-bold mb-2">Total Revenue</p>
                            <h3 className="text-3xl font-black text-gray-900">₹{parseFloat(profitability.summary.totalRevenue).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <p className="text-sm text-gray-500 font-bold mb-2">Total Cost</p>
                            <h3 className="text-3xl font-black text-red-600">₹{parseFloat(profitability.summary.totalCost).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <p className="text-sm text-gray-500 font-bold mb-2">Total Profit</p>
                            <h3 className="text-3xl font-black text-green-600">₹{parseFloat(profitability.summary.totalProfit).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <p className="text-sm text-gray-500 font-bold mb-2">Average Margin</p>
                            <h3 className="text-3xl font-black text-blue-600">{profitability.summary.averageMargin}%</h3>
                        </div>
                    </div>

                    {/* Most Profitable & Low Margin Items */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Most Profitable by Margin */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-green-600">🏆</span> Highest Profit Margin
                            </h3>
                            <div className="space-y-3">
                                {profitability.mostProfitableByMargin.map((item, index) => (
                                    <div key={item.garmentId} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                                        <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-black text-sm">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">{item.name}</p>
                                            <p className="text-xs text-gray-600">{item.totalSold} units sold</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-green-600">{item.profitMargin}%</p>
                                            <p className="text-xs text-gray-500">₹{parseFloat(item.totalProfit).toFixed(0)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Low Margin Items */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-red-600">⚠️</span> Low Margin Items (&lt;30%)
                            </h3>
                            {profitability.lowMarginItems.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 font-medium">✅ All items have healthy margins!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {profitability.lowMarginItems.slice(0, 5).map((item) => (
                                        <div key={item.garmentId} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900">{item.name}</p>
                                                <p className="text-xs text-gray-600">Current: ₹{item.avgPrice} → Suggested: ₹{item.recommendedPrice}</p>
                                            </div>
                                            <div className="text-right">
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
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-xl font-black text-gray-900 mb-4">All Garment Profitability</h3>
                        <div className="overflow-x-auto">
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

            {/* Empty State when no data */}
            {!loading && (!customerInsights || !profitability) && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="max-w-md mx-auto">
                        <FiBarChart2 className="mx-auto text-gray-300 mb-4" size={64} />
                        <h3 className="text-2xl font-black text-gray-900 mb-2">No Data Available</h3>
                        <p className="text-gray-600 mb-6">
                            Business Insights requires completed orders and customer data.
                        </p>
                        <div className="space-y-2 text-left bg-blue-50 rounded-xl p-4 mb-4">
                            <p className="text-sm font-bold text-gray-700">To see insights:</p>
                            <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                                <li>Add some clients</li>
                                <li>Create orders with garment items</li>
                                <li>Mark orders as "Delivered"</li>
                            </ul>
                        </div>
                        <button
                            onClick={() => window.location.href = '/new-order'}
                            className="px-6 py-3 bg-darji-accent text-white rounded-xl hover:bg-blue-600 font-bold transition-all"
                        >
                            Create Your First Order
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
