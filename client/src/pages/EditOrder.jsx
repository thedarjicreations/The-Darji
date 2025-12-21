import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { FiPlus, FiTrash2, FiSave, FiX, FiArrowLeft, FiPackage, FiCalendar, FiAlignLeft, FiEdit2 } from 'react-icons/fi';

export default function EditOrder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [garmentTypes, setGarmentTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [items, setItems] = useState([]);
    const [trialDate, setTrialDate] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [advance, setAdvance] = useState(0);
    const [additionalServiceItems, setAdditionalServiceItems] = useState([]);
    const [specialRequirements, setSpecialRequirements] = useState([]);
    const [order, setOrder] = useState(null);

    useEffect(() => {
        fetchOrder();
        fetchGarmentTypes();
    }, [id]);

    const fetchOrder = async () => {
        try {
            const response = await api.get(`/orders/${id}`);
            const orderData = response.data;
            setOrder(orderData);

            // Pre-fill form with existing data
            setItems(orderData.items.map(item => ({
                garmentTypeId: item.garmentTypeId,
                quantity: item.quantity,
                price: item.price,
                cost: item.cost || 0
            })));

            setAdditionalServiceItems(
                orderData.additionalServiceItems && orderData.additionalServiceItems.length > 0
                    ? orderData.additionalServiceItems.map(s => ({
                        description: s.description,
                        amount: s.amount,
                        cost: s.cost || 0
                    }))
                    : [{ description: '', amount: 0, cost: 0 }]
            );

            setSpecialRequirements(
                orderData.specialRequirements && orderData.specialRequirements.length > 0
                    ? orderData.specialRequirements.map(r => ({
                        text: r.note,
                        image: null,
                        imageUrl: r.imageUrl // Store existing image URL
                    }))
                    : []
            );

            setTrialDate(orderData.trialDate ? new Date(orderData.trialDate).toISOString().split('T')[0] : '');
            setDeliveryDate(orderData.deliveryDate ? new Date(orderData.deliveryDate).toISOString().split('T')[0] : '');
            setAdvance(orderData.advance || 0);
        } catch (error) {
            console.error('Error fetching order:', error);
            setError('Failed to load order details');
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

    const handleAddItem = () => {
        setItems([...items, { garmentTypeId: '', quantity: 1, price: 0, cost: 0 }]);
    };

    const handleRemoveItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        // Auto-fill price and cost when garment type is selected
        if (field === 'garmentTypeId') {
            const garment = garmentTypes.find(g => g.id === value);
            if (garment) {
                newItems[index].price = garment.price;
                newItems[index].cost = garment.cost || 0;
            }
        }

        setItems(newItems);
    };

    const handleAddService = () => {
        setAdditionalServiceItems([...additionalServiceItems, { description: '', amount: 0, cost: 0 }]);
    };

    const handleRemoveService = (index) => {
        if (additionalServiceItems.length > 1) {
            setAdditionalServiceItems(additionalServiceItems.filter((_, i) => i !== index));
        }
    };

    const handleServiceChange = (index, field, value) => {
        const newServices = [...additionalServiceItems];
        newServices[index][field] = value;
        setAdditionalServiceItems(newServices);
    };

    const calculateTotal = () => {
        const stitchingTotal = items.reduce((total, item) => {
            const subtotal = item.quantity * item.price;
            return total + subtotal;
        }, 0);
        const servicesTotal = additionalServiceItems.reduce((total, service) => {
            return total + (parseFloat(service.amount) || 0);
        }, 0);
        return stitchingTotal + servicesTotal;
    };

    const handleAddRequirement = () => {
        setSpecialRequirements([...specialRequirements, { text: '', image: null }]);
    };

    const handleRemoveRequirement = (index) => {
        setSpecialRequirements(specialRequirements.filter((_, i) => i !== index));
    };

    const handleRequirementTextChange = (index, value) => {
        const newRequirements = [...specialRequirements];
        newRequirements[index].text = value;
        setSpecialRequirements(newRequirements);
    };

    const handleRequirementImageChange = (index, file) => {
        const newRequirements = [...specialRequirements];
        newRequirements[index].image = file;
        setSpecialRequirements(newRequirements);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            const formData = new FormData();

            // Add items as JSON
            formData.append('items', JSON.stringify(items.map(item => ({
                garmentTypeId: item.garmentTypeId,
                quantity: parseInt(item.quantity),
                price: parseFloat(item.price),
                cost: parseFloat(item.cost) || 0,
                subtotal: item.price * item.quantity
            }))));

            // Add additional services as JSON
            const validServices = additionalServiceItems.filter(service => service.description.trim() && service.amount > 0);
            formData.append('additionalServiceItems', JSON.stringify(validServices.map(service => ({
                description: service.description.trim(),
                amount: parseFloat(service.amount),
                cost: parseFloat(service.cost) || 0
            }))));

            // Add special requirements text as JSON
            // Add special requirements
            const requirementsData = specialRequirements
                .filter(req => req.text.trim())
                .map(req => {
                    // If it's a new file upload
                    if (req.image && req.image instanceof File) {
                        return { note: req.text, isNewImage: true };
                    }
                    // If keeping existing image
                    return { note: req.text, imageUrl: req.imageUrl };
                });
            formData.append('specialRequirements', JSON.stringify(requirementsData));

            // Add requirement images (only new files)
            specialRequirements.forEach((req) => {
                if (req.image && req.image instanceof File) {
                    formData.append('requirementImages', req.image);
                }
            });

            // Add other fields
            formData.append('trialDate', trialDate || '');
            formData.append('deliveryDate', deliveryDate || '');
            formData.append('advance', parseFloat(advance) || 0);
            formData.append('regenerateInvoice', true);

            const response = await api.put(`/orders/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            alert('Order updated successfully! Invoice regenerated.');
            navigate(`/orders/${id}`);
        } catch (error) {
            console.error('Error updating order:', error);
            setError(error.response?.data?.error || error.response?.data?.details || 'Failed to update order');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-center py-12">Loading order details...</div>;
    }

    if (!order) {
        return <div className="text-center py-12">Order not found</div>;
    }

    return (
        <div className="fade-in pb-40 md:pb-12">
            <div className="mb-6 md:mb-8 pt-2">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-4 flex items-center text-gray-500 hover:text-darji-primary transition-colors text-sm font-medium active:scale-95 duration-200"
                >
                    <FiArrowLeft className="mr-1" /> Back
                </button>
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">MODIFY ORDER</p>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Edit Details</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-bold ring-1 ring-black/5">#{order.orderNumber}</span>
                            <span className="text-gray-500 text-sm font-medium">{order.client.name}</span>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Order Items */}
                <div className="bg-white p-6 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Order Items</h2>
                    </div>

                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div key={index} className="bg-gray-50 md:bg-transparent p-4 md:p-0 rounded-2xl md:rounded-none border border-gray-200 md:border-0 grid grid-cols-2 md:grid-cols-12 gap-4 items-end relative">
                                {/* Mobile Item Header */}
                                <div className="absolute -top-2 -right-2 md:hidden">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="p-2 text-red-500 bg-white shadow-sm border border-gray-100 hover:bg-red-50 rounded-full transition-all active:scale-95"
                                        disabled={items.length === 1}
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>

                                <div className="col-span-2 md:col-span-5">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                        Garment Type
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <FiPackage />
                                        </div>
                                        <select
                                            value={item.garmentTypeId}
                                            onChange={(e) => handleItemChange(index, 'garmentTypeId', e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent/50 focus:border-darji-accent transition-all text-sm font-medium shadow-sm appearance-none"
                                            required
                                        >
                                            <option value="">-- Select --</option>
                                            {garmentTypes.map(garment => (
                                                <option key={garment.id} value={garment.id}>
                                                    {garment.name} (₹{garment.price})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                        Qty
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent/50 focus:border-darji-accent transition-all text-sm font-medium shadow-sm"
                                        required
                                    />
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                        Price (₹)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-bold text-xs">
                                            ₹
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={item.price}
                                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                            className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent/50 focus:border-darji-accent transition-all text-sm font-medium shadow-sm"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2 md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 md:hidden">
                                        Subtotal
                                    </label>
                                    <div className="px-4 py-2.5 bg-white md:bg-gray-50 border border-gray-200 md:border-transparent rounded-xl font-bold text-gray-700 text-sm shadow-sm md:shadow-none flex justify-between md:block">
                                        <span className="md:hidden text-gray-400 font-normal">Total:</span>
                                        ₹{(item.quantity * item.price).toFixed(2)}
                                    </div>
                                </div>

                                <div className="hidden md:block col-span-1">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="w-full p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                        disabled={items.length === 1}
                                    >
                                        <FiTrash2 className="mx-auto" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>

                <button
                    type="button"
                    onClick={handleAddItem}
                    className="mt-6 w-full py-4 border-2 border-dashed border-gray-200 hover:border-darji-accent bg-gray-50 hover:bg-white text-gray-500 hover:text-darji-accent rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.99] group"
                >
                    <div className="bg-white border border-gray-200 p-1.5 rounded-lg group-hover:border-darji-accent transition-colors">
                        <FiPlus />
                    </div>
                    Add Another Item
                </button>

                <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="bg-gray-50 rounded-xl p-4 border-2 border-dashed border-gray-200 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Amount</span>
                        <span className="text-2xl font-black text-darji-accent tracking-wide">₹{calculateTotal().toFixed(2)}</span>
                    </div>
                </div>
                {/* Additional Services */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold">Additional Services</h2>
                            <p className="text-sm text-gray-600">Fabric charges, alterations, or other extra services</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {additionalServiceItems.map((service, index) => (
                            <div key={index} className="bg-gray-50 md:bg-transparent p-4 md:p-0 rounded-2xl md:rounded-none border border-gray-200 md:border-0 grid grid-cols-2 md:grid-cols-12 gap-4 items-end relative border-b-0 md:border-b md:pb-3 mb-4 md:mb-0 last:border-0">
                                {/* Mobile Item Header */}
                                <div className="absolute -top-2 -right-2 md:hidden">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveService(index)}
                                        className="p-2 text-red-500 bg-white shadow-sm border border-gray-100 hover:bg-red-50 rounded-full transition-all active:scale-95"
                                        disabled={additionalServiceItems.length === 1}
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>

                                <div className="col-span-2 md:col-span-5">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                        Description
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <FiAlignLeft />
                                        </div>
                                        <input
                                            type="text"
                                            value={service.description}
                                            onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent/50 focus:border-darji-accent transition-all text-sm font-medium shadow-sm"
                                            placeholder="e.g., Fabric, Buttons, etc."
                                        />
                                    </div>
                                </div>

                                <div className="col-span-1 md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                        Amount (₹)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-bold text-xs">
                                            ₹
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={service.amount}
                                            onChange={(e) => handleServiceChange(index, 'amount', e.target.value)}
                                            className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent/50 focus:border-darji-accent transition-all text-sm font-medium shadow-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-1 md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                        Cost (₹)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-bold text-xs">
                                            ₹
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={service.cost}
                                            onChange={(e) => handleServiceChange(index, 'cost', e.target.value)}
                                            className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent/50 focus:border-darji-accent transition-all text-sm font-medium shadow-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2 md:col-span-3 md:hidden">
                                    <p className="text-xs text-gray-500 font-medium">
                                        Profit: <span className="text-green-600">₹{((parseFloat(service.amount) || 0) - (parseFloat(service.cost) || 0)).toFixed(2)}</span>
                                    </p>
                                </div>

                                <div className="hidden md:flex col-span-1 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveService(index)}
                                        className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                        disabled={additionalServiceItems.length === 1}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={handleAddService}
                        className="mt-6 w-full py-4 border-2 border-dashed border-gray-200 hover:border-darji-accent bg-gray-50 hover:bg-white text-gray-500 hover:text-darji-accent rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.99] group"
                    >
                        <div className="bg-white border border-gray-200 p-1.5 rounded-lg group-hover:border-darji-accent transition-colors">
                            <FiPlus />
                        </div>
                        Add Another Service
                    </button>
                </div>

                {/* Dates and Advance */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    <h2 className="text-xl font-bold mb-4">Dates & Payment</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                Trial Date
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <FiCalendar />
                                </div>
                                <input
                                    type="date"
                                    value={trialDate}
                                    onChange={(e) => setTrialDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent/50 focus:border-darji-accent transition-all text-sm font-medium shadow-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                Delivery Date
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <FiCalendar />
                                </div>
                                <input
                                    type="date"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent/50 focus:border-darji-accent transition-all text-sm font-medium shadow-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                Advance Payment (₹)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-bold text-xs">
                                    ₹
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={calculateTotal()}
                                    value={advance}
                                    onChange={(e) => setAdvance(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent/50 focus:border-darji-accent transition-all text-sm font-medium shadow-sm"
                                    placeholder="0"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1 font-medium">
                                Balance: <span className="text-darji-accent">₹{(calculateTotal() - (parseFloat(advance) || 0)).toFixed(2)}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Special Requirements Section */}
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                        <div>
                            <h2 className="text-lg md:text-xl font-bold">Special Requirements</h2>
                            <p className="text-sm text-gray-600">Custom tailoring requirements or notes</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddRequirement}
                            className="w-full sm:w-auto flex items-center justify-center space-x-1 text-darji-accent hover:underline font-semibold"
                        >
                            <FiPlus /> <span>Add Requirement</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {specialRequirements.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500 text-sm italic">No special requirements added yet</p>
                            </div>
                        ) : (
                            specialRequirements.map((requirement, index) => (
                                <div key={index} className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                                    <div className="flex gap-3 mb-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-darji-accent text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <textarea
                                                value={requirement.text}
                                                onChange={(e) => handleRequirementTextChange(index, e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-darji-accent/50 focus:border-darji-accent text-sm transition-all shadow-sm"
                                                rows="2"
                                                placeholder="Enter requirement details..."
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRequirement(index)}
                                            className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors h-fit"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>

                                    {/* Image upload */}
                                    <div className="ml-11">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                            Attach Image (optional)
                                        </label>

                                        {/* Show existing image if present and no new image selected */}
                                        {requirement.imageUrl && !requirement.image && (
                                            <div className="mb-3 flex items-center gap-2 p-2 bg-white border border-green-200 rounded-xl w-fit shadow-sm">
                                                <img
                                                    src={`http://${window.location.hostname}:5000${requirement.imageUrl}`}
                                                    alt="Current requirement"
                                                    className="h-12 w-12 object-cover rounded-lg"
                                                />
                                                <span className="text-xs text-green-700 font-bold px-2">✓ Current image attached</span>
                                            </div>
                                        )}

                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleRequirementImageChange(index, e.target.files[0])}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-darji-accent file:text-white hover:file:bg-darji-primary transition-all cursor-pointer"
                                        />
                                        {requirement.image && (
                                            <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                                                <span>✓</span> New image selected: {requirement.image.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <p className="text-[10px] text-gray-400 mt-4 uppercase tracking-wide font-medium">
                        * Images can be updated later from the Order Details page.
                    </p>
                </div>

                {/* Action Buttons */}
                {/* Desktop Action Buttons */}
                <div className="hidden md:flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => navigate(`/orders/${id}`)}
                        className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition-all"
                    >
                        <FiX /> <span>Cancel</span>
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center space-x-2 px-6 py-3 bg-darji-primary text-white rounded-xl hover:bg-darji-primary/90 font-bold shadow-lg shadow-darji-primary/20 transition-all disabled:opacity-50"
                    >
                        <FiSave />
                        <span>{saving ? 'Saving...' : 'Save & Regenerate'}</span>
                    </button>
                </div>

                {/* Mobile Sticky Action Bar - Floating Glass */}
                <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 flex gap-3 p-2 bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl ring-1 ring-black/5 animate-in slide-in-from-bottom-6">
                    <button
                        type="button"
                        onClick={() => navigate(`/orders/${id}`)}
                        className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-[2] py-3.5 bg-darji-primary text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
                    >
                        {saving ? 'Saving...' : <><FiSave size={18} /> Save Changes</>}
                    </button>
                </div>
            </form >
        </div >
    );
}
