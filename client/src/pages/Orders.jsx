import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import {
    FiEye, FiFilter, FiTrash2, FiX, FiDownload, FiCheckCircle,
    FiPlus, FiPackage, FiSearch, FiClock, FiActivity, FiArrowRight
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

export default function Orders() {
    const { showToast } = useToast();
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const clientFilter = searchParams.get('client');
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    // Simplistic advanced filter toggle for now (expand later if needed)
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        filterOrders();
    }, [orders, statusFilter, searchQuery, clientFilter]);

    const fetchOrders = async () => {
        try {
            const response = await api.get('/orders', { params: { limit: 1000 } });
            setOrders(response.data.orders || []);
        } catch (error) {
            showToast('Failed to load orders', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filterOrders = () => {
        let filtered = orders;
        if (clientFilter) filtered = filtered.filter(o => (o.client?._id || o.client?.id) === clientFilter);
        if (statusFilter !== 'all') filtered = filtered.filter(o => o.status === statusFilter);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(o =>
                o.orderNumber?.toLowerCase().includes(q) ||
                o.client?.name?.toLowerCase().includes(q)
            );
        }
        setFilteredOrders(filtered);
    };

    const handleDelete = async (orderId) => {
        if (!confirm('Are you sure? This deletes the invoice too.')) return;
        try {
            await api.delete(`/orders/${orderId}`);
            setOrders(prev => prev.filter(o => o.id !== orderId && o._id !== orderId));
            showToast('Order created deleted', 'success');
        } catch (error) {
            showToast('Failed to delete', 'error');
        }
    };

    // Bulk Logic (simplified for brevity, matching existing)
    const handleSelectAll = (e) => setSelectedOrders(e.target.checked ? filteredOrders.map(o => o._id || o.id) : []);
    const handleSelectOrder = (id) => setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedOrders.length} orders?`)) return;
        setBulkActionLoading(true);
        try {
            await Promise.all(selectedOrders.map(id => api.delete(`/orders/${id}`)));
            setOrders(prev => prev.filter(o => !selectedOrders.includes(o._id || o.id)));
            setSelectedOrders([]);
            showToast('Bulk delete successful', 'success');
        } catch (error) {
            showToast('Bulk delete failed', 'error');
        } finally {
            setBulkActionLoading(false);
        }
    };

    // Dashboard-aligned Status Styles (Bordered Pills)
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100 border';
            case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-100 border';
            case 'Trial': return 'bg-indigo-50 text-indigo-700 border-indigo-100 border';
            case 'Delivered': return 'bg-slate-50 text-slate-600 border-slate-100 border';
            default: return 'bg-slate-50 text-slate-500 border-slate-100 border';
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center py-32">
            <div className="relative">
                <div className="w-12 h-12 border-4 border-slate-100 rounded-full"></div>
                <div className="w-12 h-12 border-4 border-darji-accent border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-full mx-auto pb-6 md:pb-0 overflow-x-hidden px-3 md:px-0 space-y-8 animate-fade-in ">
            {/* Header Section - Matches Dashboard */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Orders</h1>
                    <p className="text-slate-500 font-medium tracking-wide text-xs mt-2 uppercase">Manage your atelier's pipeline</p>
                </div>

                <Link
                    to="/new-order"
                    className="btn-primary flex items-center gap-2 shadow-lg shadow-darji-primary/20 self-start md:self-auto"
                >
                    <span className="text-lg font-light">+</span> <span>New Order</span>
                </Link>
            </div>

            {/* Floating Controls Bar */}
            <div className="sticky top-4 z-30 p-2 bg-white/90 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg ring-1 ring-black/5 flex flex-col md:flex-row gap-4 transition-all duration-300 hover:shadow-xl hover:bg-white/95 items-center">

                {/* Search Input */}
                <div className="relative flex-1 w-full md:w-auto group">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-darji-accent transition-colors" />
                    <input
                        type="text"
                        placeholder="Search client, order #..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-transparent border-0 focus:ring-0 text-sm font-semibold text-slate-800 placeholder:text-slate-400 transition-all"
                    />
                </div>

                <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

                {/* Filter Tabs - Matches Dashboard Pills */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full md:w-auto px-1 max-w-[90vw] md:max-w-none">
                    {['all', 'Pending', 'Trial', 'Completed', 'Delivered'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 whitespace-nowrap border ${statusFilter === status
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105'
                                : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                                }`}
                        >
                            {status === 'all' ? 'All' : status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Active Filters & Bulk Actions */}
            {(clientFilter || selectedOrders.length > 0) && (
                <div className="flex items-center gap-4 animate-fade-in-up px-1">
                    {clientFilter && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Filtered by Client</span>
                            <button onClick={() => setSearchParams({})} className="ml-1 text-indigo-400 hover:text-indigo-600"><FiX size={14} /></button>
                        </div>
                    )}

                    {selectedOrders.length > 0 && (
                        <div className="flex items-center gap-3 bg-slate-800 text-white px-4 py-2 rounded-xl shadow-lg shadow-slate-900/10">
                            <span className="text-xs font-bold">{selectedOrders.length} Selected</span>
                            <div className="h-3 w-px bg-white/20"></div>
                            <button
                                onClick={handleBulkDelete}
                                disabled={bulkActionLoading}
                                className="flex items-center gap-1 hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-wide"
                            >
                                <FiTrash2 size={12} /> <span>Delete</span>
                            </button>
                            <button onClick={() => setSelectedOrders([])} className="hover:text-slate-300 ml-1"><FiX size={14} /></button>
                        </div>
                    )}
                </div>
            )}


            {/* Main Content List - Matches Dashboard Recent Activity Style */}
            <div className="card-premium overflow-hidden hidden md:block">
                <table className="w-full">
                    <thead className="bg-slate-50/80 border-b border-slate-100">
                        <tr>
                            <th className="pl-6 py-4 text-left w-12">
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                                    className="rounded border-slate-300 text-darji-accent focus:ring-darji-accent w-4 h-4 cursor-pointer bg-white"
                                />
                            </th>
                            <th className="py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">Order Info</th>
                            <th className="py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Client Details</th>
                            <th className="py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Timeline</th>
                            <th className="py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider pr-8">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="py-24 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-300">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                            <FiPackage className="w-8 h-8 opacity-50" />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-600">No orders found</p>
                                        <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map(order => (
                                <tr
                                    key={order._id || order.id}
                                    className={`
                                        group transition-all duration-200 hover:bg-slate-50/80
                                        ${selectedOrders.includes(order._id || order.id) ? 'bg-indigo-50/30' : ''}
                                    `}
                                >
                                    <td className="pl-6 py-5 align-middle">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.includes(order._id || order.id)}
                                            onChange={() => handleSelectOrder(order._id || order.id)}
                                            className="rounded border-slate-300 text-darji-accent focus:ring-darji-accent w-4 h-4 cursor-pointer bg-white"
                                        />
                                    </td>

                                    <td className="py-5 pl-2 align-middle">
                                        <Link to={`/orders/${order._id || order.id}`} className="block">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-all border border-transparent group-hover:border-slate-200 group-hover:bg-white group-hover:shadow-md
                                                    ${order.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                                                        order.status === 'Pending' ? 'bg-amber-100 text-amber-600' :
                                                            'bg-slate-100 text-slate-500'}`}>
                                                    #{order.orderNumber.slice(-3)}
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-slate-900 text-sm">#{order.orderNumber}</span>
                                                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">{order.items?.length || 0} Items</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </td>

                                    <td className="py-5 align-middle">
                                        <Link to={`/orders/${order._id || order.id}`} className="block group/client">
                                            <div className="font-bold text-slate-800 text-sm group-hover:text-darji-accent transition-colors">
                                                {order.client?.name}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1 group-hover/client:text-slate-700">
                                                {order.client?.phone}
                                            </div>
                                        </Link>
                                    </td>

                                    <td className="py-5 align-middle">
                                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide shadow-sm ${getStatusStyle(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </td>

                                    <td className="py-5 text-right align-middle">
                                        <div className="flex flex-col items-end">
                                            {order.status === 'Pending' || order.status === 'Trial' ? (
                                                <>
                                                    <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                                                        <FiClock className="text-darji-accent w-3 h-3" />
                                                        {order.trialDate ? new Date(order.trialDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Trial Date</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
                                                        <FiCheckCircle className="w-3 h-3" />
                                                        {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Delivered</span>
                                                </>
                                            )}
                                        </div>
                                    </td>

                                    <td className="py-5 pr-8 text-right align-middle">
                                        <div className="flex items-center justify-end gap-5">
                                            <div className="text-right">
                                                <div className="font-bold text-slate-900 text-sm">₹{(order.totalAmount || 0).toLocaleString()}</div>
                                                {order.advance > 0 && (
                                                    <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 rounded inline-block mt-0.5">
                                                        PAID: ₹{order.advance}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Hover Action Arrow */}
                                            <Link
                                                to={`/orders/${order._id || order.id}`}
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-900 hover:shadow-lg transition-all duration-300 transform group-hover:translate-x-0 translate-x-4 opacity-0 group-hover:opacity-100"
                                            >
                                                <FiArrowRight size={14} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile List View (Card style) - Matches Dashboard Mobile */}
            <div className="md:hidden space-y-4">
                {filteredOrders.map(order => (
                    <Link
                        to={`/orders/${order._id || order.id}`}
                        key={order._id || order.id}
                        className="block card-premium p-5 active:scale-[0.98] transition-all"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${order.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                                    order.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    #{order.orderNumber.slice(-2)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base">{order.client?.name}</h3>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">#{order.orderNumber}</p>
                                </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide border ${getStatusStyle(order.status)}`}>
                                {order.status}
                            </span>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <div>
                                <p className="font-bold text-slate-900 text-lg">₹{(order.totalAmount || 0).toLocaleString()}</p>
                                <p className="text-xs text-slate-400 font-medium">{order.items?.length} Items</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                    {order.status === 'Completed' ? 'Delivery Date' : 'Trial Date'}
                                </p>
                                <p className="text-sm font-semibold text-slate-700">
                                    {order.status === 'Completed'
                                        ? order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : '-'
                                        : order.trialDate ? new Date(order.trialDate).toLocaleDateString() : '-'
                                    }
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
