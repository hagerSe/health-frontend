import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import SignaturePad from 'react-signature-canvas';
import BedSelection from './BedSelection';
import PharmacyStatus from './PharmacyStatus';
import DischargeList from './DischargeList';
import EthiopianHierarchySelector from './EthiopianHierarchySelector';
import ScheduleViewer from '../components/ScheduleViewer';
import { 
  FaSpinner, FaBaby, FaStethoscope, FaCalendarAlt, FaHeartbeat, FaRuler, FaWeight, 
  FaSyringe, FaNotesMedical, FaUserMd, FaPlus, FaEye, FaCheck, FaTimes, FaSync, 
  FaSearch, FaFileAlt, FaBabyCarriage, FaPrescription, FaDiagnoses, FaHospitalUser, 
  FaSignOutAlt, FaBed, FaArrowRight, FaArrowLeft, FaPrint, FaDownload, FaHistory,
  FaFlask, FaMicroscope, FaClock, FaUserCircle, FaChevronLeft, FaChevronRight,
  FaInbox, FaPaperPlane, FaEnvelope, FaEnvelopeOpen, FaReply, FaKey, FaEdit as FaEditIcon,
  FaSave, FaChartLine, FaBell, FaUserCheck, FaUserClock, FaBuilding, FaUsers, FaIdCard
} from 'react-icons/fa';

const MidwifeDashboard = ({ user, onLogout }) => {
  // ==================== STATE MANAGEMENT ====================
  const [patients, setPatients] = useState([]);
  const [queuePatients, setQueuePatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [activeTab, setActiveTab] = useState('antenatal');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [notification, setNotification] = useState(null);
  const [realTimeNotification, setRealTimeNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [searchTerm, setSearchTerm] = useState('');
  const [showScheduleView, setShowScheduleView] = useState(false);
  
  // ==================== REFERRAL STATE ====================
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralType, setReferralType] = useState('internal');
  const [selectedInternalWard, setSelectedInternalWard] = useState('');
  const [externalReferralData, setExternalReferralData] = useState(null);
  const [referralSelectedBed, setReferralSelectedBed] = useState('');
  
  // ==================== DISCHARGE STATE ====================
  const [showDischargeLocationModal, setShowDischargeLocationModal] = useState(false);
  const [dischargeLocation, setDischargeLocation] = useState('');
  const [showDischargeList, setShowDischargeList] = useState(false);
  const [dischargedPatients, setDischargedPatients] = useState([]);
  
  // ==================== BED MANAGEMENT STATE ====================
  const [showBedListNotification, setShowBedListNotification] = useState(false);
  const [availableBedsList, setAvailableBedsList] = useState([]);
  const [selectedBed, setSelectedBed] = useState('');
  
  // ==================== PRESCRIPTION STATE ====================
  const [prescriptions, setPrescriptions] = useState([]);
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    route: 'oral',
    notes: ''
  });
  
  // ==================== DIAGNOSIS STATE ====================
  const [diagnosis, setDiagnosis] = useState({
    primary: '',
    icd10: '',
    secondary: '',
    notes: ''
  });
  
  // ==================== LAB STATE ====================
  const [labRequests, setLabRequests] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [newLabRequest, setNewLabRequest] = useState({
    testType: 'blood',
    testName: '',
    priority: 'routine',
    notes: ''
  });
  
  // ==================== ANC SPECIFIC STATES ====================
  const [antenatalData, setAntenatalData] = useState({
    gestational_weeks: '',
    edd: '',
    lmp: '',
    gravida: '',
    para: '',
    high_risk: false,
    risk_factors: []
  });
  
  const [vitalSigns, setVitalSigns] = useState({
    blood_pressure: '',
    heart_rate: '',
    temperature: '',
    weight: '',
    height: '',
    fundal_height: '',
    fetal_heart_rate: '',
    fetal_movement: 'normal'
  });
  
  const [visitNotes, setVisitNotes] = useState({
    complaints: '',
    examination: '',
    advice: '',
    next_appointment: ''
  });
  
  const [antenatalVisits, setAntenatalVisits] = useState([]);
  const [deliveryRecords, setDeliveryRecords] = useState([]);
  const [postnatalPatients, setPostnatalPatients] = useState([]);
  const [highRiskPatients, setHighRiskPatients] = useState([]);
  
  const [stats, setStats] = useState({
    antenatal: 0,
    postnatal: 0,
    deliveries: 0,
    highRisk: 0,
    upcomingAppointments: 0,
    dueThisWeek: 0,
    pendingPharmacy: 0,
    completedToday: 0
  });

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
    department: 'Midwife'
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
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

  // Refs
  const signaturePad = useRef(null);
  const socket = useRef(null);
  const navigate = useNavigate();

  // API Configuration
  const API_URL = 'http://localhost:5001';
  const SOCKET_URL = 'http://localhost:5001';
  
  // Internal wards for referral
  const internalWards = ['OPD', 'EME', 'ANC'];
  
  // Discharge location options
  const dischargeLocations = [
    'Home',
    'Home with Follow-up',
    'Home with Medications',
    'Home Health Care',
    'Rehabilitation Center',
    'Nursing Home',
    'Hospice',
    'Against Medical Advice (AMA)',
    'Transfer to Another Facility',
    'Deceased'
  ];

  // Lab tests options
  const labTests = {
    blood: [
      'CBC (Complete Blood Count)',
      'Blood Chemistry',
      'Blood Group & Rh',
      'Hemoglobin',
      'Hepatitis B',
      'HIV Test',
      'Blood Sugar',
      'Thyroid Function',
      'OGTT',
      'Malaria Test'
    ],
    urine: [
      'Urinalysis',
      'Urine Culture',
      'Urine Pregnancy Test',
      'Urine Microscopy'
    ],
    stool: [
      'Stool Culture',
      'Stool Ova & Parasites',
      'Stool Occult Blood'
    ]
  };

  // Wards for filtering
  const wards = [
    { id: 'all', name: 'All Wards', color: '#64748b', icon: '🏥', bgClass: 'bg-gray-100', textClass: 'text-gray-700' },
    { id: 'ANC', name: 'Antenatal', color: '#8b5cf6', icon: '🤰', bgClass: 'bg-purple-100', textClass: 'text-purple-700' },
    { id: 'postnatal', name: 'Postnatal', color: '#10b981', icon: '👶', bgClass: 'bg-green-100', textClass: 'text-green-700' }
  ];

  // Ward configuration for ANC
  const currentWard = {
    title: 'Antenatal Care Dashboard',
    primaryColor: '#8b5cf6',
    secondaryColor: '#a78bfa',
    accentColor: '#7c3aed',
    bgGradient: 'from-violet-600 to-purple-500',
    queueTitle: 'Antenatal Patients',
    icon: '🤰',
    sidebarIcon: '👶',
    statusFilter: 'in_anc'
  };

  // ==================== HELPER FUNCTIONS ====================
  const formatFullName = (staffMember) => {
    if (!staffMember) return 'Unknown';
    const firstName = staffMember.first_name || '';
    const middleName = staffMember.middle_name ? ` ${staffMember.middle_name}` : '';
    const lastName = staffMember.last_name || '';
    return `${firstName}${middleName} ${lastName}`.trim();
  };

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
      discharged: 'bg-gray-100 text-gray-800',
      admitted: 'bg-purple-100 text-purple-800',
      referred: 'bg-orange-100 text-orange-800'
    };
    return badges[status] || badges.pending;
  };

  const getRiskLevelColor = (isHighRisk) => {
    return isHighRisk ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
  };

  const getRiskLevelText = (isHighRisk) => {
    return isHighRisk ? '⚠️ High Risk' : '✅ Normal';
  };

  // ==================== CONNECTION STATUS BANNER ====================
  const ConnectionStatusBanner = () => {
    if (connectionStatus === 'connected') return null;
    return (
      <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-2 rounded-full shadow-lg flex items-center gap-3 ${
        connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
      } text-white`}>
        <span>{connectionStatus === 'connecting' ? '🔄 Connecting...' : '⚠️ Disconnected'}</span>
        <button 
          onClick={() => {
            fetchPatients();
            fetchStats();
          }}
          className="ml-2 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30"
        >
          Retry
        </button>
      </div>
    );
  };

  // ==================== REAL TIME NOTIFICATION ====================
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
                {realTimeNotification.type === 'reply' ? '💬' : realTimeNotification.type === 'lab_result' ? '🔬' : '👶'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-gray-900">{realTimeNotification.title}</p>
                <span className="text-xs text-gray-400 ml-2">{realTimeNotification.priority === 'urgent' ? '🔴' : '🟡'}</span>
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
      console.log('✅ Midwife socket connected');
      setConnectionStatus('connected');
      socket.current.emit('join', `hospital_${user?.hospital_id}_ward_ANC`);
    });

    socket.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionStatus('disconnected');
    });

    socket.current.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    // Listen for new ANC patients from triage
    socket.current.on('new_anc_patient', (data) => {
      console.log('🤰 New ANC patient:', data);
      setRealTimeNotification({
        id: Date.now(),
        type: 'new_patient',
        title: 'New Patient',
        message: `🆕 New antenatal patient: ${data.patient_name}`,
        priority: 'medium',
        timestamp: new Date()
      });
      fetchPatients();
      fetchStats();
      setTimeout(() => setRealTimeNotification(null), 6000);
    });

    // Listen for referred patients to ANC
    socket.current.on('patient_referred_to_anc', (data) => {
      console.log('📋 Patient referred to ANC:', data);
      setRealTimeNotification({
        id: Date.now(),
        type: 'referral',
        title: 'Patient Referred',
        message: `📋 Patient referred to ANC: ${data.patient_name}`,
        priority: 'medium',
        timestamp: new Date()
      });
      fetchPatients();
      fetchStats();
      setTimeout(() => setRealTimeNotification(null), 6000);
    });

    // Listen for lab results
    socket.current.on('lab_result_ready', (data) => {
      console.log('📋 Lab results ready:', data);
      setRealTimeNotification({
        id: Date.now(),
        type: 'lab_result',
        title: 'Lab Results Ready',
        message: `🔬 New lab results for ${data.patient_name}${data.critical ? ' - CRITICAL' : ''}`,
        priority: data.critical ? 'urgent' : 'medium',
        timestamp: new Date()
      });
      if (selectedPatient?.id === data.patient_id) {
        fetchLabResults(data.patient_id);
      }
      setTimeout(() => setRealTimeNotification(null), 6000);
    });

    // Listen for prescription status updates
    socket.current.on('prescription_status_update', (data) => {
      console.log('💊 Prescription status updated:', data);
      if (data.patient_id === selectedPatient?.id) {
        setPrescriptions(prev => 
          prev.map(p => 
            p.id === data.prescription_id 
              ? { ...p, status: data.status, pharmacy_notes: data.notes }
              : p
          )
        );
      }
      setRealTimeNotification({
        id: Date.now(),
        type: 'prescription',
        title: 'Prescription Update',
        message: `💊 Prescription ${data.status}: ${data.medication_name}`,
        priority: 'low',
        timestamp: new Date()
      });
      setTimeout(() => setRealTimeNotification(null), 6000);
    });

    // Listen for report replies
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
  };

  // ==================== API CALLS ====================
  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const res = await axios.get(`${API_URL}/api/midwife/patients`, {
        params: {
          hospital_id: user?.hospital_id,
          ward: 'ANC',
          midwife_id: user?.id
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        const patientsList = res.data.patients || [];
        setPatients(patientsList);
        setQueuePatients(patientsList.filter(p => p.status === 'in_anc'));
        
        setHighRiskPatients(patientsList.filter(p => p.antenatal_data?.high_risk));
        setPostnatalPatients(patientsList.filter(p => p.status === 'postnatal'));
        
        const dueThisWeek = patientsList.filter(p => {
          if (p.antenatal_data?.edd) {
            const edd = new Date(p.antenatal_data.edd);
            const today = new Date();
            const daysDiff = Math.ceil((edd - today) / (1000 * 60 * 60 * 24));
            return daysDiff <= 7 && daysDiff >= 0;
          }
          return false;
        }).length;
        
        setStats(prev => ({
          ...prev,
          antenatal: patientsList.filter(p => p.status === 'in_anc').length,
          postnatal: patientsList.filter(p => p.status === 'postnatal').length,
          highRisk: highRiskPatients.length,
          dueThisWeek
        }));
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const res = await axios.get(`${API_URL}/api/midwife/stats`, {
        params: {
          hospital_id: user?.hospital_id,
          midwife_id: user?.id
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setStats(prev => ({ ...prev, ...res.data.stats }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAntenatalVisits = async (patientId) => {
    if (!patientId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/midwife/antenatal-visits/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAntenatalVisits(res.data.visits || []);
      }
    } catch (error) {
      console.error('Error fetching antenatal visits:', error);
    }
  };

  const fetchLabResults = async (patientId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/midwife/lab-results/${patientId}`, {
        params: { midwife_id: user?.id, hospital_id: user?.hospital_id },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setLabResults(res.data.results || []);
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching lab results:', error);
      }
      setLabResults([]);
    }
  };

  const fetchDischargedPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/midwife/discharged-patients`, {
        params: { hospital_id: user?.hospital_id, ward: 'ANC' },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setDischargedPatients(res.data.patients || []);
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching discharged patients:', error);
      }
      setDischargedPatients([]);
    }
  };

  const fetchAvailableBeds = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/midwife/available-beds`, {
        params: { ward: 'ANC', hospital_id: user?.hospital_id },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAvailableBedsList(res.data.beds || []);
        return res.data.beds;
      }
      return [];
    } catch (error) {
      console.error('Error fetching beds:', error);
      return [];
    }
  };

  // ==================== PROFILE FUNCTIONS ====================
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/midwife/profile`, {
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
          department: staff.department || 'Midwife'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/midwife/profile`, profileData, {
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
      const res = await axios.put(`${API_URL}/api/midwife/change-password`, {
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

  // ==================== REPORT FUNCTIONS ====================
  const fetchReportsInbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/midwife/reports/inbox`, {
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
      const res = await axios.get(`${API_URL}/api/midwife/reports/outbox`, {
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
      const res = await axios.get(`${API_URL}/api/midwife/hospital-admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHospitalAdmins(res.data.admins);
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
    
    // Send as JSON - NOT FormData
    const payload = {
      title: sendReportForm.title,
      body: sendReportForm.body,
      priority: sendReportForm.priority,
      recipient_type: sendReportForm.recipient_type,
      recipient_id: sendReportForm.recipient_id
    };
    
    console.log('Sending report payload:', payload);
    
    const res = await axios.post(`${API_URL}/api/midwife/reports/send`, payload, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
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
    console.error('Error sending report:', error);
    setMessage({ type: 'error', text: error.response?.data?.message || 'Error sending report' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  } finally {
    setLoading(false);
  }
};



  // ==================== PATIENT HANDLING ====================
  const handleTakePatient = async (patient) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const res = await axios.post(`${API_URL}/api/midwife/assign-patient`, {
        patient_id: patient.id,
        midwife_id: user?.id,
        midwife_name: user?.full_name,
        hospital_id: user?.hospital_id
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setSelectedPatient(res.data.patient);
        setShowPatientModal(true);
        setActiveTab('antenatal');
        
        if (res.data.patient.antenatal_data) {
          setAntenatalData(res.data.patient.antenatal_data);
        }
        
        if (res.data.patient.vitals) {
          setVitalSigns(res.data.patient.vitals);
        }
        
        if (res.data.patient.diagnosis) {
          setDiagnosis(res.data.patient.diagnosis);
        }
        
        if (res.data.patient.prescriptions) {
          setPrescriptions(res.data.patient.prescriptions);
        }
        
        await Promise.all([
          fetchAntenatalVisits(patient.id),
          fetchLabResults(patient.id)
        ]);
        
        setMessage({ type: 'success', text: 'Patient assigned successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error taking patient:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error assigning patient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== DIAGNOSIS FUNCTIONS ====================
  const handleDiagnosisChange = (e) => {
    setDiagnosis({
      ...diagnosis,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveDiagnosis = async () => {
    if (!diagnosis.primary) {
      setMessage({ type: 'error', text: 'Please enter primary diagnosis' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/midwife/save-diagnosis`, {
        patient_id: selectedPatient.id,
        diagnosis: diagnosis,
        midwife_id: user?.id,
        hospital_id: user?.hospital_id
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Diagnosis saved' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setSelectedPatient(prev => ({ ...prev, diagnosis }));
      }
    } catch (error) {
      console.error('Error saving diagnosis:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error saving diagnosis' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== PRESCRIPTION FUNCTIONS ====================
  const handleMedicationChange = (e) => {
    setNewMedication({
      ...newMedication,
      [e.target.name]: e.target.value
    });
  };

  const addMedication = () => {
    if (!newMedication.name || !newMedication.dosage) {
      setMessage({ type: 'error', text: 'Please enter medication name and dosage' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const medication = {
      id: Date.now().toString(),
      ...newMedication,
      prescribed_at: new Date().toISOString(),
      status: 'pending'
    };

    setPrescriptions([...prescriptions, medication]);
    setNewMedication({
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      route: 'oral',
      notes: ''
    });
  };

  const removeMedication = (id) => {
    setPrescriptions(prescriptions.filter(p => p.id !== id));
  };

  const savePrescriptions = async () => {
    if (prescriptions.length === 0) {
      setMessage({ type: 'error', text: 'No prescriptions to save' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/midwife/save-prescriptions`, {
        patient_id: selectedPatient.id,
        patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
        prescriptions: prescriptions.map(p => ({ ...p, status: 'sent', sent_at: new Date().toISOString() })),
        midwife_id: user?.id,
        midwife_name: user?.full_name,
        ward: 'ANC',
        hospital_id: user?.hospital_id
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Prescriptions sent to pharmacy' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setPrescriptions(res.data.prescriptions);
        setStats(prev => ({ ...prev, pendingPharmacy: prev.pendingPharmacy + 1 }));
        
        if (socket.current) {
          socket.current.emit('new_prescriptions', {
            patient_id: selectedPatient.id,
            patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
            midwife_name: user?.full_name,
            ward: 'ANC',
            hospital_id: user?.hospital_id
          });
        }
      }
    } catch (error) {
      console.error('Error saving prescriptions:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error saving prescriptions' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== LAB REQUEST FUNCTIONS ====================
  const handleLabRequestChange = (e) => {
    setNewLabRequest({
      ...newLabRequest,
      [e.target.name]: e.target.value
    });
  };

  const addLabRequest = async () => {
    if (!newLabRequest.testName) {
      setMessage({ type: 'error', text: 'Please select a test' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/midwife/request-lab`, {
        patient_id: selectedPatient.id,
        patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
        midwife_id: user?.id,
        midwife_name: user?.full_name,
        ward: 'ANC',
        hospital_id: user?.hospital_id,
        ...newLabRequest
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Lab request sent' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setLabRequests([...labRequests, res.data.request]);
        setStats(prev => ({ ...prev, pendingLabs: (prev.pendingLabs || 0) + 1 }));
        
        setNewLabRequest({
          testType: 'blood',
          testName: '',
          priority: 'routine',
          notes: ''
        });
      }
    } catch (error) {
      console.error('Error sending lab request:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error sending lab request' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== ANTENATAL CARE FUNCTIONS ====================
  const handleAntenatalDataChange = (e) => {
    setAntenatalData({
      ...antenatalData,
      [e.target.name]: e.target.value
    });
  };

  const handleVitalSignsChange = (e) => {
    setVitalSigns({
      ...vitalSigns,
      [e.target.name]: e.target.value
    });
  };

  const handleVisitNotesChange = (e) => {
    setVisitNotes({
      ...visitNotes,
      [e.target.name]: e.target.value
    });
  };

  const calculateWeeks = (lmp) => {
    if (!lmp) return '';
    const lmpDate = new Date(lmp);
    const today = new Date();
    const diffTime = Math.abs(today - lmpDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
  };

  const saveAntenatalRecord = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const res = await axios.post(`${API_URL}/api/midwife/save-antenatal`, {
        patient_id: selectedPatient.id,
        antenatal_data: antenatalData,
        vitals: vitalSigns,
        visit_notes: visitNotes,
        midwife_id: user?.id,
        midwife_name: user?.full_name,
        hospital_id: user?.hospital_id
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Antenatal record saved successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        
        await fetchPatients();
        await fetchAntenatalVisits(selectedPatient.id);
        
        setVisitNotes({
          complaints: '',
          examination: '',
          advice: '',
          next_appointment: ''
        });
      }
    } catch (error) {
      console.error('Error saving antenatal record:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error saving record' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== DISCHARGE FUNCTIONS ====================
  const openDischargeLocationModal = () => {
    setShowDischargeLocationModal(true);
    setDischargeLocation('');
  };

  const handleDischargeWithLocation = async () => {
    if (!dischargeLocation) {
      setMessage({ type: 'error', text: 'Please select discharge location' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const pendingPrescriptions = prescriptions.filter(p => p.status !== 'dispensed');

    if (pendingPrescriptions.length > 0) {
      const confirmDischarge = window.confirm(
        `⚠️ ${pendingPrescriptions.length} prescription(s) not yet dispensed by pharmacy.\n\n` +
        `Are you sure you want to discharge to ${dischargeLocation}? (Emergency Override)`
      );
      if (!confirmDischarge) return;
    }

    if (!signaturePad.current || signaturePad.current.isEmpty()) {
      setMessage({ type: 'error', text: 'Please provide your signature' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const signature = signaturePad.current.toDataURL();

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const res = await axios.post(`${API_URL}/api/midwife/discharge-patient`, {
        patient_id: selectedPatient.id,
        midwife_id: user?.id,
        midwife_name: user?.full_name,
        hospital_id: user?.hospital_id,
        ward: 'ANC',
        diagnosis: diagnosis,
        prescriptions: prescriptions,
        lab_results: labResults,
        discharge_location: dischargeLocation,
        signature: signature,
        discharge_notes: diagnosis.notes
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setMessage({ type: 'success', text: `Patient discharged to ${dischargeLocation}` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        
        setShowDischargeLocationModal(false);
        setShowPatientModal(false);
        setSelectedPatient(null);
        setPrescriptions([]);
        setDiagnosis({ primary: '', icd10: '', secondary: '', notes: '' });
        setDischargeLocation('');
        
        fetchStats();
        fetchDischargedPatients();
        
        if (socket.current) {
          socket.current.emit('patient_discharged', {
            patient_id: selectedPatient.id,
            midwife_name: user?.full_name,
            ward: 'ANC',
            hospital_id: user?.hospital_id
          });
        }
      }
    } catch (error) {
      console.error('Error discharging patient:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error discharging patient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== DELIVERY RECORD FUNCTIONS ====================
  const recordDelivery = async () => {
    if (!signaturePad.current || signaturePad.current.isEmpty()) {
      setMessage({ type: 'error', text: 'Please provide your signature' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const signature = signaturePad.current.toDataURL();

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const deliveryData = {
        patient_id: selectedPatient.id,
        delivery_date: new Date(),
        delivery_type: 'vaginal',
        complications: '',
        baby_weight: '',
        baby_sex: '',
        apgar_score: '',
        notes: diagnosis.notes,
        signature: signature
      };
      
      const res = await axios.post(`${API_URL}/api/midwife/record-delivery`, deliveryData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Delivery recorded successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        
        await fetchPatients();
        setShowPatientModal(false);
        setStats(prev => ({ ...prev, deliveries: prev.deliveries + 1 }));
      }
    } catch (error) {
      console.error('Error recording delivery:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error recording delivery' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== ADMISSION FUNCTIONS ====================
  const handleAdmit = async (bedId) => {
    if (!bedId) {
      setMessage({ type: 'error', text: 'Please select a bed' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (!signaturePad.current || signaturePad.current.isEmpty()) {
      setMessage({ type: 'error', text: 'Please provide your signature' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const signature = signaturePad.current.toDataURL();

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/midwife/admit-patient`, {
        patient_id: selectedPatient.id,
        midwife_id: user?.id,
        midwife_name: user?.full_name,
        hospital_id: user?.hospital_id,
        ward: 'ANC',
        bed_id: bedId,
        diagnosis: diagnosis,
        prescriptions: prescriptions,
        lab_results: labResults,
        signature: signature,
        admission_notes: diagnosis.notes
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Patient admitted successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        
        setShowPatientModal(false);
        setSelectedPatient(null);
        setPrescriptions([]);
        setDiagnosis({ primary: '', icd10: '', secondary: '', notes: '' });
        setShowBedListNotification(false);
        
        fetchStats();
        fetchPatients();
        
        if (socket.current) {
          socket.current.emit('patient_admitted', {
            patient_id: selectedPatient.id,
            midwife_name: user?.full_name,
            bed_id: bedId,
            ward: 'ANC',
            hospital_id: user?.hospital_id
          });
        }
      }
    } catch (error) {
      console.error('Error admitting patient:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error admitting patient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== REFERRAL FUNCTIONS ====================
  const openReferralModal = () => {
    setShowReferralModal(true);
    setReferralType('internal');
    setSelectedInternalWard('');
    setExternalReferralData(null);
    setReferralSelectedBed('');
  };

  const handleInternalRefer = async () => {
    if (!selectedInternalWard) {
      setMessage({ type: 'error', text: 'Please select a ward' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (!signaturePad.current || signaturePad.current.isEmpty()) {
      setMessage({ type: 'error', text: 'Please provide your signature' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const signature = signaturePad.current.toDataURL();

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/midwife/refer-patient`, {
        patient_id: selectedPatient.id,
        midwife_id: user?.id,
        midwife_name: user?.full_name,
        hospital_id: user?.hospital_id,
        ward: 'ANC',
        referral_type: 'internal',
        destination: selectedInternalWard,
        bed_id: referralSelectedBed || null,
        diagnosis: diagnosis,
        prescriptions: prescriptions,
        lab_results: labResults,
        signature: signature,
        referral_notes: diagnosis.notes
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        const bedMessage = referralSelectedBed ? ` with Bed ${res.data.bed_number || ''}` : '';
        setMessage({ type: 'success', text: `Patient referred to ${selectedInternalWard} ward${bedMessage}` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        
        setShowPatientModal(false);
        setShowReferralModal(false);
        setSelectedPatient(null);
        setPrescriptions([]);
        setDiagnosis({ primary: '', icd10: '', secondary: '', notes: '' });
        setSelectedInternalWard('');
        setReferralSelectedBed('');
        
        fetchStats();
        
        if (socket.current) {
          socket.current.emit('patient_referred', {
            patient_id: selectedPatient.id,
            midwife_name: user?.full_name,
            referral_type: 'internal',
            destination: selectedInternalWard,
            ward: 'ANC',
            hospital_id: user?.hospital_id
          });
        }
      }
    } catch (error) {
      console.error('Error referring patient:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error referring patient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleExternalRefer = async () => {
    if (!externalReferralData || !externalReferralData.hospital) {
      setMessage({ type: 'error', text: 'Please select a hospital' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (!signaturePad.current || signaturePad.current.isEmpty()) {
      setMessage({ type: 'error', text: 'Please provide your signature' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const signature = signaturePad.current.toDataURL();

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/midwife/refer-patient`, {
        patient_id: selectedPatient.id,
        midwife_id: user?.id,
        midwife_name: user?.full_name,
        hospital_id: user?.hospital_id,
        ward: 'ANC',
        referral_type: 'external',
        destination: externalReferralData.hospital.name,
        external_data: externalReferralData,
        diagnosis: diagnosis,
        prescriptions: prescriptions,
        lab_results: labResults,
        signature: signature,
        referral_notes: diagnosis.notes
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setMessage({ type: 'success', text: `Patient referred to ${externalReferralData.hospital.name}` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        
        setShowPatientModal(false);
        setShowReferralModal(false);
        setSelectedPatient(null);
        setPrescriptions([]);
        setDiagnosis({ primary: '', icd10: '', secondary: '', notes: '' });
        
        fetchStats();
      }
    } catch (error) {
      console.error('Error referring patient:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error referring patient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Filtered patients based on active tab
  const getFilteredPatients = () => {
    switch(activeTab) {
      case 'antenatal':
        return queuePatients.filter(p => p.status === 'in_anc');
      case 'postnatal':
        return postnatalPatients;
      case 'high-risk':
        return highRiskPatients;
      case 'deliveries':
        return patients.filter(p => p.status === 'delivered');
      default:
        return queuePatients;
    }
  };

  const filteredPatients = getFilteredPatients().filter(patient =>
    patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.card_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = () => {
    if (socket.current) socket.current.disconnect();
    if (onLogout) onLogout();
    navigate('/login');
  };
// Add this function after handleSendReply


// Add this function if not already present
const viewReportDetails = (report) => {
  setSelectedReport(report);
  setShowReportDetailModal(true);
  if (!report.is_opened) {
    markReportAsRead(report.id);
  }
};

// Make sure markReportAsRead is properly defined
const markReportAsRead = async (reportId) => {
  try {
    console.log('Calling mark as read for report:', reportId);
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_URL}/api/midwife/reports/${reportId}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Response:', response.data);
    fetchReportsInbox();
  } catch (error) {
    console.error('Error marking report as read:', error);
    console.error('Error response:', error.response?.data);
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
    
    // Send as JSON - NOT FormData
    const payload = {
      body: replyText
    };
    
    console.log('Sending reply payload:', payload);
    
    const res = await axios.post(`${API_URL}/api/midwife/reports/${selectedReport.id}/reply`, payload, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
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
    console.error('Error sending reply:', error);
    setMessage({ type: 'error', text: error.response?.data?.message || 'Error sending reply' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  } finally {
    setLoading(false);
  }
};
  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    if (!user?.hospital_id) return;

    initializeSocket();
    fetchPatients();
    fetchStats();
    fetchDischargedPatients();
    fetchReportsInbox();
    fetchReportsOutbox();
    fetchHospitalAdmins();
    fetchProfile();

    const interval = setInterval(() => {
      fetchPatients();
      fetchStats();
      if (showDischargeList) {
        fetchDischargedPatients();
      }
      fetchReportsInbox();
    }, 30000);

    return () => {
      if (socket.current) socket.current.disconnect();
      clearInterval(interval);
    };
  }, [user?.hospital_id, showDischargeList]);

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 flex">
      <RealTimeNotification />
      <ConnectionStatusBanner />
      
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes glow { 0% { box-shadow: 0 0 5px rgba(139,92,246,0.2); } 50% { box-shadow: 0 0 20px rgba(139,92,246,0.5); } 100% { box-shadow: 0 0 5px rgba(139,92,246,0.2); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        .animate-glow { animation: glow 2s infinite; }
        .animate-fade-in { animation: fadeIn 0.5s ease; }
      `}</style>

      {/* ==================== SIDEBAR ==================== */}
      <div className={`bg-gradient-to-b from-violet-900 to-purple-800 text-white transition-all duration-300 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      } shadow-2xl flex flex-col h-screen sticky top-0 z-50`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                  <FaBaby className="text-white text-sm" />
                </div>
                <span className="font-bold text-base tracking-tight">Midwife</span>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg mx-auto">
                <FaBaby className="text-white text-sm" />
              </div>
            )}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-violet-800 rounded-lg transition-colors">
              {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>

          <nav className="space-y-1">
            <button onClick={() => { setActiveTab('antenatal'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'antenatal' && !showScheduleView ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-violet-800'
            }`}>
              <span className="text-lg">🤰</span>
              {!sidebarCollapsed && <span>Antenatal Care</span>}
              {!sidebarCollapsed && stats.antenatal > 0 && (
                <span className="ml-auto bg-yellow-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.antenatal}
                </span>
              )}
            </button>

            <button onClick={() => { setActiveTab('postnatal'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'postnatal' && !showScheduleView ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-violet-800'
            }`}>
              <span className="text-lg">👶</span>
              {!sidebarCollapsed && <span>Postnatal Care</span>}
              {!sidebarCollapsed && stats.postnatal > 0 && (
                <span className="ml-auto bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.postnatal}
                </span>
              )}
            </button>

            <button onClick={() => { setActiveTab('high-risk'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'high-risk' && !showScheduleView ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-violet-800'
            }`}>
              <span className="text-lg">⚠️</span>
              {!sidebarCollapsed && <span>High Risk</span>}
              {!sidebarCollapsed && stats.highRisk > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {stats.highRisk}
                </span>
              )}
            </button>

            <button onClick={() => { setActiveTab('deliveries'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'deliveries' && !showScheduleView ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-violet-800'
            }`}>
              <span className="text-lg">🏥</span>
              {!sidebarCollapsed && <span>Deliveries</span>}
              {!sidebarCollapsed && stats.deliveries > 0 && (
                <span className="ml-auto bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.deliveries}
                </span>
              )}
            </button>

            <div className="h-px bg-violet-700/50 my-4 mx-3"></div>

            <div onClick={() => { setShowDischargeList(!showDischargeList); if (!showDischargeList) fetchDischargedPatients(); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm cursor-pointer ${showDischargeList ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-violet-800'}`}>
              <span className="text-lg">📋</span>
              {!sidebarCollapsed && <span>Discharge List</span>}
              {!sidebarCollapsed && stats.completedToday > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.completedToday}
                </span>
              )}
            </div>

            <div className="h-px bg-violet-700/50 my-4 mx-3"></div>

            <button onClick={() => { setActiveTab('inbox'); setShowScheduleView(false); fetchReportsInbox(); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm relative ${
              activeTab === 'inbox' && !showScheduleView ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-violet-800'
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
              activeTab === 'outbox' && !showScheduleView ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-violet-800'
            }`}>
              <FaPaperPlane className="text-lg" />
              {!sidebarCollapsed && <span>Sent Reports</span>}
            </button>

            <div className="h-px bg-violet-700/50 my-4 mx-3"></div>

            <button onClick={() => { setActiveTab('schedule'); setShowScheduleView(true); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              showScheduleView ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-violet-800'
            }`}>
              <FaCalendarAlt className="text-lg" />
              {!sidebarCollapsed && <span>My Schedule</span>}
            </button>

            <button onClick={() => { setActiveTab('stats'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'stats' && !showScheduleView ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-violet-800'
            }`}>
              <FaChartLine className="text-lg" />
              {!sidebarCollapsed && <span>Statistics</span>}
            </button>

            <button onClick={() => { setActiveTab('profile'); setShowScheduleView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
              activeTab === 'profile' && !showScheduleView ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' : 'hover:bg-violet-800'
            }`}>
              <FaUserCircle className="text-lg" />
              {!sidebarCollapsed && <span>Profile</span>}
            </button>
          </nav>

          {sidebarCollapsed && (
            <div className="mt-8 text-center">
              <div className="text-xl font-bold text-violet-400">{stats.antenatal}</div>
              <div className="text-[10px] text-violet-300">Patients</div>
              {unreadReportsCount > 0 && (
                <div className="mt-3">
                  <div className="text-lg font-bold text-red-400">{unreadReportsCount}</div>
                  <div className="text-[10px] text-violet-300">Unread</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`${sidebarCollapsed ? 'py-4 px-0' : 'p-5'} border-t border-violet-700/50 mt-auto`}>
          <button onClick={handleLogout} className={`w-full ${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} bg-transparent border border-violet-600 rounded-xl text-red-400 cursor-pointer flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 text-sm transition-all duration-200 hover:bg-red-500/10 hover:border-red-500`}>
            <span className="text-lg">🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className={`bg-gradient-to-r ${currentWard.bgGradient} py-6 px-8 shadow-xl sticky top-0 z-40`}>
          <div className="max-w-[1600px] mx-auto flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl shadow-lg animate-glow">
                  <span>{currentWard.icon}</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white m-0 drop-shadow-md tracking-tight">
                    {showScheduleView ? 'My Work Schedule' : 
                     activeTab === 'inbox' ? 'Reports - Inbox' :
                     activeTab === 'outbox' ? 'Reports - Sent' :
                     activeTab === 'stats' ? 'Midwife Statistics' :
                     activeTab === 'profile' ? 'My Profile' :
                     currentWard.title}
                  </h1>
                  <p className="text-base text-white/90 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{formatFullName(user)}</span>
                    <span className="text-white/50">•</span>
                    <span>{user?.hospital_name}</span>
                    <span className="bg-white/20 px-3 py-0.5 rounded-full text-xs font-medium backdrop-blur">Midwife - ANC Ward</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <SocketStatusIndicator />
              <button onClick={() => { setActiveTab('sendReport'); setShowScheduleView(false); setShowSendReportModal(true); fetchHospitalAdmins(); }} className="bg-white/20 backdrop-blur px-4 py-2.5 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg text-sm font-medium">
                <FaPaperPlane className="text-sm" /> Send Report
              </button>
              <button onClick={() => { fetchPatients(); fetchStats(); }} className="bg-white/20 backdrop-blur px-4 py-2.5 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg text-sm font-medium">
                <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <div className="flex gap-4 bg-white/10 backdrop-blur py-2 px-5 rounded-full">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.antenatal}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Antenatal</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.postnatal}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Postnatal</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.deliveries}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Deliveries</div>
                </div>
                {stats.highRisk > 0 && (
                  <>
                    <div className="w-px h-8 bg-white/30" />
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">{stats.highRisk}</div>
                      <div className="text-[10px] text-white/70 uppercase tracking-wider">High Risk</div>
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
            <div className={`mb-6 p-4 rounded-xl border-l-4 ${message.type === 'error' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-green-50 border-green-500 text-green-700'} flex justify-between items-center animate-fade-in`}>
              <span>{message.text}</span>
              <button onClick={() => setMessage({ type: '', text: '' })} className="text-lg hover:opacity-70">×</button>
            </div>
          )}

          {/* Search Bar - Only for patient tabs */}
          {(activeTab === 'antenatal' || activeTab === 'postnatal' || activeTab === 'high-risk' || activeTab === 'deliveries') && !showDischargeList && !showScheduleView && (
            <div className="mb-6 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient name or card number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              />
            </div>
          )}

          {/* Patient List View */}
          {!showDischargeList && !showScheduleView && activeTab !== 'inbox' && activeTab !== 'outbox' && activeTab !== 'stats' && activeTab !== 'profile' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  {activeTab === 'antenatal' && '🤰 Antenatal Care Patients'}
                  {activeTab === 'postnatal' && '👶 Postnatal Care Patients'}
                  {activeTab === 'high-risk' && '⚠️ High Risk Pregnancies'}
                  {activeTab === 'deliveries' && '🏥 Recent Deliveries'}
                </h2>
              </div>
              <div className="p-6">
                {loading && filteredPatients.length === 0 ? (
                  <div className="text-center py-12">
                    <FaSpinner className="animate-spin text-3xl text-violet-500 mx-auto mb-3" />
                    <p className="text-gray-500">Loading patients...</p>
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <FaBabyCarriage className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No patients found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPatients.map(patient => {
                      const isHighRisk = patient.antenatal_data?.high_risk;
                      const weeks = patient.antenatal_data?.gestational_weeks || (patient.antenatal_data?.lmp ? calculateWeeks(patient.antenatal_data.lmp) : 'N/A');
                      return (
                        <div key={patient.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all bg-white">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3 flex-wrap">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-800">{weeks} weeks</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(isHighRisk)}`}>{getRiskLevelText(isHighRisk)}</span>
                                {patient.antenatal_data?.edd && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    EDD: {new Date(patient.antenatal_data.edd).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <h3 className="font-semibold text-lg">{patient.first_name} {patient.middle_name} {patient.last_name}</h3>
                              <p className="text-sm text-gray-500 mt-1">Card: {patient.card_number} • Age: {patient.age} yrs • G{patient.antenatal_data?.gravida || '?'} P{patient.antenatal_data?.para || '?'}</p>
                              {patient.antenatal_data?.risk_factors?.length > 0 && (
                                <p className="text-xs text-red-600 mt-1">⚠️ Risk: {patient.antenatal_data.risk_factors.join(', ')}</p>
                              )}
                            </div>
                            <button onClick={() => handleTakePatient(patient)} disabled={loading} className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 flex items-center gap-2 transition">
                              <FaEye /> View Care
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Discharge List View */}
          {showDischargeList && !showScheduleView && (
            <DischargeList hospitalId={user?.hospital_id} ward="ANC" dischargedPatients={dischargedPatients} onRefresh={fetchDischargedPatients} />
          )}

          {/* Schedule View */}
          {showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
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

          {/* Inbox Tab */}
          {activeTab === 'inbox' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-800">📬 Inbox</h2>
                  {unreadReportsCount > 0 && <span className="px-3 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">{unreadReportsCount} unread</span>}
                </div>
                <button onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); }} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium">
                  New Report
                </button>
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
                        <span className={`text-xs px-3 py-1 rounded-full ${report.priority === 'urgent' ? 'bg-red-100 text-red-800' : report.priority === 'high' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {report.priority}
                        </span>
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
                        <span className={`text-xs px-3 py-1 rounded-full ${report.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{report.priority}</span>
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

          {/* Statistics Tab */}
          {activeTab === 'stats' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">📊 Midwife Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                <div className="bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl p-5 text-white shadow-lg">
                  <p className="text-sm opacity-90 mb-1">Active Patients</p>
                  <p className="text-3xl font-bold">{stats.antenatal + stats.postnatal}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg">
                  <p className="text-sm opacity-90 mb-1">Total Deliveries</p>
                  <p className="text-3xl font-bold">{stats.deliveries}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl p-5 text-white shadow-lg">
                  <p className="text-sm opacity-90 mb-1">High Risk</p>
                  <p className="text-3xl font-bold">{stats.highRisk}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
                  <p className="text-sm opacity-90 mb-1">Due This Week</p>
                  <p className="text-3xl font-bold">{stats.dueThisWeek}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-gray-500">Today's Summary: {stats.antenatal} antenatal, {stats.postnatal} postnatal patients</p>
                <p className="text-xs text-gray-400 mt-2">Pending pharmacy prescriptions: {stats.pendingPharmacy}</p>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-purple-500 px-8 py-10">
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
                      <FaBaby className="text-sm" /> {profileData.department || 'Midwife'} - ANC Ward
                    </p>
                    <p className="text-violet-100 text-sm mt-1 opacity-80">{user?.hospital_name}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Professional Information</h3>
                  {!isEditingProfile ? (
                    <button onClick={() => setIsEditingProfile(true)} 
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition text-sm font-medium">
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
                    <h4 className="font-semibold text-violet-600 mb-4 flex items-center gap-2"><FaUserCircle /> Personal Info</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500">First Name</label>
                        {isEditingProfile ? 
                          <input type="text" value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : 
                          <p className="text-gray-800">{profileData.first_name || 'Not set'}</p>
                        }
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Middle Name</label>
                        {isEditingProfile ? 
                          <input type="text" value={profileData.middle_name} onChange={(e) => setProfileData({...profileData, middle_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : 
                          <p className="text-gray-800">{profileData.middle_name || '—'}</p>
                        }
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Last Name</label>
                        {isEditingProfile ? 
                          <input type="text" value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : 
                          <p className="text-gray-800">{profileData.last_name || 'Not set'}</p>
                        }
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Gender</label>
                          {isEditingProfile ? 
                            <select value={profileData.gender} onChange={(e) => setProfileData({...profileData, gender: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                              <option>Male</option><option>Female</option><option>Other</option>
                            </select> : 
                            <p className="text-gray-800">{profileData.gender || 'Not set'}</p>
                          }
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Age</label>
                          {isEditingProfile ? 
                            <input type="number" value={profileData.age} onChange={(e) => setProfileData({...profileData, age: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : 
                            <p className="text-gray-800">{profileData.age ? `${profileData.age} years` : 'Not set'}</p>
                          }
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Phone</label>
                        {isEditingProfile ? 
                          <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : 
                          <p className="text-gray-800">{profileData.phone || 'Not set'}</p>
                        }
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Email</label>
                        <p className="text-gray-800">{profileData.email || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="font-semibold text-violet-600 mb-4 flex items-center gap-2"><FaKey /> Account Settings</h4>
                    <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-4 py-2 border border-violet-600 text-violet-600 rounded-xl hover:bg-violet-50 transition text-sm font-medium w-full justify-center">
                      <FaKey /> Change Password
                    </button>
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Account Info</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Role:</span><span className="text-gray-800 font-medium">Midwife</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Department:</span><span className="text-gray-800">{profileData.department || 'Midwife'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Ward:</span><span className="text-gray-800">ANC</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className="text-green-600">● Active</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== MODALS ==================== */}
      
      {/* Patient Consultation Modal - Keep existing modal code here */}
      {showPatientModal && selectedPatient && (
        // ... (keep your existing patient modal JSX - it's long so I'm omitting for brevity)
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] backdrop-blur-sm overflow-y-auto">
          {/* Your existing patient modal content */}
        </div>
      )}

      {/* Discharge Location Modal */}
      {showDischargeLocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2100]">
          <div className="bg-white rounded-3xl p-8 max-w-md w-[90%]">
            <h3 className="text-xl font-semibold mb-6">Select Discharge Location</h3>
            <select value={dischargeLocation} onChange={(e) => setDischargeLocation(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg mb-6">
              <option value="">Choose location...</option>
              {dischargeLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDischargeLocationModal(false)} className="px-6 py-2 bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleDischargeWithLocation} disabled={!dischargeLocation || loading} className="px-6 py-2 bg-green-500 text-white rounded-lg">Confirm Discharge</button>
            </div>
          </div>
        </div>
      )}

      {/* Referral Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2100]">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-[90%] max-h-[80vh] overflow-auto">
            <h3 className="text-xl font-semibold mb-6">Refer Patient</h3>
            <div className="flex gap-4 mb-6">
              <button onClick={() => { setReferralType('internal'); setSelectedInternalWard(''); setExternalReferralData(null); }} className={`flex-1 py-3 rounded-lg font-semibold ${referralType === 'internal' ? 'text-white' : 'bg-gray-100'}`} style={{ backgroundColor: referralType === 'internal' ? '#8b5cf6' : '' }}>🏥 Internal</button>
              <button onClick={() => { setReferralType('external'); setSelectedInternalWard(''); setExternalReferralData(null); }} className={`flex-1 py-3 rounded-lg font-semibold ${referralType === 'external' ? 'text-white' : 'bg-gray-100'}`} style={{ backgroundColor: referralType === 'external' ? '#8b5cf6' : '' }}>🌍 External</button>
            </div>
            {referralType === 'internal' && (
              <div>
                <select value={selectedInternalWard} onChange={(e) => setSelectedInternalWard(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg mb-4">
                  <option value="">Select Ward...</option>
                  {internalWards.map(ward => <option key={ward} value={ward}>{ward} Ward</option>)}
                </select>
                {selectedInternalWard && (
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">Select Bed (Optional)</label>
                    <BedSelection ward={selectedInternalWard} hospitalId={user?.hospital_id} onBedSelect={setReferralSelectedBed} selectedBed={referralSelectedBed} title="Available Beds" />
                  </div>
                )}
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setShowReferralModal(false)} className="px-6 py-2 bg-gray-100 rounded-lg">Cancel</button>
                  <button onClick={handleInternalRefer} disabled={!selectedInternalWard || loading} className="px-6 py-2 bg-violet-500 text-white rounded-lg">Send Referral</button>
                </div>
              </div>
            )}
            {referralType === 'external' && (
              <div>
                <EthiopianHierarchySelector onSelect={setExternalReferralData} />
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setShowReferralModal(false)} className="px-6 py-2 bg-gray-100 rounded-lg">Cancel</button>
                  <button onClick={handleExternalRefer} disabled={!externalReferralData || loading} className="px-6 py-2 bg-violet-500 text-white rounded-lg">Send Referral</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bed Selection Modal */}
      {showBedListNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2100]">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Select Bed for Admission</h3>
            <p className="text-sm text-gray-600 mb-3">Available Beds in ANC Ward:</p>
            {availableBedsList.length === 0 ? (
              <div className="text-center py-8 bg-yellow-50 rounded-lg">
                <span className="text-4xl block">🛏️</span>
                <p>No beds available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto mb-4">
                {availableBedsList.map(bed => (
                  <button key={bed.id} onClick={() => { setShowBedListNotification(false); handleAdmit(bed.id); }} className="border-2 border-green-200 bg-green-50 hover:bg-green-100 rounded-xl p-4">
                    <div className="flex justify-between">
                      <span className="font-bold">Bed {bed.number}</span>
                      <span>🛏️</span>
                    </div>
                    <div className="text-xs text-gray-600">{bed.type === 'general' ? 'General Ward' : 'Private Room'}</div>
                    <div className="text-xs text-green-600 mt-2">✓ Available</div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowBedListNotification(false)} className="w-full px-4 py-2 bg-gray-100 rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* Send Report Modal */}
      {showSendReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaPaperPlane className="text-violet-500" /> Send Report
                </h2>
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
                  <input type="text" value={sendReportForm.title} onChange={(e) => setSendReportForm({...sendReportForm, title: e.target.value})} placeholder="e.g., Weekly ANC Report" className="w-full p-3 border border-gray-300 rounded-xl" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea value={sendReportForm.body} onChange={(e) => setSendReportForm({...sendReportForm, body: e.target.value})} rows="5" placeholder="Enter report details..." className="w-full p-3 border border-gray-300 rounded-xl resize-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                  <input type="file" ref={fileInputRef} onChange={(e) => { const files = Array.from(e.target.files); setSendReportForm(prev => ({ ...prev, attachments: [...prev.attachments, ...files] })); }} multiple accept="image/*,.pdf,.doc,.docx" className="w-full p-2 border border-gray-300 rounded-xl" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowSendReportModal(false)} className="px-5 py-2 border border-gray-300 rounded-xl">Cancel</button>
                  <button type="submit" disabled={loading} className="px-5 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl flex items-center gap-2">
                    {loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}{loading ? 'Sending...' : 'Send Report'}
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
                  {!selectedReport.is_opened ? <FaEnvelope className="text-violet-500" /> : <FaEnvelopeOpen className="text-gray-400" />}
                  <h2 className="text-xl font-bold text-gray-800">{selectedReport.title}</h2>
                </div>
                <button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className="p-2 hover:bg-gray-100 rounded-full">×</button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-gray-500">From</p>
                    <p className="font-semibold text-gray-800">{selectedReport.sender_full_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Priority</p>
                    <span className={`px-3 py-1 rounded-full text-xs ${selectedReport.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {selectedReport.priority}
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
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button onClick={() => { setShowReportDetailModal(false); setShowReplyModal(true); }} className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl flex items-center justify-center gap-2">
                    <FaReply /> Reply
                  </button>
                  <button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl">Close</button>
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
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaReply className="text-violet-500" /> Reply to Report
                </h2>
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
                <button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl">Cancel</button>
                <button onClick={handleSendReply} disabled={loading} className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl flex items-center justify-center gap-2">
                  {loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}{loading ? 'Sending...' : 'Send Reply'}
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
                  <button onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl">Cancel</button>
                  <button onClick={changePassword} className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl">Change Password</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MidwifeDashboard;