import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RegionalReportForm from './RegionalReportForm';
// ❌ REMOVE THIS LINE: import FederalAdmin from '../models/FederalAdmin.js';
import axios from 'axios';
import { 
  FaHome, FaCity, FaFileAlt, FaBell, FaUserCircle, FaSignOutAlt,
  FaInbox, FaPaperPlane, FaArchive, FaUsers, FaChartBar,
  FaPlus, FaSearch, FaFilter, FaChevronLeft, FaChevronRight,
  FaEye, FaReply, FaTrash, FaEdit, FaClock, FaExclamationTriangle,
  FaEnvelope, FaEnvelopeOpen, FaDownload, FaTimes, FaCheck, FaSpinner,
  FaMapMarkerAlt, FaBuilding, FaGlobe, FaTree, FaHospital, FaUserMd,
  FaCalendarAlt, FaPhone, FaEnvelope as FaEnvelopeIcon, FaFlag,
  FaUpload, FaFileAlt as FaFileIcon, FaGlobeAfrica
} from 'react-icons/fa';

const RegionalDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [zones, setZones] = useState([]);
  const [federalInfo, setFederalInfo] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // For report form - stores recipients (federal + zones)
  const [availableRecipients, setAvailableRecipients] = useState([]);
  const [fetchingRecipients, setFetchingRecipients] = useState(false);

  const [zoneFormData, setZoneFormData] = useState({
    zone_name: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: 'Male',
    age: '',
    email: '',
    password: '',
    phone: ''
  });

  const navigate = useNavigate();

  // ========== FETCH FEDERAL INFO ==========
  const fetchFederalInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5001/api/regional/federal-info', {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => null);
      
      if (res?.data?.success && res.data.federal) {
        setFederalInfo(res.data.federal);
        console.log('✅ Federal info loaded:', res.data.federal);
      }
    } catch (error) {
      console.log('ℹ️ No federal info available');
    }
  };

  // ========== FETCH RECIPIENTS (FEDERAL + ZONES) ==========
  const fetchRecipients = async () => {
    try {
      setFetchingRecipients(true);
      const token = localStorage.getItem('token');
      
      console.log("📡 Fetching recipients for regional admin...");
      
      const recipients = [];
      
      // Fetch federal admin info (superior)
      try {
        const federalRes = await axios.get('http://localhost:5001/api/regional/federal-info', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (federalRes.data?.success && federalRes.data?.federal) {
          console.log('✅ Federal admin found:', federalRes.data.federal);
          recipients.push({
            id: federalRes.data.federal.id,
            name: 'Federal Ministry of Health',
            admin_name: federalRes.data.federal.full_name || 
                       `${federalRes.data.federal.first_name || ''} ${federalRes.data.federal.last_name || ''}`.trim() || 
                       'Federal Admin',
            email: federalRes.data.federal.email,
            type: 'federal',
            level: 'federal',
            full_name: federalRes.data.federal.full_name || 
                      `${federalRes.data.federal.first_name || ''} ${federalRes.data.federal.last_name || ''}`.trim(),
            region_name: 'Federal'
          });
          
          setFederalInfo(federalRes.data.federal);
        }
      } catch (err) {
        console.log("⚠️ No federal info available:", err.message);
      }
      
      // Fetch zones (subordinates)
      try {
        const zonesRes = await axios.get('http://localhost:5001/api/regional/zones', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (zonesRes.data.success && zonesRes.data.zones) {
          zonesRes.data.zones.forEach(zone => {
            recipients.push({
              id: zone.id,
              name: zone.zone_name || zone.name,
              admin_name: `${zone.first_name || ''} ${zone.last_name || ''}`.trim(),
              email: zone.email,
              type: 'zone',
              level: 'zone',
              full_name: `${zone.first_name || ''} ${zone.last_name || ''}`.trim(),
              zone_name: zone.zone_name || zone.name
            });
          });
          console.log(`✅ Found ${zonesRes.data.zones.length} zones`);
        }
      } catch (err) {
        console.error("❌ Error fetching zones:", err.message);
      }
      
      console.log(`✅ Total recipients: ${recipients.length} (Federal: ${recipients.filter(r => r.type === 'federal').length}, Zones: ${recipients.filter(r => r.type === 'zone').length})`);
      setAvailableRecipients(recipients);
      
    } catch (error) {
      console.error('❌ Error in fetchRecipients:', error);
    } finally {
      setFetchingRecipients(false);
    }
  };

  // ========== USE EFFECT ==========
  useEffect(() => {
    fetchDashboardData();
    fetchFederalInfo();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [activeTab, currentPage, searchTerm]);

  // ========== FETCH DASHBOARD DATA ==========
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      console.log("📊 Fetching regional dashboard data...");
      console.log("🔑 Token exists:", !!token);
      
      if (!token) {
        setError('Authentication token not found. Please login again.');
        return;
      }

      // Fetch all data in parallel with individual error handling
      const [statsRes, inboxRes, outboxRes, zonesRes, notifRes] = await Promise.all([
        axios.get('http://localhost:5001/api/regional/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error("❌ Stats endpoint failed:", err.response?.data || err.message);
          return { data: { success: false, stats: null } };
        }),
        
        axios.get(`http://localhost:5001/api/regional/reports/inbox?page=${currentPage}&search=${searchTerm}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error("❌ Inbox endpoint failed:", err.response?.data || err.message);
          return { data: { success: false, reports: [] } };
        }),
        
        axios.get(`http://localhost:5001/api/regional/reports/outbox?page=${currentPage}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error("❌ Outbox endpoint failed:", err.response?.data || err.message);
          return { data: { success: false, reports: [] } };
        }),
        
        axios.get('http://localhost:5001/api/regional/zones', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error("❌ Zones endpoint failed:", err.response?.data || err.message);
          return { data: { success: false, zones: [] } };
        }),
        
        axios.get('http://localhost:5001/api/regional/notifications?limit=5', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error("❌ Notifications endpoint failed:", err.response?.data || err.message);
          return { data: { success: false, notifications: [] } };
        })
      ]);

      console.log("✅ All data fetched successfully");

      // Set stats and urgentCount from stats
      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
        setUrgentCount(statsRes.data.stats?.urgentUnread || 0);
      }
      
      if (inboxRes.data.success) {
        setInbox(inboxRes.data.reports || []);
        setTotalPages(inboxRes.data.totalPages || 1);
        setUnreadCount(inboxRes.data.unreadCount || 0);
      }
      
      if (outboxRes.data.success) setOutbox(outboxRes.data.reports || []);
      
      if (zonesRes.data.success) {
        // Format zones with proper field names
        const formattedZones = zonesRes.data.zones.map(zone => ({
          id: zone.id,
          zone_name: zone.zone_name || zone.name,
          name: zone.zone_name || zone.name,
          first_name: zone.first_name,
          last_name: zone.last_name,
          admin_name: `${zone.first_name || ''} ${zone.last_name || ''}`.trim(),
          email: zone.email,
          phone: zone.phone,
          status: zone.status || 'active'
        }));
        setZones(formattedZones);
      }
      
      if (notifRes.data.success) setNotifications(notifRes.data.notifications || []);

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      if (error.response) {
        setError(`Server error (${error.response.status}): ${error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        setError('No response from server. Please check if backend is running.');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ========== FETCH NOTIFICATIONS ==========
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5001/api/regional/notifications?unreadOnly=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setUnreadCount(res.data.unreadCount);
        setUrgentCount(res.data.urgentUnreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // ========== HANDLE CREATE ZONE ==========
  const handleCreateZone = async (e) => {
    e.preventDefault();
    setZoneLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5001/api/regional/zones',
        zoneFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setZoneFormData({
          zone_name: '',
          first_name: '',
          middle_name: '',
          last_name: '',
          gender: 'Male',
          age: '',
          email: '',
          password: '',
          phone: ''
        });
        
        setShowZoneModal(false);
        fetchDashboardData();
        alert('Zone admin created successfully!');
      }
    } catch (error) {
      console.error('Error creating zone:', error);
      alert(error.response?.data?.message || 'Error creating zone admin');
    } finally {
      setZoneLoading(false);
    }
  };

  // ========== HANDLE OPEN REPORT MODAL ==========
  const handleOpenReportModal = () => {
    fetchRecipients(); // Fetch federal + zones
    setShowReportModal(true);
  };

  // ========== NOTIFICATION HANDLERS ==========
  const markNotificationAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5001/api/regional/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
      fetchDashboardData();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5001/api/regional/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // ========== LOGOUT ==========
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    navigate('/login');
  };

  // ========== UI HELPER FUNCTIONS ==========
  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800 animate-pulse'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'sent': return <FaPaperPlane className="text-blue-500" />;
      case 'delivered': return <FaEnvelope className="text-green-500" />;
      case 'opened': return <FaEnvelopeOpen className="text-purple-500" />;
      case 'replied': return <FaReply className="text-indigo-500" />;
      case 'resolved': return <FaCheck className="text-teal-500" />;
      case 'closed': return <FaCheck className="text-gray-500" />;
      default: return <FaClock className="text-gray-400" />;
    }
  };

  const viewReportDetails = (report) => {
    setSelectedReport(report);
    setShowReportDetailModal(true);
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch(ext) {
      case 'pdf': return <FaFileIcon className="text-red-500" />;
      case 'doc':
      case 'docx': return <FaFileIcon className="text-blue-500" />;
      case 'xls':
      case 'xlsx': return <FaFileIcon className="text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png': return <FaFileIcon className="text-purple-500" />;
      default: return <FaFileIcon className="text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // ========== LOADING STATE ==========
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center bg-white p-8 rounded-2xl shadow-2xl">
          <div className="relative">
            <FaSpinner className="animate-spin text-5xl text-green-600 mx-auto mb-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            </div>
          </div>
          <p className="text-gray-700 font-medium text-lg">Loading Regional Dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <div className={`bg-gradient-to-b from-green-900 via-green-800 to-green-900 text-white transition-all duration-300 shadow-2xl ${
        sidebarCollapsed ? 'w-20' : 'w-72'
      }`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3 bg-green-800 bg-opacity-50 p-2 rounded-lg">
                <div className="bg-white p-2 rounded-lg">
                  <FaCity className="text-2xl text-green-600" />
                </div>
                <div>
                  <span className="font-bold text-lg">Regional Admin</span>
                  <p className="text-xs text-green-300">{user?.region_name || 'Region'}</p>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-full flex justify-center">
                <div className="bg-white p-2 rounded-lg">
                  <FaCity className="text-2xl text-green-600" />
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-green-700 rounded-lg transition-colors absolute -right-3 bg-green-700 shadow-lg"
            >
              {sidebarCollapsed ? <FaChevronRight className="text-white" /> : <FaChevronLeft className="text-white" />}
            </button>
          </div>

          <nav className="space-y-2 mt-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-gradient-to-r from-green-600 to-green-500 shadow-lg transform scale-105' 
                  : 'hover:bg-green-700 hover:shadow-md'
              }`}
            >
              <FaHome className="text-xl" />
              {!sidebarCollapsed && <span className="font-medium">Dashboard</span>}
            </button>

            <button
              onClick={() => setActiveTab('zones')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'zones' 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 shadow-lg transform scale-105' 
                  : 'hover:bg-green-700 hover:shadow-md'
              }`}
            >
              <FaCity className="text-xl" />
              {!sidebarCollapsed && <span className="font-medium">Zones</span>}
              {!sidebarCollapsed && activeTab === 'zones' && (
                <span className="ml-auto bg-white text-purple-600 text-xs px-2 py-1 rounded-full">{zones.length}</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('inbox')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all relative ${
                activeTab === 'inbox' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg transform scale-105' 
                  : 'hover:bg-green-700 hover:shadow-md'
              }`}
            >
              <FaInbox className="text-xl" />
              {!sidebarCollapsed && <span className="font-medium">Inbox</span>}
              {unreadCount > 0 && (
                <span className={`absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ${
                  !sidebarCollapsed ? 'static ml-auto' : ''
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('outbox')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'outbox' 
                  ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 shadow-lg transform scale-105' 
                  : 'hover:bg-green-700 hover:shadow-md'
              }`}
            >
              <FaPaperPlane className="text-xl" />
              {!sidebarCollapsed && <span className="font-medium">Outbox</span>}
            </button>

            <button
              onClick={() => setActiveTab('archive')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'archive' 
                  ? 'bg-gradient-to-r from-gray-600 to-gray-500 shadow-lg transform scale-105' 
                  : 'hover:bg-green-700 hover:shadow-md'
              }`}
            >
              <FaArchive className="text-xl" />
              {!sidebarCollapsed && <span className="font-medium">Archive</span>}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'profile' 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 shadow-lg transform scale-105' 
                  : 'hover:bg-green-700 hover:shadow-md'
              }`}
            >
              <FaUserCircle className="text-xl" />
              {!sidebarCollapsed && <span className="font-medium">Profile</span>}
            </button>
          </nav>

          {!sidebarCollapsed && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-gradient-to-r from-green-800 to-green-700 rounded-xl p-4 shadow-inner">
                <p className="text-xs text-green-300 uppercase tracking-wider">Regional Admin</p>
                <p className="font-semibold text-lg truncate">{user?.full_name || 'Administrator'}</p>
                <p className="text-xs text-green-300 mt-1 flex items-center gap-1">
                  <FaCity className="text-sm" />
                  {user?.region_name || 'Region'} • {zones.length} Zones
                </p>
                {federalInfo && (
                  <p className="text-xs text-green-300 mt-1 flex items-center gap-1 border-t border-green-600 pt-1">
                    <FaGlobeAfrica className="text-sm" />
                    Federal: {federalInfo.full_name || 'Ministry of Health'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-xl sticky top-0 z-40 border-b border-gray-200">
          <div className="px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-purple-600 bg-clip-text text-transparent">
                  {activeTab === 'dashboard' && 'Regional Dashboard'}
                  {activeTab === 'zones' && 'Zone Administration'}
                  {activeTab === 'inbox' && 'Inbox'}
                  {activeTab === 'outbox' && 'Sent Reports'}
                  {activeTab === 'archive' && 'Archive'}
                  {activeTab === 'profile' && 'My Profile'}
                </h1>
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Welcome, <span className="font-semibold">{user?.full_name}</span> | {user?.region_name} Region
                  {federalInfo && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                      <FaGlobeAfrica className="inline mr-1 text-xs" />
                      {federalInfo.full_name}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                {/* Notification Bell */}
                <button
                  onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                  className="relative p-3 hover:bg-gray-100 rounded-xl transition-all group"
                >
                  <FaBell className="text-xl text-gray-600 group-hover:text-green-600 transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                  {urgentCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-ping">
                      {urgentCount}
                    </span>
                  )}
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Error Display */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700 p-6 m-8 rounded-xl shadow-lg">
            <div className="flex items-center">
              <div className="bg-red-500 rounded-full p-2 mr-4">
                <FaExclamationTriangle className="text-white text-xl" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">Error Loading Dashboard</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button 
                onClick={fetchDashboardData}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 text-sm font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <FaSpinner className="animate-spin" /> Retry
              </button>
            </div>
          </div>
        )}

        {/* Notification Panel */}
        {showNotificationPanel && (
          <div className="absolute right-8 top-24 w-96 bg-white rounded-xl shadow-2xl z-50 border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-green-600 to-purple-600 text-white flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FaBell />
                Notifications
              </h3>
              <button
                onClick={markAllAsRead}
                className="text-sm bg-white text-green-600 px-3 py-1 rounded-full hover:bg-green-50 transition-colors"
              >
                Mark all as read
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all ${
                      !notif.is_read ? 'bg-green-50' : ''
                    } ${notif.priority === 'urgent' ? 'border-l-4 border-l-red-500' : ''}`}
                    onClick={() => markNotificationAsRead(notif.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 p-2 rounded-full ${
                        notif.priority === 'urgent' ? 'bg-red-100 animate-pulse' :
                        notif.type === 'report_sent' ? 'bg-green-100' :
                        notif.type === 'reply_received' ? 'bg-purple-100' :
                        'bg-gray-100'
                      }`}>
                        {notif.type === 'report_sent' && <FaPaperPlane className="text-green-500" />}
                        {notif.type === 'report_opened' && <FaEnvelopeOpen className="text-purple-500" />}
                        {notif.type === 'reply_received' && <FaReply className="text-indigo-500" />}
                        {notif.type === 'urgent_alert' && <FaExclamationTriangle className="text-red-500" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-400">
                            {new Date(notif.createdAt).toLocaleString()}
                          </span>
                          {notif.priority === 'urgent' && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                              URGENT
                            </span>
                          )}
                        </div>
                      </div>
                      {!notif.is_read && (
                        <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaBell className="text-4xl text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No notifications</p>
                  <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 p-8">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && !error && (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all transform hover:scale-105 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Inbox</p>
                      <p className="text-4xl font-bold text-blue-600 mt-2">{stats?.inbox || 0}</p>
                    </div>
                    <div className="bg-blue-100 p-4 rounded-2xl">
                      <FaInbox className="text-3xl text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between text-sm bg-gray-50 p-3 rounded-lg">
                    <span className="text-yellow-600 font-medium flex items-center gap-1">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      {stats?.unread || 0} unread
                    </span>
                    <span className="text-red-600 font-medium flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      {stats?.urgentUnread || 0} urgent
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all transform hover:scale-105 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Outbox</p>
                      <p className="text-4xl font-bold text-green-600 mt-2">{stats?.outbox || 0}</p>
                    </div>
                    <div className="bg-green-100 p-4 rounded-2xl">
                      <FaPaperPlane className="text-3xl text-green-600" />
                    </div>
                  </div>
                  <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <FaClock className="text-gray-400" />
                      {stats?.drafts || 0} drafts
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all transform hover:scale-105 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Zones</p>
                      <p className="text-4xl font-bold text-purple-600 mt-2">{zones.length}</p>
                    </div>
                    <div className="bg-purple-100 p-4 rounded-2xl">
                      <FaCity className="text-3xl text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <FaFlag className="text-purple-400" />
                      {stats?.activeZones || zones.length} active zones
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all transform hover:scale-105 border-l-4 border-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Avg Response</p>
                      <p className="text-4xl font-bold text-orange-600 mt-2">{stats?.avgResponseTime || '2.5d'}</p>
                    </div>
                    <div className="bg-orange-100 p-4 rounded-2xl">
                      <FaClock className="text-3xl text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <FaCheck className="text-green-500" />
                      {stats?.resolved || 0} resolved
                    </p>
                  </div>
                </div>
              </div>

              {/* Priority Distribution */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-purple-600 bg-clip-text text-transparent mb-6">Reports by Priority</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl text-center border-2 border-green-200">
                    <span className="text-3xl font-bold text-green-600">{stats?.lowPriority || 0}</span>
                    <p className="text-sm font-medium text-gray-600 mt-2">Low Priority</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl text-center border-2 border-yellow-200">
                    <span className="text-3xl font-bold text-yellow-600">{stats?.mediumPriority || 0}</span>
                    <p className="text-sm font-medium text-gray-600 mt-2">Medium Priority</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl text-center border-2 border-orange-200">
                    <span className="text-3xl font-bold text-orange-600">{stats?.highPriority || 0}</span>
                    <p className="text-sm font-medium text-gray-600 mt-2">High Priority</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl text-center border-2 border-red-200 animate-pulse">
                    <span className="text-3xl font-bold text-red-600">{stats?.urgentPriority || 0}</span>
                    <p className="text-sm font-medium text-gray-600 mt-2">Urgent Priority</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-purple-600 bg-clip-text text-transparent mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <button
                    onClick={handleOpenReportModal}
                    className="group p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <div className="bg-white bg-opacity-20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 transition-transform">
                      <FaPlus className="text-3xl" />
                    </div>
                    <h3 className="font-semibold text-lg">New Report</h3>
                    <p className="text-sm text-green-100 mt-2">Send to Federal or Zones</p>
                  </button>

                  <button
                    onClick={() => setShowZoneModal(true)}
                    className="group p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <div className="bg-white bg-opacity-20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 transition-transform">
                      <FaCity className="text-3xl" />
                    </div>
                    <h3 className="font-semibold text-lg">Add Zone</h3>
                    <p className="text-sm text-purple-100 mt-2">Create new zone admin</p>
                  </button>

                  <button
                    onClick={() => setActiveTab('inbox')}
                    className="group p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <div className="bg-white bg-opacity-20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 transition-transform">
                      <FaInbox className="text-3xl" />
                    </div>
                    <h3 className="font-semibold text-lg">View Inbox</h3>
                    <p className="text-sm text-blue-100 mt-2">Check your reports</p>
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Recent Inbox */}
                <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <FaInbox className="text-blue-600" />
                    Recent Reports
                  </h3>
                  {inbox.length > 0 ? (
                    <div className="space-y-4">
                      {inbox.slice(0, 5).map((report) => (
                        <div
                          key={report.id}
                          className="bg-gradient-to-r from-gray-50 to-white p-4 rounded-xl hover:shadow-md cursor-pointer transition-all border border-gray-100 hover:border-green-200"
                          onClick={() => viewReportDetails(report)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="bg-green-100 p-2 rounded-lg">
                                {getStatusIcon(report.status)}
                              </div>
                              <span className="font-semibold text-gray-800">{report.title}</span>
                            </div>
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${getPriorityBadge(report.priority)}`}>
                              {report.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 ml-11">From: {report.sender_full_name}</p>
                          <p className="text-xs text-gray-500 ml-11 mt-2 flex items-center gap-1">
                            <FaCalendarAlt className="text-gray-400" />
                            {new Date(report.sent_at).toLocaleString()}
                          </p>
                          {!report.is_opened && (
                            <span className="mt-3 inline-block bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium ml-11">
                              New
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <FaInbox className="text-5xl text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No reports in inbox</p>
                    </div>
                  )}
                </div>

                {/* Recent Zones */}
                <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <FaCity className="text-purple-600" />
                    Your Zones
                  </h3>
                  {zones.length > 0 ? (
                    <div className="space-y-4">
                      {zones.slice(0, 5).map((zone) => (
                        <div key={zone.id} className="bg-gradient-to-r from-gray-50 to-white p-4 rounded-xl hover:shadow-md transition-all border border-gray-100 hover:border-purple-200">
                          <div className="flex items-center gap-4">
                            <div className="bg-purple-100 p-3 rounded-lg">
                              <FaCity className="text-purple-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{zone.zone_name}</p>
                              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                <FaUserCircle className="text-gray-400" />
                                Admin: {zone.admin_name}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <FaCity className="text-5xl text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No zones created yet</p>
                      <button
                        onClick={() => setShowZoneModal(true)}
                        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                      >
                        Create First Zone
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Federal Info Card */}
              {federalInfo && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-600 p-3 rounded-xl">
                        <FaGlobeAfrica className="text-white text-2xl" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Your Federal Ministry</p>
                        <h3 className="text-xl font-bold text-gray-800">{federalInfo.full_name || 'Federal Ministry of Health'}</h3>
                        <p className="text-sm text-gray-600 mt-1">{federalInfo.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('inbox');
                        handleOpenReportModal();
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FaPaperPlane className="inline mr-2" />
                      Send Report to Federal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Zones Tab */}
          {activeTab === 'zones' && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Zone Administration</h2>
                <div className="flex gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search zones..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
                    />
                    <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                  </div>
                  <button
                    onClick={() => setShowZoneModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
                  >
                    <FaPlus /> Add Zone
                  </button>
                </div>
              </div>

              {zones.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {zones.map((zone) => (
                    <div key={zone.id} className="group bg-gradient-to-br from-white to-gray-50 border-2 border-gray-100 rounded-2xl p-6 hover:shadow-2xl transition-all hover:border-purple-200">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <FaCity className="text-3xl text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-gray-800">{zone.zone_name}</h3>
                        </div>
                      </div>

                      <div className="space-y-3 mb-4 bg-gray-50 p-4 rounded-xl">
                        <p className="flex items-center gap-2 text-gray-700">
                          <FaUserCircle className="text-blue-500" />
                          <span className="font-medium">Admin:</span> {zone.admin_name}
                        </p>
                        <p className="flex items-center gap-2 text-gray-700">
                          <FaEnvelopeIcon className="text-gray-500" />
                          <span className="font-medium">Email:</span> {zone.email}
                        </p>
                        {zone.phone && (
                          <p className="flex items-center gap-2 text-gray-700">
                            <FaPhone className="text-green-500" />
                            <span className="font-medium">Phone:</span> {zone.phone}
                          </p>
                        )}
                        <p className="flex items-center gap-2 text-gray-700">
                          <FaClock className="text-orange-500" />
                          <span className="font-medium">Status:</span> 
                          <span className={`ml-2 px-3 py-1 text-xs rounded-full font-medium ${
                            zone.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {zone.status}
                          </span>
                        </p>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <FaEye />
                        </button>
                        <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                          <FaEdit />
                        </button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 rounded-2xl">
                  <div className="bg-white w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <FaCity className="text-5xl text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-xl font-medium mb-2">No zones found</p>
                  <p className="text-gray-500 mb-6">Get started by creating your first zone</p>
                  <button
                    onClick={() => setShowZoneModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl font-medium"
                  >
                    Add Your First Zone
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Inbox Tab */}
          {activeTab === 'inbox' && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Inbox</h2>
                <button
                  onClick={handleOpenReportModal}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <FaPlus /> New Report
                </button>
              </div>

              {inbox.length > 0 ? (
                <div className="space-y-4">
                  {inbox.map((report) => (
                    <div
                      key={report.id}
                      className={`group border-2 rounded-xl p-6 cursor-pointer hover:shadow-xl transition-all ${
                        !report.is_opened ? 'bg-gradient-to-r from-green-50 to-white border-green-200' : 'border-gray-100 hover:border-green-200'
                      } ${report.priority === 'urgent' ? 'border-l-4 border-l-red-500' : ''}`}
                      onClick={() => viewReportDetails(report)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${
                              !report.is_opened ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              {getStatusIcon(report.status)}
                            </div>
                            <h3 className="font-semibold text-lg text-gray-800">{report.title}</h3>
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${getPriorityBadge(report.priority)}`}>
                              {report.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 ml-11">
                            From: <span className="font-medium">{report.sender_full_name}</span> ({report.sender_title})
                          </p>
                          <p className="text-sm text-gray-700 ml-11 line-clamp-2">{report.body}</p>
                          <div className="flex items-center gap-6 mt-4 text-xs text-gray-500 ml-11">
                            <span className="flex items-center gap-1">
                              <FaCalendarAlt className="text-gray-400" />
                              {new Date(report.sent_at).toLocaleString()}
                            </span>
                            {report.attachments?.length > 0 && (
                              <span className="flex items-center gap-1">
                                <FaPaperPlane className="text-gray-400" />
                                {report.attachments.length} attachment(s)
                              </span>
                            )}
                          </div>
                        </div>
                        {!report.is_opened && (
                          <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full font-medium animate-pulse">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 rounded-2xl">
                  <div className="bg-white w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <FaInbox className="text-5xl text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-xl font-medium mb-2">No reports in inbox</p>
                  <p className="text-gray-500 mb-6">Your inbox is empty</p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center space-x-3 mt-8">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-5 py-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    Previous
                  </button>
                  <span className="px-5 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-5 py-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Add Zone Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Add Zone Admin</h2>
                <button
                  onClick={() => setShowZoneModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FaTimes className="text-xl text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleCreateZone} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zone Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={zoneFormData.zone_name}
                      onChange={(e) => setZoneFormData({...zoneFormData, zone_name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      required
                      placeholder="e.g., North Zone, East Zone"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={zoneFormData.first_name}
                      onChange={(e) => setZoneFormData({...zoneFormData, first_name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={zoneFormData.middle_name}
                      onChange={(e) => setZoneFormData({...zoneFormData, middle_name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={zoneFormData.last_name}
                      onChange={(e) => setZoneFormData({...zoneFormData, last_name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={zoneFormData.email}
                      onChange={(e) => setZoneFormData({...zoneFormData, email: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={zoneFormData.phone}
                      onChange={(e) => setZoneFormData({...zoneFormData, phone: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={zoneFormData.gender}
                      onChange={(e) => setZoneFormData({...zoneFormData, gender: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      required
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={zoneFormData.age}
                      onChange={(e) => setZoneFormData({...zoneFormData, age: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      required
                      min="18"
                      max="100"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={zoneFormData.password}
                      onChange={(e) => setZoneFormData({...zoneFormData, password: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      required
                      minLength="6"
                    />
                    <p className="text-xs text-gray-500 mt-2">Minimum 6 characters</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowZoneModal(false)}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={zoneLoading}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {zoneLoading ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                    {zoneLoading ? 'Creating...' : 'Create Zone Admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Send Report Modal */}
      {showReportModal && (
        <RegionalReportForm
          user={user}
          onClose={() => setShowReportModal(false)}
          onSuccess={(report) => {
            fetchDashboardData();
            setShowReportModal(false);
          }}
          recipients={availableRecipients}
          fetchingRecipients={fetchingRecipients}
          federalInfo={federalInfo}
        />
      )}

      {/* Report Details Modal */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Header with Priority and Date */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                    selectedReport.priority === 'urgent' ? 'bg-red-100 text-red-800 animate-pulse' :
                    selectedReport.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    selectedReport.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedReport.priority.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                    #{selectedReport.report_number || 'RPT-2026-0001'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg flex items-center gap-2">
                    <FaCalendarAlt />
                    {new Date(selectedReport.sent_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => {
                      setShowReportDetailModal(false);
                      setSelectedReport(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <FaTimes className="text-xl text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Title and Subject */}
              <div className="mb-8 bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl">
                <h2 className="text-3xl font-bold text-gray-800">{selectedReport.title}</h2>
                {selectedReport.subject && (
                  <p className="text-gray-600 mt-2 text-lg">{selectedReport.subject}</p>
                )}
              </div>

              {/* Sender Info */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <FaUserCircle className="text-white text-xl" />
                  </div>
                  <span className="font-semibold text-lg text-gray-800">FROM:</span>
                </div>
                <div className="ml-14">
                  <p className="font-bold text-lg">{selectedReport.sender_full_name}</p>
                  <p className="text-sm text-gray-600">{selectedReport.sender_title}</p>
                  {selectedReport.sender_phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-2 mt-2">
                      <FaPhone className="text-blue-500" />
                      {selectedReport.sender_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Recipient Info */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-green-600 p-2 rounded-lg">
                    <FaUserCircle className="text-white text-xl" />
                  </div>
                  <span className="font-semibold text-lg text-gray-800">TO:</span>
                </div>
                <div className="ml-14">
                  <p className="font-bold text-lg">{selectedReport.recipient_full_name}</p>
                  <p className="text-sm text-gray-600">{selectedReport.recipient_title}</p>
                  {selectedReport.recipient_phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-2 mt-2">
                      <FaPhone className="text-green-500" />
                      {selectedReport.recipient_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Message Body */}
              <div className="bg-gray-50 p-8 rounded-xl mb-8 border-2 border-gray-100">
                <p className="text-gray-800 whitespace-pre-line leading-relaxed">{selectedReport.body}</p>
              </div>

              {/* Attachments */}
              {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                <div className="mb-8">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <FaPaperPlane className="text-green-600" />
                    Attachments
                  </h4>
                  <div className="space-y-3">
                    {selectedReport.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl hover:bg-gray-100 transition-colors border-2 border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-3 rounded-lg shadow-sm">
                            {getFileIcon(file.name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{file.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{file.size}</p>
                          </div>
                        </div>
                        <button className="p-3 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                          <FaDownload />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Timeline */}
              <div className="border-t-2 border-gray-100 pt-6">
                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <FaClock className="text-orange-500" />
                  Timeline
                </h4>
                <div className="space-y-3 bg-gray-50 p-6 rounded-xl">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-green-100 p-2 rounded-full">
                      <FaCheck className="text-green-600" />
                    </div>
                    <span className="text-gray-700 font-medium">Sent: {new Date(selectedReport.sent_at).toLocaleString()}</span>
                  </div>
                  {selectedReport.delivered_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="bg-green-100 p-2 rounded-full">
                        <FaCheck className="text-green-600" />
                      </div>
                      <span className="text-gray-700 font-medium">Delivered: {new Date(selectedReport.delivered_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedReport.opened_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="bg-purple-100 p-2 rounded-full">
                        <FaEnvelopeOpen className="text-purple-600" />
                      </div>
                      <span className="text-gray-700 font-medium">Opened: {new Date(selectedReport.opened_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedReport.replied_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="bg-indigo-100 p-2 rounded-full">
                        <FaReply className="text-indigo-600" />
                      </div>
                      <span className="text-gray-700 font-medium">Replied: {new Date(selectedReport.replied_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 mt-8 pt-6 border-t-2 border-gray-100">
                <button
                  onClick={() => {/* Handle reply */}}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
                >
                  <FaReply /> Reply
                </button>
                <button
                  onClick={() => {/* Handle close */}}
                  className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded-xl hover:from-gray-700 hover:to-gray-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
                >
                  <FaCheck /> Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionalDashboard;