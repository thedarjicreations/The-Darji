import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { FiSearch, FiEdit2, FiTrash2, FiPlus, FiX, FiPhone, FiMail, FiMapPin, FiUser, FiArrowRight, FiCreditCard, FiClock, FiSend, FiFileText, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

export default function Clients() {
    const { showToast } = useToast();
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
            const clientsData = response.data.clients || [];

            const clientsWithOrders = clientsData.map(client => ({
                ...client,
                id: client._id,
                orders: client.orders || []
            }));

            setClients(clientsWithOrders);
        } catch (error) {
            console.error('Error fetching clients:', error);
            showToast(error.response?.data?.error || 'Failed to load clients', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filterClients = () => {
        let filtered = clients;

        if (searchQuery) {
            filtered = filtered.filter(client =>
                client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.phone.includes(searchQuery) ||
                (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

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

    const calculateClientOutstanding = (client) => {
        if (!client.orders) return 0;
        return client.orders
            .filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled')
            .reduce((sum, order) => {
                const totalDue = parseFloat(order.totalAmount || order.finalAmount || 0);
                const paid = parseFloat(order.advance || 0);
                return sum + (totalDue - paid);
            }, 0);
    };

    const calculatePendingStats = (client) => {
        if (!client.orders) return { count: 0, value: 0 };
        const pendingOrders = client.orders.filter(order =>
            order.status !== 'Delivered' && order.status !== 'Cancelled' && order.status !== 'Completed'
        );
        const value = pendingOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || order.finalAmount || 0), 0);
        return { count: pendingOrders.length, value };
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
                showToast('Client updated successfully', 'success');
            } else {
                await api.post('/clients', formData);
                showToast('Client created successfully', 'success');
            }
            fetchClients();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving client:', error);
            showToast(error.response?.data?.error || 'Failed to save client', 'error');
        }
    };

    const handleDelete = async (clientId) => {
        if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
            return;
        }

        try {
            await api.delete(`/clients/${clientId}`);
            fetchClients();
            showToast('Client deleted', 'success');
        } catch (error) {
            console.error('Error deleting client:', error);
            showToast(error.response?.data?.error || 'Failed to delete client', 'error');
        }
    };

    const viewPaymentHistory = async (client) => {
        setSelectedClient(client);
        setShowPaymentHistory(true);
        setLoadingHistory(true);

        try {
            const orders = client.orders || [];
            const totalOutstanding = calculateClientOutstanding(client);

            const outstandingOrders = orders
                .filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled' && (order.totalAmount - order.advance) > 0)
                .map(order => ({
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    totalAmount: parseFloat(order.totalAmount || order.finalAmount),
                    paid: parseFloat(order.advance),
                    outstanding: parseFloat(order.totalAmount || order.finalAmount) - parseFloat(order.advance)
                }));

            const history = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setPaymentHistory({
                totalOutstanding,
                outstandingOrders,
                paymentHistory: history
            });

        } catch (error) {
            console.error('Error processing history:', error);
            showToast('Failed to load history', 'error');
        } finally {
            setLoadingHistory(false);
        }
    };

    const sendPaymentReminder = async (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        const totalOutstanding = calculateClientOutstanding(client);
        if (totalOutstanding <= 0) {
            showToast('No outstanding payments', 'info');
            return;
        }

        const message = `Hello ${client.name}, this is a gentle reminder from The Darji. You have an outstanding balance of ₹${totalOutstanding.toLocaleString('en-IN')}. Please clear your dues at your earliest convenience. Thank you!`;
        const whatsappUrl = `https://wa.me/91${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
        showToast('WhatsApp reminder opened', 'success');
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-slate-400 font-medium">Loading clients...</div>;
    }

    return (
        <div className="fade-in max-w-7xl mx-auto pb-20 md:pb-10 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Client Directory</h1>
                    <p className="text-slate-500 font-medium mt-1">Manage relationships & accounts</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="group relative inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-white transition-all duration-200 bg-darji-accent font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-darji-accent hover:bg-slate-900 shadow-lg shadow-indigo-200"
                >
                    <FiPlus className="mr-2" size={18} />
                    Add Client
                </button>
            </div>

            {/* Search & Stats */}
            <div className="flex flex-col lg:flex-row gap-6 mb-8">
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-100 flex-1 flex items-center">
                    <div className="pl-4 text-slate-400">
                        <FiSearch size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-3 bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400 font-medium"
                    />
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1 flex">
                    {['all', 'outstanding', 'paid'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setPaymentFilter(filter)}
                            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${paymentFilter === filter
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Clients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredClients.map(client => {
                    const outstanding = calculateClientOutstanding(client);
                    const pendingStats = calculatePendingStats(client);

                    return (
                        <div key={client.id} className="card-premium group hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                            {/* Card Header: Identity */}
                            <div className="p-6 border-b border-slate-50">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-black text-lg shadow-inner">
                                            {client.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-1" title={client.name}>
                                                {client.name}
                                            </h3>
                                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wide">#{client.id.substring(client.id.length - 6)}</p>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button onClick={() => handleOpenModal(client)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><FiEdit2 size={14} /></button>
                                        <button onClick={() => handleDelete(client.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><FiTrash2 size={14} /></button>
                                    </div>
                                </div>
                            </div>

                            {/* Card Body: Contact */}
                            <div className="px-6 py-4 space-y-3 flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <FiPhone size={14} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{client.phone}</span>
                                </div>
                                {client.address && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                            <FiMapPin size={14} />
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed mt-0.5">{client.address}</span>
                                    </div>
                                )}
                            </div>

                            {/* Pending Stats Preview (Dashboard Style) */}
                            {pendingStats.count > 0 && (
                                <div className="mx-6 mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                        <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Pending</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-amber-900 font-bold font-mono">₹{pendingStats.value.toLocaleString('en-IN')}</span>
                                        <span className="text-[10px] text-amber-600 font-bold">{pendingStats.count} Order{pendingStats.count !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                            )}

                            {/* Footer: Stats & Actions */}
                            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 rounded-b-2xl">
                                <div className="flex items-end justify-between mb-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Outstanding</p>
                                        <p className={`text-lg font-black font-mono ${outstanding > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                                            ₹{outstanding.toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Lifetime</p>
                                        <p className="text-sm font-bold text-slate-700 text-right">{client.orders?.length || 0} Orders</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => viewPaymentHistory(client)}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                                    >
                                        <FiFileText /> Statement
                                    </button>
                                    <Link
                                        to={`/orders?client=${client.id}`}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 text-white shadow-md shadow-slate-900/10 rounded-lg text-xs font-bold hover:bg-darji-accent transition-all"
                                    >
                                        View Orders <FiArrowRight />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Statement of Account Modal */}
            {showPaymentHistory && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowPaymentHistory(false)}></div>
                    <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="bg-slate-900 text-white p-6 relative overflow-hidden shrink-0">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight">Statement of Account</h2>
                                    <p className="text-slate-400 font-medium mt-1">{selectedClient?.name}</p>
                                </div>
                                <button onClick={() => setShowPaymentHistory(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                                    <FiX size={24} />
                                </button>
                            </div>

                            {/* Summary Card */}
                            <div className="mt-8 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Total Due</p>
                                    <p className="text-2xl font-black text-white font-mono mt-1">₹{paymentHistory?.totalOutstanding?.toLocaleString('en-IN')}</p>
                                </div>
                                {paymentHistory?.totalOutstanding > 0 && (
                                    <button
                                        onClick={() => sendPaymentReminder(selectedClient?.id)}
                                        className="px-4 py-2 bg-white text-indigo-900 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2"
                                    >
                                        <FiSend /> Send Reminder
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                            {loadingHistory ? (
                                <div className="flex justify-center py-10"><div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div></div>
                            ) : (
                                <div className="space-y-8">
                                    {paymentHistory?.outstandingOrders?.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <FiAlertCircle /> Pending Items
                                            </h3>
                                            <div className="space-y-3">
                                                {paymentHistory.outstandingOrders.map(order => (
                                                    <div key={order.orderId} className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm relative overflow-hidden group">
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <span className="font-bold text-slate-900">Order #{order.orderNumber}</span>
                                                                <span className="ml-2 px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded uppercase">{order.status}</span>
                                                            </div>
                                                            <p className="font-black text-rose-600 font-mono">₹{order.outstanding.toLocaleString('en-IN')}</p>
                                                        </div>
                                                        <div className="flex justify-between text-xs text-slate-500">
                                                            <span>Total: ₹{order.totalAmount.toLocaleString('en-IN')}</span>
                                                            <span className="text-emerald-600 font-bold">Paid: ₹{order.paid.toLocaleString('en-IN')}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <FiClock /> History
                                        </h3>
                                        <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pl-6 pb-2">
                                            {paymentHistory?.paymentHistory?.map((order, idx) => (
                                                <div key={idx} className="relative">
                                                    <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${order.status === 'Delivered' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-bold text-slate-900">#{order.orderNumber}</p>
                                                                <p className="text-xs text-slate-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-slate-800 font-mono">₹{parseFloat(order.totalAmount).toLocaleString('en-IN')}</p>
                                                                <p className="text-[10px] font-bold uppercase text-slate-400">{order.status}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Client Modal - Modern */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900">
                                {editingClient ? 'Edit Client' : 'New Client'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <FiX size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-darji-accent font-bold text-slate-900"
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone</label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-darji-accent font-bold text-slate-900"
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email (Optional)</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-darji-accent font-medium text-slate-900"
                                    placeholder="jane@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Address (Optional)</label>
                                <textarea
                                    rows="3"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-darji-accent font-medium text-slate-900 resize-none"
                                    placeholder="Street address..."
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-darji-accent transition-colors shadow-lg shadow-slate-900/20"
                            >
                                {editingClient ? 'Save Changes' : 'Create Client'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
