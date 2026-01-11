import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { FiPlus, FiTrash2, FiSave, FiX, FiArrowLeft, FiPackage, FiCalendar, FiAlignLeft, FiEdit2, FiCopy, FiCheckCircle, FiDownload, FiSettings, FiActivity, FiRotateCcw } from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

const DEFAULT_STANDARD_OUTFITS = [
    { name: '3-Piece Suit', garments: ['Coat', 'Trouser', 'Shirt'] },
    { name: '2-Piece Suit', garments: ['Coat', 'Trouser'] },
    { name: 'Sherwani', garments: [] },
    { name: 'Kurta Pajama', garments: [] },
    { name: 'Shirt & Pant', garments: ['Shirt', 'Trouser'] },
    { name: 'Safari Suit', garments: [] },
    { name: 'Trouser', garments: ['Trouser'] }
];

const MEASUREMENT_STANDARDS = {
    'Shirt': ['Length', 'Chest', 'Waist', 'Shoulder', 'Sleeves', 'Neck', 'Across Back', 'Armhole', 'Cuff'],
    'Trouser': ['Length', 'Inseam L.', 'Waist', 'Front Rise', 'Hip', 'Thigh', 'Knee', 'Bottom'],
    'Coat': ['Length', 'Chest', 'Waist', 'Hip', 'Shoulder', 'Sleeves', 'Across Back', 'H. Back', 'Neck'],
    'Jacket': ['Length', 'Chest', 'Waist', 'Hip', 'Shoulder', 'Sleeves', 'Across Back', 'H. Back', 'Neck'],
    'Pant': ['Length', 'Inseam L.', 'Waist', 'Front Rise', 'Hip', 'Thigh', 'Knee', 'Bottom'],
    'Sherwani': ['Length', 'Chest', 'Waist', 'Hip', 'Shoulder', 'Sleeves', 'Neck', 'Across Back'],
    'Kurta': ['Length', 'Chest', 'Waist', 'Hip', 'Shoulder', 'Sleeves', 'Neck'],
    'Pajama': ['Length', 'Waist', 'Hip', 'Thigh', 'Bottom'],
    'Safari Jacket': ['Length', 'Chest', 'Waist', 'Hip', 'Shoulder', 'Sleeves', 'Neck', 'Across Back'],
    'Waistcoat': ['Length', 'Chest', 'Waist', 'Shoulder', 'Neck', 'Across Back']
};

export default function EditOrder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
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
    const [measurements, setMeasurements] = useState('');
    const [activeFields, setActiveFields] = useState([]);
    const [order, setOrder] = useState(null);
    const [useSmartForm, setUseSmartForm] = useState(true);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [showManageStandardsModal, setShowManageStandardsModal] = useState(false);
    const [standardOutfits, setStandardOutfits] = useState(() => {
        try {
            const saved = localStorage.getItem('darji_standard_outfits');
            return saved ? JSON.parse(saved) : DEFAULT_STANDARD_OUTFITS;
        } catch (e) {
            return DEFAULT_STANDARD_OUTFITS;
        }
    });

    useEffect(() => {
        fetchOrder();
        fetchGarmentTypes();
    }, [id]);

    const fetchOrder = async () => {
        try {
            const response = await api.get(`/orders/${id}`);
            const doc = response.data;
            if (!doc) throw new Error('Order not found');

            setOrder(doc);

            // Pre-fill form with existing data
            // Pre-fill form with existing data
            setItems(doc.items ? doc.items.map(item => ({
                garmentTypeId: item.garmentType?._id || item.garmentType || item.garmentTypeId,
                quantity: item.quantity,
                price: item.price,
                cost: item.cost || 0
            })) : []);

            // Additional Services
            let services = [];
            if (Array.isArray(doc.additionalServices) && doc.additionalServices.length > 0) {
                services = doc.additionalServices.map(s => ({
                    description: s.description,
                    amount: s.amount,
                    cost: s.cost || 0
                }));
            } else if (doc.additionalServices && !Array.isArray(doc.additionalServices)) {
                // Legacy formatted string
                services = [{
                    description: doc.additionalServices,
                    amount: doc.additionalServicesAmount || 0,
                    cost: 0
                }];
            } else {
                services = [{ description: '', amount: 0, cost: 0 }];
            }

            setAdditionalServiceItems(services);

            // Measurements Parsing
            let mStr = '';
            if (doc.measurements) {
                mStr = typeof doc.measurements === 'object'
                    ? JSON.stringify(doc.measurements, null, 2)
                    : doc.measurements;
            }
            setMeasurements(mStr);

            // Parse text to activeFields for Smart Form
            const lines = mStr.split('\n');
            const parsed = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed) return null;

                const headerMatch = trimmed.match(/^={3,}\s*(.+?)\s*={3,}:?$/);
                if (headerMatch) {
                    return { label: `=== ${headerMatch[1]} ===`, value: '', isHeader: true };
                }

                const colonIndex = trimmed.indexOf(':');
                if (colonIndex !== -1) {
                    const label = trimmed.substring(0, colonIndex).trim().replace(/^"|"$/g, '');
                    const value = trimmed.substring(colonIndex + 1).trim().replace(/^"|"$/g, '');
                    return { label: label || 'Field', value: value };
                } else {
                    return { label: trimmed, value: '' };
                }
            }).filter(Boolean);
            setActiveFields(parsed);

            setSpecialRequirements(
                doc.specialRequirements && doc.specialRequirements.length > 0
                    ? doc.specialRequirements.map(r => ({
                        text: r.note,
                        image: null,
                        images: [],
                        existingImages: r.images || (r.imageUrl ? [{ url: r.imageUrl }] : [])
                    }))
                    : []
            );

            setTrialDate(doc.trialDate ? new Date(doc.trialDate).toISOString().split('T')[0] : '');
            setDeliveryDate(doc.deliveryDate ? new Date(doc.deliveryDate).toISOString().split('T')[0] : '');
            setAdvance(doc.advance || 0);
        } catch (error) {
            console.error('Error fetching order:', error);
            setError(error.response?.data?.error || 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    const fetchGarmentTypes = async () => {
        try {
            const response = await api.get('/garments');
            setGarmentTypes(response.data || []);
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
            const subtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
            return total + subtotal;
        }, 0);
        const servicesTotal = additionalServiceItems.reduce((total, service) => {
            return total + (parseFloat(service.amount) || 0);
        }, 0);
        return stitchingTotal + servicesTotal;
    };

    const handleAddRequirement = () => {
        setSpecialRequirements([...specialRequirements, { text: '', images: [], existingImages: [] }]);
    };

    const handleRemoveRequirement = (index) => {
        setSpecialRequirements(specialRequirements.filter((_, i) => i !== index));
    };

    const handleRequirementTextChange = (index, value) => {
        const newRequirements = [...specialRequirements];
        newRequirements[index].text = value;
        setSpecialRequirements(newRequirements);
    };

    const handleRequirementImageChange = (index, files) => {
        const newRequirements = [...specialRequirements];
        // Store File array
        newRequirements[index].images = Array.from(files);
        // Legacy single file support
        newRequirements[index].image = files[0];
        setSpecialRequirements(newRequirements);
    };

    // Sync activeFields to measurements string
    useEffect(() => {
        if (activeFields.length > 0) {
            const formatted = activeFields
                .map(f => f.isHeader ? `\n${f.label}` : `${f.label}: ${f.value}`)
                .join('\n').trim();
            setMeasurements(formatted);
        }
    }, [activeFields]);

    const loadStandardTemplate = (type) => {
        const standards = MEASUREMENT_STANDARDS[type];
        const newFields = [
            ...activeFields,
            { label: `=== ${type.toUpperCase()} ===`, value: '', isHeader: true },
            ...standards.map(label => ({ label, value: '' }))
        ];
        setActiveFields(newFields);
        showToast(`Added ${type} fields`, 'success');
    };

    const updateMeasurementField = (index, value) => {
        const newFields = [...activeFields];
        newFields[index].value = value;
        setActiveFields(newFields);
    };

    const removeField = (index) => {
        const field = activeFields[index];
        if (field.isHeader) {
            const sectionName = field.label.replace(/[=]/g, '').trim();
            if (!window.confirm(`Delete entire "${sectionName}" section?`)) return;

            // Find next header or end of list
            let endIndex = index + 1;
            while (endIndex < activeFields.length && !activeFields[endIndex].isHeader) {
                endIndex++;
            }
            // Remove header and all following fields in the section
            const newFields = [...activeFields];
            newFields.splice(index, endIndex - index);
            setActiveFields(newFields);
            showToast(`Removed ${sectionName} section`, 'info');
        } else {
            const newFields = activeFields.filter((_, i) => i !== index);
            setActiveFields(newFields);
        }
    };

    const addCustomField = () => {
        setActiveFields([...activeFields, { label: 'Custom Field', value: '' }]);
    };

    const updateFieldLabel = (index, newLabel) => {
        const newFields = [...activeFields];
        newFields[index].label = newLabel;
        setActiveFields(newFields);
    };

    const applyStandardOutfit = (standard) => {
        const newFields = [];
        standard.garments.forEach(garment => {
            if (MEASUREMENT_STANDARDS[garment]) {
                newFields.push({ label: `=== ${garment.toUpperCase()} ===`, value: '', isHeader: true });
                MEASUREMENT_STANDARDS[garment].forEach(label => {
                    newFields.push({ label, value: '' });
                });
            }
        });
        setActiveFields(newFields);
        showToast(`Loaded ${standard.name} template`, 'success');
    };

    const handleResetMeasurements = () => {
        if (window.confirm('Clear all measurement values?')) {
            const resetFields = activeFields.map(f => ({ ...f, value: '' }));
            setActiveFields(resetFields);
            showToast('Measurements reset', 'info');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        // Client-side validation
        if (items.some(k => !k.garmentTypeId)) {
            const msg = 'Please select a Garment Type for all items.';
            setError(msg);
            showToast(msg, 'error');
            setSaving(false);
            window.scrollTo(0, 0);
            return;
        }

        try {
            // Prepare form data
            const processedItems = items.map(item => ({
                garmentType: item.garmentTypeId, // Ensure ID is sent
                quantity: parseInt(item.quantity) || 1,
                price: parseFloat(item.price) || 0,
                subtotal: (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1),
                cost: parseFloat(item.cost) || 0
            }));

            console.log('Processed Items Payload:', JSON.stringify(processedItems, null, 2));

            const processedServices = additionalServiceItems
                .filter(s => s.description.trim())
                .map(s => ({
                    description: s.description,
                    amount: parseFloat(s.amount) || 0,
                    cost: parseFloat(s.cost) || 0
                }));

            const itemsTotal = processedItems.reduce((sum, item) => sum + item.subtotal, 0);
            const servicesTotal = processedServices.reduce((sum, s) => sum + s.amount, 0);
            const total = itemsTotal + servicesTotal;

            // Filter requirements to allow text OR image (so images without text aren't lost)
            const validRequirements = specialRequirements
                .filter(r => (r.text && r.text.trim()) || r.imageUrl || r.image);

            const processedRequirements = validRequirements.map(r => ({
                note: r.text ? r.text.trim() : '',
                imageUrl: r.existingImages?.[0]?.url || r.imageUrl, // Preserve main image
                images: r.existingImages || [] // Preserve existing images metadata
            }));

            const orderPayload = {
                items: processedItems,
                additionalServices: processedServices,
                measurements: measurements,
                specialRequirements: processedRequirements,
                trialDate: trialDate ? new Date(trialDate).toISOString() : null,
                deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
                advance: parseFloat(advance) || 0,
                totalAmount: total,
                finalAmount: parseFloat(total), // Assuming finalAmount should default to total if not explicitly set
                status: order.status // Keep existing status
            };

            const formData = new FormData();
            formData.append('orderData', JSON.stringify(orderPayload));

            // Append images with matching indices
            validRequirements.forEach((req, index) => {
                // New multiple images
                if (req.images && req.images.length > 0) {
                    req.images.forEach(file => {
                        if (file instanceof File) {
                            formData.append(`requirements[${index}][images]`, file);
                        }
                    });
                }
                // Fallback for single image if no array but single file exists
                else if (req.image instanceof File) {
                    formData.append(`requirements[${index}][image]`, req.image);
                }
            });

            await api.put(`/orders/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            showToast('Order updated successfully!', 'success');
            navigate(`/orders/${id}`);
        } catch (error) {
            console.error('Error updating order:', error);
            let errorMsg = error.response?.data?.error || 'Failed to update order';

            if (error.response?.data?.details && Array.isArray(error.response.data.details)) {
                const detailedErrors = error.response.data.details
                    .map(d => (d.field ? d.field + ': ' : '') + d.message)
                    .join(' | ');
                errorMsg = 'Validation Error: ' + detailedErrors;
            }

            setError(errorMsg);
            showToast(errorMsg, 'error');
            window.scrollTo(0, 0);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center py-12">Loading...</div>;
    if (!order) return <div className="text-center py-12">Order not found</div>;

    return (
        <div className="fade-in pb-40 md:pb-12 max-w-4xl mx-auto px-4 pt-6">
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
                            <span className="text-gray-500 text-sm font-medium">{order.client?.name}</span>
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
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Order Items</h2>
                    </div>

                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div key={index} className="bg-gray-50 md:bg-transparent p-4 md:p-0 rounded-2xl md:rounded-none border border-gray-200 md:border-0 grid grid-cols-2 md:grid-cols-12 gap-4 items-end relative border-b-0 md:border-b md:pb-3 mb-4 md:mb-0 last:border-0">
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

                                <div className="col-span-2 md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Garment Type</label>
                                    <select
                                        value={item.garmentTypeId}
                                        onChange={(e) => handleItemChange(index, 'garmentTypeId', e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2 text-sm"
                                        required
                                    >
                                        <option value="">-- Select --</option>
                                        {garmentTypes.map(garment => (
                                            <option key={garment._id || garment.id} value={garment._id || garment.id}>
                                                {garment.name} (₹{garment.price})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Qty</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2 text-sm"
                                        required
                                    />
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Price</label>
                                    <input
                                        type="number"
                                        value={item.price}
                                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2 text-sm"
                                        required
                                    />
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Cost</label>
                                    <input
                                        type="number"
                                        value={item.cost}
                                        onChange={(e) => handleItemChange(index, 'cost', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-sm text-gray-500"
                                    />
                                </div>

                                <div className="col-span-2 md:col-span-2 font-bold text-right pt-2 md:pt-0">
                                    ₹{((parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0)).toFixed(2)}
                                </div>

                                <div className="hidden md:block col-span-1 text-right">
                                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700">
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={handleAddItem}
                        className="mt-4 w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 hover:border-darji-accent hover:text-darji-accent rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <FiPlus /> Add Item
                    </button>
                    <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end items-center gap-4">
                        <span className="text-sm font-bold text-gray-500 uppercase">Subtotal</span>
                        <span className="text-xl font-black text-gray-900">₹{items.reduce((acc, i) => acc + ((parseFloat(i.price) || 0) * (parseFloat(i.quantity) || 0)), 0)}</span>
                    </div>
                </div>

                {/* Additional Services */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-bold mb-4">Additional Services</h2>
                    <div className="space-y-4">
                        {additionalServiceItems.map((service, index) => (
                            <div key={index} className="relative bg-slate-50 p-4 rounded-xl md:bg-transparent md:p-0 border border-slate-200 md:border-none">
                                <div className="flex flex-col md:flex-row gap-4 md:items-end">
                                    <div className="w-full md:flex-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                                        <input
                                            type="text"
                                            value={service.description}
                                            onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-darji-accent/10 focus:border-darji-accent outline-none transition-all"
                                            placeholder="Service name (e.g. Rush Order)"
                                        />
                                    </div>

                                    <div className="flex gap-3 w-full md:w-auto">
                                        <div className="flex-1 md:w-32">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                                                <input
                                                    type="number"
                                                    value={service.amount}
                                                    onChange={(e) => handleServiceChange(index, 'amount', e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-6 pr-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-darji-accent/10 focus:border-darji-accent outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 md:w-32">
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Cost</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-slate-300 font-bold text-xs">₹</span>
                                                <input
                                                    type="number"
                                                    value={service.cost}
                                                    onChange={(e) => handleServiceChange(index, 'cost', e.target.value)}
                                                    className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2.5 pl-6 pr-2 text-sm font-medium text-slate-500 focus:ring-2 focus:ring-darji-accent/10 focus:border-darji-accent outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden md:block">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveService(index)}
                                            className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Remove Service"
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveService(index)}
                                    className="md:hidden absolute top-2 right-2 p-2 text-slate-400 hover:text-rose-500 bg-white rounded-lg shadow-sm border border-slate-100"
                                >
                                    <FiTrash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={handleAddService}
                        className="mt-4 w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 hover:border-darji-accent hover:text-darji-accent rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <FiPlus /> Add Service
                    </button>
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end items-center gap-4">
                        <span className="text-sm font-bold text-gray-500 uppercase">Services Total</span>
                        <span className="text-xl font-black text-gray-700">₹{additionalServiceItems.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0)}</span>
                    </div>
                </div>

                {/* Measurements */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center">
                            <span className="w-1.5 h-6 bg-darji-accent rounded-full mr-3"></span>
                            Measurements
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto">
                            <button type="button" onClick={() => setShowManageStandardsModal(true)} className="px-4 py-2.5 sm:py-2 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                <FiPlus /> New Standard
                            </button>
                            <button type="button" onClick={() => setShowSaveTemplate(true)} className="px-4 py-2.5 sm:py-2 text-xs font-bold bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                                <FiCheckCircle /> Save Template
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Quick Load Toolbar */}
                        <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100 items-center">
                            <div className="flex items-center gap-2 mr-2">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Load:</div>
                                <button
                                    type="button"
                                    onClick={() => setShowManageStandardsModal(true)}
                                    className="p-1 text-slate-400 hover:text-darji-accent hover:bg-indigo-50 rounded transition-colors"
                                    title="Manage Standards"
                                >
                                    <FiSettings size={14} />
                                </button>
                            </div>
                            {standardOutfits.map((std, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => applyStandardOutfit(std)}
                                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:border-darji-accent hover:text-darji-accent hover:shadow-sm transition-all shadow-sm"
                                >
                                    + {std.name}
                                </button>
                            ))}
                        </div>

                        {/* Smart Form UI */}
                        {useSmartForm && (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                                {activeFields.map((field, index) => (
                                    field.isHeader ? (
                                        <div key={index} className="col-span-full mt-4 mb-2 border-b border-slate-200 pb-2 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-darji-accent"></div>
                                            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-widest">{field.label.replace(/===/g, '').trim()}</h4>
                                        </div>
                                    ) : (
                                        <div key={index} className="relative group/field bg-white p-1 rounded-xl shadow-sm border border-slate-100 focus-within:ring-2 focus-within:ring-darji-accent transition-shadow">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase px-2 pt-1 truncate" title={field.label}>{field.label}</label>
                                            <input
                                                type="text"
                                                value={field.value}
                                                onChange={(e) => updateMeasurementField(index, e.target.value)}
                                                className="w-full px-2 py-1.5 bg-transparent border-none focus:ring-0 font-mono text-sm font-bold text-slate-800 placeholder-slate-300"
                                                placeholder="0.0"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeField(index)}
                                                className="absolute top-1 right-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover/field:opacity-100 transition-opacity p-1"
                                            >
                                                <FiTrash2 size={12} />
                                            </button>
                                        </div>
                                    )
                                ))}
                                <button
                                    type="button"
                                    onClick={addCustomField}
                                    className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-darji-accent hover:text-darji-accent hover:bg-white transition-all min-h-[70px] group"
                                >
                                    <div className="p-1.5 bg-slate-100 rounded-full group-hover:bg-indigo-50 transition-colors mb-1">
                                        <FiPlus size={14} />
                                    </div>
                                    <span className="text-[10px] font-bold">Add Field</span>
                                </button>
                            </div>
                        )}

                        {/* Raw Text Area */}
                        <div className={useSmartForm ? 'hidden' : 'block'}>
                            <textarea
                                value={measurements}
                                onChange={(e) => setMeasurements(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-darji-accent font-mono text-sm leading-relaxed text-slate-700"
                                rows="8"
                                placeholder="Enter measurements manually..."
                            />
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs text-slate-400 px-1 pt-2">
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <span className="font-medium bg-slate-100 px-2.5 py-1.5 rounded-lg flex-1 md:flex-none text-center">
                                    {useSmartForm ? `${activeFields.filter(f => !f.isHeader).length} active fields` : 'Manual Text Mode'}
                                </span>
                                {useSmartForm && (
                                    <button
                                        type="button"
                                        onClick={handleResetMeasurements}
                                        className="text-rose-500 font-bold hover:underline hover:text-rose-600 flex items-center gap-1 px-2 py-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Clear all values"
                                    >
                                        <FiRotateCcw size={14} /> Reset
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setUseSmartForm(!useSmartForm)}
                                className="w-full md:w-auto text-darji-accent font-bold hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors flex items-center justify-center md:justify-end gap-2 border border-transparent hover:border-indigo-100"
                            >
                                <FiActivity /> {useSmartForm ? 'Switch to Text Editor' : 'Switch to Smart Form'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Save Template Modal */}
                {showSaveTemplate && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                            <h3 className="font-bold text-lg mb-4">Save Measurement Template</h3>
                            <input
                                type="text"
                                placeholder="Template Name (e.g. John's Suit)"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-darji-accent"
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (templateName.trim()) {
                                            showToast('Template saving feature will be implemented soon', 'info');
                                            setShowSaveTemplate(false);
                                            setTemplateName('');
                                        }
                                    }}
                                    className="px-4 py-2 bg-darji-accent text-white rounded-lg font-bold hover:bg-indigo-700"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dates & Payment */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-bold mb-4">Details & Payment</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Trial Date</label>
                            <input type="date" value={trialDate} onChange={e => setTrialDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Delivery Date</label>
                            <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Advance (₹)</label>
                            <input type="number" value={advance} onChange={e => setAdvance(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-bold" />
                        </div>
                    </div>
                    <div className="mt-6 p-4 bg-gray-100 rounded-xl flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-600">Total Balance</span>
                        <span className="text-2xl font-black text-darji-primary">₹{(calculateTotal() - (parseFloat(advance) || 0)).toFixed(2)}</span>
                    </div>
                </div>

                {/* Special Requirements */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Special Requirements</h2>
                        <button type="button" onClick={handleAddRequirement} className="text-darji-accent font-bold text-sm flex items-center gap-1"><FiPlus /> Add</button>
                    </div>
                    <div className="space-y-4">
                        {specialRequirements.map((req, index) => (
                            <div key={index} className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                                <div className="flex gap-4 mb-3">
                                    <div className="flex-1">
                                        <textarea
                                            value={req.text}
                                            onChange={e => handleRequirementTextChange(index, e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white"
                                            rows="2"
                                            placeholder="Requirement details..."
                                        />
                                    </div>
                                    <button type="button" onClick={() => handleRemoveRequirement(index)} className="text-red-500 self-start"><FiTrash2 /></button>
                                </div>
                                <div>
                                    <input type="file" multiple accept="image/*" onChange={e => handleRequirementImageChange(index, e.target.files)} className="text-xs text-gray-500 mb-2" />

                                    {/* Existing Images */}
                                    {req.existingImages && req.existingImages.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {req.existingImages.map((img, i) => (
                                                <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="block">
                                                    <img src={img.url} alt={`Existing ${i}`} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {/* New Selected Images Preview (Text only for simplicity or basic prev) */}
                                    {req.images && req.images.length > 0 && (
                                        <div className="text-xs text-green-600 font-bold">
                                            {req.images.length} new image(s) selected
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="hidden md:flex justify-end gap-4">
                    <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Cancel</button>
                    <button type="submit" disabled={saving} className="px-8 py-3 bg-darji-primary text-white font-bold rounded-xl shadow-lg hover:bg-black transition-colors disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
