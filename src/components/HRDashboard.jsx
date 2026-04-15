import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaCalendarAlt, FaUserMd, FaHospitalUser, FaClock, FaPlus, 
  FaEdit, FaTrash, FaSave, FaTimes, FaSync, FaSearch, 
  FaEye, FaCheck, FaBan, FaExchangeAlt, FaUserPlus,
  FaChevronLeft, FaChevronRight, FaPrint, FaFileExcel,
  FaBell, FaChartBar, FaUsers, FaBuilding, FaClock as FaClockIcon,
  FaFilter, FaDownload, FaUpload, FaCog, FaHistory,
  FaInbox, FaPaperPlane, FaEnvelope, FaEnvelopeOpen, FaSpinner,
  FaUserCircle, FaKey, FaReply, FaChartLine, FaIdCard,
  FaHeartbeat, FaStethoscope, FaProcedures, FaUserInjured
} from 'react-icons/fa';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const HRSchedulingDashboard = ({ user, onLogout }) => {
  // ==================== STATE MANAGEMENT ====================
  const [activeTab, setActiveTab] = useState('calendar');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [notification, setNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [realTimeNotification, setRealTimeNotification] = useState(null);
  
  // ==================== DATA STATES ====================
  const [staff, setStaff] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [wards, setWards] = useState(['OPD', 'EME', 'ANC']);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [shiftSwaps, setShiftSwaps] = useState([]);
  const [stats, setStats] = useState({
    totalStaff: 0,
    onDuty: 0,
    onLeave: 0,
    shiftsToday: 0,
    pendingRequests: 0,
    staffByDepartment: [],
    upcomingShifts: []
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
  const [reportsLoading, setReportsLoading] = useState(false);
  const fileInputRef = useRef(null);
  
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
    department: 'Human_Resource'
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // ==================== MODAL STATES ====================
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showStaffDetailsModal, setShowStaffDetailsModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [staffSchedules, setStaffSchedules] = useState([]);
  const [newStaff, setNewStaff] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    ward: '',
    role: '',
    max_hours_per_week: 40
  });
  
  // ==================== SHIFT DEFINITIONS ====================
  const shiftDefinitions = {
    'OPD': {
      morning: { name: 'Morning', start: '08:00', end: '14:00', color: '#10b981', icon: '🌅', hours: 6 },
      afternoon: { name: 'Afternoon', start: '14:00', end: '20:00', color: '#f59e0b', icon: '☀️', hours: 6 },
      night: { name: 'Night', start: '20:00', end: '08:00', color: '#ef4444', icon: '🌙', hours: 12 }
    },
    'EME': {
      morning: { name: 'Morning', start: '08:00', end: '14:00', color: '#ef4444', icon: '🌅', hours: 6 },
      afternoon: { name: 'Afternoon', start: '14:00', end: '20:00', color: '#f97316', icon: '☀️', hours: 6 },
      night: { name: 'Night', start: '20:00', end: '08:00', color: '#dc2626', icon: '🌙', hours: 12 }
    },
    'ANC': {
      morning: { name: 'Morning', start: '08:00', end: '14:00', color: '#8b5cf6', icon: '🌅', hours: 6 },
      afternoon: { name: 'Afternoon', start: '14:00', end: '20:00', color: '#a78bfa', icon: '☀️', hours: 6 },
      night: { name: 'Night', start: '20:00', end: '08:00', color: '#7c3aed', icon: '🌙', hours: 12 }
    }
  };

  // API Configuration
  const API_URL = 'http://localhost:5001';
  const socket = useRef(null);
  const navigate = useNavigate();

  // ==================== HELPER FUNCTIONS ====================
  const formatFullName = (staffMember) => {
    if (!staffMember) return 'Unknown';
    const firstName = staffMember.first_name || '';
    const middleName = staffMember.middle_name ? ` ${staffMember.middle_name}` : '';
    const lastName = staffMember.last_name || '';
    return `${firstName}${middleName} ${lastName}`.trim();
  };

  const getWeekRange = (date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: monday, end: sunday };
  };

  // ==================== REAL TIME NOTIFICATION COMPONENT ====================
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
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-gray-100">
                {realTimeNotification.type === 'schedule' ? '📅' : 
                 realTimeNotification.type === 'weekly' ? '📆' : 
                 realTimeNotification.type === 'update' ? '✏️' : '📬'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-gray-900">{realTimeNotification.title}</p>
                <span className="text-xs text-gray-400 ml-2">
                  {realTimeNotification.priority === 'urgent' ? '🔴 URGENT' : 
                   realTimeNotification.priority === 'high' ? '🟠 High' : '🟡 Medium'}
                </span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{realTimeNotification.message}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                <span>🕒 {new Date(realTimeNotification.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
            <button onClick={() => setRealTimeNotification(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
        </div>
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 8, ease: 'linear' }}
          className={`h-1 ${realTimeNotification.priority === 'urgent' ? 'bg-red-500' : 'bg-violet-500'}`}
        />
      </motion.div>
    );
  };

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    if (!user?.hospital_id) return;
    initializeSocket();
    fetchAllData();
    
    const interval = setInterval(() => fetchAllData(), 60000);
    return () => {
      if (socket.current) socket.current.disconnect();
      clearInterval(interval);
    };
  }, [user?.hospital_id]);

  const initializeSocket = () => {
    const token = localStorage.getItem('token');
    socket.current = io(API_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    socket.current.on('connect', () => {
      console.log('✅ HR Socket connected');
      setConnectionStatus('connected');
      socket.current.emit('join', `hospital_${user?.hospital_id}_hr`);
    });

    socket.current.on('connect_error', (err) => {
      console.error('❌ Socket error:', err);
      setConnectionStatus('disconnected');
    });

    socket.current.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnectionStatus('disconnected');
    });

    // New schedule assigned to staff
    socket.current.on('new_schedule_assigned', (data) => {
      console.log('📅 New schedule assigned:', data);
      setRealTimeNotification({
        id: Date.now(),
        type: 'schedule',
        title: 'New Schedule Assigned',
        message: `${data.shift} Shift on ${data.date} in ${data.ward} Ward`,
        priority: 'high',
        timestamp: new Date()
      });
      fetchSchedules();
      setTimeout(() => setRealTimeNotification(null), 10000);
    });

    // Weekly schedule ready
    socket.current.on('weekly_schedule_ready', (data) => {
      console.log('📆 Weekly schedule ready:', data);
      setRealTimeNotification({
        id: Date.now(),
        type: 'weekly',
        title: `Weekly Schedule Ready - ${data.week_range}`,
        message: `You have ${data.schedules_count} shifts scheduled this week.\nTotal hours: ${data.total_hours}h`,
        priority: 'high',
        timestamp: new Date()
      });
      fetchSchedules();
      setTimeout(() => setRealTimeNotification(null), 12000);
    });

    // New report from hospital admin
    socket.current.on('new_report_from_hospital', (data) => {
      setRealTimeNotification({
        id: Date.now(),
        type: 'report',
        title: 'New Report Received',
        message: `Hospital Admin sent: "${data.title}"`,
        priority: data.priority,
        timestamp: new Date()
      });
      fetchReportsInbox();
      setTimeout(() => setRealTimeNotification(null), 6000);
    });
  };

  // ==================== API CALLS ====================
  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStaff(),
      fetchSchedules(),
      fetchShiftTypes(),
      fetchLeaveRequests(),
      fetchStats(),
      fetchReportsInbox(),
      fetchReportsOutbox(),
      fetchProfile()
    ]);
    setLoading(false);
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hr/staff`, {
        params: { hospital_id: user?.hospital_id },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const staffWithFullName = (res.data.staff || []).map(s => ({
          ...s,
          full_name: formatFullName(s)
        }));
        setStaff(staffWithFullName);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem('token');
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60);
      
      const res = await axios.get(`${API_URL}/api/hr/schedules`, {
        params: { 
          hospital_id: user?.hospital_id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSchedules(res.data.schedules || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchShiftTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hr/shifts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setShiftTypes(res.data.shifts || []);
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hr/leave-requests`, {
        params: { hospital_id: user?.hospital_id },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setLeaveRequests(res.data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hr/stats`, {
        params: { hospital_id: user?.hospital_id },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setStats(res.data.stats);
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
      const res = await axios.get(`${API_URL}/api/hr/reports/inbox`, {
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
      const res = await axios.get(`${API_URL}/api/hr/reports/outbox`, {
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
      const res = await axios.get(`${API_URL}/api/hr/hospital-admins`, {
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
      
      const res = await axios.post(`${API_URL}/api/hr/reports/send`, formData, {
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
      await axios.put(`${API_URL}/api/hr/reports/${reportId}/read`, {}, {
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
      
      const res = await axios.post(`${API_URL}/api/hr/reports/${selectedReport.id}/reply`, formData, {
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
      const res = await axios.get(`${API_URL}/api/hr/profile`, {
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
          department: staff.department || 'Human_Resource'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/hr/profile`, profileData, {
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
      const res = await axios.put(`${API_URL}/api/hr/change-password`, {
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

  // ==================== AUTO GENERATE WEEKLY SCHEDULE ====================
  const autoGenerateWeeklySchedule = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const weekRange = getWeekRange(selectedWeek);
      const startDate = weekRange.start.toISOString().split('T')[0];
      const endDate = weekRange.end.toISOString().split('T')[0];
      
      const res = await axios.post(`${API_URL}/api/hr/schedule/auto-generate`, {
        hospital_id: user?.hospital_id,
        start_date: startDate,
        end_date: endDate,
        ward: 'all'
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.data.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Generated ${res.data.schedules?.length || 0} shifts for ${res.data.staff_notified || 0} staff members! Notifications sent to all staff.` 
        });
        fetchSchedules();
        fetchStats();
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error generating schedule' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // ==================== STAFF SCHEDULE FETCH ====================
  const fetchStaffSchedule = async (staffMember) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60);
      
      const res = await axios.get(`${API_URL}/api/hr/schedules`, {
        params: {
          hospital_id: user?.hospital_id,
          staff_id: staffMember.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        const sortedSchedules = (res.data.schedules || []).sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        );
        setStaffSchedules(sortedSchedules);
        setViewingStaff(staffMember);
        setShowStaffDetailsModal(true);
      } else {
        setStaffSchedules([]);
        setViewingStaff(staffMember);
        setShowStaffDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching staff schedule:', error);
      setStaffSchedules([]);
      setViewingStaff(staffMember);
      setShowStaffDetailsModal(true);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STAFF MANAGEMENT ====================
  const addStaff = async () => {
    if (!newStaff.first_name || !newStaff.last_name || !newStaff.email) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/hr/staff`, {
        ...newStaff,
        hospital_id: user?.hospital_id
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.data.success) {
        setMessage({ type: 'success', text: `Staff ${formatFullName(newStaff)} added successfully! Password: ${res.data.staff.password}` });
        fetchStaff();
        setShowStaffModal(false);
        setNewStaff({
          first_name: '',
          middle_name: '',
          last_name: '',
          email: '',
          phone: '',
          department: '',
          ward: '',
          role: '',
          max_hours_per_week: 40
        });
      }
    } catch (error) {
      console.error('Error adding staff:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error adding staff' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const approveLeaveRequest = async (requestId, status) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/hr/leave-request/${requestId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setMessage({ type: 'success', text: `Leave request ${status}` });
        fetchLeaveRequests();
        fetchSchedules();
      }
    } catch (error) {
      console.error('Error approving leave:', error);
      setMessage({ type: 'error', text: 'Error processing leave request' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // ==================== CALENDAR EVENTS ====================
  const getCalendarEvents = () => {
    const events = [];
    
    schedules.forEach(schedule => {
      const shift = shiftDefinitions[schedule.ward]?.[schedule.shift_type];
      if (shift) {
        const startDateTime = new Date(schedule.date);
        const [startHour, startMinute] = shift.start.split(':');
        startDateTime.setHours(parseInt(startHour), parseInt(startMinute));
        
        let endDateTime = new Date(schedule.date);
        const [endHour, endMinute] = shift.end.split(':');
        endDateTime.setHours(parseInt(endHour), parseInt(endMinute));
        
        if (parseInt(endHour) < parseInt(startHour)) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }
        
        events.push({
          id: schedule.id,
          title: `${schedule.staff_name || schedule.staff?.full_name} - ${shift.name} (${schedule.ward})`,
          start: startDateTime,
          end: endDateTime,
          resource: schedule,
          color: shift.color
        });
      }
    });
    
    return events;
  };

  // ==================== STAFF DETAILS MODAL ====================
  const StaffDetailsModalComponent = () => {
    if (!viewingStaff) return null;
    
    const today = new Date().toISOString().split('T')[0];
    const allSchedules = staffSchedules || [];
    const upcomingSchedules = allSchedules.filter(s => s.date >= today);
    const pastSchedules = allSchedules.filter(s => s.date < today);
    
    // Calculate total hours
    let totalUpcomingHours = 0;
    upcomingSchedules.forEach(schedule => {
      const shift = shiftDefinitions[schedule.ward]?.[schedule.shift_type];
      totalUpcomingHours += shift?.hours || 0;
    });
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
        <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-4 border-b z-10">
            <h3 className="text-xl font-semibold">Staff Schedule - {formatFullName(viewingStaff)}</h3>
            <button onClick={() => setShowStaffDetailsModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>
          
          {/* Staff Info Card */}
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-violet-200 rounded-full flex items-center justify-center text-3xl font-bold text-violet-700">
                {viewingStaff.first_name?.[0]}{viewingStaff.last_name?.[0]}
              </div>
              <div>
                <h4 className="text-lg font-semibold">{formatFullName(viewingStaff)}</h4>
                <p className="text-sm text-gray-600">{viewingStaff.role} • {viewingStaff.ward} Ward • {viewingStaff.department}</p>
                <p className="text-xs text-gray-500">{viewingStaff.email}</p>
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="border rounded-lg p-3 text-center bg-violet-50">
              <p className="text-2xl font-bold text-violet-600">{allSchedules.length}</p>
              <p className="text-xs text-gray-500">Total Shifts</p>
            </div>
            <div className="border rounded-lg p-3 text-center bg-green-50">
              <p className="text-2xl font-bold text-green-600">{upcomingSchedules.length}</p>
              <p className="text-xs text-gray-500">Upcoming</p>
            </div>
            <div className="border rounded-lg p-3 text-center bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">{totalUpcomingHours}</p>
              <p className="text-xs text-gray-500">Total Hours</p>
            </div>
            <div className="border rounded-lg p-3 text-center bg-orange-50">
              <p className="text-2xl font-bold text-orange-600">{pastSchedules.length}</p>
              <p className="text-xs text-gray-500">Past</p>
            </div>
          </div>
          
          {/* Upcoming Schedule Section */}
          {upcomingSchedules.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <FaCalendarAlt className="text-green-500" /> Upcoming Shifts
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {upcomingSchedules.map(schedule => {
                  const shift = shiftDefinitions[schedule.ward]?.[schedule.shift_type];
                  const scheduleDate = new Date(schedule.date);
                  const isToday = schedule.date === today;
                  
                  return (
                    <div 
                      key={schedule.id} 
                      className={`border rounded-lg p-3 flex justify-between items-center ${
                        isToday ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:shadow-md'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {isToday && <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">Today</span>}
                          <p className="font-semibold">
                            {scheduleDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: shift?.color }}>
                            {shift?.icon} {shift?.name} ({shift?.start} - {shift?.end})
                          </span>
                          <span className="text-xs text-gray-500">📍 {schedule.ward} Ward</span>
                          <span className="text-xs text-gray-400">⏰ {shift?.hours} hours</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* No Schedule Message */}
          {allSchedules.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FaCalendarAlt className="text-5xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No schedule found for this staff member</p>
              <p className="text-xs text-gray-400 mt-1">Click "Generate Weekly Schedule" to create schedules for all staff</p>
            </div>
          )}
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button 
              onClick={() => {
                setShowStaffDetailsModal(false);
                autoGenerateWeeklySchedule();
              }} 
              className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
            >
              <FaSync className="inline mr-1" size={12} /> Generate Weekly Schedule
            </button>
            <button onClick={() => setShowStaffDetailsModal(false)} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              Close
            </button>
          </div>
        </div>
      </div>
    );
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
      'active': { bg: 'bg-green-100', color: 'text-green-800', text: 'Active' },
      'inactive': { bg: 'bg-gray-100', color: 'text-gray-800', text: 'Inactive' }
    };
    return styles[status] || { bg: 'bg-gray-100', color: 'text-gray-800', text: status || 'Unknown' };
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    navigate('/login');
  };

  // ==================== RENDER COMPONENTS ====================
  const StaffListView = () => {
    const filteredStaff = staff.filter(s =>
      formatFullName(s).toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.ward?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Staff Directory</h2>
            <button onClick={() => setShowStaffModal(true)} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2">
              <FaUserPlus /> Add Staff
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {filteredStaff.map(staffMember => {
              const statusStyle = getStatusStyle(staffMember.status);
              return (
                <div key={staffMember.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-semibold text-lg">{formatFullName(staffMember)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.color}`}>
                          {statusStyle.text}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">{staffMember.ward} Ward</span>
                        <span className="px-2 py-1 rounded-full text-xs bg-violet-100 text-violet-600">{staffMember.department}</span>
                      </div>
                      <p className="text-sm text-gray-500">Email: {staffMember.email} | Phone: {staffMember.phone || 'N/A'}</p>
                      <p className="text-xs text-gray-400 mt-1">Role: {staffMember.role} | Max hours/week: {staffMember.max_hours_per_week}h</p>
                    </div>
                    <button 
                      onClick={() => fetchStaffSchedule(staffMember)} 
                      className="px-3 py-1.5 text-violet-600 hover:text-violet-800 border border-violet-200 rounded-lg hover:bg-violet-50 transition flex items-center gap-1 text-sm"
                    >
                      <FaEye size={12} /> View Schedule
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const CalendarView = () => (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4" style={{ height: '70vh' }}>
      <Calendar
        localizer={localizer}
        events={getCalendarEvents()}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        views={['month', 'week', 'day']}
        defaultView={Views.MONTH}
        onSelectEvent={(event) => {
          setEditingSchedule(event.resource);
          setShowScheduleModal(true);
        }}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: event.color,
            borderRadius: '8px',
            border: 'none',
            color: 'white',
            fontWeight: '500',
            fontSize: '12px'
          }
        })}
      />
    </div>
  );

  const LeaveRequestsView = () => {
    const pendingRequests = leaveRequests.filter(r => r.status === 'pending');
    const approvedRequests = leaveRequests.filter(r => r.status === 'approved');
    
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaClockIcon className="text-yellow-500" /> Pending Leave Requests
              {pendingRequests.length > 0 && (
                <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{pendingRequests.length}</span>
              )}
            </h2>
          </div>
          <div className="p-6">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No pending leave requests</div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map(request => (
                  <div key={request.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-lg">{request.staff_name}</p>
                        <p className="text-sm text-gray-500 mt-1">📅 {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-500">📝 Reason: {request.reason || 'Not specified'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveLeaveRequest(request.id, 'approved')} className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 flex items-center gap-1">
                          <FaCheck size={12} /> Approve
                        </button>
                        <button onClick={() => approveLeaveRequest(request.id, 'rejected')} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 flex items-center gap-1">
                          <FaTimes size={12} /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    if (user?.hospital_id) {
      fetchAllData();
      fetchHospitalAdmins();
    }
  }, [user?.hospital_id]);

  // ==================== MAIN RENDER ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 flex">
      <RealTimeNotification />
      
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes glow { 0% { box-shadow: 0 0 5px rgba(139,92,246,0.2); } 50% { box-shadow: 0 0 20px rgba(139,92,246,0.5); } 100% { box-shadow: 0 0 5px rgba(139,92,246,0.2); } }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        .animate-glow { animation: glow 2s infinite; }
        .rbc-event { padding: 4px 8px; font-size: 12px; border-radius: 8px; }
        .rbc-calendar { background: white; border-radius: 16px; }
        .rbc-toolbar button { border-radius: 8px; }
        .rbc-toolbar button.rbc-active { background-color: #8b5cf6; color: white; }
        .rbc-toolbar button:hover { background-color: #e9d5ff; }
      `}</style>

      {/* ==================== SIDEBAR ==================== */}
      <div className={`bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      } shadow-2xl flex flex-col h-screen sticky top-0 z-50`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                  <FaCalendarAlt className="text-white text-sm" />
                </div>
                <span className="font-bold text-base tracking-tight">HR Scheduling</span>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg mx-auto">
                <FaCalendarAlt className="text-white text-sm" />
              </div>
            )}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>

          <nav className="space-y-1">
            <button onClick={() => setActiveTab('calendar')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'calendar' ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaCalendarAlt className="text-lg" />
              {!sidebarCollapsed && <span>Calendar View</span>}
            </button>

            <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'staff' ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaUsers className="text-lg" />
              {!sidebarCollapsed && <span>Staff Directory</span>}
              {!sidebarCollapsed && stats.totalStaff > 0 && (
                <span className="ml-auto bg-gray-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.totalStaff}
                </span>
              )}
            </button>

            <button onClick={() => setActiveTab('leave')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'leave' ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaClockIcon className="text-lg" />
              {!sidebarCollapsed && <span>Leave Requests</span>}
              {leaveRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {leaveRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            <button onClick={() => { setActiveTab('inbox'); fetchReportsInbox(); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm relative ${
              activeTab === 'inbox' ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaInbox className="text-lg" />
              {!sidebarCollapsed && <span>Inbox</span>}
              {unreadReportsCount > 0 && (
                <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {unreadReportsCount}
                </span>
              )}
            </button>

            <button onClick={() => { setActiveTab('outbox'); fetchReportsOutbox(); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'outbox' ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaPaperPlane className="text-lg" />
              {!sidebarCollapsed && <span>Sent Reports</span>}
            </button>

            <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'reports' ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaChartBar className="text-lg" />
              {!sidebarCollapsed && <span>Statistics</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'profile' ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaUserCircle className="text-lg" />
              {!sidebarCollapsed && <span>Profile</span>}
            </button>
          </nav>

          {sidebarCollapsed && (
            <div className="mt-8 text-center">
              <div className="text-xl font-bold text-violet-400">{stats.shiftsToday}</div>
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
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 py-6 px-8 shadow-xl sticky top-0 z-40">
          <div className="max-w-[1600px] mx-auto flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl shadow-lg animate-glow">
                  <FaCalendarAlt className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white m-0 drop-shadow-md tracking-tight">
                    {activeTab === 'calendar' && 'Schedule Calendar'}
                    {activeTab === 'staff' && 'Staff Directory'}
                    {activeTab === 'leave' && 'Leave Requests'}
                    {activeTab === 'inbox' && 'Reports - Inbox'}
                    {activeTab === 'outbox' && 'Reports - Sent'}
                    {activeTab === 'reports' && 'Statistics & Reports'}
                    {activeTab === 'profile' && 'My Profile'}
                  </h1>
                  <p className="text-base text-white/90 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{user?.full_name || 'HR Staff'}</span>
                    <span className="text-white/50">•</span>
                    <span>{user?.hospital_name}</span>
                    <span className="bg-white/20 px-3 py-0.5 rounded-full text-xs font-medium backdrop-blur">HR Department</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <SocketStatusIndicator />
              <button onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); }} className="bg-white/20 backdrop-blur px-4 py-2.5 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg text-sm font-medium">
                <FaPaperPlane className="text-sm" /> Send Report
              </button>
              <button 
                onClick={autoGenerateWeeklySchedule} 
                className="bg-white/20 backdrop-blur px-4 py-2.5 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg text-sm font-medium"
                disabled={loading}
              >
                {loading ? <FaSpinner className="animate-spin" /> : <FaSync />}
                {loading ? 'Generating...' : 'Generate Weekly Schedule'}
              </button>
              <div className="flex gap-4 bg-white/10 backdrop-blur py-2 px-5 rounded-full">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.totalStaff}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Staff</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.shiftsToday}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Today</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{leaveRequests.filter(r => r.status === 'pending').length}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Pending</div>
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
            <div className="bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">Total Staff</p>
              <p className="text-3xl font-bold">{stats.totalStaff}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">On Duty Today</p>
              <p className="text-3xl font-bold">{stats.onDuty}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">On Leave</p>
              <p className="text-3xl font-bold">{stats.onLeave}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">Shifts Today</p>
              <p className="text-3xl font-bold">{stats.shiftsToday}</p>
            </div>
          </div>

          {/* Week Selector for Auto-Generate */}
          {activeTab === 'calendar' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700">Select Week:</label>
                  <input
                    type="week"
                    value={`${selectedWeek.getFullYear()}-W${String(Math.ceil((selectedWeek - new Date(selectedWeek.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000))).padStart(2, '0')}`}
                    onChange={(e) => {
                      const [year, week] = e.target.value.split('-W');
                      const date = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
                      setSelectedWeek(date);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    onClick={autoGenerateWeeklySchedule}
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition flex items-center gap-2"
                  >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaSync />}
                    Generate Schedule for Selected Week
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  This will generate schedules for all active staff and send notifications with their full names
                </p>
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && <CalendarView />}

          {/* Staff Tab */}
          {activeTab === 'staff' && <StaffListView />}

          {/* Leave Tab */}
          {activeTab === 'leave' && <LeaveRequestsView />}

          {/* Inbox Tab */}
          {activeTab === 'inbox' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-800">📬 Inbox</h2>
                  {unreadReportsCount > 0 && <span className="px-3 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">{unreadReportsCount} unread</span>}
                </div>
                <button onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); }} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium">New Report</button>
              </div>
              {reportsLoading && reportsInbox.length === 0 ? (
                <div className="text-center py-12"><FaSpinner className="animate-spin text-3xl text-gray-400 mx-auto mb-3" /><p className="text-gray-500">Loading reports...</p></div>
              ) : reportsInbox.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><FaInbox className="text-5xl text-gray-300 mx-auto mb-3" /><p className="text-gray-500 text-sm">No reports in inbox</p></div>
              ) : (
                <div className="space-y-4">
                  {reportsInbox.map(report => (
                    <div key={report.id} className={`border rounded-xl p-5 cursor-pointer hover:shadow-md transition-all ${!report.is_opened ? 'border-violet-300 bg-violet-50' : 'border-gray-200 bg-white'}`} onClick={() => viewReportDetails(report)}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          {!report.is_opened ? <FaEnvelope className="text-violet-500" /> : <FaEnvelopeOpen className="text-gray-400" />}
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
          {activeTab === 'outbox' && (
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
          {activeTab === 'reports' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">📊 HR Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                <div className="bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Total Staff</p><p className="text-3xl font-bold">{stats.totalStaff}</p></div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">On Duty Today</p><p className="text-3xl font-bold">{stats.onDuty}</p></div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">On Leave</p><p className="text-3xl font-bold">{stats.onLeave}</p></div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-5 text-white shadow-lg"><p className="text-sm opacity-90 mb-1">Pending Requests</p><p className="text-3xl font-bold">{stats.pendingRequests}</p></div>
              </div>
              
              {/* Staff by Department */}
              <div className="mt-6">
                <h3 className="font-semibold text-gray-700 mb-4">Staff by Department</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {stats.staffByDepartment.map((dept, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-violet-600">{dept.count}</p>
                      <p className="text-xs text-gray-500">{dept.department || 'Other'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-10">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                      <FaUserCircle className="text-violet-600 text-6xl" />
                    </div>
                  </div>
                  <div className="text-white">
                    <h2 className="text-2xl font-bold mb-1">
                      {profileData.first_name} {profileData.middle_name ? profileData.middle_name + ' ' : ''}{profileData.last_name}
                    </h2>
                    <p className="text-violet-100 flex items-center gap-2">
                      <FaCalendarAlt className="text-sm" /> {profileData.department || 'Human Resources'} Staff
                    </p>
                    <p className="text-violet-100 text-sm mt-1 opacity-80">{user?.hospital_name}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Professional Information</h3>
                  {!isEditingProfile ? (
                    <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition text-sm font-medium">
                      <FaEdit /> Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                      <button onClick={updateProfile} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition"><FaSave /> Save</button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="font-semibold text-violet-600 mb-4 flex items-center gap-2"><FaUserCircle /> Personal Info</h4>
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
                    <h4 className="font-semibold text-violet-600 mb-4 flex items-center gap-2"><FaKey /> Account Settings</h4>
                    <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-4 py-2 border border-violet-600 text-violet-600 rounded-xl hover:bg-violet-50 transition text-sm font-medium w-full justify-center"><FaKey /> Change Password</button>
                    <div className="mt-6 pt-4 border-t border-gray-200"><h5 className="text-sm font-medium text-gray-700 mb-2">Account Info</h5>
                      <div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-500">Role:</span><span className="text-gray-800 font-medium">HR Staff</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Department:</span><span className="text-gray-800">{profileData.department || 'Human Resources'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className="text-green-600">● Active</span></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-gray-800">Add New Staff</h3><button onClick={() => setShowStaffModal(false)} className="p-2 hover:bg-gray-100 rounded-full">×</button></div>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" placeholder="First Name *" value={newStaff.first_name} onChange={(e) => setNewStaff({...newStaff, first_name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
                  <input type="text" placeholder="Middle Name" value={newStaff.middle_name} onChange={(e) => setNewStaff({...newStaff, middle_name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
                  <input type="text" placeholder="Last Name *" value={newStaff.last_name} onChange={(e) => setNewStaff({...newStaff, last_name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
                </div>
                <input type="email" placeholder="Email *" value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
                <input type="tel" placeholder="Phone" value={newStaff.phone} onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
                <select value={newStaff.department} onChange={(e) => setNewStaff({...newStaff, department: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl">
                  <option value="">Select Department</option>
                  <option value="Doctor">Doctor</option><option value="Nurse">Nurse</option><option value="Midwife">Midwife</option>
                  <option value="Triage">Triage</option><option value="Card_Office">Card Office</option><option value="Lab">Lab</option>
                  <option value="Radio">Radio</option><option value="Pharma">Pharma</option><option value="Human_Resource">Human Resource</option>
                </select>
                <select value={newStaff.ward} onChange={(e) => setNewStaff({...newStaff, ward: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl">
                  <option value="">Select Ward</option>{wards.map(w => <option key={w} value={w}>{w} Ward</option>)}
                </select>
                <select value={newStaff.role} onChange={(e) => setNewStaff({...newStaff, role: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl">
                  <option value="">Select Role</option><option value="Doctor">Doctor</option><option value="Nurse">Nurse</option>
                  <option value="Midwife">Midwife</option><option value="Technician">Technician</option><option value="Administrator">Administrator</option>
                </select>
                <input type="number" placeholder="Max Hours Per Week" value={newStaff.max_hours_per_week} onChange={(e) => setNewStaff({...newStaff, max_hours_per_week: parseInt(e.target.value)})} className="w-full p-3 border border-gray-300 rounded-xl" />
              </div>
              <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowStaffModal(false)} className="px-4 py-2 border border-gray-300 rounded-xl">Cancel</button><button onClick={addStaff} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl">Add Staff</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Details Modal */}
      {showStaffDetailsModal && <StaffDetailsModalComponent />}

      {/* Send Report Modal */}
      {showSendReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaPaperPlane className="text-violet-500" /> Send Report</h2><button onClick={() => setShowSendReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full">×</button></div>
              <form onSubmit={handleSendReport} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Recipient *</label><select value={sendReportForm.recipient_id} onChange={(e) => setSendReportForm({...sendReportForm, recipient_id: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" required><option value="">Select Hospital Admin...</option>{hospitalAdmins.map(admin => (<option key={admin.id} value={admin.id}>{admin.full_name} - {admin.hospital_name}</option>))}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Priority</label><select value={sendReportForm.priority} onChange={(e) => setSendReportForm({...sendReportForm, priority: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl"><option value="low">🟢 Low</option><option value="medium">🟡 Medium</option><option value="high">🟠 High</option><option value="urgent">🔴 Urgent</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Title *</label><input type="text" value={sendReportForm.title} onChange={(e) => setSendReportForm({...sendReportForm, title: e.target.value})} placeholder="e.g., Weekly Staff Report" className="w-full p-3 border border-gray-300 rounded-xl" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Message *</label><textarea value={sendReportForm.body} onChange={(e) => setSendReportForm({...sendReportForm, body: e.target.value})} rows="5" placeholder="Enter report details..." className="w-full p-3 border border-gray-300 rounded-xl resize-none" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label><input type="file" ref={fileInputRef} onChange={(e) => { const files = Array.from(e.target.files); setSendReportForm(prev => ({ ...prev, attachments: [...prev.attachments, ...files] })); }} multiple accept="image/*,.pdf,.doc,.docx" className="w-full p-2 border border-gray-300 rounded-xl" /></div>
                <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowSendReportModal(false)} className="px-5 py-2 border border-gray-300 rounded-xl">Cancel</button><button type="submit" disabled={loading} className="px-5 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl flex items-center gap-2">{loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}{loading ? 'Sending...' : 'Send Report'}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6"><div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200"><div className="flex items-center gap-2">{!selectedReport.is_opened ? <FaEnvelope className="text-violet-500" /> : <FaEnvelopeOpen className="text-gray-400" />}<h2 className="text-xl font-bold text-gray-800">{selectedReport.title}</h2></div><button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className="p-2 hover:bg-gray-100 rounded-full">×</button></div>
              <div className="space-y-4"><div className="flex justify-between"><div><p className="text-sm text-gray-500">From</p><p className="font-semibold text-gray-800">{selectedReport.sender_full_name}</p></div><div className="text-right"><p className="text-sm text-gray-500">Priority</p><span className={`px-3 py-1 rounded-full text-xs ${getPriorityBadge(selectedReport.priority)}`}>{getPriorityIcon(selectedReport.priority)} {selectedReport.priority}</span></div></div>
              <div><p className="text-sm text-gray-500">Date Received</p><p className="text-sm text-gray-700">{new Date(selectedReport.sent_at).toLocaleString()}</p></div>
              <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500 mb-2">Message</p><p className="whitespace-pre-wrap text-gray-800">{selectedReport.body}</p></div>
              <div className="flex gap-3 pt-4 border-t border-gray-200"><button onClick={() => { setShowReportDetailModal(false); setShowReplyModal(true); }} className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl flex items-center justify-center gap-2"><FaReply /> Reply</button><button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl">Close</button></div></div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaReply className="text-violet-500" /> Reply to Report</h2><button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className="p-2 hover:bg-gray-100 rounded-full">×</button></div>
              <div className="mb-4 p-4 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 mb-1">Original Report</p><p className="text-sm font-medium text-gray-800">{selectedReport.title}</p><p className="text-xs text-gray-400 mt-1">From: {selectedReport.sender_full_name}</p></div>
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows="5" placeholder="Type your reply here..." className="w-full p-3 border border-gray-300 rounded-xl resize-none" />
              <div className="mt-3"><label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Optional)</label><input type="file" onChange={(e) => setReplyAttachment(e.target.files[0])} accept="image/*,.pdf,.doc,.docx" className="w-full p-2 border border-gray-300 rounded-xl" /></div>
              <div className="flex gap-3 pt-4 mt-2"><button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl">Cancel</button><button onClick={handleSendReply} disabled={loading} className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl flex items-center justify-center gap-2">{loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}{loading ? 'Sending...' : 'Send Reply'}</button></div>
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
              <div className="flex gap-3 pt-4"><button onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl">Cancel</button><button onClick={changePassword} className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl">Change Password</button></div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRSchedulingDashboard;