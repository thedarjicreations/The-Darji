import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { FiPlus, FiTrash2, FiSend, FiPackage, FiCalendar, FiUser, FiPhone, FiMail, FiMapPin, FiAlignLeft, FiImage, FiArrowLeft, FiCheckCircle, FiSave, FiClock, FiActivity, FiSearch, FiDownload, FiSettings, FiEdit2, FiRotateCcw, FiEye, FiEyeOff } from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

const DEFAULT_STANDARD_OUTFITS = [
    { name: '3-Piece Suit', garments: ['Jacket', 'Pant', 'Waistcoat'] },
    { name: '2-Piece Suit', garments: ['Jacket', 'Pant'] },
    { name: 'Sherwani', garments: ['Sherwani', 'Pajama'] },
    { name: 'Kurta Pajama', garments: ['Kurta', 'Pajama'] },
    { name: 'Shirt & Pant', garments: ['Shirt', 'Pant'] },
    { name: 'Safari Suit', garments: ['Safari Jacket', 'Pant'] },
    { name: 'Trouser', garments: ['Pant'] }
];

export default function NewOrder() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Standards State (LocalStorage)
    const [standardOutfits, setStandardOutfits] = useState(() => {
        try {
            const saved = localStorage.getItem('darji_standard_outfits');
            return saved ? JSON.parse(saved) : DEFAULT_STANDARD_OUTFITS;
        } catch (e) {
            return DEFAULT_STANDARD_OUTFITS;
        }
    });

    const standardInputRefs = React.useRef([]);

    const [showManageStandardsModal, setShowManageStandardsModal] = useState(false);

    useEffect(() => {
        localStorage.setItem('darji_standard_outfits', JSON.stringify(standardOutfits));
    }, [standardOutfits]);

    const [clients, setClients] = useState([]);
    const [garmentTypes, setGarmentTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showNewClient, setShowNewClient] = useState(false);
    const [showNewGarment, setShowNewGarment] = useState(false);
    const [showCost, setShowCost] = useState(false); // Default hidden
    const [measurements, setMeasurements] = useState('');
    const [measurementTemplates, setMeasurementTemplates] = useState([]);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [showNewStandardModal, setShowNewStandardModal] = useState(false);
    const [newStandardName, setNewStandardName] = useState('');
    const [newStandardFields, setNewStandardFields] = useState([{ label: '', value: '' }]);

    // Search and Load State
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ clients: [], templates: [] });

    // Hardcoded Measurement Standards
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

    const [activeFields, setActiveFields] = useState([]);
    const [useSmartForm, setUseSmartForm] = useState(true);

    // Form state
    const [selectedClient, setSelectedClient] = useState('');
    const [items, setItems] = useState([{ garmentTypeId: '', quantity: 1, price: 0, cost: 0 }]);
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
            setClients((response.data.clients || []).map(c => ({ ...c, id: c._id })));
        } catch (error) {
            console.error('Error fetching clients:', error);
            showToast('Failed to load clients. Check DB connection.', 'error');
        }
    };

    const fetchGarmentTypes = async () => {
        try {
            const response = await api.get('/garments');
            setGarmentTypes((response.data || []).map(g => ({ ...g, id: g._id })));
        } catch (error) {
            console.error('Error fetching garment types:', error);
        }
    };

    const fetchMeasurementTemplates = async () => {
        try {
            const response = await api.get('/measurement-templates');
            setMeasurementTemplates((response.data || []).map(t => ({ ...t, id: t._id })));
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    const fetchLastMeasurements = async (clientId) => {
        try {
            const response = await api.get('/orders', { params: { limit: 100 } });
            const orders = response.data.orders || [];

            // Filter for this client's orders that have measurements
            const clientOrders = orders.filter(order => order.clientId === clientId && order.measurements);

            if (clientOrders.length > 0) {
                // Sort by creation date to get the latest
                clientOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                const lastMsmt = clientOrders[0].measurements;
                setMeasurements(lastMsmt);
                showToast('Auto-loaded measurements from last order', 'info');

                // Parse into Smart Form Fields
                if (lastMsmt) {
                    const lines = lastMsmt.split('\n');
                    const parsed = lines.map(line => {
                        const headerMatch = line.match(/^===\s+(.+)\s+===:?\s*$/);
                        if (headerMatch) {
                            return { label: `=== ${headerMatch[1]} ===`, value: '', isHeader: true };
                        }
                        const parts = line.split(':');
                        if (parts.length < 2) return null;

                        const label = parts[0].trim().replace(/^"|"$/g, '');
                        const value = parts.slice(1).join(':').trim().replace(/^"|"$/g, '');
                        return { label, value };
                    }).filter(f => f && (f.label || f.isHeader));

                    if (parsed.length > 0) {
                        setActiveFields(parsed);
                        setUseSmartForm(true);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching last measurements:', error);
        }
    };

    const applyStandardOutfit = (standard) => {
        let newFields = [];

        standard.garments.forEach(garmentType => {
            const fields = MEASUREMENT_STANDARDS[garmentType];
            if (fields) {
                newFields.push({ label: `=== ${garmentType.toUpperCase()} ===`, value: '', isHeader: true });
                fields.forEach(f => newFields.push({ label: f, value: '' }));
            }
        });

        if (newFields.length > 0) {
            setActiveFields(newFields);
            setUseSmartForm(true);
            showToast(`${standard.name} template loaded`, 'success');
        } else {
            showToast(`No definition found for ${standard.name}`, 'warning');
        }
    };

    const saveAsTemplate = async () => {
        if (!templateName.trim() || templateName.trim().length < 3) {
            showToast('Template name must be at least 3 characters', 'warning');
            return;
        }

        try {
            await api.post('/measurement-templates', {
                name: templateName,
                clientId: selectedClient || null,
                garmentTypeId: null, // This was not in the instruction, but was in original mongoClient call
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
        let rawMeasurements = template.measurements;
        // Basic cleanup if needed
        if (typeof rawMeasurements !== 'string') rawMeasurements = '';

        const lines = rawMeasurements.split('\n');
        const parsed = lines.map(line => {
            const [label] = line.split(':');
            const cleanLabel = (label?.trim() || '').replace(/^"|"$/g, '');
            return { label: cleanLabel, value: '' };
        }).filter(f => f.label);

        setActiveFields(parsed);
        setUseSmartForm(true);
        showToast(`${template.name} outfit loaded`, 'success');
    };

    const saveGlobalStandard = async () => {
        if (!newStandardName.trim() || newStandardName.trim().length < 3) {
            showToast('Outfit name must be at least 3 characters', 'warning');
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
                clientId: null,
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
        e.preventDefault();
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
            if (!template) return;

            let rawMeasurements = template.measurements;
            setMeasurements(rawMeasurements);

            if (useSmartForm) {
                const lines = rawMeasurements.split('\n');
                const parsed = lines.map(line => {
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

    const handleSearchMeasurements = (e) => {
        const query = (e.target.value || '').toLowerCase();
        setSearchQuery(e.target.value);

        if (!query) {
            setSearchResults({ clients: [], templates: [] });
            return;
        }

        // Search Clients
        const matchedClients = clients.filter(c =>
            (c.name || '').toLowerCase().includes(query) ||
            (c.phone || '').includes(query)
        );

        // Search Templates
        const matchedTemplates = measurementTemplates.filter(t =>
            (t.name || '').toLowerCase().includes(query)
        );

        setSearchResults({ clients: matchedClients, templates: matchedTemplates });
    };

    const handleLoadClientMeasurements = (clientId) => {
        const client = clients.find(c => (c._id === clientId) || (c.id === clientId));
        if (client) {
            setSelectedClient(client._id || client.id);
            fetchLastMeasurements(client._id || client.id);
            setShowLoadModal(false);
            setSearchQuery('');
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
        if (field === 'garmentTypeId') {
            const garment = garmentTypes.find(g => g.id === value || g._id === value);
            if (garment) {
                newItems[index].price = garment.price;
                newItems[index].cost = garment.cost || 0;
            }
        }
        setItems(newItems);
    };

    const handleAddRequirement = () => {
        setSpecialRequirements([...specialRequirements, { note: '', images: [] }]);
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

    const handleRequirementImageChange = (index, files) => {
        const newRequirements = [...specialRequirements];
        // Convert FileList to Array
        const fileArray = Array.from(files);
        newRequirements[index].images = fileArray;
        // Legacy support for single image preview if needed immediately
        newRequirements[index].image = fileArray[0] || null;
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

    const handleRestoreDefaults = () => {
        if (window.confirm('Are you sure you want to restore default standard outfits? This will remove all custom changes to this list.')) {
            setStandardOutfits(DEFAULT_STANDARD_OUTFITS);
            showToast('Restored default standards', 'success');
        }
    };

    const handleDeleteStandard = (index) => {
        if (window.confirm('Delete this standard outfit button?')) {
            const newStandards = standardOutfits.filter((_, i) => i !== index);
            setStandardOutfits(newStandards);
            showToast('Standard outfit removed', 'success');
        }
    };

    const handleRenameStandard = (index, newName) => {
        const newStandards = [...standardOutfits];
        newStandards[index] = { ...newStandards[index], name: newName };
        setStandardOutfits(newStandards);
    };

    const handleResetMeasurements = () => {
        if (window.confirm('Clear all measurement values?')) {
            const resetFields = activeFields.map(field => ({ ...field, value: field.isHeader ? '' : '' }));
            setActiveFields(resetFields);
            setMeasurements('');
            showToast('Measurements reset', 'success');
        }
    };

    const handleCreateClient = async (e) => {
        // ... existing handleCreateClient code ...
        e.preventDefault();
        try {
            const response = await api.post('/clients', newClient);
            const result = response.data;
            const createdClient = { ...newClient, id: result.insertedId, _id: result.insertedId };
            setClients([...clients, createdClient]);
            setSelectedClient(createdClient.id);
            setShowNewClient(false);
            setNewClient({ name: '', phone: '', email: '', address: '' });
        } catch (error) {
            setError('Failed to create client');
        }
    };

    // ... (skipping unchanged parts)

    <div className="flex justify-between items-center text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
            <span className="font-medium bg-slate-100 px-2 py-1 rounded">
                {useSmartForm ? `${activeFields.filter(f => !f.isHeader).length} active fields` : 'Manual Text Mode'}
            </span>
            {useSmartForm && (
                <button
                    type="button"
                    onClick={handleResetMeasurements}
                    className="text-rose-500 font-bold hover:underline hover:text-rose-600 flex items-center gap-1"
                    title="Clear all values"
                >
                    <FiRotateCcw size={12} /> Reset
                </button>
            )}
        </div>
        <button
            type="button"
            onClick={() => setUseSmartForm(!useSmartForm)}
            className="text-darji-accent font-bold hover:underline flex items-center gap-1"
        >
            <FiActivity /> {useSmartForm ? 'Switch to Text Editor' : 'Switch to Smart Form'}
        </button>
    </div>

    // ... (skipping unchanged handlers for brevity in replacement if possible, but replace_file_content needs contiguous block)
    // I will target the area where I can insert the handlers easily, 
    // and then a separate replacement for the UI.
    // Actually, I can insert the handlers before handleSubmit or similar.
    // And the UI at the end.

    // Let's do the UI insertion first as it is at the end of the JSX usually.
    // Wait, I need to insert the handlers BEFORE they are used.
    // I will place them before 'handleCreateClient' as shown above.




    const handleCreateGarment = async (e) => {
        e.preventDefault();
        if (!newGarment.name || !newGarment.price || !newGarment.cost) {
            setError('Please fill in Name, Price, and Cost');
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
            const result = response.data;
            // Fix: Mongoose returns _id, not insertedId. Use result directly found from backend.
            const createdGarment = { ...result, id: result._id };

            setGarmentTypes([...garmentTypes, createdGarment]);

            // Auto-select
            const emptyItemIndex = items.findIndex(item => !item.garmentTypeId);
            if (emptyItemIndex !== -1) {
                const newItems = [...items];
                newItems[emptyItemIndex].garmentTypeId = createdGarment.id;
                newItems[emptyItemIndex].price = createdGarment.price;
                setItems(newItems);
            }

            setShowNewGarment(false);
            setNewGarment({ name: '', price: '', cost: '', description: '' });
            setError('');
        } catch (error) {
            setError('Failed to create garment type');
            showToast('Error creating garment', 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const client = clients.find(c => c._id === selectedClient || c.id === selectedClient);
            if (!client) throw new Error("Please select a client");

            // Prepare form data for multipart upload (images + order data)
            const formData = new FormData();

            // Calculate totals
            const itemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
            const services = additionalServiceItems
                .filter(s => s.description.trim() && s.amount > 0)
                .map(s => ({
                    description: s.description,
                    amount: parseFloat(s.amount),
                    cost: parseFloat(s.cost || 0)
                }));
            const servicesTotal = services.reduce((sum, s) => sum + s.amount, 0);
            const totalOrderAmount = itemsTotal + servicesTotal;

            // Add order metadata as JSON string
            const orderMetadata = {
                clientId: selectedClient,
                client: { name: client.name, phone: client.phone, email: client.email, address: client.address },
                items: items.map(item => {
                    const garment = garmentTypes.find(g => g._id === item.garmentTypeId || g.id === item.garmentTypeId);
                    return {
                        garmentTypeId: item.garmentTypeId,
                        garmentType: item.garmentTypeId, // Send ID string to satisfy Zod validator
                        quantity: parseInt(item.quantity),
                        price: parseFloat(item.price),
                        subtotal: parseFloat(item.price) * parseInt(item.quantity),
                        cost: parseFloat(item.cost || 0)
                    };
                }),
                additionalServices: services,
                measurements: measurements.trim(),
                specialRequirements: specialRequirements
                    .filter(r => r.note.trim() || r.image)
                    .map(r => ({ note: r.note.trim() || (r.image ? 'See attached image' : '') })),
                totalAmount: totalOrderAmount,
                finalAmount: totalOrderAmount, // Default final amount to total amount
                trialDate: trialDate ? new Date(trialDate).toISOString() : null,
                deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
                advance: parseFloat(advance) || 0,
                status: 'Pending'
            };

            formData.append('orderData', JSON.stringify(orderMetadata));

            // Add special requirement images if any
            let requirementIndex = 0;
            for (const req of specialRequirements) {
                if (req.note.trim() || (req.images && req.images.length > 0) || req.image) {
                    formData.append(`requirements[${requirementIndex}][note]`, req.note.trim());

                    // Handle multiple images
                    if (req.images && req.images.length > 0) {
                        req.images.forEach(img => {
                            formData.append(`requirements[${requirementIndex}][images]`, img);
                        });
                    }
                    // Fallback/Legacy single image
                    else if (req.image) {
                        formData.append(`requirements[${requirementIndex}][image]`, req.image);
                    }

                    requirementIndex++;
                }
            }

            // Backend will generate PDF, upload to S3, and create order
            await api.post('/orders', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            showToast('Order created successfully!', 'success');
            navigate('/orders');
        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to create order';
            setError(errorMsg);
            showToast(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in w-full max-w-full mx-auto pb-6 md:pb-0 overflow-x-hidden px-3 md:px-0">
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
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-1.5 h-6 bg-darji-accent rounded-full mr-3"></span>
                        Client Information
                    </h2>

                    {!showNewClient ? (
                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Client</label>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <FiUser />
                                    </div>
                                    <select
                                        value={selectedClient}
                                        onChange={(e) => setSelectedClient(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-darji-accent focus:border-transparent transition-all bg-slate-50 hover:bg-white text-slate-800 font-medium"
                                        required
                                    >
                                        <option value="">-- Choose a client --</option>
                                        {clients.map(client => (
                                            <option key={client._id || client.id} value={client._id || client.id}>
                                                {client.name} - {client.phone}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowNewClient(true)}
                                    className="px-4 py-2 bg-indigo-50 text-darji-accent rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors border border-indigo-100 whitespace-nowrap flex items-center gap-2"
                                >
                                    <FiPlus /> New Client
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 relative">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-100 text-darji-accent rounded-lg"><FiUser /></div>
                                    New Client Details
                                </h3>
                                <button type="button" onClick={() => setShowNewClient(false)} className="text-slate-400 hover:text-red-500 transition-colors bg-white p-2 rounded-lg shadow-sm">
                                    <FiTrash2 />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name *</label>
                                    <input
                                        type="text"
                                        value={newClient.name}
                                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-darji-accent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone *</label>
                                    <input
                                        type="tel"
                                        value={newClient.phone}
                                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-darji-accent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={newClient.email}
                                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-darji-accent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
                                    <textarea
                                        value={newClient.address}
                                        onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-darji-accent"
                                        rows="1"
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCreateClient}
                                className="w-full py-3 bg-darji-accent text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-[0.99] mt-2"
                            >
                                Save New Client
                            </button>
                        </div>
                    )}
                </div>

                {/* Order Items */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center">
                                <span className="w-1.5 h-6 bg-darji-accent rounded-full mr-3"></span>
                                Order Items
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowCost(!showCost)}
                                className="text-slate-300 hover:text-slate-500 transition-colors p-1.5 rounded-full hover:bg-slate-50"
                                title={showCost ? "Hide Cost" : "Show Cost"}
                            >
                                {showCost ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                        </div>
                        {!showNewGarment && (
                            <button type="button" onClick={() => setShowNewGarment(true)} className="text-xs font-bold text-darji-accent hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100">
                                + Create Garment Type
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {/* Legend for desktop */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            <div className="col-span-5">Garment</div>
                            <div className="col-span-2">Qty</div>
                            <div className="col-span-2">Price</div>
                            <div className="col-span-2">{showCost ? "Cost (Internal)" : ""}</div>
                            <div className="col-span-1 text-right">Total</div>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="bg-white md:bg-slate-50 p-4 md:px-4 md:py-3 rounded-xl border border-slate-200 relative group transition-all hover:border-darji-accent/30 hover:shadow-sm">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                    <div className="md:col-span-5">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <FiPackage />
                                            </div>
                                            <select
                                                value={item.garmentTypeId}
                                                onChange={(e) => handleItemChange(index, 'garmentTypeId', e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-darji-accent font-medium text-slate-700"
                                                required
                                            >
                                                <option value="">-- Select Garment --</option>
                                                {garmentTypes.map(garment => (
                                                    <option key={garment._id || garment.id} value={garment._id || garment.id}>
                                                        {garment.name} (₹{garment.price})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 relative">
                                        <label className="md:hidden text-xs font-bold text-slate-500 mb-1 block">Qty</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-darji-accent text-center font-bold text-slate-800"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="md:hidden text-xs font-bold text-slate-500 mb-1 block">Price</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">₹</div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.price}
                                                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-darji-accent font-medium text-slate-700 text-sm"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        {showCost && (
                                            <>
                                                <label className="md:hidden text-xs font-bold text-slate-500 mb-1 block">Cost</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-300 font-bold text-xs">₹</div>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.cost}
                                                        onChange={(e) => handleItemChange(index, 'cost', e.target.value)}
                                                        className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-300 font-medium text-sm text-slate-500 focus:bg-white transition-colors"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="md:col-span-1 text-right">
                                        <div className="text-sm font-black text-slate-800">
                                            ₹{(item.quantity * item.price).toFixed(0)}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="absolute -top-2 -right-2 md:top-auto md:right-auto md:relative md:ml-2 p-1.5 bg-white text-rose-500 shadow-sm rounded-full border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 hover:border-rose-100"
                                        disabled={items.length === 1}
                                        title="Remove Item"
                                    >
                                        <FiTrash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {showNewGarment && (
                        <div className="mt-6 p-6 border border-indigo-100 border-dashed rounded-2xl bg-indigo-50/30 animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-darji-primary flex items-center gap-2">
                                    <FiPackage className="text-darji-accent" />
                                    New Garment Definition
                                </h4>
                                <button onClick={() => setShowNewGarment(false)} className="text-slate-400 hover:text-slate-600"><FiX /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <input type="text" placeholder="Name (e.g. Safari Suit)" value={newGarment.name} onChange={(e) => setNewGarment({ ...newGarment, name: e.target.value })} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-darji-accent" />
                                <input type="number" placeholder="Price (₹)" value={newGarment.price} onChange={(e) => setNewGarment({ ...newGarment, price: e.target.value })} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-darji-accent" />
                                <input type="number" placeholder="Cost (₹)" value={newGarment.cost} onChange={(e) => setNewGarment({ ...newGarment, cost: e.target.value })} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-darji-accent" />
                                <button type="button" onClick={handleCreateGarment} className="bg-darji-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">Save Garment</button>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleAddItem}
                        className="mt-6 w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold hover:border-darji-accent hover:text-darji-accent hover:bg-slate-50 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                        <FiPlus size={20} /> Add Another Item
                    </button>

                    <div className="mt-6 flex justify-end items-center pt-4 border-t border-slate-100">
                        <span className="text-slate-500 font-medium mr-4 text-sm uppercase tracking-wide">Subtotal</span>
                        <span className="text-2xl font-black text-slate-900">₹{items.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}</span>
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
                            <button type="button" onClick={() => setShowNewStandardModal(true)} className="px-4 py-2.5 sm:py-2 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                <FiPlus /> New Standard
                            </button>
                            <button type="button" onClick={() => setShowLoadModal(true)} className="px-4 py-2.5 sm:py-2 text-xs font-bold bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2">
                                <FiDownload /> Load Template
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
                                                onChange={(e) => updateMeasurementField(index, 'value', e.target.value)}
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



                {/* Load Template Modal */}
                {showLoadModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <FiDownload className="text-darji-accent" />
                                Load Measurements
                            </h3>

                            <div className="relative mb-6">
                                <FiSearch className="absolute left-3 top-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by client name, phone, or template..."
                                    value={searchQuery}
                                    onChange={handleSearchMeasurements}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-darji-accent shadow-sm"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-6">
                                {/* Matched Clients */}
                                {searchResults.clients.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Matching Clients</h4>
                                        <div className="space-y-2">
                                            {searchResults.clients.map(client => (
                                                <button
                                                    key={client.id || client._id}
                                                    type="button"
                                                    onClick={() => handleLoadClientMeasurements(client.id || client._id)}
                                                    className="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-darji-accent/30 transition-all group flex justify-between items-center"
                                                >
                                                    <div>
                                                        <div className="font-bold text-slate-800">{client.name}</div>
                                                        <div className="text-xs text-slate-500">{client.phone}</div>
                                                    </div>
                                                    <span className="text-xs font-bold text-darji-accent opacity-0 group-hover:opacity-100 transition-opacity">Load Last Order +</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Matched Templates */}
                                {searchResults.templates.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Saved Templates</h4>
                                        <div className="space-y-2">
                                            {searchResults.templates.map(template => (
                                                <div key={template.id || template._id} className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => { loadTemplate(template.id || template._id); setShowLoadModal(false); }}
                                                        className="flex-1 text-left p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-all flex justify-between items-center"
                                                    >
                                                        <span className="font-bold text-indigo-900">{template.name}</span>
                                                        <span className="text-xs font-bold text-indigo-600">Load +</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDeleteGlobalTemplate(e, template.id || template._id)}
                                                        className="p-3 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 rounded-lg border border-slate-100 transition-colors"
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {searchQuery && searchResults.clients.length === 0 && searchResults.templates.length === 0 && (
                                    <div className="text-center py-8 text-slate-400">
                                        <FiSearch className="mx-auto mb-2 text-2xl opacity-50" />
                                        <p>No matching clients or templates found.</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowLoadModal(false)}
                                    className="px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={saveAsTemplate}
                                    className="flex-1 bg-darji-accent text-white py-3 rounded-xl font-bold"
                                >
                                    Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowSaveTemplate(false)}
                                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* New Standard Modal */}
                {showNewStandardModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto">
                            <h3 className="font-bold text-lg mb-4">Create New Standard Outfit</h3>
                            <input
                                type="text"
                                placeholder="Outfit Name (e.g. Sherwani)"
                                value={newStandardName}
                                onChange={(e) => setNewStandardName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-darji-accent"
                            />

                            <div className="space-y-2 mb-4">
                                <label className="text-xs font-bold text-gray-500 uppercase">Default Fields</label>
                                {newStandardFields.map((field, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Label (e.g. Length)"
                                            value={field.label}
                                            onChange={(e) => {
                                                const newF = [...newStandardFields];
                                                newF[idx].label = e.target.value;
                                                setNewStandardFields(newF);
                                            }}
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                        />
                                        {newStandardFields.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setNewStandardFields(newStandardFields.filter((_, i) => i !== idx))}
                                                className="text-red-500 p-2"
                                            >
                                                <FiTrash2 />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setNewStandardFields([...newStandardFields, { label: '', value: '' }])}
                                    className="text-sm font-bold text-darji-accent hover:underline flex items-center"
                                >
                                    <FiPlus className="mr-1" /> Add Field
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={saveGlobalStandard}
                                    className="flex-1 bg-darji-accent text-white py-3 rounded-xl font-bold"
                                >
                                    Save Standard
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowNewStandardModal(false)}
                                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Manage Standards Modal */}
                {showManageStandardsModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <FiSettings className="text-slate-500" />
                                Manage Standards
                            </h3>
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto mb-4 pr-2">







                                {standardOutfits.map((std, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 transition-all duration-200 rounded-xl border border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md group">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg flex-shrink-0">
                                            <FiPackage size={18} />
                                        </div>
                                        <input
                                            ref={el => standardInputRefs.current[idx] = el}
                                            type="text"
                                            value={std.name}
                                            onChange={(e) => handleRenameStandard(idx, e.target.value)}
                                            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 font-semibold placeholder-slate-400 text-sm"
                                        />
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => standardInputRefs.current[idx]?.focus()}
                                                className="p-1.5 text-slate-400 hover:text-darji-accent hover:bg-slate-200 rounded-md transition-colors"
                                                title="Rename"
                                            >
                                                <FiEdit2 size={12} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteStandard(idx)}
                                                className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-md transition-colors"
                                                title="Delete"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={handleRestoreDefaults}
                                    className="text-xs font-bold text-slate-400 hover:text-darji-accent flex items-center gap-1"
                                >
                                    <FiRotateCcw /> Restore Defaults
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowManageStandardsModal(false)}
                                    className="px-6 py-2 bg-darji-accent text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Special Requirements */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-1.5 h-6 bg-darji-accent rounded-full mr-3"></span>
                        Special Requirements & Designs
                    </h2>

                    <div className="space-y-6">
                        {specialRequirements.map((req, index) => (
                            <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group transition-all hover:border-slate-300">
                                <button
                                    type="button"
                                    onClick={() => handleRemoveRequirement(index)}
                                    className="absolute -top-2 -right-2 p-1.5 bg-white text-rose-500 shadow-md rounded-full border border-slate-100 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 hover:scale-110"
                                >
                                    <FiTrash2 size={16} />
                                </button>
                                <div className="space-y-4">
                                    <textarea
                                        value={req.note}
                                        onChange={(e) => handleRequirementChange(index, 'note', e.target.value)}
                                        placeholder="Add note (e.g. 'Gold buttons', 'Double stitch')"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-darji-accent placeholder-slate-400 font-medium text-slate-700 shadow-sm"
                                        rows="2"
                                    />

                                    <div className="flex flex-col gap-3">
                                        <label className={`
                                            flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all shadow-sm w-fit
                                            ${req.images && req.images.length > 0
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}
                                        `}>
                                            <FiImage className={req.images && req.images.length > 0 ? 'text-emerald-500' : 'text-slate-400'} />
                                            <span className="text-xs font-bold uppercase tracking-wide">
                                                {req.images && req.images.length > 0 ? `${req.images.length} Images Attached` : 'Attach Designs'}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={(e) => handleRequirementImageChange(index, e.target.files)}
                                                className="hidden"
                                            />
                                        </label>

                                        {req.images && req.images.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {req.images.map((img, i) => (
                                                    <div key={i} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                                                        <div className="w-8 h-8 rounded bg-slate-100 overflow-hidden flex items-center justify-center">
                                                            <FiImage className="text-slate-400" />
                                                        </div>
                                                        <span className="text-xs text-slate-600 font-bold truncate max-w-[100px]">
                                                            {img.name}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Legacy/Single Image Fallback Display */}
                                        {!req.images && req.image && (
                                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm w-fit">
                                                <div className="w-8 h-8 rounded bg-slate-100 overflow-hidden flex items-center justify-center">
                                                    <FiImage className="text-slate-400" />
                                                </div>
                                                <span className="text-xs text-slate-600 font-bold truncate max-w-[150px]">
                                                    {req.image.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={handleAddRequirement}
                            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold hover:border-darji-accent hover:text-darji-accent hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group"
                        >
                            <div className="p-1 bg-slate-100 rounded-full group-hover:bg-indigo-50 transition-colors">
                                <FiPlus />
                            </div>
                            Add Requirement / Design
                        </button>
                    </div>
                </div>

                {/* Additional Services & Dates/Payment Container */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Additional Services */}
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                            <span className="w-1.5 h-6 bg-darji-accent rounded-full mr-3"></span>
                            Additional Services
                        </h2>
                        <div className="space-y-4">
                            {additionalServiceItems.map((service, index) => (
                                <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                                    <button type="button" onClick={() => handleRemoveService(index)} className="absolute -top-2 -right-2 p-1.5 bg-white text-rose-500 shadow-sm rounded-full border border-slate-100 opacity-0 group-hover:opacity-100 hover:bg-rose-50 transition-all"><FiTrash2 size={16} /></button>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                                            <input type="text" value={service.description} onChange={(e) => handleServiceChange(index, 'description', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-darji-accent font-medium text-slate-800 text-sm" placeholder="e.g. Lining Fabric" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Amount (₹)</label>
                                                <input type="number" value={service.amount} onChange={(e) => handleServiceChange(index, 'amount', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-darji-accent font-bold text-slate-800 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cost (₹)</label>
                                                <input type="number" value={service.cost} onChange={(e) => handleServiceChange(index, 'cost', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-darji-accent text-sm text-slate-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddService}
                                className="mt-2 w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold hover:border-darji-accent hover:text-darji-accent hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <FiPlus /> Add Service
                            </button>
                        </div>
                    </div>

                    {/* Dates & Payment */}
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 flex flex-col justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                                <span className="w-1.5 h-6 bg-darji-accent rounded-full mr-3"></span>
                                Dates & Payment
                            </h2>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Trial Date</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><FiCalendar /></div>
                                        <input type="date" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} className="w-full pl-10 pr-2 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-darji-accent text-sm font-medium text-slate-700" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Delivery Date</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><FiCalendar /></div>
                                        <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full pl-10 pr-2 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-darji-accent text-sm font-medium text-slate-700" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl text-white shadow-lg shadow-slate-900/20 relative overflow-hidden">
                            {/* Abstract Decoration */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                            <div className="flex justify-between items-center mb-3 pb-3 border-b border-white/10 relative z-10">
                                <span className="font-medium text-slate-300 text-sm">Total Amount</span>
                                <span className="text-xl sm:text-3xl font-bold text-white tracking-tight whitespace-nowrap">₹{(items.reduce((acc, i) => acc + (i.price * i.quantity), 0) + additionalServiceItems.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0)).toLocaleString('en-IN')}</span>
                            </div>

                            <div className="mb-3 relative z-10">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Advance Payment</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-bold">₹</div>
                                    <input
                                        type="number"
                                        value={advance}
                                        onChange={(e) => setAdvance(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2.5 sm:py-3 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white/20 font-bold text-lg sm:text-xl text-white placeholder-white/30 transition-all"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center relative z-10">
                                <span className="font-bold text-slate-300 text-xs sm:text-sm">Balance Due</span>
                                <span className="text-lg sm:text-xl font-bold text-emerald-400 whitespace-nowrap">
                                    ₹{((items.reduce((acc, i) => acc + (i.price * i.quantity), 0) + additionalServiceItems.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0)) - (parseFloat(advance) || 0)).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="sticky bottom-4 z-40 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/50 animate-in fade-in slide-in-from-bottom-8 duration-700 flex justify-end items-center gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`
                            flex-1 md:flex-none md:w-auto px-8 py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 
                            hover:bg-indigo-600 hover:shadow-indigo-600/30 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3
                            ${loading ? 'opacity-75 cursor-not-allowed' : ''}
                        `}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                Creating...
                            </>
                        ) : (
                            <>
                                <FiCheckCircle size={20} />
                                Confirm Order & Generate Invoice
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
