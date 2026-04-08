import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { FaSpinner, FaSearch, FaEye, FaUpload, FaCheck, FaTimes, FaExclamationTriangle, FaFlask, FaImage, FaFileAlt, FaSync, FaTrash, FaDownload } from 'react-icons/fa';

const RadiologyDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('queue');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [queue, setQueue] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({
    findings: '',
    impression: '',
    critical: false
  });
  const [uploadedImages, setUploadedImages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWard, setSelectedWard] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    critical: 0
  });

  const API_URL = 'http://localhost:5001';
  const fileInputRef = useRef(null);
  const socket = useRef(null);
  const navigate = useNavigate();

  // ==================== WARD CONFIGURATION ====================
  const wards = [
    { id: 'all', name: 'All Wards', color: '#64748b', icon: '🏥' },
    { id: 'OPD', name: 'OPD', color: '#10b981', icon: '🏥' },
    { id: 'EME', name: 'Emergency', color: '#ef4444', icon: '🚨' },
    { id: 'ANC', name: 'Antenatal', color: '#8b5cf6', icon: '🤰' }
  ];

  // ==================== FETCH FUNCTIONS WITH WARD FILTER ====================
  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = { hospital_id: user?.hospital_id };
      
      if (selectedWard && selectedWard !== 'all') {
        params.ward = selectedWard;
      }
      
      console.log(`📡 Fetching pending radiology requests for ward: ${selectedWard}`);
      
      const res = await axios.get(`${API_URL}/api/radiology/pending`, {
        params: params,
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      
      if (res.data.success) {
        const requests = res.data.requests || [];
        console.log(`✅ Found ${requests.length} pending requests`);
        setQueue(requests);
        setStats(prev => ({ ...prev, pending: requests.length }));
      }
    } catch (error) {
      console.error('❌ Error fetching queue:', error);
      setQueue([]);
    }
  };

  const fetchInProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = { hospital_id: user?.hospital_id };
      
      if (selectedWard && selectedWard !== 'all') {
        params.ward = selectedWard;
      }
      
      console.log(`📡 Fetching in-progress radiology requests for ward: ${selectedWard}`);
      
      const res = await axios.get(`${API_URL}/api/radiology/in-progress`, {
        params: params,
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      
      if (res.data.success) {
        const requests = res.data.requests || [];
        console.log(`✅ Found ${requests.length} in-progress requests`);
        setInProgress(requests);
        setStats(prev => ({ ...prev, inProgress: requests.length }));
      }
    } catch (error) {
      console.error('❌ Error fetching in-progress:', error);
      setInProgress([]);
    }
  };

  const fetchCompleted = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = { hospital_id: user?.hospital_id };
      
      if (selectedWard && selectedWard !== 'all') {
        params.ward = selectedWard;
      }
      
      console.log(`📡 Fetching completed radiology requests for ward: ${selectedWard}`);
      
      const res = await axios.get(`${API_URL}/api/radiology/completed`, {
        params: params,
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      
      if (res.data.success) {
        const requests = res.data.requests || [];
        console.log(`✅ Found ${requests.length} completed requests`);
        setCompleted(requests);
        setStats(prev => ({ ...prev, completed: requests.length }));
        
        const criticalCount = requests.filter(r => r.critical).length;
        setStats(prev => ({ ...prev, critical: criticalCount }));
      }
    } catch (error) {
      console.error('❌ Error fetching completed:', error);
      setCompleted([]);
    }
  };

  const fetchAllData = () => {
    fetchQueue();
    fetchInProgress();
    fetchCompleted();
  };

  // ==================== SOCKET INITIALIZATION ====================
  const initializeSocket = () => {
    const token = localStorage.getItem('token');
    
    socket.current = io(API_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socket.current.on('connect', () => {
      console.log('✅ Radiology socket connected');
      setConnectionStatus('connected');
      
      socket.current.emit('join', `hospital_${user?.hospital_id}_radiology`);
      
      if (selectedWard && selectedWard !== 'all') {
        const wardRoom = `hospital_${user?.hospital_id}_ward_${selectedWard}`;
        socket.current.emit('join', wardRoom);
      }
    });

    socket.current.on('connect_error', () => {
      console.error('❌ Radiology socket connection error');
      setConnectionStatus('disconnected');
    });
    
    socket.current.on('disconnect', () => {
      console.log('🔌 Radiology socket disconnected');
      setConnectionStatus('disconnected');
    });

    socket.current.on('new_radiology_request', (data) => {
      console.log('📷 New radiology request received:', data);
      
      if (selectedWard === 'all' || data.ward === selectedWard) {
        setMessage({ 
          type: 'info', 
          text: `📷 New radiology request: ${data.exam_type} for ${data.patient_name} (${data.ward} Ward)` 
        });
      }
      
      fetchAllData();
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    });

    socket.current.on('radiology_request_updated', (data) => {
      console.log('🔄 Radiology request updated:', data);
      fetchAllData();
    });
    
    socket.current.on('report_received_ack', (data) => {
      console.log('✅ Report received acknowledgment:', data);
    });
  };

  // ==================== IMAGE UPLOAD HANDLER (CORRECTED - RADIOLOGY ENDPOINT) ====================
  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    if (!selectedRequest) {
      setMessage({ type: 'error', text: 'No active exam selected' });
      return;
    }

    setUploadingImages(true);
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      const token = localStorage.getItem('token');
      
      // FIXED: Use radiology-specific endpoint instead of general upload
      const res = await axios.post(`${API_URL}/api/radiology/upload/${selectedRequest.id}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Upload response:', res.data);

      if (res.data.success) {
        const uploadedFileUrls = res.data.images.map(img => ({
          url: img.url,
          key: img.key || img.filename,
          originalName: img.originalName || img.originalname,
          size: img.size,
          uploadedAt: img.uploaded_at || new Date().toISOString()
        }));
        
        setUploadedImages(prev => [...prev, ...uploadedFileUrls]);
        setMessage({ type: 'success', text: `✅ ${uploadedFileUrls.length} image(s) uploaded successfully` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        throw new Error(res.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Error uploading images:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error uploading images' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ==================== EXAM HANDLING ====================
  const handleStartExam = async (request) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log(`🚀 Starting exam for request ${request.id}`);
      
      const res = await axios.put(`${API_URL}/api/radiology/requests/${request.id}/start`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setSelectedRequest(request);
        setReportData({ findings: '', impression: '', critical: false });
        setUploadedImages([]);
        setShowReportModal(true);
        fetchAllData();
        
        setMessage({ type: 'success', text: '✅ Exam started successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('❌ Error starting exam:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error starting exam' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== REMOVE IMAGE ====================
  const handleRemoveImage = (indexToRemove) => {
    setUploadedImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // ==================== SUBMIT REPORT ====================
  const handleSubmitReport = async () => {
    if (!reportData.findings) {
      setMessage({ type: 'error', text: 'Please enter findings' });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log(`📤 Submitting report for request ${selectedRequest.id}`);
      console.log(`📸 Images included: ${uploadedImages.length}`);
      
      const res = await axios.put(`${API_URL}/api/radiology/report/${selectedRequest.id}`, {
        report: {
          findings: reportData.findings,
          impression: reportData.impression,
          critical: reportData.critical
        },
        images: uploadedImages.map(img => ({
          url: img.url,
          key: img.key,
          originalName: img.originalName
        }))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: '✅ Report submitted successfully' });
        
        if (socket.current && socket.current.connected) {
          socket.current.emit('radiology_report_ready', {
            patient_id: selectedRequest.patient_id,
            patient_name: selectedRequest.patient_name,
            doctor_id: selectedRequest.doctor_id,
            doctor_name: selectedRequest.doctor_name,
            exam_type: selectedRequest.exam_type,
            body_part: selectedRequest.body_part,
            report_id: res.data.report?.id || selectedRequest.id,
            critical: reportData.critical,
            hospital_id: user?.hospital_id,
            findings: reportData.findings,
            impression: reportData.impression,
            ward: selectedRequest.ward || 'OPD',
            image_count: uploadedImages.length
          });
          
          if (selectedRequest.doctor_id) {
            socket.current.emit('direct_radiology_report', {
              doctor_id: selectedRequest.doctor_id,
              patient_id: selectedRequest.patient_id,
              patient_name: selectedRequest.patient_name,
              report_id: res.data.report?.id || selectedRequest.id,
              critical: reportData.critical,
              findings: reportData.findings,
              impression: reportData.impression
            });
          }
          
          const wardRoom = `hospital_${user?.hospital_id}_ward_${selectedRequest.ward || 'OPD'}`;
          socket.current.emit('to_ward', {
            room: wardRoom,
            data: {
              patient_id: selectedRequest.patient_id,
              patient_name: selectedRequest.patient_name,
              exam_type: selectedRequest.exam_type,
              critical: reportData.critical
            }
          });
          
          console.log(`📡 Emitted radiology report for patient ${selectedRequest.patient_name}`);
        }
        
        setShowReportModal(false);
        setSelectedRequest(null);
        fetchAllData();
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('❌ Error submitting report:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error submitting report' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== HELPER FUNCTIONS ====================
  const getPriorityBadge = (priority) => {
    const badges = {
      stat: 'bg-red-100 text-red-800',
      urgent: 'bg-orange-100 text-orange-800',
      routine: 'bg-green-100 text-green-800'
    };
    return badges[priority] || badges.routine;
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      stat: '🔴',
      urgent: '🟠',
      routine: '🟢'
    };
    return icons[priority] || '🟢';
  };

  const getWardColor = (ward) => {
    const wardColors = {
      'OPD': '#10b981',
      'EME': '#ef4444',
      'ANC': '#8b5cf6'
    };
    return wardColors[ward] || '#64748b';
  };

  const ConnectionStatusBanner = () => {
    if (connectionStatus === 'connected') return null;
    return (
      <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-2 rounded-full shadow-lg flex items-center gap-3 ${
        connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
      } text-white`}>
        <span>{connectionStatus === 'connecting' ? '🔄 Connecting...' : '⚠️ Disconnected'}</span>
        <button 
          onClick={() => fetchAllData()}
          className="ml-2 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30"
        >
          Retry
        </button>
      </div>
    );
  };

  // ==================== FILTERED REQUESTS ====================
  const filteredQueue = queue.filter(req =>
    req.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.exam_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInProgress = inProgress.filter(req =>
    req.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.exam_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompleted = completed.filter(req =>
    req.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.exam_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ==================== USE EFFECT ====================
  useEffect(() => {
    if (!user?.hospital_id) return;

    initializeSocket();
    fetchAllData();

    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);

    return () => {
      if (socket.current) socket.current.disconnect();
      clearInterval(interval);
    };
  }, [user?.hospital_id, selectedWard]);

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <ConnectionStatusBanner />

      {/* Sidebar */}
      <div className={`bg-slate-800 text-white transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} flex flex-col h-screen sticky top-0 shadow-xl`}>
        <div className={`p-6 border-b border-slate-700 flex ${sidebarCollapsed ? 'justify-center' : 'justify-between'} items-center`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <FaFlask className="text-2xl text-pink-400" />
              <span className="font-bold">Radiology</span>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-slate-400 hover:text-white">
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <div className="p-4 m-4 bg-slate-900 rounded-xl">
          <p className="text-xs text-slate-400 mb-2">Radiology Staff</p>
          <p className="text-sm font-medium">{user?.full_name}</p>
          <p className="text-xs text-pink-400 mt-1">ID: {user?.id}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'queue', icon: '⏳', label: 'Pending Queue', badge: stats.pending },
            { id: 'in-progress', icon: '⚙️', label: 'In Progress', badge: stats.inProgress },
            { id: 'completed', icon: '✅', label: 'Completed', badge: stats.completed }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-lg transition-all ${activeTab === item.id ? 'bg-pink-600' : 'hover:bg-slate-700'}`}
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
        <div className="bg-gradient-to-r from-pink-600 to-pink-500 text-white py-6 px-8 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Radiology Dashboard</h1>
              <p className="text-pink-100 mt-1">{user?.hospital_name} • {user?.full_name}</p>
              <p className="text-pink-200 text-xs mt-1">
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
              {stats.critical > 0 && (
                <div className="bg-red-500 px-4 py-2 rounded-lg text-center animate-pulse">
                  <div className="text-2xl font-bold">{stats.critical}</div>
                  <div className="text-xs">Critical</div>
                </div>
              )}
              <button 
                onClick={() => fetchAllData()}
                className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
                disabled={loading}
              >
                <FaSync className={loading ? 'animate-spin' : ''} />
                <span className="text-sm">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-8">
          {/* Message Toast */}
          {message.text && (
            <div className={`fixed bottom-8 right-8 z-50 ${message.type === 'error' ? 'bg-red-100 text-red-800 border-red-200' : message.type === 'success' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-blue-100 text-blue-800 border-blue-200'} px-6 py-3 rounded-lg shadow-lg border`}>
              {message.text}
            </div>
          )}

          {/* Ward Filter */}
          <div className="mb-6 flex justify-between items-center">
            <div className="flex gap-2">
              {wards.map(ward => (
                <button
                  key={ward.id}
                  onClick={() => setSelectedWard(ward.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    selectedWard === ward.id
                      ? 'bg-pink-600 text-white'
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
                placeholder="Search by patient name or exam type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 w-80"
              />
            </div>
          </div>

          {/* Queue Tab */}
          {activeTab === 'queue' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Pending Radiology Requests
                  {selectedWard !== 'all' && ` - ${selectedWard} Ward`}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Requests from doctors waiting for imaging</p>
              </div>
              <div className="p-6">
                {loading && queue.length === 0 ? (
                  <div className="text-center py-12">
                    <FaSpinner className="animate-spin text-3xl text-pink-500 mx-auto mb-3" />
                    <p className="text-gray-500">Loading requests...</p>
                  </div>
                ) : filteredQueue.length === 0 ? (
                  <div className="text-center py-12">
                    <FaImage className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No pending requests</p>
                    <p className="text-sm text-gray-400 mt-1">New requests will appear here automatically</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredQueue.map(request => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: getWardColor(request.ward) }}>
                                {request.ward}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(request.priority)}`}>
                                {getPriorityIcon(request.priority)} {request.priority?.toUpperCase() || 'ROUTINE'}
                              </span>
                              <span className="text-xs text-gray-500">
                                Requested: {new Date(request.requested_at).toLocaleString()}
                              </span>
                            </div>
                            <h3 className="font-semibold text-lg">{request.patient_name}</h3>
                            <p className="text-gray-600 mt-1">
                              <span className="font-medium">{request.exam_type}</span> - {request.body_part}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                              👨‍⚕️ Doctor: {request.doctor_name}
                            </p>
                            {request.clinical_notes && (
                              <p className="text-sm text-gray-500 mt-1">
                                📝 Notes: {request.clinical_notes}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleStartExam(request)}
                            disabled={loading}
                            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors flex items-center gap-2"
                          >
                            <FaEye /> Start Exam
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* In Progress Tab */}
          {activeTab === 'in-progress' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Exams In Progress
                  {selectedWard !== 'all' && ` - ${selectedWard} Ward`}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Currently being processed</p>
              </div>
              <div className="p-6">
                {loading && inProgress.length === 0 ? (
                  <div className="text-center py-12">
                    <FaSpinner className="animate-spin text-3xl text-pink-500 mx-auto mb-3" />
                    <p className="text-gray-500">Loading...</p>
                  </div>
                ) : filteredInProgress.length === 0 ? (
                  <div className="text-center py-12">
                    <FaImage className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No exams in progress</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredInProgress.map(request => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-5 bg-blue-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: getWardColor(request.ward) }}>
                                {request.ward}
                              </span>
                            </div>
                            <h3 className="font-semibold text-lg">{request.patient_name}</h3>
                            <p className="text-gray-600 mt-1">{request.exam_type} - {request.body_part}</p>
                            <p className="text-sm text-gray-500 mt-2">
                              Started: {new Date(request.started_at).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setReportData({ findings: '', impression: '', critical: false });
                              setUploadedImages([]);
                              setShowReportModal(true);
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                          >
                            <FaFileAlt /> Complete & Report
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completed Tab */}
          {activeTab === 'completed' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Completed Exams
                  {selectedWard !== 'all' && ` - ${selectedWard} Ward`}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Reports submitted to doctors</p>
              </div>
              <div className="p-6 overflow-x-auto">
                {loading && completed.length === 0 ? (
                  <div className="text-center py-12">
                    <FaSpinner className="animate-spin text-3xl text-pink-500 mx-auto mb-3" />
                    <p className="text-gray-500">Loading...</p>
                  </div>
                ) : filteredCompleted.length === 0 ? (
                  <div className="text-center py-12">
                    <FaImage className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No completed exams</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reported By</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Critical</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Images</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredCompleted.map(request => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: getWardColor(request.ward) }}>
                              {request.ward}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{request.patient_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            {request.exam_type}
                          </td>
                          <td className="px-4 py-3">
                            {request.reported_by}
                          </td>
                          <td className="px-4 py-3">
                            {new Date(request.reported_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            {request.critical && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs animate-pulse">
                                ⚠️ CRITICAL
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {request.images && request.images.length > 0 && (
                              <span className="text-xs text-gray-500">
                                📸 {request.images.length}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button 
                              className="text-pink-500 hover:text-pink-700 flex items-center gap-1" 
                              onClick={() => {
                                setSelectedRequest(request);
                                setReportData({
                                  findings: request.findings || request.report?.findings || '',
                                  impression: request.impression || request.report?.impression || '',
                                  critical: request.critical || false
                                });
                                setUploadedImages(request.images || []);
                                setShowReportModal(true);
                              }}
                            >
                              <FaEye /> View Report
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Radiology Report</h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: getWardColor(selectedRequest.ward) }}>
                  {selectedRequest.ward}
                </span>
              </div>
              <p className="font-medium text-lg">{selectedRequest.patient_name}</p>
              <p className="text-sm text-gray-600">{selectedRequest.exam_type} - {selectedRequest.body_part}</p>
              <p className="text-sm text-gray-500">Requested by: Dr. {selectedRequest.doctor_name}</p>
              <p className="text-xs text-gray-400 mt-1">Request ID: {selectedRequest.request_number || selectedRequest.id}</p>
            </div>

            {/* Image Upload Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Image Upload</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                  disabled={uploadingImages}
                >
                  {uploadingImages ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                  {uploadingImages ? 'Uploading...' : 'Upload Images'}
                </button>
                <span className="text-xs text-gray-400">Supported: JPG, PNG, GIF (max 100MB each)</span>
              </div>
              
              {/* Uploaded Images Preview */}
              {uploadedImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Images ({uploadedImages.length})</p>
                  <div className="grid grid-cols-4 gap-3">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={img.url} 
                          alt={`Upload ${idx + 1}`} 
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/100?text=Preview+Failed';
                          }}
                        />
                        <button
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove image"
                        >
                          <FaTimes size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Findings *</label>
              <textarea
                value={reportData.findings}
                onChange={(e) => setReportData({ ...reportData, findings: e.target.value })}
                rows="6"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Describe findings..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Impression / Conclusion</label>
              <textarea
                value={reportData.impression}
                onChange={(e) => setReportData({ ...reportData, impression: e.target.value })}
                rows="4"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Clinical impression and conclusion..."
              />
            </div>

            <div className="mb-6 flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <input
                type="checkbox"
                id="critical"
                checked={reportData.critical}
                onChange={(e) => setReportData({ ...reportData, critical: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="critical" className="text-sm font-medium text-red-600">
                ⚠️ Mark as Critical Finding (This will immediately alert the doctor)
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowReportModal(false)} 
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={loading || !reportData.findings}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadiologyDashboard;