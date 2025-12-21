import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { FiEdit2, FiPlus, FiSave, FiX, FiSettings, FiScissors, FiDollarSign, FiInfo, FiTrash2, FiTag, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';

export default function Settings() {
    const [garmentTypes, setGarmentTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGarment, setEditingGarment] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        cost: '',
        description: ''
    });
    const [businessInfo, setBusinessInfo] = useState({
        name: '',
        phone: '',
        email: '',
        address: ''
    });

    useEffect(() => {
        fetchGarmentTypes();
        fetchBusinessInfo();
    }, []);

    const fetchBusinessInfo = async () => {
        try {
            // Import the env variables from the backend
            setBusinessInfo({
                name: 'The Darji',
                phone: '+91-8854017433',
                email: 'thedarji.creations@gmail.com',
                address: 'Jaipur, Rajasthan'
            });
        } catch (error) {
            console.error('Error fetching business info:', error);
        }
    };

    const fetchGarmentTypes = async () => {
        try {
            const response = await api.get('/garments');
            setGarmentTypes(response.data);
        } catch (error) {
            console.error('Error fetching garment types:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (garment = null) => {
        if (garment) {
            setEditingGarment(garment);
            setFormData({
                name: garment.name,
                price: garment.price.toString(),
                cost: (garment.cost || 0).toString(),
                description: garment.description || ''
            });
        } else {
            setEditingGarment(null);
            setFormData({ name: '', price: '', cost: '', description: '' });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingGarment(null);
        setFormData({ name: '', price: '', cost: '', description: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                name: formData.name,
                price: parseFloat(formData.price),
                cost: parseFloat(formData.cost) || 0,
                description: formData.description
            };

            if (editingGarment) {
                await api.put(`/garments/${editingGarment.id}`, data);
            } else {
                await api.post('/garments', data);
            }

            fetchGarmentTypes();
            handleCloseModal();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to save garment type');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this garment type?')) return;

        try {
            await api.delete(`/garments/${id}`);
            fetchGarmentTypes();
        } catch (error) {
            alert('Failed to delete garment type');
        }
    };

    if (loading) {
        return <div className="text-center py-12">Loading settings...</div>;
    }

    return (
        <div className="fade-in max-w-7xl mx-auto pb-20 md:pb-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pt-2">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">System Settings</h1>
                    <p className="text-gray-500 mt-2 font-medium">Manage product pricing & business details</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full md:w-auto flex items-center justify-center space-x-2 bg-darji-accent text-white px-8 py-4 rounded-xl hover:bg-blue-600 font-bold shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                    <FiPlus size={20} /> <span>New Garment Type</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Left Column: Garment Types */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><FiScissors className="text-darji-accent" /> Garment Catalog</h2>
                            <span className="bg-blue-50 text-darji-accent text-xs font-bold px-3 py-1 rounded-full">{garmentTypes.length} Items</span>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {garmentTypes.map(garment => (
                                <div key={garment.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-blue-50/20 transition-colors group">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-lg">
                                                {garment.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-lg">{garment.name}</h3>
                                                {garment.description && <p className="text-sm text-gray-500 mt-0.5">{garment.description}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                                        <div className="flex gap-6">
                                            <div className="text-right">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price</div>
                                                <div className="text-lg font-black text-gray-900">₹{garment.price.toFixed(0)}</div>
                                            </div>
                                            <div className="text-right border-l border-gray-100 pl-6">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cost</div>
                                                <div className="text-lg font-bold text-gray-500">₹{(garment.cost || 0).toFixed(0)}</div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleOpenModal(garment)}
                                                className="p-2 text-gray-400 hover:text-darji-accent hover:bg-white hover:shadow-md rounded-lg transition-all"
                                            >
                                                <FiEdit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(garment.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-white hover:shadow-md rounded-lg transition-all"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Business Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10"><FiInfo size={100} /></div>
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-6 relative z-10"><FiInfo /> Business Profile</h2>

                        <div className="space-y-6 relative z-10">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Company Name</label>
                                <div className="text-xl font-bold">{businessInfo.name || 'Not Set'}</div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><FiPhone size={14} /></div>
                                    <div className="text-sm font-medium opacity-90">{businessInfo.phone || 'Not Set'}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><FiMail size={14} /></div>
                                    <div className="text-sm font-medium opacity-90">{businessInfo.email || 'Not Set'}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><FiMapPin size={14} /></div>
                                    <div className="text-sm font-medium opacity-90">{businessInfo.address || 'Not Set'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10 text-xs text-gray-400 leading-relaxed">
                            To update these details, please contact your system administrator or modify the environment configuration variables.
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md md:scale-100 scale-95 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">
                                    {editingGarment ? 'Edit Product' : 'Add Product'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1 font-medium">Configure garment pricing details</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                                <FiX size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Garment Name *</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><FiTag /></div>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent font-medium text-gray-900 bg-gray-50 focus:bg-white transition-colors"
                                        required
                                        placeholder="e.g. 3-Piece Suit"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Selling Price *</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">₹</div>
                                        <input
                                            type="number"
                                            step="1"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent font-medium text-gray-900 bg-gray-50 focus:bg-white transition-colors"
                                            required
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Est. Cost</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">₹</div>
                                        <input
                                            type="number"
                                            step="1"
                                            value={formData.cost}
                                            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent font-medium text-gray-900 bg-gray-50 focus:bg-white transition-colors"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description (Optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent font-medium text-gray-900 bg-gray-50 focus:bg-white transition-colors resize-none"
                                    rows="3"
                                    placeholder="Add any details about this garment type..."
                                />
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
                                    {editingGarment ? 'Save Changes' : 'Add Garment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
