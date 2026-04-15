import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  FaHome, FaHospital, FaBell, FaUserCircle, FaSignOutAlt,
  FaInbox, FaPaperPlane, FaUsers, FaChartBar,
  FaPlus, FaSearch, FaChevronLeft, FaChevronRight,
  FaClock, FaExclamationTriangle,
  FaEnvelope, FaEnvelopeOpen, FaTimes, FaCheck, FaSpinner,
  FaUserMd, FaUserNurse, FaFlask, FaXRay, FaBaby,
  FaBed, FaUserTie, FaCreditCard,
  FaCalendarAlt, FaPhone, FaEnvelope as FaEnvelopeIcon,
  FaHeartbeat, FaPills, FaHospitalAlt,
  FaChartLine, FaFileExport, FaCalendarWeek,
  FaStethoscope, FaProcedures, FaUserInjured, FaEdit, FaSave, FaKey, FaCamera,
  FaReply, FaEye, FaFileAlt, FaPaperclip, FaTrash, FaBell as FaBellIcon,
  FaRegClock, FaBuilding, FaGlobe, FaMapMarkerAlt,
  FaIdCard, FaUserPlus, FaHistory, FaSync, FaTools, FaWrench
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import ScheduleViewer from '../components/ScheduleViewer';

const BedManagementDashboard = ({ 
  user, 
  onLogout,
  selectionMode = false,
  onBedSelect,
  selectedBed,
  onClose
}) => {
  // ==================== STATE MANAGEMENT ====================
  const [activeTab, setActiveTab] = useState('beds');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [showScheduleView, setShowScheduleView] = useState(false);
  
  // ==================== BED MANAGEMENT STATES ====================
  const [selectedWard, setSelectedWard] = useState('OPD');
  const [beds, setBeds] = useState([]);
  const [wardStats, setWardStats] = useState([]);
  const [selectedBedObj, setSelectedBedObj] = useState(null);
  const [showBedModal, setShowBedModal] = useState(false);
  const [showAddBedModal, setShowAddBedModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newBed, setNewBed] = useState({
    number: '',
    type: 'general',
    notes: ''
  });

  // ==================== REPORT STATES ====================
  const [reportsInbox, setReportsInbox] = useState([]);
  const [reportsOutbox, setReportsOutbox] = useState([]);
  const [unreadReportsCount, setUnreadReportsCount] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState(null);
  const [showSendReportModal, setShowSendReportModal] = useState(false);
  const [hospitalAdmins, setHospitalAdmins] = useState([]);
  const [sendReportForm, setSendReportForm] = useState({
    recipient_type: 'hospital_admin',
    recipient_id: '',
    title: '',
    body: '',
    priority: 'medium',
    attachments: []
  });
  const [attachmentPreview, setAttachmentPreview] = useState([]);
  const fileInputRef = useRef(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  
  // ==================== PROFILE STATES ====================
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    age: '',
    phone: '',
    email: '',
    department: 'Bed Management'
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // ==================== STATS STATES ====================
  const [stats, setStats] = useState({
    totalBeds: 0,
    availableBeds: 0,
    occupiedBeds: 0,
    maintenanceBeds: 0
  });

  // ==================== SOCKET STATES ====================
  const socketRef = useRef(null);
  const [realTimeNotification, setRealTimeNotification] = useState(null);

  const navigate = useNavigate();
  const API_URL = 'http://localhost:5001';
  const SOCKET_URL = 'http://localhost:5001';
  const isSelectionMode = selectionMode;

  const wards = ['OPD', 'EME', 'ANC'];
  const bedTypes = ['general', 'private', 'semi-private', 'icu', 'isolation'];

  // ==================== HELPER FUNCTIONS ====================
  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-green-100 text-green-800 border-green-200',
      occupied: 'bg-red-100 text-red-800 border-red-200',
      maintenance: 'bg-gray-100 text-gray-800 border-gray-200',
      reserved: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[status] || colors.available;
  };

  const getStatusIcon = (status) => {
    const icons = {
      available: <FaCheck className="text-green-500" />,
      occupied: <FaUserCircle className="text-red-500" />,
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
      general: 'General Ward',
      private: 'Private Room',
      'semi-private': 'Semi-Private',
      icu: 'ICU',
      isolation: 'Isolation'
    };
    return types[type] || type;
  };

  const getBedTypeIcon = (type) => {
    const icons = {
      general: <FaBed className="text-blue-500" />,
      private: <FaUserTie className="text-purple-500" />,
      'semi-private': <FaUsers className="text-cyan-500" />,
      icu: <FaHeartbeat className="text-red-500" />,
      isolation: <FaExclamationTriangle className="text-orange-500" />
    };
    return icons[type] || <FaBed className="text-gray-500" />;
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-teal-100 text-teal-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800 animate-pulse'
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityIcon = (priority) => {
    const icons = { low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴' };
    return icons[priority] || '🟡';
  };

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    if (!user?.hospital_id || isSelectionMode) return;

    const token = localStorage.getItem('token');

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Bed Management socket connected');
      setConnectionStatus('connected');
      socketRef.current.emit('join_bed_management', user?.hospital_id);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket error:', error);
      setConnectionStatus('disconnected');
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnectionStatus('disconnected');
    });

    socketRef.current.on('bed_occupied', (data) => {
      fetchBeds();
      fetchWardStats();
      setRealTimeNotification({
        id: Date.now(),
        type: 'bed_occupied',
        title: 'Bed Occupied',
        message: `Bed ${data.bed_number} in ${data.ward} ward has been occupied`,
        priority: 'medium',
        timestamp: new Date()
      });
      setTimeout(() => setRealTimeNotification(null), 6000);
    });

    socketRef.current.on('bed_released', (data) => {
      fetchBeds();
      fetchWardStats();
      setRealTimeNotification({
        id: Date.now(),
        type: 'bed_released',
        title: 'Bed Released',
        message: `Bed ${data.bed_number} in ${data.ward} ward has been released`,
        priority: 'low',
        timestamp: new Date()
      });
      setTimeout(() => setRealTimeNotification(null), 6000);
    });

    socketRef.current.on('bed_status_updated', (data) => {
      fetchBeds();
      fetchWardStats();
      setRealTimeNotification({
        id: Date.now(),
        type: 'status_update',
        title: 'Bed Status Updated',
        message: `Bed ${data.bed_number} status changed to ${data.status}`,
        priority: 'medium',
        timestamp: new Date()
      });
      setTimeout(() => setRealTimeNotification(null), 6000);
    });

    socketRef.current.on('new_report_from_hospital', (data) => {
      setRealTimeNotification({
        id: Date.now(),
        type: 'report',
        title: 'New Report',
        message: `Hospital Admin sent: "${data.title}"`,
        priority: data.priority,
        timestamp: new Date()
      });
      fetchReportsInbox();
      setTimeout(() => setRealTimeNotification(null), 6000);
    });

    socketRef.current.on('report_reply_from_hospital', (data) => {
      setRealTimeNotification({
        id: Date.now(),
        type: 'reply',
        title: 'New Reply',
        message: `Hospital Admin replied to: "${data.title}"`,
        priority: data.priority,
        timestamp: new Date()
      });
      fetchReportsInbox();
      setTimeout(() => setRealTimeNotification(null), 6000);
    });

    // Listen for weekly schedule ready
    socketRef.current.on('weekly_schedule_ready', (data) => {
      console.log('📅 Weekly schedule ready event received:', data);
      setRealTimeNotification({
        id: Date.now(),
        type: 'weekly_schedule',
        title: 'Weekly Schedule Ready',
        message: `Your schedule for ${data.week_range} is ready. ${data.schedules_count} shifts, ${data.total_hours} hours.`,
        priority: 'high',
        timestamp: new Date()
      });
      
      if (showScheduleView) {
        const event = new CustomEvent('refreshSchedule');
        window.dispatchEvent(event);
      }
      
      setTimeout(() => setRealTimeNotification(null), 10000);
    });

    // Listen for new schedule assigned
    socketRef.current.on('new_schedule_assigned', (data) => {
      console.log('📅 New schedule assigned event:', data);
      setRealTimeNotification({
        id: Date.now(),
        type: 'schedule',
        title: 'New Schedule Assigned',
        message: `${data.shift} Shift on ${data.date} in ${data.ward} Ward`,
        priority: 'high',
        timestamp: new Date()
      });
      
      if (showScheduleView) {
        const event = new CustomEvent('refreshSchedule');
        window.dispatchEvent(event);
      }
      
      setTimeout(() => setRealTimeNotification(null), 8000);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user?.hospital_id, selectedWard, isSelectionMode]);

  // ==================== FETCH DATA ====================
  const fetchWardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!user?.hospital_id) return;
      
      const res = await axios.get(`${API_URL}/api/beds/stats/ward`, {
        params: { hospital_id: user?.hospital_id },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setWardStats(res.data.stats);
        const currentWardStats = res.data.stats.find(s => s.ward === selectedWard);
        if (currentWardStats) {
          setStats({
            totalBeds: currentWardStats.total,
            availableBeds: currentWardStats.available,
            occupiedBeds: currentWardStats.occupied,
            maintenanceBeds: currentWardStats.maintenance || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching ward stats:', error);
      setWardStats([
        { ward: 'OPD', total: 0, available: 0, occupied: 0, maintenance: 0, occupancyRate: 0 },
        { ward: 'EME', total: 0, available: 0, occupied: 0, maintenance: 0, occupancyRate: 0 },
        { ward: 'ANC', total: 0, available: 0, occupied: 0, maintenance: 0, occupancyRate: 0 }
      ]);
    }
  };

  const fetchBeds = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const res = await axios.get(`${API_URL}/api/beds/all`, {
        params: { 
          hospital_id: user?.hospital_id,
          ward: selectedWard
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setBeds(res.data.beds);
      } else {
        setBeds([]);
      }
    } catch (error) {
      console.error('Error fetching beds:', error);
      if (!isSelectionMode) {
        setMessage({ type: 'error', text: 'Error fetching beds' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
      setBeds([]);
    } finally {
      setLoading(false);
    }
  };

  // ==================== REPORT FUNCTIONS ====================
  const fetchReportsInbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/beds/reports/inbox`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setReportsInbox(res.data.reports);
        setUnreadReportsCount(res.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching reports inbox:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchReportsOutbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/beds/reports/outbox`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setReportsOutbox(res.data.reports);
      }
    } catch (error) {
      console.error('Error fetching reports outbox:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchHospitalAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/beds/hospital-admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHospitalAdmins(res.data.admins);
        if (res.data.admins.length === 1) {
          setSendReportForm(prev => ({ ...prev, recipient_id: res.data.admins[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching hospital admins:', error);
    }
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    if (!sendReportForm.recipient_id) {
      setMessage({ type: 'error', text: 'Please select a recipient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', sendReportForm.title);
      formData.append('subject', sendReportForm.title);
      formData.append('body', sendReportForm.body);
      formData.append('priority', sendReportForm.priority);
      formData.append('recipient_type', sendReportForm.recipient_type);
      formData.append('recipient_id', sendReportForm.recipient_id);
      sendReportForm.attachments.forEach((file) => formData.append('attachments', file));
      
      const res = await axios.post(`${API_URL}/api/beds/reports/send`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Report sent successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setShowSendReportModal(false);
        setSendReportForm({
          recipient_type: 'hospital_admin',
          recipient_id: '',
          title: '',
          body: '',
          priority: 'medium',
          attachments: []
        });
        setAttachmentPreview([]);
        fetchReportsOutbox();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error sending report' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const viewReportDetails = (report) => {
    setSelectedReport(report);
    setShowReportDetailModal(true);
    if (!report.is_opened) markReportAsRead(report.id);
  };

  const markReportAsRead = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/beds/reports/${reportId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReportsInbox();
    } catch (error) {
      console.error('Error marking report as read:', error);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() && !replyAttachment) {
      setMessage({ type: 'error', text: 'Please enter a reply message' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('body', replyText);
      if (replyAttachment) formData.append('attachment', replyAttachment);
      
      const res = await axios.post(`${API_URL}/api/beds/reports/${selectedReport.id}/reply`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Reply sent successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setShowReplyModal(false);
        setReplyText('');
        setReplyAttachment(null);
        fetchReportsInbox();
        fetchReportsOutbox();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error sending reply' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files);
    setSendReportForm(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
    const previews = files.map(file => ({ name: file.name, size: (file.size / 1024).toFixed(2) + ' KB' }));
    setAttachmentPreview(prev => [...prev, ...previews]);
  };

  const removeAttachment = (index) => {
    setSendReportForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
    setAttachmentPreview(prev => prev.filter((_, i) => i !== index));
  };

  // ==================== PROFILE FUNCTIONS ====================
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/beds/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const staff = res.data.staff;
        setProfileData({
          first_name: staff.first_name || '',
          middle_name: staff.middle_name || '',
          last_name: staff.last_name || '',
          gender: staff.gender || '',
          age: staff.age || '',
          phone: staff.phone || '',
          email: staff.email || '',
          department: staff.department || 'Bed Management'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/beds/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setIsEditingProfile(false);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error updating profile' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const changePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/beds/change-password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setShowPasswordModal(false);
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error changing password' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // ==================== BED OPERATIONS ====================
  const updateBedStatus = async (bedId, status, notes = '') => {
    const validStatuses = ['available', 'occupied', 'maintenance', 'reserved'];
    
    if (!validStatuses.includes(status)) {
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
        
        if (socketRef.current) {
          socketRef.current.emit('bed_status_updated', {
            bed_id: bedId,
            bed_number: selectedBedObj?.number,
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
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
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
        
        if (socketRef.current) {
          socketRef.current.emit('new_bed_added', {
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
    if (isSelectionMode && bed.status === 'available') {
      if (onBedSelect) {
        onBedSelect(bed.id);
      }
    } else if (!isSelectionMode) {
      setSelectedBedObj(bed);
      setShowBedModal(true);
    }
  };

  // ==================== UI HELPER FUNCTIONS ====================
  const RealTimeNotification = () => {
    if (!realTimeNotification) return null;
    const priorityColors = {
      low: 'border-teal-500 bg-teal-50',
      medium: 'border-yellow-500 bg-yellow-50',
      high: 'border-orange-500 bg-orange-50',
      urgent: 'border-red-500 bg-red-50 animate-pulse'
    };
    return (
      <motion.div
        initial={{ opacity: 0, x: 100, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.9 }}
        className={`fixed bottom-6 right-6 z-[10000] max-w-md bg-white rounded-2xl shadow-2xl border-l-4 ${priorityColors[realTimeNotification.priority] || 'border-teal-500'} overflow-hidden`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-teal-100">
                {realTimeNotification.type === 'reply' ? '💬' : 
                 realTimeNotification.type === 'bed_occupied' ? '🛏️' : 
                 realTimeNotification.type === 'bed_released' ? '🆓' : '📬'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-gray-900">{realTimeNotification.title}</p>
                <span className="text-xs text-gray-400 ml-2">{getPriorityIcon(realTimeNotification.priority)} {realTimeNotification.priority}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{realTimeNotification.message}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>🕒 {new Date(realTimeNotification.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
            <button onClick={() => setRealTimeNotification(null)} className="flex-shrink-0 text-gray-400 hover:text-gray-600">×</button>
          </div>
        </div>
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 6, ease: 'linear' }}
          className={`h-1 ${realTimeNotification.priority === 'urgent' ? 'bg-red-500' : 'bg-teal-500'}`}
        />
      </motion.div>
    );
  };

  const SocketStatusIndicator = () => {
    if (isSelectionMode) return null;
    const statusConfig = {
      connected: { color: 'bg-teal-500', text: 'Live', icon: '🟢' },
      connecting: { color: 'bg-yellow-500', text: 'Connecting...', icon: '🟡' },
      disconnected: { color: 'bg-red-500', text: 'Offline', icon: '🔴' }
    };
    const config = statusConfig[connectionStatus] || statusConfig.connecting;
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
        <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
        <span className="text-xs text-gray-600">{config.icon} {config.text}</span>
      </div>
    );
  };

  const handleLogout = () => {
    if (socketRef.current) socketRef.current.disconnect();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    navigate('/login');
  };

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    if (user?.hospital_id && !isSelectionMode) {
      fetchWardStats();
      fetchBeds();
      fetchReportsInbox();
      fetchReportsOutbox();
      fetchHospitalAdmins();
      fetchProfile();
      
      const interval = setInterval(() => {
        fetchWardStats();
        fetchBeds();
        fetchReportsInbox();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?.hospital_id, selectedWard, isSelectionMode]);

  // ==================== FILTERED BEDS ====================
  const filteredBeds = beds.filter(bed =>
    bed.number?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    bed.current_patient_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ==================== SELECTION MODE RENDER ====================
  if (isSelectionMode) {
    return (
      <div className="bg-white rounded-2xl shadow-xl w-full">
        <RealTimeNotification />
        
        <style>{`
          @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
          .animate-slide-in { animation: slideIn 0.3s ease-out; }
        `}</style>

        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <FaBed className="text-white text-lg" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Select Bed for Admission</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selectedWard} Ward - Click on an available bed to select it
                </p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">×</button>
        </div>

        <div className="mb-5 flex gap-2 flex-wrap">
          {wards.map(ward => {
            const stats = wardStats.find(s => s.ward === ward);
            return (
              <button key={ward} onClick={() => { setSelectedWard(ward); setSearchTerm(''); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedWard === ward ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {ward} {stats && `(${stats.available})`}
              </button>
            );
          })}
        </div>

        <div className="mb-5 relative">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
          <input type="text" placeholder="Search by bed number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
        </div>

        {loading ? (
          <div className="text-center py-12"><FaSpinner className="animate-spin text-3xl text-emerald-600 mx-auto mb-3" /><p className="text-gray-500">Loading beds...</p></div>
        ) : filteredBeds.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><FaBed className="text-5xl text-gray-300 mx-auto mb-3" /><p className="text-gray-500 text-sm">No beds found in {selectedWard} ward</p><button onClick={fetchBeds} className="mt-4 px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition shadow-md text-sm">Refresh</button></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-1">
              {filteredBeds.map(bed => {
                const isAvailable = bed.status === 'available';
                const isSelected = selectedBed === bed.id;
                return (
                  <div key={bed.id} onClick={() => handleBedClick(bed)} className={`border-2 rounded-xl p-4 transition-all duration-200 cursor-pointer ${isSelected ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200' : getStatusColor(bed.status)} ${isAvailable ? 'hover:shadow-lg hover:scale-[1.02]' : 'opacity-60 cursor-not-allowed'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">{getBedTypeIcon(bed.type)}<span className="font-bold text-lg text-gray-800">Bed {bed.number}</span></div>
                      <span className="text-xl">{getStatusIcon(bed.status)}</span>
                    </div>
                    <div className="text-xs font-medium text-gray-500 mb-2">{getBedTypeText(bed.type)}</div>
                    <div className="text-xs font-medium">
                      {bed.status === 'available' && <span className="text-green-600 flex items-center gap-1">✓ Available</span>}
                      {bed.status === 'occupied' && <span className="text-red-600 flex items-center gap-1">🛏️ Occupied</span>}
                      {bed.status === 'maintenance' && <span className="text-gray-600 flex items-center gap-1">🔧 Maintenance</span>}
                      {bed.status === 'reserved' && <span className="text-blue-600 flex items-center gap-1">📅 Reserved</span>}
                    </div>
                    {bed.notes && bed.status === 'available' && <div className="mt-2 text-xs text-gray-400 truncate">{bed.notes}</div>}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">{filteredBeds.filter(b => b.status === 'available').length} bed(s) available</div>
              <button onClick={fetchBeds} className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition inline-flex items-center gap-2" disabled={loading}><FaSync className={loading ? 'animate-spin' : ''} /> Refresh</button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ==================== FULL DASHBOARD MODE RENDER ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex">
      <RealTimeNotification />
      
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
        @keyframes glow { 0% { box-shadow: 0 0 5px rgba(16,185,129,0.2); } 50% { box-shadow: 0 0 20px rgba(16,185,129,0.5); } 100% { box-shadow: 0 0 5px rgba(16,185,129,0.2); } }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        .animate-glow { animation: glow 2s infinite; }
      `}</style>

      {/* ==================== SIDEBAR ==================== */}
      <div className={`bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      } shadow-2xl flex flex-col h-screen sticky top-0 z-50`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-lg">
                  <FaBed className="text-white text-sm" />
                </div>
                <span className="font-bold text-base tracking-tight">Bed Manager</span>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-lg mx-auto">
                <FaBed className="text-white text-sm" />
              </div>
            )}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>

          <nav className="space-y-1">
            {/* Bed Management */}
            <button onClick={() => { setActiveTab('beds'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'beds' && !showScheduleView ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaBed className="text-lg" />
              {!sidebarCollapsed && <span>Bed Management</span>}
            </button>

            {/* Ward Navigation */}
            <div className="ml-6 space-y-1 mt-2">
              {wards.map(ward => {
                const stats = wardStats.find(s => s.ward === ward);
                return (
                  <button
                    key={ward}
                    onClick={() => { setSelectedWard(ward); setActiveTab('beds'); setShowScheduleView(false); }}
                    className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-3 py-1.5 rounded-lg transition-all duration-200 text-xs ${
                      selectedWard === ward && activeTab === 'beds' ? 'bg-emerald-600/50' : 'hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FaHospital className="text-xs" />
                      {!sidebarCollapsed && <span>{ward}</span>}
                    </div>
                    {!sidebarCollapsed && stats && (
                      <div className="flex gap-1 text-xs">
                        <span className="bg-green-500 px-1 py-0.5 rounded text-[10px]">{stats.available}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            {/* Inbox */}
            <button onClick={() => { setActiveTab('inbox'); setShowScheduleView(false); fetchReportsInbox(); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm relative ${
              activeTab === 'inbox' && !showScheduleView ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaInbox className="text-lg" />
              {!sidebarCollapsed && <span>Inbox</span>}
              {unreadReportsCount > 0 && (
                <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {unreadReportsCount}
                </span>
              )}
            </button>

            {/* Sent Reports */}
            <button onClick={() => { setActiveTab('outbox'); setShowScheduleView(false); fetchReportsOutbox(); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'outbox' && !showScheduleView ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaPaperPlane className="text-lg" />
              {!sidebarCollapsed && <span>Sent Reports</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            {/* Add Bed Button */}
            <button
              onClick={() => setShowAddBedModal(true)}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg hover:shadow-xl"
            >
              <FaPlus className="text-lg" />
              {!sidebarCollapsed && <span>Add New Bed</span>}
            </button>

            {/* Statistics */}
            <button onClick={() => { setActiveTab('reports'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'reports' && !showScheduleView ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaChartBar className="text-lg" />
              {!sidebarCollapsed && <span>Statistics</span>}
            </button>

            {/* My Schedule */}
            <button 
              onClick={() => { setActiveTab('schedule'); setShowScheduleView(true); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
                showScheduleView ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg' : 'hover:bg-slate-700'
              }`}
            >
              <FaCalendarAlt className="text-lg" />
              {!sidebarCollapsed && <span>My Schedule</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            {/* Profile */}
            <button onClick={() => { setActiveTab('profile'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'profile' && !showScheduleView ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaUserCircle className="text-lg" />
              {!sidebarCollapsed && <span>Profile</span>}
            </button>
          </nav>

          {sidebarCollapsed && (
            <div className="mt-8 text-center">
              <div className="text-xl font-bold text-emerald-400">{stats.availableBeds}</div>
              <div className="text-[10px] text-slate-400">Available</div>
              {unreadReportsCount > 0 && (
                <div className="mt-3">
                  <div className="text-lg font-bold text-red-400">{unreadReportsCount}</div>
                  <div className="text-[10px] text-slate-400">Unread</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`${sidebarCollapsed ? 'py-4 px-0' : 'p-5'} border-t border-slate-700/50 mt-auto`}>
          <button onClick={handleLogout} className={`w-full ${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} bg-transparent border border-slate-600 rounded-xl text-red-400 cursor-pointer flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 text-sm transition-all duration-200 hover:bg-red-500/10 hover:border-red-500`}>
            <span className="text-lg">🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 py-6 px-8 shadow-xl sticky top-0 z-40">
          <div className="max-w-[1600px] mx-auto flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl shadow-lg animate-glow">
                  <FaBed className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white m-0 drop-shadow-md tracking-tight">
                    {activeTab === 'beds' && `Bed Management - ${selectedWard} Ward`}
                    {activeTab === 'inbox' && 'Reports - Inbox'}
                    {activeTab === 'outbox' && 'Reports - Sent'}
                    {activeTab === 'reports' && 'Bed Statistics'}
                    {activeTab === 'schedule' && 'My Work Schedule'}
                    {activeTab === 'profile' && 'My Profile'}
                  </h1>
                  <p className="text-base text-white/90 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{user?.full_name || 'Bed Manager'}</span>
                    <span className="text-white/50">•</span>
                    <span>{user?.hospital_name}</span>
                    <span className="bg-white/20 px-3 py-0.5 rounded-full text-xs font-medium backdrop-blur">Bed Management Department</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <SocketStatusIndicator />
              <button onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); }} className="bg-white/20 backdrop-blur px-4 py-2.5 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg text-sm font-medium">
                <FaPaperPlane className="text-sm" /> Send Report
              </button>
              <div className="flex gap-4 bg-white/10 backdrop-blur py-2 px-5 rounded-full">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.totalBeds}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Total</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-green-300">{stats.availableBeds}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Available</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-red-300">{stats.occupiedBeds}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Occupied</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1600px] mx-auto p-8">
          {/* Message Display */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-xl border-l-4 ${message.type === 'error' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-green-50 border-green-500 text-green-700'} flex justify-between items-center`}>
              <span>{message.text}</span>
              <button onClick={() => setMessage({ type: '', text: '' })} className="text-lg hover:opacity-70">×</button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">Total Beds</p>
              <p className="text-3xl font-bold">{stats.totalBeds}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">Available Beds</p>
              <p className="text-3xl font-bold">{stats.availableBeds}</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">Occupied Beds</p>
              <p className="text-3xl font-bold">{stats.occupiedBeds}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">Maintenance</p>
              <p className="text-3xl font-bold">{stats.maintenanceBeds}</p>
            </div>
          </div>

          {/* Beds Tab */}
          {activeTab === 'beds' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaBed className="text-emerald-500" /> {selectedWard} Ward - Bed Layout
              </h2>
              
              <div className="flex justify-between items-center mb-6">
                <div className="relative w-64">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    placeholder="Search beds..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
                  />
                </div>
                <button
                  onClick={() => { fetchBeds(); fetchWardStats(); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center gap-2 text-sm"
                >
                  <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12"><FaSpinner className="animate-spin text-3xl text-emerald-600 mx-auto mb-3" /><p className="text-gray-500">Loading beds...</p></div>
              ) : filteredBeds.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <FaBed className="text-5xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No beds found in {selectedWard} ward</p>
                  <button onClick={() => setShowAddBedModal(true)} className="mt-4 px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition shadow-md text-sm inline-flex items-center gap-2">
                    <FaPlus /> Add First Bed
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredBeds.map(bed => (
                    <div
                      key={bed.id}
                      onClick={() => handleBedClick(bed)}
                      className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${getStatusColor(bed.status)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getBedTypeIcon(bed.type)}
                          <span className="font-bold text-lg text-gray-800">Bed {bed.number}</span>
                        </div>
                        <span className="text-xl">{getStatusIcon(bed.status)}</span>
                      </div>
                      <div className="text-xs font-medium uppercase mb-1">{getStatusText(bed.status)}</div>
                      {bed.type && <div className="text-xs text-gray-500 mb-2">{getBedTypeText(bed.type)}</div>}
                      {bed.status === 'occupied' && bed.current_patient_name && (
                        <div className="text-xs mt-2 pt-2 border-t border-gray-200">
                          <div className="font-medium truncate flex items-center gap-1">
                            <FaUserCircle className="text-gray-400 text-xs" />
                            {bed.current_patient_name}
                          </div>
                        </div>
                      )}
                      {bed.notes && bed.status !== 'occupied' && <div className="text-xs text-gray-400 mt-1 truncate">{bed.notes}</div>}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Showing {filteredBeds.length} of {beds.length} beds • {filteredBeds.filter(b => b.status === 'available').length} available
                </div>
                <div className="flex gap-2">
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Available</span>
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Occupied</span>
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Reserved</span>
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full"><div className="w-2 h-2 bg-gray-500 rounded-full"></div> Maintenance</span>
                </div>
              </div>
            </div>
          )}

          {/* Inbox Tab */}
          {activeTab === 'inbox' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-800">📬 Inbox</h2>
                  {unreadReportsCount > 0 && <span className="px-3 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">{unreadReportsCount} unread</span>}
                </div>
                <button onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); }} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium">New Report</button>
              </div>
              {reportsLoading && reportsInbox.length === 0 ? (
                <div className="text-center py-12"><FaSpinner className="animate-spin text-3xl text-gray-400 mx-auto mb-3" /><p className="text-gray-500">Loading reports...</p></div>
              ) : reportsInbox.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><FaInbox className="text-5xl text-gray-300 mx-auto mb-3" /><p className="text-gray-500 text-sm">No reports in inbox</p></div>
              ) : (
                <div className="space-y-4">
                  {reportsInbox.map(report => (
                    <div key={report.id} className={`border rounded-xl p-5 cursor-pointer hover:shadow-md transition-all ${!report.is_opened ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`} onClick={() => viewReportDetails(report)}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          {!report.is_opened ? <FaEnvelope className="text-blue-500" /> : <FaEnvelopeOpen className="text-gray-400" />}
                          <h3 className="font-semibold text-gray-800">{report.title}</h3>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full ${getPriorityBadge(report.priority)}`}>{getPriorityIcon(report.priority)} {report.priority}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{report.body}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>From: {report.sender_full_name}</span>
                        <span>{new Date(report.sent_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Outbox Tab */}
          {activeTab === 'outbox' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">📤 Sent Reports</h2>
                <button onClick={() => fetchReportsOutbox()} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-medium">Refresh</button>
              </div>
              {reportsLoading && reportsOutbox.length === 0 ? (
                <div className="text-center py-12"><FaSpinner className="animate-spin text-3xl text-gray-400 mx-auto mb-3" /><p className="text-gray-500">Loading sent reports...</p></div>
              ) : reportsOutbox.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><FaPaperPlane className="text-5xl text-gray-300 mx-auto mb-3" /><p className="text-gray-500 text-sm">No sent reports</p></div>
              ) : (
                <div className="space-y-4">
                  {reportsOutbox.map(report => (
                    <div key={report.id} className="border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-md bg-white" onClick={() => viewReportDetails(report)}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3"><FaPaperPlane className="text-gray-400" /><h3 className="font-semibold text-gray-800">{report.title}</h3></div>
                        <span className={`text-xs px-3 py-1 rounded-full ${getPriorityBadge(report.priority)}`}>{getPriorityIcon(report.priority)} {report.priority}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{report.body}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>To: {report.recipient_full_name}</span>
                        <span>Sent: {new Date(report.sent_at).toLocaleString()}</span>
                      </div>
                      <div className="mt-3"><span className={`text-xs ${report.is_opened ? 'text-green-600' : 'text-gray-400'}`}>{report.is_opened ? '✓ Opened by recipient' : '✗ Not opened yet'}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'reports' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">📊 Bed Management Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Total Beds</p><p className="text-3xl font-bold">{stats.totalBeds}</p></div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Available Beds</p><p className="text-3xl font-bold">{stats.availableBeds}</p></div>
                <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Occupied Beds</p><p className="text-3xl font-bold">{stats.occupiedBeds}</p></div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Maintenance</p><p className="text-3xl font-bold">{stats.maintenanceBeds}</p></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
                {wardStats.map(stat => (
                  <div key={stat.ward} className="bg-gray-50 rounded-xl p-5">
                    <h3 className="font-semibold text-lg text-gray-800 mb-3">{stat.ward} Ward</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-gray-500">Total Beds:</span><span className="font-semibold">{stat.total}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Available:</span><span className="font-semibold text-green-600">{stat.available}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Occupied:</span><span className="font-semibold text-red-600">{stat.occupied}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Occupancy Rate:</span><span className="font-semibold">{stat.occupancyRate}%</span></div>
                    </div>
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stat.occupancyRate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Schedule View */}
          {showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <FaCalendarAlt className="text-white text-lg" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">My Work Schedule</h2>
                    <p className="text-sm text-gray-500">View your upcoming shifts and weekly schedule</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const event = new CustomEvent('refreshSchedule');
                    window.dispatchEvent(event);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-medium flex items-center gap-2"
                >
                  <FaSync className="text-sm" /> Refresh
                </button>
              </div>
              
              <ScheduleViewer user={user} compact={false} />
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-10">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                      <FaUserCircle className="text-emerald-600 text-6xl" />
                    </div>
                  </div>
                  <div className="text-white">
                    <h2 className="text-2xl font-bold mb-1">
                      {profileData.first_name} {profileData.middle_name ? profileData.middle_name + ' ' : ''}{profileData.last_name}
                    </h2>
                    <p className="text-emerald-100 flex items-center gap-2">
                      <FaBed className="text-sm" /> {profileData.department || 'Bed Management'} Staff
                    </p>
                    <p className="text-emerald-100 text-sm mt-1 opacity-80">{user?.hospital_name}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Professional Information</h3>
                  {!isEditingProfile ? (
                    <button onClick={() => setIsEditingProfile(true)} 
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-sm font-medium">
                      <FaEdit /> Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setIsEditingProfile(false)} 
                        className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                        Cancel
                      </button>
                      <button onClick={updateProfile} 
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition">
                        <FaSave /> Save
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Info Card */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="font-semibold text-emerald-600 mb-4 flex items-center gap-2">
                      <FaUserCircle /> Personal Info
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500">First Name</label>
                        {isEditingProfile ? (
                          <input type="text" value={profileData.first_name} 
                            onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} 
                            className="w-full px-3 py-2 border rounded-lg text-sm" />
                        ) : (
                          <p className="text-gray-800">{profileData.first_name || 'Not set'}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Middle Name</label>
                        {isEditingProfile ? (
                          <input type="text" value={profileData.middle_name} 
                            onChange={(e) => setProfileData({...profileData, middle_name: e.target.value})} 
                            className="w-full px-3 py-2 border rounded-lg text-sm" />
                        ) : (
                          <p className="text-gray-800">{profileData.middle_name || '—'}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Last Name</label>
                        {isEditingProfile ? (
                          <input type="text" value={profileData.last_name} 
                            onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} 
                            className="w-full px-3 py-2 border rounded-lg text-sm" />
                        ) : (
                          <p className="text-gray-800">{profileData.last_name || 'Not set'}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Gender</label>
                          {isEditingProfile ? (
                            <select value={profileData.gender} 
                              onChange={(e) => setProfileData({...profileData, gender: e.target.value})} 
                              className="w-full px-3 py-2 border rounded-lg text-sm">
                              <option value="">Select</option>
                              <option>Male</option>
                              <option>Female</option>
                              <option>Other</option>
                            </select>
                          ) : (
                            <p className="text-gray-800">{profileData.gender || 'Not set'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Age</label>
                          {isEditingProfile ? (
                            <input type="number" value={profileData.age} 
                              onChange={(e) => setProfileData({...profileData, age: e.target.value})} 
                              className="w-full px-3 py-2 border rounded-lg text-sm" />
                          ) : (
                            <p className="text-gray-800">{profileData.age ? `${profileData.age} years` : 'Not set'}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Phone</label>
                        {isEditingProfile ? (
                          <input type="tel" value={profileData.phone} 
                            onChange={(e) => setProfileData({...profileData, phone: e.target.value})} 
                            className="w-full px-3 py-2 border rounded-lg text-sm" />
                        ) : (
                          <p className="text-gray-800">{profileData.phone || 'Not set'}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Email</label>
                        <p className="text-gray-800">{profileData.email || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Account Settings Card */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="font-semibold text-emerald-600 mb-4 flex items-center gap-2">
                      <FaKey /> Account Settings
                    </h4>
                    <button onClick={() => setShowPasswordModal(true)} 
                      className="flex items-center gap-2 px-4 py-2 border border-emerald-600 text-emerald-600 rounded-xl hover:bg-emerald-50 transition text-sm font-medium w-full justify-center">
                      <FaKey /> Change Password
                    </button>
                    
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Account Info</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Role:</span>
                          <span className="text-gray-800 font-medium">Bed Management Staff</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Department:</span>
                          <span className="text-gray-800">{profileData.department || 'Bed Management'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Status:</span>
                          <span className="text-green-600">● Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bed Action Modal */}
      {showBedModal && selectedBedObj && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <FaBed className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Bed {selectedBedObj.number} - {selectedBedObj.ward}</h3>
                </div>
                <button onClick={() => setShowBedModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">×</button>
              </div>

              <div className="mb-5 p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-600">Current Status:</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBedObj.status)}`}>{getStatusText(selectedBedObj.status)}</span>
                </div>
                {selectedBedObj.type && (
                  <p className="text-sm text-gray-600 mt-2">
                    Bed Type: <span className="font-medium capitalize flex items-center gap-1 inline-flex">
                      {getBedTypeIcon(selectedBedObj.type)} {getBedTypeText(selectedBedObj.type)}
                    </span>
                  </p>
                )}
                {selectedBedObj.current_patient_name && (
                  <p className="text-sm text-gray-600 mt-2">Patient: <span className="font-medium">{selectedBedObj.current_patient_name}</span></p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {selectedBedObj.status !== 'available' && (
                  <button onClick={() => updateBedStatus(selectedBedObj.id, 'available', 'Made available')} disabled={loading} className="px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                    <FaCheck /> Mark Available
                  </button>
                )}
                {selectedBedObj.status !== 'reserved' && selectedBedObj.status === 'available' && (
                  <button onClick={() => updateBedStatus(selectedBedObj.id, 'reserved', 'Reserved for incoming patient')} disabled={loading} className="px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                    <FaCalendarAlt /> Mark Reserved
                  </button>
                )}
                {selectedBedObj.status !== 'maintenance' && selectedBedObj.status !== 'occupied' && (
                  <button onClick={() => updateBedStatus(selectedBedObj.id, 'maintenance', 'Under maintenance')} disabled={loading} className="px-4 py-2.5 bg-gray-500 text-white rounded-xl hover:bg-gray-600 flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                    <FaTools /> Maintenance
                  </button>
                )}
              </div>

              {selectedBedObj.status === 'occupied' && (
                <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
                  <p className="font-medium text-red-800 mb-2 flex items-center gap-2"><FaExclamationTriangle /> Occupied By:</p>
                  <p className="text-sm font-medium text-gray-800">{selectedBedObj.current_patient_name || 'Unknown Patient'}</p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button onClick={() => updateBedStatus(selectedBedObj.id, 'available', 'Patient discharged')} className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all">Discharge & Free Bed</button>
                    <button onClick={() => updateBedStatus(selectedBedObj.id, 'maintenance', 'Needs maintenance after discharge')} className="px-4 py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all">Mark Maintenance</button>
                  </div>
                </div>
              )}

              {selectedBedObj.notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 border border-gray-200">
                  <span className="font-medium">Notes:</span> {selectedBedObj.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Bed Modal */}
      {showAddBedModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <FaPlus className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Add New Bed to {selectedWard} Ward</h3>
                </div>
                <button onClick={() => setShowAddBedModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">×</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bed Number <span className="text-red-500">*</span></label>
                  <input type="text" value={newBed.number} onChange={(e) => setNewBed({ ...newBed, number: e.target.value })} placeholder="e.g., 101, A-12" className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bed Type</label>
                  <select value={newBed.type} onChange={(e) => setNewBed({ ...newBed, type: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition">
                    {bedTypes.map(type => (<option key={type} value={type}>{getBedTypeText(type)}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea value={newBed.notes} onChange={(e) => setNewBed({ ...newBed, notes: e.target.value })} rows="3" placeholder="Additional notes about this bed..." className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button onClick={() => setShowAddBedModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                <button onClick={addNewBed} disabled={loading || !newBed.number} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2">
                  {loading ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                  {loading ? 'Adding...' : 'Add Bed'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Report Modal */}
      {showSendReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaPaperPlane className="text-emerald-500" /> Send Report</h2>
                <button onClick={() => setShowSendReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full">×</button>
              </div>
              <form onSubmit={handleSendReport} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recipient *</label>
                  <select value={sendReportForm.recipient_id} onChange={(e) => setSendReportForm({...sendReportForm, recipient_id: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" required>
                    <option value="">Select Hospital Admin...</option>
                    {hospitalAdmins.map(admin => (<option key={admin.id} value={admin.id}>{admin.full_name} - {admin.hospital_name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select value={sendReportForm.priority} onChange={(e) => setSendReportForm({...sendReportForm, priority: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl">
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🟠 High</option>
                    <option value="urgent">🔴 Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input type="text" value={sendReportForm.title} onChange={(e) => setSendReportForm({...sendReportForm, title: e.target.value})} placeholder="e.g., Bed Status Report" className="w-full p-3 border border-gray-300 rounded-xl" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea value={sendReportForm.body} onChange={(e) => setSendReportForm({...sendReportForm, body: e.target.value})} rows="5" placeholder="Enter report details..." className="w-full p-3 border border-gray-300 rounded-xl resize-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                  <input type="file" ref={fileInputRef} onChange={handleAttachmentChange} multiple accept="image/*,.pdf,.doc,.docx" className="w-full p-2 border border-gray-300 rounded-xl" />
                </div>
                {attachmentPreview.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Attachments:</p>
                    {attachmentPreview.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded">
                        <span>{file.name} ({file.size})</span>
                        <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:text-red-700">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowSendReportModal(false)} className="px-5 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                  <button type="submit" disabled={loading} className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2">
                    {loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                    {loading ? 'Sending...' : 'Send Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  {!selectedReport.is_opened ? <FaEnvelope className="text-blue-500" /> : <FaEnvelopeOpen className="text-gray-400" />}
                  <h2 className="text-xl font-bold text-gray-800">{selectedReport.title}</h2>
                </div>
                <button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className="p-2 hover:bg-gray-100 rounded-full">×</button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div><p className="text-sm text-gray-500">From</p><p className="font-semibold text-gray-800">{selectedReport.sender_full_name}</p></div>
                  <div className="text-right"><p className="text-sm text-gray-500">Priority</p><span className={`px-3 py-1 rounded-full text-xs ${getPriorityBadge(selectedReport.priority)}`}>{getPriorityIcon(selectedReport.priority)} {selectedReport.priority}</span></div>
                </div>
                <div><p className="text-sm text-gray-500">Date Received</p><p className="text-sm text-gray-700">{new Date(selectedReport.sent_at).toLocaleString()}</p></div>
                <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500 mb-2">Message</p><p className="whitespace-pre-wrap text-gray-800">{selectedReport.body}</p></div>
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button onClick={() => { setShowReportDetailModal(false); setShowReplyModal(true); }} className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2"><FaReply /> Reply</button>
                  <button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaReply className="text-emerald-500" /> Reply to Report</h2>
                <button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className="p-2 hover:bg-gray-100 rounded-full">×</button>
              </div>
              <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Original Report</p>
                <p className="text-sm font-medium text-gray-800">{selectedReport.title}</p>
                <p className="text-xs text-gray-400 mt-1">From: {selectedReport.sender_full_name}</p>
              </div>
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows="5" placeholder="Type your reply here..." className="w-full p-3 border border-gray-300 rounded-xl resize-none" />
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Optional)</label>
                <input type="file" onChange={(e) => setReplyAttachment(e.target.files[0])} accept="image/*,.pdf,.doc,.docx" className="w-full p-2 border border-gray-300 rounded-xl" />
              </div>
              <div className="flex gap-3 pt-4 mt-2">
                <button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                <button onClick={handleSendReply} disabled={loading} className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                  {loading ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
                <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-full">×</button>
              </div>
              <div className="space-y-4">
                <input type="password" placeholder="Current Password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
                <input type="password" placeholder="New Password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
                <input type="password" placeholder="Confirm New Password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={changePassword} className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition">Change Password</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedManagementDashboard;