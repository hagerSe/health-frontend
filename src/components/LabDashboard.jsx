import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaFlask, FaMicroscope, FaClock, FaCalendarAlt, FaSync, FaPlus, 
  FaEdit, FaTrash, FaHospitalUser, FaUserMd, FaChartLine, FaVial,
  FaFileAlt, FaUserCheck, FaUserClock, FaBell, FaSearch, FaEye, 
  FaCheck, FaTimes, FaExclamationTriangle, FaSpinner, FaUserCircle,
  FaSignOutAlt, FaChevronLeft, FaChevronRight, FaUsers, FaBuilding,
  FaInbox, FaPaperPlane, FaEnvelope, FaEnvelopeOpen, FaReply, FaKey,
  FaEdit as FaEditIcon, FaSave, FaIdCard
} from 'react-icons/fa';
import ScheduleViewer from '../components/ScheduleViewer';

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
  const [realTimeNotification, setRealTimeNotification] = useState(null);
  const [showScheduleView, setShowScheduleView] = useState(false);
  
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
    department: 'Lab'
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const API_URL = 'http://localhost:5001';
  const SOCKET_URL = 'http://localhost:5001';
  const socket = useRef(null);
  const navigate = useNavigate();

  // ==================== WARD CONFIGURATION ====================
  const wards = [
    { id: 'all', name: 'All Wards', color: '#64748b', icon: '🏥', bgClass: 'bg-gray-100', textClass: 'text-gray-700' },
    { id: 'OPD', name: 'OPD', color: '#10b981', icon: '🏥', bgClass: 'bg-green-100', textClass: 'text-green-700' },
    { id: 'EME', name: 'Emergency', color: '#ef4444', icon: '🚨', bgClass: 'bg-red-100', textClass: 'text-red-700' },
    { id: 'ANC', name: 'Antenatal', color: '#8b5cf6', icon: '🤰', bgClass: 'bg-purple-100', textClass: 'text-purple-700' }
  ];

  // ==================== NORMAL RANGES ====================
  const normalRanges = {
    'CBC': {
      parameters: [
        { name: 'WBC', unit: '×10³/µL', normal: '4.0-11.0' },
        { name: 'RBC', unit: '×10⁶/µL', normal: '4.5-5.9' },
        { name: 'Hemoglobin', unit: 'g/dL', normal: '13.5-17.5' },
        { name: 'Hematocrit', unit: '%', normal: '40-54' },
        { name: 'Platelets', unit: '×10³/µL', normal: '150-450' }
      ]
    },
    'Blood Chemistry': {
      parameters: [
        { name: 'Glucose', unit: 'mg/dL', normal: '70-110' },
        { name: 'Creatinine', unit: 'mg/dL', normal: '0.7-1.3' },
        { name: 'BUN', unit: 'mg/dL', normal: '7-20' },
        { name: 'Sodium', unit: 'mEq/L', normal: '135-145' },
        { name: 'Potassium', unit: 'mEq/L', normal: '3.5-5.0' }
      ]
    },
    'Malaria Test': {
      parameters: [
        { name: 'Result', unit: '', normal: 'Negative' },
        { name: 'Species', unit: '', normal: 'N/A' }
      ]
    },
    'Blood Sugar': {
      parameters: [
        { name: 'Fasting Blood Sugar', unit: 'mg/dL', normal: '70-100' },
        { name: 'Random Blood Sugar', unit: 'mg/dL', normal: '70-140' }
      ]
    }
  };

  // ==================== HELPER FUNCTIONS ====================
  const formatFullName = (staffMember) => {
    if (!staffMember) return 'Unknown';
    const firstName = staffMember.first_name || '';
    const middleName = staffMember.middle_name ? ` ${staffMember.middle_name}` : '';
    const lastName = staffMember.last_name || '';
    return `${firstName}${middleName} ${lastName}`.trim();
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

  // ==================== REPORT FUNCTIONS ====================
  const fetchReportsInbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/lab/reports/inbox`, {
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
      const res = await axios.get(`${API_URL}/api/lab/reports/outbox`, {
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
      const res = await axios.get(`${API_URL}/api/lab/hospital-admins`, {
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
      
      const res = await axios.post(`${API_URL}/api/lab/reports/send`, formData, {
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
      await axios.put(`${API_URL}/api/lab/reports/${reportId}/read`, {}, {
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
      
      const res = await axios.post(`${API_URL}/api/lab/reports/${selectedReport.id}/reply`, formData, {
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

  // ==================== PROFILE FUNCTIONS ====================
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/lab/profile`, {
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
          department: staff.department || 'Lab'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/lab/profile`, profileData, {
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
      const res = await axios.put(`${API_URL}/api/lab/change-password`, {
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

  // ==================== LAB RESULT FUNCTIONS ====================
  const handleStartProcessing = async (requestId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/lab/start/${requestId}`,
        { technician_id: user?.id, technician_name: formatFullName(user) },
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

  const handleCollectSample = async (requestId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/lab/collect/${requestId}`,
        { technician_id: user?.id, technician_name: formatFullName(user) },
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

  const checkCriticalValues = (testName, results) => {
    let hasCritical = false;
    const criticalValues = [];

    const criticalThresholds = {
      'Hemoglobin': { min: 7.0, max: 20.0 },
      'Platelets': { min: 50, max: 1000 },
      'Glucose': { min: 40, max: 500 },
      'Potassium': { min: 2.5, max: 6.5 }
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

  const handleSubmitResults = async () => {
    if (!selectedRequest) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const criticalResults = checkCriticalValues(selectedRequest.testName, resultData);
      
      const res = await axios.post(
        `${API_URL}/api/lab/results/${selectedRequest.id}`,
        {
          results: resultData,
          recommendations: recommendations,
          critical: criticalResults.hasCritical,
          critical_values: criticalResults.criticalValues,
          technician_id: user?.id,
          technician_name: formatFullName(user)
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
      setMessage({ type: 'error', text: '❌ Error submitting results' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleResultChange = (parameter, value) => {
    setResultData({ ...resultData, [parameter]: value });
  };

  // ==================== SOCKET CONNECTION ====================
  const initializeSocket = () => {
    const token = localStorage.getItem('token');
    
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

    socket.current.on('new_lab_request', (data) => {
      setRealTimeNotification({
        id: Date.now(),
        type: 'lab_request',
        title: 'New Lab Request',
        message: `${data.test_name} for ${data.patient_name} (${data.priority} priority)`,
        priority: data.priority === 'stat' ? 'urgent' : 'medium',
        timestamp: new Date()
      });
      fetchLabRequests();
      fetchStats();
      setTimeout(() => setRealTimeNotification(null), 6000);
    });

    socket.current.on('report_reply_from_hospital', (data) => {
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

    socket.current.on('weekly_schedule_ready', (data) => {
      if (showScheduleView) {
        setRealTimeNotification({
          id: Date.now(),
          type: 'weekly_schedule',
          title: 'Weekly Schedule Ready',
          message: `Your schedule for ${data.week_range} is ready.`,
          priority: 'high',
          timestamp: new Date()
        });
        const event = new CustomEvent('refreshSchedule');
        window.dispatchEvent(event);
        setTimeout(() => setRealTimeNotification(null), 10000);
      }
    });
  };

  // ==================== UI HELPER FUNCTIONS ====================
  const getPriorityColor = (priority) => {
    const colors = {
      'stat': { bg: 'bg-red-100', color: 'text-red-800', text: 'STAT', icon: '🔴' },
      'urgent': { bg: 'bg-orange-100', color: 'text-orange-800', text: 'Urgent', icon: '🟠' },
      'routine': { bg: 'bg-green-100', color: 'text-green-800', text: 'Routine', icon: '🟢' }
    };
    return colors[priority] || colors.routine;
  };

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
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-blue-100">
                {realTimeNotification.type === 'reply' ? '💬' : realTimeNotification.type === 'lab_request' ? '🔬' : '📬'}
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
          className={`h-1 ${realTimeNotification.priority === 'urgent' ? 'bg-red-500' : 'bg-blue-500'}`}
        />
      </motion.div>
    );
  };

  const SocketStatusIndicator = () => {
    const statusConfig = {
      connected: { color: 'bg-green-500', text: 'Live', icon: '🟢' },
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
    if (socket.current) socket.current.disconnect();
    if (onLogout) onLogout();
    navigate('/login');
  };

  const getFilteredRequests = () => {
    let filtered = labRequests;
    
    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.testName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
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

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    if (!user?.hospital_id) return;

    initializeSocket();
    fetchLabRequests();
    fetchStats();
    fetchReportsInbox();
    fetchReportsOutbox();
    fetchHospitalAdmins();
    fetchProfile();

    const interval = setInterval(() => {
      fetchLabRequests();
      fetchStats();
      fetchReportsInbox();
    }, 30000);

    return () => {
      if (socket.current) socket.current.disconnect();
      clearInterval(interval);
    };
  }, [user?.hospital_id, selectedWard]);

  const filteredRequests = getFilteredRequests();
  const currentWard = wards.find(w => w.id === selectedWard) || wards[0];

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex">
      <RealTimeNotification />
      
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes glow { 0% { box-shadow: 0 0 5px rgba(59,130,246,0.2); } 50% { box-shadow: 0 0 20px rgba(59,130,246,0.5); } 100% { box-shadow: 0 0 5px rgba(59,130,246,0.2); } }
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
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
                  <FaMicroscope className="text-white text-sm" />
                </div>
                <span className="font-bold text-base tracking-tight">Laboratory</span>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg mx-auto">
                <FaMicroscope className="text-white text-sm" />
              </div>
            )}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>

          <nav className="space-y-1">
            <button onClick={() => { setActiveTab('pending'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'pending' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaClock className="text-lg" />
              {!sidebarCollapsed && <span>Pending Requests</span>}
              {!sidebarCollapsed && stats.pending > 0 && (
                <span className="ml-auto bg-yellow-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.pending}
                </span>
              )}
            </button>

            <button onClick={() => { setActiveTab('processing'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'processing' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaSpinner className="text-lg" />
              {!sidebarCollapsed && <span>In Progress</span>}
              {!sidebarCollapsed && stats.inProgress > 0 && (
                <span className="ml-auto bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.inProgress}
                </span>
              )}
            </button>

            <button onClick={() => { setActiveTab('completed'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'completed' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaCheck className="text-lg" />
              {!sidebarCollapsed && <span>Completed</span>}
              {!sidebarCollapsed && stats.completed > 0 && (
                <span className="ml-auto bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.completed}
                </span>
              )}
            </button>

            <button onClick={() => { setActiveTab('critical'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'critical' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaExclamationTriangle className="text-lg" />
              {!sidebarCollapsed && <span>Critical Results</span>}
              {!sidebarCollapsed && stats.critical > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {stats.critical}
                </span>
              )}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            <button onClick={() => { setActiveTab('inbox'); setShowScheduleView(false); fetchReportsInbox(); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm relative ${
              activeTab === 'inbox' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaInbox className="text-lg" />
              {!sidebarCollapsed && <span>Inbox</span>}
              {unreadReportsCount > 0 && (
                <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {unreadReportsCount}
                </span>
              )}
            </button>

            <button onClick={() => { setActiveTab('outbox'); setShowScheduleView(false); fetchReportsOutbox(); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'outbox' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaPaperPlane className="text-lg" />
              {!sidebarCollapsed && <span>Sent Reports</span>}
            </button>

            <button onClick={() => { setActiveTab('reports'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'reports' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaChartLine className="text-lg" />
              {!sidebarCollapsed && <span>Statistics</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            <button onClick={() => { setActiveTab('schedule'); setShowScheduleView(true); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              showScheduleView ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaCalendarAlt className="text-lg" />
              {!sidebarCollapsed && <span>My Schedule</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            <button onClick={() => { setActiveTab('profile'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'profile' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaUserCircle className="text-lg" />
              {!sidebarCollapsed && <span>Profile</span>}
            </button>
          </nav>

          {sidebarCollapsed && (
            <div className="mt-8 text-center">
              <div className="text-xl font-bold text-blue-400">{stats.pending}</div>
              <div className="text-[10px] text-slate-400">Pending</div>
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
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 py-6 px-8 shadow-xl sticky top-0 z-40">
          <div className="max-w-[1600px] mx-auto flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl shadow-lg animate-glow">
                  <FaMicroscope className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white m-0 drop-shadow-md tracking-tight">
                    {activeTab === 'pending' && 'Pending Lab Requests'}
                    {activeTab === 'processing' && 'In Progress'}
                    {activeTab === 'completed' && 'Completed Tests'}
                    {activeTab === 'critical' && 'Critical Results'}
                    {activeTab === 'inbox' && 'Reports - Inbox'}
                    {activeTab === 'outbox' && 'Reports - Sent'}
                    {activeTab === 'reports' && 'Laboratory Statistics'}
                    {activeTab === 'schedule' && 'My Work Schedule'}
                    {activeTab === 'profile' && 'My Profile'}
                  </h1>
                  <p className="text-base text-white/90 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{formatFullName(user)}</span>
                    <span className="text-white/50">•</span>
                    <span>{user?.hospital_name}</span>
                    <span className="bg-white/20 px-3 py-0.5 rounded-full text-xs font-medium backdrop-blur">Laboratory Department</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <SocketStatusIndicator />
              <button onClick={() => { setActiveTab('sendReport'); setShowScheduleView(false); setShowSendReportModal(true); fetchHospitalAdmins(); }} className="bg-white/20 backdrop-blur px-4 py-2.5 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg text-sm font-medium">
                <FaPaperPlane className="text-sm" /> Send Report
              </button>
              <button onClick={() => { fetchLabRequests(); fetchStats(); }} className="bg-white/20 backdrop-blur px-4 py-2.5 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg text-sm font-medium">
                <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <div className="flex gap-4 bg-white/10 backdrop-blur py-2 px-5 rounded-full">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.pending}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Pending</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.inProgress}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">In Progress</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.completed}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Completed</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.critical}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Critical</div>
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

          {/* Ward Filter - Only for lab requests tabs */}
          {(activeTab === 'pending' || activeTab === 'processing' || activeTab === 'completed' || activeTab === 'critical') && !showScheduleView && (
            <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
              <div className="flex gap-2 flex-wrap">
                {wards.map(ward => (
                  <button
                    key={ward.id}
                    onClick={() => setSelectedWard(ward.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      selectedWard === ward.id
                        ? 'bg-blue-600 text-white shadow-lg'
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
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
                />
              </div>
            </div>
          )}

          {/* Stats Cards - For reports tab */}
          {activeTab === 'reports' && !showScheduleView && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 text-white shadow-lg">
                <p className="text-sm opacity-90 mb-1">Pending Requests</p>
                <p className="text-3xl font-bold">{stats.pending}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
                <p className="text-sm opacity-90 mb-1">In Progress</p>
                <p className="text-3xl font-bold">{stats.inProgress}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg">
                <p className="text-sm opacity-90 mb-1">Completed</p>
                <p className="text-3xl font-bold">{stats.completed}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl p-5 text-white shadow-lg">
                <p className="text-sm opacity-90 mb-1">Critical Results</p>
                <p className="text-3xl font-bold">{stats.critical}</p>
              </div>
            </div>
          )}

          {/* Pending Tab */}
          {activeTab === 'pending' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaClock className="text-yellow-500" /> Pending Lab Requests
                  {selectedWard !== 'all' && <span className="text-sm text-gray-500"> - {currentWard.name} Ward</span>}
                </h2>
              </div>
              <div className="p-6">
                {loading && filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <FaSpinner className="animate-spin text-3xl text-blue-500 mx-auto mb-3" />
                    <p className="text-gray-500">Loading lab requests...</p>
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <FaFlask className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No pending lab requests</p>
                    <p className="text-xs text-gray-400 mt-1">New requests from doctors will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRequests.map(request => {
                      const priority = getPriorityColor(request.priority);
                      const wardColor = wards.find(w => w.id === request.ward)?.bgClass || 'bg-gray-100';
                      return (
                        <div key={request.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all bg-white">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3 flex-wrap">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${wardColor} text-gray-700`}>
                                  {request.ward}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${priority.bg} ${priority.color}`}>
                                  <span>{priority.icon}</span> {priority.text}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                                  {request.status === 'processing' ? '⚙️ In Progress' : '⏳ Pending'}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(request.created_at).toLocaleString()}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 mb-3">
                                <div>
                                  <p className="font-semibold text-lg">{request.patient_name}</p>
                                  <p className="text-sm text-gray-600">
                                    <FaUserMd className="inline mr-1" size={12} /> Dr. {request.doctor_name}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500 mb-1">Test</p>
                                  <p className="font-medium text-blue-700">{request.testName}</p>
                                  <p className="text-xs text-gray-500">{request.testType}</p>
                                </div>
                                <div>
                                  {request.notes && (
                                    <>
                                      <p className="text-sm text-gray-500 mb-1">Notes</p>
                                      <p className="text-sm text-gray-600 italic">{request.notes}</p>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-end gap-3">
                                <button
                                  onClick={() => handleCollectSample(request.id)}
                                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex items-center gap-2"
                                  disabled={loading}
                                >
                                  🧪 Collect Sample
                                </button>
                                <button
                                  onClick={() => handleStartProcessing(request.id)}
                                  className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition flex items-center gap-2"
                                  disabled={loading}
                                >
                                  <FaSpinner className={loading ? 'animate-spin' : ''} /> Start Processing
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Processing Tab */}
          {activeTab === 'processing' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaSpinner className="text-blue-500" /> In Progress
                  {selectedWard !== 'all' && <span className="text-sm text-gray-500"> - {currentWard.name} Ward</span>}
                </h2>
              </div>
              <div className="p-6">
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <FaSpinner className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No tests in progress</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRequests.map(request => {
                      const priority = getPriorityColor(request.priority);
                      const wardColor = wards.find(w => w.id === request.ward)?.bgClass || 'bg-gray-100';
                      return (
                        <div key={request.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all bg-white">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3 flex-wrap">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${wardColor} text-gray-700`}>
                                  {request.ward}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${priority.bg} ${priority.color}`}>
                                  <span>{priority.icon}</span> {priority.text}
                                </span>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  ⚙️ In Progress
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 mb-3">
                                <div>
                                  <p className="font-semibold text-lg">{request.patient_name}</p>
                                  <p className="text-sm text-gray-600">Dr. {request.doctor_name}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500 mb-1">Test</p>
                                  <p className="font-medium text-blue-700">{request.testName}</p>
                                </div>
                                <div>
                                  {request.notes && (
                                    <>
                                      <p className="text-sm text-gray-500 mb-1">Notes</p>
                                      <p className="text-sm text-gray-600 italic">{request.notes}</p>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-end">
                                <button
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowResultModal(true);
                                    setResultData({});
                                    setRecommendations('');
                                  }}
                                  className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition flex items-center gap-2"
                                >
                                  <FaCheck /> Enter Results
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completed Tab */}
          {activeTab === 'completed' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaCheck className="text-green-500" /> Completed Tests
                  {selectedWard !== 'all' && <span className="text-sm text-gray-500"> - {currentWard.name} Ward</span>}
                </h2>
              </div>
              <div className="p-6">
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <FaCheck className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No completed tests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRequests.map(request => (
                      <div key={request.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all bg-white cursor-pointer" onClick={() => {
                        setSelectedRequest(request);
                        setShowResultModal(true);
                      }}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                ✅ Completed
                              </span>
                              {request.critical && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                                  <FaExclamationTriangle /> Critical
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="font-semibold text-lg">{request.patient_name}</p>
                                <p className="text-sm text-gray-600">Dr. {request.doctor_name}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Test</p>
                                <p className="font-medium text-green-700">{request.testName}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Completed: {new Date(request.updated_at || request.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                          <button className="px-3 py-1.5 text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition flex items-center gap-1 text-sm">
                            <FaEye size={12} /> View Results
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Critical Tab */}
          {activeTab === 'critical' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-200 bg-red-50">
                <h2 className="text-xl font-bold text-red-800 flex items-center gap-2">
                  <FaExclamationTriangle className="text-red-600" /> Critical Results
                </h2>
              </div>
              <div className="p-6">
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <FaCheck className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No critical results</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRequests.map(request => (
                      <div key={request.id} className="border-2 border-red-500 bg-red-50 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer" onClick={() => {
                        setSelectedRequest(request);
                        setShowResultModal(true);
                      }}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-600 text-white animate-pulse">
                                ⚠️ CRITICAL
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="font-semibold text-lg">{request.patient_name}</p>
                                <p className="text-sm text-gray-600">Dr. {request.doctor_name}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Test</p>
                                <p className="font-medium text-red-700">{request.testName}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Alert sent to doctor immediately</p>
                              </div>
                            </div>
                          </div>
                          <button className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-1 text-sm">
                            <FaEye size={12} /> View Results
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                <button onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); }} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium">New Report</button>
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reports/Statistics Tab */}
          {activeTab === 'reports' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">📊 Laboratory Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Total Tests</p><p className="text-3xl font-bold">{stats.pending + stats.inProgress + stats.completed}</p></div>
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Completion Rate</p><p className="text-3xl font-bold">{Math.round((stats.completed / (stats.pending + stats.inProgress + stats.completed || 1)) * 100)}%</p></div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Today's Completed</p><p className="text-3xl font-bold">{stats.completed}</p></div>
                <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Critical Alerts</p><p className="text-3xl font-bold">{stats.critical}</p></div>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-gray-500">Today's Lab Summary: {stats.completed} tests completed, {stats.pending} pending, {stats.inProgress} in progress</p>
                <p className="text-xs text-gray-400 mt-2">Critical results: {stats.critical} immediate alerts sent to doctors</p>
              </div>
            </div>
          )}

          {/* My Schedule View */}
          {showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
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
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-10">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                      <FaUserCircle className="text-blue-600 text-6xl" />
                    </div>
                  </div>
                  <div className="text-white">
                    <h2 className="text-2xl font-bold mb-1">
                      {profileData.first_name} {profileData.middle_name ? profileData.middle_name + ' ' : ''}{profileData.last_name}
                    </h2>
                    <p className="text-blue-100 flex items-center gap-2">
                      <FaMicroscope className="text-sm" /> {profileData.department || 'Laboratory'} Staff
                    </p>
                    <p className="text-blue-100 text-sm mt-1 opacity-80">{user?.hospital_name}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Professional Information</h3>
                  {!isEditingProfile ? (
                    <button onClick={() => setIsEditingProfile(true)} 
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium">
                      <FaEditIcon /> Edit Profile
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
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="font-semibold text-blue-600 mb-4 flex items-center gap-2"><FaUserCircle /> Personal Info</h4>
                    <div className="space-y-3">
                      <div><label className="text-xs text-gray-500">First Name</label>{isEditingProfile ? <input type="text" value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p className="text-gray-800">{profileData.first_name || 'Not set'}</p>}</div>
                      <div><label className="text-xs text-gray-500">Middle Name</label>{isEditingProfile ? <input type="text" value={profileData.middle_name} onChange={(e) => setProfileData({...profileData, middle_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p className="text-gray-800">{profileData.middle_name || '—'}</p>}</div>
                      <div><label className="text-xs text-gray-500">Last Name</label>{isEditingProfile ? <input type="text" value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p className="text-gray-800">{profileData.last_name || 'Not set'}</p>}</div>
                      <div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-gray-500">Gender</label>{isEditingProfile ? <select value={profileData.gender} onChange={(e) => setProfileData({...profileData, gender: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"><option>Male</option><option>Female</option><option>Other</option></select> : <p className="text-gray-800">{profileData.gender || 'Not set'}</p>}</div>
                      <div><label className="text-xs text-gray-500">Age</label>{isEditingProfile ? <input type="number" value={profileData.age} onChange={(e) => setProfileData({...profileData, age: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p className="text-gray-800">{profileData.age ? `${profileData.age} years` : 'Not set'}</p>}</div></div>
                      <div><label className="text-xs text-gray-500">Phone</label>{isEditingProfile ? <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p className="text-gray-800">{profileData.phone || 'Not set'}</p>}</div>
                      <div><label className="text-xs text-gray-500">Email</label><p className="text-gray-800">{profileData.email || 'Not set'}</p></div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="font-semibold text-blue-600 mb-4 flex items-center gap-2"><FaKey /> Account Settings</h4>
                    <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition text-sm font-medium w-full justify-center"><FaKey /> Change Password</button>
                    <div className="mt-6 pt-4 border-t border-gray-200"><h5 className="text-sm font-medium text-gray-700 mb-2">Account Info</h5>
                      <div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-500">Role:</span><span className="text-gray-800 font-medium">Lab Technician</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Department:</span><span className="text-gray-800">{profileData.department || 'Laboratory'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className="text-green-600">● Active</span></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Result Entry Modal */}
      {showResultModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                {selectedRequest.status === 'completed' ? 'View Results' : 'Enter Lab Results'}
              </h2>
              <button onClick={() => setShowResultModal(false)} className="p-2 hover:bg-gray-100 rounded-full">×</button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Patient</p><p className="font-semibold">{selectedRequest.patient_name}</p></div>
              <div><p className="text-xs text-gray-500">Doctor</p><p className="font-semibold">Dr. {selectedRequest.doctor_name}</p></div>
              <div><p className="text-xs text-gray-500">Test</p><p className="font-semibold text-blue-600">{selectedRequest.testName}</p></div>
              <div><p className="text-xs text-gray-500">Priority</p><p className={`font-semibold ${selectedRequest.priority === 'stat' ? 'text-red-600' : selectedRequest.priority === 'urgent' ? 'text-orange-600' : 'text-green-600'}`}>{selectedRequest.priority}</p></div>
            </div>

            {normalRanges[selectedRequest.testName] ? (
              <div className="mb-6">
                <h3 className="font-semibold mb-4">Test Results</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Normal Range</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {normalRanges[selectedRequest.testName].parameters.map((param, idx) => {
                        const currentValue = resultData[param.name] || '';
                        const isAbnormal = currentValue && param.normal !== 'Negative' && param.normal !== 'Yellow' && param.normal !== 'Clear';
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium">{param.name}</td>
                            <td className="px-4 py-3">
                              <input type="text" value={currentValue} onChange={(e) => handleResultChange(param.name, e.target.value)} disabled={selectedRequest.status === 'completed'} className={`w-32 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${isAbnormal ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500'}`} placeholder="Enter value" />
                              {isAbnormal && <span className="ml-2 text-xs text-red-600">⚠️ Abnormal</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{param.normal}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{param.unit}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="mb-6"><label className="block text-sm font-medium mb-2">Result</label><textarea value={resultData.result || ''} onChange={(e) => handleResultChange('result', e.target.value)} disabled={selectedRequest.status === 'completed'} rows="5" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical" placeholder="Enter test results..." /></div>
            )}

            <div className="mb-6"><label className="block text-sm font-medium mb-2">Recommendations / Comments</label><textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} disabled={selectedRequest.status === 'completed'} rows="3" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical" placeholder="Add any recommendations or clinical comments..." /></div>

            {selectedRequest.status !== 'completed' && (
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button onClick={() => setShowResultModal(false)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
                <button onClick={handleSubmitResults} disabled={loading} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">{loading ? <FaSpinner className="animate-spin" /> : <FaCheck />} Submit Results</button>
              </div>
            )}
            {selectedRequest.status === 'completed' && (
              <div className="flex justify-end pt-4 border-t border-gray-200"><button onClick={() => setShowResultModal(false)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Close</button></div>
            )}
          </div>
        </div>
      )}

      {/* Send Report Modal */}
      {showSendReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaPaperPlane className="text-blue-500" /> Send Report</h2><button onClick={() => setShowSendReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full">×</button></div>
              <form onSubmit={handleSendReport} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Recipient *</label><select value={sendReportForm.recipient_id} onChange={(e) => setSendReportForm({...sendReportForm, recipient_id: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" required><option value="">Select Hospital Admin...</option>{hospitalAdmins.map(admin => (<option key={admin.id} value={admin.id}>{admin.full_name} - {admin.hospital_name}</option>))}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Priority</label><select value={sendReportForm.priority} onChange={(e) => setSendReportForm({...sendReportForm, priority: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl"><option value="low">🟢 Low</option><option value="medium">🟡 Medium</option><option value="high">🟠 High</option><option value="urgent">🔴 Urgent</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Title *</label><input type="text" value={sendReportForm.title} onChange={(e) => setSendReportForm({...sendReportForm, title: e.target.value})} placeholder="e.g., Daily Lab Report" className="w-full p-3 border border-gray-300 rounded-xl" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Message *</label><textarea value={sendReportForm.body} onChange={(e) => setSendReportForm({...sendReportForm, body: e.target.value})} rows="5" placeholder="Enter report details..." className="w-full p-3 border border-gray-300 rounded-xl resize-none" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label><input type="file" ref={fileInputRef} onChange={(e) => { const files = Array.from(e.target.files); setSendReportForm(prev => ({ ...prev, attachments: [...prev.attachments, ...files] })); }} multiple accept="image/*,.pdf,.doc,.docx" className="w-full p-2 border border-gray-300 rounded-xl" /></div>
                <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowSendReportModal(false)} className="px-5 py-2 border border-gray-300 rounded-xl">Cancel</button><button type="submit" disabled={loading} className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl flex items-center gap-2">{loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}{loading ? 'Sending...' : 'Send Report'}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6"><div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200"><div className="flex items-center gap-2">{!selectedReport.is_opened ? <FaEnvelope className="text-blue-500" /> : <FaEnvelopeOpen className="text-gray-400" />}<h2 className="text-xl font-bold text-gray-800">{selectedReport.title}</h2></div><button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className="p-2 hover:bg-gray-100 rounded-full">×</button></div>
              <div className="space-y-4"><div className="flex justify-between"><div><p className="text-sm text-gray-500">From</p><p className="font-semibold text-gray-800">{selectedReport.sender_full_name}</p></div><div className="text-right"><p className="text-sm text-gray-500">Priority</p><span className={`px-3 py-1 rounded-full text-xs ${getPriorityBadge(selectedReport.priority)}`}>{getPriorityIcon(selectedReport.priority)} {selectedReport.priority}</span></div></div>
              <div><p className="text-sm text-gray-500">Date Received</p><p className="text-sm text-gray-700">{new Date(selectedReport.sent_at).toLocaleString()}</p></div>
              <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500 mb-2">Message</p><p className="whitespace-pre-wrap text-gray-800">{selectedReport.body}</p></div>
              <div className="flex gap-3 pt-4 border-t border-gray-200"><button onClick={() => { setShowReportDetailModal(false); setShowReplyModal(true); }} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl flex items-center justify-center gap-2"><FaReply /> Reply</button><button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl">Close</button></div></div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaReply className="text-blue-500" /> Reply to Report</h2><button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className="p-2 hover:bg-gray-100 rounded-full">×</button></div>
              <div className="mb-4 p-4 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 mb-1">Original Report</p><p className="text-sm font-medium text-gray-800">{selectedReport.title}</p><p className="text-xs text-gray-400 mt-1">From: {selectedReport.sender_full_name}</p></div>
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows="5" placeholder="Type your reply here..." className="w-full p-3 border border-gray-300 rounded-xl resize-none" />
              <div className="mt-3"><label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Optional)</label><input type="file" onChange={(e) => setReplyAttachment(e.target.files[0])} accept="image/*,.pdf,.doc,.docx" className="w-full p-2 border border-gray-300 rounded-xl" /></div>
              <div className="flex gap-3 pt-4 mt-2"><button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl">Cancel</button><button onClick={handleSendReply} disabled={loading} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl flex items-center justify-center gap-2">{loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}{loading ? 'Sending...' : 'Send Reply'}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Change Password</h2><button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-full">×</button></div>
              <div className="space-y-4"><input type="password" placeholder="Current Password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" /><input type="password" placeholder="New Password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" /><input type="password" placeholder="Confirm New Password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
              <div className="flex gap-3 pt-4"><button onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl">Cancel</button><button onClick={changePassword} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl">Change Password</button></div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaboratoryDashboard;