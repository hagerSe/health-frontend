import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { FaSpinner, FaSearch, FaEye, FaCheck, FaTimes, FaExclamationTriangle, FaBoxes, FaPills, FaClock, FaCalendarAlt, FaSync, FaPlus, FaEdit, FaTrash, FaHospitalUser, FaUserMd } from 'react-icons/fa';

const PharmacyDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('prescriptions');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWard, setSelectedWard] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [notification, setNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [stats, setStats] = useState({
    pending: 0,
    dispensedToday: 0,
    lowStock: 0,
    expired: 0
  });

  const API_URL = 'http://localhost:5001';
  const socket = useRef(null);
  const navigate = useNavigate();

  const wards = [
    { id: 'all', name: 'All Wards', color: '#64748b' },
    { id: 'OPD', name: 'OPD', color: '#10b981' },
    { id: 'EME', name: 'Emergency', color: '#ef4444' },
    { id: 'ANC', name: 'Antenatal', color: '#8b5cf6' },
    { id: 'IPD', name: 'Inpatient', color: '#3b82f6' }
  ];

  const [newInventoryItem, setNewInventoryItem] = useState({
    name: '',
    category: 'medication',
    stock: 0,
    unit: '',
    reorder_level: 10,
    expiry_date: '',
    manufacturer: '',
    notes: ''
  });

  // Fetch prescriptions directly from API
 const fetchPrescriptions = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('token');
    const params = { hospital_id: user?.hospital_id };
    
    if (selectedWard && selectedWard !== 'all') {
      params.ward = selectedWard;
    }
    
    console.log('📡 Fetching prescriptions with params:', params);
    
    const res = await axios.get(`${API_URL}/api/pharmacy/pending`, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📋 API Response:', res.data);
    console.log('📊 Response success:', res.data.success);
    console.log('📊 Prescriptions count:', res.data.prescriptions?.length);
    
    if (res.data.success) {
      const prescriptionsData = res.data.prescriptions || [];
      console.log(`✅ Found ${prescriptionsData.length} prescriptions`);
      
      if (prescriptionsData.length > 0) {
        console.log('📋 First prescription:', prescriptionsData[0]);
      }
      
      const parsedPrescriptions = prescriptionsData.map(p => {
        let items = p.items;
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch (e) {
            items = [];
          }
        }
        return { ...p, items: items || [] };
      });
      
      setPrescriptions(parsedPrescriptions);
      setStats(prev => ({ ...prev, pending: parsedPrescriptions.length }));
    } else {
      console.log('❌ API returned success=false');
      setPrescriptions([]);
    }
  } catch (error) {
    console.error('❌ Error fetching prescriptions:', error);
    console.error('Error details:', error.response?.data);
    setMessage({ type: 'error', text: 'Error fetching prescriptions: ' + (error.response?.data?.message || error.message) });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  } finally {
    setLoading(false);
  }
};
  
  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/pharmacy/inventory`, {
        params: { hospital_id: user?.hospital_id },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setInventory(res.data.inventory);
        const lowCount = res.data.inventory.filter(item => item.current_stock <= item.reorder_level).length;
        setStats(prev => ({ ...prev, lowStock: lowCount }));
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchLowStock = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/pharmacy/low-stock`, {
        params: { hospital_id: user?.hospital_id },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setLowStockItems(res.data.lowStockItems);
      }
    } catch (error) {
      console.error('Error fetching low stock:', error);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      
      const res = await axios.get(`${API_URL}/api/pharmacy/stats/today`, {
        params: { 
          hospital_id: user?.hospital_id,
          date: today 
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setStats(prev => ({ 
          ...prev, 
          dispensedToday: res.data.dispensedCount || 0 
        }));
      }
    } catch (error) {
      console.error('Error fetching today stats:', error);
    }
  };

  const handleDispense = async (prescription) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const res = await axios.put(`${API_URL}/api/pharmacy/dispense/${prescription.id}`, {
        pharmacist_name: user?.full_name,
        notes: `Dispensed by ${user?.full_name}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: `✅ Prescription dispensed successfully for ${prescription.patient_name}` });
        setShowDispenseModal(false);
        setSelectedPrescription(null);
        
        await Promise.all([
          fetchPrescriptions(),
          fetchInventory(),
          fetchLowStock(),
          fetchTodayStats()
        ]);
        
        if (socket.current) {
          socket.current.emit('prescription_dispensed', {
            prescription_id: prescription.id,
            patient_id: prescription.patient_id,
            patient_name: prescription.patient_name,
            doctor_id: prescription.doctor_id,
            doctor_name: prescription.doctor_name,
            ward: prescription.ward,
            hospital_id: user?.hospital_id,
            dispensed_by: user?.full_name,
            dispensed_at: new Date().toISOString()
          });
        }
        
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error dispensing:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '❌ Error dispensing prescription' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInventory = async (item, updates) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/pharmacy/inventory/${item.id}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: '📦 Inventory updated successfully' });
        await Promise.all([fetchInventory(), fetchLowStock()]);
        setShowInventoryModal(false);
        setSelectedInventoryItem(null);
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Error updating inventory' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInventoryItem = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/pharmacy/inventory`, {
        hospital_id: user?.hospital_id,
        name: newInventoryItem.name,
        category: newInventoryItem.category,
        current_stock: newInventoryItem.stock,
        unit: newInventoryItem.unit,
        reorder_level: newInventoryItem.reorder_level,
        expiry_date: newInventoryItem.expiry_date,
        manufacturer: newInventoryItem.manufacturer,
        notes: newInventoryItem.notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: '✅ New inventory item added successfully' });
        setShowAddInventoryModal(false);
        setNewInventoryItem({
          name: '',
          category: 'medication',
          stock: 0,
          unit: '',
          reorder_level: 10,
          expiry_date: '',
          manufacturer: '',
          notes: ''
        });
        await Promise.all([fetchInventory(), fetchLowStock()]);
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Error adding inventory item' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const initializeSocket = () => {
    const token = localStorage.getItem('token');
    
    console.log('🔌 Initializing pharmacy socket connection...');
    
    socket.current = io(API_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socket.current.on('connect', () => {
      console.log('✅ Pharmacy socket connected, ID:', socket.current.id);
      setConnectionStatus('connected');
      
      const roomName = `hospital_${user?.hospital_id}_pharmacy`;
      console.log(`📡 Joining pharmacy room: ${roomName}`);
      socket.current.emit('join_pharmacy', user?.hospital_id);
      
      socket.current.emit('join_hospital', user?.hospital_id);
      
      setTimeout(() => {
        socket.current.emit('get_rooms');
      }, 1000);
    });

    socket.current.on('joined_pharmacy', (data) => {
      console.log('✅ Successfully joined pharmacy room:', data.room);
    });

    socket.current.on('rooms_info', (rooms) => {
      console.log('📡 Current rooms:', rooms);
    });

    socket.current.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnectionStatus('disconnected');
    });
    
    socket.current.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    // ==================== FIXED: ADD EVENT LISTENERS INSIDE THE FUNCTION ====================
    socket.current.on('new_prescriptions', (data) => {
      console.log('📋 NEW PRESCRIPTION RECEIVED IN PHARMACY!');
      console.log('Full data:', data);
      console.log('Patient:', data.patient_name);
      console.log('Doctor:', data.doctor_name);
      console.log('Ward:', data.ward);
      console.log('Items count:', data.items_count);
      console.log('Items:', data.items);
      
      setNotification({
        type: 'info',
        message: `📋 New prescription for ${data.patient_name} from Dr. ${data.doctor_name} (${data.ward} Ward)`
      });
      
      fetchPrescriptions();
      fetchTodayStats();
      
      setTimeout(() => setNotification(null), 8000);
    });

    socket.current.on('to_pharmacy', (data) => {
      console.log('📋 Alternative pharmacy event received:', data);
      setNotification({
        type: 'info',
        message: `📋 New prescription for ${data.patient_name} from Dr. ${data.doctor_name}`
      });
      fetchPrescriptions();
      fetchTodayStats();
      setTimeout(() => setNotification(null), 8000);
    });
  
    socket.current.on('prescription_updated', (data) => {
      console.log('💊 Prescription updated:', data);
      fetchPrescriptions();
      fetchTodayStats();
    });

    socket.current.on('prescription_dispensed', (data) => {
      console.log('✅ Prescription dispensed:', data);
      fetchPrescriptions();
      fetchInventory();
      fetchLowStock();
      fetchTodayStats();
    });
  };

  const getPriorityColor = (priority) => {
    const colors = {
      stat: 'bg-red-100 text-red-800',
      urgent: 'bg-orange-100 text-orange-800',
      routine: 'bg-green-100 text-green-800'
    };
    return colors[priority] || colors.routine;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      prepared: 'bg-blue-100 text-blue-800',
      dispensed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || badges.pending;
  };

  const filteredPrescriptions = prescriptions.filter(p => {
    const items = p.items || [];
    const medicationNames = items.map(i => i.name).join(' ');
    
    return p.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medicationNames.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.prescription_number?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredInventory = inventory.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ConnectionStatusBanner = () => {
    if (connectionStatus === 'connected') return null;
    return (
      <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-2 rounded-full shadow-lg flex items-center gap-3 ${
        connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
      } text-white`}>
        <span>{connectionStatus === 'connecting' ? '🔄 Connecting...' : '⚠️ Disconnected'}</span>
        <button onClick={() => {
          fetchPrescriptions();
          fetchInventory();
        }} className="ml-2 px-2 py-1 bg-white/20 rounded text-xs">Retry</button>
      </div>
    );
  };

  const testDirectAPI = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Testing direct API call...');
      const res = await axios.get(`${API_URL}/api/pharmacy/pending`, {
        params: { hospital_id: user?.hospital_id },
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('📋 API Response:', res.data);
      console.log('📊 Prescriptions count:', res.data.prescriptions?.length);
      alert(`API Response: ${res.data.success ? 'Success' : 'Failed'}\nPrescriptions found: ${res.data.prescriptions?.length || 0}`);
    } catch (error) {
      console.error('API test error:', error);
      alert('Error: ' + error.message);
    }
  };

  useEffect(() => {
    if (!user?.hospital_id) {
      console.log('Waiting for user data...');
      return;
    }

    console.log('Initializing Pharmacy Dashboard for hospital:', user.hospital_id);
    
    initializeSocket();
    fetchPrescriptions();
    fetchInventory();
    fetchLowStock();
    fetchTodayStats();

    const interval = setInterval(() => {
      fetchPrescriptions();
      fetchLowStock();
      fetchTodayStats();
    }, 30000);

    return () => {
      if (socket.current) socket.current.disconnect();
      clearInterval(interval);
    };
  }, [user?.hospital_id, selectedWard]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <ConnectionStatusBanner />

      {/* Sidebar */}
      <div className={`bg-slate-800 text-white transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} flex flex-col h-screen sticky top-0 shadow-xl`}>
        <div className={`p-6 border-b border-slate-700 flex ${sidebarCollapsed ? 'justify-center' : 'justify-between'} items-center`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <FaPills className="text-2xl text-purple-400" />
              <span className="font-bold">Pharmacy</span>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-slate-400 hover:text-white">
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'prescriptions', icon: '📋', label: 'Prescriptions', badge: stats.pending },
            { id: 'inventory', icon: '📦', label: 'Inventory', badge: stats.lowStock },
            { id: 'low-stock', icon: '⚠️', label: 'Low Stock Alerts', badge: stats.lowStock }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-lg transition-all ${activeTab === item.id ? 'bg-purple-600' : 'hover:bg-slate-700'}`}
            >
              <div className="flex items-center gap-3">
                <span>{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </div>
              {!sidebarCollapsed && item.badge > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700">
            <span>🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white py-6 px-8 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Pharmacy Dashboard</h1>
              <p className="text-purple-100 mt-1">{user?.hospital_name} • {user?.full_name}</p>
              <p className="text-purple-200 text-xs mt-1">
                {connectionStatus === 'connected' ? '🟢 Live Connection' : '🔴 Offline'}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <div className="text-2xl font-bold">{stats.pending}</div>
                <div className="text-xs">Pending</div>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <div className="text-2xl font-bold">{stats.dispensedToday}</div>
                <div className="text-xs">Dispensed Today</div>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <div className="text-2xl font-bold">{stats.lowStock}</div>
                <div className="text-xs">Low Stock</div>
              </div>
              <button 
                onClick={() => {
                  fetchPrescriptions();
                  fetchInventory();
                  fetchLowStock();
                  fetchTodayStats();
                }}
                className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
              >
                <FaSync className={loading ? 'animate-spin' : ''} />
                <span className="text-sm">Refresh</span>
              </button>
              <button
                onClick={testDirectAPI}
                className="bg-blue-500/20 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2"
              >
                🔍 Test API
              </button>
            </div>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className="fixed top-24 right-8 z-[1000] max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-slide-in border-l-4 border-blue-500">
            <div className="p-4 flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{notification.message}</p>
              </div>
              <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-gray-800">×</button>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto p-8">
          {/* Ward Filter */}
          <div className="mb-6 flex justify-between items-center">
            <div className="flex gap-2">
              {wards.map(ward => (
                <button
                  key={ward.id}
                  onClick={() => setSelectedWard(ward.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedWard === ward.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {ward.name}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`fixed bottom-8 right-8 z-50 ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} px-6 py-3 rounded-lg shadow-lg animate-slide-in`}>
              {message.text}
            </div>
          )}

          {/* Prescriptions Tab */}
          {activeTab === 'prescriptions' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Pending Prescriptions {selectedWard !== 'all' && `- ${selectedWard} Ward`}
                  </h2>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by patient, medication, or doctor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-80"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6">
                {loading && prescriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <FaSpinner className="animate-spin text-3xl text-purple-500 mx-auto mb-3" />
                    <p className="text-gray-500">Loading prescriptions...</p>
                  </div>
                ) : filteredPrescriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <FaPills className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No pending prescriptions</p>
                    <p className="text-sm text-gray-400 mt-1">New prescriptions from doctors will appear here</p>
                    <button
                      onClick={testDirectAPI}
                      className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm"
                    >
                      🔍 Check API
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPrescriptions.map(prescription => {
                      const items = prescription.items || [];
                      const wardColor = wards.find(w => w.id === prescription.ward)?.color || '#64748b';
                      
                      return (
                        <div key={prescription.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3 flex-wrap">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(prescription.priority)}`}>
                                  {prescription.priority?.toUpperCase() || 'ROUTINE'}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(prescription.status)}`}>
                                  {prescription.status}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {prescription.prescription_number}
                                </span>
                                <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: wardColor }}>
                                  {prescription.ward}
                                </span>
                              </div>
                              <h3 className="font-semibold text-lg">{prescription.patient_name}</h3>
                              
                              <div className="mt-2">
                                <p className="text-sm font-medium text-gray-700">Medications:</p>
                                <div className="space-y-1 mt-1">
                                  {items.map((item, idx) => (
                                    <div key={idx} className="text-sm text-gray-600">
                                      • {item.name} - {item.dosage} - {item.quantity} {item.unit || 'dose(s)'}
                                      {item.frequency && ` - ${item.frequency}`}
                                      {item.duration && ` for ${item.duration}`}
                                      {item.route && ` (${item.route})`}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                                <span><FaUserMd className="inline mr-1" size={12} /> Dr. {prescription.doctor_name}</span>
                                <span><FaHospitalUser className="inline mr-1" size={12} /> {prescription.ward} Ward</span>
                                <span><FaClock className="inline mr-1" size={12} /> {new Date(prescription.prescribed_at).toLocaleString()}</span>
                              </div>
                              {prescription.notes && (
                                <p className="text-sm text-gray-500 mt-2">Note: {prescription.notes}</p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setSelectedPrescription(prescription);
                                setShowDispenseModal(true);
                              }}
                              disabled={prescription.status === 'dispensed'}
                              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                                prescription.status === 'dispensed'
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-green-500 text-white hover:bg-green-600'
                              }`}
                            >
                              <FaCheck /> Dispense
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Medication Inventory</h2>
                <button
                  onClick={() => setShowAddInventoryModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <FaPlus /> Add Item
                </button>
              </div>
              <div className="p-6 overflow-x-auto">
                <div className="mb-4 relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-80"
                  />
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Level</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredInventory.map(item => {
                      const isLow = item.current_stock <= item.reorder_level;
                      const isExpired = item.expiry_date && new Date(item.expiry_date) < new Date();
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium">{item.name}</p>
                            {item.manufacturer && <p className="text-xs text-gray-500">{item.manufacturer}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="capitalize">{item.category}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{item.current_stock}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                          <td className="px-4 py-3 text-gray-600">{item.reorder_level}</td>
                          <td className="px-4 py-3">
                            <span className={isExpired ? 'text-red-600' : 'text-gray-600'}>
                              {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isExpired ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Expired</span>
                            ) : isLow ? (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Low Stock</span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">In Stock</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setSelectedInventoryItem(item);
                                setShowInventoryModal(true);
                              }}
                              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 flex items-center gap-1"
                            >
                              <FaEdit className="text-xs" /> Update
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Low Stock Alerts Tab */}
          {activeTab === 'low-stock' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Low Stock Alerts</h2>
              </div>
              <div className="p-6">
                {lowStockItems.length === 0 ? (
                  <div className="text-center py-12">
                    <FaBoxes className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No low stock items</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lowStockItems.map(item => (
                      <div key={item.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-5">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold text-lg">{item.name}</h3>
                            <p className="text-gray-600 mt-1">
                              Current Stock: <span className="font-bold text-red-600">{item.current_stock}</span> • 
                              Reorder Level: {item.reorder_level} {item.unit}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Category: {item.category} • 
                              {item.expiry_date && ` Expires: ${new Date(item.expiry_date).toLocaleDateString()}`}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedInventoryItem(item);
                              setShowInventoryModal(true);
                            }}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                          >
                            Update Stock
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dispense Modal */}
      {showDispenseModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-semibold mb-4">Dispense Medication</h3>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Patient: <span className="font-medium">{selectedPrescription.patient_name}</span></p>
              <p className="text-gray-600">Prescription: <span className="font-medium">{selectedPrescription.prescription_number}</span></p>
              <p className="text-gray-600">Doctor: Dr. {selectedPrescription.doctor_name}</p>
              <p className="text-gray-600">Ward: {selectedPrescription.ward}</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Medications to Dispense:</label>
              <div className="space-y-2">
                {(selectedPrescription.items || []).map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">Dosage: {item.dosage}</p>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity} {item.unit || 'dose(s)'}</p>
                    {item.frequency && <p className="text-sm text-gray-600">Frequency: {item.frequency}</p>}
                    {item.duration && <p className="text-sm text-gray-600">Duration: {item.duration}</p>}
                  </div>
                ))}
              </div>
            </div>
            
            {selectedPrescription.notes && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">Note: {selectedPrescription.notes}</p>
              </div>
            )}
            
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowDispenseModal(false)} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <button
                onClick={() => handleDispense(selectedPrescription)}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
              >
                {loading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                Confirm Dispense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Update Modal */}
      {showInventoryModal && selectedInventoryItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Update Inventory</h3>
            <div className="mb-4">
              <p className="font-medium">{selectedInventoryItem.name}</p>
              <p className="text-sm text-gray-500">Current Stock: {selectedInventoryItem.current_stock} {selectedInventoryItem.unit}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">New Stock Level</label>
              <input
                type="number"
                id="newStock"
                defaultValue={selectedInventoryItem.current_stock}
                className="w-full p-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Reorder Level</label>
              <input
                type="number"
                id="reorderLevel"
                defaultValue={selectedInventoryItem.reorder_level}
                className="w-full p-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowInventoryModal(false)} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <button
                onClick={() => handleUpdateInventory(selectedInventoryItem, {
                  current_stock: parseInt(document.getElementById('newStock').value),
                  reorder_level: parseInt(document.getElementById('reorderLevel').value)
                })}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                {loading ? <FaSpinner className="animate-spin" /> : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Inventory Modal */}
      {showAddInventoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Add New Inventory Item</h3>
            <form onSubmit={handleAddInventoryItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Medication Name *</label>
                <input
                  type="text"
                  value={newInventoryItem.name}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, name: e.target.value})}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={newInventoryItem.category}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, category: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="medication">Medication</option>
                    <option value="supply">Supply</option>
                    <option value="equipment">Equipment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit *</label>
                  <input
                    type="text"
                    value={newInventoryItem.unit}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, unit: e.target.value})}
                    placeholder="e.g., tablet, ml, box"
                    className="w-full p-2 border border-gray-200 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={newInventoryItem.stock}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, stock: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={newInventoryItem.reorder_level}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, reorder_level: parseInt(e.target.value) || 10})}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={newInventoryItem.expiry_date}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, expiry_date: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={newInventoryItem.manufacturer}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, manufacturer: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={newInventoryItem.notes}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, notes: e.target.value})}
                  rows="3"
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddInventoryModal(false)} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  {loading ? <FaSpinner className="animate-spin" /> : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyDashboard;