import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { FiPlus, FiTrash2, FiSend, FiPackage, FiCalendar, FiUser, FiPhone, FiMail, FiMapPin, FiAlignLeft, FiImage, FiArrowLeft, FiCheckCircle, FiSave, FiClock } from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

export default function NewOrder() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [clients, setClients] = useState([]);
    const [garmentTypes, setGarmentTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showNewClient, setShowNewClient] = useState(false);
    const [showNewGarment, setShowNewGarment] = useState(false);
    const [measurements, setMeasurements] = useState('');
    const [measurementTemplates, setMeasurementTemplates] = useState([]);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [showNewStandardModal, setShowNewStandardModal] = useState(false);
    const [newStandardName, setNewStandardName] = useState('');
    const [newStandardFields, setNewStandardFields] = useState([{ label: '', value: '' }]);

    // Hardcoded Measurement Standards
    const MEASUREMENT_STANDARDS = {
        'Shirt': ['Length', 'Chest', 'Waist', 'Shoulder', 'Sleeves', 'Neck', 'Across Back', 'Armhole', 'Cuff'],
        'Trouser': ['Length', 'Inseam L.', 'Waist', 'Front Rise', 'Hip', 'Thigh', 'Knee', 'Bottom'],
        'Coat': ['Length', 'Chest', 'Waist', 'Hip', 'Shoulder', 'Sleeves', 'Across Back', 'H. Back', 'Neck'],
        'Jacket': ['Length', 'Chest', 'Waist', 'Hip', 'Shoulder', 'Sleeves', 'Across Back', 'H. Back', 'Neck']
    };

    const [activeFields, setActiveFields] = useState([]);
    const [useSmartForm, setUseSmartForm] = useState(true);

    // Form state
    const [selectedClient, setSelectedClient] = useState('');
    const [items, setItems] = useState([{ garmentTypeId: '', quantity: 1, price: 0 }]);
    const [specialRequirements, setSpecialRequirements] = useState([{ note: '', image: null }]);
    const [trialDate, setTrialDate] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [advance, setAdvance] = useState(0);
    const [additionalServiceItems, setAdditionalServiceItems] = useState([{ description: '', amount: 0, cost: 0 }]);

    // New client form
    const [newClient, setNewClient] = useState({
        name: '',
        phone: '',
        email: '',
        address: ''
    });

    // New garment type form
    const [newGarment, setNewGarment] = useState({
        name: '',
        price: '',
        cost: '',
        description: ''
    });

    useEffect(() => {
        fetchClients();
        fetchGarmentTypes();
        fetchMeasurementTemplates();
    }, []);

    useEffect(() => {
        if (selectedClient) {
            fetchLastMeasurements(selectedClient);
        }
    }, [selectedClient]);

    const fetchClients = async () => {
        try {
            const response = await api.get('/clients');
            setClients(response.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
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

    const fetchMeasurementTemplates = async () => {
        try {
            const response = await api.get('/measurement-templates');
            setMeasurementTemplates(response.data);
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    const fetchLastMeasurements = async (clientId) => {
        try {
            const response = await api.get(`/measurement-templates/client/${clientId}/last`);
            if (response.data && response.data.measurements) {
                setMeasurements(response.data.measurements);
            }
        } catch (error) {
            console.error('Error fetching last measurements:', error);
        }
    };

    const saveAsTemplate = async () => {
        if (!templateName.trim()) {
            showToast('Please enter a template name', 'warning');
            return;
        }

        try {
            await api.post('/measurement-templates', {
                name: templateName,
                clientId: selectedClient || null,
                garmentTypeId: null,
                measurements: measurements
            });

            await fetchMeasurementTemplates();
            setShowSaveTemplate(false);
            setTemplateName('');
            showToast('Template saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving template:', error);
            showToast('Failed to save template', 'error');
        }
    };

    const loadGlobalTemplate = (template) => {
        // Handle potential double-stringification from old server logic
        let rawMeasurements = template.measurements;
        if (typeof rawMeasurements === 'string' && rawMeasurements.startsWith('"') && rawMeasurements.endsWith('"')) {
            try {
                // Try treating it as a JSON string first
                rawMeasurements = JSON.parse(rawMeasurements);
            } catch (e) {
                // Fallback manual cleanup
                rawMeasurements = rawMeasurements.slice(1, -1).replace(/\\n/g, '\n');
            }
        } else {
            rawMeasurements = template.measurements;
        }

        const lines = rawMeasurements.split('\n');
        const parsed = lines.map(line => {
            const [label, ...valParts] = line.split(':');
            const cleanLabel = (label?.trim() || '').replace(/^"|"$/g, '');
            return { label: cleanLabel, value: '' }; // Load labels only, empty values for new order
        }).filter(f => f.label);

        setActiveFields(parsed);
        setUseSmartForm(true);
        showToast(`${template.name} outfit loaded`, 'success');
    };

    const saveGlobalStandard = async () => {
        if (!newStandardName.trim()) {
            showToast('Please enter an outfit name', 'warning');
            return;
        }

        const validFields = newStandardFields.filter(f => f.label.trim());
        if (validFields.length === 0) {
            showToast('Please add at least one measurement field', 'warning');
            return;
        }

        const formattedMeasurements = validFields.map(f => `${f.label.trim()}: `).join('\n');

        try {
            await api.post('/measurement-templates', {
                name: newStandardName,
                clientId: null, // Global template
                garmentTypeId: null,
                measurements: formattedMeasurements
            });

            await fetchMeasurementTemplates();
            setShowNewStandardModal(false);
            setNewStandardName('');
            setNewStandardFields([{ label: '', value: '' }]);
            showToast(`New standard outfit "${newStandardName}" saved!`, 'success');
        } catch (error) {
            console.error('Error saving standard:', error);
            showToast('Failed to save outfit type', 'error');
        }
    };

    const [showTemplateManager, setShowTemplateManager] = useState(false);

    const handleDeleteGlobalTemplate = async (e, templateId) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this outfit?')) return;

        try {
            await api.delete(`/measurement-templates/${templateId}`);
            await fetchMeasurementTemplates();
            showToast('Outfit deleted', 'success');
        } catch (error) {
            console.error('Error deleting outfit:', error);
            showToast('Failed to delete outfit', 'error');
        }
    };

    const handleDeleteTemplate = async (e, templateId) => {
        e.preventDefault(); // Prevent dropdown from closing if inside
        if (!confirm('Delete this saved template?')) return;

        try {
            await api.delete(`/measurement-templates/${templateId}`);
            await fetchMeasurementTemplates();
            showToast('Template deleted', 'success');
        } catch (error) {
            console.error('Error deleting template:', error);
            showToast('Failed to delete template', 'error');
        }
    };

    const loadTemplate = async (templateId) => {
        try {
            const response = await api.get(`/measurement-templates/${templateId}`);
            const template = response.data;
            let rawMeasurements = template.measurements;

            // Handle potential double-stringification
            if (typeof rawMeasurements === 'string' && rawMeasurements.startsWith('"') && rawMeasurements.endsWith('"')) {
                try {
                    rawMeasurements = JSON.parse(rawMeasurements);
                } catch (e) {
                    rawMeasurements = rawMeasurements.slice(1, -1).replace(/\\n/g, '\n');
                }
            }

            setMeasurements(rawMeasurements);

            // Try to parse into smart form
            if (useSmartForm) {
                const lines = rawMeasurements.split('\n');
                const parsed = lines.map(line => {
                    // Check for header
                    const headerMatch = line.match(/^===\s+(.+)\s+===:?\s*$/);
                    if (headerMatch) {
                        return { label: `=== ${headerMatch[1]} ===`, value: '', isHeader: true };
                    }

                    const [label, ...valParts] = line.split(':');
                    const cleanLabel = (label?.trim() || '').replace(/^"|"$/g, '');
                    const cleanValue = valParts.join(':').trim().replace(/^"|"$/g, '');
                    return { label: cleanLabel, value: cleanValue };
                }).filter(f => f.label);

                if (parsed.length > 0) setActiveFields(parsed);
            }

            showToast('Template loaded', 'info');
        } catch (error) {
            console.error('Error loading template:', error);
            showToast('Failed to load template', 'error');
        }
    };

    // Smart Form Handlers
    useEffect(() => {
        if (useSmartForm && activeFields.length > 0) {
            const formatted = activeFields
                .filter(f => f.label || f.value)
                .map(f => `${f.label}: ${f.value}`)
                .join('\n');
            setMeasurements(formatted);
        }
    }, [activeFields, useSmartForm]);

    const loadStandardTemplate = (type) => {
        const standards = MEASUREMENT_STANDARDS[type];
        if (standards) {
            // Append new section with header
            const newFields = [
                ...activeFields,
                { label: `=== ${type.toUpperCase()} ===`, value: '', isHeader: true },
                ...standards.map(label => ({ label, value: '' }))
            ];
            setActiveFields(newFields);
            setUseSmartForm(true);
            showToast(`${type} added to measurements`, 'success');
        }
    };




    const updateMeasurementField = (index, field, value) => {
        // Use immutable update pattern to ensure React detects changes correctly
        const newFields = activeFields.map((f, i) =>
            i === index ? { ...f, [field]: value } : f
        );
        setActiveFields(newFields);
    };

    const addCustomField = () => {
        setActiveFields([...activeFields, { label: '', value: '' }]);
    };



    const removeField = (index) => {
        const newFields = activeFields.filter((_, i) => i !== index);
        setActiveFields(newFields);
    };

    const handleAddItem = () => {
        setItems([...items, { garmentTypeId: '', quantity: 1, price: 0 }]);
    };

    const handleRemoveItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        // Auto-fill price when garment type is selected
        if (field === 'garmentTypeId') {
            const garment = garmentTypes.find(g => g.id === value);
            if (garment) {
                newItems[index].price = garment.price;
            }
        }

        setItems(newItems);
    };

    const handleAddRequirement = () => {
        setSpecialRequirements([...specialRequirements, { note: '', image: null }]);
    };

    const handleRemoveRequirement = (index) => {
        if (specialRequirements.length > 1) {
            setSpecialRequirements(specialRequirements.filter((_, i) => i !== index));
        }
    };

    const handleRequirementChange = (index, field, value) => {
        const newRequirements = [...specialRequirements];
        newRequirements[index][field] = value;
        setSpecialRequirements(newRequirements);
    };

    const handleRequirementImageChange = (index, file) => {
        const newRequirements = [...specialRequirements];
        newRequirements[index].image = file;
        setSpecialRequirements(newRequirements);
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

    const handleCreateClient = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/clients', newClient);
            setClients([...clients, response.data]);
            setSelectedClient(response.data.id);
            setShowNewClient(false);
            setNewClient({ name: '', phone: '', email: '', address: '' });
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create client');
        }
    };

    const handleCreateGarment = async (e) => {
        e.preventDefault();

        // Validate required fields
        if (!newGarment.name || !newGarment.price || !newGarment.cost) {
            setError('Please fill in all required fields (Name, Price, and Cost)');
            return;
        }

        try {
            const garmentData = {
                name: newGarment.name,
                price: parseFloat(newGarment.price),
                cost: parseFloat(newGarment.cost) || 0,
                description: newGarment.description
            };
            const response = await api.post('/garments', garmentData);
            setGarmentTypes([...garmentTypes, response.data]);

            // Auto-select the new garment in the first empty item
            const emptyItemIndex = items.findIndex(item => !item.garmentTypeId);
            if (emptyItemIndex !== -1) {
                const newItems = [...items];
                newItems[emptyItemIndex].garmentTypeId = response.data.id;
                newItems[emptyItemIndex].price = response.data.price;
                setItems(newItems);
            }

            setShowNewGarment(false);
            setNewGarment({ name: '', price: '', cost: '', description: '' });
            setError(''); // Clear any previous errors
        } catch (error) {
            console.error('Error creating garment:', {
                message: error.message,
                response: error.response?.data
            });
            const errorMessage = error.response?.data?.error || error.message || 'Failed to create garment type';
            setError(errorMessage);
            showToast('Error creating garment: ' + errorMessage, 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const formData = new FormData();

            // Add basic order data
            formData.append('clientId', selectedClient);
            formData.append('trialDate', trialDate || '');
            formData.append('deliveryDate', deliveryDate || '');
            formData.append('advance', parseFloat(advance) || 0);

            // Add items as JSON
            formData.append('items', JSON.stringify(items.map(item => ({
                garmentTypeId: item.garmentTypeId,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.price * item.quantity
            }))));

            // Add additional services as JSON
            const validServices = additionalServiceItems
                .filter(service => service.description.trim() && service.amount > 0)
                .map(service => ({
                    description: service.description.trim(),
                    amount: parseFloat(service.amount),
                    cost: parseFloat(service.cost) || 0
                }));
            formData.append('additionalServiceItems', JSON.stringify(validServices));

            // Add special requirements as JSON
            const validRequirements = specialRequirements
                .filter(req => req.note.trim())
                .map(req => req.note.trim());
            formData.append('specialRequirements', JSON.stringify(validRequirements));

            // Add requirement images
            specialRequirements.forEach((req, index) => {
                if (req.image) {
                    formData.append('requirementImages', req.image);
                    formData.append('requirementImageIndices', index.toString());
                }
            });

            // Add measurements
            if (measurements.trim()) {
                formData.append('measurements', measurements.trim());
            }

            const response = await api.post('/orders', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Show success and redirect
            showToast('Order created successfully! Invoice generated.', 'success');
            navigate('/orders');
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create order');
        } finally {
            setLoading(false);
        }
    };




    return (
        <div className="fade-in max-w-5xl mx-auto pb-20 md:pb-0">
            {/* Header */}
            <div className="mb-8 pt-2">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-4 flex items-center text-gray-500 hover:text-darji-primary transition-colors text-sm font-medium active:scale-95 duration-200"
                >
                    <FiArrowLeft className="mr-1" /> Back
                </button>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Create New Order</h1>
                <p className="text-gray-500 mt-2 font-medium">Enter details to generate a new order & invoice</p>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-xl animate-shake">
                    <p className="text-red-700 font-medium">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Client Selection */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-1.5 h-6 bg-darji-accent rounded-full mr-3"></span>
                        Client Information
                    </h2>

                    {!showNewClient ? (
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-700">Select Client</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <FiUser />
                                </div>
                                <select
                                    value={selectedClient}
                                    onChange={(e) => setSelectedClient(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                                    required
                                >
                                    <option value="">-- Choose a client --</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>
                                            {client.name} - {client.phone}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowNewClient(true)}
                                className="inline-flex items-center text-darji-accent font-bold text-sm hover:underline mt-2"
                            >
                                <FiPlus className="mr-1" /> Add New Client
                            </button>
                        </div>
                    ) : (
                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-darji-primary">New Client Details</h3>
                                <button type="button" onClick={() => setShowNewClient(false)} className="text-gray-400 hover:text-red-500"><FiTrash2 /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name *</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><FiUser /></div>
                                        <input
                                            type="text"
                                            value={newClient.name}
                                            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-darji-accent"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Phone *</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><FiPhone /></div>
                                        <input
                                            type="tel"
                                            value={newClient.phone}
                                            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-darji-accent"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><FiMail /></div>
                                        <input
                                            type="email"
                                            value={newClient.email}
                                            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-darji-accent"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Address</label>
                                    <div className="relative">
                                        <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none text-gray-400"><FiMapPin /></div>
                                        <textarea
                                            value={newClient.address}
                                            onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-darji-accent"
                                            rows="1"
                                        />
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCreateClient}
                                className="w-full py-3 bg-darji-accent text-white font-bold rounded-xl hover:bg-blue-600 shadow-md transition-all active:scale-95"
                            >
                                Save New Client
                            </button>
                        </div>
                    )}
                </div>

                {/* Order Items */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-1.5 h-6 bg-darji-accent rounded-full mr-3"></span>
                        Order Items
                    </h2>

                    <div className="space-y-6">
                        {items.map((item, index) => (
                            <div key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative group transition-all hover:border-darji-accent/50 hover:shadow-sm">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start md:items-end">
                                    <div className="md:col-span-5">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Garment Type</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                <FiPackage />
                                            </div>
                                            <select
                                                value={item.garmentTypeId}
                                                onChange={(e) => handleItemChange(index, 'garmentTypeId', e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-darji-accent"
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

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Qty</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-darji-accent text-center font-bold"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Price (₹)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-bold text-xs">₹</div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.price}
                                                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-darji-accent font-medium"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <div className="bg-white px-3 py-2.5 rounded-lg border border-gray-200 font-bold text-gray-800 text-center">
                                            ₹{(item.quantity * item.price).toFixed(0)}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="absolute -top-2 -right-2 p-1.5 bg-white text-red-500 shadow-md rounded-full border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                                        disabled={items.length === 1}
                                    >
                                        <FiTrash2 size={16} />
                                    </button>
                                </div>

                                {!showNewGarment && (
                                    <button type="button" onClick={() => setShowNewGarment(true)} className="text-xs font-bold text-darji-accent mt-2 hover:underline">
                                        + New Garment Type
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {showNewGarment && (
                        <div className="mt-4 p-4 border border-darji-accent border-dashed rounded-xl bg-blue-50/30">
                            <h4 className="font-bold text-sm text-darji-primary mb-3">Create New Garment Type</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <input type="text" placeholder="Name *" value={newGarment.name} onChange={(e) => setNewGarment({ ...newGarment, name: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                                <input type="number" placeholder="Price *" value={newGarment.price} onChange={(e) => setNewGarment({ ...newGarment, price: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                                <input type="number" placeholder="Cost *" value={newGarment.cost} onChange={(e) => setNewGarment({ ...newGarment, cost: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                                <div className="flex gap-2">
                                    <button type="button" onClick={handleCreateGarment} className="flex-1 bg-darji-accent text-white rounded-lg text-sm font-bold shadow-sm">Save</button>
                                    <button type="button" onClick={() => setShowNewGarment(false)} className="flex-1 bg-white text-gray-600 border border-gray-300 rounded-lg text-sm font-bold">Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleAddItem}
                        className="mt-6 w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-darji-accent hover:text-darji-accent hover:bg-blue-50/50 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                        <FiPlus size={20} /> Add Another Item
                    </button>

                    <div className="mt-6 flex justify-end items-center">
                        <span className="text-gray-500 font-medium mr-3">Subtotal:</span>
                        <span className="text-2xl font-black text-gray-900">₹{items.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}</span>
                    </div>
                </div>

                {/* Additional Services */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-1.5 h-6 bg-darji-accent rounded-full mr-3"></span>
                        Additional Services
                    </h2>
                    <div className="space-y-4">
                        {additionalServiceItems.map((service, index) => (
                            <div key={index} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group">
                                <button type="button" onClick={() => handleRemoveService(index)} className="absolute -top-2 -right-2 p-1.5 bg-white text-red-500 shadow rounded-full border border-gray-100 opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"><FiTrash2 size={16} /></button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                                        <input type="text" value={service.description} onChange={(e) => handleServiceChange(index, 'description', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-darji-accent font-medium text-gray-800" placeholder="e.g. Lining Fabric" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Amount (₹)</label>
                                            <input type="number" value={service.amount} onChange={(e) => handleServiceChange(index, 'amount', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-darji-accent font-bold text-gray-800" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cost (₹)</label>
                                            <input type="number" value={service.cost} onChange={(e) => handleServiceChange(index, 'cost', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-darji-accent text-sm text-gray-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={handleAddService}
                            className="mt-2 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold hover:border-darji-accent hover:text-darji-accent hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <FiPlus /> Add Service
                        </button>
                    </div>
                </div>

                {/* Dates & Payment */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-1.5 h-6 bg-darji-accent rounded-full mr-3"></span>
                        Dates & Payment
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        {/* Dates */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Trial Date</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><FiCalendar /></div>
                                    <input type="date" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Delivery Date</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><FiCheckCircle /></div>
                                    <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent" />
                                </div>
                            </div>
                        </div>

                        {/* Payment */}
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-gray-600 font-medium">Grand Total</span>
                                <span className="text-2xl font-black text-gray-900">₹{calculateTotal().toFixed(2)}</span>
                            </div>

                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Advance Payment (₹)</label>
                            <div className="relative mb-4">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-bold">₹</div>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={calculateTotal()}
                                    value={advance}
                                    onChange={(e) => setAdvance(e.target.value)}
                                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 font-bold text-lg text-green-700"
                                    placeholder="0"
                                />
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                <span className="text-sm font-bold text-gray-500">Balance Due</span>
                                <span className="text-xl font-bold text-red-500">₹{(calculateTotal() - (parseFloat(advance) || 0)).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Special Requirements Section */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 relative overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-darji-accent to-darji-primary"></div>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Special Requirements</h2>
                            <p className="text-sm text-gray-500 mt-1">Measurements notes & style preferences</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddRequirement}
                            className="flex items-center space-x-2 bg-blue-50 text-darji-accent px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors font-bold text-sm"
                        >
                            <FiPlus />
                            <span>Add Note</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {specialRequirements.map((req, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-darji-accent text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div className="relative">
                                            <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none text-gray-400"><FiAlignLeft /></div>
                                            <textarea
                                                value={req.note}
                                                onChange={(e) => handleRequirementChange(index, 'note', e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-darji-accent text-gray-800 font-medium"
                                                placeholder="e.g., Stand collar, Side pockets..."
                                                rows="2"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200">
                                                <FiImage className="text-gray-500" />
                                                <span className="text-xs font-bold text-gray-600">Attach Image</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleRequirementImageChange(index, e.target.files[0])} />
                                            </label>
                                            {req.image && <span className="text-xs text-green-600 font-medium truncate max-w-[150px]">✓ {req.image.name}</span>}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveRequirement(index)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        disabled={specialRequirements.length === 1}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Measurements & Templates Section */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-600">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center">
                            <span className="w-1.5 h-6 bg-darji-accent rounded-full mr-3"></span>
                            Measurements
                        </h2>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setUseSmartForm(true)}
                                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${useSmartForm ? 'bg-white text-darji-accent shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Smart Form
                            </button>
                            <button
                                type="button"
                                onClick={() => { setUseSmartForm(false); setActiveFields([]); }}
                                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${!useSmartForm ? 'bg-white text-darji-accent shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Text Mode
                            </button>
                        </div>
                    </div>

                    {/* Quick Load Buttons with Add Feature */}
                    {useSmartForm && (
                        <div className="mb-6">
                            <div className="flex justify-between items-end mb-3">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Quick Load Standard Outfit</label>
                                <button
                                    type="button"
                                    onClick={() => setShowNewStandardModal(true)}
                                    className="text-xs font-bold text-darji-accent hover:underline flex items-center gap-1"
                                >
                                    <FiPlus /> Add New Outfit
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {/* Hardcoded Standards */}
                                {Object.keys(MEASUREMENT_STANDARDS).map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => loadStandardTemplate(type)}
                                        className="group relative px-4 py-2.5 bg-gray-50 border border-gray-200 hover:border-darji-accent/50 hover:bg-white text-gray-600 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow hover:-translate-y-0.5"
                                    >
                                        <span className="group-hover:text-darji-accent transition-colors">+ {type}</span>
                                    </button>
                                ))}

                                {/* Custom Global Standards */}
                                {measurementTemplates
                                    .filter(t => !t.clientId) // Global templates (no client)
                                    .map(template => (
                                        <div key={template.id} className="group relative flex items-center bg-violet-50 border border-violet-100 rounded-xl transition-all shadow-sm hover:shadow hover:border-violet-300 hover:-translate-y-0.5 overflow-hidden cursor-pointer">
                                            <button
                                                type="button"
                                                onClick={() => loadGlobalTemplate(template)}
                                                className="px-4 py-2.5 text-violet-700 font-bold text-sm hover:bg-violet-100 transition-colors h-full"
                                            >
                                                + {template.name}
                                            </button>
                                            <div className="w-[1px] h-4 bg-violet-200"></div>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteGlobalTemplate(e, template.id)}
                                                className="px-2 py-2.5 text-violet-400 hover:text-red-500 hover:bg-red-50 transition-colors h-full flex items-center justify-center"
                                                title="Remove Outfit"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}



                    {/* Client Templates & Save Button */}
                    <div className="mb-6 space-y-4">
                        {/* Dropdown Selector for Scalability */}
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <select
                                    value=""
                                    onChange={(e) => e.target.value && loadTemplate(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent font-medium text-gray-700 cursor-pointer hover:border-gray-300 transition-colors appearance-none bg-white"
                                >
                                    <option value="">📏 Load client saved template...</option>
                                    {measurementTemplates
                                        .filter(t => t.clientId == selectedClient)
                                        .map(template => (
                                            <option key={template.id} value={template.id}>
                                                {template.name}
                                            </option>
                                        ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Manage Templates Toggle */}
                        {measurementTemplates.filter(t => t.clientId == selectedClient).length > 0 && (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setShowTemplateManager(!showTemplateManager)}
                                    className="text-xs font-bold text-gray-500 hover:text-darji-accent flex items-center gap-1 transition-colors select-none"
                                >
                                    {showTemplateManager ? 'Hide' : 'Manage'} Saved Templates ({measurementTemplates.filter(t => t.clientId == selectedClient).length})
                                </button>

                                {showTemplateManager && (
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-300 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        {measurementTemplates
                                            .filter(t => t.clientId == selectedClient)
                                            .map(template => (
                                                <div key={template.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                                    <span className="text-sm font-medium text-gray-700 truncate">{template.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDeleteTemplate(e, template.id)}
                                                        className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-md transition-colors"
                                                        title="Delete Template"
                                                    >
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 justify-end border-t border-gray-100 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowSaveTemplate(true)}
                                disabled={!measurements.trim()}
                                className="px-6 py-3 bg-darji-accent text-white rounded-xl hover:bg-blue-600 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 transform"
                            >
                                <FiSave />
                                <span className="hidden md:inline">Save Content as New Template</span>
                            </button>
                        </div>
                    </div>


                    {/* Smart Form Grid */}
                    {useSmartForm ? (
                        <div className="space-y-4">
                            {activeFields.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {activeFields.map((field, index) => (
                                        field.isHeader ? (
                                            <div key={index} className="col-span-full mt-6 mb-2 flex items-center gap-4 animate-in fade-in slide-in-from-left-2">
                                                <div className="h-px flex-1 bg-gray-200"></div>
                                                <span className="font-black text-gray-500 text-xs tracking-widest uppercase bg-gray-50 px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">
                                                    {field.label.replace(/===/g, '').trim()}
                                                </span>
                                                <div className="h-px flex-1 bg-gray-200"></div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeField(index)}
                                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                    title="Remove Section"
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div key={index} className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                                                <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex focus-within:ring-2 focus-within:ring-darji-accent focus-within:bg-white transition-all">
                                                    <input
                                                        type="text"
                                                        value={field.label}
                                                        onChange={(e) => updateMeasurementField(index, 'label', e.target.value)}
                                                        className="w-1/3 px-3 py-3 border-r border-gray-200 bg-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider outline-none text-right"
                                                        placeholder="LABEL"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={field.value}
                                                        onChange={(e) => updateMeasurementField(index, 'value', e.target.value)}
                                                        className="w-2/3 px-3 py-3 bg-transparent font-bold text-gray-900 outline-none"
                                                        placeholder="Value"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeField(index)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        )
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addCustomField}
                                        className="flex items-center justify-center gap-2 h-full min-h-[50px] border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold hover:border-darji-accent hover:text-darji-accent hover:bg-blue-50/30 transition-all text-sm"
                                    >
                                        <FiPlus /> Add Field
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                                    <p className="text-gray-400 font-medium">Select a standard template above or start converting text</p>
                                    <button
                                        type="button"
                                        onClick={addCustomField}
                                        className="mt-3 text-darji-accent font-bold hover:underline"
                                    >
                                        Start from scratch
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Text Mode Fallback */
                        <textarea
                            value={measurements}
                            onChange={(e) => setMeasurements(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-darji-accent text-gray-800 font-medium resize-none font-mono text-sm leading-relaxed bg-gray-50 focus:bg-white"
                            placeholder="Enter measurements here...&#10;&#10;Key: Value format recommeded"
                            rows="10"
                        />
                    )}

                    {/* Auto-suggest Indicator */}
                    {selectedClient && measurements && (
                        <p className="text-sm text-green-600 mt-4 flex items-center gap-2 font-medium bg-green-50 p-2 rounded-lg inline-flex border border-green-100">
                            <FiClock size={14} />
                            Last measurements loaded
                        </p>
                    )}
                </div>

                {/* Save Template Modal */}
                {showSaveTemplate && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Save Measurement Template</h3>
                            <p className="text-gray-500 mb-6">Save these measurements for quick reuse</p>

                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="Template name (e.g., John's Shirt, Wedding Suit)"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-darji-accent font-medium mb-6"
                                autoFocus
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowSaveTemplate(false);
                                        setTemplateName('');
                                    }}
                                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={saveAsTemplate}
                                    className="flex-1 px-6 py-3 bg-darji-accent text-white rounded-xl hover:bg-blue-600 font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
                                >
                                    Save Template
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-4 pt-4 sticky bottom-4 z-50 md:static">
                    <button
                        type="button"
                        onClick={() => navigate('/orders')}
                        className="flex-1 md:flex-none px-8 py-4 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-bold transition-colors shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-8 py-4 bg-gradient-to-r from-darji-primary to-darji-accent text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <FiSend />
                        <span>{loading ? 'Processing...' : 'Create Order & Invoice'}</span>
                    </button>
                </div>
                {/* New Standard Outfit Modal */}
                {showNewStandardModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] flex flex-col">
                            <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                                <h3 className="text-2xl font-black text-gray-900 mb-2">Add New Outfit Type</h3>
                                <p className="text-gray-500 mb-6">Create a reusable measurement template (e.g. Sherwani, Kurta)</p>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Outfit Name</label>
                                        <input
                                            type="text"
                                            value={newStandardName}
                                            onChange={(e) => setNewStandardName(e.target.value)}
                                            placeholder="e.g. Sherwani"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-darji-accent font-medium text-lg"
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Measurement Fields</label>
                                        <div className="space-y-3">
                                            {newStandardFields.map((field, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2 flex items-center">
                                                        <span className="text-gray-400 font-bold mr-3 text-xs">{index + 1}.</span>
                                                        <input
                                                            type="text"
                                                            value={field.label}
                                                            onChange={(e) => {
                                                                const newFields = [...newStandardFields];
                                                                newFields[index].label = e.target.value;
                                                                setNewStandardFields(newFields);
                                                            }}
                                                            placeholder="Field Name (e.g. Collar)"
                                                            className="bg-transparent w-full outline-none font-medium text-gray-900 placeholder-gray-400"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (newStandardFields.length > 1) {
                                                                const newFields = newStandardFields.filter((_, i) => i !== index);
                                                                setNewStandardFields(newFields);
                                                            }
                                                        }}
                                                        className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                        disabled={newStandardFields.length === 1}
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setNewStandardFields([...newStandardFields, { label: '', value: '' }])}
                                            className="mt-3 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold hover:border-darji-accent hover:text-darji-accent hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2 text-sm"
                                        >
                                            <FiPlus /> Add Another Field
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 md:p-8 pt-0 flex gap-3 bg-white rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNewStandardModal(false);
                                        setNewStandardName('');
                                        setNewStandardFields([{ label: '', value: '' }]);
                                    }}
                                    className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={saveGlobalStandard}
                                    className="flex-1 px-6 py-3.5 bg-darji-accent text-white rounded-xl hover:bg-blue-600 font-bold transition-all shadow-md"
                                >
                                    Save Outfit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}
