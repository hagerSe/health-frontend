import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  FaSpinner, FaSearch, FaEye, FaCheck, FaTimes, FaExclamationTriangle, 
  FaFlask, FaMicroscope, FaClock, FaCalendarAlt, FaSync, FaPlus, 
  FaEdit, FaTrash, FaHospitalUser, FaUserMd, FaChartLine, FaVial,
  FaFileAlt, FaUserCheck, FaUserClock, FaBell
} from 'react-icons/fa';

const LaboratoryDashboard = ({ user, onLogout }) => {
  // ==================== STATE MANAGEMENT ====================
  const [activeTab, setActiveTab] = useState('pending');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [labRequests, setLabRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedWard, setSelectedWard] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [notification, setNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  // Result entry state
  const [resultData, setResultData] = useState({});
  const [recommendations, setRecommendations] = useState('');
  
  // Stats state
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    critical: 0
  });

  const API_URL = 'http://localhost:5001';
  const SOCKET_URL = 'http://localhost:5001';
  const socket = useRef(null);
  const navigate = useNavigate();

  // ==================== WARD CONFIGURATION ====================
  const wards = [
    { id: 'all', name: 'All Wards', color: '#64748b', icon: '🏥' },
    { id: 'OPD', name: 'OPD', color: '#10b981', icon: '🏥' },
    { id: 'EME', name: 'Emergency', color: '#ef4444', icon: '🚨' },
    { id: 'ANC', name: 'Antenatal', color: '#8b5cf6', icon: '🤰' },
    { id: 'ICU', name: 'ICU', color: '#3b82f6', icon: '🩺' },
    { id: 'Surgery', name: 'Surgery', color: '#8b5cf6', icon: '🔪' },
    { id: 'Medicine', name: 'Medicine', color: '#f59e0b', icon: '💊' },
    { id: 'Pediatrics', name: 'Pediatrics', color: '#ec4899', icon: '👶' }
  ];

  // ==================== NORMAL RANGES ====================
  const normalRanges = {
    'CBC (Complete Blood Count)': {
      parameters: [
        { name: 'WBC', unit: '×10³/µL', male: '4.0-11.0', female: '4.0-11.0', child: '5.0-15.0' },
        { name: 'RBC', unit: '×10⁶/µL', male: '4.5-5.9', female: '4.1-5.1', child: '3.8-5.5' },
        { name: 'Hemoglobin', unit: 'g/dL', male: '13.5-17.5', female: '12.0-16.0', child: '11.0-14.5' },
        { name: 'Hematocrit', unit: '%', male: '40-54', female: '36-48', child: '32-44' },
        { name: 'Platelets', unit: '×10³/µL', male: '150-450', female: '150-450', child: '150-450' }
      ]
    },
    'Blood Chemistry': {
      parameters: [
        { name: 'Glucose', unit: 'mg/dL', male: '70-110', female: '70-110', child: '70-110' },
        { name: 'Creatinine', unit: 'mg/dL', male: '0.7-1.3', female: '0.6-1.1', child: '0.3-0.7' },
        { name: 'BUN', unit: 'mg/dL', male: '7-20', female: '7-20', child: '5-18' },
        { name: 'Sodium', unit: 'mEq/L', male: '135-145', female: '135-145', child: '135-145' },
        { name: 'Potassium', unit: 'mEq/L', male: '3.5-5.0', female: '3.5-5.0', child: '3.4-4.7' }
      ]
    },
    'Urinalysis': {
      parameters: [
        { name: 'Color', unit: '', male: 'Yellow', female: 'Yellow', child: 'Yellow' },
        { name: 'Appearance', unit: '', male: 'Clear', female: 'Clear', child: 'Clear' },
        { name: 'Specific Gravity', unit: '', male: '1.005-1.030', female: '1.005-1.030', child: '1.005-1.030' },
        { name: 'pH', unit: '', male: '4.5-8.0', female: '4.5-8.0', child: '4.5-8.0' },
        { name: 'Protein', unit: '', male: 'Negative', female: 'Negative', child: 'Negative' },
        { name: 'Glucose', unit: '', male: 'Negative', female: 'Negative', child: 'Negative' },
        { name: 'Ketones', unit: '', male: 'Negative', female: 'Negative', child: 'Negative' },
        { name: 'Blood', unit: '', male: 'Negative', female: 'Negative', child: 'Negative' },
        { name: 'Leukocytes', unit: '', male: 'Negative', female: 'Negative', child: 'Negative' },
        { name: 'Nitrite', unit: '', male: 'Negative', female: 'Negative', child: 'Negative' }
      ]
    },
    'Malaria Test': {
      parameters: [
        { name: 'Result', unit: '', male: 'Negative', female: 'Negative', child: 'Negative' },
        { name: 'Species', unit: '', male: 'N/A', female: 'N/A', child: 'N/A' },
        { name: 'Parasite Density', unit: '/µL', male: '0', female: '0', child: '0' }
      ]
    },
    'Blood Sugar': {
      parameters: [
        { name: 'Fasting Blood Sugar', unit: 'mg/dL', male: '70-100', female: '70-100', child: '70-100' },
        { name: 'Random Blood Sugar', unit: 'mg/dL', male: '70-140', female: '70-140', child: '70-140' },
        { name: 'HbA1c', unit: '%', male: '4.0-5.6', female: '4.0-5.6', child: '4.0-5.6' }
      ]
    },
    'Liver Function Test': {
      parameters: [
        { name: 'ALT (SGPT)', unit: 'U/L', male: '10-40', female: '7-35', child: '10-40' },
        { name: 'AST (SGOT)', unit: 'U/L', male: '10-40', female: '10-40', child: '10-40' },
        { name: 'ALP', unit: 'U/L', male: '30-120', female: '30-120', child: '30-120' },
        { name: 'Total Bilirubin', unit: 'mg/dL', male: '0.1-1.2', female: '0.1-1.2', child: '0.1-1.2' },
        { name: 'Direct Bilirubin', unit: 'mg/dL', male: '0.0-0.3', female: '0.0-0.3', child: '0.0-0.3' }
      ]
    },
    'Kidney Function Test': {
      parameters: [
        { name: 'Creatinine', unit: 'mg/dL', male: '0.7-1.3', female: '0.6-1.1', child: '0.3-0.7' },
        { name: 'Urea', unit: 'mg/dL', male: '7-20', female: '7-20', child: '5-18' },
        { name: 'Uric Acid', unit: 'mg/dL', male: '3.5-7.2', female: '2.6-6.0', child: '2.0-5.5' }
      ]
    }
  };

  // ==================== FETCH LAB REQUESTS ====================
  const fetchLabRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = { hospital_id: user?.hospital_id };
      if (selectedWard && selectedWard !== 'all') {
        params.ward = selectedWard;
      }
      
      console.log('📊 Fetching lab requests with params:', params);
      
      const res = await axios.get(`${API_URL}/api/lab/pending`, {
        params: params,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        const mappedRequests = res.data.requests.map(req => ({
          id: req.id,
          patient_id: req.patient_id,
          patient_name: req.patient_name,
          patient_gender: req.patient_gender || 'male',
          doctor_id: req.doctor_id,
          doctor_name: req.doctor_name,
          ward: req.ward,
          hospital_id: req.hospital_id,
          testType: req.test_type,
          testName: req.test_name,
          priority: req.priority,
          status: req.status,
          notes: req.notes,
          created_at: req.requested_at || req.created_at,
          critical: req.critical || false
        }));
        
        setLabRequests(mappedRequests);
        updateStats(mappedRequests);
      }
    } catch (error) {
      console.error('Error fetching lab requests:', error);
      setMessage({ type: 'error', text: 'Error fetching lab requests' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== FETCH STATS ====================
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = { hospital_id: user?.hospital_id };
      if (selectedWard && selectedWard !== 'all') {
        params.ward = selectedWard;
      }
      
      const res = await axios.get(`${API_URL}/api/lab/stats`, {
        params: params,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setStats({
          pending: res.data.stats.pending || 0,
          inProgress: res.data.stats.processing || 0,
          completed: res.data.stats.completed || 0,
          critical: res.data.stats.critical || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // ==================== UPDATE STATS ====================
  const updateStats = (data) => {
    setStats({
      pending: data.filter(r => r.status === 'pending').length,
      inProgress: data.filter(r => r.status === 'processing' || r.status === 'in_progress').length,
      completed: data.filter(r => r.status === 'completed').length,
      critical: data.filter(r => r.critical === true).length
    });
  };

  // ==================== HANDLE START PROCESSING ====================
  const handleStartProcessing = async (requestId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/lab/start/${requestId}`,
        { technician_id: user?.id, technician_name: user?.full_name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchLabRequests();
      await fetchStats();
      setMessage({ type: 'success', text: '✅ Processing started successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error starting processing:', error);
      setMessage({ type: 'error', text: '❌ Error starting processing' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== HANDLE COLLECT SAMPLE ====================
  const handleCollectSample = async (requestId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/lab/collect/${requestId}`,
        { technician_id: user?.id, technician_name: user?.full_name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchLabRequests();
      await fetchStats();
      setMessage({ type: 'success', text: '🧪 Sample collected successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error collecting sample:', error);
      setMessage({ type: 'error', text: '❌ Error collecting sample' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== CHECK CRITICAL VALUES ====================
  const checkCriticalValues = (testName, results) => {
    const criticalValues = [];
    let hasCritical = false;

    const criticalThresholds = {
      'WBC': { min: 2.0, max: 30.0 },
      'Hemoglobin': { min: 7.0, max: 20.0 },
      'Platelets': { min: 50, max: 1000 },
      'Glucose': { min: 40, max: 500 },
      'Potassium': { min: 2.5, max: 6.5 },
      'Sodium': { min: 120, max: 160 }
    };

    Object.entries(results).forEach(([param, value]) => {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && criticalThresholds[param]) {
        if (numValue < criticalThresholds[param].min || numValue > criticalThresholds[param].max) {
          hasCritical = true;
          criticalValues.push({ parameter: param, value: numValue });
        }
      }
    });

    return { hasCritical, criticalValues };
  };

  // ==================== HANDLE SUBMIT RESULTS ====================
  const handleSubmitResults = async () => {
    if (!selectedRequest) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const criticalResults = checkCriticalValues(selectedRequest.testName, resultData);
      
      console.log('Submitting results:', {
        results: resultData,
        recommendations,
        critical: criticalResults.hasCritical
      });
      
      const res = await axios.post(
        `${API_URL}/api/lab/results/${selectedRequest.id}`,
        {
          results: resultData,
          recommendations: recommendations,
          critical: criticalResults.hasCritical,
          critical_values: criticalResults.criticalValues,
          technician_id: user?.id,
          technician_name: user?.full_name
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setMessage({ type: 'success', text: '✅ Results submitted successfully' });
        
        if (socket.current) {
          socket.current.emit('lab_result_ready', {
            patient_id: selectedRequest.patient_id,
            patient_name: selectedRequest.patient_name,
            doctor_name: selectedRequest.doctor_name,
            doctor_id: selectedRequest.doctor_id,
            ward: selectedRequest.ward,
            critical: criticalResults.hasCritical,
            hospital_id: user?.hospital_id
          });

          if (criticalResults.hasCritical) {
            socket.current.emit('critical_lab_result', {
              patient_id: selectedRequest.patient_id,
              patient_name: selectedRequest.patient_name,
              doctor_name: selectedRequest.doctor_name,
              doctor_id: selectedRequest.doctor_id,
              ward: selectedRequest.ward,
              critical_values: criticalResults.criticalValues,
              hospital_id: user?.hospital_id
            });
          }
        }

        setShowResultModal(false);
        setResultData({});
        setRecommendations('');
        await Promise.all([fetchLabRequests(), fetchStats()]);
      }
    } catch (error) {
      console.error('Error submitting results:', error);
      setMessage({ 
        type: 'error', 
        text: '❌ Error submitting results: ' + (error.response?.data?.message || error.message) 
      });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // ==================== HANDLE RESULT CHANGE ====================
  const handleResultChange = (parameter, value) => {
    setResultData({
      ...resultData,
      [parameter]: value
    });
  };

  // ==================== GET PRIORITY COLOR ====================
  const getPriorityColor = (priority) => {
    const colors = {
      'stat': { bg: '#fee2e2', color: '#991b1b', text: 'STAT', icon: '🔴' },
      'urgent': { bg: '#ffedd5', color: '#9a3412', text: 'Urgent', icon: '🟠' },
      'routine': { bg: '#dcfce7', color: '#166534', text: 'Routine', icon: '🟢' }
    };
    return colors[priority] || colors.routine;
  };

  // ==================== GET STATUS BADGE ====================
  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || badges.pending;
  };

  // ==================== FILTERED REQUESTS ====================
  const getFilteredRequests = () => {
    let filtered = labRequests;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.testName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by tab
    if (activeTab === 'pending') {
      filtered = filtered.filter(req => req.status === 'pending');
    } else if (activeTab === 'processing') {
      filtered = filtered.filter(req => req.status === 'processing' || req.status === 'in_progress');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(req => req.status === 'completed');
    } else if (activeTab === 'critical') {
      filtered = filtered.filter(req => req.critical === true);
    }
    
    return filtered;
  };

  // ==================== TEST DIRECT API ====================
  const testDirectAPI = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Testing direct API call...');
      const res = await axios.get(`${API_URL}/api/lab/pending`, {
        params: { hospital_id: user?.hospital_id },
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('📋 API Response:', res.data);
      alert(`API Response: ${res.data.success ? '✅ Success' : '❌ Failed'}\nRequests found: ${res.data.requests?.length || 0}`);
    } catch (error) {
      console.error('API test error:', error);
      alert('❌ Error: ' + error.message);
    }
  };

  // ==================== INITIALIZE SOCKET ====================
  const initializeSocket = () => {
    const token = localStorage.getItem('token');
    
    console.log('🔌 Initializing lab socket connection...');
    
    socket.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socket.current.on('connect', () => {
      console.log('✅ Lab socket connected');
      setConnectionStatus('connected');
      if (user?.hospital_id) {
        const roomName = `hospital_${user.hospital_id}_lab`;
        console.log(`📡 Joining lab room: ${roomName}`);
        socket.current.emit('join', roomName);
        socket.current.emit('join_lab', user.hospital_id);
      }
    });

    socket.current.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnectionStatus('disconnected');
    });
    
    socket.current.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnectionStatus('disconnected');
    });

    socket.current.on('joined_lab', (data) => {
      console.log('✅ Successfully joined lab room:', data.room);
    });

    socket.current.on('new_lab_request', (data) => {
      console.log('🔬 NEW LAB REQUEST RECEIVED!');
      console.log('Patient:', data.patient_name);
      console.log('Test:', data.test_name);
      console.log('Priority:', data.priority);
      
      if (selectedWard === 'all' || data.ward === selectedWard) {
        setNotification({
          type: 'info',
          message: `🔬 New ${data.priority} lab request: ${data.test_name} for ${data.patient_name}`
        });
      }
      
      fetchLabRequests();
      fetchStats();
      
      setTimeout(() => setNotification(null), 5000);
    });
  };

  // ==================== HANDLE LOGOUT ====================
  const handleLogout = () => {
    if (socket.current) socket.current.disconnect();
    onLogout();
    navigate('/login');
  };

  // ==================== CONNECTION STATUS BANNER ====================
  const ConnectionStatusBanner = () => {
    if (connectionStatus === 'connected') return null;
    return (
      <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-2 rounded-full shadow-lg flex items-center gap-3 ${
        connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
      } text-white`}>
        <span>{connectionStatus === 'connecting' ? '🔄 Connecting...' : '⚠️ Disconnected'}</span>
        <button onClick={() => {
          fetchLabRequests();
          fetchStats();
        }} className="ml-2 px-2 py-1 bg-white/20 rounded text-xs">Retry</button>
      </div>
    );
  };

  // ==================== USE EFFECT ====================
  useEffect(() => {
    if (!user?.hospital_id) {
      console.log('Waiting for user data...');
      return;
    }

    console.log('Initializing Laboratory Dashboard for hospital:', user.hospital_id);
    
    initializeSocket();
    fetchLabRequests();
    fetchStats();

    const interval = setInterval(() => {
      fetchLabRequests();
      fetchStats();
    }, 30000);

    return () => {
      if (socket.current) socket.current.disconnect();
      clearInterval(interval);
    };
  }, [user?.hospital_id, selectedWard]);

  // ==================== RENDER ====================
  const filteredRequests = getFilteredRequests();
  const currentWard = wards.find(w => w.id === selectedWard) || wards[0];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <ConnectionStatusBanner />

      {/* ==================== SIDEBAR ==================== */}
      <div className={`bg-slate-800 text-white transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} flex flex-col h-screen sticky top-0 shadow-xl`}>
        <div className={`p-6 border-b border-slate-700 flex ${sidebarCollapsed ? 'justify-center' : 'justify-between'} items-center`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <FaMicroscope className="text-2xl text-blue-400" />
              <span className="font-bold">Laboratory</span>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-slate-400 hover:text-white">
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <div className="p-4 m-4 bg-slate-900 rounded-xl">
          <p className="text-xs text-slate-400 mb-2">Laboratory Staff</p>
          <p className="text-sm font-medium">{user?.full_name}</p>
          <p className="text-xs text-blue-400 mt-1">ID: {user?.id}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'pending', icon: <FaClock />, label: 'Pending Requests', badge: stats.pending, color: 'yellow' },
            { id: 'processing', icon: <FaSpinner />, label: 'In Progress', badge: stats.inProgress, color: 'blue' },
            { id: 'completed', icon: <FaCheck />, label: 'Completed', badge: stats.completed, color: 'green' },
            { id: 'critical', icon: <FaExclamationTriangle />, label: 'Critical Results', badge: stats.critical, color: 'red' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id ? 'bg-blue-600' : 'hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
              </div>
              {!sidebarCollapsed && item.badge > 0 && (
                <span className={`bg-${item.color}-500 text-white text-xs px-2 py-0.5 rounded-full`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700">
            <span>🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-6 px-8 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Laboratory Dashboard</h1>
              <p className="text-blue-100 mt-1">{user?.hospital_name} • {user?.full_name}</p>
              <p className="text-blue-200 text-xs mt-1">
                {connectionStatus === 'connected' ? '🟢 Live Connection' : '🔴 Offline'}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <div className="text-2xl font-bold">{stats.pending}</div>
                <div className="text-xs">Pending</div>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <div className="text-2xl font-bold">{stats.inProgress}</div>
                <div className="text-xs">In Progress</div>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <div className="text-2xl font-bold">{stats.completed}</div>
                <div className="text-xs">Completed</div>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <div className="text-2xl font-bold">{stats.critical}</div>
                <div className="text-xs">Critical</div>
              </div>
              <button 
                onClick={() => {
                  fetchLabRequests();
                  fetchStats();
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

        {/* Notification Banner */}
        {notification && (
          <div className="fixed top-24 right-8 z-[1000] max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-slide-in border-l-4 border-blue-500">
            <div className="p-4 flex items-center gap-3">
              <span className="text-2xl">🔬</span>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{notification.message}</p>
              </div>
              <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-gray-800">×</button>
            </div>
          </div>
        )}

        {/* Message Toast */}
        {message.text && (
          <div className={`fixed bottom-8 right-8 z-[1000] ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} py-3 px-6 rounded-lg shadow-md animate-slide-in`}>
            {message.text}
          </div>
        )}

        <div className="max-w-7xl mx-auto p-8">
          {/* Ward Filter */}
          <div className="mb-6 flex justify-between items-center">
            <div className="flex gap-2 flex-wrap">
              {wards.map(ward => (
                <button
                  key={ward.id}
                  onClick={() => setSelectedWard(ward.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    selectedWard === ward.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{ward.icon}</span>
                  {ward.name}
                </button>
              ))}
            </div>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient, test, or doctor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
              />
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {activeTab === 'pending' && 'Pending Lab Requests'}
                {activeTab === 'processing' && 'In Progress Lab Requests'}
                {activeTab === 'completed' && 'Completed Lab Requests'}
                {activeTab === 'critical' && 'Critical Results'}
                {selectedWard !== 'all' && ` - ${currentWard.name} Ward`}
              </h2>
            </div>

            <div className="p-6">
              {loading && filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FaSpinner className="animate-spin text-3xl text-blue-500 mx-auto mb-3" />
                  <p className="text-gray-500">Loading lab requests...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FaFlask className="text-5xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No {activeTab} lab requests</p>
                  <p className="text-sm text-gray-400 mt-1">New requests from doctors will appear here</p>
                  <button
                    onClick={testDirectAPI}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
                  >
                    🔍 Check API
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map(request => {
                    const priority = getPriorityColor(request.priority);
                    const wardColor = wards.find(w => w.id === request.ward)?.color || '#64748b';
                    
                    return (
                      <div 
                        key={request.id}
                        className={`border rounded-lg p-5 transition-all cursor-pointer hover:shadow-md ${
                          request.critical ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'
                        }`}
                        onClick={() => {
                          if (request.status !== 'completed') {
                            setSelectedRequest(request);
                            setShowResultModal(true);
                            setResultData({});
                            setRecommendations('');
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: wardColor }}>
                                {request.ward}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1`}
                                style={{ backgroundColor: priority.bg, color: priority.color }}>
                                <span>{priority.icon}</span>
                                {priority.text}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                                {request.status === 'processing' ? '⚙️ In Progress' : request.status}
                              </span>
                              {request.critical && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                                  <FaExclamationTriangle /> Critical
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {new Date(request.created_at).toLocaleString()}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="font-semibold text-lg">{request.patient_name}</p>
                                <p className="text-sm text-gray-600">
                                  <FaUserMd className="inline mr-1" size={12} /> Dr. {request.doctor_name}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Test</p>
                                <p className="font-medium">{request.testName}</p>
                                <p className="text-xs text-gray-500">{request.testType}</p>
                              </div>
                              <div>
                                {request.notes && (
                                  <>
                                    <p className="text-sm text-gray-500 mb-1">Notes</p>
                                    <p className="text-sm text-gray-600">{request.notes}</p>
                                  </>
                                )}
                              </div>
                            </div>

                            {(request.status === 'pending') && (
                              <div className="mt-4 flex justify-end gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCollectSample(request.id);
                                  }}
                                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center gap-2"
                                  disabled={loading}
                                >
                                  🧪 Collect Sample
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartProcessing(request.id);
                                  }}
                                  className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 flex items-center gap-2"
                                  disabled={loading}
                                >
                                  <FaSpinner className={loading ? 'animate-spin' : ''} /> Start Processing
                                </button>
                              </div>
                            )}

                            {request.status === 'processing' && (
                              <div className="mt-4 flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRequest(request);
                                    setShowResultModal(true);
                                    setResultData({});
                                    setRecommendations('');
                                  }}
                                  className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-2"
                                >
                                  <FaCheck /> Enter Results
                                </button>
                              </div>
                            )}

                            {request.status === 'completed' && (
                              <div className="mt-4 flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRequest(request);
                                    setShowResultModal(true);
                                  }}
                                  className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 flex items-center gap-2"
                                >
                                  <FaEye /> View Results
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== RESULT ENTRY MODAL ==================== */}
      {showResultModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-4xl w-[95%] max-h-[90vh] overflow-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedRequest.status === 'completed' ? 'View Results' : 'Enter Lab Results'}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedRequest.testName} • {selectedRequest.patient_name}
                </p>
              </div>
              <button 
                onClick={() => setShowResultModal(false)}
                className="text-3xl text-gray-400 hover:text-gray-600 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            {/* Patient & Request Info */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6 grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Patient</p>
                <p className="font-semibold">{selectedRequest.patient_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Doctor</p>
                <p className="font-semibold">Dr. {selectedRequest.doctor_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Test</p>
                <p className="font-semibold">{selectedRequest.testName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Priority</p>
                <p className={`font-semibold ${
                  selectedRequest.priority === 'stat' ? 'text-red-600' : 
                  selectedRequest.priority === 'urgent' ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {selectedRequest.priority}
                </p>
              </div>
            </div>

            {/* Result Entry Form */}
            {normalRanges[selectedRequest.testName] ? (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Test Results</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Normal Range</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {normalRanges[selectedRequest.testName].parameters.map((param, idx) => {
                        const patientGender = selectedRequest.patient_gender || 'male';
                        const normalRange = param[patientGender] || param.male;
                        const currentValue = resultData[param.name] || '';
                        
                        let isAbnormal = false;
                        if (currentValue && normalRange !== 'Negative' && normalRange !== 'Yellow' && normalRange !== 'Clear') {
                          const range = normalRange.split('-');
                          if (range.length === 2) {
                            const min = parseFloat(range[0]);
                            const max = parseFloat(range[1]);
                            const val = parseFloat(currentValue);
                            if (!isNaN(val) && (val < min || val > max)) {
                              isAbnormal = true;
                            }
                          }
                        }
                        
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium">{param.name}</td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={currentValue}
                                onChange={(e) => handleResultChange(param.name, e.target.value)}
                                disabled={selectedRequest.status === 'completed'}
                                className={`w-32 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                                  isAbnormal ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                                }`}
                                placeholder="Enter value"
                              />
                              {isAbnormal && (
                                <span className="ml-2 text-xs text-red-600">⚠️ Abnormal</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{normalRange}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{param.unit}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Result</label>
                <textarea
                  value={resultData.result || ''}
                  onChange={(e) => handleResultChange('result', e.target.value)}
                  disabled={selectedRequest.status === 'completed'}
                  rows="5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                  placeholder="Enter test results..."
                />
              </div>
            )}

            {/* Recommendations */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Recommendations / Comments</label>
              <textarea
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                disabled={selectedRequest.status === 'completed'}
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                placeholder="Add any recommendations or clinical comments..."
              />
            </div>

            {/* Critical Value Warning */}
            {!selectedRequest.status === 'completed' && Object.values(resultData).some(v => {
              const numV = parseFloat(v);
              return !isNaN(numV) && (numV < 2.0 || numV > 500);
            }) && (
              <div className="mb-6 bg-red-50 border border-red-500 rounded-lg p-4 flex items-center gap-3">
                <FaExclamationTriangle className="text-red-600 text-2xl" />
                <div>
                  <p className="font-semibold text-red-800">Critical Values Detected</p>
                  <p className="text-sm text-red-700">These results will trigger an immediate alert to the doctor.</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {selectedRequest.status !== 'completed' && (
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowResultModal(false)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitResults}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                >
                  {loading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                  Submit Results
                </button>
              </div>
            )}

            {selectedRequest.status === 'completed' && (
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowResultModal(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LaboratoryDashboard;