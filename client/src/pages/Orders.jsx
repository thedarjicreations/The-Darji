import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { FiEye, FiFilter, FiTrash2, FiX, FiCheck, FiDownload, FiMessageSquare, FiChevronDown, FiSave, FiTrendingUp, FiClock, FiCheckCircle, FiAlertCircle, FiPlus, FiPackage, FiSearch } from 'react-icons/fi';
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
    const [updatingOrders, setUpdatingOrders] = useState({}); // Track orders being updated
    const [selectedOrders, setSelectedOrders] = useState([]); // Track selected orders for bulk actions
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    // Advanced filters state
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [garmentTypes, setGarmentTypes] = useState([]);
    const [advancedFilters, setAdvancedFilters] = useState({
        trialDateFrom: '',
        trialDateTo: '',
        deliveryDateFrom: '',
        deliveryDateTo: '',
        amountMin: '',
        amountMax: '',
        paymentStatus: 'all', // all, paid, unpaid, partial
        selectedGarmentTypes: [] // array of garment type IDs
    });
    const [savedPresets, setSavedPresets] = useState(() => {
        const saved = localStorage.getItem('orderFilterPresets');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        fetchOrders();
        fetchGarmentTypes();
    }, []);

    useEffect(() => {
        filterOrders();
    }, [orders, statusFilter, searchQuery, clientFilter, advancedFilters]);

    const fetchOrders = async () => {
        try {
            const response = await api.get('/orders');
            setOrders(response.data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGarmentTypes = async () => {
        try {
            const response = await api.get('/garments');
            setGarmentTypes(response.data);
        } catch (error) {
            console.error('Error fetching garment types:', error);
        }
    };

    const filterOrders = () => {
        let filtered = orders;

        // Client filter
        if (clientFilter) {
            filtered = filtered.filter(order => order.clientId === clientFilter);
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(order => order.status === statusFilter);
        }

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(order =>
                order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.client.phone.includes(searchQuery)
            );
        }

        // Advanced filters
        // Trial date range
        if (advancedFilters.trialDateFrom) {
            filtered = filtered.filter(order =>
                order.trialDate && new Date(order.trialDate) >= new Date(advancedFilters.trialDateFrom)
            );
        }
        if (advancedFilters.trialDateTo) {
            filtered = filtered.filter(order =>
                order.trialDate && new Date(order.trialDate) <= new Date(advancedFilters.trialDateTo)
            );
        }

        // Delivery date range
        if (advancedFilters.deliveryDateFrom) {
            filtered = filtered.filter(order =>
                order.deliveryDate && new Date(order.deliveryDate) >= new Date(advancedFilters.deliveryDateFrom)
            );
        }
        if (advancedFilters.deliveryDateTo) {
            filtered = filtered.filter(order =>
                order.deliveryDate && new Date(order.deliveryDate) <= new Date(advancedFilters.deliveryDateTo)
            );
        }

        // Amount range
        if (advancedFilters.amountMin) {
            filtered = filtered.filter(order => order.totalAmount >= parseFloat(advancedFilters.amountMin));
        }
        if (advancedFilters.amountMax) {
            filtered = filtered.filter(order => order.totalAmount <= parseFloat(advancedFilters.amountMax));
        }

        // Payment status
        if (advancedFilters.paymentStatus !== 'all') {
            filtered = filtered.filter(order => {
                const actualAmount = order.finalAmount ?? order.totalAmount;
                const paid = order.advance || 0;
                const remaining = actualAmount - paid;

                if (advancedFilters.paymentStatus === 'paid') {
                    return remaining <= 0;
                } else if (advancedFilters.paymentStatus === 'unpaid') {
                    return paid === 0;
                } else if (advancedFilters.paymentStatus === 'partial') {
                    return paid > 0 && remaining > 0;
                }
                return true;
            });
        }

        // Garment types
        if (advancedFilters.selectedGarmentTypes.length > 0) {
            filtered = filtered.filter(order =>
                order.items.some(item =>
                    advancedFilters.selectedGarmentTypes.includes(item.garmentTypeId)
                )
            );
        }

        setFilteredOrders(filtered);
    };

    // Advanced filter handlers
    const handleAdvancedFilterChange = (field, value) => {
        setAdvancedFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleGarmentTypeToggle = (garmentTypeId) => {
        setAdvancedFilters(prev => ({
            ...prev,
            selectedGarmentTypes: prev.selectedGarmentTypes.includes(garmentTypeId)
                ? prev.selectedGarmentTypes.filter(id => id !== garmentTypeId)
                : [...prev.selectedGarmentTypes, garmentTypeId]
        }));
    };

    const resetAdvancedFilters = () => {
        setAdvancedFilters({
            trialDateFrom: '',
            trialDateTo: '',
            deliveryDateFrom: '',
            deliveryDateTo: '',
            amountMin: '',
            amountMax: '',
            paymentStatus: 'all',
            selectedGarmentTypes: []
        });
    };

    const saveFilterPreset = () => {
        const presetName = prompt('Enter a name for this filter preset:');
        if (!presetName) return;

        const newPreset = {
            id: Date.now().toString(),
            name: presetName,
            filters: { ...advancedFilters }
        };

        const updated = [...savedPresets, newPreset];
        setSavedPresets(updated);
        localStorage.setItem('orderFilterPresets', JSON.stringify(updated));
        showToast(`Preset "${presetName}" saved!`, 'success');
    };

    const loadFilterPreset = (preset) => {
        setAdvancedFilters(preset.filters);
        setShowAdvancedFilters(true);
    };

    const deleteFilterPreset = (presetId) => {
        if (!confirm('Delete this preset?')) return;

        const updated = savedPresets.filter(p => p.id !== presetId);
        setSavedPresets(updated);
        localStorage.setItem('orderFilterPresets', JSON.stringify(updated));
    };

    const clearClientFilter = () => {
        setSearchParams({});
    };

    const handleDelete = async (orderId, orderNumber) => {
        if (!confirm(`Are you sure you want to delete order ${orderNumber}? This will delete the invoice and all related data. This action cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/orders/${orderId}`);
            fetchOrders(); // Refresh the list
            showToast('Order moved to trash', 'success');
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to delete order', 'error');
        }
    };

    const handleQuickStatusUpdate = async (orderId, newStatus) => {
        setUpdatingOrders(prev => ({ ...prev, [orderId]: true }));
        try {
            await api.patch(`/orders/${orderId}/status`, { status: newStatus });
            // Update local state immediately for better UX
            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order.id === orderId ? { ...order, status: newStatus } : order
                )
            );
        } catch (error) {
            console.error('Failed to update status:', error);
            showToast('Failed to update order status', 'error');
        } finally {
            setUpdatingOrders(prev => ({ ...prev, [orderId]: false }));
        }
    };

    // Bulk action handlers
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedOrders(filteredOrders.map(order => order.id));
        } else {
            setSelectedOrders([]);
        }
    };

    const handleSelectOrder = (orderId) => {
        setSelectedOrders(prev =>
            prev.includes(orderId)
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
    };

    const handleBulkStatusUpdate = async (status) => {
        if (selectedOrders.length === 0) return;

        if (!confirm(`Update ${selectedOrders.length} orders to ${status}?`)) return;

        setBulkActionLoading(true);
        try {
            await api.post('/orders/bulk-update-status', {
                orderIds: selectedOrders,
                status
            });

            // Update local state
            setOrders(prevOrders =>
                prevOrders.map(order =>
                    selectedOrders.includes(order.id)
                        ? { ...order, status }
                        : order
                )
            );

            setSelectedOrders([]);
            showToast(`Successfully updated ${selectedOrders.length} orders!`, 'success');
        } catch (error) {
            console.error('Bulk update failed:', error);
            showToast('Failed to update orders', 'error');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedOrders.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${selectedOrders.length} orders? This cannot be undone.`)) return;

        setBulkActionLoading(true);
        try {
            await api.post('/orders/bulk-delete', {
                orderIds: selectedOrders
            });

            // Remove from local state
            setOrders(prevOrders =>
                prevOrders.filter(order => !selectedOrders.includes(order.id))
            );

            setSelectedOrders([]);
            showToast(`Successfully deleted ${selectedOrders.length} orders!`, 'success');
        } catch (error) {
            console.error('Bulk delete failed:', error);
            showToast('Failed to delete orders', 'error');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkDownloadInvoices = async () => {
        if (selectedOrders.length === 0) return;

        setBulkActionLoading(true);
        try {
            const response = await api.post('/orders/bulk-invoices', {
                orderIds: selectedOrders
            });

            const { invoices } = response.data;

            if (invoices.length === 0) {
                alert('No invoices found for selected orders');
                return;
            }

            // Download each invoice
            for (const invoice of invoices) {
                const link = document.createElement('a');
                link.href = `http://${window.location.hostname}:5000${invoice.pdfPath}`;
                link.download = `Invoice_${invoice.orderNumber}.pdf`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            showToast(`Started downloading ${invoices.length} invoices!`, 'success');
        } catch (error) {
            console.error('Bulk download failed:', error);
            showToast('Failed to download invoices', 'error');
        } finally {
            setBulkActionLoading(false);
        }
    };

    // Quick Stats Calculation
    const totalOrders = filteredOrders.length;
    const pendingOrders = filteredOrders.filter(o => o.status === 'Pending' || o.status === 'InProgress').length;
    const completedOrders = filteredOrders.filter(o => o.status === 'Completed' || o.status === 'Delivered').length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.finalAmount || o.totalAmount), 0);

    const getStatusStyle = (status) => {
        const styles = {
            'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'InProgress': 'bg-blue-100 text-blue-800 border-blue-200',
            'Ready for Trial': 'bg-purple-100 text-purple-800 border-purple-200',
            'Trial': 'bg-purple-100 text-purple-800 border-purple-200',
            'Ready for Delivery': 'bg-orange-100 text-orange-800 border-orange-200',
            'Completed': 'bg-green-100 text-green-800 border-green-200',
            'Delivered': 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-darji-accent mb-4"></div>
                <p className="text-gray-400 font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-400 to-gray-600">Loading orders...</p>
            </div>
        );
    }

    return (
        <div className="fade-in max-w-7xl mx-auto pb-24 md:pb-12 px-4 md:px-6">

            {/* Header & Stats Section */}
            <div className="mb-8 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Orders</h1>
                        <p className="text-gray-500 font-medium mt-1">Manage your production pipeline</p>
                    </div>
                    <Link
                        to="/new-order"
                        className="group flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-black font-bold shadow-lg shadow-gray-900/20 hover:-translate-y-0.5 transition-all active:scale-95"
                    >
                        <div className="bg-white/20 p-1 rounded-lg group-hover:bg-white/30 transition-colors">
                            <FiPlus size={16} />
                        </div>
                        <span>Create Order</span>
                    </Link>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <FiPackage size={20} />
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</span>
                        </div>
                        <p className="text-3xl font-black text-gray-900">{totalOrders}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                                <FiClock size={20} />
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending</span>
                        </div>
                        <p className="text-3xl font-black text-gray-900">{pendingOrders}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <FiCheckCircle size={20} />
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed</span>
                        </div>
                        <p className="text-3xl font-black text-gray-900">{completedOrders}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <FiTrendingUp size={20} />
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Revenue</span>
                        </div>
                        <p className="text-3xl font-black text-gray-900">₹{totalRevenue.toLocaleString('en-IN')}</p>
                    </div>
                </div>
            </div>

            {/* Active Filter Indicator */}
            {clientFilter && (
                <div className="bg-blue-600 text-white p-4 rounded-xl mb-6 shadow-lg shadow-blue-600/20 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <FiFilter />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-100 uppercase tracking-wider">Wait - Filtering by Client</p>
                            <p className="font-bold text-lg">{filteredOrders[0]?.client?.name || 'Client'}</p>
                        </div>
                    </div>
                    <button onClick={clearClientFilter} className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors">
                        Clear
                    </button>
                </div>
            )}

            {/* Bulk Actions Floating Bar */}
            {selectedOrders.length > 0 && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-6 animate-in slide-in-from-bottom-10 border border-white/10">
                    <div className="font-bold border-r border-white/20 pr-6">
                        <span className="bg-white text-black px-2 py-0.5 rounded text-sm mr-2">{selectedOrders.length}</span>
                        Selected
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            onChange={(e) => e.target.value && handleBulkStatusUpdate(e.target.value)}
                            className="bg-white/10 border-none text-sm font-bold rounded-lg py-2 pl-3 pr-8 focus:ring-0 cursor-pointer hover:bg-white/20"
                            disabled={bulkActionLoading}
                        >
                            <option value="" className="text-black">Update Status</option>
                            {['Pending', 'InProgress', 'Ready for Trial', 'Delivered'].map(s => (
                                <option key={s} value={s} className="text-black">{s}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleBulkDownloadInvoices}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-blue-300 hover:text-blue-200"
                            title="Download Invoices"
                        >
                            <FiDownload size={20} />
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-red-400 hover:text-red-300"
                            title="Delete"
                        >
                            <FiTrash2 size={20} />
                        </button>
                        <button
                            onClick={() => setSelectedOrders([])}
                            className="ml-2 text-gray-500 hover:text-white transition-colors"
                        >
                            <FiX size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 sticky top-20 z-10 md:static">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border-0 shadow-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 text-gray-900 font-medium placeholder-gray-400"
                    />
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    {['all', 'Pending', 'InProgress', 'Ready for Trial', 'Completed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${statusFilter === status
                                ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {status === 'all' ? 'All Orders' : status}
                        </button>
                    ))}
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`p-3 rounded-xl border transition-colors ${showAdvancedFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500'}`}
                    >
                        <FiFilter />
                    </button>
                </div>
            </div>

            {/* Advanced Filters Panel (Simplified for brevity in layout) */}
            {showAdvancedFilters && (
                <div className="mb-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900">Advanced Filters</h3>
                        <button onClick={resetAdvancedFilters} className="text-xs font-bold text-red-500 hover:underline">Reset All</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Include same inputs as before but styled cleaner */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Trial Date From</label>
                            <input type="date" value={advancedFilters.trialDateFrom} onChange={(e) => handleAdvancedFilterChange('trialDateFrom', e.target.value)} className="w-full p-2 bg-gray-50 rounded-lg text-sm border-0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Trial Date To</label>
                            <input type="date" value={advancedFilters.trialDateTo} onChange={(e) => handleAdvancedFilterChange('trialDateTo', e.target.value)} className="w-full p-2 bg-gray-50 rounded-lg text-sm border-0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Delivery Date From</label>
                            <input type="date" value={advancedFilters.deliveryDateFrom} onChange={(e) => handleAdvancedFilterChange('deliveryDateFrom', e.target.value)} className="w-full p-2 bg-gray-50 rounded-lg text-sm border-0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Delivery Date To</label>
                            <input type="date" value={advancedFilters.deliveryDateTo} onChange={(e) => handleAdvancedFilterChange('deliveryDateTo', e.target.value)} className="w-full p-2 bg-gray-50 rounded-lg text-sm border-0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Min Amount</label>
                            <input type="number" value={advancedFilters.amountMin} onChange={(e) => handleAdvancedFilterChange('amountMin', e.target.value)} placeholder="Min Amount" className="w-full p-2 bg-gray-50 rounded-lg text-sm border-0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Max Amount</label>
                            <input type="number" value={advancedFilters.amountMax} onChange={(e) => handleAdvancedFilterChange('amountMax', e.target.value)} placeholder="Max Amount" className="w-full p-2 bg-gray-50 rounded-lg text-sm border-0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Payment Status</label>
                            <select value={advancedFilters.paymentStatus} onChange={(e) => handleAdvancedFilterChange('paymentStatus', e.target.value)} className="w-full p-2 bg-gray-50 rounded-lg text-sm border-0 font-medium text-gray-700">
                                <option value="all">All Payments</option>
                                <option value="paid">Fully Paid</option>
                                <option value="unpaid">Unpaid</option>
                                <option value="partial">Partial Payment</option>
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Garment Types</label>
                            <div className="flex flex-wrap gap-2">
                                {garmentTypes.map(garmentType => (
                                    <label
                                        key={garmentType.id}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${advancedFilters.selectedGarmentTypes.includes(garmentType.id)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white border border-gray-200 hover:border-blue-600'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={advancedFilters.selectedGarmentTypes.includes(garmentType.id)}
                                            onChange={() => handleGarmentTypeToggle(garmentType.id)}
                                            className="hidden"
                                        />
                                        <span className="text-sm font-medium">{garmentType.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Presets Row */}
                    {savedPresets.length > 0 && <div className="mt-4 flex gap-2 overflow-x-auto pt-2">{savedPresets.map(p => <div key={p.id} className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                        <button
                            onClick={() => loadFilterPreset(p)}
                            className="text-sm font-medium text-blue-600 hover:underline"
                        >
                            {p.name}
                        </button>
                        <button
                            onClick={() => deleteFilterPreset(p.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <FiX size={14} />
                        </button>
                    </div>)}</div>}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                        <button onClick={saveFilterPreset} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1"><FiSave size={14} /> Save as Preset</button>
                    </div>
                </div>
            )}

            {/* DESKTOP: Premium Table Layout */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-3">
                    <thead>
                        <tr className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            <th className="pl-6 pb-2 w-10">
                                <input type="checkbox" onChange={handleSelectAll} checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0} className="rounded w-5 h-5 border-gray-300 text-darji-accent focus:ring-darji-accent cursor-pointer" />
                            </th>
                            <th className="pb-2 text-left">Order Info</th>
                            <th className="pb-2 text-left">Client</th>
                            <th className="pb-2 text-center">Trial Date</th>
                            <th className="pb-2 text-right">Amount</th>
                            <th className="pb-2 text-center">Status</th>
                            <th className="pb-2 w-20"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length === 0 ? (
                            <tr><td colSpan="7" className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100 text-gray-400 font-medium">No orders found matching your criteria.</td></tr>
                        ) : (
                            filteredOrders.map(order => (
                                <tr key={order.id} className="group bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 rounded-2xl transform hover:-translate-y-1">
                                    <td className="pl-6 py-5 rounded-l-2xl border-y border-l border-gray-50 group-hover:border-transparent">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.includes(order.id)}
                                            onChange={() => handleSelectOrder(order.id)}
                                            className="rounded w-5 h-5 border-gray-300 text-darji-accent focus:ring-darji-accent cursor-pointer"
                                        />
                                    </td>
                                    <td className="py-5 border-y border-gray-50 group-hover:border-transparent">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800 text-lg">#{order.orderNumber}</span>
                                            <span className="text-xs font-medium text-gray-400">{order.items.length} Items</span>
                                        </div>
                                    </td>
                                    <td className="py-5 border-y border-gray-50 group-hover:border-transparent">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800">{order.client.name}</span>
                                            <span className="text-xs text-gray-400 font-mono">{order.client.phone}</span>
                                        </div>
                                    </td>
                                    <td className={`py-5 text-center border-y border-gray-50 group-hover:border-transparent font-medium text-sm ${new Date(order.trialDate) < new Date() && order.status !== 'Completed' ? 'text-red-500' : 'text-gray-600'}`}>
                                        {formatDate(order.trialDate)}
                                    </td>
                                    <td className="py-5 text-right border-y border-gray-50 group-hover:border-transparent font-bold text-gray-800">
                                        ₹{order.totalAmount.toLocaleString('en-IN')}
                                    </td>
                                    <td className="py-5 text-center border-y border-gray-50 group-hover:border-transparent">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(order.status)}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${order.status === 'Completed' ? 'bg-green-500' : 'bg-current'}`}></span>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="pr-6 py-5 rounded-r-2xl text-right border-y border-r border-gray-50 group-hover:border-transparent">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link to={`/orders/${order.id}`} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-900 hover:text-white transition-colors">
                                                <FiEye size={16} />
                                            </Link>
                                            <button onClick={() => handleDelete(order.id, order.orderNumber)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MOBILE: Card List (Optimized) */}
            <div className="md:hidden space-y-4">
                {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${getStatusStyle(order.status).split(' ')[0]}`}></div>
                        <div className="flex justify-between items-start mb-4 pl-4">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">#{order.orderNumber}</h3>
                                <p className="text-sm text-gray-500">{order.client.name}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${getStatusStyle(order.status)}`}>{order.status}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pl-4 mb-4">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400">Total</p>
                                <p className="font-black text-gray-900">₹{order.totalAmount}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400">Trial</p>
                                <p className="font-medium text-gray-700 text-sm">{formatDate(order.trialDate)}</p>
                            </div>
                        </div>
                        <Link to={`/orders/${order.id}`} className="block w-full text-center py-3 bg-gray-50 text-gray-900 font-bold rounded-xl hover:bg-gray-100">View Details</Link>
                    </div>
                ))}
            </div>
            {/* Floating Action Button (Mobile) */}
            <Link
                to="/new-order"
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-darji-accent text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-600 active:scale-95 transition-all z-50 border-4 border-white"
            >
                <span className="text-3xl font-light mb-1">+</span>
            </Link>
        </div>
    );
}
