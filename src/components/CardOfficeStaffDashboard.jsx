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
  FaIdCard, FaUserPlus, FaHistory, FaSync
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import ScheduleViewer from '../components/ScheduleViewer';

const CardOfficeDashboard = ({ user, onLogout }) => {
  // ==================== STATE MANAGEMENT ====================
  const [activeTab, setActiveTab] = useState('register');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [showScheduleView, setShowScheduleView] = useState(false);
  
  // ==================== REGISTRATION STATES ====================
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    age: '',
    gender: 'Male',
    phone: ''
  });
  const [formErrors, setFormErrors] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    age: '',
    phone: ''
  });
  
  // ==================== SEARCH STATES ====================
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // ==================== PATIENT STATES ====================
  const [recentPatients, setRecentPatients] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [stats, setStats] = useState({
    today: 0,
    inTriage: 0,
    active: 0,
    total: 0
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
    department: 'Card Office'
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // ==================== SOCKET STATES ====================
  const socketRef = useRef(null);
  const [realTimeNotification, setRealTimeNotification] = useState(null);

  const navigate = useNavigate();
  const API_URL = 'http://localhost:5001';
  const SOCKET_URL = 'http://localhost:5001';

  // ==================== VALIDATION FUNCTIONS ====================
  const validateName = (name, fieldName) => {
    if (!name.trim()) {
      return `${fieldName} is required`;
    }
    const nameRegex = /^[A-Za-z\s\-']+$/;
    if (!nameRegex.test(name)) {
      return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
    }
    if (name.length < 2) {
      return `${fieldName} must be at least 2 characters`;
    }
    if (name.length > 50) {
      return `${fieldName} must be less than 50 characters`;
    }
    return '';
  };

  const validateAge = (age) => {
    if (!age) {
      return 'Age is required';
    }
    const ageNum = Number(age);
    if (isNaN(ageNum)) {
      return 'Age must be a number';
    }
    if (!Number.isInteger(ageNum)) {
      return 'Age must be a whole number';
    }
    if (ageNum < 0) {
      return 'Age cannot be negative';
    }
    if (ageNum > 120) {
      return 'Age must be less than 120';
    }
    return '';
  };

  const validatePhone = (phone) => {
    if (!phone) return '';
    const phoneRegex = /^[0-9\s\-+()]+$/;
    if (!phoneRegex.test(phone)) {
      return 'Phone can only contain numbers, spaces, and + - ( )';
    }
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      return 'Phone must have at least 10 digits';
    }
    if (digitsOnly.length > 15) {
      return 'Phone must have less than 15 digits';
    }
    return '';
  };

  const validateForm = () => {
    const errors = {
      first_name: validateName(formData.first_name, 'First name'),
      last_name: validateName(formData.last_name, 'Last name'),
      middle_name: formData.middle_name ? validateName(formData.middle_name, 'Middle name') : '',
      age: validateAge(formData.age),
      phone: validatePhone(formData.phone)
    };
    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected');
      setConnectionStatus('connected');
      socketRef.current.emit('join_cardoffice', user?.hospital_id);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket error:', error);
      setConnectionStatus('disconnected');
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnectionStatus('disconnected');
    });

    socketRef.current.on('patient_registered', (data) => {
      if (data.hospital_id === user?.hospital_id) {
        fetchRecentPatients();
        fetchStats();
        setRealTimeNotification({
          id: Date.now(),
          type: 'new_patient',
          title: 'New Patient Registered',
          message: `${data.patient_name} - Card: ${data.card_number}`,
          priority: 'medium',
          timestamp: new Date()
        });
        setTimeout(() => setRealTimeNotification(null), 6000);
      }
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
  }, [user?.hospital_id]);

  // ==================== FETCH DATA ====================
  const fetchRecentPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/cardoffice/patients/recent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setRecentPatients(response.data.patients);
      }
    } catch (error) {
      console.error('Error fetching recent patients:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/cardoffice/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // ==================== REPORT FUNCTIONS ====================
  const fetchReportsInbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/cardoffice/reports/inbox`, {
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
      const res = await axios.get(`${API_URL}/api/cardoffice/reports/outbox`, {
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
      const res = await axios.get(`${API_URL}/api/cardoffice/hospital-admins`, {
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
      
      const res = await axios.post(`${API_URL}/api/cardoffice/reports/send`, formData, {
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
      await axios.put(`${API_URL}/api/cardoffice/reports/${reportId}/read`, {}, {
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
      
      const res = await axios.post(`${API_URL}/api/cardoffice/reports/${selectedReport.id}/reply`, formData, {
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
      const res = await axios.get(`${API_URL}/api/cardoffice/profile`, {
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
          department: staff.department || 'Card Office'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/cardoffice/profile`, profileData, {
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
      const res = await axios.put(`${API_URL}/api/cardoffice/change-password`, {
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

  // ==================== REGISTRATION FUNCTIONS ====================
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fix the errors in the form before submitting' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }
    
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const cleanedFormData = {
        ...formData,
        phone: formData.phone.replace(/\s/g, '')
      };
      
      const response = await axios.post(
        `${API_URL}/api/cardoffice/patients/register`,
        cleanedFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessage({ type: 'success', text: `Patient ${formData.first_name} ${formData.last_name} registered! Card: ${response.data.patient.card_number}` });
        setFormData({
          first_name: '',
          middle_name: '',
          last_name: '',
          age: '',
          gender: 'Male',
          phone: ''
        });
        setFormErrors({
          first_name: '',
          middle_name: '',
          last_name: '',
          age: '',
          phone: ''
        });
        setSelectedPatient(response.data.patient);
        setShowPrintModal(true);
        fetchRecentPatients();
        fetchStats();
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error registering patient' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // ==================== SEARCH FUNCTIONS ====================
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setMessage({ type: 'error', text: 'Please enter a search term' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const encodedQuery = encodeURIComponent(searchQuery.trim());
      const response = await axios.get(
        `${API_URL}/api/cardoffice/patients/search?query=${encodedQuery}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSearchResults(response.data.patients || []);
        if (!response.data.patients || response.data.patients.length === 0) {
          setMessage({ type: 'error', text: 'No patients found matching your search' });
          setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error searching patients' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setSearching(false);
    }
  };

  const handleSendToTriage = async (patient) => {
    const reason = prompt('Enter reason for return visit:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/cardoffice/patients/send-to-triage`,
        { patientId: patient.id, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessage({ type: 'success', text: `Patient ${patient.first_name} ${patient.last_name} sent to triage` });
        handleSearch();
        fetchStats();
      }
    } catch (error) {
      console.error('Error sending to triage:', error);
      setMessage({ type: 'error', text: 'Error sending patient to triage' });
    } finally {
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleViewHistory = async (patient) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/cardoffice/patients/${patient.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const visitsCount = response.data.visits?.length || 0;
        alert(`${patient.first_name} ${patient.last_name}\nCard: ${patient.card_number}\nTotal Visits: ${visitsCount}`);
      }
    } catch (error) {
      console.error('Error fetching patient history:', error);
      setMessage({ type: 'error', text: 'Error fetching patient history' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setMessage({ type: '', text: '' });
  };

  // ==================== UI HELPER FUNCTIONS ====================
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

  const getStatusStyle = (status) => {
    const styles = {
      'in_triage': { bg: 'bg-amber-100', color: 'text-amber-800', text: 'In Triage' },
      'in_opd': { bg: 'bg-green-100', color: 'text-green-800', text: 'In OPD' },
      'in_emergency': { bg: 'bg-red-100', color: 'text-red-800', text: 'In Emergency' },
      'in_anc': { bg: 'bg-purple-100', color: 'text-purple-800', text: 'In ANC' },
      'with_doctor': { bg: 'bg-blue-100', color: 'text-blue-800', text: 'With Doctor' },
      'admitted': { bg: 'bg-orange-100', color: 'text-orange-800', text: 'Admitted' },
      'discharged': { bg: 'bg-gray-100', color: 'text-gray-800', text: 'Discharged' },
      'referred': { bg: 'bg-pink-100', color: 'text-pink-800', text: 'Referred' }
    };
    return styles[status] || { bg: 'bg-gray-100', color: 'text-gray-800', text: status || 'Unknown' };
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
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-teal-100">
                {realTimeNotification.type === 'reply' ? '💬' : realTimeNotification.type === 'new_patient' ? '🆕' : '📬'}
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
      fetchRecentPatients();
      fetchStats();
      fetchReportsInbox();
      fetchReportsOutbox();
      fetchHospitalAdmins();
      fetchProfile();
      
      const interval = setInterval(() => {
        fetchStats();
        fetchReportsInbox();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?.hospital_id]);

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex">
      <RealTimeNotification />
      
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
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
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg">
                  <FaIdCard className="text-white text-sm" />
                </div>
                <span className="font-bold text-base tracking-tight">Card Office</span>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg mx-auto">
                <FaIdCard className="text-white text-sm" />
              </div>
            )}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>

          <nav className="space-y-1">
            {/* Register Patient */}
            <button onClick={() => { setActiveTab('register'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'register' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaUserPlus className="text-lg" />
              {!sidebarCollapsed && <span>Register Patient</span>}
            </button>

            {/* Search Patients */}
            <button onClick={() => { setActiveTab('search'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'search' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaSearch className="text-lg" />
              {!sidebarCollapsed && <span>Search Patients</span>}
            </button>

            {/* Recent Registrations */}
            <button onClick={() => { setActiveTab('recent'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'recent' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaHistory className="text-lg" />
              {!sidebarCollapsed && <span>Recent Registrations</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            {/* Inbox */}
            <button onClick={() => { setActiveTab('inbox'); setShowScheduleView(false); fetchReportsInbox(); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm relative ${
              activeTab === 'inbox' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
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
              activeTab === 'outbox' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaPaperPlane className="text-lg" />
              {!sidebarCollapsed && <span>Sent Reports</span>}
            </button>

            {/* Statistics */}
            <button onClick={() => { setActiveTab('reports'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'reports' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaChartBar className="text-lg" />
              {!sidebarCollapsed && <span>Statistics</span>}
            </button>

            {/* ==================== MY SCHEDULE ==================== */}
            <button 
              onClick={() => { setActiveTab('schedule'); setShowScheduleView(true); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
                showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
              }`}
            >
              <FaCalendarAlt className="text-lg" />
              {!sidebarCollapsed && <span>My Schedule</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            {/* Profile */}
            <button onClick={() => { setActiveTab('profile'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'profile' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaUserCircle className="text-lg" />
              {!sidebarCollapsed && <span>Profile</span>}
            </button>
          </nav>

          {sidebarCollapsed && (
            <div className="mt-8 text-center">
              <div className="text-xl font-bold text-blue-400">{stats.today}</div>
              <div className="text-[10px] text-slate-400">Today</div>
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
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-6 px-8 shadow-xl sticky top-0 z-40">
          <div className="max-w-[1600px] mx-auto flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl shadow-lg animate-glow">
                  <FaIdCard className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white m-0 drop-shadow-md tracking-tight">
                    {activeTab === 'register' && 'Register New Patient'}
                    {activeTab === 'search' && 'Search Patients'}
                    {activeTab === 'recent' && 'Recent Registrations'}
                    {activeTab === 'inbox' && 'Reports - Inbox'}
                    {activeTab === 'outbox' && 'Reports - Sent'}
                    {activeTab === 'reports' && 'Statistics & Reports'}
                    {activeTab === 'schedule' && 'My Work Schedule'}
                    {activeTab === 'profile' && 'My Profile'}
                  </h1>
                  <p className="text-base text-white/90 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{user?.full_name || 'Card Office Staff'}</span>
                    <span className="text-white/50">•</span>
                    <span>{user?.hospital_name}</span>
                    <span className="bg-white/20 px-3 py-0.5 rounded-full text-xs font-medium backdrop-blur">Card Office Department</span>
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
                  <div className="text-xl font-bold text-white">{stats.today}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Today</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.inTriage}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">In Triage</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.total}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Total</div>
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
            <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">Today's Registrations</p>
              <p className="text-3xl font-bold">{stats.today}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">In Triage</p>
              <p className="text-3xl font-bold">{stats.inTriage}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">Active Patients</p>
              <p className="text-3xl font-bold">{stats.active}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">Total Patients</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
          </div>

          {/* Register Tab */}
          {activeTab === 'register' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaUserPlus className="text-blue-500" /> Register New Patient
              </h2>
              
              <form onSubmit={handleRegister} className="max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className={`w-full p-3 border ${formErrors.first_name ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`}
                      placeholder="Enter first name"
                    />
                    {formErrors.first_name && <p className="text-red-500 text-xs mt-1">{formErrors.first_name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middle_name"
                      value={formData.middle_name}
                      onChange={handleInputChange}
                      className={`w-full p-3 border ${formErrors.middle_name ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`}
                      placeholder="Enter middle name"
                    />
                    {formErrors.middle_name && <p className="text-red-500 text-xs mt-1">{formErrors.middle_name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className={`w-full p-3 border ${formErrors.last_name ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`}
                      placeholder="Enter last name"
                    />
                    {formErrors.last_name && <p className="text-red-500 text-xs mt-1">{formErrors.last_name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      min="0"
                      max="120"
                      className={`w-full p-3 border ${formErrors.age ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`}
                      placeholder="Enter age"
                    />
                    {formErrors.age && <p className="text-red-500 text-xs mt-1">{formErrors.age}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full p-3 border ${formErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`}
                      placeholder="Enter phone number"
                    />
                    {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaUserPlus />}
                    {loading ? 'Registering...' : 'Register Patient'}
                  </button>
                </div>
              </form>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>📌 Note:</strong> After registration, patient will automatically be sent to Triage
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  <strong>Validation Rules:</strong> Names: letters only | Age: 0-120 years | Phone: 10-15 digits
                </p>
              </div>
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaSearch className="text-blue-500" /> Search Patients
              </h2>
              
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by card number, name, or phone..."
                  className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {searching ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                  {searching ? 'Searching...' : 'Search'}
                </button>
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-200"
                  >
                    Clear
                  </button>
                )}
              </div>

              {searchResults.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">
                    Search Results ({searchResults.length})
                  </h3>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {searchResults.map(patient => {
                      const statusStyle = getStatusStyle(patient.status);
                      return (
                        <div key={patient.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  {patient.card_number}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs ${statusStyle.bg} ${statusStyle.color}`}>
                                  {statusStyle.text}
                                </span>
                              </div>
                              <h3 className="font-bold text-gray-800 text-lg">
                                {patient.first_name} {patient.middle_name || ''} {patient.last_name}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {patient.age} years • {patient.gender}
                              </p>
                              {patient.phone && (
                                <p className="text-sm text-gray-500 mt-1">
                                  📞 {patient.phone}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                Registered: {new Date(patient.registered_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              <button
                                onClick={() => handleViewHistory(patient)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition flex items-center gap-2"
                              >
                                <FaHistory /> History
                              </button>
                              {patient.status !== 'in_triage' && patient.status !== 'with_doctor' && (
                                <button
                                  onClick={() => handleSendToTriage(patient)}
                                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition flex items-center gap-2"
                                >
                                  <FaHeartbeat /> Send to Triage
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !message.text && (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <FaSearch className="text-5xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No patients found</p>
                  <p className="text-xs text-gray-400 mt-1">Try searching with a different term</p>
                </div>
              )}
            </div>
          )}

          {/* Recent Tab */}
          {activeTab === 'recent' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaHistory className="text-blue-500" /> Recent Registrations
              </h2>
              
              {recentPatients.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <FaUserPlus className="text-5xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No patients registered yet</p>
                  <p className="text-xs text-gray-400 mt-1">Register your first patient to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Card Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age/Gender</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentPatients.map(patient => {
                        const statusStyle = getStatusStyle(patient.status);
                        return (
                          <tr key={patient.id} className="hover:bg-gray-50 transition">
                            <td className="px-4 py-3 font-mono text-sm text-blue-600">{patient.card_number}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {patient.first_name} {patient.middle_name || ''} {patient.last_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{patient.age} / {patient.gender}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{patient.phone || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${statusStyle.bg} ${statusStyle.color}`}>
                                {statusStyle.text}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(patient.registered_at).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
                <button onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); }} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium">New Report</button>
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

          {/* Reports/Statistics Tab */}
          {activeTab === 'reports' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">📊 Card Office Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Today's Registrations</p><p className="text-3xl font-bold">{stats.today}</p></div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">In Triage Queue</p><p className="text-3xl font-bold">{stats.inTriage}</p></div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Active Patients</p><p className="text-3xl font-bold">{stats.active}</p></div>
                <div className="bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Total Patients</p><p className="text-3xl font-bold">{stats.total}</p></div>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-gray-500">Today's Registration Summary: {stats.today} new patients registered</p>
                <p className="text-xs text-gray-400 mt-2">Total patients waiting in triage: {stats.inTriage}</p>
              </div>
            </div>
          )}

          {/* My Schedule View */}
          {showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
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
              
              {/* Schedule Viewer Component */}
              <ScheduleViewer user={user} compact={false} />
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10">
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
                      <FaIdCard className="text-sm" /> {profileData.department || 'Card Office'} Staff
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
                    <h4 className="font-semibold text-blue-600 mb-4 flex items-center gap-2">
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
                    <h4 className="font-semibold text-blue-600 mb-4 flex items-center gap-2">
                      <FaKey /> Account Settings
                    </h4>
                    <button onClick={() => setShowPasswordModal(true)} 
                      className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition text-sm font-medium w-full justify-center">
                      <FaKey /> Change Password
                    </button>
                    
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Account Info</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Role:</span>
                          <span className="text-gray-800 font-medium">Card Office Staff</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Department:</span>
                          <span className="text-gray-800">{profileData.department || 'Card Office'}</span>
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

      {/* Print Card Modal */}
      {showPrintModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Patient Card</h2>
                <button onClick={() => { setShowPrintModal(false); setSelectedPatient(null); }} className="p-2 hover:bg-gray-100 rounded-full">×</button>
              </div>

              <div className="border-2 border-blue-600 rounded-xl p-5 bg-gradient-to-br from-blue-50 to-white">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-blue-800 mb-1">{user?.hospital_name}</h3>
                  <p className="text-xs text-gray-500">Patient Identification Card</p>
                </div>

                <div className="text-center mb-4">
                  <span className="text-2xl font-mono font-bold text-blue-600">{selectedPatient.card_number}</span>
                </div>

                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-800 mb-1">
                    {selectedPatient.first_name} {selectedPatient.middle_name || ''} {selectedPatient.last_name}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">{selectedPatient.gender} • {selectedPatient.age} years</p>
                  {selectedPatient.phone && <p className="text-sm text-gray-600">📞 {selectedPatient.phone}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowPrintModal(false); setSelectedPatient(null); }} className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">Close</button>
                <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">Print Card</button>
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
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaPaperPlane className="text-blue-500" /> Send Report</h2>
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
                  <input type="text" value={sendReportForm.title} onChange={(e) => setSendReportForm({...sendReportForm, title: e.target.value})} placeholder="e.g., Daily Registration Report" className="w-full p-3 border border-gray-300 rounded-xl" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea value={sendReportForm.body} onChange={(e) => setSendReportForm({...sendReportForm, body: e.target.value})} rows="5" placeholder="Enter report details..." className="w-full p-3 border border-gray-300 rounded-xl resize-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                  <input type="file" ref={fileInputRef} onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setSendReportForm(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
                  }} multiple accept="image/*,.pdf,.doc,.docx" className="w-full p-2 border border-gray-300 rounded-xl" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowSendReportModal(false)} className="px-5 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                  <button type="submit" disabled={loading} className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2">
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
                  <button onClick={() => { setShowReportDetailModal(false); setShowReplyModal(true); }} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2"><FaReply /> Reply</button>
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
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaReply className="text-blue-500" /> Reply to Report</h2>
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
                <button onClick={handleSendReply} disabled={loading} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
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
                  <button onClick={changePassword} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition">Change Password</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardOfficeDashboard;