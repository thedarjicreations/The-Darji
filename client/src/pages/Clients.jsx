import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { FiSearch, FiEdit2, FiTrash2, FiPlus, FiX, FiPhone, FiMail, FiMapPin, FiUser, FiArrowRight, FiDollarSign, FiClock, FiSend } from 'react-icons/fi';

export default function Clients() {
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: ''
    });
    const [paymentFilter, setPaymentFilter] = useState('all'); // all, outstanding, paid
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [paymentHistory, setPaymentHistory] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        filterClients();
    }, [clients, searchQuery, paymentFilter]);

    const fetchClients = async () => {
        try {
            const response = await api.get('/clients');
            setClients(response.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterClients = () => {
        let filtered = clients;

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(client =>
                client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.phone.includes(searchQuery) ||
                (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        // Payment status filter
        if (paymentFilter !== 'all') {
            filtered = filtered.filter(client => {
                const outstanding = calculateClientOutstanding(client);
                if (paymentFilter === 'outstanding') {
                    return outstanding > 0;
                } else if (paymentFilter === 'paid') {
                    return outstanding === 0;
                }
                return true;
            });
        }

        setFilteredClients(filtered);
    };

    // Calculate outstanding amount for a client
    const calculateClientOutstanding = (client) => {
        if (!client.orders) return 0;

        return client.orders
            .filter(order => order.status !== 'Delivered')
            .reduce((sum, order) => {
                const totalDue = order.totalAmount; // finalAmount not included in initial query
                const paid = 0; // advance not included in initial query
                return sum + (totalDue - paid);
            }, 0);
    };

    const handleOpenModal = (client = null) => {
        if (client) {
            setEditingClient(client);
            setFormData({
                name: client.name,
                phone: client.phone,
                email: client.email || '',
                address: client.address || ''
            });
        } else {
            setEditingClient(null);
            setFormData({ name: '', phone: '', email: '', address: '' });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingClient(null);
        setFormData({ name: '', phone: '', email: '', address: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingClient) {
                await api.put(`/clients/${editingClient.id}`, formData);
            } else {
                await api.post('/clients', formData);
            }
            fetchClients();
            handleCloseModal();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to save client');
        }
    };

    const handleDelete = async (clientId) => {
        if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
            return;
        }

        try {
            await api.delete(`/clients/${clientId}`);
            fetchClients();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to delete client');
        }
    };

    const viewPaymentHistory = async (client) => {
        setSelectedClient(client);
        setShowPaymentHistory(true);
        setLoadingHistory(true);

        try {
            const response = await api.get(`/clients/${client.id}/outstanding`);
            setPaymentHistory(response.data);
        } catch (error) {
            console.error('Error fetching payment history:', error);
            alert('Failed to load payment history');
        } finally {
            setLoadingHistory(false);
        }
    };

    const sendPaymentReminder = async (clientId) => {
        try {
            const response = await api.post(`/clients/${clientId}/payment-reminder`);
            const { whatsappUrl, totalOutstanding } = response.data;

            // Open WhatsApp
            window.open(whatsappUrl, '_blank');

            alert(`Payment reminder prepared! Outstanding: ₹${totalOutstanding.toFixed(2)}\nWhatsApp will open in a new tab.`);
        } catch (error) {
            console.error('Error sending payment reminder:', error);
            alert(error.response?.data?.error || 'Failed to send payment reminder');
        }
    };

    if (loading) {
        return <div className="text-center py-12">Loading clients...</div>;
    }

    return (
        <div className="fade-in max-w-7xl mx-auto pb-20 md:pb-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pt-2">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Client Directory</h1>
                    <p className="text-gray-500 mt-2 font-medium">Manage your customer database & details</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full md:w-auto flex items-center justify-center space-x-2 bg-darji-accent text-white px-8 py-4 rounded-xl hover:bg-blue-600 font-bold shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                    <FiPlus size={20} /> <span>Add New Client</span>
                </button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="flex-1 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center px-4 py-2 bg-gray-50 rounded-xl border border-transparent focus-within:bg-white focus-within:border-darji-accent/30 focus-within:ring-4 focus-within:ring-darji-accent/10 transition-all">
                        <FiSearch className="text-gray-400 mr-3" size={22} />
                        <input
                            type="text"
                            placeholder="Search clients by name, phone, or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 font-medium py-2"
                        />
                    </div>
                </div>

                <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="px-6 py-4 bg-white border border-gray-100 rounded-2xl font-bold text-gray-700 focus:border-darji-accent focus:ring-4 focus:ring-darji-accent/10 transition-all shadow-sm cursor-pointer"
                >
                    <option value="all">All Clients</option>
                    <option value="outstanding">With Dues</option>
                    <option value="paid">Paid Up</option>
                </select>
            </div>

            {/* Clients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredClients.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <FiUser size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-700">No customers found</h3>
                        <p className="text-gray-500 mt-1">Try adjusting your search or add a new client</p>
                    </div>
                ) : (
                    filteredClients.map(client => (
                        <div key={client.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group relative flex flex-col border ${calculateClientOutstanding(client) > 0 ? 'border-red-200 ring-4 ring-red-50' : 'border-gray-100'}`}>
                            {/* Header / Avatar */}
                            <div className="bg-gradient-to-r from-gray-50 to-white p-5 flex items-start gap-4 border-b border-gray-50">
                                <div className="w-14 h-14 bg-gradient-to-br from-darji-accent to-darji-primary text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-md rotate-3 group-hover:rotate-6 transition-transform">
                                    {client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">{client.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md uppercase tracking-wider" title={client.id}>
                                            #{client.id.substring(0, 8)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleOpenModal(client)} className="p-2 text-gray-400 hover:text-darji-accent hover:bg-blue-50 rounded-lg transition-colors"><FiEdit2 /></button>
                                    <button onClick={() => handleDelete(client.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 /></button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-5 space-y-4 flex-1">
                                <div className="flex items-center gap-3 text-sm text-gray-600 group/item">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-darji-accent shrink-0 group-hover/item:scale-110 transition-transform"><FiPhone size={14} /></div>
                                    <a href={`tel:${client.phone}`} className="font-bold hover:underline hover:text-darji-accent">{client.phone}</a>
                                </div>
                                {client.email && (
                                    <div className="flex items-center gap-3 text-sm text-gray-600 group/item">
                                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 shrink-0 group-hover/item:scale-110 transition-transform"><FiMail size={14} /></div>
                                        <a href={`mailto:${client.email}`} className="truncate hover:underline hover:text-orange-600">{client.email}</a>
                                    </div>
                                )}
                                {client.address && (
                                    <div className="flex items-start gap-3 text-sm text-gray-600 group/item">
                                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform"><FiMapPin size={14} /></div>
                                        <span className="line-clamp-2 leading-relaxed">{client.address}</span>
                                    </div>
                                )}
                            </div>

                            {/* Footer / Stats */}
                            <div className="bg-gray-50/80 p-4 border-t border-gray-100 flex items-center justify-between">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest flex flex-col">
                                    <span className="text-[10px] text-gray-400">Total Orders</span>
                                    <span className="text-lg text-gray-900 font-bold mt-0.5">{client.orders?.length || 0}</span>
                                </div>
                                {(() => {
                                    const outstanding = calculateClientOutstanding(client);
                                    return (
                                        <div className="text-xs font-bold uppercase tracking-widest flex flex-col items-end">
                                            <span className="text-[10px] text-gray-400">Outstanding</span>
                                            <span className={`text-lg font-bold mt-0.5 ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                ₹{outstanding.toFixed(0)}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Action Buttons Row */}
                            {(() => {
                                const outstanding = calculateClientOutstanding(client);
                                return (
                                    <div className="bg-white p-3 border-t border-gray-100 flex items-center gap-2">
                                        <button
                                            onClick={() => viewPaymentHistory(client)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm transition-colors"
                                        >
                                            <FiClock size={16} />
                                            <span>History</span>
                                        </button>

                                        {outstanding > 0 && (
                                            <button
                                                onClick={() => sendPaymentReminder(client.id)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm transition-colors"
                                            >
                                                <FiSend size={16} />
                                                <span>Remind</span>
                                            </button>
                                        )}

                                        <Link
                                            to={`/orders?client=${client.id}`}
                                            className="p-2.5 bg-darji-accent text-white rounded-lg hover:bg-blue-600 transition-all hover:scale-110 active:scale-95 shadow-md"
                                        >
                                            <FiArrowRight size={18} />
                                        </Link>
                                    </div>
                                );
                            })()}
                        </div>
                    ))
                )}
            </div>

            {/* Payment History Modal */}
            {showPaymentHistory && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-darji-primary to-darji-accent p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black">Payment History</h2>
                                    <p className="text-blue-100 mt-1">{selectedClient?.name}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowPaymentHistory(false);
                                        setPaymentHistory(null);
                                    }}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <FiX size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                            {loadingHistory ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin inline-block w-8 h-8 border-4 border-darji-accent border-t-transparent rounded-full"></div>
                                    <p className="text-gray-500 mt-4">Loading payment history...</p>
                                </div>
                            ) : paymentHistory ? (
                                <div className="space-y-6">
                                    {/* Summary */}
                                    <div className="bg-gradient-to-br from-red-50 to-orange-50 p-5 rounded-2xl border border-red-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Total Outstanding</p>
                                                <p className="text-3xl font-black text-red-600 mt-1">₹{paymentHistory.totalOutstanding.toFixed(2)}</p>
                                            </div>
                                            {paymentHistory.totalOutstanding > 0 && (
                                                <button
                                                    onClick={() => {
                                                        sendPaymentReminder(selectedClient.id);
                                                        setShowPaymentHistory(false);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors shadow-md"
                                                >
                                                    <FiSend size={18} />
                                                    <span>Send Reminder</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Outstanding Orders */}
                                    {paymentHistory.outstandingOrders && paymentHistory.outstandingOrders.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                                                <FiDollarSign className="text-red-500" />
                                                Pending Orders
                                            </h3>
                                            <div className="space-y-3">
                                                {paymentHistory.outstandingOrders.map(order => (
                                                    <div key={order.orderId} className="bg-white border-2 border-red-100 p-4 rounded-xl hover:shadow-md transition-shadow">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="font-bold text-gray-900">{order.orderNumber}</span>
                                                            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase">
                                                                {order.status}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                                            <div>
                                                                <p className="text-gray-500 text-xs">Total</p>
                                                                <p className="font-bold text-gray-900">₹{order.totalAmount.toFixed(0)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-500 text-xs">Paid</p>
                                                                <p className="font-bold text-green-600">₹{order.paid.toFixed(0)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-500 text-xs">Due</p>
                                                                <p className="font-bold text-red-600">₹{order.outstanding.toFixed(0)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Payment History Timeline */}
                                    {paymentHistory.paymentHistory && paymentHistory.paymentHistory.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2 sticky top-0 bg-white py-2 z-10">
                                                <FiClock className="text-blue-500" />
                                                Order History
                                            </h3>
                                            <div className="relative pl-2 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-gray-100">
                                                {paymentHistory.paymentHistory.map((payment, index) => (
                                                    <div key={index} className="relative pl-8">
                                                        <div className={`absolute left-[5px] top-6 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10 ${payment.status === 'Delivered' ? 'bg-green-500' : 'bg-darji-accent'}`}></div>
                                                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-darji-accent/30 transition-all">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div>
                                                                    <div className="font-bold text-gray-900 text-lg">{payment.orderNumber}</div>
                                                                    <div className="text-xs text-gray-400 font-medium">{new Date(payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                                                </div>
                                                                <span className={`px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider border ${payment.status === 'Delivered'
                                                                    ? 'bg-green-50 text-green-700 border-green-100'
                                                                    : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                                                    }`}>
                                                                    {payment.status}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-3">
                                                                <div>
                                                                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Total</div>
                                                                    <div className="font-bold text-gray-900">₹{payment.totalAmount.toFixed(0)}</div>
                                                                </div>
                                                                <div className="h-8 w-px bg-gray-200"></div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Paid</div>
                                                                    <div className="font-bold text-green-600">₹{payment.advance.toFixed(0)}</div>
                                                                </div>
                                                                <div className="h-8 w-px bg-gray-200"></div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Balance</div>
                                                                    <div className="font-bold text-gray-400">₹{(payment.totalAmount - payment.advance).toFixed(0)}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-500">No payment history available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg md:scale-100 scale-95 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">
                                    {editingClient ? 'Edit Client Details' : 'Add New Client'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1 font-medium">Enter customer information below</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                                <FiX size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Name *</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><FiUser /></div>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent font-medium text-gray-900 bg-gray-50 focus:bg-white transition-colors"
                                        required
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone Number *</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><FiPhone /></div>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent font-medium text-gray-900 bg-gray-50 focus:bg-white transition-colors"
                                        required
                                        placeholder="e.g. 9876543210"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><FiMail /></div>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent font-medium text-gray-900 bg-gray-50 focus:bg-white transition-colors"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Address</label>
                                <div className="relative">
                                    <div className="absolute top-3.5 left-0 pl-3.5 flex items-start pointer-events-none text-gray-400"><FiMapPin /></div>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent font-medium text-gray-900 bg-gray-50 focus:bg-white transition-colors resize-none"
                                        rows="3"
                                        placeholder="Enter full address..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 bg-gray-100 text-gray-600 px-6 py-3.5 rounded-xl hover:bg-gray-200 font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-darji-primary to-darji-accent text-white px-6 py-3.5 rounded-xl hover:shadow-lg hover:-translate-y-0.5 active:scale-95 font-bold transition-all"
                                >
                                    {editingClient ? 'Update Client' : 'Create Client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
