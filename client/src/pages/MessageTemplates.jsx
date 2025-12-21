import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { FiPlus, FiEdit2, FiTrash2, FiCopy, FiX, FiSave, FiEye, FiMessageSquare } from 'react-icons/fi';

export default function MessageTemplates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'Custom',
        content: '',
        isActive: true
    });
    const [preview, setPreview] = useState('');

    const templateTypes = [
        'OrderConfirmation',
        'TrialReminder',
        'DeliveryReminder',
        'PaymentReminder',
        'Custom'
    ];

    const variables = [
        { key: 'clientName', label: 'Client Name' },
        { key: 'orderNumber', label: 'Order Number' },
        { key: 'trialDate', label: 'Trial Date' },
        { key: 'deliveryDate', label: 'Delivery Date' },
        { key: 'totalAmount', label: 'Total Amount' },
        { key: 'advance', label: 'Advance' },
        { key: 'balance', label: 'Balance' },
        { key: 'shopName', label: 'Shop Name' },
        { key: 'shopPhone', label: 'Shop Phone' }
    ];

    useEffect(() => {
        fetchTemplates();
    }, []);

    useEffect(() => {
        // Clear preview when opening a new modal or changing content significantly
        if (!showModal) setPreview('');
    }, [showModal]);

    const fetchTemplates = async () => {
        try {
            const response = await api.get('/message-templates');
            setTemplates(response.data);
        } catch (error) {
            console.error('Error fetching templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (template = null) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                name: template.name,
                type: template.type,
                content: template.content,
                isActive: template.isActive
            });
        } else {
            setEditingTemplate(null);
            setFormData({
                name: '',
                type: 'Custom',
                content: '',
                isActive: true
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingTemplate(null);
        setFormData({ name: '', type: 'Custom', content: '', isActive: true });
        setPreview('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingTemplate) {
                await api.put(`/message-templates/${editingTemplate.id}`, formData);
            } else {
                await api.post('/message-templates', formData);
            }

            fetchTemplates();
            handleCloseModal();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to save template');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }

        try {
            await api.delete(`/message-templates/${id}`);
            fetchTemplates();
        } catch (error) {
            alert('Failed to delete template');
        }
    };

    const handlePreview = async () => {
        try {
            const response = await api.post('/message-templates/preview', {
                content: formData.content,
                sampleData: {
                    clientName: 'Rahul Sharma',
                    orderNumber: 'TD-00123',
                    trialDate: new Date(),
                    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    totalAmount: 3500,
                    advance: 1000,
                    balance: 2500,
                    shopName: 'The Darji',
                    shopPhone: '9876543210'
                }
            });
            setPreview(response.data.preview);
        } catch (error) {
            console.error('Error previewing template:', error);
        }
    };

    const insertVariable = (variable) => {
        const textarea = document.getElementById('template-content');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.content;
        const before = text.substring(0, start);
        const after = text.substring(end);

        // Add spaces around variable for readability
        const newContent = before + `{{${variable}}}` + after;

        setFormData({ ...formData, content: newContent });

        // Set cursor position after inserted variable
        setTimeout(() => {
            textarea.focus();
            const newPos = start + variable.length + 4;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    if (loading) {
        return <div className="text-center py-12">Loading templates...</div>;
    }

    return (
        <div className="fade-in max-w-6xl mx-auto pb-20 md:pb-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                        Message Templates
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Create reusable message templates with variables</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full md:w-auto flex items-center justify-center space-x-2 bg-darji-accent text-white px-8 py-4 rounded-xl hover:bg-blue-600 font-bold shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                    <FiPlus size={20} /> <span>New Template</span>
                </button>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <FiCopy className="text-gray-400 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-gray-700">No templates yet</h3>
                        <p className="text-gray-500 mt-1">Create your first message template</p>
                    </div>
                ) : (
                    templates.map(template => (
                        <div
                            key={template.id}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="font-black text-gray-900 text-lg mb-1">{template.name}</h3>
                                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${template.type === 'OrderConfirmation' ? 'bg-blue-100 text-blue-700' :
                                        template.type === 'TrialReminder' ? 'bg-amber-100 text-amber-700' :
                                            template.type === 'DeliveryReminder' ? 'bg-green-100 text-green-700' :
                                                template.type === 'PaymentReminder' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-700'
                                        }`}>
                                        {template.type.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleOpenModal(template)}
                                        className="p-2 text-gray-400 hover:text-darji-accent hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <FiEdit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <FiTrash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 mb-4 h-24 overflow-hidden relative">
                                <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                                    {template.content.length > 150 ? template.content.substring(0, 150) + '...' : template.content}
                                </p>
                                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-gray-50 to-transparent"></div>
                            </div>

                            <div className="pt-2 flex items-center justify-between">
                                <span className={`flex items-center gap-1.5 text-xs font-bold ${template.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                    <span className={`w-2 h-2 rounded-full ${template.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                    {template.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className="text-xs text-gray-400 font-medium">
                                    {new Date(template.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Template Editor Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col">
                        <form onSubmit={handleSubmit} className="flex flex-col h-full">
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-darji-primary to-darji-accent p-6 text-white flex items-center justify-between shrink-0">
                                <div>
                                    <h2 className="text-2xl font-black">
                                        {editingTemplate ? 'Edit Template' : 'New Template'}
                                    </h2>
                                    <p className="text-blue-100 text-sm mt-1">Configure automated messages</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <FiX size={24} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Template Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-darji-accent font-medium text-gray-900 placeholder-gray-400 transition-all"
                                            required
                                            placeholder="e.g., Order Confirmation"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Template Type *
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={formData.type}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-darji-accent font-medium cursor-pointer appearance-none bg-white transition-all"
                                            >
                                                {templateTypes.map(type => (
                                                    <option key={type} value={type}>
                                                        {type.replace(/([A-Z])/g, ' $1').trim()}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Variable Buttons */}
                                <div className="mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <FiPlus className="bg-blue-200 rounded-full p-0.5" />
                                        Insert Variables
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {variables.map(variable => (
                                            <button
                                                key={variable.key}
                                                type="button"
                                                onClick={() => insertVariable(variable.key)}
                                                className="group flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 border border-blue-100 rounded-lg hover:border-darji-accent hover:bg-blue-50 hover:text-darji-accent font-medium text-xs transition-all active:scale-95 shadow-sm"
                                            >
                                                <span className="text-gray-400 group-hover:text-darji-accent/70 font-mono text-[10px]">{`{ }`}</span>
                                                <span>{variable.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Editor Column */}
                                    <div className="flex flex-col">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Message Content *
                                        </label>
                                        <div className="relative flex-1">
                                            <textarea
                                                id="template-content"
                                                value={formData.content}
                                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                                className="w-full h-full min-h-[250px] px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-darji-accent font-medium resize-none font-mono text-sm leading-relaxed"
                                                required
                                                placeholder="Hi {{clientName}}, your order #{{orderNumber}} is ready for trial..."
                                            />
                                        </div>
                                        <div className="mt-4 flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="isActive"
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                                className="w-5 h-5 rounded border-2 border-gray-300 text-darji-accent focus:ring-2 focus:ring-darji-accent cursor-pointer"
                                            />
                                            <label htmlFor="isActive" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                                Enable this template
                                            </label>
                                        </div>
                                    </div>

                                    {/* Preview Column */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                Live Preview
                                            </label>
                                            <button type="button" onClick={handlePreview} className="text-xs font-bold text-darji-accent hover:underline flex items-center gap-1">
                                                <FiEye /> Refresh
                                            </button>
                                        </div>

                                        <div className="bg-[#E5DDD5] p-6 rounded-2xl border border-gray-200 shadow-inner min-h-[300px] flex flex-col bg-opacity-80" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'overlay' }}>
                                            {preview ? (
                                                <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm max-w-[90%] self-start relative animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="absolute top-0 left-[-8px] w-0 h-0 border-t-[8px] border-t-white border-l-[8px] border-l-transparent"></div>
                                                    <p className="text-gray-900 whitespace-pre-wrap leading-relaxed text-sm">
                                                        {preview}
                                                    </p>
                                                    <div className="text-[10px] text-gray-400 mt-1 text-right tabular-nums">
                                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400/70 p-8 text-center">
                                                    <FiMessageSquare size={32} className="mb-2" />
                                                    <p className="text-sm font-medium">Click "Refresh" or "Preview" to see how the message will look.</p>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 text-center">
                                            This is how the message will appear on WhatsApp.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={handlePreview}
                                    className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <FiEye />
                                    Generate Preview
                                </button>
                                <div className="flex-1"></div>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-3 bg-transparent text-gray-600 rounded-xl hover:bg-gray-100 font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-gradient-to-r from-darji-primary to-darji-accent text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 active:scale-95 font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    <FiSave />
                                    {editingTemplate ? 'Update Template' : 'Create Template'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
