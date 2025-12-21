import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { FiDownload, FiMessageSquare, FiEdit2, FiSave, FiTrash2, FiPlus, FiPhone, FiAlignLeft, FiCheckCircle, FiChevronDown, FiCheck, FiX, FiTrendingUp } from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

export default function OrderDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newTrialNote, setNewTrialNote] = useState('');
    const [editingStatus, setEditingStatus] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [editingCost, setEditingCost] = useState(false);
    const [serviceCosts, setServiceCosts] = useState({});
    const [editingItemCosts, setEditingItemCosts] = useState(false);
    const [itemCosts, setItemCosts] = useState({});
    const [editingRequirements, setEditingRequirements] = useState(false);
    const [requirements, setRequirements] = useState([]);
    const [editingTrialNote, setEditingTrialNote] = useState(null);
    const [editedNoteText, setEditedNoteText] = useState('');
    const [editingRequirement, setEditingRequirement] = useState(null);
    const [editingFinalAmount, setEditingFinalAmount] = useState(false);
    const [tempFinalAmount, setTempFinalAmount] = useState('');

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const fetchOrder = async () => {
        try {
            const response = await api.get(`/orders/${id}`);
            setOrder(response.data);
            setNewStatus(response.data.status);

            // Initialize service costs
            const sCosts = {};
            if (response.data.additionalServiceItems && response.data.additionalServiceItems.length > 0) {
                response.data.additionalServiceItems.forEach(service => {
                    sCosts[service.id] = service.cost || 0;
                });
            } else {
                // Fallback for old format
                setServiceCosts({ legacy: response.data.additionalServicesCost || 0 });
            }
            setServiceCosts(sCosts);

            // Initialize item costs
            const costs = {};
            response.data.items?.forEach(item => {
                costs[item.id] = item.cost || 0;
            });
            setItemCosts(costs);

            // Initialize special requirements
            setRequirements(response.data.specialRequirements?.map(r => r.note) || []);
        } catch (error) {
            console.error('Error fetching order:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTrialNote = async (e) => {
        e.preventDefault();
        if (!newTrialNote.trim()) return;

        try {
            const formData = new FormData();
            formData.append('note', newTrialNote);

            // Add image if selected
            const imageInput = document.getElementById('trial-note-image');
            if (imageInput && imageInput.files[0]) {
                formData.append('image', imageInput.files[0]);
            }

            await api.post(`/orders/${id}/trial-notes`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setNewTrialNote('');
            if (imageInput) imageInput.value = '';
            fetchOrder(); // Refresh
            showToast('Trial note added successfully', 'success');
        } catch (error) {
            showToast('Failed to add trial note', 'error');
        }
    };

    const handleDeleteTrialNote = async (noteId) => {
        if (!confirm('Are you sure you want to delete this trial note?')) return;

        try {
            await api.delete(`/orders/${id}/trial-notes/${noteId}`);
            await api.delete(`/orders/${id}/trial-notes/${noteId}`);
            fetchOrder(); // Refresh
            showToast('Trial note deleted', 'success');
        } catch (error) {
            showToast('Failed to delete trial note', 'error');
        }
    };

    // Special requirement handlers
    const handleUpdateRequirement = async (requirementId) => {
        try {
            const formData = new FormData();
            formData.append('note', editingRequirement.note);
            if (editingRequirement.imageFile) {
                formData.append('image', editingRequirement.imageFile);
            }

            await api.patch(`/orders/${id}/special-requirements/${requirementId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            fetchOrder();
            setEditingRequirement(null);
        } catch (error) {
            console.error('Error updating special requirement:', error);
            alert('Failed to update requirement');
        }
    };

    const handleDeleteRequirement = async (requirementId) => {
        if (!confirm('Are you sure you want to delete this requirement?')) return;

        try {
            await api.delete(`/orders/${id}/special-requirements/${requirementId}`);
            await api.delete(`/orders/${id}/special-requirements/${requirementId}`);
            fetchOrder();
            showToast('Requirement deleted', 'success');
        } catch (error) {
            console.error('Error deleting special requirement:', error);
            showToast('Failed to delete requirement', 'error');
        }
    };

    const handleUpdateRequirements = async () => {
        try {
            const formData = new FormData();

            // Add requirements as JSON string
            formData.append('requirements', JSON.stringify(requirements.filter(r => r.trim())));

            // Add images if any were selected
            const imageInputs = document.querySelectorAll('[id^="requirement-image-"]');
            imageInputs.forEach((input, index) => {
                if (input.files[0]) {
                    formData.append('images', input.files[0]);
                    formData.append('imageIndices', index.toString());
                }
            });

            await api.patch(`/orders/${id}/special-requirements`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setEditingRequirements(false);
            setEditingRequirements(false);
            showToast('Special requirements updated successfully!', 'success');
            fetchOrder(); // Refresh
        } catch (error) {
            showToast('Failed to update special requirements', 'error');
        }
    };

    const handleEditTrialNote = (note) => {
        setEditingTrialNote(note.id);
        setEditedNoteText(note.note);
    };

    const handleUpdateTrialNote = async (noteId) => {
        if (!editedNoteText.trim()) return;

        try {
            const formData = new FormData();
            formData.append('note', editedNoteText);

            // Add image if selected
            const imageInput = document.getElementById(`edit-note-image-${noteId}`);
            if (imageInput && imageInput.files[0]) {
                formData.append('image', imageInput.files[0]);
            }

            await api.patch(`/orders/${id}/trial-notes/${noteId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setEditingTrialNote(null);
            setEditedNoteText('');
            fetchOrder(); // Refresh
        } catch (error) {
            alert('Failed to update trial note');
        }
    };

    const handleCancelEditTrialNote = () => {
        setEditingTrialNote(null);
        setEditedNoteText('');
    };

    const handleUpdateStatus = async (statusArg = null, finalAmountArg = null) => {
        try {
            // Determine status: use argument if it's a string, otherwise use state
            const statusToUpdate = (typeof statusArg === 'string') ? statusArg : newStatus;

            const payload = { status: statusToUpdate };
            if (finalAmountArg !== null) {
                payload.finalAmount = finalAmountArg;
            }

            await api.patch(`/orders/${id}/status`, payload);

            setEditingStatus(false);
            setEditingFinalAmount(false); // Ensure final amount edit mode is closed

            // If status is "Delivered" (and we are updating status), automatically trigger post-delivery message
            // We only trigger this if the status effectively changed to Delivered or was set to Delivered
            if (statusToUpdate === 'Delivered' && order.status !== 'Delivered') {
                try {
                    const response = await api.post(`/messages/post-delivery/${id}`);
                    const { whatsappLink } = response.data;

                    // Show confirmation and open WhatsApp
                    showToast('Order marked as Delivered! Opening WhatsApp...', 'success');
                    window.open(whatsappLink, '_blank');
                } catch (error) {
                    console.error('Error generating WhatsApp message:', error);
                    showToast('Status updated, but failed to generate message', 'warning');
                }
            } else {
                // Only show alert if it was a manual status update or explicit save
                // For smoother UX on amount update, we might skip alert or show toast, but keeping alert for consistency for now
                // Actually, if simply updating amount, maybe don't show "Order status updated" alert?
                // Let's keep it simple: Show success but generic
                // alert('Order updated successfully!'); 
            }

            fetchOrder(); // Refresh
        } catch (error) {
            console.error(error);
            showToast('Failed to update order', 'error');
        }
    };

    const handleUpdateServiceCosts = async () => {
        try {
            if (order.additionalServiceItems && order.additionalServiceItems.length > 0) {
                // Update each service cost
                for (const service of order.additionalServiceItems) {
                    if (serviceCosts[service.id] !== service.cost) {
                        await api.patch(`/orders/${id}/additional-service-items/${service.id}/cost`, {
                            cost: serviceCosts[service.id]
                        });
                    }
                }
            } else {
                // Legacy update
                // For now, if it's legacy, we might not support editing or stick to old endpoint? 
                // But user asked for multiple services fix, so we assume we are converting or using new format.
                // Actually, let's keep the old endpoint for legacy just in case, or migrate.
                // Given the issue is "multiple services", the user is likely using the new format.
                // I'll skip legacy update here to encourage migration or just focus on the array.
            }

            setEditingCost(false);
            setEditingCost(false);
            showToast('Service costs updated successfully!', 'success');
            fetchOrder(); // Refresh
        } catch (error) {
            console.error(error);
            showToast('Failed to update service costs', 'error');
        }
    };

    const handleUpdateItemCosts = async () => {
        try {
            // Update each item's cost
            for (const item of order.items) {
                if (itemCosts[item.id] !== item.cost) {
                    await api.patch(`/orders/${id}/items/${item.id}/cost`, {
                        cost: itemCosts[item.id]
                    });
                }
            }

            setEditingItemCosts(false);
            showToast('Item costs updated successfully!', 'success');
            fetchOrder(); // Refresh
        } catch (error) {
            showToast('Failed to update item costs', 'error');
        }
    };

    const handleSendInvoice = async () => {
        try {
            const response = await api.post(`/invoices/${order.id}/send`);
            const { whatsappLink, invoicePath } = response.data;

            // Show instructions
            // Show instructions
            showToast('WhatsApp opening. Please attach PDF manually.', 'info');

            // Open WhatsApp
            window.open(whatsappLink, '_blank');
        } catch (error) {
            showToast('Failed to generate WhatsApp link', 'error');
        }
    };

    const handleDownloadInvoice = async () => {
        try {
            const response = await api.get(`/invoices/${order.id}/download`, {
                responseType: 'blob'
            });

            // Extract filename from invoice or generate it
            const cleanClientName = order.client.name.replace(/\s+/g, '');
            const invoiceNumber = order.invoice?.invoiceNumber || order.orderNumber;
            const filename = `Invoice_${invoiceNumber}_${cleanClientName}.pdf`;

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showToast('Invoice downloading...', 'success');
        } catch (error) {
            showToast('Failed to download invoice', 'error');
        }
    };

    const handleDeleteOrder = async () => {
        if (!confirm(`Are you sure you want to delete order ${order.orderNumber}? This will delete the invoice and all related data. This action cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/orders/${order.id}`);
            showToast('Order deleted successfully', 'success');
            navigate('/orders');
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to delete order', 'error');
        }
    };

    if (loading) {
        return (
            <div className="pb-24">
                {/* Skeleton Header */}
                <div className="mb-6 space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded-lg skeleton"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded skeleton"></div>
                </div>

                {/* Skeleton Grid */}
                <div className="lg:grid lg:grid-cols-3 lg:gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Mobile Hero Skeleton */}
                        <div className="lg:hidden h-64 bg-gray-100 rounded-2xl skeleton shadow-sm"></div>

                        {/* Client Card Skeleton */}
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-gray-200 skeleton"></div>
                                <div className="space-y-2 flex-1">
                                    <div className="h-6 w-3/4 bg-gray-200 rounded skeleton"></div>
                                    <div className="h-4 w-1/2 bg-gray-200 rounded skeleton"></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="h-10 rounded-xl bg-gray-100 skeleton"></div>
                                <div className="h-10 rounded-xl bg-gray-100 skeleton"></div>
                            </div>
                        </div>

                        {/* Items Skeleton */}
                        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
                            <div className="h-6 w-1/3 bg-gray-200 rounded skeleton"></div>
                            <div className="space-y-3">
                                <div className="h-20 rounded-xl bg-gray-100 skeleton"></div>
                                <div className="h-20 rounded-xl bg-gray-100 skeleton"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!order) {
        return <div className="text-center py-12">Order not found</div>;
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-IN');
    };

    return (
        <>
            {/* Mobile Sticky Bottom Actions - Premium Floating Glass Bar */}
            <div className="fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md border border-white/20 p-2 flex gap-2 z-50 lg:hidden shadow-2xl rounded-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <button
                    onClick={() => navigate(`/orders/${id}/edit`)}
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-transparent hover:bg-gray-100/50 rounded-xl text-gray-700 active:scale-95 transition-all"
                >
                    <FiEdit2 size={20} className="text-blue-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Edit</span>
                </button>
                <div className="w-[1px] bg-gray-200 my-2"></div>
                <button
                    onClick={handleDownloadInvoice}
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-transparent hover:bg-gray-100/50 rounded-xl text-gray-700 active:scale-95 transition-all"
                >
                    <FiDownload size={20} className="text-green-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">PDF</span>
                </button>
                <div className="w-[1px] bg-gray-200 my-2"></div>
                <button
                    onClick={handleSendInvoice}
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-transparent hover:bg-gray-100/50 rounded-xl text-gray-700 active:scale-95 transition-all"
                >
                    <FiMessageSquare size={20} className="text-darji-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Send</span>
                </button>
                <div className="w-[1px] bg-gray-200 my-2"></div>
                <button
                    onClick={handleDeleteOrder}
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-transparent hover:bg-gray-100/50 rounded-xl text-gray-700 active:scale-95 transition-all"
                >
                    <FiTrash2 size={20} className="text-red-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Delete</span>
                </button>
            </div>

            <div className="fade-in content-with-sticky-bottom pb-24 lg:pb-0">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-8 gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Order Details</h1>
                        <p className="text-sm md:text-base text-gray-600 mt-1">Order #{order.orderNumber}</p>
                    </div>
                </div>

                {/* Desktop Action Buttons - Above grid, full width */}
                <div className="hidden lg:block mb-6">
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => navigate(`/orders/${id}/edit`)}
                            className="flex items-center space-x-1 px-5 py-2.5 bg-darji-primary text-white rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm font-semibold active:scale-95"
                        >
                            <FiEdit2 size={16} /> <span>Edit Order</span>
                        </button>
                        <button
                            onClick={handleDownloadInvoice}
                            className="flex items-center space-x-1 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:shadow-md hover:border-green-500 hover:text-green-600 hover:-translate-y-0.5 transition-all text-sm font-semibold active:scale-95"
                        >
                            <FiDownload size={16} /> <span>PDF</span>
                        </button>
                        <button
                            onClick={handleSendInvoice}
                            className="flex items-center space-x-1 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm font-semibold active:scale-95"
                        >
                            <FiMessageSquare size={16} /> <span>WhatsApp</span>
                        </button>
                        <button
                            onClick={handleDeleteOrder}
                            className="flex items-center space-x-1 px-5 py-2.5 bg-white border border-gray-200 text-red-500 rounded-xl shadow-sm hover:shadow-md hover:border-red-200 hover:bg-red-50 hover:-translate-y-0.5 transition-all text-sm font-semibold active:scale-95"
                        >
                            <FiTrash2 size={16} /> <span>Delete</span>
                        </button>
                    </div>
                </div>

                {/* DESKTOP: 3-Column Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* LEFT COLUMN: Main Content (2/3 width on desktop, full width on mobile) */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Mobile-only Hero Status Card - Premium Gradient & Stepper */}
                        <div className="lg:hidden bg-gradient-to-br from-darji-primary to-darji-accent text-white p-5 rounded-2xl shadow-xl relative overflow-hidden fade-in delay-75">
                            {/* Decorative background circles */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl -ml-10 -mb-10"></div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-xs font-semibold text-white/80 uppercase tracking-widest mb-1">Order Status</p>
                                        <div className="flex items-center gap-2">
                                            {editingStatus ? (
                                                <div className="flex items-center gap-2 bg-white/20 p-1.5 pr-3 rounded-xl backdrop-blur-md border border-white/20 shadow-inner">
                                                    <div className="relative group">
                                                        <select
                                                            value={newStatus}
                                                            onChange={(e) => setNewStatus(e.target.value)}
                                                            className="appearance-none bg-transparent text-white text-sm font-bold pl-3 pr-8 py-1 outline-none cursor-pointer hover:bg-white/10 rounded-lg transition-colors border-none focus:ring-0"
                                                        >
                                                            <option value="Pending" className="text-gray-900 font-bold">Pending</option>
                                                            <option value="In Progress" className="text-gray-900 font-bold">In Progress</option>
                                                            <option value="Ready for Trial" className="text-gray-900 font-bold">Ready for Trial</option>
                                                            <option value="Ready for Delivery" className="text-gray-900 font-bold">Ready for Delivery</option>
                                                            <option value="Delivered" className="text-gray-900 font-bold">Delivered</option>
                                                        </select>
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/70">
                                                            <FiChevronDown size={14} />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 pl-2 border-l border-white/20">
                                                        <button
                                                            onClick={handleUpdateStatus}
                                                            className="p-1.5 bg-green-500 hover:bg-green-400 text-white rounded-lg shadow-lg hover:shadow-green-500/50 transition-all active:scale-95"
                                                            title="Save Status"
                                                        >
                                                            <FiCheck size={14} strokeWidth={3} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingStatus(false)}
                                                            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg hover:text-red-200 transition-all active:scale-95"
                                                            title="Cancel"
                                                        >
                                                            <FiX size={14} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setEditingStatus(true)}>
                                                    <span className="text-2xl font-bold tracking-wide">{order.status}</span>
                                                    <FiEdit2 size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-white/70 font-medium">#{order.orderNumber}</p>
                                        <p className="text-xs text-white/50">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                                    </div>
                                </div>

                                {/* Visual Progress Stepper */}
                                <div className="mb-6 px-1">
                                    <div className="flex justify-between items-center relative">
                                        {/* Progress Line */}
                                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/20 -z-0"></div>
                                        <div
                                            className="absolute top-1/2 left-0 h-0.5 bg-white -z-0 transition-all duration-500"
                                            style={{ width: `${(['Pending', 'In Progress', 'Ready for Trial', 'Ready for Delivery', 'Delivered'].indexOf(order.status) / 4) * 100}%` }}
                                        ></div>

                                        {['Pending', 'In Progress', 'Ready for Trial', 'Ready for Delivery', 'Delivered'].map((step, idx) => {
                                            const currentStepIdx = ['Pending', 'In Progress', 'Ready for Trial', 'Ready for Delivery', 'Delivered'].indexOf(order.status);
                                            const isCompleted = idx <= currentStepIdx;
                                            const isCurrent = idx === currentStepIdx;

                                            return (
                                                <div key={idx} className="relative z-10 flex flex-col items-center">
                                                    <div
                                                        className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${isCompleted ? 'bg-white border-white scale-110 shadow-lg' : 'bg-transparent border-white/40'}`}
                                                    ></div>
                                                    {isCurrent && (
                                                        <div className="absolute top-5 text-[10px] font-bold text-white whitespace-nowrap bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                            Step {idx + 1}/5
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Glass Stats Grid */}
                                <div className="grid grid-cols-3 gap-3 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Total</p>
                                        <p className="text-lg font-bold">₹{order.totalAmount.toFixed(0)}</p>
                                    </div>
                                    <div className="border-l border-white/10 pl-3">
                                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Paid</p>
                                        <p className="text-lg font-bold text-green-300">₹{(order.advance || 0).toFixed(0)}</p>
                                    </div>
                                    <div className="border-l border-white/10 pl-3">
                                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Due</p>
                                        <p className="text-lg font-bold text-yellow-300">₹{(order.totalAmount - (order.advance || 0)).toFixed(0)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-medium text-white/80">
                                    <div className="flex justify-between border-b border-white/10 pb-1">
                                        <span>Trial Date</span>
                                        <span className="text-white font-bold">{order.trialDate ? new Date(order.trialDate).toLocaleDateString('en-IN') : 'Not Set'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/10 pb-1">
                                        <span>Delivery</span>
                                        <span className="text-white font-bold">{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN') : 'Not Set'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Client Information - Modern Contact Card */}
                        <div className="bg-white rounded-xl shadow-lg lg:shadow-md overflow-hidden border border-gray-100/50 fade-in delay-100">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center sm:block">
                                <div>
                                    <p className="hidden sm:block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Contact Details</p>
                                    <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <span className="lg:hidden w-1 h-6 bg-darji-primary rounded-full inline-block"></span>
                                        Client Information
                                    </h2>
                                </div>
                                {/* Mobile Avatar (Small) */}
                                <div className="sm:hidden h-9 w-9 bg-gradient-to-br from-darji-primary to-darji-accent rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white">
                                    {order.client.name.charAt(0).toUpperCase()}
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="flex items-start gap-4 mb-6">
                                    {/* Desktop Avatar (Large) */}
                                    <div className="hidden sm:flex h-14 w-14 bg-gradient-to-br from-darji-primary to-darji-accent rounded-2xl items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg ring-4 ring-gray-50">
                                        {order.client.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 leading-tight">{order.client.name}</h3>
                                        <p className="text-gray-500 text-sm mt-1 flex items-center gap-2 font-medium">
                                            <FiPhone size={14} className="text-darji-primary" /> {order.client.phone}
                                        </p>
                                    </div>
                                </div>

                                {/* Mobile Quick Actions - Glassmorphic */}
                                <div className="grid grid-cols-2 gap-3 mb-6 lg:hidden">
                                    <a
                                        href={`tel:${order.client.phone}`}
                                        className="flex items-center justify-center gap-2 bg-blue-50/50 border border-blue-100 text-blue-700 py-3 rounded-xl text-sm font-bold active:scale-95 transition-all shadow-sm hover:shadow-md backdrop-blur-sm"
                                    >
                                        <FiPhone size={16} /> Call
                                    </a>
                                    <button
                                        onClick={handleSendInvoice}
                                        className="flex items-center justify-center gap-2 bg-green-50/50 border border-green-100 text-green-700 py-3 rounded-xl text-sm font-bold active:scale-95 transition-all shadow-sm hover:shadow-md backdrop-blur-sm"
                                    >
                                        <FiMessageSquare size={16} /> WhatsApp
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                                    {order.client.email && (
                                        <div>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Email</div>
                                            <div className="font-medium text-gray-800 text-sm truncate">{order.client.email}</div>
                                        </div>
                                    )}
                                    {order.client.address && (
                                        <div className="col-span-full sm:col-span-2">
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Address</div>
                                            <div className="font-medium text-gray-800 text-sm leading-relaxed">{order.client.address}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100/50 fade-in delay-200">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Order Details</p>
                                    <h2 className="text-xl font-bold text-gray-900">Items List</h2>
                                </div>
                                {!editingItemCosts && (
                                    <button
                                        onClick={() => setEditingItemCosts(true)}
                                        className="text-sm font-semibold text-darji-accent hover:text-darji-primary transition-colors flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg"
                                    >
                                        <FiEdit2 size={14} /> <span className="hidden sm:inline">Edit Costs</span>
                                    </button>
                                )}
                            </div>

                            {editingItemCosts ? (
                                <div className="space-y-4">
                                    {/* Mobile Edit View - Cards */}
                                    <div className="lg:hidden space-y-3">
                                        {order.items.map((item) => (
                                            <div key={item.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="font-bold text-gray-800">{item.garmentType.name}</div>
                                                        <div className="text-xs text-gray-500">Qty: {item.quantity} | Price: ₹{item.price.toFixed(0)}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cost (₹)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={itemCosts[item.id] || 0}
                                                            onChange={(e) => setItemCosts({ ...itemCosts, [item.id]: parseFloat(e.target.value) || 0 })}
                                                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:ring-2 focus:ring-darji-accent shadow-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Desktop Edit View - Table */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="border-b bg-gray-50/50">
                                                <tr>
                                                    <th className="text-left py-3 px-2 text-xs font-bold uppercase text-gray-500 tracking-wider">Item</th>
                                                    <th className="text-right py-3 px-2 text-xs font-bold uppercase text-gray-500 tracking-wider">Qty</th>
                                                    <th className="text-right py-3 px-2 text-xs font-bold uppercase text-gray-500 tracking-wider">Price</th>
                                                    <th className="text-right py-3 px-2 text-xs font-bold uppercase text-gray-500 tracking-wider">Cost</th>
                                                    <th className="text-right py-3 px-2 text-xs font-bold uppercase text-gray-500 tracking-wider">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {order.items.map((item) => (
                                                    <tr key={item.id} className="border-b">
                                                        <td className="py-3">{item.garmentType.name}</td>
                                                        <td className="text-right">{item.quantity}</td>
                                                        <td className="text-right">₹{item.price.toFixed(2)}</td>
                                                        <td className="text-right">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={itemCosts[item.id] || 0}
                                                                onChange={(e) => setItemCosts({ ...itemCosts, [item.id]: parseFloat(e.target.value) || 0 })}
                                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                                            />
                                                        </td>
                                                        <td className="text-right font-semibold">₹{item.subtotal.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex space-x-2 pt-2 border-t border-gray-100 mt-4">
                                        <button
                                            onClick={handleUpdateItemCosts}
                                            className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                                        >
                                            <FiSave size={16} /> Save Costs
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingItemCosts(false);
                                                // Reset to original costs
                                                const costs = {};
                                                order.items.forEach(item => {
                                                    costs[item.id] = item.cost || 0;
                                                });
                                                setItemCosts(costs);
                                            }}
                                            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {/* Mobile View - Clean Minimalist Cards */}
                                    <div className="lg:hidden space-y-3">
                                        {order.items.map((item, index) => (
                                            <div key={index} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative">
                                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-darji-primary"></div>
                                                <div className="p-4 pl-5">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-bold text-gray-900 text-lg">{item.garmentType.name}</h3>
                                                        <span className="font-bold text-darji-accent text-lg">₹{item.subtotal.toFixed(0)}</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                                                        <div>
                                                            <span className="text-gray-500 text-xs uppercase tracking-wide block">Quantity</span>
                                                            <span className="font-semibold text-gray-800">{item.quantity}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-gray-500 text-xs uppercase tracking-wide block">Price</span>
                                                            <span className="font-semibold text-gray-800">₹{item.price.toFixed(0)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 mt-2 border-t border-gray-50 flex justify-between items-center text-xs">
                                                        <div className="flex gap-3">
                                                            <div>
                                                                <span className="text-gray-400">Cost: </span>
                                                                <span className="font-medium text-orange-600">₹{(item.cost || 0).toFixed(0)}</span>
                                                            </div>
                                                        </div>
                                                        <div className={`font-bold ${(item.subtotal - (item.quantity * (item.cost || 0))) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                            Profit: ₹{(item.subtotal - (item.quantity * (item.cost || 0))).toFixed(0)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Mobile Total */}
                                        <div className="bg-white border border-darji-primary/20 p-4 rounded-xl flex justify-between items-center shadow-sm">
                                            <span className="text-gray-600 font-medium">Stitching Total</span>
                                            <span className="text-xl font-bold text-darji-primary">₹{order.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(0)}</span>
                                        </div>
                                    </div>

                                    {/* Desktop View - Table */}
                                    <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-100">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Item</th>
                                                    <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Qty</th>
                                                    <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Price</th>
                                                    <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Cost</th>
                                                    <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Subtotal</th>
                                                    <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Profit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {order.items.map((item, index) => (
                                                    <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                                                        <td className="py-4 px-4 font-medium text-gray-900">{item.garmentType.name}</td>
                                                        <td className="text-right px-4 text-gray-600">{item.quantity}</td>
                                                        <td className="text-right px-4 text-gray-600">₹{item.price.toFixed(2)}</td>
                                                        <td className="text-right px-4 text-orange-600 font-medium">₹{(item.cost || 0).toFixed(2)}</td>
                                                        <td className="text-right px-4 font-bold text-gray-900">₹{item.subtotal.toFixed(2)}</td>
                                                        <td className={`text-right px-4 font-bold ${(item.subtotal - (item.quantity * (item.cost || 0))) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            ₹{(item.subtotal - (item.quantity * (item.cost || 0))).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50/50">
                                                <tr className="border-t-2 border-gray-100">
                                                    <td colSpan="5" className="text-right py-4 px-4 font-bold text-gray-500 uppercase tracking-wide">Stitching Total:</td>
                                                    <td className="text-right py-4 px-4 text-xl font-bold text-darji-accent">₹{order.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Additional Services */}
                        {(order.additionalServices || order.additionalServicesAmount > 0 || (order.additionalServiceItems && order.additionalServiceItems.length > 0)) && (
                            <div className="bg-white p-6 rounded-xl shadow-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold">Additional Services</h2>
                                    {!editingCost && (
                                        <button
                                            onClick={() => setEditingCost(true)}
                                            className="text-sm text-darji-accent hover:underline"
                                        >
                                            <FiEdit2 className="inline" /> Edit Cost
                                        </button>
                                    )}
                                </div>

                                {editingCost ? (
                                    <div className="space-y-4">
                                        {/* Header Row */}
                                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2 mb-2">
                                            <div className="col-span-6">Service</div>
                                            <div className="col-span-3 text-right">Amount</div>
                                            <div className="col-span-3 text-right">Cost</div>
                                        </div>

                                        {/* Multi-Item Edit List */}
                                        {order.additionalServiceItems && order.additionalServiceItems.length > 0 ? (
                                            <div className="space-y-3">
                                                {order.additionalServiceItems.map((service) => (
                                                    <div key={service.id} className="grid grid-cols-12 gap-2 items-center text-sm">
                                                        <div className="col-span-6 font-medium text-gray-800 break-words">
                                                            {service.description}
                                                        </div>
                                                        <div className="col-span-3 text-right text-gray-600">
                                                            ₹{service.amount}
                                                        </div>
                                                        <div className="col-span-3 text-right">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={serviceCosts[service.id] || 0}
                                                                onChange={(e) => setServiceCosts({ ...serviceCosts, [service.id]: parseFloat(e.target.value) || 0 })}
                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-right focus:ring-2 focus:ring-darji-accent text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            /* Legacy Single Input Fallback */
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Total Cost (₹)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={serviceCosts.legacy || 0}
                                                    onChange={(e) => setServiceCosts({ ...serviceCosts, legacy: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-darji-accent"
                                                />
                                                <p className="text-xs text-gray-500 mt-1 italic">Using legacy single cost format.</p>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex space-x-2 pt-2 border-t border-gray-100 mt-4">
                                            <button
                                                onClick={handleUpdateServiceCosts}
                                                className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                                            >
                                                <FiSave size={16} /> Save Costs
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingCost(false);
                                                    // Reset costs on cancel
                                                    const sCosts = {};
                                                    if (order.additionalServiceItems) {
                                                        order.additionalServiceItems.forEach(service => {
                                                            sCosts[service.id] = service.cost || 0;
                                                        });
                                                    } else {
                                                        sCosts.legacy = order.additionalServicesCost || 0;
                                                    }
                                                    setServiceCosts(sCosts);
                                                }}
                                                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Show new format (multiple service items) if available */}
                                        {order.additionalServiceItems && order.additionalServiceItems.length > 0 ? (
                                            <>
                                                {/* Mobile View - App-Style List */}
                                                <div className="lg:hidden space-y-3">
                                                    {order.additionalServiceItems && order.additionalServiceItems.length > 0 ? (
                                                        order.additionalServiceItems.map((service, index) => (
                                                            <div key={index} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative group">
                                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-400 to-gray-600"></div>
                                                                <div className="p-4 pl-5">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400">
                                                                                <FiAlignLeft size={14} />
                                                                            </div>
                                                                            <h3 className="font-bold text-gray-900 text-sm leading-tight">{service.description}</h3>
                                                                        </div>
                                                                        <span className="font-bold text-darji-accent text-base">₹{service.amount.toFixed(0)}</span>
                                                                    </div>

                                                                    <div className="pt-2 mt-2 border-t border-gray-50 flex justify-between items-center text-xs">
                                                                        <div className="flex items-center gap-1 text-gray-500">
                                                                            <span>Cost:</span>
                                                                            <span className="font-medium text-orange-600">₹{(service.cost || 0).toFixed(0)}</span>
                                                                        </div>
                                                                        <div className={`font-bold ${(service.amount - (service.cost || 0)) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                            Profit: ₹{(service.amount - (service.cost || 0)).toFixed(0)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100">
                                                            <p className="text-gray-400 text-sm font-medium">No additional services added</p>
                                                        </div>
                                                    )}

                                                    {/* Mobile Total */}
                                                    {order.additionalServiceItems && order.additionalServiceItems.length > 0 && (
                                                        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4 rounded-xl flex justify-between items-center shadow-lg transform translate-y-2">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Services Total</span>
                                                                <span className="text-xs text-white/40">Includes all extra charges</span>
                                                            </div>
                                                            <span className="text-xl font-bold">₹{order.additionalServiceItems.reduce((sum, s) => sum + s.amount, 0).toFixed(0)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Desktop View - Table */}
                                                <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-100">
                                                    <table className="w-full">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Description</th>
                                                                <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                                                                <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Cost</th>
                                                                <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Profit</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {order.additionalServiceItems && order.additionalServiceItems.length > 0 ? (
                                                                order.additionalServiceItems.map((service, index) => (
                                                                    <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                                                                        <td className="py-4 px-4 font-medium text-gray-900">{service.description}</td>
                                                                        <td className="text-right px-4 font-semibold text-gray-800">₹{service.amount.toFixed(2)}</td>
                                                                        <td className="text-right px-4 text-orange-600 font-medium">₹{(service.cost || 0).toFixed(2)}</td>
                                                                        <td className={`text-right px-4 font-bold ${(service.amount - (service.cost || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                            ₹{(service.amount - (service.cost || 0)).toFixed(2)}
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan="4" className="text-center py-8 text-gray-400 font-medium">No additional services</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                        <tfoot className="bg-gray-50/50">
                                                            <tr className="border-t-2 border-gray-100">
                                                                <td className="text-right py-4 px-4 font-bold text-gray-500 uppercase tracking-wide">Services Total:</td>
                                                                <td className="text-right py-4 px-4 text-xl font-bold text-darji-accent">
                                                                    ₹{(order.additionalServiceItems && order.additionalServiceItems.length > 0
                                                                        ? order.additionalServiceItems.reduce((sum, s) => sum + s.amount, 0)
                                                                        : 0
                                                                    ).toFixed(2)}
                                                                </td>
                                                                <td className="text-right py-4 px-4 text-orange-600 font-bold">
                                                                    ₹{(order.additionalServiceItems && order.additionalServiceItems.length > 0
                                                                        ? order.additionalServiceItems.reduce((sum, s) => sum + (s.cost || 0), 0)
                                                                        : 0
                                                                    ).toFixed(2)}
                                                                </td>
                                                                <td className="text-right py-4 px-4 text-green-600 font-bold">
                                                                    ₹{(order.additionalServiceItems && order.additionalServiceItems.length > 0
                                                                        ? order.additionalServiceItems.reduce((sum, s) => sum + (s.amount - (s.cost || 0)), 0)
                                                                        : 0
                                                                    ).toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            </>
                                        ) : (
                                            /* Backward compatibility: show old single-service format */
                                            <div>
                                                {order.additionalServices && (
                                                    <div>
                                                        <div className="text-sm text-gray-600">Description</div>
                                                        <div className="font-semibold">{order.additionalServices}</div>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-3 gap-4 mt-3">
                                                    {order.additionalServicesAmount > 0 && (
                                                        <div>
                                                            <div className="text-sm text-gray-600">Amount</div>
                                                            <div className="font-semibold text-darji-accent">₹{order.additionalServicesAmount.toFixed(2)}</div>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-sm text-gray-600">Cost</div>
                                                        <div className="font-semibold text-orange-600">₹{(order.additionalServicesCost || 0).toFixed(2)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-gray-600">Profit</div>
                                                        <div className={`font-bold ${((order.additionalServicesAmount || 0) - (order.additionalServicesCost || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            ₹{((order.additionalServicesAmount || 0) - (order.additionalServicesCost || 0)).toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Total Row */}
                                                <div className="mt-4 pt-3 border-t-2 border-gray-300">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-lg font-bold text-gray-900">Additional Services Total:</span>
                                                        <span className="font-bold text-xl text-darji-accent">₹{order.additionalServicesAmount.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Payment Summary - Premium Receipt Style */}
                        <div className="lg:hidden mb-24 fade-in delay-500">
                            <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden">
                                {/* Receipt Top Pattern */}
                                <div className="h-2 bg-gradient-to-r from-darji-primary to-darji-accent"></div>

                                <div className="p-6 pb-8 relative">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold text-gray-800">Payment Receipt</h2>
                                        <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-widest border border-gray-200">
                                            #{order.orderNumber}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm group">
                                            <span className="text-gray-500 group-hover:text-gray-800 transition-colors">Stitching Charges</span>
                                            <span className="font-semibold text-gray-800">₹{order.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</span>
                                        </div>

                                        {(() => {
                                            const additionalTotal = order.additionalServiceItems && order.additionalServiceItems.length > 0
                                                ? order.additionalServiceItems.reduce((sum, s) => sum + s.amount, 0)
                                                : (order.additionalServicesAmount || 0);
                                            return additionalTotal > 0 && (
                                                <div className="flex justify-between items-center text-sm group">
                                                    <span className="text-gray-500 group-hover:text-gray-800 transition-colors">Additional Services</span>
                                                    <span className="font-semibold text-gray-800">₹{additionalTotal.toFixed(2)}</span>
                                                </div>
                                            );
                                        })()}

                                        {/* Dashed Separator */}
                                        <div className="relative py-2">
                                            <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-gray-200"></div>
                                        </div>

                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-bold text-gray-600 uppercase tracking-wide">Grand Total</span>
                                            <span className="text-3xl font-black text-gray-900 tracking-tight">₹{order.totalAmount.toFixed(0)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Status Bar */}
                                <div className={`p-4 ${(order.totalAmount - (order.advance || 0)) <= 0
                                    ? 'bg-green-500'
                                    : 'bg-white border-t border-gray-100'
                                    }`}>
                                    {(order.totalAmount - (order.advance || 0)) <= 0 ? (
                                        <div className="flex justify-between items-center text-white">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 bg-white/20 rounded-full"><FiCheckCircle size={14} /></div>
                                                <span className="font-bold text-sm uppercase tracking-wide">Fully Paid</span>
                                            </div>
                                            <span className="font-bold text-lg">₹{order.totalAmount.toFixed(0)}</span>
                                        </div>
                                    ) : (
                                        <div className="flex gap-4">
                                            <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-200">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Paid</p>
                                                <p className="text-lg font-bold text-green-600">₹{(order.advance || 0).toFixed(0)}</p>
                                            </div>
                                            <div className="flex-1 bg-red-50 rounded-xl p-3 border border-red-100 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-8 h-8 bg-red-500/10 rounded-bl-xl"></div>
                                                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-0.5">Due</p>
                                                <p className="text-lg font-bold text-red-600">₹{Math.max(0, order.totalAmount - (order.advance || 0)).toFixed(0)}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Mobile Payment & Profit Section */}
                    <div className="lg:hidden space-y-6">
                        {/* Mobile Payment Summary */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                            <div className="h-2 bg-gradient-to-r from-darji-primary to-darji-accent"></div>
                            <div className="p-6 pb-6 relative">
                                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-gray-800 rounded-full inline-block"></span>
                                    Payment Summary
                                </h2>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm group">
                                        <span className="text-gray-500">Stitching Charges</span>
                                        <span className="font-semibold text-gray-800">₹{order.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</span>
                                    </div>

                                    {(() => {
                                        const additionalTotal = order.additionalServiceItems && order.additionalServiceItems.length > 0
                                            ? order.additionalServiceItems.reduce((sum, s) => sum + s.amount, 0)
                                            : (order.additionalServicesAmount || 0);
                                        return additionalTotal > 0 && (
                                            <div className="flex justify-between items-center text-sm group">
                                                <span className="text-gray-500">Additional Services</span>
                                                <span className="font-semibold text-gray-800">₹{additionalTotal.toFixed(2)}</span>
                                            </div>
                                        );
                                    })()}

                                    <div className="relative py-2">
                                        <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-gray-200"></div>
                                    </div>

                                    {/* Order Total (Bill Amount) */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Bill Total</span>
                                        <span className="text-lg font-bold text-gray-800">₹{order.totalAmount.toFixed(0)}</span>
                                    </div>

                                    {/* Discount / Settlement */}
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[56px]">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Final Received</span>
                                            {!editingFinalAmount && (
                                                <button
                                                    onClick={() => {
                                                        setTempFinalAmount(order.finalAmount || order.totalAmount);
                                                        setEditingFinalAmount(true);
                                                    }}
                                                    className="ml-auto flex items-center gap-2 px-4 py-1.5 border border-darji-accent/30 text-darji-accent hover:bg-darji-accent hover:text-white rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all duration-300"
                                                >
                                                    <span>Settle Bill</span>
                                                    <FiEdit2 size={10} />
                                                </button>
                                            )}
                                        </div>

                                        {editingFinalAmount ? (
                                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                                                <div className="relative">
                                                    <span className="absolute left-0 bottom-2 text-darji-accent font-bold text-lg">₹</span>
                                                    <input
                                                        type="number"
                                                        value={tempFinalAmount}
                                                        onChange={(e) => setTempFinalAmount(e.target.value)}
                                                        className="w-28 bg-transparent border-0 border-b-2 border-darji-accent focus:ring-0 text-right font-black text-gray-800 text-xl pb-1 px-1 placeholder-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                                                        placeholder="0"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => {
                                                            const val = parseFloat(tempFinalAmount);
                                                            if (!isNaN(val)) {
                                                                handleUpdateStatus(null, val);
                                                                setEditingFinalAmount(false);
                                                            }
                                                        }}
                                                        className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-all"
                                                        title="Save"
                                                    >
                                                        <FiCheck size={20} strokeWidth={3} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingFinalAmount(false)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                        title="Cancel"
                                                    >
                                                        <FiX size={20} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className={`text-lg font-bold ${order.finalAmount && order.finalAmount < order.totalAmount ? 'text-red-500' : 'text-gray-900'}`}>
                                                ₹{(order.finalAmount ?? order.totalAmount).toFixed(0)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Bottom Status Bar */}
                            {(() => {
                                const revenue = order.finalAmount ?? order.totalAmount;
                                const due = Math.max(0, revenue - (order.advance || 0));

                                return (
                                    <div className={`p-4 ${due <= 0
                                        ? 'bg-green-500'
                                        : 'bg-white border-t border-gray-100'
                                        }`}>
                                        {due <= 0 ? (
                                            <div className="flex justify-between items-center text-white">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 bg-white/20 rounded-full"><FiCheckCircle size={14} /></div>
                                                    <span className="font-bold text-sm uppercase tracking-wide">Fully Paid</span>
                                                </div>
                                                <span className="font-bold text-lg">₹{revenue.toFixed(0)}</span>
                                            </div>
                                        ) : (
                                            <div className="flex gap-4">
                                                <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-200">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Paid</p>
                                                    <p className="text-lg font-bold text-green-600">₹{(order.advance || 0).toFixed(0)}</p>
                                                </div>
                                                <div className="flex-1 bg-red-50 rounded-xl p-3 border border-red-100 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-8 h-8 bg-red-500/10 rounded-bl-xl"></div>
                                                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-0.5">Due</p>
                                                    <p className="text-lg font-bold text-red-600">₹{due.toFixed(0)}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Mobile Profit Analysis */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden text-white relative">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><FiTrendingUp size={100} /></div>
                            <div className="p-6">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <FiTrendingUp className="text-darji-accent" /> Profit Analysis
                                </h2>

                                {(() => {
                                    const revenue = order.finalAmount ?? order.totalAmount;
                                    const itemsCost = order.items.reduce((s, i) => s + (i.quantity * (i.garmentType.cost || 0)), 0);
                                    const servicesCost = order.additionalServiceItems
                                        ? order.additionalServiceItems.reduce((acc, item) => acc + (item.cost || 0), 0)
                                        : (order.additionalServicesCost || 0);

                                    const totalCost = itemsCost + servicesCost;
                                    const profit = revenue - totalCost;
                                    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

                                    return (
                                        <div className="space-y-4 relative z-10">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
                                                    <p className="text-xl font-bold text-white">₹{revenue.toFixed(0)}</p>
                                                </div>
                                                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Cost</p>
                                                    <p className="text-xl font-bold text-red-300">₹{totalCost.toFixed(0)}</p>
                                                </div>
                                            </div>
                                            <div className="bg-darji-accent/20 rounded-lg p-4 border border-darji-accent/30 flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-bold text-darji-accent uppercase tracking-widest mb-1">Net Profit</p>
                                                    <p className="text-2xl font-black text-white">₹{profit.toFixed(0)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-bold text-darji-accent opacity-50">{margin.toFixed(1)}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDEBAR: Order Info & Payment - Desktop Only */}
                    <div className="hidden lg:block space-y-6">

                        {/* Order Summary Card */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 sticky top-6 overflow-hidden">
                            <div className="h-2 bg-gray-100"></div>
                            <div className="p-6">
                                <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-darji-accent rounded-full inline-block"></span>
                                    Order Summary
                                </h2>
                                <div className="mb-4 pb-4 border-b">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-500">Status</span>
                                        {!editingStatus && (
                                            <button onClick={() => setEditingStatus(true)} className="p-1 hover:bg-gray-100 rounded">
                                                <FiEdit2 size={14} className="text-darji-accent" />
                                            </button>
                                        )}
                                    </div>
                                    {editingStatus ? (
                                        <div className="space-y-2">
                                            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                                                <option value="Pending">Pending</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Ready for Trial">Ready for Trial</option>
                                                <option value="Ready for Delivery">Ready for Delivery</option>
                                                <option value="Delivered">Delivered</option>
                                            </select>
                                            <div className="flex gap-2">
                                                <button onClick={handleUpdateStatus} className="flex-1 px-3 py-1 bg-green-500 text-white rounded text-sm">Save</button>
                                                <button onClick={() => setEditingStatus(false)} className="flex-1 px-3 py-1 bg-gray-300 rounded text-sm">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="inline-block px-3 py-1 bg-darji-accent text-white rounded-full text-sm font-semibold">{order.status}</span>
                                    )}
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div><span className="text-gray-500">Order #:</span><span className="font-semibold ml-2">{order.orderNumber}</span></div>
                                    <div><span className="text-gray-500">Created:</span><span className="font-semibold ml-2">{new Date(order.createdAt).toLocaleDateString('en-IN')}</span></div>
                                    <div><span className="text-gray-500">Trial:</span><span className="font-semibold ml-2">{order.trialDate ? new Date(order.trialDate).toLocaleDateString('en-IN') : 'Not Set'}</span></div>
                                    <div><span className="text-gray-500">Delivery:</span><span className="font-semibold ml-2">{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN') : 'Not Set'}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Summary - Desktop Sidebar (Receipt Style) */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                            {/* Receipt Top Pattern */}
                            <div className="h-2 bg-gradient-to-r from-darji-primary to-darji-accent"></div>

                            <div className="p-6 pb-6 relative">
                                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-gray-800 rounded-full inline-block"></span>
                                    Payment Summary
                                </h2>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm group">
                                        <span className="text-gray-500 group-hover:text-gray-800 transition-colors">Stitching Charges</span>
                                        <span className="font-semibold text-gray-800">₹{order.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</span>
                                    </div>

                                    {(() => {
                                        const additionalTotal = order.additionalServiceItems && order.additionalServiceItems.length > 0
                                            ? order.additionalServiceItems.reduce((sum, s) => sum + s.amount, 0)
                                            : (order.additionalServicesAmount || 0);
                                        return additionalTotal > 0 && (
                                            <div className="flex justify-between items-center text-sm group">
                                                <span className="text-gray-500 group-hover:text-gray-800 transition-colors">Additional Services</span>
                                                <span className="font-semibold text-gray-800">₹{additionalTotal.toFixed(2)}</span>
                                            </div>
                                        );
                                    })()}

                                    {/* Dashed Separator */}
                                    <div className="relative py-2">
                                        <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-gray-200"></div>
                                    </div>

                                    {/* Order Total (Bill Amount) */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Bill Total</span>
                                        <span className="text-lg font-bold text-gray-800">₹{order.totalAmount.toFixed(0)}</span>
                                    </div>

                                    {/* Discount / Settlement */}
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[56px]">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Final Received</span>
                                            {!editingFinalAmount && (
                                                <button
                                                    onClick={() => {
                                                        setTempFinalAmount(order.finalAmount || order.totalAmount);
                                                        setEditingFinalAmount(true);
                                                    }}
                                                    className="ml-auto flex items-center gap-2 px-4 py-1.5 border border-darji-accent/30 text-darji-accent hover:bg-darji-accent hover:text-white rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all duration-300"
                                                >
                                                    <span>Settle Bill</span>
                                                    <FiEdit2 size={10} />
                                                </button>
                                            )}
                                        </div>

                                        {editingFinalAmount ? (
                                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                                                <div className="relative">
                                                    <span className="absolute left-0 bottom-2 text-darji-accent font-bold text-lg">₹</span>
                                                    <input
                                                        type="number"
                                                        value={tempFinalAmount}
                                                        onChange={(e) => setTempFinalAmount(e.target.value)}
                                                        className="w-28 bg-transparent border-0 border-b-2 border-darji-accent focus:ring-0 text-right font-black text-gray-800 text-xl pb-1 px-1 placeholder-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                                                        placeholder="0"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => {
                                                            const val = parseFloat(tempFinalAmount);
                                                            if (!isNaN(val)) {
                                                                handleUpdateStatus(null, val);
                                                                setEditingFinalAmount(false);
                                                            }
                                                        }}
                                                        className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-all"
                                                        title="Save"
                                                    >
                                                        <FiCheck size={20} strokeWidth={3} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingFinalAmount(false)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                        title="Cancel"
                                                    >
                                                        <FiX size={20} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className={`text-lg font-bold ${order.finalAmount && order.finalAmount < order.totalAmount ? 'text-red-500' : 'text-gray-900'}`}>
                                                ₹{(order.finalAmount ?? order.totalAmount).toFixed(0)}
                                            </span>
                                        )}
                                    </div>

                                </div>
                            </div>

                            {/* Bottom Status Bar */}
                            {(() => {
                                const revenue = order.finalAmount ?? order.totalAmount;
                                const due = Math.max(0, revenue - (order.advance || 0));

                                return (
                                    <div className={`p-4 ${due <= 0
                                        ? 'bg-green-500'
                                        : 'bg-white border-t border-gray-100'
                                        }`}>
                                        {due <= 0 ? (
                                            <div className="flex justify-between items-center text-white">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 bg-white/20 rounded-full"><FiCheckCircle size={14} /></div>
                                                    <span className="font-bold text-sm uppercase tracking-wide">Fully Paid</span>
                                                </div>
                                                <span className="font-bold text-lg">₹{revenue.toFixed(0)}</span>
                                            </div>
                                        ) : (
                                            <div className="flex gap-4">
                                                <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-200">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Paid</p>
                                                    <p className="text-lg font-bold text-green-600">₹{(order.advance || 0).toFixed(0)}</p>
                                                </div>
                                                <div className="flex-1 bg-red-50 rounded-xl p-3 border border-red-100 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-8 h-8 bg-red-500/10 rounded-bl-xl"></div>
                                                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-0.5">Due</p>
                                                    <p className="text-lg font-bold text-red-600">₹{due.toFixed(0)}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Profit Analysis Card - Admin View */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden text-white relative">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><FiTrendingUp size={100} /></div>
                            <div className="p-6">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <FiTrendingUp className="text-darji-accent" /> Profit Analysis
                                </h2>

                                {(() => {
                                    const revenue = order.finalAmount ?? order.totalAmount;
                                    const itemsCost = order.items.reduce((s, i) => s + (i.quantity * (i.garmentType.cost || 0)), 0);
                                    const servicesCost = order.additionalServiceItems
                                        ? order.additionalServiceItems.reduce((acc, item) => acc + (item.cost || 0), 0)
                                        : (order.additionalServicesCost || 0); // Fallback

                                    const totalCost = itemsCost + servicesCost;
                                    const profit = revenue - totalCost;
                                    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

                                    return (
                                        <div className="space-y-4 relative z-10">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
                                                    <p className="text-xl font-bold text-white">₹{revenue.toFixed(0)}</p>
                                                </div>
                                                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Cost</p>
                                                    <p className="text-xl font-bold text-red-300">₹{totalCost.toFixed(0)}</p>
                                                </div>
                                            </div>
                                            <div className="bg-darji-accent/20 rounded-lg p-4 border border-darji-accent/30 flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-bold text-darji-accent uppercase tracking-widest mb-1">Net Profit</p>
                                                    <p className="text-2xl font-black text-white">₹{profit.toFixed(0)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-bold text-darji-accent opacity-50">{margin.toFixed(1)}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                    </div> {/* End Right Sidebar */}

                </div > {/* End 3-column grid */}

                {/* Full Width Sections Below Grid */}
                <div className="mt-6 space-y-6">

                    {/* Special Requirements */}
                    {order.specialRequirements && order.specialRequirements.length > 0 && (
                        <div className="bg-white p-5 lg:p-6 rounded-xl shadow-lg border border-gray-100/50 fade-in delay-300">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Custom Requests</p>
                                    <h2 className="text-lg lg:text-xl font-bold text-gray-800">Special Requirements</h2>
                                </div>
                            </div>

                            {editingRequirements ? (
                                <div className="space-y-4">
                                    <div className="text-sm text-gray-600 mb-2">
                                        Add one requirement per line. Optionally attach images below.
                                    </div>
                                    <textarea
                                        value={requirements.join('\n')}
                                        onChange={(e) => setRequirements(e.target.value.split('\n'))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-darji-accent"
                                        rows="5"
                                        placeholder="One requirement per line"
                                    />

                                    {/* Image uploads for each requirement */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Attach Images to Requirements
                                        </label>
                                        {requirements.filter(r => r.trim()).map((req, index) => (
                                            <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                                <span className="text-sm text-gray-600 flex-shrink-0 w-8">{index + 1}.</span>
                                                <span className="text-sm flex-1 truncate">{req}</span>
                                                <input
                                                    type="file"
                                                    id={`requirement-image-${index}`}
                                                    accept="image/*"
                                                    className="text-sm w-48"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={handleUpdateRequirements}
                                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                                        >
                                            <FiSave className="inline mr-1" /> Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingRequirements(false);
                                                setRequirements(order.specialRequirements.map(r => r.note));
                                            }}
                                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {order.specialRequirements.map((req, index) => (
                                        <div key={req.id}>
                                            {/* Mobile View - Unified White Card Style */}
                                            <div className="lg:hidden bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative group ring-1 ring-black/5">
                                                <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-darji-accent to-darji-primary"></div>
                                                <div className="p-4 pl-5">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-6 h-6 bg-darji-accent/10 text-darji-accent rounded-full flex items-center justify-center text-xs font-extrabold ring-1 ring-darji-accent/20">
                                                                {index + 1}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Requirement</span>
                                                        </div>
                                                        {editingRequirement?.id !== req.id && (
                                                            <div className="flex space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => setEditingRequirement({ id: req.id, note: req.note, imageFile: null })}
                                                                    className="p-2 text-gray-400 hover:text-darji-accent hover:bg-blue-50 rounded-full transition-colors"
                                                                >
                                                                    <FiEdit2 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteRequirement(req.id)}
                                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                                >
                                                                    <FiTrash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-2">
                                                        {editingRequirement?.id === req.id ? (
                                                            <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                                <textarea
                                                                    value={editingRequirement.note}
                                                                    onChange={(e) => setEditingRequirement({ ...editingRequirement, note: e.target.value })}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-darji-accent text-sm"
                                                                    rows="3"
                                                                />
                                                                <div>
                                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                        Update Image (optional)
                                                                    </label>
                                                                    {req.imageUrl && !editingRequirement.imageFile && (
                                                                        <div className="mb-2 text-xs text-gray-600 flex items-center gap-1">
                                                                            <span className="text-green-600">✓</span> Current image attached
                                                                        </div>
                                                                    )}
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={(e) => setEditingRequirement({ ...editingRequirement, imageFile: e.target.files[0] })}
                                                                        className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                                    />
                                                                </div>
                                                                <div className="flex space-x-2 pt-1">
                                                                    <button
                                                                        onClick={() => handleUpdateRequirement(editingRequirement.id)}
                                                                        className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 text-xs font-semibold shadow-sm"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingRequirement(null)}
                                                                        className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-xs font-semibold shadow-sm"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{req.note}</p>
                                                                {req.imageUrl && (
                                                                    <div className="mt-3">
                                                                        <img
                                                                            src={`http://${window.location.hostname}:5000${req.imageUrl}`}
                                                                            alt="Requirement"
                                                                            className="h-24 w-24 object-cover rounded-xl border border-gray-100 shadow-md ring-1 ring-black/5 cursor-pointer hover:scale-105 transition-transform"
                                                                            onClick={() => window.open(`http://${window.location.hostname}:5000${req.imageUrl}`, '_blank')}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Desktop View - Premium Card Style */}
                                            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative group p-5 hover:shadow-md transition-shadow">
                                                <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-darji-accent to-darji-primary"></div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        {editingRequirement?.id === req.id ? (
                                                            <div className="space-y-3">
                                                                <textarea
                                                                    value={editingRequirement.note}
                                                                    onChange={(e) => setEditingRequirement({ ...editingRequirement, note: e.target.value })}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-darji-accent"
                                                                    rows="2"
                                                                />
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Update Image (optional)
                                                                    </label>
                                                                    {req.imageUrl && !editingRequirement.imageFile && (
                                                                        <div className="mb-2 flex items-center gap-2">
                                                                            <img
                                                                                src={`http://${window.location.hostname}:5000${req.imageUrl}`}
                                                                                alt="Current"
                                                                                className="h-16 w-16 object-cover rounded border border-gray-300"
                                                                            />
                                                                            <span className="text-sm text-gray-600">Current image (will be kept if no new file selected)</span>
                                                                        </div>
                                                                    )}
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={(e) => setEditingRequirement({ ...editingRequirement, imageFile: e.target.files[0] })}
                                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                                    />
                                                                </div>
                                                                <div className="flex space-x-2">
                                                                    <button
                                                                        onClick={() => handleUpdateRequirement(editingRequirement.id)}
                                                                        className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                                                                    >
                                                                        <FiSave className="inline mr-1" /> Save
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingRequirement(null)}
                                                                        className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="text-gray-700">• {req.note}</div>
                                                                {req.imageUrl && (
                                                                    <div className="mt-2">
                                                                        <img
                                                                            src={`http://${window.location.hostname}:5000${req.imageUrl}`}
                                                                            alt="Requirement"
                                                                            className="max-w-xs rounded-lg border border-gray-300 cursor-pointer hover:opacity-80"
                                                                            onClick={() => window.open(`http://${window.location.hostname}:5000${req.imageUrl}`, '_blank')}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                    {!editingRequirement && (
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => setEditingRequirement(req)}
                                                                className="text-darji-accent hover:underline text-sm"
                                                            >
                                                                <FiEdit2 className="inline" /> Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteRequirement(req.id)}
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                <FiTrash2 />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Trial Notes */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100/50 overflow-hidden fade-in delay-300">
                        <div className="p-5 lg:p-6 border-b border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fitting Updates</p>
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                Trial Notes & Alterations
                            </h2>
                        </div>

                        <div className="p-5 lg:p-6 bg-gray-50/50">

                            {order.trialNotes && order.trialNotes.length > 0 && (
                                <div className="mb-8 space-y-4">
                                    {order.trialNotes.map((note, index) => (
                                        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md overflow-hidden relative group">
                                            <div className={`absolute top-0 bottom-0 left-0 w-1 ${index === 0 ? 'bg-darji-accent' : 'bg-gray-300'}`}></div>
                                            <div className="p-4 pl-5">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${index === 0 ? 'bg-darji-accent text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                            {index + 1}
                                                        </div>
                                                        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                                                            {formatDate(note.createdAt)}
                                                        </div>
                                                    </div>
                                                    {editingTrialNote !== note.id && (
                                                        <div className="flex space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleEditTrialNote(note)}
                                                                className="p-2 text-gray-400 hover:text-darji-accent hover:bg-blue-50 rounded-full transition-colors"
                                                                title="Edit note"
                                                            >
                                                                <FiEdit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteTrialNote(note.id)}
                                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                                title="Delete note"
                                                            >
                                                                <FiTrash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {editingTrialNote === note.id ? (
                                                    <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                        <textarea
                                                            value={editedNoteText}
                                                            onChange={(e) => setEditedNoteText(e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-darji-accent text-sm"
                                                            rows="3"
                                                        />
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                Update Image
                                                            </label>
                                                            <input
                                                                type="file"
                                                                id={`edit-note-image-${note.id}`}
                                                                accept="image/*"
                                                                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                            />
                                                        </div>
                                                        <div className="flex space-x-3 pt-1">
                                                            <button
                                                                onClick={() => handleUpdateTrialNote(note.id)}
                                                                className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 text-xs font-semibold shadow-sm"
                                                            >
                                                                Save Changes
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEditTrialNote}
                                                                className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-xs font-semibold shadow-sm"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="pl-1">
                                                        <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{note.note}</div>
                                                        {note.imageUrl && (
                                                            <div className="mt-3">
                                                                <img
                                                                    src={`http://${window.location.hostname}:5000${note.imageUrl}`}
                                                                    alt="Trial note"
                                                                    className="h-24 w-24 object-cover rounded-xl border border-gray-100 shadow-md ring-1 ring-black/5 cursor-pointer hover:scale-105 transition-transform"
                                                                    onClick={() => window.open(`http://${window.location.hostname}:5000${note.imageUrl}`, '_blank')}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                                    Add New Note
                                </label>
                                <form onSubmit={handleAddTrialNote} className="relative">
                                    <textarea
                                        value={newTrialNote}
                                        onChange={(e) => setNewTrialNote(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent focus:border-transparent transition-shadow text-sm shadow-inner bg-gray-50 focus:bg-white"
                                        placeholder="Enter trial details, alterations needed..."
                                        rows="3"
                                    />
                                    <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                        <div className="flex-1 w-full sm:w-auto">
                                            <input
                                                type="file"
                                                id="trial-note-image"
                                                accept="image/*"
                                                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white file:text-darji-accent hover:file:bg-blue-50 cursor-pointer shadow-sm rounded-xl border border-gray-200"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!newTrialNote.trim()}
                                            className={`w-full sm:w-auto px-6 py-2 rounded-full text-sm font-semibold shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-2 ${newTrialNote.trim()
                                                ? 'bg-gradient-to-r from-darji-primary to-darji-accent text-white hover:shadow-lg'
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                        >
                                            <FiPlus size={16} /> Add Note
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        </>
    );
}