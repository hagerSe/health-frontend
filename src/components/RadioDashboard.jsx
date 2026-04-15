import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  FaHome, FaHospital, FaBell, FaUserCircle, FaSignOutAlt,
  FaInbox, FaPaperPlane, FaUsers, FaChartBar,
  FaPlus, FaSearch, FaChevronLeft, FaChevronRight,
  FaClock, FaExclamationTriangle, FaEnvelope, FaEnvelopeOpen,
  FaTimes, FaCheck, FaSpinner, FaUserMd, FaUserNurse,
  FaFlask, FaXRay, FaBaby, FaBed, FaUserTie, FaCreditCard,
  FaCalendarAlt, FaPhone, FaHeartbeat, FaPills, FaHospitalAlt,
  FaChartLine, FaFileExport, FaCalendarWeek, FaStethoscope,
  FaProcedures, FaUserInjured, FaEdit, FaSave, FaKey, FaCamera,
  FaReply, FaEye, FaFileAlt, FaPaperclip, FaTrash, FaTools,
  FaBroom, FaArrowRight, FaArrowLeft, FaTimesCircle, FaSync,
  FaIdCard, FaHistory, FaUserPlus, FaImage, FaUpload, FaDownload
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import ScheduleViewer from '../components/ScheduleViewer';

const RadiologyDashboard = ({ user, onLogout }) => {
  // ==================== STATE MANAGEMENT ====================
  const [activeTab, setActiveTab] = useState('queue');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [showScheduleView, setShowScheduleView] = useState(false);
  const [selectedWard, setSelectedWard] = useState('all');
  
  // ==================== RADIOLOGY STATES ====================
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
  
  // ==================== STATS STATES ====================
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
  const [reportsLoading, setReportsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  
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
    department: 'Radiology'
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // ==================== CONSTANTS ====================
  const API_URL = 'http://localhost:5001';
  const SOCKET_URL = 'http://localhost:5001';
  const socketRef = useRef(null);
  const navigate = useNavigate();
  
  const wards = [
    { id: 'all', name: 'All Wards', icon: '🏥' },
    { id: 'OPD', name: 'OPD', icon: '🏥' },
    { id: 'EME', name: 'Emergency', icon: '🚨' },
    { id: 'ANC', name: 'Antenatal', icon: '🤰' }
  ];
  
  const examTypes = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammogram', 'Fluoroscopy'];

  // ==================== HELPER FUNCTIONS ====================
  const getPriorityBadge = (priority) => {
    const colors = {
      stat: 'bg-red-100 text-red-800',
      urgent: 'bg-orange-100 text-orange-800',
      routine: 'bg-green-100 text-green-800'
    };
    return colors[priority] || colors.routine;
  };

  const getPriorityIcon = (priority) => {
    const icons = { stat: '🔴', urgent: '🟠', routine: '🟢' };
    return icons[priority] || '🟢';
  };

  const getWardColor = (ward) => {
    const colors = { 'OPD': '#10b981', 'EME': '#ef4444', 'ANC': '#8b5cf6' };
    return colors[ward] || '#64748b';
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800'
    };
    return colors[status] || colors.pending;
  };

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    if (!user?.hospital_id) return;

    const token = localStorage.getItem('token');

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Radiology socket connected');
      setConnectionStatus('connected');
      socketRef.current.emit('join_radiology', user?.hospital_id);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket error:', error);
      setConnectionStatus('disconnected');
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnectionStatus('disconnected');
    });

    socketRef.current.on('new_radiology_request', (data) => {
      fetchAllData();
      setRealTimeNotification({
        id: Date.now(),
        type: 'new_request',
        title: 'New Radiology Request',
        message: `${data.exam_type} requested for ${data.patient_name} (${data.ward} Ward)`,
        priority: data.priority === 'stat' ? 'urgent' : 'medium',
        timestamp: new Date()
      });
      setTimeout(() => setRealTimeNotification(null), 6000);
    });

    socketRef.current.on('radiology_request_updated', (data) => {
      fetchAllData();
    });

    socketRef.current.on('radiology_report_ready', (data) => {
      setRealTimeNotification({
        id: Date.now(),
        type: 'report_ready',
        title: data.critical ? '⚠️ CRITICAL Report Ready' : 'Report Ready',
        message: `Radiology report for ${data.patient_name} is ready`,
        priority: data.critical ? 'urgent' : 'medium',
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

    socketRef.current.on('weekly_schedule_ready', (data) => {
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

    socketRef.current.on('new_schedule_assigned', (data) => {
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
  }, [user?.hospital_id]);

  // ==================== FETCH DATA ====================
  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = { hospital_id: user?.hospital_id };
      if (selectedWard !== 'all') params.ward = selectedWard;
      
      const res = await axios.get(`${API_URL}/api/radiology/pending`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setQueue(res.data.requests || []);
        setStats(prev => ({ ...prev, pending: res.data.requests?.length || 0 }));
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
      setQueue([]);
    }
  };

  const fetchInProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = { hospital_id: user?.hospital_id };
      if (selectedWard !== 'all') params.ward = selectedWard;
      
      const res = await axios.get(`${API_URL}/api/radiology/in-progress`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setInProgress(res.data.requests || []);
        setStats(prev => ({ ...prev, inProgress: res.data.requests?.length || 0 }));
      }
    } catch (error) {
      console.error('Error fetching in-progress:', error);
      setInProgress([]);
    }
  };

  const fetchCompleted = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = { hospital_id: user?.hospital_id };
      if (selectedWard !== 'all') params.ward = selectedWard;
      
      const res = await axios.get(`${API_URL}/api/radiology/completed`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setCompleted(res.data.requests || []);
        setStats(prev => ({ 
          ...prev, 
          completed: res.data.requests?.length || 0,
          critical: res.data.requests?.filter(r => r.critical).length || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching completed:', error);
      setCompleted([]);
    }
  };

  const fetchAllData = () => {
    fetchQueue();
    fetchInProgress();
    fetchCompleted();
  };

  // ==================== EXAM HANDLING ====================
  const handleStartExam = async (request) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const res = await axios.put(`${API_URL}/api/radiology/requests/${request.id}/start`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setSelectedRequest(request);
        setReportData({ findings: '', impression: '', critical: false });
        setUploadedImages([]);
        setShowReportModal(true);
        fetchAllData();
        
        setMessage({ type: 'success', text: 'Exam started successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error starting exam:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error starting exam' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

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
      
      const res = await axios.post(`${API_URL}/api/radiology/upload/${selectedRequest.id}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

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
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error uploading images' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setUploadingImages(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setUploadedImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmitReport = async () => {
    if (!reportData.findings) {
      setMessage({ type: 'error', text: 'Please enter findings' });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
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
        setMessage({ type: 'success', text: 'Report submitted successfully' });
        setShowReportModal(false);
        setSelectedRequest(null);
        fetchAllData();
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error submitting report' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== REPORT FUNCTIONS ====================
  const fetchReportsInbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/radiology/reports/inbox`, {
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
      const res = await axios.get(`${API_URL}/api/radiology/reports/outbox`, {
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
      const res = await axios.get(`${API_URL}/api/radiology/hospital-admins`, {
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
      formData.append('body', sendReportForm.body);
      formData.append('priority', sendReportForm.priority);
      formData.append('recipient_id', sendReportForm.recipient_id);
      sendReportForm.attachments.forEach((file) => formData.append('attachments', file));
      
      const res = await axios.post(`${API_URL}/api/radiology/reports/send`, formData, {
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
      await axios.put(`${API_URL}/api/radiology/reports/${reportId}/read`, {}, {
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
      
      const res = await axios.post(`${API_URL}/api/radiology/reports/${selectedReport.id}/reply`, formData, {
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
      const res = await axios.get(`${API_URL}/api/radiology/profile`, {
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
          department: staff.department || 'Radiology'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/radiology/profile`, profileData, {
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
      const res = await axios.put(`${API_URL}/api/radiology/change-password`, {
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

  // ==================== REAL TIME NOTIFICATION ====================
  const [realTimeNotification, setRealTimeNotification] = useState(null);

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
                 realTimeNotification.type === 'new_request' ? '📷' : 
                 realTimeNotification.type === 'report_ready' ? '📄' : '📬'}
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
            <button onClick={() => setRealTimeNotification(null)} className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-xl">×</button>
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

  // ==================== SOCKET STATUS INDICATOR ====================
  const SocketStatusIndicator = () => {
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
    if (user?.hospital_id) {
      fetchAllData();
      fetchReportsInbox();
      fetchReportsOutbox();
      fetchHospitalAdmins();
      fetchProfile();
      
      const interval = setInterval(() => {
        fetchAllData();
        fetchReportsInbox();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?.hospital_id, selectedWard]);

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

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex">
      <RealTimeNotification />
      
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
        @keyframes glow { 0% { box-shadow: 0 0 5px rgba(168,85,247,0.2); } 50% { box-shadow: 0 0 20px rgba(168,85,247,0.5); } 100% { box-shadow: 0 0 5px rgba(168,85,247,0.2); } }
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
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
                  <FaXRay className="text-white text-sm" />
                </div>
                <span className="font-bold text-base tracking-tight">Radiology</span>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg mx-auto">
                <FaXRay className="text-white text-sm" />
              </div>
            )}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>

          <div className="p-3 mb-4 bg-slate-900 rounded-xl">
            <p className="text-xs text-slate-400">Radiology Staff</p>
            <p className="text-sm font-medium truncate">{user?.full_name}</p>
          </div>

          <nav className="space-y-1">
            {/* Queue */}
            <button onClick={() => { setActiveTab('queue'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'queue' && !showScheduleView ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaClock className="text-lg" />
              {!sidebarCollapsed && <span>Pending Queue</span>}
              {stats.pending > 0 && !sidebarCollapsed && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.pending}
                </span>
              )}
            </button>

            {/* In Progress */}
            <button onClick={() => { setActiveTab('in-progress'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'in-progress' && !showScheduleView ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaSpinner className="text-lg" />
              {!sidebarCollapsed && <span>In Progress</span>}
              {stats.inProgress > 0 && !sidebarCollapsed && (
                <span className="ml-auto bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.inProgress}
                </span>
              )}
            </button>

            {/* Completed */}
            <button onClick={() => { setActiveTab('completed'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'completed' && !showScheduleView ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaCheck className="text-lg" />
              {!sidebarCollapsed && <span>Completed</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            {/* Inbox */}
            <button onClick={() => { setActiveTab('inbox'); setShowScheduleView(false); fetchReportsInbox(); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm relative ${
              activeTab === 'inbox' && !showScheduleView ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg' : 'hover:bg-slate-700'
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
              activeTab === 'outbox' && !showScheduleView ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaPaperPlane className="text-lg" />
              {!sidebarCollapsed && <span>Sent Reports</span>}
            </button>

            {/* Statistics */}
            <button onClick={() => { setActiveTab('reports'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'reports' && !showScheduleView ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaChartBar className="text-lg" />
              {!sidebarCollapsed && <span>Statistics</span>}
            </button>

            {/* My Schedule */}
            <button 
              onClick={() => { setActiveTab('schedule'); setShowScheduleView(true); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
                showScheduleView ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg' : 'hover:bg-slate-700'
              }`}
            >
              <FaCalendarAlt className="text-lg" />
              {!sidebarCollapsed && <span>My Schedule</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            {/* Profile */}
            <button onClick={() => { setActiveTab('profile'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'profile' && !showScheduleView ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaUserCircle className="text-lg" />
              {!sidebarCollapsed && <span>Profile</span>}
            </button>
          </nav>

          {sidebarCollapsed && (
            <div className="mt-8 text-center">
              <div className="text-xl font-bold text-purple-400">{stats.pending}</div>
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
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-6 px-8 shadow-xl sticky top-0 z-40">
          <div className="max-w-[1600px] mx-auto flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl shadow-lg animate-glow">
                  <FaXRay className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white m-0 drop-shadow-md tracking-tight">
                    {activeTab === 'queue' && 'Radiology - Pending Queue'}
                    {activeTab === 'in-progress' && 'Radiology - In Progress'}
                    {activeTab === 'completed' && 'Radiology - Completed Exams'}
                    {activeTab === 'inbox' && 'Reports - Inbox'}
                    {activeTab === 'outbox' && 'Reports - Sent'}
                    {activeTab === 'reports' && 'Radiology Statistics'}
                    {activeTab === 'schedule' && 'My Work Schedule'}
                    {activeTab === 'profile' && 'My Profile'}
                  </h1>
                  <p className="text-base text-white/90 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{user?.full_name || 'Radiology Staff'}</span>
                    <span className="text-white/50">•</span>
                    <span>{user?.hospital_name}</span>
                    <span className="bg-white/20 px-3 py-0.5 rounded-full text-xs font-medium backdrop-blur">Radiology Department</span>
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
                  <div className="text-xl font-bold text-green-300">{stats.completed}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Completed</div>
                </div>
                {stats.critical > 0 && (
                  <>
                    <div className="w-px h-8 bg-white/30" />
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-300 animate-pulse">{stats.critical}</div>
                      <div className="text-[10px] text-white/70 uppercase tracking-wider">Critical</div>
                    </div>
                  </>
                )}
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

          {/* Ward Filter */}
          <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
            <div className="flex gap-2">
              {wards.map(ward => (
                <button
                  key={ward.id}
                  onClick={() => setSelectedWard(ward.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedWard === ward.id
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{ward.icon}</span>
                  {ward.name}
                </button>
              ))}
            </div>
            <div className="relative w-64">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Search by patient or exam..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-sm"
              />
            </div>
          </div>

          {/* Queue Tab */}
          {activeTab === 'queue' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  Pending Radiology Requests
                  {selectedWard !== 'all' && ` - ${selectedWard} Ward`}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Requests from doctors waiting for imaging</p>
              </div>
              <div className="p-6">
                {loading && queue.length === 0 ? (
                  <div className="text-center py-12"><FaSpinner className="animate-spin text-3xl text-purple-600 mx-auto mb-3" /><p className="text-gray-500">Loading requests...</p></div>
                ) : filteredQueue.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <FaXRay className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredQueue.map(request => (
                      <div key={request.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
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
                            <h3 className="font-bold text-gray-800 text-lg">{request.patient_name}</h3>
                            <p className="text-gray-600 mt-1">
                              <span className="font-medium">{request.exam_type}</span> - {request.body_part}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                              👨‍⚕️ Doctor: {request.doctor_name}
                            </p>
                            {request.clinical_notes && (
                              <p className="text-sm text-gray-500 mt-1">📝 Notes: {request.clinical_notes}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleStartExam(request)}
                            disabled={loading}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2"
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
          {activeTab === 'in-progress' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  Exams In Progress
                  {selectedWard !== 'all' && ` - ${selectedWard} Ward`}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Currently being processed</p>
              </div>
              <div className="p-6">
                {loading && inProgress.length === 0 ? (
                  <div className="text-center py-12"><FaSpinner className="animate-spin text-3xl text-purple-600 mx-auto mb-3" /><p className="text-gray-500">Loading...</p></div>
                ) : filteredInProgress.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <FaSpinner className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No exams in progress</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredInProgress.map(request => (
                      <div key={request.id} className="border border-gray-200 rounded-xl p-5 bg-blue-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: getWardColor(request.ward) }}>
                                {request.ward}
                              </span>
                            </div>
                            <h3 className="font-bold text-gray-800 text-lg">{request.patient_name}</h3>
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
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
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
          {activeTab === 'completed' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  Completed Exams
                  {selectedWard !== 'all' && ` - ${selectedWard} Ward`}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Reports submitted to doctors</p>
              </div>
              <div className="p-6 overflow-x-auto">
                {loading && completed.length === 0 ? (
                  <div className="text-center py-12"><FaSpinner className="animate-spin text-3xl text-purple-600 mx-auto mb-3" /><p className="text-gray-500">Loading...</p></div>
                ) : filteredCompleted.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <FaCheck className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No completed exams</p>
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
                          <td className="px-4 py-3 font-medium">{request.patient_name}</td>
                          <td className="px-4 py-3">{request.exam_type}</td>
                          <td className="px-4 py-3">{request.reported_by}</td>
                          <td className="px-4 py-3">{new Date(request.completed_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            {request.critical && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs animate-pulse">⚠️ CRITICAL</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {request.images?.length > 0 && <span className="text-xs text-gray-500">📸 {request.images.length}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <button 
                              className="text-purple-600 hover:text-purple-800 flex items-center gap-1 text-sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setReportData({
                                  findings: request.findings || '',
                                  impression: request.impression || '',
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

          {/* Inbox Tab */}
          {activeTab === 'inbox' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-800">📬 Inbox</h2>
                  {unreadReportsCount > 0 && <span className="px-3 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">{unreadReportsCount} unread</span>}
                </div>
                <button onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); }} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium">New Report</button>
              </div>
              {reportsLoading && reportsInbox.length === 0 ? (
                <div className="text-center py-12"><FaSpinner className="animate-spin text-3xl text-gray-400 mx-auto mb-3" /><p className="text-gray-500">Loading reports...</p></div>
              ) : reportsInbox.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><FaInbox className="text-5xl text-gray-300 mx-auto mb-3" /><p className="text-gray-500 text-sm">No reports in inbox</p></div>
              ) : (
                <div className="space-y-4">
                  {reportsInbox.map(report => (
                    <div key={report.id} className={`border rounded-xl p-5 cursor-pointer hover:shadow-md transition-all ${!report.is_opened ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'}`} onClick={() => viewReportDetails(report)}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          {!report.is_opened ? <FaEnvelope className="text-purple-500" /> : <FaEnvelopeOpen className="text-gray-400" />}
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
              <h2 className="text-xl font-bold text-gray-800 mb-6">📊 Radiology Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-8">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Pending</p><p className="text-3xl font-bold">{stats.pending}</p></div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">In Progress</p><p className="text-3xl font-bold">{stats.inProgress}</p></div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Completed</p><p className="text-3xl font-bold">{stats.completed}</p></div>
                <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Critical Reports</p><p className="text-3xl font-bold">{stats.critical}</p></div>
                <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Total Exams</p><p className="text-3xl font-bold">{stats.completed}</p></div>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-gray-500">Today's Summary: {stats.completed} exams completed, {stats.pending} pending</p>
                <p className="text-xs text-gray-400 mt-2">Critical findings: {stats.critical}</p>
              </div>
            </div>
          )}

          {/* My Schedule View */}
          {showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
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
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-10">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                      <FaUserCircle className="text-purple-600 text-6xl" />
                    </div>
                  </div>
                  <div className="text-white">
                    <h2 className="text-2xl font-bold mb-1">
                      {profileData.first_name} {profileData.middle_name ? profileData.middle_name + ' ' : ''}{profileData.last_name}
                    </h2>
                    <p className="text-purple-100 flex items-center gap-2">
                      <FaXRay className="text-sm" /> {profileData.department || 'Radiology'} Staff
                    </p>
                    <p className="text-purple-100 text-sm mt-1 opacity-80">{user?.hospital_name}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Professional Information</h3>
                  {!isEditingProfile ? (
                    <button onClick={() => setIsEditingProfile(true)} 
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium">
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
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="font-semibold text-purple-600 mb-4 flex items-center gap-2"><FaUserCircle /> Personal Info</h4>
                    <div className="space-y-3">
                      <div><label className="text-xs text-gray-500">First Name</label>{isEditingProfile ? (<input type="text" value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />) : (<p className="text-gray-800">{profileData.first_name || 'Not set'}</p>)}</div>
                      <div><label className="text-xs text-gray-500">Middle Name</label>{isEditingProfile ? (<input type="text" value={profileData.middle_name} onChange={(e) => setProfileData({...profileData, middle_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />) : (<p className="text-gray-800">{profileData.middle_name || '—'}</p>)}</div>
                      <div><label className="text-xs text-gray-500">Last Name</label>{isEditingProfile ? (<input type="text" value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />) : (<p className="text-gray-800">{profileData.last_name || 'Not set'}</p>)}</div>
                      <div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-gray-500">Gender</label>{isEditingProfile ? (<select value={profileData.gender} onChange={(e) => setProfileData({...profileData, gender: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select>) : (<p className="text-gray-800">{profileData.gender || 'Not set'}</p>)}</div><div><label className="text-xs text-gray-500">Age</label>{isEditingProfile ? (<input type="number" value={profileData.age} onChange={(e) => setProfileData({...profileData, age: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />) : (<p className="text-gray-800">{profileData.age ? `${profileData.age} years` : 'Not set'}</p>)}</div></div>
                      <div><label className="text-xs text-gray-500">Phone</label>{isEditingProfile ? (<input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />) : (<p className="text-gray-800">{profileData.phone || 'Not set'}</p>)}</div>
                      <div><label className="text-xs text-gray-500">Email</label><p className="text-gray-800">{profileData.email || 'Not set'}</p></div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="font-semibold text-purple-600 mb-4 flex items-center gap-2"><FaKey /> Account Settings</h4>
                    <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-4 py-2 border border-purple-600 text-purple-600 rounded-xl hover:bg-purple-50 transition text-sm font-medium w-full justify-center"><FaKey /> Change Password</button>
                    <div className="mt-6 pt-4 border-t border-gray-200"><h5 className="text-sm font-medium text-gray-700 mb-2">Account Info</h5><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-500">Role:</span><span className="text-gray-800 font-medium">Radiology Staff</span></div><div className="flex justify-between"><span className="text-gray-500">Department:</span><span className="text-gray-800">{profileData.department || 'Radiology'}</span></div><div className="flex justify-between"><span className="text-gray-500">Status:</span><span className="text-green-600">● Active</span></div></div></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <FaXRay className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Radiology Report</h3>
                </div>
                <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full">×</button>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: getWardColor(selectedRequest.ward) }}>
                    {selectedRequest.ward}
                  </span>
                </div>
                <p className="font-medium text-lg">{selectedRequest.patient_name}</p>
                <p className="text-sm text-gray-600">{selectedRequest.exam_type} - {selectedRequest.body_part}</p>
                <p className="text-sm text-gray-500">Requested by: Dr. {selectedRequest.doctor_name}</p>
              </div>

              {/* Image Upload Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Image Upload</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={imageInputRef}
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="hidden"
                  />
                  <button
                    onClick={() => imageInputRef.current.click()}
                    className="px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 flex items-center gap-2 transition"
                    disabled={uploadingImages}
                  >
                    {uploadingImages ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                    {uploadingImages ? 'Uploading...' : 'Upload Images'}
                  </button>
                  <span className="text-xs text-gray-400">Supported: JPG, PNG (max 100MB each)</span>
                </div>
                
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
                          />
                          <button
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Findings *</label>
                <textarea
                  value={reportData.findings}
                  onChange={(e) => setReportData({ ...reportData, findings: e.target.value })}
                  rows="6"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Describe findings..."
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Impression / Conclusion</label>
                <textarea
                  value={reportData.impression}
                  onChange={(e) => setReportData({ ...reportData, impression: e.target.value })}
                  rows="4"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Clinical impression and conclusion..."
                />
              </div>

              <div className="mb-6 flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
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
                  className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReport}
                  disabled={loading || !reportData.findings}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Report Modal */}
      {showSendReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Send Report</h2><button onClick={() => setShowSendReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full">×</button></div>
            <form onSubmit={handleSendReport} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Recipient *</label><select value={sendReportForm.recipient_id} onChange={(e) => setSendReportForm({...sendReportForm, recipient_id: e.target.value})} className="w-full p-3 border rounded-xl" required><option value="">Select Hospital Admin...</option>{hospitalAdmins.map(admin => (<option key={admin.id} value={admin.id}>{admin.full_name} - {admin.hospital_name}</option>))}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Priority</label><select value={sendReportForm.priority} onChange={(e) => setSendReportForm({...sendReportForm, priority: e.target.value})} className="w-full p-3 border rounded-xl"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Title *</label><input type="text" value={sendReportForm.title} onChange={(e) => setSendReportForm({...sendReportForm, title: e.target.value})} className="w-full p-3 border rounded-xl" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Message *</label><textarea value={sendReportForm.body} onChange={(e) => setSendReportForm({...sendReportForm, body: e.target.value})} rows="5" className="w-full p-3 border rounded-xl" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label><input type="file" ref={fileInputRef} onChange={handleAttachmentChange} multiple className="w-full p-2 border rounded-xl" /></div>
              {attachmentPreview.length > 0 && (<div className="space-y-1">{attachmentPreview.map((file, idx) => (<div key={idx} className="flex justify-between text-xs bg-gray-50 p-2 rounded"><span>{file.name} ({file.size})</span><button type="button" onClick={() => removeAttachment(idx)} className="text-red-500">Remove</button></div>))}</div>)}
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowSendReportModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button><button type="submit" disabled={loading} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg">Send</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{selectedReport.title}</h2><button onClick={() => setShowReportDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full">×</button></div>
            <div className="space-y-4"><div className="flex justify-between"><div><p className="text-sm text-gray-500">From</p><p className="font-semibold">{selectedReport.sender_full_name}</p></div><div><p className="text-sm text-gray-500">Priority</p><span className={`px-2 py-1 rounded-full text-xs ${getPriorityBadge(selectedReport.priority)}`}>{selectedReport.priority}</span></div></div><div><p className="text-sm text-gray-500">Date</p><p className="text-sm">{new Date(selectedReport.sent_at).toLocaleString()}</p></div><div className="bg-gray-50 p-4 rounded-xl"><p className="whitespace-pre-wrap">{selectedReport.body}</p></div><div className="flex gap-3"><button onClick={() => { setShowReportDetailModal(false); setShowReplyModal(true); }} className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg"><FaReply /> Reply</button><button onClick={() => setShowReportDetailModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Close</button></div></div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Reply to Report</h2><button onClick={() => setShowReplyModal(false)} className="p-2 hover:bg-gray-100 rounded-full">×</button></div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Original: {selectedReport.title}</p></div>
            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows="5" placeholder="Type your reply..." className="w-full p-3 border rounded-xl" />
            <div className="mt-3"><input type="file" onChange={(e) => setReplyAttachment(e.target.files[0])} className="w-full p-2 border rounded-xl" /></div>
            <div className="flex gap-3 mt-4"><button onClick={() => setShowReplyModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button><button onClick={handleSendReply} className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg">Send Reply</button></div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Change Password</h2><button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-full">×</button></div>
            <div className="space-y-4"><input type="password" placeholder="Current Password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} className="w-full p-3 border rounded-xl" /><input type="password" placeholder="New Password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} className="w-full p-3 border rounded-xl" /><input type="password" placeholder="Confirm Password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} className="w-full p-3 border rounded-xl" /><div className="flex gap-3"><button onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button><button onClick={changePassword} className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg">Change</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadiologyDashboard;