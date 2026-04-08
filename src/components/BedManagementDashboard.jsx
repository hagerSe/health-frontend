import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  FaSpinner, FaBed, FaHospital, FaCheck, FaTimes, FaTools, 
  FaBroom, FaUser, FaCalendarAlt, FaExclamationTriangle, 
  FaChartBar, FaPlus, FaEdit, FaTrash, FaSearch, FaSync,
  FaArrowRight, FaArrowLeft, FaUserMd, FaTimesCircle
} from 'react-icons/fa';

const BedManagementDashboard = ({ 
  user, 
  onLogout,
  selectionMode = false,
  onBedSelect,
  selectedBed,
  onClose
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedWard, setSelectedWard] = useState('OPD');
  const [beds, setBeds] = useState([]);
  const [wardStats, setWardStats] = useState([]);
  const [selectedBedObj, setSelectedBedObj] = useState(null);
  const [showBedModal, setShowBedModal] = useState(false);
  const [showAddBedModal, setShowAddBedModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [searchTerm, setSearchTerm] = useState('');
  const [newBed, setNewBed] = useState({
    number: '',
    type: 'general',
    notes: ''
  });

  const API_URL = 'http://localhost:5001';
  const socket = useRef(null);
  const navigate = useNavigate();

  // Valid wards from Bed model ENUM
  const wards = ['OPD', 'EME', 'ANC'];
  const bedTypes = ['general', 'private', 'semi-private', 'icu', 'isolation'];

  const isSelectionMode = selectionMode;

  // Initialize socket and fetch data
  useEffect(() => {
    if (!user?.hospital_id) return;

    console.log('BedManagement initializing for:', {
      selectionMode: isSelectionMode,
      ward: selectedWard,
      hospital_id: user?.hospital_id
    });

    // Initialize socket only if not in selection mode
    if (!isSelectionMode) {
      const token = localStorage.getItem('token');
      
      socket.current = io(API_URL, {
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000
      });

      socket.current.on('connect', () => {
        console.log('✅ Bed Management socket connected');
        setConnectionStatus('connected');
        socket.current.emit('join', `hospital_${user?.hospital_id}_bed_management`);
      });

      socket.current.on('connect_error', () => {
        setConnectionStatus('disconnected');
      });
      
      socket.current.on('disconnect', () => {
        setConnectionStatus('disconnected');
      });

      socket.current.on('bed_occupied', () => {
        fetchBeds();
        fetchWardStats();
      });

      socket.current.on('bed_released', () => {
        fetchBeds();
        fetchWardStats();
      });

      socket.current.on('bed_status_updated', () => {
        fetchBeds();
        fetchWardStats();
      });
    }

    // Always fetch data
    fetchWardStats();
    fetchBeds();

    const interval = setInterval(() => {
      fetchWardStats();
      fetchBeds();
    }, 30000);

    return () => {
      clearInterval(interval);
      if (!isSelectionMode && socket.current) {
        socket.current.disconnect();
      }
    };
  }, [user?.hospital_id, selectedWard, isSelectionMode]);

  const fetchWardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/beds/stats/ward`, {
        params: { hospital_id: user?.hospital_id },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      if (res.data.success) {
        setWardStats(res.data.stats);
      }
    } catch (error) {
      console.error('Error fetching ward stats:', error);
    }
  };

  const fetchBeds = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log(`🛏️ Fetching beds for ward: ${selectedWard}, hospital: ${user?.hospital_id}`);
      
      const res = await axios.get(`${API_URL}/api/beds/all`, {
        params: { 
          hospital_id: user?.hospital_id,
          ward: selectedWard
        },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      
      if (res.data.success) {
        console.log(`✅ Found ${res.data.beds.length} beds in ${selectedWard} ward`);
        setBeds(res.data.beds);
        
        if (isSelectionMode) {
          const availableBeds = res.data.beds.filter(b => b.status === 'available');
          console.log(`📊 Available beds: ${availableBeds.length}`);
        }
      } else {
        setBeds([]);
      }
    } catch (error) {
      console.error('❌ Error fetching beds:', error);
      if (!isSelectionMode) {
        setMessage({ type: 'error', text: 'Error fetching beds' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
      setBeds([]);
    } finally {
      setLoading(false);
    }
  };

  const updateBedStatus = async (bedId, status, notes = '') => {
    const validStatuses = ['available', 'occupied', 'maintenance', 'reserved'];
    
    if (!validStatuses.includes(status)) {
      console.error(`Invalid status: ${status}`);
      setMessage({ type: 'error', text: `Invalid status: ${status}` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/beds/${bedId}/status`, {
        status,
        notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: `Bed status updated to ${status}` });
        fetchBeds();
        fetchWardStats();
        setShowBedModal(false);
        setSelectedBedObj(null);
        
        if (socket.current) {
          socket.current.emit('bed_status_updated', {
            bed_id: bedId,
            status,
            ward: selectedWard,
            hospital_id: user?.hospital_id
          });
        }
        
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error updating bed status' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const addNewBed = async () => {
    if (!newBed.number) {
      setMessage({ type: 'error', text: 'Please enter bed number' });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/beds/register`, {
        number: newBed.number,
        ward: selectedWard,
        type: newBed.type,
        notes: newBed.notes,
        hospital_id: user?.hospital_id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: `Bed ${newBed.number} added to ${selectedWard} ward` });
        setShowAddBedModal(false);
        setNewBed({ number: '', type: 'general', notes: '' });
        fetchBeds();
        fetchWardStats();
        
        if (socket.current) {
          socket.current.emit('new_bed_added', {
            bed_number: newBed.number,
            ward: selectedWard,
            hospital_id: user?.hospital_id
          });
        }
        
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error adding bed' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleBedClick = (bed) => {
    console.log('Bed clicked:', bed.id, 'Status:', bed.status, 'Selection Mode:', isSelectionMode);
    
    if (isSelectionMode && bed.status === 'available') {
      if (onBedSelect) {
        onBedSelect(bed.id);
        console.log('Bed selected:', bed.id);
      }
    } else if (!isSelectionMode) {
      setSelectedBedObj(bed);
      setShowBedModal(true);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-50',
      occupied: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-50',
      maintenance: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-50',
      reserved: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-50'
    };
    return colors[status] || colors.available;
  };

  const getStatusIcon = (status) => {
    const icons = {
      available: <FaCheck className="text-green-500" />,
      occupied: <FaUser className="text-red-500" />,
      maintenance: <FaTools className="text-gray-500" />,
      reserved: <FaCalendarAlt className="text-blue-500" />
    };
    return icons[status] || icons.available;
  };

  const getStatusText = (status) => {
    const texts = {
      available: 'Available',
      occupied: 'Occupied',
      maintenance: 'Maintenance',
      reserved: 'Reserved'
    };
    return texts[status] || status;
  };

  const getBedTypeText = (type) => {
    const types = {
      general: 'General',
      private: 'Private',
      'semi-private': 'Semi-Private',
      icu: 'ICU',
      isolation: 'Isolation'
    };
    return types[type] || type;
  };

  const filteredBeds = beds.filter(bed =>
    bed.number?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    bed.current_patient_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ConnectionStatusBanner = () => {
    if (connectionStatus === 'connected' || isSelectionMode) return null;
    return (
      <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-2 rounded-full shadow-lg flex items-center gap-3 ${
        connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
      } text-white`}>
        <span>{connectionStatus === 'connecting' ? '🔄 Connecting...' : '⚠️ Disconnected'}</span>
        <button 
          onClick={() => fetchBeds()}
          className="ml-3 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30"
        >
          Retry
        </button>
      </div>
    );
  };

  // ==================== SELECTION MODE RENDER ====================
  if (isSelectionMode) {
    console.log('Rendering in SELECTION MODE, beds count:', beds.length);
    
    return (
      <div className="bg-white rounded-2xl w-full">
        <ConnectionStatusBanner />
        
        {/* Header with close button */}
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Select Bed for Admission</h3>
            <p className="text-sm text-gray-500 mt-1">
              {selectedWard} Ward - Click on an available bed to select it
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {/* Ward selector */}
        <div className="mb-4 flex gap-2 flex-wrap">
          {wards.map(ward => {
            const stats = wardStats.find(s => s.ward === ward);
            return (
              <button
                key={ward}
                onClick={() => {
                  setSelectedWard(ward);
                  setSearchTerm('');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedWard === ward 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {ward} {stats && `(${stats.available})`}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by bed number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Bed Grid */}
        {loading ? (
          <div className="text-center py-12">
            <FaSpinner className="animate-spin text-3xl text-amber-600 mx-auto mb-3" />
            <p className="text-gray-500">Loading beds...</p>
          </div>
        ) : filteredBeds.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <FaBed className="text-5xl text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No beds found in {selectedWard} ward</p>
            <button
              onClick={fetchBeds}
              className="mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              Refresh
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {filteredBeds.map(bed => {
                const isAvailable = bed.status === 'available';
                const isSelected = selectedBed === bed.id;
                
                console.log('Rendering bed:', bed.number, 'Status:', bed.status, 'Available:', isAvailable);
                
                return (
                  <div
                    key={bed.id}
                    onClick={() => handleBedClick(bed)}
                    className={`border-2 rounded-xl p-4 transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-200'
                        : getStatusColor(bed.status)
                    } ${isAvailable ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed opacity-60'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-lg">Bed {bed.number}</span>
                      <span className="text-xl">{getStatusIcon(bed.status)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {getBedTypeText(bed.type)}
                    </div>
                    <div className="text-xs font-medium">
                      {bed.status === 'available' && (
                        <span className="text-green-600">✓ Available</span>
                      )}
                      {bed.status === 'occupied' && (
                        <span className="text-red-600">Occupied</span>
                      )}
                      {bed.status === 'maintenance' && (
                        <span className="text-gray-600">Maintenance</span>
                      )}
                      {bed.status === 'reserved' && (
                        <span className="text-blue-600">Reserved</span>
                      )}
                    </div>
                    {bed.notes && bed.status === 'available' && (
                      <div className="mt-2 text-xs text-gray-400 truncate">
                        {bed.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer with stats */}
            <div className="mt-5 pt-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {filteredBeds.filter(b => b.status === 'available').length} bed(s) available
              </div>
              <button
                onClick={fetchBeds}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 inline-flex items-center gap-2"
                disabled={loading}
              >
                <FaSync className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ==================== FULL DASHBOARD MODE ====================
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <ConnectionStatusBanner />

      {/* Sidebar */}
      <div className={`bg-slate-800 text-white transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} flex flex-col h-screen sticky top-0 shadow-xl`}>
        <div className={`p-6 border-b border-slate-700 flex ${sidebarCollapsed ? 'justify-center' : 'justify-between'} items-center`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <FaBed className="text-2xl text-emerald-400" />
              <span className="font-bold">Bed Management</span>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-slate-400 hover:text-white">
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="mb-4">
            {!sidebarCollapsed && <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">WARDS</p>}
            {wards.map(ward => {
              const stats = wardStats.find(s => s.ward === ward);
              return (
                <button
                  key={ward}
                  onClick={() => setSelectedWard(ward)}
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-lg transition-all mb-1 ${selectedWard === ward ? 'bg-emerald-600' : 'hover:bg-slate-700'}`}
                >
                  <div className="flex items-center gap-3">
                    <FaHospital />
                    {!sidebarCollapsed && <span>{ward}</span>}
                  </div>
                  {!sidebarCollapsed && stats && (
                    <div className="flex gap-1">
                      <span className="text-xs bg-green-500 px-1.5 py-0.5 rounded">{stats.available}</span>
                      <span className="text-xs bg-red-500 px-1.5 py-0.5 rounded">{stats.occupied}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {!sidebarCollapsed && (
            <button
              onClick={() => setShowAddBedModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-all mt-4"
            >
              <FaPlus /> Add New Bed
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700">
            <span>🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content - Full Dashboard */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white py-6 px-8 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Bed Management Dashboard</h1>
              <p className="text-emerald-100 mt-1">{user?.hospital_name} • {selectedWard} Ward</p>
            </div>
            <div className="flex gap-4">
              {wardStats.filter(s => s.ward === selectedWard).map(stat => (
                <div key="stats" className="flex gap-4">
                  <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                    <div className="text-2xl font-bold">{stat.total}</div>
                    <div className="text-xs">Total Beds</div>
                  </div>
                  <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-300">{stat.available}</div>
                    <div className="text-xs">Available</div>
                  </div>
                  <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-300">{stat.occupied}</div>
                    <div className="text-xs">Occupied</div>
                  </div>
                  <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                    <div className="text-2xl font-bold">{stat.occupancyRate}%</div>
                    <div className="text-xs">Occupancy</div>
                  </div>
                  <button 
                    onClick={() => { fetchBeds(); fetchWardStats(); }}
                    className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
                  >
                    <FaSync className={loading ? 'animate-spin' : ''} />
                    <span className="text-sm">Refresh</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-8">
          {message.text && (
            <div className={`fixed bottom-8 right-8 z-50 ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} px-6 py-3 rounded-lg shadow-lg`}>
              {message.text}
            </div>
          )}

          <div className="mb-6 flex justify-between items-center">
            <div className="relative w-80">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by bed number or patient name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
              />
            </div>
            <div className="text-sm text-gray-500">
              {filteredBeds.length} beds • {filteredBeds.filter(b => b.status === 'available').length} available
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">{selectedWard} Ward - Bed Layout</h2>
            
            {loading ? (
              <div className="text-center py-12">
                <FaSpinner className="animate-spin text-3xl text-emerald-600 mx-auto mb-3" />
                <p className="text-gray-500">Loading beds...</p>
              </div>
            ) : filteredBeds.length === 0 ? (
              <div className="text-center py-12">
                <FaBed className="text-5xl text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No beds found in {selectedWard} ward</p>
                <button
                  onClick={() => setShowAddBedModal(true)}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <FaPlus className="inline mr-2" /> Add First Bed
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredBeds.map(bed => (
                  <div
                    key={bed.id}
                    onClick={() => handleBedClick(bed)}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${getStatusColor(bed.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold">Bed {bed.number}</span>
                      <span className="text-xl">{getStatusIcon(bed.status)}</span>
                    </div>
                    <div className="text-xs font-medium uppercase mb-1">{getStatusText(bed.status)}</div>
                    {bed.type && (
                      <div className="text-xs text-gray-500 mb-2">{getBedTypeText(bed.type)}</div>
                    )}
                    {bed.status === 'occupied' && bed.current_patient_name && (
                      <div className="text-xs mt-2 pt-2 border-t border-gray-200">
                        <div className="font-medium truncate">{bed.current_patient_name}</div>
                      </div>
                    )}
                    {bed.notes && bed.status !== 'occupied' && (
                      <div className="text-xs text-gray-400 mt-1 truncate">{bed.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ward Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wardStats.map(stat => {
                const occupancyColor = stat.occupancyRate > 80 ? 'text-red-600' : stat.occupancyRate > 60 ? 'text-yellow-600' : 'text-green-600';
                return (
                  <div key={stat.ward} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-lg">{stat.ward}</h3>
                      <span className={`text-sm font-bold ${occupancyColor}`}>{stat.occupancyRate}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Total</p>
                        <p className="font-semibold">{stat.total}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Available</p>
                        <p className="font-semibold text-green-600">{stat.available}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Occupied</p>
                        <p className="font-semibold text-red-600">{stat.occupied}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Maintenance</p>
                        <p className="font-semibold">{stat.maintenance || 0}</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stat.occupancyRate}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bed Action Modal */}
      {showBedModal && selectedBedObj && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Bed {selectedBedObj.number} - {selectedBedObj.ward}</h3>
              <button onClick={() => setShowBedModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Current Status: 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(selectedBedObj.status)}`}>
                  {getStatusText(selectedBedObj.status)}
                </span>
              </p>
              {selectedBedObj.type && (
                <p className="text-sm text-gray-600 mt-1">Bed Type: <span className="font-medium capitalize">{getBedTypeText(selectedBedObj.type)}</span></p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {selectedBedObj.status !== 'available' && (
                <button
                  onClick={() => updateBedStatus(selectedBedObj.id, 'available', 'Made available')}
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FaCheck /> Mark Available
                </button>
              )}
              
              {selectedBedObj.status !== 'reserved' && selectedBedObj.status === 'available' && (
                <button
                  onClick={() => updateBedStatus(selectedBedObj.id, 'reserved', 'Reserved for incoming patient')}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FaCalendarAlt /> Mark Reserved
                </button>
              )}
              
              {selectedBedObj.status !== 'maintenance' && selectedBedObj.status !== 'occupied' && (
                <button
                  onClick={() => updateBedStatus(selectedBedObj.id, 'maintenance', 'Under maintenance')}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FaTools /> Mark Maintenance
                </button>
              )}
            </div>

            {selectedBedObj.status === 'occupied' && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="font-medium text-red-800 mb-2">Occupied By:</p>
                <p className="text-sm font-medium">{selectedBedObj.current_patient_name || 'Unknown Patient'}</p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <button
                    onClick={() => updateBedStatus(selectedBedObj.id, 'available', 'Patient discharged')}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Discharge & Make Available
                  </button>
                  <button
                    onClick={() => updateBedStatus(selectedBedObj.id, 'maintenance', 'Needs maintenance after discharge')}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Mark Maintenance
                  </button>
                </div>
              </div>
            )}

            {selectedBedObj.notes && selectedBedObj.status !== 'occupied' && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-500">
                Notes: {selectedBedObj.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Bed Modal */}
      {showAddBedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Add New Bed to {selectedWard} Ward</h3>
              <button onClick={() => setShowAddBedModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Bed Number *</label>
              <input
                type="text"
                value={newBed.number}
                onChange={(e) => setNewBed({ ...newBed, number: e.target.value })}
                placeholder="e.g., 101, A-12"
                className="w-full p-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Bed Type</label>
              <select
                value={newBed.type}
                onChange={(e) => setNewBed({ ...newBed, type: e.target.value })}
                className="w-full p-2 border border-gray-200 rounded-lg"
              >
                {bedTypes.map(type => (
                  <option key={type} value={type}>{getBedTypeText(type)}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={newBed.notes}
                onChange={(e) => setNewBed({ ...newBed, notes: e.target.value })}
                rows="2"
                placeholder="Additional notes about this bed..."
                className="w-full p-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddBedModal(false)} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <button
                onClick={addNewBed}
                disabled={loading || !newBed.number}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? <FaSpinner className="animate-spin" /> : 'Add Bed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedManagementDashboard;