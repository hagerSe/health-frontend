import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import KebeleReportForm from './KebeleReportForm';
import axios from 'axios';
import { 
  FaHome, FaTree, FaFileAlt, FaBell, FaUserCircle, FaSignOutAlt,
  FaInbox, FaPaperPlane, FaArchive, FaUsers, FaChartBar,
  FaPlus, FaSearch, FaFilter, FaChevronLeft, FaChevronRight,
  FaEye, FaReply, FaTrash, FaEdit, FaClock, FaExclamationTriangle,
  FaEnvelope, FaEnvelopeOpen, FaDownload, FaTimes, FaCheck, FaSpinner,
  FaBuilding, FaGlobe, FaCity, FaCalendarAlt, FaHospital,
  FaPhone, FaEnvelope as FaEnvelopeIcon
} from 'react-icons/fa';

const KebeleDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hospitalLoading, setHospitalLoading] = useState(false);

  const [hospitalFormData, setHospitalFormData] = useState({
    hospital_name: '',
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

  // For kebele admin, only show Woreda and Hospital levels
  const recipientLevels = [
    'woreda',     // Their specific woreda admin who created them
    'hospital'    // Hospitals under this kebele
  ];

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [activeTab, currentPage, searchTerm]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      console.log("📊 Fetching kebele dashboard data...");
      
      if (!token) {
        setError('Authentication token not found. Please login again.');
        return;
      }

      const [statsRes, inboxRes, outboxRes, hospitalsRes, notifRes] = await Promise.all([
        axios.get('http://localhost:5001/api/kebele/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error("❌ Stats endpoint failed:", err.response?.data || err.message);
          throw err;
        }),
        
        axios.get(`http://localhost:5001/api/kebele/reports/inbox?page=${currentPage}&search=${searchTerm}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error("❌ Inbox endpoint failed:", err.response?.data || err.message);
          throw err;
        }),
        
        axios.get(`http://localhost:5001/api/kebele/reports/outbox?page=${currentPage}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error("❌ Outbox endpoint failed:", err.response?.data || err.message);
          throw err;
        }),
        
        axios.get('http://localhost:5001/api/kebele/hospitals', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error("❌ Hospitals endpoint failed:", err.response?.data || err.message);
          throw err;
        }),
        
        axios.get('http://localhost:5001/api/kebele/notifications?limit=5', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error("❌ Notifications endpoint failed:", err.response?.data || err.message);
          throw err;
        })
      ]);

      console.log("✅ All data fetched successfully");

      if (statsRes.data.success) setStats(statsRes.data.stats);
      
      if (inboxRes.data.success) {
        setInbox(inboxRes.data.reports || []);
        setTotalPages(inboxRes.data.totalPages || 1);
        setUnreadCount(inboxRes.data.unreadCount || 0);
        setUrgentCount(inboxRes.data.urgentUnreadCount || 0);
      }
      
      if (outboxRes.data.success) setOutbox(outboxRes.data.reports || []);
      if (hospitalsRes.data.success) setHospitals(hospitalsRes.data.hospitals || []);
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

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5001/api/kebele/notifications?unreadOnly=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setUnreadCount(res.data.unreadCount);
        setUrgentCount(res.data.urgentUnreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleCreateHospital = async (e) => {
    e.preventDefault();
    setHospitalLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5001/api/kebele/hospitals',
        hospitalFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setHospitalFormData({
          hospital_name: '',
          first_name: '',
          middle_name: '',
          last_name: '',
          gender: 'Male',
          age: '',
          email: '',
          password: '',
          phone: ''
        });
        
        setShowHospitalModal(false);
        fetchDashboardData();
        alert('Hospital admin created successfully!');
      }
    } catch (error) {
      console.error('Error creating hospital:', error);
      alert(error.response?.data?.message || 'Error creating hospital admin');
    } finally {
      setHospitalLoading(false);
    }
  };

  const markNotificationAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5001/api/kebele/notifications/${id}/read`, {}, {
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
      await axios.put('http://localhost:5001/api/kebele/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    navigate('/login');
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'sent': return <FaPaperPlane className="text-blue-500" />;
      case 'delivered': return <FaEnvelope className="text-green-500" />;
      case 'opened': return <FaEnvelopeOpen className="text-purple-500" />;
      case 'replied': return <FaReply className="text-indigo-500" />;
      case 'closed': return <FaCheck className="text-gray-500" />;
      default: return <FaClock className="text-gray-400" />;
    }
  };

  const viewReportDetails = (report) => {
    setSelectedReport(report);
    setShowReportDetailModal(true);
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800 animate-pulse'
    };
    return colors[priority] || colors.medium;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Kebele Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className={`bg-gradient-to-b from-green-900 to-green-800 text-white transition-all duration-300 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <FaTree className="text-2xl" />
                <span className="font-bold text-lg">Kebele Admin</span>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-green-700 rounded-lg transition-colors"
            >
              {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'dashboard' ? 'bg-green-700' : 'hover:bg-green-700'
              }`}
            >
              <FaHome className="text-xl" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </button>

            <button
              onClick={() => setActiveTab('hospitals')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'hospitals' ? 'bg-green-700' : 'hover:bg-green-700'
              }`}
            >
              <FaHospital className="text-xl" />
              {!sidebarCollapsed && <span>Hospitals</span>}
            </button>

            <button
              onClick={() => setActiveTab('inbox')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors relative ${
                activeTab === 'inbox' ? 'bg-green-700' : 'hover:bg-green-700'
              }`}
            >
              <FaInbox className="text-xl" />
              {!sidebarCollapsed && <span>Inbox</span>}
              {unreadCount > 0 && (
                <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('outbox')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'outbox' ? 'bg-green-700' : 'hover:bg-green-700'
              }`}
            >
              <FaPaperPlane className="text-xl" />
              {!sidebarCollapsed && <span>Outbox</span>}
            </button>

            <button
              onClick={() => setActiveTab('archive')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'archive' ? 'bg-green-700' : 'hover:bg-green-700'
              }`}
            >
              <FaArchive className="text-xl" />
              {!sidebarCollapsed && <span>Archive</span>}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'profile' ? 'bg-green-700' : 'hover:bg-green-700'
              }`}
            >
              <FaUserCircle className="text-xl" />
              {!sidebarCollapsed && <span>Profile</span>}
            </button>
          </nav>

          {!sidebarCollapsed && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-green-700 rounded-lg p-3">
                <p className="text-xs text-green-200">Kebele</p>
                <p className="font-semibold truncate">{user?.kebele_name || 'Kebele'}</p>
                <p className="text-xs text-green-200 mt-1">Woreda: {user?.woreda_name}</p>
                <p className="text-xs text-green-200 mt-1">Woreda ID: {user?.woreda_id}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-lg sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {activeTab === 'dashboard' && 'Kebele Dashboard'}
                  {activeTab === 'hospitals' && 'Hospital Administration'}
                  {activeTab === 'inbox' && 'Inbox'}
                  {activeTab === 'outbox' && 'Sent Reports'}
                  {activeTab === 'archive' && 'Archive'}
                  {activeTab === 'profile' && 'My Profile'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Welcome, {user?.full_name} | {user?.kebele_name} Kebele
                </p>
              </div>

              <div className="flex items-center space-x-4">
                {/* Notification Bell */}
                <button
                  onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                  className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FaBell className="text-xl text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
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
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-red-500 mr-3 text-xl" />
              <div>
                <p className="font-bold">Error Loading Dashboard</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
            <button 
              onClick={fetchDashboardData}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Notification Panel */}
        {showNotificationPanel && (
          <div className="absolute right-6 top-20 w-96 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Notifications</h3>
              <button
                onClick={markAllAsRead}
                className="text-sm text-green-600 hover:text-green-800"
              >
                Mark all as read
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      !notif.is_read ? 'bg-green-50' : ''
                    } ${notif.priority === 'urgent' ? 'border-l-4 border-red-500' : ''}`}
                    onClick={() => markNotificationAsRead(notif.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${
                        notif.priority === 'urgent' ? 'text-red-500 animate-pulse' :
                        notif.type === 'report_sent' ? 'text-green-500' :
                        notif.type === 'reply_received' ? 'text-blue-500' :
                        'text-gray-500'
                      }`}>
                        {notif.type === 'report_sent' && <FaPaperPlane />}
                        {notif.type === 'report_opened' && <FaEnvelopeOpen />}
                        {notif.type === 'reply_received' && <FaReply />}
                        {notif.type === 'urgent_alert' && <FaExclamationTriangle />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-400">
                            {new Date(notif.createdAt).toLocaleString()}
                          </span>
                          {notif.priority === 'urgent' && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                              URGENT
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <FaBell className="text-4xl mx-auto mb-3 text-gray-300" />
                  <p>No notifications</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && !error && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Inbox</p>
                      <p className="text-3xl font-bold text-green-600">{stats?.inbox || 0}</p>
                    </div>
                    <FaInbox className="text-4xl text-green-200" />
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-yellow-600">{stats?.unread || 0} unread</span>
                    <span className="text-red-600">{stats?.urgentUnread || 0} urgent</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Outbox</p>
                      <p className="text-3xl font-bold text-green-600">{stats?.outbox || 0}</p>
                    </div>
                    <FaPaperPlane className="text-4xl text-green-200" />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    {stats?.drafts || 0} drafts
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Hospitals</p>
                      <p className="text-3xl font-bold text-blue-600">{hospitals.length}</p>
                    </div>
                    <FaHospital className="text-4xl text-blue-200" />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Under your administration
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Archive</p>
                      <p className="text-3xl font-bold text-gray-600">{stats?.closed || 0}</p>
                    </div>
                    <FaArchive className="text-4xl text-gray-200" />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105"
                  >
                    <FaPlus className="text-3xl mx-auto mb-2" />
                    <h3 className="font-semibold">New Report</h3>
                  </button>

                  <button
                    onClick={() => setShowHospitalModal(true)}
                    className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105"
                  >
                    <FaHospital className="text-3xl mx-auto mb-2" />
                    <h3 className="font-semibold">Add Hospital</h3>
                  </button>

                  <button
                    onClick={() => setActiveTab('inbox')}
                    className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105"
                  >
                    <FaInbox className="text-3xl mx-auto mb-2" />
                    <h3 className="font-semibold">View Inbox</h3>
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Inbox */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Recent Reports</h3>
                  {inbox.length > 0 ? (
                    inbox.slice(0, 5).map((report) => (
                      <div
                        key={report.id}
                        className="bg-gray-50 p-4 rounded-lg mb-3 hover:bg-gray-100 cursor-pointer"
                        onClick={() => viewReportDetails(report)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(report.status)}
                            <span className="font-medium">{report.title}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(report.priority)}`}>
                            {report.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">From: {report.sender_full_name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(report.sent_at).toLocaleString()}
                        </p>
                        {!report.is_opened && (
                          <span className="mt-2 inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No reports in inbox</p>
                  )}
                </div>

                {/* Recent Hospitals */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Your Hospitals</h3>
                  {hospitals.length > 0 ? (
                    hospitals.slice(0, 5).map((hospital) => (
                      <div key={hospital.id} className="bg-gray-50 p-4 rounded-lg mb-3">
                        <div className="flex items-center gap-3">
                          <FaHospital className="text-green-500" />
                          <div>
                            <p className="font-medium">{hospital.name}</p>
                            <p className="text-sm text-gray-500">Admin: {hospital.admin_name}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No hospitals created yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Hospitals Tab */}
          {activeTab === 'hospitals' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Hospital Administration</h2>
                <div className="flex gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search hospitals..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                  </div>
                  <button
                    onClick={() => setShowHospitalModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <FaPlus /> Add Hospital
                  </button>
                </div>
              </div>

              {hospitals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hospitals.map((hospital) => (
                    <div key={hospital.id} className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-lg p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <FaHospital className="text-green-600 text-xl" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{hospital.name}</h3>
                          <p className="text-sm text-gray-500">{hospital.code}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <p><span className="font-medium">Admin:</span> {hospital.admin_name}</p>
                        <p><span className="font-medium">Email:</span> {hospital.admin_email}</p>
                        {hospital.admin_phone && (
                          <p><span className="font-medium">Phone:</span> {hospital.admin_phone}</p>
                        )}
                        <p><span className="font-medium">Status:</span> 
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                            hospital.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {hospital.status}
                          </span>
                        </p>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <FaEye />
                        </button>
                        <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                          <FaEdit />
                        </button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaHospital className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hospitals found</p>
                  <button
                    onClick={() => setShowHospitalModal(true)}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Add Your First Hospital
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Inbox Tab */}
          {activeTab === 'inbox' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Inbox</h2>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <FaPlus /> New Report
                </button>
              </div>

              {inbox.length > 0 ? (
                <div className="space-y-4">
                  {inbox.map((report) => (
                    <div
                      key={report.id}
                      className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
                        !report.is_opened ? 'bg-green-50 border-green-200' : ''
                      } ${report.priority === 'urgent' ? 'border-l-4 border-l-red-500' : ''}`}
                      onClick={() => viewReportDetails(report)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(report.status)}
                            <h3 className="font-semibold text-lg">{report.title}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(report.priority)}`}>
                              {report.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            From: {report.sender_full_name} ({report.sender_title})
                          </p>
                          <p className="text-sm text-gray-700 line-clamp-2">{report.body}</p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <FaCalendarAlt />
                              {new Date(report.sent_at).toLocaleString()}
                            </span>
                            {report.attachments?.length > 0 && (
                              <span className="flex items-center gap-1">
                                <FaPaperPlane />
                                {report.attachments.length} attachment(s)
                              </span>
                            )}
                          </div>
                        </div>
                        {!report.is_opened && (
                          <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaInbox className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No reports in inbox</p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center space-x-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Add Hospital Modal */}
      {showHospitalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Add Hospital Admin</h2>
                <button
                  onClick={() => setShowHospitalModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleCreateHospital} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hospital Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={hospitalFormData.hospital_name}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, hospital_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                      placeholder="e.g., General Hospital, Health Center"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={hospitalFormData.first_name}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, first_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={hospitalFormData.middle_name}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, middle_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={hospitalFormData.last_name}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, last_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={hospitalFormData.email}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={hospitalFormData.phone}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={hospitalFormData.gender}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, gender: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={hospitalFormData.age}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, age: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                      min="18"
                      max="100"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={hospitalFormData.password}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                      minLength="6"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowHospitalModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={hospitalLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {hospitalLoading ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                    {hospitalLoading ? 'Creating...' : 'Create Hospital Admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Send Report Modal - Using KebeleReportForm Component */}
      {showReportModal && (
        <KebeleReportForm
          user={user}
          onClose={() => setShowReportModal(false)}
          onSuccess={(report) => {
            fetchDashboardData();
          }}
        />
      )}

      {/* Report Details Modal */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Report Details</h2>
                <button
                  onClick={() => {
                    setShowReportDetailModal(false);
                    setSelectedReport(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-sm ${getPriorityBadge(selectedReport.priority)}`}>
                    {selectedReport.priority.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(selectedReport.sent_at).toLocaleString()}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">{selectedReport.title}</h3>
                  {selectedReport.subject && (
                    <p className="text-sm text-gray-600 mt-1">{selectedReport.subject}</p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{selectedReport.body}</p>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">From:</span> {selectedReport.sender_full_name} ({selectedReport.sender_title})
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">To:</span> {selectedReport.recipient_full_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Status:</span> {selectedReport.status}
                  </p>
                </div>

                {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Attachments</h4>
                    <div className="space-y-2">
                      {selectedReport.attachments.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                          <FaFileAlt className="text-gray-400" />
                          <span>{file.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KebeleDashboard;