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
  FaRegClock, FaBuilding, FaGlobe, FaMapMarkerAlt
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const HospitalDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [staff, setStaff] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showStaffDetailModal, setShowStaffDetailModal] = useState(false);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recipients, setRecipients] = useState([]);
  const [kebeleAdmin, setKebeleAdmin] = useState(null);
  const [staffByDepartment, setStaffByDepartment] = useState({});
  
  // Socket connection state
  const [socketConnectionStatus, setSocketConnectionStatus] = useState('connecting');
  const socketRef = useRef(null);
  const [realTimeNotification, setRealTimeNotification] = useState(null);
  
  // Profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    age: '',
    phone: '',
    email: '',
    hospital_name: '',
    service_type: '',
    hospital_type: '',
    kebele_name: '',
    address: '',
    website: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // Report states
  const [reportSubTab, setReportSubTab] = useState('personnel');
  const [selectedWard, setSelectedWard] = useState('all');
  const [staffByWard, setStaffByWard] = useState({});
  const [selectedStaffType, setSelectedStaffType] = useState('Doctor');
  const [staffPerformanceData, setStaffPerformanceData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAgeInterval, setSelectedAgeInterval] = useState('all');
  const [ageFilteredStaff, setAgeFilteredStaff] = useState([]);
  
  // Send report states with attachments
  const [recipientType, setRecipientType] = useState('');
  const [reportFormData, setReportFormData] = useState({
    title: '',
    subject: '',
    body: '',
    priority: 'medium',
    recipient_type: '',
    recipient_id: '',
    attachments: []
  });
  const [attachmentPreview, setAttachmentPreview] = useState([]);
  const fileInputRef = useRef(null);
  
  // Reply states
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState(null);
  
  const noWardDepartments = ['Triage', 'Bed_Management', 'Human_Resource', 'Card_Office', 'Pharma', 'Lab', 'Radio'];
  
  const [staffFormData, setStaffFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: 'Male',
    age: '',
    email: '',
    password: '',
    phone: '',
    department: 'Doctor',
    ward: ''
  });

  const departmentIcons = {
    Doctor: <FaUserMd className="text-teal-500" />,
    Nurse: <FaUserNurse className="text-emerald-500" />,
    Pharma: <FaPills className="text-purple-500" />,
    Lab: <FaFlask className="text-yellow-500" />,
    Radio: <FaXRay className="text-indigo-500" />,
    Midwife: <FaBaby className="text-pink-500" />,
    Triage: <FaHeartbeat className="text-orange-500" />,
    Card_Office: <FaCreditCard className="text-red-500" />,
    Bed_Management: <FaBed className="text-teal-500" />,
    Human_Resource: <FaUserTie className="text-gray-500" />
  };

  const departmentColors = {
    Doctor: 'bg-teal-100 text-teal-800',
    Nurse: 'bg-emerald-100 text-emerald-800',
    Pharma: 'bg-purple-100 text-purple-800',
    Lab: 'bg-yellow-100 text-yellow-800',
    Radio: 'bg-indigo-100 text-indigo-800',
    Midwife: 'bg-pink-100 text-pink-800',
    Triage: 'bg-orange-100 text-orange-800',
    Card_Office: 'bg-red-100 text-red-800',
    Bed_Management: 'bg-teal-100 text-teal-800',
    Human_Resource: 'bg-gray-100 text-gray-800'
  };

  const wards = ['OPD', 'EME', 'ANC'];
  const staffTypes = ['Doctor', 'Nurse', 'Pharma', 'Lab', 'Triage'];
  const ageIntervals = [
    { label: 'All Ages', value: 'all' },
    { label: '20-30 years', value: '20-30', min: 20, max: 30 },
    { label: '31-40 years', value: '31-40', min: 31, max: 40 },
    { label: '41-50 years', value: '41-50', min: 41, max: 50 },
    { label: '51-60 years', value: '51-60', min: 51, max: 60 },
    { label: '60+ years', value: '60+', min: 61, max: 200 }
  ];

  const navigate = useNavigate();
  const API_URL = 'http://localhost:5001';
  const SOCKET_URL = 'http://localhost:5001';

  // Handle file attachment for sending report
  const handleFileAttachment = (e) => {
    const files = Array.from(e.target.files);
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    const validFiles = files.filter(file => {
      if (!validTypes.includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Only images, PDF, and DOC files are allowed.`);
        return false;
      }
      if (file.size > maxSize) {
        alert(`File too large: ${file.name}. Max size is 5MB.`);
        return false;
      }
      return true;
    });
    
    setReportFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...validFiles]
    }));
    
    // Create preview URLs for images
    validFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachmentPreview(prev => [...prev, { name: file.name, url: e.target.result, type: file.type }]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachmentPreview(prev => [...prev, { name: file.name, url: null, type: file.type }]);
      }
    });
  };

  const removeAttachment = (index) => {
    setReportFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
    setAttachmentPreview(prev => prev.filter((_, i) => i !== index));
  };

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('No token found, skipping socket connection');
      return;
    }

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected successfully');
      setSocketConnectionStatus('connected');
      
      const hospitalId = user?.hospital_id || profileData?.hospital_id;
      if (hospitalId) {
        const adminRoom = `hospital_${hospitalId}_admin`;
        console.log(`📡 Joining admin room: ${adminRoom}`);
        socketRef.current.emit('join', adminRoom);
      }
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setSocketConnectionStatus('disconnected');
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setSocketConnectionStatus('disconnected');
    });

    // Listen for new reports from doctors
    socketRef.current.on('new_report_from_doctor', (data) => {
      console.log('📬 New report received from doctor:', data);
      
      setRealTimeNotification({
        id: Date.now(),
        type: 'report',
        title: 'New Report from Doctor',
        message: `${data.sender_name} (${data.sender_department}) sent: "${data.title}"`,
        priority: data.priority,
        sender: data.sender_name,
        reportId: data.report_id,
        timestamp: new Date()
      });
      
      setTimeout(() => {
        setRealTimeNotification(prev => prev?.id === data.report_id ? null : prev);
      }, 6000);
      
      fetchDashboardData();
    });

// Update the report_reply_from_doctor listener (around line 200)
socketRef.current.on('report_reply_from_doctor', (data) => {
  console.log('💬 New reply received from doctor:', data);
  
  setRealTimeNotification({
    id: Date.now(),
    type: 'reply',
    title: 'New Reply from Doctor',
    message: `Dr. ${data.sender_name} replied to: "${data.title}"`,
    priority: data.priority,
    sender: data.sender_name,
    reportId: data.parent_report_id,
    replyId: data.report_id,
    timestamp: new Date()
  });
  
  setTimeout(() => {
    setRealTimeNotification(prev => prev?.id === data.parent_report_id ? null : prev);
  }, 6000);
  
  // ✅ FIX: Refresh both inbox AND outbox to show the reply
  fetchDashboardData(); // This already refreshes both inbox and outbox
});

    socketRef.current.on('report_opened_by_doctor', (data) => {
      console.log('👁️ Report opened by doctor:', data);
    });

    return () => {
      console.log('🔌 Cleaning up socket connection');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user?.hospital_id, profileData?.hospital_id]);

  // ==================== REAL-TIME NOTIFICATION COMPONENT ====================
  const RealTimeNotification = () => {
    if (!realTimeNotification) return null;
    
    const priorityColors = {
      low: 'border-teal-500 bg-teal-50',
      medium: 'border-yellow-500 bg-yellow-50',
      high: 'border-orange-500 bg-orange-50',
      urgent: 'border-red-500 bg-red-50 animate-pulse'
    };
    
    const priorityIcons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      urgent: '🔴'
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
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                realTimeNotification.type === 'reply' ? 'bg-purple-100' : 'bg-teal-100'
              }`}>
                {realTimeNotification.type === 'reply' ? '💬' : '📬'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-gray-900">
                  {realTimeNotification.title}
                </p>
                <span className="text-xs text-gray-400 ml-2">
                  {priorityIcons[realTimeNotification.priority]} {realTimeNotification.priority}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {realTimeNotification.message}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>🕒 {new Date(realTimeNotification.timestamp).toLocaleTimeString()}</span>
                <span>👨‍⚕️ {realTimeNotification.sender}</span>
              </div>
            </div>
            <button
              onClick={() => setRealTimeNotification(null)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimes className="text-sm" />
            </button>
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
    
    const config = statusConfig[socketConnectionStatus] || statusConfig.connecting;
    
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
        <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
        <span className="text-xs text-gray-600">{config.icon} {config.text}</span>
      </div>
    );
  };

  useEffect(() => {
    fetchDashboardData();
    fetchProfile();
    if (activeTab === 'reports') {
      fetchReportsData();
      if (reportSubTab === 'personnel') {
        fetchPersonnelData();
      } else {
        fetchStatusData();
      }
      fetchRecommendations();
    }
    
    const interval = setInterval(() => {
      if (activeTab === 'reports') {
        autoRefreshData();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [activeTab, currentPage, searchTerm, departmentFilter, reportSubTab, selectedWard, selectedStaffType, dateRange]);

  useEffect(() => {
    processStaffStatistics();
    processStaffByWard();
  }, [staff]);

  useEffect(() => {
    filterStaffByAge();
  }, [staff, selectedWard, selectedAgeInterval]);

  const autoRefreshData = async () => {
    setRefreshing(true);
    await fetchPersonnelData();
    await fetchStatusData();
    await fetchRecommendations();
    setRefreshing(false);
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hospital/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const hospital = res.data.hospital;
        const kebeleAdmin = hospital.kebele_admin || {};
        setProfileData({
          first_name: hospital.first_name || '',
          middle_name: hospital.middle_name || '',
          last_name: hospital.last_name || '',
          gender: hospital.gender || '',
          age: hospital.age || '',
          phone: hospital.phone || '',
          email: hospital.email || '',
          hospital_name: hospital.hospital_name || '',
          service_type: hospital.service_type || '',
          hospital_type: hospital.hospital_type || '',
          kebele_name: kebeleAdmin.kebele_name || '',
          address: hospital.address || '',
          website: hospital.website || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/hospital/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setIsEditingProfile(false);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating profile');
    }
  };

  const changePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('New passwords do not match');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/hospital/change-password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setShowPasswordModal(false);
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        alert('Password changed successfully!');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error changing password');
    }
  };

  const filterStaffByAge = () => {
    let baseStaff = selectedWard === 'all' ? staff : (staffByWard[selectedWard] || []);
    
    if (selectedAgeInterval !== 'all') {
      const interval = ageIntervals.find(i => i.value === selectedAgeInterval);
      if (interval) {
        baseStaff = baseStaff.filter(member => {
          const age = parseInt(member.age);
          return age >= interval.min && age <= interval.max;
        });
      }
    }
    
    setAgeFilteredStaff(baseStaff);
  };

  const processStaffStatistics = () => {
    const byDept = {};
    
    staff.forEach(member => {
      if (!byDept[member.department]) {
        byDept[member.department] = {
          total: 0,
          male: 0,
          female: 0,
          other: 0,
          staff: [],
          wards: {},
          ages: []
        };
      }
      
      byDept[member.department].total++;
      byDept[member.department].staff.push(member);
      if (member.age && !isNaN(member.age)) {
        byDept[member.department].ages.push(parseInt(member.age));
      }
      
      if (member.gender === 'Male') byDept[member.department].male++;
      else if (member.gender === 'Female') byDept[member.department].female++;
      else byDept[member.department].other++;
      
      if (member.ward) {
        if (!byDept[member.department].wards[member.ward]) {
          byDept[member.department].wards[member.ward] = 0;
        }
        byDept[member.department].wards[member.ward]++;
      }
    });
    
    setStaffByDepartment(byDept);
  };

  const processStaffByWard = () => {
    const byWard = { OPD: [], EME: [], ANC: [] };
    
    staff.forEach(member => {
      if (member.ward && byWard[member.ward]) {
        byWard[member.ward].push(member);
      }
    });
    
    setStaffByWard(byWard);
  };

  const getGenderDistribution = () => {
    const filteredStaff = selectedWard === 'all' ? staff : (staffByWard[selectedWard] || []);
    
    return {
      male: filteredStaff.filter(s => s.gender === 'Male').length,
      female: filteredStaff.filter(s => s.gender === 'Female').length,
      other: filteredStaff.filter(s => s.gender !== 'Male' && s.gender !== 'Female').length
    };
  };

  const fetchPersonnelData = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.get(`${API_URL}/api/hospital/staff`, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      console.error('Error fetching personnel data:', error);
    }
  };

  const fetchStatusData = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      
      let endpoint = '';
      
      if (selectedStaffType === 'Doctor') {
        endpoint = `${API_URL}/api/hospital/doctors/performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      } else if (selectedStaffType === 'Nurse') {
        endpoint = `${API_URL}/api/hospital/nurses/performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      } else if (selectedStaffType === 'Lab') {
        endpoint = `${API_URL}/api/hospital/lab/performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      } else if (selectedStaffType === 'Pharma') {
        endpoint = `${API_URL}/api/hospital/pharmacy/performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      } else if (selectedStaffType === 'Triage') {
        endpoint = `${API_URL}/api/hospital/triage/performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      }
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setStaffPerformanceData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching status data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [patientStatsRes, staffCountRes] = await Promise.all([
        axios.get(`${API_URL}/api/hospital/patients/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/hospital/staff/count-by-department`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const recommendationsList = [];
      
      if (patientStatsRes.data.success && staffCountRes.data.success) {
        const totalPatients = patientStatsRes.data.totalPatients || 0;
        const doctors = staffCountRes.data.data?.doctor || 0;
        const nurses = staffCountRes.data.data?.nurse || 0;
        
        const doctorRatio = totalPatients / (doctors || 1);
        const nurseRatio = totalPatients / (nurses || 1);
        
        if (doctorRatio > 20) {
          recommendationsList.push({
            type: 'warning',
            message: `⚠️ Doctor-to-Patient ratio is ${doctorRatio.toFixed(1)}:1. Recommended ratio is 1:20. Consider hiring ${Math.ceil(doctorRatio - 20)} more doctors.`
          });
        } else {
          recommendationsList.push({
            type: 'success',
            message: `✅ Doctor-to-Patient ratio is ${doctorRatio.toFixed(1)}:1. Optimal.`
          });
        }
        
        if (nurseRatio > 10) {
          recommendationsList.push({
            type: 'warning',
            message: `⚠️ Nurse-to-Patient ratio is ${nurseRatio.toFixed(1)}:1. Recommended ratio is 1:10. Consider hiring ${Math.ceil(nurseRatio - 10)} more nurses.`
          });
        } else {
          recommendationsList.push({
            type: 'success',
            message: `✅ Nurse-to-Patient ratio is ${nurseRatio.toFixed(1)}:1. Optimal.`
          });
        }
      }
      
      setRecommendations(recommendationsList);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

const fetchDashboardData = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    const [statsRes, inboxRes, outboxRes, staffRes, notifRes] = await Promise.all([
      axios.get(`${API_URL}/api/hospital/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_URL}/api/hospital/reports/inbox?page=${currentPage}&search=${searchTerm}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_URL}/api/hospital/reports/outbox?page=${currentPage}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_URL}/api/hospital/staff?page=${currentPage}&search=${searchTerm}&department=${departmentFilter}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_URL}/api/hospital/notifications?limit=5`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    if (statsRes.data.success) setStats(statsRes.data.stats);
    if (inboxRes.data.success) {
      setInbox(inboxRes.data.reports);
      setTotalPages(inboxRes.data.totalPages);
      setUnreadCount(inboxRes.data.unreadCount);
    }
    if (outboxRes.data.success) {
      setOutbox(outboxRes.data.reports);
      console.log('📤 Outbox reports:', outboxRes.data.reports); // Debug log
    }
    if (staffRes.data.success) {
      setStaff(staffRes.data.staff);
    }
    if (notifRes.data.success) {
      setNotifications(notifRes.data.notifications);
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
  } finally {
    setLoading(false);
  }
};

  const fetchReportsData = async () => {
    // Keep existing fetchReportsData function
  };

  const fetchKebeleAdmin = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hospital/kebele-admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setKebeleAdmin(res.data.kebele_admin);
      }
    } catch (error) {
      console.error('Error fetching kebele admin:', error);
    }
  };

  const fetchAllStaffRecipients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hospital/staff/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setRecipients(res.data.staff);
      }
    } catch (error) {
      console.error('Error fetching staff recipients:', error);
    }
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('title', reportFormData.title);
      formData.append('subject', reportFormData.subject);
      formData.append('body', reportFormData.body);
      formData.append('priority', reportFormData.priority);
      formData.append('recipient_type', recipientType);
      formData.append('recipient_id', reportFormData.recipient_id);
      
      reportFormData.attachments.forEach((file, index) => {
        formData.append('attachments', file);
      });
      
      const res = await axios.post(`${API_URL}/api/hospital/reports/send`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        setShowReportModal(false);
        setRecipientType('');
        setReportFormData({
          title: '',
          subject: '',
          body: '',
          priority: 'medium',
          recipient_type: '',
          recipient_id: '',
          attachments: []
        });
        setAttachmentPreview([]);
        alert('Report sent successfully!');
        fetchDashboardData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error sending report');
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const submitData = { ...staffFormData };
      
      if (noWardDepartments.includes(staffFormData.department)) {
        delete submitData.ward;
      }
      
      const res = await axios.post(`${API_URL}/api/hospital/staff`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setStaffFormData({
          first_name: '',
          middle_name: '',
          last_name: '',
          gender: 'Male',
          age: '',
          email: '',
          password: '',
          phone: '',
          department: 'Doctor',
          ward: ''
        });
        setShowStaffModal(false);
        fetchDashboardData();
        alert(`${staffFormData.department} staff member created successfully!`);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating staff member');
    }
  };

  const markNotificationAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/hospital/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/hospital/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDashboardData();
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

  const exportToCSV = () => {
    // Keep existing export function
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
    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      urgent: '🔴'
    };
    return icons[priority] || '🟡';
  };

  const getDepartmentIcon = (department) => {
    return departmentIcons[department] || <FaUserCircle className="text-gray-500" />;
  };

  const getDepartmentColor = (department) => {
    return departmentColors[department] || 'bg-gray-100 text-gray-800';
  };

  const departments = [
    'Doctor', 'Nurse', 'Pharma', 'Lab', 'Radio', 
    'Midwife', 'Triage', 'Card_Office', 'Bed_Management', 'Human_Resource'
  ];

  const viewStaffDetails = (staffMember) => {
    setSelectedStaff(staffMember);
    setShowStaffDetailModal(true);
  };

  const viewReportDetails = (report) => {
    setSelectedReport(report);
    setShowReportDetailModal(true);
    if (!report.is_opened) {
      markReportAsRead(report.id);
    }
  };

  const markReportAsRead = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/hospital/reports/${reportId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error marking report as read:', error);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      alert('Please enter a reply message');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('body', replyText);
      if (replyAttachment) {
        formData.append('attachment', replyAttachment);
      }
      
      const res = await axios.post(`${API_URL}/api/hospital/reports/${selectedReport.id}/reply`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        setShowReplyModal(false);
        setReplyText('');
        setReplyAttachment(null);
        alert('Reply sent successfully!');
        fetchDashboardData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error sending reply');
    }
  };

  const needsWardSelection = !noWardDepartments.includes(staffFormData.department);

  const renderAgeFilter = () => {
    const gender = getGenderDistribution();
    const total = gender.male + gender.female + gender.other;
    
    return (
      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-700 text-sm mb-2">Filter by Age</h3>
            <select
              value={selectedAgeInterval}
              onChange={(e) => setSelectedAgeInterval(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              {ageIntervals.map(interval => (
                <option key={interval.value} value={interval.value}>
                  {interval.label}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-gray-500">
              {ageFilteredStaff.length} staff members
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-700 text-sm mb-2">Gender Distribution</h3>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs">👨 Male</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${total > 0 ? (gender.male / total) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-xs font-bold">{gender.male}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs">👩 Female</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 rounded-full" style={{ width: `${total > 0 ? (gender.female / total) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-xs font-bold">{gender.female}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStaffCards = () => {
    if (ageFilteredStaff.length === 0) {
      return (
        <div className="text-center py-8">
          <FaUsers className="text-3xl text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No staff members in this category</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ageFilteredStaff.map((member) => (
          <div
            key={member.id}
            className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => viewStaffDetails(member)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-lg">
                {getDepartmentIcon(member.department)}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 text-sm">{member.full_name}</h4>
                <p className="text-xs text-teal-600">{member.department}</p>
              </div>
            </div>
            <div className="space-y-0.5 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <FaUserCircle className="text-gray-400 text-xs" />
                <span>{member.gender}, {member.age} yrs</span>
              </div>
              {member.ward && (
                <div className="flex items-center gap-1">
                  <FaHospitalAlt className="text-gray-400 text-xs" />
                  <span>Ward: {member.ward}</span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-2 border-t border-gray-100">
              <span className={`text-xs px-2 py-0.5 rounded-full ${getDepartmentColor(member.department)}`}>
                {member.department}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

const renderStatusTable = () => {
  if (refreshing && staffPerformanceData.length === 0) {
    return (
      <div className="text-center py-8">
        <FaSpinner className="animate-spin text-2xl text-teal-600 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Loading performance data...</p>
      </div>
    );
  }
  
  if (staffPerformanceData.length === 0) {
    return (
      <div className="text-center py-8">
        <FaChartLine className="text-3xl text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">No data available for {selectedStaffType}s</p>
      </div>
    );
  }
  
  if (selectedStaffType === 'Doctor') {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admitted</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discharged</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referred</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severe</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {staffPerformanceData.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer transition" onClick={() => {
                const staffMember = staff.find(s => s.id === doc.id);
                if (staffMember) viewStaffDetails(staffMember);
              }}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                  <div className="text-xs text-gray-500">Doctor</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-teal-600 font-medium">{doc.admitted}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-emerald-600 font-medium">{doc.discharged}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600 font-medium">{doc.referred}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${doc.severe > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {doc.severe}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-purple-600">{doc.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance Metrics</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {staffPerformanceData.map((staff) => (
            <tr key={staff.id} className="hover:bg-gray-50 cursor-pointer transition">
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                <div className="text-xs text-gray-500">{selectedStaffType}</div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {Object.entries(staff).filter(([key]) => !['id', 'name', 'total'].includes(key)).map(([key, val]) => (
                  <span key={key} className="inline-block mr-2 mb-1 text-xs bg-gray-100 px-2 py-1 rounded-full">
                    {key}: <strong>{val}</strong>
                  </span>
                ))}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-teal-600">{staff.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-3xl text-teal-600 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Loading Hospital Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex">
      {/* Real-time Notification */}
      <RealTimeNotification />
      
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        @keyframes glow {
          0% { box-shadow: 0 0 5px rgba(13,148,136,0.2); }
          50% { box-shadow: 0 0 20px rgba(13,148,136,0.5); }
          100% { box-shadow: 0 0 5px rgba(13,148,136,0.2); }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
        .animate-glow {
          animation: glow 2s infinite;
        }
      `}</style>

      {/* Sidebar - Modern */}
      <div className={`bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      } shadow-2xl`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                  <FaHospital className="text-white text-sm" />
                </div>
                <span className="font-bold text-base tracking-tight">Hospital Admin</span>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg mx-auto">
                <FaHospital className="text-white text-sm" />
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
                activeTab === 'dashboard' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'
              }`}
            >
              <FaHome className="text-lg" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
                activeTab === 'staff' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'
              }`}
            >
              <FaUsers className="text-lg" />
              {!sidebarCollapsed && <span>Staff Management</span>}
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
                activeTab === 'reports' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'
              }`}
            >
              <FaChartBar className="text-lg" />
              {!sidebarCollapsed && <span>Reports & Analytics</span>}
            </button>

            <button
              onClick={() => setActiveTab('inbox')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 relative text-sm ${
                activeTab === 'inbox' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'
              }`}
            >
              <FaInbox className="text-lg" />
              {!sidebarCollapsed && <span>Inbox</span>}
              {unreadCount > 0 && (
                <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('outbox')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
                activeTab === 'outbox' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'
              }`}
            >
              <FaPaperPlane className="text-lg" />
              {!sidebarCollapsed && <span>Sent Reports</span>}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
                activeTab === 'profile' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'
              }`}
            >
              <FaUserCircle className="text-lg" />
              {!sidebarCollapsed && <span>Profile</span>}
            </button>
          </nav>

          {sidebarCollapsed && (
            <div className="mt-8 text-center">
              <div className="text-lg font-bold text-teal-400">{unreadCount}</div>
              <div className="text-[10px] text-slate-400">Unread</div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Modern */}
        <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-40 border-b border-gray-100">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  {activeTab === 'dashboard' && 'Hospital Dashboard'}
                  {activeTab === 'staff' && 'Staff Management'}
                  {activeTab === 'reports' && 'Reports & Analytics'}
                  {activeTab === 'inbox' && 'Inbox'}
                  {activeTab === 'outbox' && 'Sent Reports'}
                  {activeTab === 'profile' && 'My Profile'}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Welcome back, {profileData.first_name || user?.full_name || 'Admin'}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {/* Socket Status Indicator */}
                <SocketStatusIndicator />
                
                {refreshing && (
                  <FaSpinner className="animate-spin text-teal-500 text-base" />
                )}
                <button
                  onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                  className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FaBell className="text-lg text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm font-medium"
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Notification Panel - Modern */}
        <AnimatePresence>
          {showNotificationPanel && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute right-6 top-20 w-80 bg-white rounded-xl shadow-2xl z-50 border border-gray-100 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-teal-50 to-emerald-50">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-teal-600 hover:text-teal-800"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${
                        !notif.is_read ? 'bg-teal-50' : ''
                      }`}
                      onClick={() => markNotificationAsRead(notif.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {notif.type === 'report_sent' && <FaPaperPlane className="text-teal-500 text-xs" />}
                          {notif.type === 'report_opened' && <FaEnvelopeOpen className="text-purple-500 text-xs" />}
                          {notif.type === 'reply' && <FaReply className="text-emerald-500 text-xs" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-800">{notif.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <FaBell className="text-3xl mx-auto mb-2 text-gray-300" />
                    <p className="text-xs">No notifications</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Dashboard Tab - Modern Cards */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Inbox</p>
                      <p className="text-3xl font-bold text-teal-600">{stats?.inbox || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                      <FaInbox className="text-xl text-teal-600" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-amber-600">{stats?.unread || 0} unread</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Outbox</p>
                      <p className="text-3xl font-bold text-emerald-600">{stats?.outbox || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <FaPaperPlane className="text-xl text-emerald-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Total Staff</p>
                      <p className="text-3xl font-bold text-purple-600">{staff.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <FaUsers className="text-xl text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Departments</p>
                      <p className="text-3xl font-bold text-gray-600">{Object.keys(staffByDepartment).length}</p>
                    </div>
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <FaHospitalAlt className="text-xl text-gray-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button onClick={() => { setShowReportModal(true); fetchKebeleAdmin(); fetchAllStaffRecipients(); }} className="p-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2">
                    <FaPaperPlane /> New Report
                  </button>
                  <button onClick={() => { setActiveTab('staff'); setShowStaffModal(true); }} className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2">
                    <FaPlus /> Add Staff
                  </button>
                  <button onClick={() => setActiveTab('reports')} className="p-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2">
                    <FaChartBar /> View Reports
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Staff Tab - Modern */}
          {activeTab === 'staff' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Staff Management</h2>
                <button onClick={() => setShowStaffModal(true)} className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm font-medium flex items-center gap-2">
                  <FaPlus /> Add Staff
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staff.map((member) => (
                  <div key={member.id} className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => viewStaffDetails(member)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm">
                        {getDepartmentIcon(member.department)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm">{member.full_name}</h3>
                        <p className="text-xs text-teal-600">{member.department}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 truncate">{member.email}</div>
                    <div className="mt-2 flex justify-between text-xs">
                      <span>{member.gender}, {member.age} yrs</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{member.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reports Tab - Modern */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex gap-2">
                    <button onClick={() => setReportSubTab('personnel')} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      reportSubTab === 'personnel' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                      <FaUsers className="inline mr-2 text-xs" /> Personnel
                    </button>
                    <button onClick={() => setReportSubTab('status')} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      reportSubTab === 'status' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                      <FaChartLine className="inline mr-2 text-xs" /> Status
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowDatePicker(!showDatePicker)} className="px-3 py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200 transition"><FaCalendarWeek /></button>
                    <button onClick={exportToCSV} className="px-3 py-2 bg-green-100 text-green-700 rounded-xl text-sm hover:bg-green-200 transition"><FaFileExport /></button>
                    <button onClick={autoRefreshData} className="px-3 py-2 bg-teal-100 text-teal-700 rounded-xl text-sm hover:bg-teal-200 transition"><FaSpinner className={refreshing ? 'animate-spin' : ''} /></button>
                  </div>
                </div>
                {showDatePicker && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl flex gap-3 flex-wrap">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                      <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">End Date</label>
                      <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                    </div>
                    <button onClick={() => { fetchStatusData(); setShowDatePicker(false); }} className="self-end px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition">Apply</button>
                  </div>
                )}
              </div>

              {reportSubTab === 'personnel' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Staff by Ward</h2>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setSelectedWard('all')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        selectedWard === 'all' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>All Staff ({staff.length})</button>
                      {wards.map(ward => <button key={ward} onClick={() => setSelectedWard(ward)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        selectedWard === ward ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>{ward} ({staffByWard[ward]?.length || 0})</button>)}
                    </div>
                  </div>

                  {renderAgeFilter()}
                  
                  <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">{selectedWard === 'all' ? 'All Staff' : `${selectedWard} Ward Staff`}</h2>
                    {renderStaffCards()}
                  </div>

                  {recommendations.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                      <h2 className="text-lg font-bold text-gray-800 mb-4">Staff-to-Patient Ratio Recommendations</h2>
                      {recommendations.map((rec, idx) => (
                        <div key={idx} className={`p-4 rounded-xl text-sm mb-3 ${rec.type === 'warning' ? 'bg-amber-50 border-l-4 border-amber-500' : 'bg-emerald-50 border-l-4 border-emerald-500'}`}>
                          <p className={rec.type === 'warning' ? 'text-amber-800' : 'text-emerald-800'}>{rec.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {reportSubTab === 'status' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Staff Performance by Type</h2>
                    <div className="flex gap-2 flex-wrap">
                      {staffTypes.map(type => (
                        <button key={type} onClick={() => { setSelectedStaffType(type); fetchStatusData(); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                          selectedStaffType === type ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                          {type === 'Doctor' && <FaUserMd className="text-xs" />}
                          {type === 'Nurse' && <FaUserNurse className="text-xs" />}
                          {type === 'Lab' && <FaFlask className="text-xs" />}
                          {type === 'Pharma' && <FaPills className="text-xs" />}
                          {type === 'Triage' && <FaHeartbeat className="text-xs" />}
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold text-gray-800">{selectedStaffType} Performance Report <span className="text-xs font-normal text-gray-500">({dateRange.startDate} to {dateRange.endDate})</span></h2>
                      <div className="text-xs text-gray-500">Total: {staffPerformanceData.length}</div>
                    </div>
                    {renderStatusTable()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inbox Tab - Modern */}
          {activeTab === 'inbox' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-800">Inbox</h2>
                  {unreadCount > 0 && (
                    <span className="px-3 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <button onClick={() => { setShowReportModal(true); fetchKebeleAdmin(); fetchAllStaffRecipients(); }} className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm font-medium flex items-center gap-2">
                  <FaPlus /> New Report
                </button>
              </div>
              <div className="space-y-4">
                {inbox.map((report) => (
                  <div 
                    key={report.id} 
                    className={`border rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md ${!report.is_opened ? 'border-teal-300 bg-teal-50' : 'border-gray-200 bg-white'}`}
                    onClick={() => viewReportDetails(report)}
                  >
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        {!report.is_opened ? (
                          <FaEnvelope className="text-teal-500 text-sm" />
                        ) : (
                          <FaEnvelopeOpen className="text-gray-400 text-sm" />
                        )}
                        <h3 className="font-semibold text-gray-800">{report.title}</h3>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${getPriorityBadge(report.priority)}`}>
                        <span>{getPriorityIcon(report.priority)}</span> {report.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.body}</p>
                    <div className="flex justify-between items-center mt-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-xs text-teal-700">
                          {report.sender_full_name?.charAt(0) || 'D'}
                        </div>
                        <p className="text-xs text-gray-600">Dr. {report.sender_full_name}</p>
                      </div>
                      <p className="text-xs text-gray-400">{new Date(report.sent_at).toLocaleString()}</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); viewReportDetails(report); }}
                        className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs hover:bg-teal-600 transition flex items-center gap-1"
                      >
                        <FaEye size={10} /> View
                      </button>
                      {report.sender_type === 'staff' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedReport(report); setShowReplyModal(true); }}
                          className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs hover:bg-emerald-600 transition flex items-center gap-1"
                        >
                          <FaReply size={10} /> Reply
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {inbox.length === 0 && (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <FaInbox className="text-5xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No reports in inbox</p>
                  <p className="text-xs text-gray-400 mt-1">Reports from doctors will appear here</p>
                </div>
              )}
            </div>
          )}

          {/* Outbox Tab - Modern */}
      {/* Outbox Tab - Modern */}
{activeTab === 'outbox' && (
  <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-gray-800">Sent Reports & Conversations</h2>
        {outbox.filter(r => !r.is_reply).length > 0 && (
          <span className="px-3 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">
            {outbox.filter(r => !r.is_reply).length} sent
          </span>
        )}
        {outbox.filter(r => r.is_reply).length > 0 && (
          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
            {outbox.filter(r => r.is_reply).length} replies
          </span>
        )}
      </div>
      <button onClick={() => fetchDashboardData()} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-medium">Refresh</button>
    </div>
    <div className="space-y-4">
      {outbox.map((report) => (
        <div 
          key={report.id} 
          className={`border rounded-xl p-5 cursor-pointer hover:shadow-md transition-all duration-200 ${
            report.is_reply ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-white'
          }`} 
          onClick={() => viewReportDetails(report)}
        >
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {report.is_reply ? (
                <FaReply className="text-purple-500 text-sm" />
              ) : (
                <FaPaperPlane className="text-gray-400 text-sm" />
              )}
              <h3 className="font-semibold text-gray-800">
                {report.is_reply ? `Reply to: ${report.title}` : report.title}
              </h3>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${getPriorityBadge(report.priority)}`}>
              <span>{getPriorityIcon(report.priority)}</span> {report.priority}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.body}</p>
          <div className="flex justify-between items-center mt-3">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                report.is_reply ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {report.is_reply ? '📩' : (report.display_recipient?.charAt(0) || 'R')}
              </div>
              <p className="text-xs text-gray-600">
                {report.is_reply ? `Reply from: Dr. ${report.sender_full_name}` : `To: ${report.display_recipient}`}
              </p>
            </div>
            <p className="text-xs text-gray-400">{new Date(report.sent_at).toLocaleString()}</p>
          </div>
          <div className="mt-3 flex gap-2">
            {report.is_reply && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                Reply to your report
              </span>
            )}
            <span className={`text-xs ${report.is_opened ? 'text-green-600' : 'text-gray-400'}`}>
              {report.is_opened ? '✓ Viewed' : '✗ Not viewed yet'}
            </span>
          </div>
        </div>
      ))}
    </div>
    {outbox.length === 0 && (
      <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <FaPaperPlane className="text-5xl text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No sent reports or replies</p>
        <p className="text-xs text-gray-400 mt-1">Click "New Report" to send a report</p>
      </div>
    )}
  </div>
)}

          {/* Profile Tab - Modern */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              {/* Profile Header */}
              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-8 py-10">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                      <FaUserCircle className="text-teal-600 text-6xl" />
                    </div>
                    <button className="absolute bottom-0 right-0 bg-teal-500 p-2 rounded-full text-white hover:bg-teal-600 transition shadow-lg">
                      <FaCamera className="text-xs" />
                    </button>
                  </div>
                  <div className="text-white">
                    <h2 className="text-2xl font-bold mb-1">{profileData.first_name} {profileData.last_name}</h2>
                    <p className="text-teal-100 flex items-center gap-2 flex-wrap">
                      <FaBuilding className="text-sm" /> {profileData.hospital_name}
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs ml-2">{profileData.service_type}</span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Administrator Information</h3>
                  {!isEditingProfile ? (
                    <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition text-sm font-medium shadow-md">
                      <FaEdit /> Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-sm">Cancel</button>
                      <button onClick={updateProfile} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-sm shadow-md">
                        <FaSave /> Save Changes
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="text-md font-semibold text-teal-600 mb-4 flex items-center gap-2"><FaUserCircle /> Personal Info</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">First Name</label>
                          {isEditingProfile ? (
                            <input type="text" value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500" />
                          ) : (
                            <p className="text-gray-800 font-medium">{profileData.first_name || 'Not set'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Last Name</label>
                          {isEditingProfile ? (
                            <input type="text" value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                          ) : (
                            <p className="text-gray-800 font-medium">{profileData.last_name || 'Not set'}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Gender</label>
                          {isEditingProfile ? (
                            <select value={profileData.gender} onChange={(e) => setProfileData({...profileData, gender: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
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
                          <label className="block text-xs text-gray-500 mb-1">Age</label>
                          {isEditingProfile ? (
                            <input type="number" value={profileData.age} onChange={(e) => setProfileData({...profileData, age: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                          ) : (
                            <p className="text-gray-800">{profileData.age || 'Not set'} years</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Phone</label>
                        {isEditingProfile ? (
                          <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                        ) : (
                          <p className="text-gray-800">{profileData.phone || 'Not set'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hospital Information */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="text-md font-semibold text-teal-600 mb-4 flex items-center gap-2"><FaBuilding /> Hospital Info</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Hospital Name</label>
                        {isEditingProfile ? (
                          <input type="text" value={profileData.hospital_name} onChange={(e) => setProfileData({...profileData, hospital_name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                        ) : (
                          <p className="text-gray-800 font-medium">{profileData.hospital_name || 'Not set'}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Service Type</label>
                          {isEditingProfile ? (
                            <select value={profileData.service_type} onChange={(e) => setProfileData({...profileData, service_type: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                              <option value="">Select</option>
                              <option>Private</option>
                              <option>Public</option>
                            </select>
                          ) : (
                            <p className="text-gray-800">{profileData.service_type || 'Not set'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Hospital Type</label>
                          {isEditingProfile ? (
                            <select value={profileData.hospital_type} onChange={(e) => setProfileData({...profileData, hospital_type: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                              <option value="">Select</option>
                              <option>General</option>
                              <option>Specialized</option>
                              <option>Primary</option>
                            </select>
                          ) : (
                            <p className="text-gray-800">{profileData.hospital_type || 'Not set'}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Kebele</label>
                        <p className="text-gray-800">{profileData.kebele_name || 'Not set'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="text-md font-semibold text-teal-600 mb-4 flex items-center gap-2"><FaEnvelopeIcon /> Contact Info</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                        <p className="text-gray-800">{profileData.email}</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Address</label>
                        {isEditingProfile ? (
                          <textarea value={profileData.address} onChange={(e) => setProfileData({...profileData, address: e.target.value})} rows="2" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Hospital address..." />
                        ) : (
                          <p className="text-gray-800">{profileData.address || 'Not set'}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Website</label>
                        {isEditingProfile ? (
                          <input type="url" value={profileData.website} onChange={(e) => setProfileData({...profileData, website: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="https://..." />
                        ) : (
                          <p className="text-gray-800">{profileData.website || 'Not set'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Account Settings */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="text-md font-semibold text-teal-600 mb-4 flex items-center gap-2"><FaKey /> Account Settings</h4>
                    <div className="space-y-4">
                      <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-4 py-2 border border-teal-600 text-teal-600 rounded-xl hover:bg-teal-50 transition text-sm font-medium">
                        <FaKey /> Change Password
                      </button>
                      <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-medium shadow-md">
                        <FaSignOutAlt /> Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Staff Modal - Modern */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Add Hospital Staff</h2>
                <button onClick={() => setShowStaffModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition">×</button>
              </div>
              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><input type="text" placeholder="First Name" value={staffFormData.first_name} onChange={(e) => setStaffFormData({...staffFormData, first_name: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500" required /></div>
                  <div><input type="text" placeholder="Middle Name" value={staffFormData.middle_name} onChange={(e) => setStaffFormData({...staffFormData, middle_name: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" /></div>
                  <div><input type="text" placeholder="Last Name" value={staffFormData.last_name} onChange={(e) => setStaffFormData({...staffFormData, last_name: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" required /></div>
                  <div><select value={staffFormData.gender} onChange={(e) => setStaffFormData({...staffFormData, gender: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"><option>Male</option><option>Female</option><option>Other</option></select></div>
                  <div><input type="number" placeholder="Age" value={staffFormData.age} onChange={(e) => setStaffFormData({...staffFormData, age: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" required /></div>
                  <div className="md:col-span-2"><input type="email" placeholder="Email" value={staffFormData.email} onChange={(e) => setStaffFormData({...staffFormData, email: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" required /></div>
                  <div className="md:col-span-2"><input type="tel" placeholder="Phone" value={staffFormData.phone} onChange={(e) => setStaffFormData({...staffFormData, phone: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" /></div>
                  <div className="md:col-span-2"><select value={staffFormData.department} onChange={(e) => setStaffFormData({...staffFormData, department: e.target.value, ward: ''})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm">{departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}</select></div>
                  {needsWardSelection && <div className="md:col-span-2"><select value={staffFormData.ward} onChange={(e) => setStaffFormData({...staffFormData, ward: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" required><option value="">Select Ward</option>{wards.map(ward => <option key={ward} value={ward}>{ward}</option>)}</select></div>}
                  <div className="md:col-span-2"><input type="password" placeholder="Password" value={staffFormData.password} onChange={(e) => setStaffFormData({...staffFormData, password: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" required minLength="6" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowStaffModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-sm">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium">Create Staff</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Send Report Modal - Modern with Attachments */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaPaperPlane className="text-teal-500" /> Send New Report
                </h2>
                <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition">×</button>
              </div>
              <form onSubmit={handleSendReport} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Type</label>
                  <div className="flex gap-4">
                    {kebeleAdmin && (
                      <label className="flex items-center gap-2">
                        <input type="radio" value="kebele" checked={recipientType === 'kebele'} onChange={(e) => { setRecipientType(e.target.value); setReportFormData({...reportFormData, recipient_id: kebeleAdmin.id}); }} className="w-4 h-4 text-teal-600" />
                        <span>Kebele Admin ({kebeleAdmin?.kebele_name})</span>
                      </label>
                    )}
                    <label className="flex items-center gap-2">
                      <input type="radio" value="staff" checked={recipientType === 'staff'} onChange={(e) => { setRecipientType(e.target.value); setReportFormData({...reportFormData, recipient_id: ''}); }} className="w-4 h-4 text-teal-600" />
                      <span>Hospital Staff</span>
                    </label>
                  </div>
                </div>
                
                {recipientType === 'staff' && (
                  <select value={reportFormData.recipient_id} onChange={(e) => setReportFormData({...reportFormData, recipient_id: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500" required>
                    <option value="">Select Staff Member</option>
                    {recipients.map(s => <option key={s.id} value={s.id}>{s.full_name} - {s.department}</option>)}
                  </select>
                )}
                
                <select value={reportFormData.priority} onChange={(e) => setReportFormData({...reportFormData, priority: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500">
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
                
                <input type="text" placeholder="Title" value={reportFormData.title} onChange={(e) => setReportFormData({...reportFormData, title: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500" required />
                
                <textarea placeholder="Message" value={reportFormData.body} onChange={(e) => setReportFormData({...reportFormData, body: e.target.value})} rows="5" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 resize-none" required />
                
                {/* File Attachments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attachments <span className="text-xs text-gray-400">(Images, PDF, DOC - Max 5MB each)</span>
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileAttachment}
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    className="w-full p-2 border border-gray-200 rounded-xl text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  />
                  {attachmentPreview.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachmentPreview.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            {file.url ? (
                              <img src={file.url} alt={file.name} className="w-8 h-8 object-cover rounded" />
                            ) : (
                              <FaPaperclip className="text-gray-400" />
                            )}
                            <span className="text-sm text-gray-600 truncate max-w-[200px]">{file.name}</span>
                          </div>
                          <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:text-red-700">
                            <FaTrash size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowReportModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-sm">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium">Send Report</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal - Modern */}
      {showReplyModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaReply className="text-teal-500" /> Reply to Report
                </h2>
                <button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className="p-2 hover:bg-gray-100 rounded-full transition">×</button>
              </div>
              <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Original Report</p>
                <p className="text-sm font-medium text-gray-800">{selectedReport.title}</p>
                <p className="text-xs text-gray-400 mt-1">From: {selectedReport.sender_full_name}</p>
              </div>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows="5"
                placeholder="Type your reply here..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 resize-none"
              />
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setReplyAttachment(e.target.files[0])}
                  accept="image/*,.pdf,.doc,.docx"
                  className="w-full p-2 border border-gray-200 rounded-xl text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
                {replyAttachment && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <FaPaperclip /> {replyAttachment.name}
                    <button onClick={() => setReplyAttachment(null)} className="text-red-500 hover:text-red-700">Remove</button>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-sm">Cancel</button>
                <button onClick={handleSendReply} className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium">Send Reply</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Details Modal - Modern */}
      {showStaffDetailModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Staff Details</h2>
                <button onClick={() => { setShowStaffDetailModal(false); setSelectedStaff(null); }} className="p-2 hover:bg-gray-100 rounded-full transition">×</button>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center text-2xl">
                  {getDepartmentIcon(selectedStaff.department)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{selectedStaff.full_name}</h3>
                  <p className="text-teal-600 text-sm">{selectedStaff.department}</p>
                  {selectedStaff.ward && <p className="text-xs text-gray-500">Ward: {selectedStaff.ward}</p>}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">First Name</p>
                    <p className="font-medium text-gray-800">{selectedStaff.first_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Last Name</p>
                    <p className="font-medium text-gray-800">{selectedStaff.last_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Gender</p>
                    <p className="font-medium text-gray-800">{selectedStaff.gender}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Age</p>
                    <p className="font-medium text-gray-800">{selectedStaff.age} years</p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Contact</h4>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FaEnvelopeIcon className="text-gray-400 text-xs" />
                  <span>{selectedStaff.email}</span>
                </div>
                {selectedStaff.phone && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    <FaPhone className="text-gray-400 text-xs" />
                    <span>{selectedStaff.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Details Modal - Modern */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  {!selectedReport.is_opened ? <FaEnvelope className="text-teal-500" /> : <FaEnvelopeOpen className="text-gray-400" />}
                  <h2 className="text-xl font-bold text-gray-800">{selectedReport.title}</h2>
                </div>
                <button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className="p-2 hover:bg-gray-100 rounded-full transition">×</button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">From</p>
                    <p className="font-semibold text-gray-800">{selectedReport.sender_full_name}</p>
                    <p className="text-xs text-gray-400">{selectedReport.sender_title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Priority</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getPriorityBadge(selectedReport.priority)}`}>
                      <span>{getPriorityIcon(selectedReport.priority)}</span> {selectedReport.priority}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Date Received</p>
                  <p className="text-sm text-gray-700">{new Date(selectedReport.sent_at).toLocaleString()}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 mb-2">Message</p>
                  <p className="whitespace-pre-wrap text-gray-800">{selectedReport.body}</p>
                </div>

                {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Attachments</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedReport.attachments.map((att, idx) => (
                        <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-teal-600 hover:bg-teal-50 transition">
                          <FaPaperclip size={12} /> {att.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm grid grid-cols-2 gap-2 pt-2">
                  <p><strong>Status:</strong> {selectedReport.status}</p>
                  <p><strong>Type:</strong> {selectedReport.sender_type === 'staff' ? 'From Doctor' : 'From Admin'}</p>
                </div>

                {selectedReport.sender_type === 'staff' && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => { setShowReportDetailModal(false); setShowReplyModal(true); }}
                      className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 text-sm font-medium"
                    >
                      <FaReply /> Reply to Doctor
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal - Modern */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
                <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition">×</button>
              </div>
              <div className="space-y-4">
                <input type="password" placeholder="Current Password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500" />
                <input type="password" placeholder="New Password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500" />
                <input type="password" placeholder="Confirm New Password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500" />
                <div className="flex justify-end gap-3 pt-4">
                  <button onClick={() => setShowPasswordModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-sm">Cancel</button>
                  <button onClick={changePassword} className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium">Change Password</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalDashboard;