import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { FiMessageSquare, FiCheck, FiClock, FiSend, FiRefreshCw, FiShoppingBag, FiSearch, FiCalendar } from 'react-icons/fi';

export default function Messages() {
    const [messages, setMessages] = useState([]);
    const [filteredMessages, setFilteredMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [typeFilter, setTypeFilter] = useState('all');

    useEffect(() => {
        fetchMessages();
    }, []);

    useEffect(() => {
        filterMessages();
    }, [messages, typeFilter]);

    const fetchMessages = async () => {
        try {
            // Backend API returns messages with populated client data
            const response = await api.get('/messages', { params: { limit: 500 } });
            const messageDocs = response.data.messages || [];

            // Backend already populates client, just format for UI
            const enrichedMessages = messageDocs.map(msg => ({
                ...msg,
                id: msg._id,
                client: msg.client || { name: 'Unknown', phone: '' }
            }));

            setMessages(enrichedMessages);
            setError(null);
        } catch (error) {
            console.error('Error fetching messages:', error);
            setError('Failed to load messages. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const filterMessages = () => {
        if (typeFilter === 'all') {
            setFilteredMessages(messages);
        } else {
            setFilteredMessages(messages.filter(msg => msg.type === typeFilter));
        }
    };

    const getTypeColor = (type) => {
        const colors = {
            'OrderConfirmation': 'bg-blue-100 text-blue-800',
            'OrderReady': 'bg-teal-100 text-teal-800',
            'PostDelivery': 'bg-green-100 text-green-800',
            'ReEngagement': 'bg-purple-100 text-purple-800',
            'InactiveClient': 'bg-orange-100 text-orange-800',
            'PaymentReminder': 'bg-red-100 text-red-800',
            'DeliveryReminder': 'bg-yellow-100 text-yellow-800',
            'Custom': 'bg-gray-100 text-gray-800'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    const getTypeName = (type) => {
        const names = {
            'OrderConfirmation': 'Order Confirmation',
            'OrderReady': 'Order Ready',
            'PostDelivery': 'Post-Delivery',
            'ReEngagement': 'Re-Engagement',
            'InactiveClient': 'Inactive Client',
            'PaymentReminder': 'Payment Reminder',
            'DeliveryReminder': 'Delivery Reminder',
            'Custom': 'Manual Message'
        };
        return names[type] || type;
    };

    const getTypeIconClass = (type) => {
        const classes = {
            'OrderConfirmation': 'bg-gradient-to-br from-blue-500 to-blue-600',
            'OrderReady': 'bg-gradient-to-br from-teal-500 to-teal-600',
            'PostDelivery': 'bg-gradient-to-br from-green-500 to-green-600',
            'ReEngagement': 'bg-gradient-to-br from-purple-500 to-purple-600',
            'InactiveClient': 'bg-gradient-to-br from-orange-500 to-orange-600',
            'PaymentReminder': 'bg-gradient-to-br from-red-500 to-red-600',
            'Custom': 'bg-gradient-to-br from-gray-500 to-gray-600'
        };
        return classes[type] || 'bg-gradient-to-br from-gray-500 to-gray-600';
    };

    const getTypeSolidClass = (type) => {
        const classes = {
            'OrderConfirmation': 'bg-blue-500',
            'OrderReady': 'bg-teal-500',
            'PostDelivery': 'bg-green-500',
            'ReEngagement': 'bg-purple-500',
            'InactiveClient': 'bg-orange-500',
            'PaymentReminder': 'bg-red-500',
            'Custom': 'bg-gray-500'
        };
        return classes[type] || 'bg-gray-500';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleString('en-IN');
    };

    if (loading) {
        return <div className="text-center py-12">Loading messages...</div>;
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-red-500 mb-4 text-xl">⚠️ {error}</div>
                <button onClick={fetchMessages} className="bg-gray-800 text-white px-4 py-2 rounded">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="fade-in w-full max-w-full mx-auto pb-6 md:pb-0 overflow-x-hidden px-3 md:px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pt-2">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">Message History</h1>
                    <p className="text-gray-500 mt-2 font-medium">Track automated & manual communications</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 text-gray-100 group-hover:text-gray-200 transition-colors pointer-events-none"><FiMessageSquare size={60} /></div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wider relative z-10">Total Messages</div>
                    <div className="text-3xl lg:text-4xl font-black text-gray-900 relative z-10">{messages.length}</div>
                </div>
                <div className="bg-blue-50 p-5 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 text-blue-100 group-hover:text-blue-200 transition-colors pointer-events-none"><FiShoppingBag size={60} /></div>
                    <div className="text-sm font-bold text-blue-600 uppercase tracking-wider relative z-10">Order Updates</div>
                    <div className="text-3xl lg:text-4xl font-black text-blue-700 relative z-10">
                        {messages.filter(m => ['OrderConfirmation', 'OrderReady', 'DeliveryReminder', 'PaymentReminder'].includes(m.type)).length}
                    </div>
                </div>
                <div className="bg-green-50 p-5 rounded-2xl shadow-sm border border-green-100 flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 text-green-100 group-hover:text-green-200 transition-colors pointer-events-none"><FiCheck size={60} /></div>
                    <div className="text-sm font-bold text-green-600 uppercase tracking-wider relative z-10">Post-Delivery</div>
                    <div className="text-3xl lg:text-4xl font-black text-green-700 relative z-10">
                        {messages.filter(m => m.type === 'PostDelivery').length}
                    </div>
                </div>
                <div className="bg-purple-50 p-5 rounded-2xl shadow-sm border border-purple-100 flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 text-purple-100 group-hover:text-purple-200 transition-colors pointer-events-none"><FiRefreshCw size={60} /></div>
                    <div className="text-sm font-bold text-purple-600 uppercase tracking-wider relative z-10">Re-Engagement</div>
                    <div className="text-3xl lg:text-4xl font-black text-purple-700 relative z-10">
                        {messages.filter(m => ['ReEngagement', 'InactiveClient', 'Feedback'].includes(m.type)).length}
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 sticky top-0 md:top-auto z-40 bg-gray-50/95 backdrop-blur md:bg-transparent py-2 md:py-0 w-full overflow-hidden">
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide px-1">
                    <button
                        onClick={() => setTypeFilter('all')}
                        className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all shadow-sm ${typeFilter === 'all' ? 'bg-gray-900 text-white shadow-gray-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'}`}
                    >
                        All Messages
                    </button>
                    <button
                        onClick={() => setTypeFilter('OrderConfirmation')}
                        className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all shadow-sm ${typeFilter === 'OrderConfirmation' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-100'}`}
                    >
                        Orders
                    </button>
                    <button
                        onClick={() => setTypeFilter('PostDelivery')}
                        className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all shadow-sm ${typeFilter === 'PostDelivery' ? 'bg-green-600 text-white shadow-green-200' : 'bg-white text-gray-600 hover:bg-green-50 border border-gray-100'}`}
                    >
                        Post-Delivery
                    </button>
                    <button
                        onClick={() => setTypeFilter('ReEngagement')}
                        className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all shadow-sm ${typeFilter === 'ReEngagement' ? 'bg-purple-600 text-white shadow-purple-200' : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-100'}`}
                    >
                        Re-Engagement
                    </button>
                </div>

                <div className="hidden md:flex items-center text-sm font-medium text-gray-400">
                    <FiSearch className="mr-2" /> Filtered Results: {filteredMessages.length}
                </div>
            </div>

            {/* Messages List */}
            <div className="space-y-6">
                {filteredMessages.length === 0 ? (
                    <div className="bg-white p-20 rounded-3xl shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                            <FiMessageSquare size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">No messages found</h3>
                        <p className="text-gray-500 mt-2">Try changing the filter or send a new message</p>
                    </div>
                ) : (
                    filteredMessages.map(message => (
                        <div key={message.id} className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">
                            <div className="flex flex-col md:flex-row gap-4">
                                {/* Left: Avatar/Icon */}
                                <div className="hidden md:block">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-md ${getTypeIconClass(message.type)}`}>
                                        <FiSend size={20} />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                                {message.client.name}
                                                <span className={`md:hidden p-1.5 rounded-lg text-white text-xs ${getTypeSolidClass(message.type)}`}><FiSend size={10} /></span>
                                            </h3>
                                            <p className="text-sm font-medium text-gray-500">{message.client.phone}</p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${getTypeColor(message.type)}`}>
                                                {getTypeName(message.type)}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-gray-400">
                                                <FiCalendar size={12} /> {formatDate(message.createdAt)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-xl rounded-tl-none border border-gray-100 text-gray-700 leading-relaxed font-medium relative group-hover:bg-blue-50/30 transition-colors">
                                        <p className="whitespace-pre-wrap text-sm md:text-base">{message.content}</p>
                                    </div>

                                    {/* Footer Stats for Message */}
                                    <div className="mt-3 flex items-center gap-4 text-xs font-bold text-gray-400">
                                        <span className={`flex items-center gap-1 ${message.status === 'Sent' ? 'text-green-600' : 'text-orange-500'}`}>
                                            {message.status === 'Sent' ? <FiCheck className="text-base" /> : <FiClock />}
                                            {message.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
