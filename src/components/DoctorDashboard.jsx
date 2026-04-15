import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import SignaturePad from 'react-signature-canvas';
import BedManagement from './BedManagementDashboard';
import BedSelection from './BedSelection';
import PharmacyStatus from './PharmacyStatus';
import DischargeList from './DischargeList';
import EthiopianHierarchySelector from './EthiopianHierarchySelector';
import { 
  FaSpinner, FaCheck, FaSearch, FaFileAlt, FaDownload, FaTimes, 
  FaInbox, FaPaperPlane, FaReply, FaEye, FaEnvelope, FaEnvelopeOpen,
  FaUserMd, FaStethoscope, FaIdCard, FaPhone, FaEnvelope as FaEnvelopeIcon,
  FaCalendarAlt, FaBriefcase, FaGraduationCap, FaClock, FaHospitalUser,
  FaUserCircle, FaSignOutAlt, FaChevronLeft, FaChevronRight, FaUsers,
  FaClock as FaClockIcon, FaExclamationTriangle, FaBell, FaEdit, FaSave,
  FaKey, FaCamera, FaTrash, FaPaperclip, FaCalendar, FaBell as FaBellIcon,
  FaRegClock, FaChartLine, FaFileExport, FaCalendarWeek, FaHeartbeat,
  FaPills, FaFlask, FaXRay, FaBaby, FaBed, FaUserTie, FaCreditCard,
  FaPlus, FaUpload
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ScheduleViewer from '../components/ScheduleViewer';
const DoctorDashboard = ({ user, onLogout }) => {
  // ==================== STATE MANAGEMENT ====================
  const [patients, setPatients] = useState([]);
  const [queuePatients, setQueuePatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [referralSelectedBed, setReferralSelectedBed] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showBedListNotification, setShowBedListNotification] = useState(false);
  const [availableBedsList, setAvailableBedsList] = useState([]);
  const [notification, setNotification] = useState(null);
  const [showDischargeList, setShowDischargeList] = useState(false);
  const [stats, setStats] = useState({
    waiting: 0,
    completed: 0,
    pendingLabs: 0,
    pendingRadiology: 0,
    inConsultation: 0,
    admitted: 0,
    pendingPharmacy: 0
  });
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // ==================== REPORT STATES ====================
  const [reportMainTab, setReportMainTab] = useState('queue'); // 'queue', 'inbox', 'sent'
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
  const [staffMembers, setStaffMembers] = useState([]);
  const [sendReportForm, setSendReportForm] = useState({
    recipient_type: 'hospital_admin',
    recipient_id: '',
    title: '',
    body: '',
    priority: 'medium',
    attachments: [],
    reminder_date: null,
    reminder_frequency: 'none'
  });
  const [reportsLoading, setReportsLoading] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState([]);
  const fileInputRef = useRef(null);

  // ==================== REMINDER STATES ====================
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderData, setReminderData] = useState({
    report_id: null,
    reminder_date: '',
    reminder_time: '',
    frequency: 'once',
    message: ''
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
    specialization: '',
    license_number: '',
    years_of_experience: '',
    employee_id: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    bio: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // ==================== GOOGLE SEARCH STATE ====================
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);

  // ==================== REPORT GENERATION STATE ====================
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});
  const [diagnosisValidation, setDiagnosisValidation] = useState({});
  const [prescriptionValidation, setPrescriptionValidation] = useState({});
  const [labValidation, setLabValidation] = useState({});
  const [radiologyValidation, setRadiologyValidation] = useState({});
  const [dischargeValidation, setDischargeValidation] = useState({});
  const [realTimeNotification, setRealTimeNotification] = useState(null); 

  // API Configuration
  const API_URL = 'http://localhost:5001';
  const SOCKET_URL = 'http://localhost:5001';

  // Consultation data
  const [diagnosis, setDiagnosis] = useState({
    primary: '',
    icd10: '',
    secondary: '',
    notes: ''
  });
  
  const [prescriptions, setPrescriptions] = useState([]);
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    route: 'oral',
    notes: '',
    quantity: 1,
    unit: 'tablet'
  });

  const [labRequests, setLabRequests] = useState([]);
  const [newLabRequest, setNewLabRequest] = useState({
    testType: 'blood',
    testName: '',
    priority: 'routine',
    notes: ''
  });

  const [radiologyRequests, setRadiologyRequests] = useState([]);
  const [newRadiologyRequest, setNewRadiologyRequest] = useState({
    examType: 'X-ray',
    bodyPart: '',
    priority: 'routine',
    notes: ''
  });

  const [labResults, setLabResults] = useState([]);
  const [radiologyResults, setRadiologyResults] = useState([]);
  const [vitals, setVitals] = useState(null);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [selectedBed, setSelectedBed] = useState('');

  // Discharge location state
  const [dischargeLocation, setDischargeLocation] = useState('');
  const [showDischargeLocationModal, setShowDischargeLocationModal] = useState(false);

  // Referral state
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralType, setReferralType] = useState('internal');
  const [selectedInternalWard, setSelectedInternalWard] = useState('');
  const [externalReferralData, setExternalReferralData] = useState(null);

  // Discharge list data
  const [dischargedPatients, setDischargedPatients] = useState([]);

  // Refs
  const signaturePad = useRef(null);
  const socket = useRef(null);
  const navigate = useNavigate();

  // ==================== HELPER FUNCTIONS ====================
  const getDoctorFullName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.first_name && user?.last_name) return `${user.first_name} ${user.last_name}`;
    if (user?.name) return user.name;
    return 'Doctor';
  };

  // ==================== REPORT FUNCTIONS ====================

  // Fetch reports inbox
  const fetchReportsInbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/doctor/reports/inbox`, {
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

  // Fetch reports outbox
  const fetchReportsOutbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/doctor/reports/outbox`, {
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

  // Fetch hospital admins for sending reports
  const fetchHospitalAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/doctor/hospital-admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHospitalAdmins(res.data.admins);
        if (res.data.admins.length === 1) {
          setSendReportForm(prev => ({
            ...prev,
            recipient_id: res.data.admins[0].id
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching hospital admins:', error);
    }
  };
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
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-purple-100">
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
  // Fetch staff members for sending reports
  const fetchStaffMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/doctor/hospital-staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setStaffMembers(res.data.staff);
      }
    } catch (error) {
      console.error('Error fetching staff members:', error);
    }
  };

  // Handle file attachment
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
    
    setSendReportForm(prev => ({
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
    setSendReportForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
    setAttachmentPreview(prev => prev.filter((_, i) => i !== index));
  };

  // Send report to hospital admin or staff
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
      
      // Create FormData for file uploads
      const formData = new FormData();
      formData.append('title', sendReportForm.title);
      formData.append('subject', sendReportForm.title);
      formData.append('body', sendReportForm.body);
      formData.append('priority', sendReportForm.priority);
      formData.append('recipient_type', sendReportForm.recipient_type);
      formData.append('recipient_id', sendReportForm.recipient_id);
      if (sendReportForm.reminder_date) {
        formData.append('reminder_date', sendReportForm.reminder_date);
        formData.append('reminder_frequency', sendReportForm.reminder_frequency);
      }
      
      // Append attachments
      sendReportForm.attachments.forEach((file, index) => {
        formData.append('attachments', file);
      });
      
      const res = await axios.post(`${API_URL}/api/doctor/reports/send`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
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
          attachments: [],
          reminder_date: null,
          reminder_frequency: 'none'
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

  // Mark report as read
  const markReportAsRead = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/doctor/reports/${reportId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReportsInbox();
    } catch (error) {
      console.error('Error marking report as read:', error);
    }
  };

  // View report details
  const viewReportDetails = (report) => {
    setSelectedReport(report);
    setShowReportDetailModal(true);
    if (!report.is_opened) {
      markReportAsRead(report.id);
    }
  };

  // Send reply to report with attachment
  const handleSendReply = async () => {
    if (!replyText.trim() && !replyAttachment) {
      setMessage({ type: 'error', text: 'Please enter a reply message or attach a file' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('body', replyText);
      if (replyAttachment) {
        formData.append('attachment', replyAttachment);
      }
      
      const res = await axios.post(`${API_URL}/api/doctor/reports/${selectedReport.id}/reply`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
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

  // Set reminder for report
  const handleSetReminder = async () => {
    if (!reminderData.reminder_date) {
      setMessage({ type: 'error', text: 'Please select a reminder date' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/doctor/reports/${reminderData.report_id}/reminder`, {
        reminder_date: reminderData.reminder_date,
        reminder_time: reminderData.reminder_time,
        frequency: reminderData.frequency,
        message: reminderData.message
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Reminder set successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setShowReminderModal(false);
        setReminderData({
          report_id: null,
          reminder_date: '',
          reminder_time: '',
          frequency: 'once',
          message: ''
        });
      }
    } catch (error) {
      console.error('Error setting reminder:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error setting reminder' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // ==================== PROFILE FUNCTIONS ====================
  
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/doctor/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const doctor = res.data.doctor;
        setProfileData({
          first_name: doctor.first_name || '',
          middle_name: doctor.middle_name || '',
          last_name: doctor.last_name || '',
          gender: doctor.gender || '',
          age: doctor.age || '',
          phone: doctor.phone || '',
          email: doctor.email || '',
          specialization: doctor.specialization || '',
          license_number: doctor.license_number || '',
          years_of_experience: doctor.years_of_experience || '',
          employee_id: doctor.employee_id || '',
          emergency_contact_name: doctor.emergency_contact?.name || '',
          emergency_contact_phone: doctor.emergency_contact?.phone || '',
          emergency_contact_relationship: doctor.emergency_contact?.relationship || '',
          bio: doctor.bio || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/doctor/profile`, {
        first_name: profileData.first_name,
        middle_name: profileData.middle_name,
        last_name: profileData.last_name,
        gender: profileData.gender,
        age: profileData.age,
        phone: profileData.phone,
        specialization: profileData.specialization,
        license_number: profileData.license_number,
        years_of_experience: profileData.years_of_experience,
        emergency_contact: {
          name: profileData.emergency_contact_name,
          phone: profileData.emergency_contact_phone,
          relationship: profileData.emergency_contact_relationship
        },
        bio: profileData.bio
      }, { headers: { Authorization: `Bearer ${token}` } });
      
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
      const res = await axios.put(`${API_URL}/api/doctor/change-password`, {
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

  // ==================== GOOGLE SEARCH HANDLER ====================
  const handleGoogleSearch = () => {
    if (searchQuery.trim()) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' medical reference')}`;
      window.open(url, "_blank");
      setSearchQuery('');
      setShowSearchBar(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleGoogleSearch();
    }
  };

  // ==================== REPORT GENERATION HANDLERS ====================
  const reportOptions = [
    { value: 'daily_patients', label: '📊 Daily Patient Report', type: 'pdf' },
    { value: 'prescription_summary', label: '💊 Prescription Summary', type: 'excel' },
    { value: 'lab_requests', label: '🔬 Lab Request Report', type: 'pdf' },
    { value: 'radiology_requests', label: '📷 Radiology Report', type: 'excel' },
    { value: 'discharge_summary', label: '🏠 Discharge Summary', type: 'pdf' }
  ];

  const generateReport = async () => {
    if (!reportType) {
      setMessage({ type: 'error', text: 'Please select a report type' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    setGeneratingReport(true);
    
    try {
      const token = localStorage.getItem('token');
      const selectedReport = reportOptions.find(r => r.value === reportType);
      
      let reportData = [];
      let filename = `${reportType}_${reportDate}`;
      
      switch(reportType) {
        case 'daily_patients':
          const patientsRes = await axios.get(
            `${API_URL}/api/doctor/queue`,
            { 
              params: {
                ward: user?.ward,
                hospital_id: user?.hospital_id,
                date: reportDate
              },
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          reportData = patientsRes.data.queue || [];
          filename = `Daily_Patients_${user?.ward}_${reportDate}`;
          break;
          
        case 'prescription_summary':
          const prescriptionsRes = await axios.get(
            `${API_URL}/api/doctor/prescriptions`,
            { 
              params: {
                doctor_id: user?.id,
                date: reportDate
              },
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          reportData = prescriptionsRes.data.prescriptions || [];
          filename = `Prescription_Summary_${user?.full_name}_${reportDate}`;
          break;
          
        case 'lab_requests':
          const labRes = await axios.get(
            `${API_URL}/api/doctor/lab-requests`,
            { 
              params: {
                doctor_id: user?.id,
                date: reportDate
              },
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          reportData = labRes.data.requests || [];
          filename = `Lab_Requests_${user?.full_name}_${reportDate}`;
          break;
          
        case 'radiology_requests':
          const radiologyRes = await axios.get(
            `${API_URL}/api/doctor/radiology-requests`,
            { 
              params: {
                doctor_id: user?.id,
                date: reportDate
              },
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          reportData = radiologyRes.data.requests || [];
          filename = `Radiology_Requests_${user?.full_name}_${reportDate}`;
          break;
          
        case 'discharge_summary':
          const dischargeRes = await axios.get(
            `${API_URL}/api/doctor/discharges`,
            { 
              params: {
                doctor_id: user?.id,
                date: reportDate
              },
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          reportData = dischargeRes.data.discharges || [];
          filename = `Discharge_Summary_${user?.full_name}_${reportDate}`;
          break;
          
        default:
          break;
      }
      
      if (selectedReport?.type === 'pdf') {
        generatePDF(reportData, filename, reportType);
      } else {
        generateExcel(reportData, filename, reportType);
      }
      
      setMessage({ type: 'success', text: 'Report generated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      setShowReportModal(false);
      setReportType('');
      
    } catch (error) {
      console.error('Error generating report:', error);
      setMessage({ type: 'error', text: 'Error generating report' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setGeneratingReport(false);
    }
  };

  const generatePDF = (data, filename, type) => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(13, 148, 136);
    doc.text(`${type.replace(/_/g, ' ').toUpperCase()}`, 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Doctor: ${user?.full_name}`, 14, 35);
    doc.text(`Ward: ${user?.ward}`, 14, 45);
    doc.text(`Date: ${reportDate}`, 14, 55);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 65);
    
    const tableColumn = getTableColumns(type);
    const tableRows = data.map(item => getTableRow(item, type));
    
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 75,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] }
    });
    
    doc.save(`${filename}.pdf`);
  };

  const generateExcel = (data, filename, type) => {
    const worksheetData = data.map(item => getExcelRow(item, type));
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const getTableColumns = (type) => {
    switch(type) {
      case 'daily_patients':
        return ['Patient Name', 'Card Number', 'Priority', 'Status', 'Time'];
      case 'prescription_summary':
        return ['Medication', 'Dosage', 'Quantity', 'Patient', 'Date'];
      case 'lab_requests':
        return ['Test Name', 'Test Type', 'Priority', 'Patient', 'Status'];
      case 'radiology_requests':
        return ['Exam Type', 'Body Part', 'Priority', 'Patient', 'Status'];
      case 'discharge_summary':
        return ['Patient Name', 'Diagnosis', 'Discharge Location', 'Date'];
      default:
        return ['Data'];
    }
  };

  const getTableRow = (item, type) => {
    switch(type) {
      case 'daily_patients':
        return [
          `${item.first_name} ${item.last_name}`,
          item.card_number,
          item.triage_info?.priority || 'routine',
          item.status,
          new Date(item.createdAt).toLocaleDateString()
        ];
      case 'prescription_summary':
        return [
          item.name,
          item.dosage,
          item.quantity,
          item.patient_name,
          new Date(item.prescribed_at).toLocaleDateString()
        ];
      case 'lab_requests':
        return [
          item.testName,
          item.testType,
          item.priority,
          item.patient_name,
          item.status
        ];
      case 'radiology_requests':
        return [
          item.examType,
          item.bodyPart,
          item.priority,
          item.patient_name,
          item.status
        ];
      case 'discharge_summary':
        return [
          `${item.first_name} ${item.last_name}`,
          item.diagnosis?.primary || 'N/A',
          item.discharge_location,
          new Date(item.discharged_at).toLocaleDateString()
        ];
      default:
        return [JSON.stringify(item)];
    }
  };

  const getExcelRow = (item, type) => {
    switch(type) {
      case 'daily_patients':
        return {
          'Patient Name': `${item.first_name} ${item.last_name}`,
          'Card Number': item.card_number,
          'Priority': item.triage_info?.priority || 'routine',
          'Status': item.status,
          'Date': new Date(item.createdAt).toLocaleDateString()
        };
      case 'prescription_summary':
        return {
          'Medication': item.name,
          'Dosage': item.dosage,
          'Quantity': item.quantity,
          'Patient': item.patient_name,
          'Date': new Date(item.prescribed_at).toLocaleDateString()
        };
      default:
        return item;
    }
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-emerald-100 text-emerald-800',
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

  // ==================== VALIDATION FUNCTIONS ====================
  
  const validateDiagnosis = () => {
    const errors = {};
    if (!diagnosis.primary || diagnosis.primary.trim() === '') {
      errors.primary = 'Primary diagnosis is required';
    } else if (diagnosis.primary.length < 3) {
      errors.primary = 'Diagnosis must be at least 3 characters';
    } else if (diagnosis.primary.length > 500) {
      errors.primary = 'Diagnosis cannot exceed 500 characters';
    }
    
    if (diagnosis.icd10 && diagnosis.icd10.trim() !== '') {
      const icd10Regex = /^[A-Z]\d{2}\.\d{1,2}$|^[A-Z]\d{2}$/;
      if (!icd10Regex.test(diagnosis.icd10.toUpperCase())) {
        errors.icd10 = 'Invalid ICD-10 format (e.g., I21.9 or I21)';
      }
    }
    
    if (diagnosis.notes && diagnosis.notes.length > 2000) {
      errors.notes = 'Notes cannot exceed 2000 characters';
    }
    
    setDiagnosisValidation(errors);
    return Object.keys(errors).length === 0;
  };
  
  const validateMedication = (med) => {
    const errors = {};
    if (!med.name || med.name.trim() === '') {
      errors.name = 'Medication name is required';
    } else if (med.name.length < 2) {
      errors.name = 'Medication name must be at least 2 characters';
    } else if (med.name.length > 200) {
      errors.name = 'Medication name cannot exceed 200 characters';
    }
    
    if (!med.dosage || med.dosage.trim() === '') {
      errors.dosage = 'Dosage is required';
    } else if (med.dosage.length > 100) {
      errors.dosage = 'Dosage cannot exceed 100 characters';
    } else {
      const dosageRegex = /^\d+(\.\d+)?\s*(mg|g|mcg|ml|tablet|capsule|drop|spray|injection)$/i;
      if (!dosageRegex.test(med.dosage.trim())) {
        errors.dosage = 'Format: e.g., "500mg", "10ml", "2 tablets"';
      }
    }
    
    if (med.quantity && (med.quantity < 1 || med.quantity > 1000)) {
      errors.quantity = 'Quantity must be between 1 and 1000';
    }
    
    if (med.frequency && med.frequency.length > 100) {
      errors.frequency = 'Frequency cannot exceed 100 characters';
    }
    
    if (med.duration && med.duration.length > 100) {
      errors.duration = 'Duration cannot exceed 100 characters';
    }
    
    if (med.notes && med.notes.length > 500) {
      errors.notes = 'Notes cannot exceed 500 characters';
    }
    return errors;
  };
  
  const validateLabRequest = (req) => {
    const errors = {};
    if (!req.testName || req.testName.trim() === '') {
      errors.testName = 'Test name is required';
    }
    if (req.notes && req.notes.length > 500) {
      errors.notes = 'Notes cannot exceed 500 characters';
    }
    return errors;
  };
  
  const validateRadiologyRequest = (req) => {
    const errors = {};
    if (!req.bodyPart || req.bodyPart.trim() === '') {
      errors.bodyPart = 'Body part is required';
    } else if (req.bodyPart.length < 2) {
      errors.bodyPart = 'Body part must be at least 2 characters';
    } else if (req.bodyPart.length > 100) {
      errors.bodyPart = 'Body part cannot exceed 100 characters';
    }
    if (req.notes && req.notes.length > 500) {
      errors.notes = 'Notes cannot exceed 500 characters';
    }
    return errors;
  };
  
  const validateDischarge = () => {
    const errors = {};
    if (!dischargeLocation) {
      errors.dischargeLocation = 'Please select a discharge location';
    }
    if (!signaturePad.current || signaturePad.current.isEmpty()) {
      errors.signature = 'Please provide your signature';
    }
    return errors;
  };
  
  const validateAdmission = () => {
    const errors = {};
    if (!selectedBed) {
      errors.bed = 'Please select a bed';
    }
    if (!signaturePad.current || signaturePad.current.isEmpty()) {
      errors.signature = 'Please provide your signature';
    }
    return errors;
  };
  
  const validateReferral = () => {
    const errors = {};
    if (referralType === 'internal') {
      if (!selectedInternalWard) {
        errors.ward = 'Please select a ward';
      }
    } else {
      if (!externalReferralData || !externalReferralData.hospital) {
        errors.hospital = 'Please select a hospital';
      }
    }
    if (!signaturePad.current || signaturePad.current.isEmpty()) {
      errors.signature = 'Please provide your signature';
    }
    return errors;
  };

  // ==================== WARD CONFIGURATION ====================
  const wardConfig = {
    'OPD': {
      title: 'OPD Doctor Dashboard',
      primaryColor: '#0d9488',
      secondaryColor: '#14b8a6',
      accentColor: '#0f766e',
      bgGradient: 'from-teal-600 to-emerald-500',
      queueTitle: 'Outpatient Queue',
      icon: '🏥',
      sidebarIcon: '🩺',
      statusFilter: 'in_opd',
      incomingStatus: 'triaged_opd',
      criticalThresholds: {
        bpSystolic: { min: 90, max: 180 },
        temperature: { min: 35, max: 39 },
        heartRate: { min: 50, max: 120 },
        o2Saturation: { min: 90 }
      }
    },
    'EME': {
      title: 'Emergency Doctor Dashboard',
      primaryColor: '#ef4444',
      secondaryColor: '#f87171',
      accentColor: '#dc2626',
      bgGradient: 'from-red-500 to-rose-400',
      queueTitle: 'Emergency Queue',
      icon: '🚨',
      sidebarIcon: '⚕️',
      statusFilter: 'in_emergency',
      incomingStatus: 'triaged_emergency',
      criticalThresholds: {
        bpSystolic: { min: 90, max: 160 },
        temperature: { min: 35.5, max: 38.5 },
        heartRate: { min: 60, max: 100 },
        o2Saturation: { min: 92 }
      }
    },
    'ANC': {
      title: 'Antenatal Doctor Dashboard',
      primaryColor: '#8b5cf6',
      secondaryColor: '#a78bfa',
      accentColor: '#7c3aed',
      bgGradient: 'from-violet-500 to-purple-400',
      queueTitle: 'Maternity Queue',
      icon: '🤰',
      sidebarIcon: '👶',
      statusFilter: 'in_anc',
      incomingStatus: 'triaged_anc',
      criticalThresholds: {
        bpSystolic: { min: 90, max: 140 },
        temperature: { min: 36, max: 38 },
        heartRate: { min: 70, max: 110 },
        o2Saturation: { min: 94 }
      }
    }
  };

  const currentWard = wardConfig[user?.ward] || wardConfig['OPD'];

  const internalWards = ['OPD', 'EME', 'ANC'];

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

  // ==================== CONNECTION STATUS BANNER ====================
  const ConnectionStatusBanner = () => {
    if (connectionStatus === 'connected') return null;
    
    return (
      <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-2 rounded-full shadow-lg flex items-center gap-3 ${
        connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
      } text-white`}>
        <span className="text-xl">
          {connectionStatus === 'connecting' ? '🔄' : '⚠️'}
        </span>
        <span>
          {connectionStatus === 'connecting' 
            ? 'Connecting to server...' 
            : 'Disconnected from server. Trying to reconnect...'}
        </span>
      </div>
    );
  };

  // ==================== FETCH DISCHARGED PATIENTS ====================
  const fetchDischargedPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_URL}/api/doctor/discharged-patients`,
        { 
          params: {
            hospital_id: user?.hospital_id,
            ward: user?.ward
          },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );
      
      if (res.data.success) {
        setDischargedPatients(res.data.patients);
      }
    } catch (error) {
      console.error('Error fetching discharged patients:', error);
    }
  };

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    if (!user?.hospital_id || !user?.ward) {
      console.log('Waiting for user data...');
      return;
    }

    console.log('Initializing dashboard for:', {
      hospital_id: user.hospital_id,
      ward: user.ward,
      doctor_id: user.id,
      department: user.department
    });

    const token = localStorage.getItem('token');
    
    socket.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });
    
    socket.current.on('connect', () => {
      console.log('✅ Socket connected successfully');
      setConnectionStatus('connected');
      
      if (user?.hospital_id && user?.ward) {
        const wardRoom = `hospital_${user.hospital_id}_ward_${user.ward}`;
        console.log(`📡 Joining ward room: ${wardRoom}`);
        socket.current.emit('join', wardRoom);
        
        const doctorRoom = `hospital_${user.hospital_id}_doctor_${user.id}`;
        console.log(`📡 Joining doctor room: ${doctorRoom}`);
        socket.current.emit('join', doctorRoom);
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

    socket.current.on('joined_room', (data) => {
      console.log('✅ Successfully joined room:', data);
    });
    // Add this inside the socket.current.on section

// Add this after socket.current.on('joined_room', ...)

// Join staff personal room for schedule updates
// Join staff personal room for schedule updates - FIXED
socket.current.emit('join_staff', { 
  staffId: user.id, 
  hospitalId: user.hospital_id 
});
console.log(`📡 Joined staff room: hospital_${user.hospital_id}_staff_${user.id}`);

// Listen for weekly schedule ready
socket.current.on('weekly_schedule_ready', (data) => {
  console.log('📅 Weekly schedule ready event received:', data);
  setRealTimeNotification({
    id: Date.now(),
    type: 'weekly_schedule',
    title: 'Weekly Schedule Ready',
    message: `Your schedule for ${data.week_range} is ready. ${data.schedules_count} shifts, ${data.total_hours} hours.`,
    priority: 'high',
    timestamp: new Date()
  });
  
  // Refresh schedule viewer if visible
  if (reportMainTab === 'schedule') {
    const event = new CustomEvent('refreshSchedule');
    window.dispatchEvent(event);
  }
  
  setTimeout(() => setRealTimeNotification(null), 10000);
});

// Listen for new schedule assigned
socket.current.on('new_schedule_assigned', (data) => {
  console.log('📅 New schedule assigned event:', data);
  setRealTimeNotification({
    id: Date.now(),
    type: 'schedule',
    title: 'New Schedule Assigned',
    message: `${data.shift} Shift on ${data.date} in ${data.ward} Ward`,
    priority: 'high',
    timestamp: new Date()
  });
  
  if (reportMainTab === 'schedule') {
    const event = new CustomEvent('refreshSchedule');
    window.dispatchEvent(event);
  }
  
  setTimeout(() => setRealTimeNotification(null), 8000);
});

// Listen for schedule update
socket.current.on('schedule_updated_notification', (data) => {
  console.log('📅 Schedule updated event:', data);
  setRealTimeNotification({
    id: Date.now(),
    type: 'schedule_update',
    title: 'Schedule Updated',
    message: `Your ${data.shift} shift on ${data.date} has been ${data.status || 'updated'}`,
    priority: 'medium',
    timestamp: new Date()
  });
  
  if (reportMainTab === 'schedule') {
    const event = new CustomEvent('refreshSchedule');
    window.dispatchEvent(event);
  }
  
  setTimeout(() => setRealTimeNotification(null), 6000);
});

// Listen for schedule cancelled
socket.current.on('schedule_cancelled', (data) => {
  console.log('❌ Schedule cancelled event:', data);
  setRealTimeNotification({
    id: Date.now(),
    type: 'schedule_cancel',
    title: 'Schedule Cancelled',
    message: `Your ${data.shift} shift on ${data.date} has been cancelled.`,
    priority: 'urgent',
    timestamp: new Date()
  });
  
  if (reportMainTab === 'schedule') {
    const event = new CustomEvent('refreshSchedule');
    window.dispatchEvent(event);
  }
  
  setTimeout(() => setRealTimeNotification(null), 8000);
});
    socket.current.on('report_reply_from_hospital', (data) => {
      console.log('💬 New reply received from Hospital Admin:', data);
      setNotification({
        type: 'info',
        message: `💬 New reply on report: ${data.title} from Hospital Admin`
      });
      fetchReportsInbox();
      setTimeout(() => setNotification(null), 5000);
    });

    socket.current.on('new_patient_in_ward', (data) => {
      console.log('🆕 New patient in ward:', data);
      
      if (data.hospital_id === user?.hospital_id && data.ward === user?.ward) {
        setNotification({
          type: 'info',
          message: `🆕 New ${data.priority} patient: ${data.patient_name}`
        });
        fetchQueue();
        fetchStats();
        setTimeout(() => setNotification(null), 5000);
      }
    });

    socket.current.on('lab_result_ready', (data) => {
      console.log('📋 Lab results ready event:', data);
      setNotification({
        type: 'success',
        message: `🔬 New lab results for ${data.patient_name}`
      });
      
      if (selectedPatient?.id === data.patient_id) {
        fetchLabResults(data.patient_id);
        if (activeTab === 'results') {
          setTimeout(() => fetchLabResults(data.patient_id), 1000);
        }
      } else {
        setQueuePatients(prev => prev.map(p => 
          p.id === data.patient_id ? { ...p, has_new_results: true } : p
        ));
      }
      fetchQueue();
      fetchStats();
      setTimeout(() => setNotification(null), 5000);
    });

    socket.current.on('critical_lab_result', (data) => {
      console.log('⚠️ Critical lab result:', data);
      let message = `⚠️ CRITICAL: ${data.patient_name}`;
      if (data.critical_values && data.critical_values.length > 0) {
        message += ` - ${data.critical_values.map(cv => `${cv.parameter}: ${cv.value}`).join(', ')}`;
      }
      setNotification({ type: 'error', message: message });
      if (selectedPatient?.id === data.patient_id) {
        fetchLabResults(data.patient_id);
      }
      setTimeout(() => setNotification(null), 10000);
    });

    socket.current.on('radiology_report_ready', (data) => {
      console.log('📷 Radiology report ready:', data);
      setNotification({
        type: data.critical ? 'error' : 'success',
        message: `${data.critical ? '⚠️ CRITICAL: ' : '📷 '}Radiology report ready for ${data.patient_name}`
      });
      if (selectedPatient && selectedPatient.id === data.patient_id) {
        fetchRadiologyResults(data.patient_id);
        if (activeTab === 'results') {
          setTimeout(() => fetchRadiologyResults(data.patient_id), 500);
        }
      } else {
        setQueuePatients(prev => prev.map(p => 
          p.id === data.patient_id ? { ...p, has_new_results: true, has_new_radiology: true } : p
        ));
      }
      fetchStats();
      setTimeout(() => setNotification(null), 8000);
    });

    socket.current.on('prescription_status_update', (data) => {
      console.log('💊 Prescription status updated:', data);
      if (data.patient_id === selectedPatient?.id) {
        setPrescriptions(prev => prev.map(p => 
          p.id === data.prescription_id ? { ...p, status: data.status, pharmacy_notes: data.notes } : p
        ));
        setNotification({
          type: 'info',
          message: `💊 Prescription ${data.status}: ${data.medication_name}`
        });
        setTimeout(() => setNotification(null), 5000);
      }
    });

    socket.current.on('bed_availability_update', (data) => {
      setAvailableBeds(data.beds || []);
      if (activeTab === 'admit') {
        fetchAvailableBeds();
      }
    });

    socket.current.on('patient_discharged', (data) => {
      console.log('🏥 Patient discharged:', data);
      fetchStats();
      if (showDischargeList) {
        fetchDischargedPatients();
      }
    });

    fetchQueue();
    fetchStats();
    fetchDischargedPatients();
    fetchReportsInbox();
    fetchReportsOutbox();
    fetchHospitalAdmins();
    fetchStaffMembers();
    fetchProfile();

    const interval = setInterval(() => {
      fetchQueue();
      fetchStats();
      if (showDischargeList) {
        fetchDischargedPatients();
      }
      fetchReportsInbox();
    }, 30000);

    return () => {
      console.log('🔌 Cleaning up socket connection');
      if (socket.current) {
        socket.current.disconnect();
      }
      clearInterval(interval);
    };
  }, [user?.hospital_id, user?.ward, showDischargeList]);

  // ==================== API CALLS ====================
  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token || !user?.hospital_id || !user?.ward) return;

      console.log(`Fetching queue for ${user.ward} ward...`);
      
      const res = await axios.get(
        `${API_URL}/api/doctor/queue`,
        { 
          params: {
            ward: user.ward,
            hospital_id: user.hospital_id,
            doctor_id: user.id
          },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );
      
      if (res.data.success) {
        const processedQueue = (res.data.queue || []).map(patient => ({
          ...patient,
          has_new_results: patient.has_new_results || false
        }));
        setQueuePatients(processedQueue);
        setStats(prev => ({ ...prev, waiting: processedQueue.length }));
      } else {
        setQueuePatients([]);
        setStats(prev => ({ ...prev, waiting: 0 }));
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
      if (error.response?.status === 401) {
        setMessage({ type: 'error', text: 'Session expired. Please login again.' });
        setTimeout(() => onLogout(), 2000);
      }
      setQueuePatients([]);
      setStats(prev => ({ ...prev, waiting: 0 }));
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const fetchRadiologyResults = async (patientId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_URL}/api/doctor/radiology-results/${patientId}`,
        { 
          params: { doctor_id: user?.id, hospital_id: user?.hospital_id },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );
      
      if (res.data.success) {
        let results = res.data.results || [];
        setRadiologyResults(results);
      } else {
        setRadiologyResults([]);
      }
    } catch (error) {
      console.error('Error fetching radiology results:', error);
      setRadiologyResults([]);
    }
  };

  const fetchLabResults = async (patientId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_URL}/api/doctor/lab-results/${patientId}`,
        { 
          params: { doctor_id: user?.id, hospital_id: user?.hospital_id },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );
      
      if (res.data.success) {
        let results = res.data.completed || [];
        setLabResults(results);
      } else {
        setLabResults([]);
      }
    } catch (error) {
      console.error('Error fetching lab results:', error);
      setLabResults([]);
    }
  };
  
  const fetchAvailableBeds = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_URL}/api/doctor/available-beds`,
        { 
          params: { ward: user?.ward, hospital_id: user?.hospital_id },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );
      
      if (res.data.success) {
        setAvailableBeds(res.data.beds || []);
        setAvailableBedsList(res.data.beds || []);
        return res.data.beds;
      }
      return [];
    } catch (error) {
      console.error('Error fetching beds:', error);
      setAvailableBeds([]);
      setAvailableBedsList([]);
      return [];
    }
  };
 
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user?.hospital_id || !user?.ward) return;

      const res = await axios.get(
        `${API_URL}/api/doctor/stats`,
        { 
          params: { ward: user.ward, hospital_id: user.hospital_id, doctor_id: user.id },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );
      
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // ==================== DEBUG EFFECTS ====================
  useEffect(() => {
    console.log('🔄 labResults updated:', labResults);
  }, [labResults]);

  useEffect(() => {
    console.log('🔄 radiologyResults updated:', radiologyResults);
  }, [radiologyResults]);

  // ==================== PATIENT HANDLING ====================
  const handleTakePatient = async (patient) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const res = await axios.post(
        `${API_URL}/api/doctor/assign-patient`,
        {
          patient_id: patient.id,
          doctor_id: user?.id,
          doctor_name: getDoctorFullName(),
          ward: user?.ward,
          hospital_id: user?.hospital_id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSelectedPatient(res.data.patient);
        setVitals(res.data.patient.vitals);
        setShowPatientModal(true);
        setActiveTab('details');
        setQueuePatients(prev => prev.filter(p => p.id !== patient.id));
        await Promise.all([
          fetchLabResults(patient.id),
          fetchRadiologyResults(patient.id)
        ]);
        if (res.data.patient.prescriptions) setPrescriptions(res.data.patient.prescriptions);
        if (res.data.patient.diagnosis) setDiagnosis(res.data.patient.diagnosis);
        setMessage({ type: 'success', text: 'Patient assigned successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error taking patient:', error);
      setMessage({ type: 'error', text: error.response?.status === 404 ? 'Patient not found' : 'Error taking patient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== DIAGNOSIS ====================
  const handleDiagnosisChange = (e) => {
    const { name, value } = e.target;
    setDiagnosis({ ...diagnosis, [name]: value });
    setDiagnosisValidation(prev => ({ ...prev, [name]: '' }));
  };

  const handleSaveDiagnosis = async () => {
    if (!validateDiagnosis()) {
      setMessage({ type: 'error', text: 'Please fix validation errors before saving' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/doctor/save-diagnosis`,
        { patient_id: selectedPatient.id, diagnosis, doctor_id: user?.id, hospital_id: user?.hospital_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Diagnosis saved' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setSelectedPatient(prev => ({ ...prev, diagnosis }));
      }
    } catch (error) {
      console.error('Error saving diagnosis:', error);
      setMessage({ type: 'error', text: 'Error saving diagnosis' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // ==================== PRESCRIPTIONS ====================
  const handleMedicationChange = (e) => {
    const { name, value } = e.target;
    setNewMedication({ ...newMedication, [name]: value });
    setPrescriptionValidation(prev => ({ ...prev, [name]: '' }));
  };

  const addMedication = () => {
    const errors = validateMedication(newMedication);
    setPrescriptionValidation(errors);
    
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: 'Please fix validation errors before adding medication' });
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
      name: '', dosage: '', frequency: '', duration: '', route: 'oral', notes: '', quantity: 1, unit: 'tablet'
    });
    setPrescriptionValidation({});
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
      const items = prescriptions.map(p => ({
        name: p.name, dosage: p.dosage, quantity: p.quantity || 1,
        unit: p.unit || (p.route === 'oral' ? 'tablet' : 'ml'),
        frequency: p.frequency || 'as directed', duration: p.duration || 'as prescribed',
        route: p.route || 'oral', notes: p.notes || ''
      }));
      
      const res = await axios.post(
        `${API_URL}/api/doctor/save-prescriptions`,
        {
          patient_id: selectedPatient.id,
          patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
          prescriptions: items,
          doctor_id: user?.id,
          doctor_name: getDoctorFullName(),
          ward: user?.ward,
          hospital_id: user?.hospital_id,
          priority: 'routine',
          notes: diagnosis.notes || ''
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setMessage({ type: 'success', text: `${prescriptions.length} prescription(s) sent to pharmacy!` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setPrescriptions([]);
        
        if (socket.current && socket.current.connected) {
          socket.current.emit('new_prescriptions', {
            prescription_id: res.data.prescription?.id,
            prescription_number: res.data.prescription?.prescription_number,
            patient_id: selectedPatient.id,
            patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
            doctor_id: user?.id,
            doctor_name: getDoctorFullName(),
            ward: user?.ward,
            hospital_id: user?.hospital_id,
            items_count: prescriptions.length,
            items: items,
            notes: diagnosis.notes || '',
            status: 'pending'
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
  
  // ==================== LAB REQUESTS ====================
  const handleLabRequestChange = (e) => {
    const { name, value } = e.target;
    setNewLabRequest({ ...newLabRequest, [name]: value });
    setLabValidation(prev => ({ ...prev, [name]: '' }));
  };

  const addLabRequest = async () => {
    const errors = validateLabRequest(newLabRequest);
    setLabValidation(errors);
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: 'Please fix validation errors before sending lab request' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/doctor/request-lab`,
        {
          patient_id: selectedPatient.id,
          patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
          doctor_id: user?.id,
          doctor_name: getDoctorFullName(),
          ward: user?.ward,
          hospital_id: user?.hospital_id,
          ...newLabRequest
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Lab request sent' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setLabRequests([...labRequests, res.data.request]);
        if (socket.current) {
          socket.current.emit('lab_requested', {
            patient_id: selectedPatient.id,
            patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
            test_name: newLabRequest.testName,
            test_type: newLabRequest.testType,
            priority: newLabRequest.priority,
            doctor_name: getDoctorFullName(),
            ward: user?.ward,
            hospital_id: user?.hospital_id
          });
        }
        setStats(prev => ({ ...prev, pendingLabs: prev.pendingLabs + 1 }));
        setNewLabRequest({ testType: 'blood', testName: '', priority: 'routine', notes: '' });
      }
    } catch (error) {
      console.error('Error sending lab request:', error);
      setMessage({ type: 'error', text: 'Error sending lab request' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // ==================== RADIOLOGY REQUESTS ====================
  const handleRadiologyRequestChange = (e) => {
    const { name, value } = e.target;
    setNewRadiologyRequest({ ...newRadiologyRequest, [name]: value });
    setRadiologyValidation(prev => ({ ...prev, [name]: '' }));
  };

  const addRadiologyRequest = async () => {
    const errors = validateRadiologyRequest(newRadiologyRequest);
    setRadiologyValidation(errors);
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: 'Please fix validation errors before sending radiology request' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/doctor/request-radiology`,
        {
          patient_id: selectedPatient.id,
          patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
          doctor_id: user?.id,
          doctor_name: getDoctorFullName(),
          ward: user?.ward,
          hospital_id: user?.hospital_id,
          ...newRadiologyRequest
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Radiology request sent' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setRadiologyRequests([...radiologyRequests, res.data.request]);
        if (socket.current) {
          socket.current.emit('radiology_requested', {
            patient_id: selectedPatient.id,
            patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
            exam_type: newRadiologyRequest.examType,
            body_part: newRadiologyRequest.bodyPart,
            priority: newRadiologyRequest.priority,
            doctor_name: getDoctorFullName(),
            ward: user?.ward,
            hospital_id: user?.hospital_id
          });
        }
        setStats(prev => ({ ...prev, pendingRadiology: prev.pendingRadiology + 1 }));
        setNewRadiologyRequest({ examType: 'X-ray', bodyPart: '', priority: 'routine', notes: '' });
      }
    } catch (error) {
      console.error('Error sending radiology request:', error);
      setMessage({ type: 'error', text: 'Error sending radiology request' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // ==================== DISPOSITION ====================
  const openDischargeLocationModal = () => {
    setShowDischargeLocationModal(true);
    setDischargeLocation('');
    setDischargeValidation({});
  };

  const handleDischargeWithLocation = async () => {
    const errors = validateDischarge();
    setDischargeValidation(errors);
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: Object.values(errors)[0] });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const pendingPrescriptions = prescriptions.filter(p => p.status !== 'dispensed' && p.status !== 'pending');
    
    if (pendingPrescriptions.length > 0) {
      const confirmDischarge = window.confirm(
        `⚠️ ${pendingPrescriptions.length} prescription(s) not yet dispensed.\n` +
        `Are you sure you want to discharge to ${dischargeLocation}?`
      );
      if (!confirmDischarge) return;
    }

    const signature = signaturePad.current.toDataURL();

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/doctor/discharge-patient`,
        {
          patient_id: selectedPatient.id,
          doctor_id: user?.id,
          doctor_name: getDoctorFullName(),
          hospital_id: user?.hospital_id,
          ward: user?.ward,
          diagnosis,
          prescriptions,
          lab_requests: labRequests,
          lab_results: labResults,
          radiology_requests: radiologyRequests,
          radiology_results: radiologyResults,
          discharge_type: 'discharge',
          discharge_location: dischargeLocation,
          signature,
          discharge_notes: diagnosis.notes,
          pharmacy_status: { all_dispensed: pendingPrescriptions.length === 0, pending_count: pendingPrescriptions.length }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
            doctor_name: getDoctorFullName(),
            ward: user?.ward,
            hospital_id: user?.hospital_id,
            discharge_location: dischargeLocation
          });
        }
      }
    } catch (error) {
      console.error('Error discharging patient:', error);
      setMessage({ type: 'error', text: 'Error discharging patient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleAdmit = async (bedId) => {
    setSelectedBed(bedId);
    const errors = validateAdmission();
    setDischargeValidation(errors);
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: Object.values(errors)[0] });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const signature = signaturePad.current.toDataURL();

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/doctor/admit-patient`,
        {
          patient_id: selectedPatient.id,
          doctor_id: user?.id,
          doctor_name: getDoctorFullName(),
          hospital_id: user?.hospital_id,
          ward: user?.ward,
          bed_id: bedId,
          diagnosis,
          prescriptions,
          lab_requests: labRequests,
          lab_results: labResults,
          radiology_requests: radiologyRequests,
          radiology_results: radiologyResults,
          signature,
          admission_notes: diagnosis.notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Patient admitted successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setShowPatientModal(false);
        setSelectedPatient(null);
        setPrescriptions([]);
        setDiagnosis({ primary: '', icd10: '', secondary: '', notes: '' });
        setShowBedListNotification(false);
        fetchStats();
        fetchQueue();
        if (socket.current) {
          socket.current.emit('patient_admitted', {
            patient_id: selectedPatient.id,
            doctor_name: getDoctorFullName(),
            bed_id: bedId,
            ward: user?.ward,
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

  // ==================== REFERRAL HANDLING ====================
  const openReferralModal = () => {
    setShowReferralModal(true);
    setReferralType('internal');
    setSelectedInternalWard('');
    setExternalReferralData(null);
    setDischargeValidation({});
  };

  const handleInternalRefer = async () => {
    const errors = validateReferral();
    setDischargeValidation(errors);
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: Object.values(errors)[0] });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const signature = signaturePad.current.toDataURL();

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/doctor/refer-patient`,
        {
          patient_id: selectedPatient.id,
          doctor_id: user?.id,
          doctor_name: getDoctorFullName(),
          hospital_id: user?.hospital_id,
          ward: user?.ward,
          referral_type: 'internal',
          destination: selectedInternalWard,
          bed_id: referralSelectedBed || null,
          diagnosis,
          prescriptions,
          lab_requests: labRequests,
          lab_results: labResults,
          radiology_requests: radiologyRequests,
          radiology_results: radiologyResults,
          signature,
          referral_notes: diagnosis.notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
            doctor_name: getDoctorFullName(),
            referral_type: 'internal',
            destination: selectedInternalWard,
            ward: user?.ward,
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
    const errors = validateReferral();
    setDischargeValidation(errors);
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: Object.values(errors)[0] });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const signature = signaturePad.current.toDataURL();

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/doctor/refer-patient`,
        {
          patient_id: selectedPatient.id,
          doctor_id: user?.id,
          doctor_name: getDoctorFullName(),
          hospital_id: user?.hospital_id,
          ward: user?.ward,
          referral_type: 'external',
          destination: externalReferralData.hospital.name,
          external_data: externalReferralData,
          diagnosis,
          prescriptions,
          lab_requests: labRequests,
          lab_results: labResults,
          radiology_requests: radiologyRequests,
          radiology_results: radiologyResults,
          signature,
          referral_notes: diagnosis.notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setMessage({ type: 'success', text: `Patient referred to ${externalReferralData.hospital.name}` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setShowPatientModal(false);
        setShowReferralModal(false);
        setSelectedPatient(null);
        setPrescriptions([]);
        setDiagnosis({ primary: '', icd10: '', secondary: '', notes: '' });
        fetchStats();
        if (socket.current) {
          socket.current.emit('patient_referred', {
            patient_id: selectedPatient.id,
            doctor_name: getDoctorFullName(),
            referral_type: 'external',
            destination: externalReferralData.hospital.name,
            ward: user?.ward,
            hospital_id: user?.hospital_id
          });
        }
      }
    } catch (error) {
      console.error('Error referring patient:', error);
      setMessage({ type: 'error', text: 'Error referring patient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== HELPER FUNCTIONS ====================
  const getPriorityColor = (priority) => {
    const colors = {
      'critical': { bg: 'bg-red-100', color: 'text-red-800', text: 'CRITICAL', icon: '🔴' },
      'urgent': { bg: 'bg-orange-100', color: 'text-orange-800', text: 'URGENT', icon: '🟠' },
      'routine': { bg: 'bg-green-100', color: 'text-green-800', text: 'ROUTINE', icon: '🟢' }
    };
    return colors[priority] || colors.routine;
  };

  const getCriticalFlag = (vital, value) => {
    if (!value) return false;
    const thresholds = currentWard.criticalThresholds;
    if (vital === 'bp' && value) {
      const systolic = parseInt(value.split('/')[0]);
      if (systolic > thresholds.bpSystolic.max || systolic < thresholds.bpSystolic.min) return true;
    }
    if (vital === 'temperature' && value) {
      if (value > thresholds.temperature.max || value < thresholds.temperature.min) return true;
    }
    if (vital === 'heartRate' && value) {
      if (value > thresholds.heartRate.max || value < thresholds.heartRate.min) return true;
    }
    if (vital === 'o2' && value) {
      if (value < thresholds.o2Saturation.min) return true;
    }
    return false;
  };

  const labTests = {
    blood: ['CBC', 'Blood Chemistry', 'Blood Gas', 'Troponin', 'PT/INR', 'Blood Culture', 'Malaria Test', 'Typhoid Test', 'Blood Sugar', 'Liver Function Test', 'Kidney Function Test'],
    urine: ['Urinalysis', 'Urine Culture', 'Urine Pregnancy Test', 'Urine Toxicology', 'Urine Microscopy'],
    stool: ['Stool Culture', 'Stool Ova & Parasites', 'Stool Occult Blood', 'Stool Antigen', 'Stool Microscopy']
  };

  const handleLogout = () => {
    if (socket.current) socket.current.disconnect();
    if (onLogout) onLogout();
    navigate('/login');
  };

  // ==================== RENDER ====================
  return (
    <div className="font-sans bg-gradient-to-br from-emerald-50 to-teal-50 min-h-screen flex">
      <ConnectionStatusBanner />
        <RealTimeNotification /> 
      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes glow { 0% { box-shadow: 0 0 5px rgba(13,148,136,0.2); } 50% { box-shadow: 0 0 20px rgba(13,148,136,0.5); } 100% { box-shadow: 0 0 5px rgba(13,148,136,0.2); } }
        .animate-pulse-custom { animation: pulse 2s infinite; }
        .animate-fade-in { animation: fadeIn 0.5s ease; }
        .animate-slide-in { animation: slideIn 0.3s ease; }
        .animate-glow { animation: glow 2s infinite; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ==================== SIDEBAR - COLLAPSIBLE ==================== */}
      <div className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col h-screen sticky top-0 shadow-2xl z-50`}>
        {/* Sidebar Header */}
        <div className={`${sidebarCollapsed ? 'py-5 px-0' : 'p-6'} border-b border-slate-700/50 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">{currentWard.sidebarIcon}</span>
              </div>
              <div>
                <h3 className="m-0 text-lg font-semibold tracking-tight">{user?.ward} Ward</h3>
                <p className="mt-0.5 text-xs text-slate-400">Dr. {user?.full_name || getDoctorFullName()}</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">{currentWard.sidebarIcon}</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="bg-slate-700/50 hover:bg-slate-600 rounded-lg p-2 transition-all duration-200"
          >
            {sidebarCollapsed ? <FaChevronRight className="text-sm" /> : <FaChevronLeft className="text-sm" />}
          </button>
        </div>

        {/* Doctor Info - Only when expanded */}
        {!sidebarCollapsed && (
          <div className="p-4 bg-slate-800/50 m-4 rounded-xl border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Hospital</p>
            <p className="text-sm font-medium text-white mb-1 truncate">{user?.hospital_name || 'Loading...'}</p>
            <p className="text-xs text-teal-400">ID: {user?.hospital_id} • {user?.ward}</p>
          </div>
        )}

        {/* Navigation Menu */}
        <div className={`flex-1 ${sidebarCollapsed ? 'py-4 px-0' : 'p-4'}`}>
          <div className="mb-6">
            {!sidebarCollapsed && (
              <p className="text-[10px] text-slate-500 mx-3 mb-3 uppercase tracking-wider">Main Menu</p>
            )}
            
            {/* Patient Queue */}
            <div 
              onClick={() => { setShowDischargeList(false); setReportMainTab('queue'); }}
              className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 rounded-xl ${reportMainTab === 'queue' && !showDischargeList ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all duration-200 group`}
            >
              <span className="text-xl">👥</span>
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-sm font-medium">Patient Queue</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-white/20 text-white">
                    {queuePatients.length}
                  </span>
                </>
              )}
            </div>

            {/* Discharge List */}
            <div
              onClick={() => { setShowDischargeList(!showDischargeList); if (!showDischargeList) fetchDischargedPatients(); }}
              className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${showDischargeList ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all duration-200 group`}
            >
              <span className="text-xl">📋</span>
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-sm font-medium">Discharge List</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/80 text-white">
                    {stats.completed}
                  </span>
                </>
              )}
            </div>

            {/* Divider */}
            {!sidebarCollapsed && (
              <div className="h-px bg-slate-700/50 my-4 mx-3"></div>
            )}

            {/* Reports Inbox */}
            <div
              onClick={() => { setShowDischargeList(false); setReportMainTab('inbox'); fetchReportsInbox(); }}
              className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'inbox' && !showDischargeList ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all duration-200 group relative`}
            >
              <span className="text-xl">📬</span>
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-sm font-medium">Inbox</span>
                  {unreadReportsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white animate-pulse">
                      {unreadReportsCount}
                    </span>
                  )}
                </>
              )}
              {sidebarCollapsed && unreadReportsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center animate-pulse">
                  {unreadReportsCount}
                </span>
              )}
            </div>
{/* Sent Reports */}
<div
  onClick={() => { setShowDischargeList(false); setReportMainTab('sent'); fetchReportsOutbox(); }}
  className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'sent' && !showDischargeList ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all duration-200 group`}
>
  <span className="text-xl">📤</span>
  {!sidebarCollapsed && (
    <span className="flex-1 text-sm font-medium">Sent Reports</span>
  )}
</div>

{/* ==================== MY SCHEDULE ==================== */}
<div
  onClick={() => { setShowDischargeList(false); setReportMainTab('schedule'); }}
  className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'schedule' && !showDischargeList ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all duration-200 group`}
>
  <span className="text-xl">📅</span>
  {!sidebarCollapsed && (
    <span className="flex-1 text-sm font-medium">My Schedule</span>
  )}
</div>

{/* Divider */}
{!sidebarCollapsed && (
  <div className="h-px bg-slate-700/50 my-4 mx-3"></div>
)}

{/* Profile */}
<div
  onClick={() => { setShowDischargeList(false); setReportMainTab('profile'); }}
  className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'profile' && !showDischargeList ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all duration-200 group`}
>
  <span className="text-xl">👤</span>
  {!sidebarCollapsed && (
    <span className="flex-1 text-sm font-medium">Profile</span>
  )}
</div>

            {/* Stats for collapsed sidebar */}
            {sidebarCollapsed && (
              <div className="text-center mt-6 pt-4 border-t border-slate-700/50">
                <div className="text-xl font-bold text-teal-400">{queuePatients.length}</div>
                <div className="text-[10px] text-slate-500">Queue</div>
                {unreadReportsCount > 0 && (
                  <div className="mt-3">
                    <div className="text-lg font-bold text-red-400">{unreadReportsCount}</div>
                    <div className="text-[10px] text-slate-500">Unread</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats in Sidebar - Only when expanded */}
          {!sidebarCollapsed && (
            <div className="px-4 mt-auto">
              <p className="text-[10px] text-slate-500 mb-3 uppercase tracking-wider">Today'! Stats</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <div className="text-xl font-bold text-emerald-400">{stats.completed}</div>
                  <div className="text-[10px] text-slate-400">Completed</div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <div className="text-xl font-bold text-amber-400">{stats.pendingLabs}</div>
                  <div className="text-[10px] text-slate-400">Pending Labs</div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <div className="text-xl font-bold text-violet-400">{stats.pendingRadiology}</div>
                  <div className="text-[10px] text-slate-400">Pending Rad</div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <div className="text-xl font-bold text-blue-400">{stats.admitted}</div>
                  <div className="text-[10px] text-slate-400">Admitted</div>
                </div>
                <div className="col-span-2 bg-slate-800/50 p-3 rounded-xl">
                  <div className="text-xl font-bold text-pink-400">{stats.pendingPharmacy || 0}</div>
                  <div className="text-[10px] text-slate-400">Pending Pharmacy</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div className={`${sidebarCollapsed ? 'py-4 px-0' : 'p-5'} border-t border-slate-700/50`}>
          <button
            onClick={handleLogout}
            className={`w-full ${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} bg-transparent border border-slate-600 rounded-xl text-red-400 cursor-pointer flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 text-sm transition-all duration-200 hover:bg-red-500/10 hover:border-red-500 group`}
          >
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
                    {showDischargeList ? 'Discharge List' : 
                     reportMainTab === 'inbox' ? 'Reports - Inbox' : 
                     reportMainTab === 'sent' ? 'Reports - Sent' : 
                     reportMainTab === 'profile' ? 'My Profile' : 
                     currentWard.title}
                  </h1>
                  <p className="text-base text-white/90 mt-1 flex items-center gap-2 flex-wrap">
                    <span>Dr. {user?.full_name || getDoctorFullName()}</span>
                    <span className="text-white/50">•</span>
                    <span>{user?.hospital_name}</span>
                    <span className="bg-white/20 px-3 py-0.5 rounded-full text-xs font-medium backdrop-blur">
                      {user?.ward} Ward
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Google Search Button */}
              <button
                onClick={() => setShowSearchBar(!showSearchBar)}
                className="bg-white/20 backdrop-blur px-4 py-2.5 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg text-sm font-medium"
              >
                <FaSearch className="text-sm" /> <span className="hidden sm:inline">Medical Search</span>
              </button>
              
              {/* Generate Report Button */}
              <button
                onClick={() => setShowReportModal(true)}
                className="bg-white/20 backdrop-blur px-4 py-2.5 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg text-sm font-medium"
              >
                <FaFileAlt className="text-sm" /> <span className="hidden sm:inline">Generate Report</span>
              </button>

              {/* Send Report Button */}
              <button
                onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); fetchStaffMembers(); }}
                className="bg-white/20 backdrop-blur px-4 py-2.5 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg text-sm font-medium"
              >
                <FaPaperPlane className="text-sm" /> <span className="hidden sm:inline">Send Report</span>
              </button>
              
              {/* Stats Display */}
              <div className="flex gap-4 bg-white/10 backdrop-blur py-2 px-5 rounded-full">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{!showDischargeList && reportMainTab === 'inbox' ? reportsInbox.length : queuePatients.length}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">{!showDischargeList && reportMainTab === 'inbox' ? 'Reports' : 'Queue'}</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.completed}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Completed</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.pendingLabs + stats.pendingRadiology}</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wider">Pending</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Google Search Bar - Animated */}
        <AnimatePresence>
          {showSearchBar && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white shadow-xl p-5 border-b border-gray-100"
            >
              <div className="max-w-2xl mx-auto flex gap-3">
                <input
                  type="text"
                  placeholder="Search medical information on Google..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
                <button
                  onClick={handleGoogleSearch}
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Search Google
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate Report Modal */}
        <AnimatePresence>
          {showReportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowReportModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FaFileAlt className="text-teal-500" /> Generate Report
                  </h2>
                  <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition">×</button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Type *</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Select report type...</option>
                      {reportOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={generateReport}
                      disabled={generatingReport || !reportType}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {generatingReport ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                      {generatingReport ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Send Report Modal */}
        <AnimatePresence>
          {showSendReportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowSendReportModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FaPaperPlane className="text-teal-500" /> Send Report
                  </h2>
                  <button onClick={() => setShowSendReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition">×</button>
                </div>
                
                <form onSubmit={handleSendReport} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="hospital_admin"
                          checked={sendReportForm.recipient_type === 'hospital_admin'}
                          onChange={(e) => setSendReportForm({...sendReportForm, recipient_type: e.target.value, recipient_id: ''})}
                          className="w-4 h-4 text-teal-600"
                        />
                        <span>Hospital Admin</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="staff"
                          checked={sendReportForm.recipient_type === 'staff'}
                          onChange={(e) => setSendReportForm({...sendReportForm, recipient_type: e.target.value, recipient_id: ''})}
                          className="w-4 h-4 text-teal-600"
                        />
                        <span>Hospital Staff</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recipient *</label>
                    <select
                      value={sendReportForm.recipient_id}
                      onChange={(e) => setSendReportForm({...sendReportForm, recipient_id: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    >
                      <option value="">Select Recipient...</option>
                      {sendReportForm.recipient_type === 'hospital_admin' && hospitalAdmins.map(admin => (
                        <option key={admin.id} value={admin.id}>{admin.full_name} - {admin.hospital_name}</option>
                      ))}
                      {sendReportForm.recipient_type === 'staff' && staffMembers.map(staff => (
                        <option key={staff.id} value={staff.id}>{staff.full_name} - {staff.department}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={sendReportForm.priority}
                      onChange={(e) => setSendReportForm({...sendReportForm, priority: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🟠 High</option>
                      <option value="urgent">🔴 Urgent</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                    <input
                      type="text"
                      value={sendReportForm.title}
                      onChange={(e) => setSendReportForm({...sendReportForm, title: e.target.value})}
                      placeholder="e.g., Monthly Performance Report"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                    <textarea
                      value={sendReportForm.body}
                      onChange={(e) => setSendReportForm({...sendReportForm, body: e.target.value})}
                      rows="5"
                      placeholder="Enter report details..."
                      className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                      required
                    />
                  </div>

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
                      className="w-full p-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
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
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reminder */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaBellIcon className="inline mr-1 text-amber-500" /> Set Reminder
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={sendReportForm.reminder_date || ''}
                        onChange={(e) => setSendReportForm({...sendReportForm, reminder_date: e.target.value})}
                        className="p-2 border border-gray-300 rounded-lg text-sm"
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <select
                        value={sendReportForm.reminder_frequency}
                        onChange={(e) => setSendReportForm({...sendReportForm, reminder_frequency: e.target.value})}
                        className="p-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="once">Once</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSendReportModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                      {loading ? 'Sending...' : 'Send Report'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Detail Modal */}
        <AnimatePresence>
          {showReportDetailModal && selectedReport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    {!selectedReport.is_opened ? <FaEnvelope className="text-teal-500" /> : <FaEnvelopeOpen className="text-gray-400" />}
                    <h2 className="text-xl font-bold text-gray-800">{selectedReport.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowReminderModal(true); setReminderData({...reminderData, report_id: selectedReport.id}); }}
                      className="p-2 text-amber-500 hover:bg-amber-50 rounded-full transition"
                      title="Set Reminder"
                    >
                      <FaBellIcon />
                    </button>
                    <button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className="p-2 hover:bg-gray-100 rounded-full transition">×</button>
                  </div>
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
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadge(selectedReport.priority)}`}>
                        {getPriorityIcon(selectedReport.priority)} {selectedReport.priority}
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
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-teal-600 hover:bg-teal-50 transition"
                          >
                            <FaPaperclip size={12} /> {att.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedReport.parent_report_id && (
                    <div className="bg-teal-50 p-3 rounded-lg border-l-4 border-teal-500">
                      <p className="text-xs text-teal-600 font-semibold">Reply to original report</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowReportDetailModal(false);
                        setShowReplyModal(true);
                      }}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <FaReply /> Reply
                    </button>
                    <button
                      onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply Modal */}
        <AnimatePresence>
          {showReplyModal && selectedReport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FaReply className="text-teal-500" /> Reply to Report
                  </h2>
                  <button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className="p-2 hover:bg-gray-100 rounded-full transition">×</button>
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Original Report</p>
                  <p className="text-sm font-medium text-gray-800">{selectedReport.title}</p>
                  <p className="text-xs text-gray-400 mt-1">From: {selectedReport.sender_full_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Reply *</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows="5"
                    placeholder="Type your reply here..."
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setReplyAttachment(e.target.files[0])}
                    accept="image/*,.pdf,.doc,.docx"
                    className="w-full p-2 border border-gray-300 rounded-xl text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  />
                  {replyAttachment && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                      <FaPaperclip /> {replyAttachment.name}
                      <button onClick={() => setReplyAttachment(null)} className="text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 mt-2">
                  <button
                    onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendReply}
                    disabled={loading || (!replyText.trim() && !replyAttachment)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                    {loading ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
{/* My Schedule View */}
{!showDischargeList && reportMainTab === 'schedule' && (
  <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
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
        {/* Reminder Modal */}
        <AnimatePresence>
          {showReminderModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowReminderModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FaBellIcon className="text-amber-500" /> Set Reminder
                  </h2>
                  <button onClick={() => setShowReminderModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition">×</button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reminder Date *</label>
                    <input
                      type="date"
                      value={reminderData.reminder_date}
                      onChange={(e) => setReminderData({...reminderData, reminder_date: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reminder Time</label>
                    <input
                      type="time"
                      value={reminderData.reminder_time}
                      onChange={(e) => setReminderData({...reminderData, reminder_time: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                    <select
                      value={reminderData.frequency}
                      onChange={(e) => setReminderData({...reminderData, frequency: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="once">Once</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reminder Message</label>
                    <textarea
                      value={reminderData.message}
                      onChange={(e) => setReminderData({...reminderData, message: e.target.value})}
                      rows="3"
                      placeholder="Optional reminder message..."
                      className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowReminderModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSetReminder}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <FaBellIcon /> Set Reminder
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification Banner */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={`fixed top-24 right-8 z-[1000] max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border-l-4 ${notification.type === 'info' ? 'border-blue-500' : notification.type === 'error' ? 'border-red-500' : 'border-green-500'}`}
            >
              <div className="p-4 flex items-center gap-3">
                <span className="text-2xl">
                  {notification.type === 'info' ? 'ℹ️' : notification.type === 'error' ? '⚠️' : '✅'}
                </span>
                <div className="flex-1">
                  <p className="m-0 text-sm text-gray-800">{notification.message}</p>
                </div>
                <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Toast */}
        {message.text && (
          <div className={`fixed bottom-8 right-8 z-[1000] ${message.type === 'error' ? 'bg-red-100 text-red-800 border-red-400' : 'bg-green-100 text-green-800 border-green-400'} py-3 px-6 rounded-lg shadow-md animate-slide-in border-l-4`}>
            {message.text}
          </div>
        )}

        {/* Main Content Area */}
        <div className="max-w-[1600px] mx-auto p-8">
          {/* Patient Queue View */}
          {!showDischargeList && reportMainTab === 'queue' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 m-0 mb-2">Waiting in Queue</p>
                      <p className="text-3xl font-bold text-teal-600 m-0">{queuePatients.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                      <span className="text-2xl">👥</span>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-500">
                    {queuePatients.filter(p => p.triage_info?.priority === 'critical').length} Critical
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 m-0 mb-2">In Consultation</p>
                      <p className="text-3xl font-bold text-teal-600 m-0">{selectedPatient ? 1 : 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                      <span className="text-2xl">👨‍⚕️</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 m-0 mb-2">Completed Today</p>
                      <p className="text-3xl font-bold text-emerald-600 m-0">{stats.completed}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                      <span className="text-2xl">✅</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 m-0 mb-2">Pending Results</p>
                      <p className="text-3xl font-bold text-amber-600 m-0">{stats.pendingLabs + stats.pendingRadiology}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                      <span className="text-2xl">🔬</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 m-0 mb-2">Pending Pharmacy</p>
                      <p className="text-3xl font-bold text-pink-600 m-0">{stats.pendingPharmacy || 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                      <span className="text-2xl">💊</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Queue Table */}
              <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-gray-900 m-0">{currentWard.queueTitle}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white bg-gradient-to-r ${currentWard.bgGradient}`}>
                      {queuePatients.length} waiting
                    </span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
                    <span className={`w-2 h-2 rounded-full inline-block ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse-custom' : 'bg-red-500'}`} />
                  </div>
                </div>
                
                {queuePatients.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <span className="text-5xl block mb-4">🛋️</span>
                    <p className="text-lg text-gray-500 mb-2">No patients waiting</p>
                    <p className="text-sm text-gray-400">Patients from triage will appear here automatically</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {queuePatients.map(patient => {
                      const priority = getPriorityColor(patient.triage_info?.priority || 'routine');
                      const criticalBP = getCriticalFlag('bp', patient.vitals?.blood_pressure);
                      const criticalTemp = getCriticalFlag('temperature', patient.vitals?.temperature);
                      const criticalHR = getCriticalFlag('heartRate', patient.vitals?.heart_rate);
                      const criticalO2 = getCriticalFlag('o2', patient.vitals?.oxygen_saturation);
                      const hasCritical = criticalBP || criticalTemp || criticalHR || criticalO2;
                      
                      return (
                        <div 
                          key={patient.id} 
                          className={`${hasCritical ? 'border-2 border-red-500 bg-red-50' : 'border border-gray-200 bg-white'} rounded-xl p-5 flex justify-between items-center shadow-sm transition-all cursor-pointer animate-fade-in hover:shadow-lg`}
                          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.boxShadow = hasCritical ? '0 4px 12px rgba(239,68,68,0.1)' : 'none'}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <span className="font-mono text-sm px-2 py-1 rounded bg-teal-50 text-teal-700">
                                {patient.card_number}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${priority.bg} ${priority.color}`}>
                                <span>{priority.icon}</span>
                                {priority.text}
                              </span>
                              {hasCritical && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 animate-pulse">
                                  ⚠️ CRITICAL VITALS
                                </span>
                              )}
                              {patient.has_new_results && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white flex items-center gap-1">
                                  <span>🔬</span> New Results
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 mb-2 flex-wrap">
                              <h3 className="text-lg font-semibold m-0 text-gray-800">
                                {patient.first_name} {patient.middle_name} {patient.last_name}
                              </h3>
                              <span className="text-sm text-gray-500">
                                {patient.age} yrs, {patient.gender}
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-600 m-0 mb-3">
                              <span className="font-semibold">Complaint:</span> {patient.vitals?.chief_complaint || 'Not recorded'}
                            </p>
                            
                            {patient.vitals ? (
                              <div className="flex gap-6 text-sm flex-wrap">
                                <div>
                                  <span className="text-gray-500">BP:</span>{' '}
                                  <span className={`font-semibold ${criticalBP ? 'text-red-500' : 'text-gray-900'}`}>
                                    {patient.vitals?.blood_pressure || 'N/A'}
                                    {criticalBP && ' ⚠️'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Temp:</span>{' '}
                                  <span className={`font-semibold ${criticalTemp ? 'text-red-500' : 'text-gray-900'}`}>
                                    {patient.vitals?.temperature || 'N/A'}°C
                                    {criticalTemp && ' ⚠️'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">HR:</span>{' '}
                                  <span className={`font-semibold ${criticalHR ? 'text-red-500' : 'text-gray-900'}`}>
                                    {patient.vitals?.heart_rate || 'N/A'}
                                    {criticalHR && ' ⚠️'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">O2:</span>{' '}
                                  <span className={`font-semibold ${criticalO2 ? 'text-red-500' : 'text-gray-900'}`}>
                                    {patient.vitals?.oxygen_saturation || 'N/A'}%
                                    {criticalO2 && ' ⚠️'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Pain:</span>{' '}
                                  <span className="font-semibold text-gray-900">
                                    {patient.vitals?.pain_level || '0'}/10
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">No vitals recorded yet</p>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleTakePatient(patient)}
                            className={`py-3 px-7 text-white border-none rounded-xl cursor-pointer text-base font-semibold transition-all shadow-md ml-5 whitespace-nowrap hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${currentWard.bgGradient}`}
                            disabled={loading}
                          >
                            {hasCritical ? '🚨 Take Now' : 'Start Consultation'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Reports Inbox View */}
          {!showDischargeList && reportMainTab === 'inbox' && (
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-900 m-0">📬 Reports Inbox</h2>
                  {unreadReportsCount > 0 && (
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-500 text-white animate-pulse">
                      {unreadReportsCount} unread
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { fetchReportsInbox(); fetchReportsOutbox(); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center gap-2 text-sm"
                >
                  <FaSpinner className={reportsLoading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              {reportsLoading && reportsInbox.length === 0 ? (
                <div className="text-center py-12">
                  <FaSpinner className="animate-spin text-3xl text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Loading reports...</p>
                </div>
              ) : reportsInbox.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <span className="text-5xl block mb-4">📭</span>
                  <p className="text-lg text-gray-500 mb-2">No reports in inbox</p>
                  <p className="text-sm text-gray-400">Reports from Hospital Admin will appear here</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {reportsInbox.map(report => (
                    <div
                      key={report.id}
                      className={`border rounded-xl p-5 transition-all cursor-pointer hover:shadow-md ${!report.is_opened ? 'border-teal-300 bg-teal-50' : 'border-gray-200 bg-white'}`}
                      onClick={() => viewReportDetails(report)}
                    >
                      <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          {!report.is_opened ? (
                            <FaEnvelope className="text-teal-500 text-lg" />
                          ) : (
                            <FaEnvelopeOpen className="text-gray-400 text-lg" />
                          )}
                          <h3 className="font-semibold text-gray-900">{report.title}</h3>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadge(report.priority)}`}>
                          {getPriorityIcon(report.priority)} {report.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{report.body}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>From: {report.sender_full_name}</span>
                        <span>{new Date(report.sent_at).toLocaleString()}</span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); viewReportDetails(report); }}
                          className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs hover:bg-teal-600 transition flex items-center gap-1"
                        >
                          <FaEye size={10} /> View
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedReport(report); setShowReportDetailModal(false); setShowReplyModal(true); }}
                          className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs hover:bg-emerald-600 transition flex items-center gap-1"
                        >
                          <FaReply size={10} /> Reply
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowReminderModal(true); setReminderData({...reminderData, report_id: report.id}); }}
                          className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs hover:bg-amber-600 transition flex items-center gap-1"
                        >
                          <FaBellIcon size={10} /> Remind
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sent Reports View */}
          {!showDischargeList && reportMainTab === 'sent' && (
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-900 m-0">📤 Sent Reports</h2>
                </div>
                <button
                  onClick={() => fetchReportsOutbox()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center gap-2 text-sm"
                >
                  <FaSpinner className={reportsLoading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              {reportsLoading && reportsOutbox.length === 0 ? (
                <div className="text-center py-12">
                  <FaSpinner className="animate-spin text-3xl text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Loading sent reports...</p>
                </div>
              ) : reportsOutbox.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <span className="text-5xl block mb-4">📪</span>
                  <p className="text-lg text-gray-500 mb-2">No sent reports</p>
                  <p className="text-sm text-gray-400">Click the "Send Report" button to send a report</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {reportsOutbox.map(report => (
                    <div
                      key={report.id}
                      className="border border-gray-200 rounded-xl p-5 transition-all hover:shadow-md bg-white cursor-pointer"
                      onClick={() => viewReportDetails(report)}
                    >
                      <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <FaPaperPlane className="text-gray-400 text-lg" />
                          <h3 className="font-semibold text-gray-900">{report.title}</h3>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadge(report.priority)}`}>
                          {getPriorityIcon(report.priority)} {report.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{report.body}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>To: {report.recipient_full_name}</span>
                        <span>Sent: {new Date(report.sent_at).toLocaleString()}</span>
                      </div>
                      <div className="mt-3">
                        <span className={`text-xs ${report.is_opened ? 'text-green-600' : 'text-gray-400'}`}>
                          {report.is_opened ? '✓ Opened by recipient' : '✗ Not opened yet'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile View */}
          {!showDischargeList && reportMainTab === 'profile' && (
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
                      <FaUserMd className="text-sm" /> {user?.department || 'Doctor'} • {user?.ward} Ward
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs ml-2">ID: {user?.id}</span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Personal Information</h3>
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
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">First Name</label>
                        {isEditingProfile ? (
                          <input type="text" value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500" />
                        ) : (
                          <p className="text-gray-800 font-medium">{profileData.first_name || 'Not set'}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Middle Name</label>
                        {isEditingProfile ? (
                          <input type="text" value={profileData.middle_name} onChange={(e) => setProfileData({...profileData, middle_name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                        ) : (
                          <p className="text-gray-800">{profileData.middle_name || 'Not set'}</p>
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

                  {/* Professional Information */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="text-md font-semibold text-teal-600 mb-4 flex items-center gap-2"><FaBriefcase /> Professional Info</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Specialization</label>
                        {isEditingProfile ? (
                          <input type="text" value={profileData.specialization} onChange={(e) => setProfileData({...profileData, specialization: e.target.value})} placeholder="e.g., Cardiology" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                        ) : (
                          <p className="text-gray-800">{profileData.specialization || 'Not set'}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">License Number</label>
                        {isEditingProfile ? (
                          <input type="text" value={profileData.license_number} onChange={(e) => setProfileData({...profileData, license_number: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                        ) : (
                          <p className="text-gray-800">{profileData.license_number || 'Not set'}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Years of Experience</label>
                        {isEditingProfile ? (
                          <input type="number" value={profileData.years_of_experience} onChange={(e) => setProfileData({...profileData, years_of_experience: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                        ) : (
                          <p className="text-gray-800">{profileData.years_of_experience || '0'} years</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Employee ID</label>
                        <p className="text-gray-800 font-mono">{user?.id || 'Not assigned'}</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Department</label>
                        <p className="text-gray-800"><span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs">{user?.department || 'Doctor'}</span> • {user?.ward} Ward</p>
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
                        <label className="block text-xs text-gray-500 mb-1">Emergency Contact Name</label>
                        {isEditingProfile ? (
                          <input type="text" value={profileData.emergency_contact_name} onChange={(e) => setProfileData({...profileData, emergency_contact_name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                        ) : (
                          <p className="text-gray-800">{profileData.emergency_contact_name || 'Not set'}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Emergency Contact Phone</label>
                        {isEditingProfile ? (
                          <input type="tel" value={profileData.emergency_contact_phone} onChange={(e) => setProfileData({...profileData, emergency_contact_phone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                        ) : (
                          <p className="text-gray-800">{profileData.emergency_contact_phone || 'Not set'}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Relationship</label>
                        {isEditingProfile ? (
                          <input type="text" value={profileData.emergency_contact_relationship} onChange={(e) => setProfileData({...profileData, emergency_contact_relationship: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                        ) : (
                          <p className="text-gray-800">{profileData.emergency_contact_relationship || 'Not set'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="text-md font-semibold text-teal-600 mb-4 flex items-center gap-2"><FaStethoscope /> Bio / About</h4>
                    {isEditingProfile ? (
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                        rows="4"
                        placeholder="Short bio about yourself..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                      />
                    ) : (
                      <p className="text-gray-600 text-sm">{profileData.bio || 'No bio added yet.'}</p>
                    )}
                  </div>
                </div>
                
                <hr className="my-6" />
                
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-800">Account Settings</h3>
                </div>
                
                <div className="mt-4 flex gap-4">
                  <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-5 py-2.5 border border-teal-600 text-teal-600 rounded-xl hover:bg-teal-50 transition text-sm font-medium">
                    <FaKey /> Change Password
                  </button>
                  <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-medium shadow-md">
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Discharge List View */}
          {showDischargeList && (
            <DischargeList 
              hospitalId={user?.hospital_id}
              ward={user?.ward}
              dischargedPatients={dischargedPatients}
              onRefresh={fetchDischargedPatients}
            />
          )}
        </div>

        {/* Patient Consultation Modal - Keeping all existing functionality */}
        {showPatientModal && selectedPatient && (
          // ... (Keep your existing patient consultation modal code here - it's too long but works)
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-6xl w-[95%] max-h-[90vh] overflow-auto shadow-2xl">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 m-0 mb-1">
                    Patient Consultation - {currentWard.icon} {user?.ward} Ward
                  </h2>
                  <p className="text-sm text-gray-500 m-0">
                    {selectedPatient.first_name} {selectedPatient.last_name} • Card: {selectedPatient.card_number}
                  </p>
                </div>
                <button 
                  onClick={() => setShowPatientModal(false)}
                  className="bg-none border-none text-3xl cursor-pointer text-gray-500 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 hover:text-gray-900 transition-all"
                >
                  ×
                </button>
              </div>

              {/* Patient Info Card */}
              <div className="bg-gray-50 rounded-2xl p-5 mb-6 grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 m-0 mb-1">Age / Gender</p>
                  <p className="text-base font-semibold m-0">
                    {selectedPatient.age} yrs / {selectedPatient.gender}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 m-0 mb-1">Phone</p>
                  <p className="text-base font-semibold m-0">
                    {selectedPatient.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 m-0 mb-1">Arrived</p>
                  <p className="text-base font-semibold m-0">
                    {new Date(selectedPatient.triaged_at || selectedPatient.registered_at).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 m-0 mb-1">Priority</p>
                  <p className={`text-base font-semibold m-0 ${
                    selectedPatient.triage_info?.priority === 'critical' ? 'text-red-800' : 
                    selectedPatient.triage_info?.priority === 'urgent' ? 'text-orange-800' : 'text-green-800'
                  }`}>
                    {selectedPatient.triage_info?.priority || 'routine'}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b-2 border-gray-200 pb-3 overflow-x-auto whitespace-nowrap">
                {[
                  { id: 'details', label: '📋 Diagnosis', icon: '📋' },
                  { id: 'vitals', label: '❤️ Vitals', icon: '❤️' },
                  { id: 'prescriptions', label: '💊 Prescriptions', icon: '💊' },
                  { id: 'lab', label: '🔬 Lab Tests', icon: '🔬' },
                  { id: 'radiology', label: '📷 Radiology', icon: '📷' },
                  { id: 'results', label: '📊 Results', icon: '📊' },
                  { id: 'disposition', label: '🏥 Disposition', icon: '🏥' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2.5 px-5 rounded-full cursor-pointer text-sm font-medium flex items-center gap-1.5 transition-all ${
                      activeTab === tab.id 
                        ? 'text-white' 
                        : 'bg-transparent text-gray-600 hover:bg-gray-100'
                    }`}
                    style={{ backgroundColor: activeTab === tab.id ? currentWard.primaryColor : 'transparent' }}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Diagnosis Tab */}
              {activeTab === 'details' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Diagnosis</h3>
                  <div className="grid gap-5">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-600">
                        Primary Diagnosis <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="primary"
                        value={diagnosis.primary}
                        onChange={handleDiagnosisChange}
                        placeholder="e.g., Acute Myocardial Infarction"
                        className={`w-full p-3 border ${diagnosisValidation.primary ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm`}
                      />
                      {diagnosisValidation.primary && (
                        <p className="text-red-500 text-xs mt-1">{diagnosisValidation.primary}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-600">
                        ICD-10 Code
                      </label>
                      <input
                        type="text"
                        name="icd10"
                        value={diagnosis.icd10}
                        onChange={handleDiagnosisChange}
                        placeholder="e.g., I21.9"
                        className={`w-full p-3 border ${diagnosisValidation.icd10 ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm`}
                      />
                      {diagnosisValidation.icd10 && (
                        <p className="text-red-500 text-xs mt-1">{diagnosisValidation.icd10}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-600">
                        Clinical Notes
                      </label>
                      <textarea
                        name="notes"
                        value={diagnosis.notes}
                        onChange={handleDiagnosisChange}
                        rows="4"
                        placeholder="Enter clinical findings, observations, and notes..."
                        className={`w-full p-3 border ${diagnosisValidation.notes ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm resize-vertical`}
                      />
                      {diagnosisValidation.notes && (
                        <p className="text-red-500 text-xs mt-1">{diagnosisValidation.notes}</p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveDiagnosis}
                        className="py-3 px-8 text-white border-none rounded-full cursor-pointer text-base font-semibold"
                        style={{ backgroundColor: currentWard.primaryColor }}
                        disabled={loading}
                      >
                        Save Diagnosis
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Vitals Tab */}
              {activeTab === 'vitals' && vitals && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">
                    Vital Signs from Triage
                  </h3>
                  
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Blood Pressure', value: vitals.blood_pressure, unit: 'mmHg', critical: getCriticalFlag('bp', vitals.blood_pressure) },
                      { label: 'Temperature', value: vitals.temperature, unit: '°C', critical: getCriticalFlag('temperature', vitals.temperature) },
                      { label: 'Heart Rate', value: vitals.heart_rate, unit: 'bpm', critical: getCriticalFlag('heartRate', vitals.heart_rate) },
                      { label: 'O2 Saturation', value: vitals.oxygen_saturation, unit: '%', critical: getCriticalFlag('o2', vitals.oxygen_saturation) },
                      { label: 'Respiratory Rate', value: vitals.respiratory_rate, unit: '/min' },
                      { label: 'Pain Level', value: vitals.pain_level, unit: '/10' },
                      { label: 'Weight', value: vitals.weight, unit: 'kg' },
                      { label: 'Height', value: vitals.height, unit: 'cm' }
                    ].map((item, index) => (
                      <div key={index} className={`${item.critical ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-gray-200'} p-4 rounded-xl border`}>
                        <p className={`text-xs ${item.critical ? 'text-red-800' : 'text-gray-500'} m-0 mb-2`}>
                          {item.label}
                          {item.critical && ' ⚠️ Critical'}
                        </p>
                        <p className={`text-lg font-bold m-0 ${item.critical ? 'text-red-800' : 'text-gray-900'}`}>
                          {item.value || 'N/A'} {item.unit}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                    <p className="text-sm font-semibold m-0 mb-2">Chief Complaint</p>
                    <p className="text-base m-0">{vitals.chief_complaint}</p>
                  </div>
                </div>
              )}

              {/* Prescriptions Tab */}
              {activeTab === 'prescriptions' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Prescriptions</h3>
                  
                  {/* Add New Medication Form */}
                  <div className="bg-gray-50 p-5 rounded-xl mb-6">
                    <h4 className="text-base font-semibold mb-4">Add Medication</h4>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Medication Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={newMedication.name}
                          onChange={handleMedicationChange}
                          placeholder="e.g., Amoxicillin"
                          className={`w-full p-2 border ${prescriptionValidation.name ? 'border-red-500' : 'border-gray-200'} rounded-md text-sm`}
                        />
                        {prescriptionValidation.name && (
                          <p className="text-red-500 text-xs mt-1">{prescriptionValidation.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Dosage *
                        </label>
                        <input
                          type="text"
                          name="dosage"
                          value={newMedication.dosage}
                          onChange={handleMedicationChange}
                          placeholder="e.g., 500mg"
                          className={`w-full p-2 border ${prescriptionValidation.dosage ? 'border-red-500' : 'border-gray-200'} rounded-md text-sm`}
                        />
                        {prescriptionValidation.dosage && (
                          <p className="text-red-500 text-xs mt-1">{prescriptionValidation.dosage}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Quantity
                        </label>
                        <input
                          type="number"
                          name="quantity"
                          value={newMedication.quantity || 1}
                          onChange={handleMedicationChange}
                          placeholder="e.g., 10"
                          className={`w-full p-2 border ${prescriptionValidation.quantity ? 'border-red-500' : 'border-gray-200'} rounded-md text-sm`}
                        />
                        {prescriptionValidation.quantity && (
                          <p className="text-red-500 text-xs mt-1">{prescriptionValidation.quantity}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Unit
                        </label>
                        <select
                          name="unit"
                          value={newMedication.unit || 'tablet'}
                          onChange={handleMedicationChange}
                          className="w-full p-2 border border-gray-200 rounded-md text-sm"
                        >
                          <option value="tablet">Tablet</option>
                          <option value="capsule">Capsule</option>
                          <option value="ml">ml</option>
                          <option value="mg">mg</option>
                          <option value="vial">Vial</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Frequency
                        </label>
                        <input
                          type="text"
                          name="frequency"
                          value={newMedication.frequency}
                          onChange={handleMedicationChange}
                          placeholder="e.g., twice daily"
                          className={`w-full p-2 border ${prescriptionValidation.frequency ? 'border-red-500' : 'border-gray-200'} rounded-md text-sm`}
                        />
                        {prescriptionValidation.frequency && (
                          <p className="text-red-500 text-xs mt-1">{prescriptionValidation.frequency}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Duration
                        </label>
                        <input
                          type="text"
                          name="duration"
                          value={newMedication.duration}
                          onChange={handleMedicationChange}
                          placeholder="e.g., 7 days"
                          className={`w-full p-2 border ${prescriptionValidation.duration ? 'border-red-500' : 'border-gray-200'} rounded-md text-sm`}
                        />
                        {prescriptionValidation.duration && (
                          <p className="text-red-500 text-xs mt-1">{prescriptionValidation.duration}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Route
                        </label>
                        <select
                          name="route"
                          value={newMedication.route}
                          onChange={handleMedicationChange}
                          className="w-full p-2 border border-gray-200 rounded-md text-sm"
                        >
                          <option value="oral">Oral</option>
                          <option value="IV">IV</option>
                          <option value="IM">IM</option>
                          <option value="topical">Topical</option>
                          <option value="inhalation">Inhalation</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs font-medium mb-1 block">
                          Notes
                        </label>
                        <input
                          type="text"
                          name="notes"
                          value={newMedication.notes}
                          onChange={handleMedicationChange}
                          placeholder="Additional instructions"
                          className={`w-full p-2 border ${prescriptionValidation.notes ? 'border-red-500' : 'border-gray-200'} rounded-md text-sm`}
                        />
                        {prescriptionValidation.notes && (
                          <p className="text-red-500 text-xs mt-1">{prescriptionValidation.notes}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={addMedication}
                      className="mt-4 py-2 px-5 text-white border-none rounded-full cursor-pointer text-sm font-medium"
                      style={{ backgroundColor: currentWard.primaryColor }}
                      disabled={loading}
                    >
                      + Add Medication
                    </button>
                  </div>

                  {/* Current Prescriptions List */}
                  {prescriptions.length > 0 ? (
                    <div>
                      <h4 className="text-base font-semibold mb-4">Current Prescriptions ({prescriptions.length} items)</h4>
                      <div className="grid gap-3">
                        {prescriptions.map((med, idx) => {
                          return (
                            <div key={idx} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center bg-white">
                              <div>
                                <p className="font-semibold m-0 mb-1">
                                  {med.name} {med.dosage}
                                </p>
                                <p className="text-sm text-gray-500 m-0">
                                  Quantity: {med.quantity || 1} {med.unit || 'tablet(s)'} • {med.frequency || 'as directed'} • {med.duration || 'as prescribed'} • {med.route || 'oral'}
                                </p>
                                {med.notes && (
                                  <p className="text-xs text-gray-400 mt-1 m-0">
                                    Note: {med.notes}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => removeMedication(med.id || idx)}
                                  className="px-3 py-1 bg-red-100 text-red-800 border-none rounded cursor-pointer text-xs hover:bg-red-200"
                                  disabled={loading}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="mt-5 flex justify-end">
                        <button
                          onClick={savePrescriptions}
                          className="py-3 px-8 text-white border-none rounded-full cursor-pointer text-base font-semibold"
                          style={{ backgroundColor: currentWard.primaryColor }}
                          disabled={loading}
                        >
                          {loading ? <FaSpinner className="animate-spin inline mr-2" /> : <FaCheck className="inline mr-2" />}
                          Send to Pharmacy ({prescriptions.length} items)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-10">
                      No prescriptions added yet. Use the form above to add medications.
                    </p>
                  )}
                </div>
              )}

              {/* Lab Tests Tab */}
              {activeTab === 'lab' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Laboratory Tests</h3>
                  
                  <div className="bg-gray-50 p-5 rounded-xl mb-6">
                    <h4 className="text-base font-semibold mb-4">Request Lab Test</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Test Type *
                        </label>
                        <select
                          name="testType"
                          value={newLabRequest.testType}
                          onChange={handleLabRequestChange}
                          className="w-full p-2 border border-gray-200 rounded-md text-sm"
                        >
                          <option value="blood">Blood</option>
                          <option value="urine">Urine</option>
                          <option value="stool">Stool</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Test Name *
                        </label>
                        <select
                          name="testName"
                          value={newLabRequest.testName}
                          onChange={handleLabRequestChange}
                          className={`w-full p-2 border ${labValidation.testName ? 'border-red-500' : 'border-gray-200'} rounded-md text-sm`}
                        >
                          <option value="">Select test</option>
                          {labTests[newLabRequest.testType]?.map(test => (
                            <option key={test} value={test}>{test}</option>
                          ))}
                        </select>
                        {labValidation.testName && (
                          <p className="text-red-500 text-xs mt-1">{labValidation.testName}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Priority
                        </label>
                        <select
                          name="priority"
                          value={newLabRequest.priority}
                          onChange={handleLabRequestChange}
                          className="w-full p-2 border border-gray-200 rounded-md text-sm"
                        >
                          <option value="routine">Routine (24h)</option>
                          <option value="urgent">Urgent (2-4h)</option>
                          <option value="stat">STAT (1h)</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium mb-1 block">
                          Clinical Notes
                        </label>
                        <input
                          type="text"
                          name="notes"
                          value={newLabRequest.notes}
                          onChange={handleLabRequestChange}
                          placeholder="e.g., Rule out infection"
                          className={`w-full p-2 border ${labValidation.notes ? 'border-red-500' : 'border-gray-200'} rounded-md text-sm`}
                        />
                        {labValidation.notes && (
                          <p className="text-red-500 text-xs mt-1">{labValidation.notes}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={addLabRequest}
                      className="mt-4 py-2 px-5 text-white border-none rounded-full cursor-pointer text-sm font-medium"
                      style={{ backgroundColor: currentWard.primaryColor }}
                      disabled={loading}
                    >
                      Send to Laboratory
                    </button>
                  </div>

                  {labRequests.filter(l => l.patient_id === selectedPatient.id && l.status === 'pending').length > 0 && (
                    <div>
                      <h4 className="text-base font-semibold mb-4">Pending Lab Requests</h4>
                      <div className="grid gap-3">
                        {labRequests.filter(l => l.patient_id === selectedPatient.id && l.status === 'pending').map(req => (
                          <div key={req.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center bg-white">
                            <div>
                              <p className="font-semibold m-0 mb-1">{req.testName}</p>
                              <p className="text-xs text-gray-500 m-0">
                                {req.testType} • {req.priority} priority
                              </p>
                            </div>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                              ⏳ Pending
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Radiology Tab */}
              {activeTab === 'radiology' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Radiology</h3>
                  
                  <div className="bg-gray-50 p-5 rounded-xl mb-6">
                    <h4 className="text-base font-semibold mb-4">Request Imaging</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Exam Type *
                        </label>
                        <select
                          name="examType"
                          value={newRadiologyRequest.examType}
                          onChange={handleRadiologyRequestChange}
                          className="w-full p-2 border border-gray-200 rounded-md text-sm"
                        >
                          <option value="X-ray">X-ray</option>
                          <option value="Ultrasound">Ultrasound</option>
                          <option value="CT Scan">CT Scan</option>
                          <option value="MRI">MRI</option>
                          <option value="Mammogram">Mammogram</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Body Part *
                        </label>
                        <input
                          type="text"
                          name="bodyPart"
                          value={newRadiologyRequest.bodyPart}
                          onChange={handleRadiologyRequestChange}
                          placeholder="e.g., Chest, Lumbar Spine"
                          className={`w-full p-2 border ${radiologyValidation.bodyPart ? 'border-red-500' : 'border-gray-200'} rounded-md text-sm`}
                        />
                        {radiologyValidation.bodyPart && (
                          <p className="text-red-500 text-xs mt-1">{radiologyValidation.bodyPart}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Priority
                        </label>
                        <select
                          name="priority"
                          value={newRadiologyRequest.priority}
                          onChange={handleRadiologyRequestChange}
                          className="w-full p-2 border border-gray-200 rounded-md text-sm"
                        >
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                          <option value="stat">STAT</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium mb-1 block">
                          Clinical Notes
                        </label>
                        <input
                          type="text"
                          name="notes"
                          value={newRadiologyRequest.notes}
                          onChange={handleRadiologyRequestChange}
                          placeholder="e.g., Rule out fracture"
                          className={`w-full p-2 border ${radiologyValidation.notes ? 'border-red-500' : 'border-gray-200'} rounded-md text-sm`}
                        />
                        {radiologyValidation.notes && (
                          <p className="text-red-500 text-xs mt-1">{radiologyValidation.notes}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={addRadiologyRequest}
                      className="mt-4 py-2 px-5 text-white border-none rounded-full cursor-pointer text-sm font-medium"
                      style={{ backgroundColor: currentWard.primaryColor }}
                      disabled={loading}
                    >
                      Send to Radiology
                    </button>
                  </div>

                  {radiologyRequests.filter(r => r.patient_id === selectedPatient.id && r.status === 'pending').length > 0 && (
                    <div>
                      <h4 className="text-base font-semibold mb-4">Pending Radiology Requests</h4>
                      <div className="grid gap-3">
                        {radiologyRequests.filter(r => r.patient_id === selectedPatient.id && r.status === 'pending').map(req => (
                          <div key={req.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center bg-white">
                            <div>
                              <p className="font-semibold m-0 mb-1">
                                {req.examType} - {req.bodyPart}
                              </p>
                              <p className="text-xs text-gray-500 m-0">
                                {req.priority} priority
                              </p>
                            </div>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                              ⏳ Pending
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Results Tab */}
              {activeTab === 'results' && (
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-lg font-semibold">Test Results</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          console.log('🔄 Manually refreshing lab results');
                          fetchLabResults(selectedPatient.id);
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                        disabled={loading}
                      >
                        🔬 Refresh Labs
                      </button>
                      <button
                        onClick={() => {
                          console.log('🔄 Manually refreshing radiology results');
                          fetchRadiologyResults(selectedPatient.id);
                        }}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
                        disabled={loading}
                      >
                        📷 Refresh Radiology
                      </button>
                      <button
                        onClick={() => {
                          Promise.all([
                            fetchLabResults(selectedPatient.id),
                            fetchRadiologyResults(selectedPatient.id)
                          ]);
                        }}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                        disabled={loading}
                      >
                        🔄 Refresh All
                      </button>
                    </div>
                  </div>
                  
                  {/* Lab Results Section */}
                  {labResults && labResults.length > 0 ? (
                    <div className="mb-6">
                      <h4 className="text-base font-semibold mb-4">Laboratory Results</h4>
                      <div className="grid gap-3">
                        {labResults.map(result => {
                          let displayResult = result.result;
                          if (typeof result.result === 'object') {
                            displayResult = JSON.stringify(result.result, null, 2);
                          }
                          
                          return (
                            <div key={result.id} className={`border border-gray-200 rounded-lg p-4 ${result.critical ? 'bg-red-50' : 'bg-white'}`}>
                              <div className="flex justify-between items-center mb-2">
                                <p className="font-semibold m-0">{result.testName || result.test_name}</p>
                                {result.critical && (
                                  <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                    CRITICAL
                                  </span>
                                )}
                              </div>
                              <div className="text-base m-0 mb-2 whitespace-pre-wrap">
                                {displayResult}
                              </div>
                              {result.normal_range && (
                                <p className="text-xs text-gray-500 m-0 mb-1">
                                  Normal range: {result.normal_range}
                                </p>
                              )}
                              <p className="text-[11px] text-gray-400 m-0">
                                Reported by: {result.reported_by || 'Unknown'} at {result.reported_at ? new Date(result.reported_at).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 p-8 bg-gray-50 rounded-lg text-center">
                      <p className="text-gray-500">No laboratory results available</p>
                    </div>
                  )}

                  {/* Radiology Results Section */}
                  {radiologyResults && radiologyResults.length > 0 ? (
                    <div className="mt-6">
                      <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
                        <span>📷</span> Radiology Results
                        {radiologyResults.some(r => r.critical) && (
                          <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs animate-pulse">
                            Contains Critical Findings
                          </span>
                        )}
                      </h4>
                      <div className="grid gap-3">
                        {radiologyResults.map(result => {
                          console.log('📷 Rendering radiology result:', {
                            id: result.id,
                            exam_type: result.exam_type,
                            images_count: result.images?.length || 0,
                            images: result.images
                          });
                          
                          return (
                            <div key={result.id} className={`border rounded-lg p-4 ${result.critical ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-semibold m-0">
                                    {result.exam_type || result.examType || 'Radiology Exam'}
                                  </p>
                                  <p className="text-sm text-gray-600 m-0">
                                    Body Part: {result.body_part || result.bodyPart || 'Not specified'}
                                  </p>
                                </div>
                                {result.critical && (
                                  <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
                                    ⚠️ CRITICAL
                                  </span>
                                )}
                              </div>
                              
                              <div className="mt-3">
                                <p className="text-sm font-medium text-gray-700 mb-1">Findings:</p>
                                <p className="text-sm m-0 mb-2 whitespace-pre-wrap">
                                  {result.findings || result.report?.findings || 'No findings recorded'}
                                </p>
                              </div>
                              
                              {result.impression && (
                                <div className="mt-2">
                                  <p className="text-sm font-medium text-gray-700 mb-1">Impression:</p>
                                  <p className="text-sm m-0 mb-2">{result.impression}</p>
                                </div>
                              )}
                              
                              {/* IMAGE GALLERY - FIXED FOR B2 */}
                              {result.images && result.images.length > 0 ? (
                                <div className="mt-3">
                                  <p className="text-xs font-medium text-gray-600 mb-2">
                                    📷 Images ({result.images.length}):
                                  </p>
                                  <div className="flex gap-3 flex-wrap">
                                    {result.images.map((img, idx) => {
                                      let imageUrl = img.url || img;
                                      if (imageUrl && !imageUrl.startsWith('http')) {
                                        imageUrl = `${API_URL}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
                                      }
                                      return (
                                        <div 
                                          key={idx} 
                                          className="relative group cursor-pointer"
                                          onClick={() => {
                                            console.log('🔍 Opening image:', imageUrl);
                                            setSelectedImage({
                                              url: imageUrl,
                                              filename: img.filename || img.originalName || `radiology-image-${idx + 1}`,
                                              uploaded_at: img.uploaded_at,
                                              original: img
                                            });
                                            setShowImageModal(true);
                                          }}
                                        >
                                          <img
                                            src={imageUrl}
                                            alt={`Radiology ${idx + 1}`}
                                            className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200 hover:border-pink-500 transition-all hover:shadow-lg"
                                            onError={(e) => {
                                              console.error('❌ Failed to load image:', imageUrl);
                                              e.target.onerror = null;
                                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="%23ef4444" stroke-width="1.5"%3E%3Crect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                                              e.target.style.objectFit = 'contain';
                                              e.target.style.padding = '20px';
                                            }}
                                          />
                                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                            <span className="text-white text-xs font-medium">🔍 Click to view</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-center">
                                  <p className="text-xs text-gray-500">No images attached to this report</p>
                                </div>
                              )}
                              
                              <p className="text-[11px] text-gray-400 mt-3">
                                Reported by: {result.reported_by || 'Unknown'} at {result.reported_at ? new Date(result.reported_at).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 p-8 bg-gray-50 rounded-lg text-center border-2 border-dashed border-gray-200">
                      <span className="text-4xl block mb-3">📷</span>
                      <p className="text-gray-500">No radiology results available yet</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Results will appear here when radiology department completes the exam
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Disposition Tab */}
              {activeTab === 'disposition' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Patient Disposition</h3>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-3 text-gray-600">
                      Digital Signature <span className="text-red-500">*</span>
                    </label>
                    <div className={`border-2 ${dischargeValidation.signature ? 'border-red-500' : 'border-gray-200'} rounded-xl p-1 bg-white`}>
                      <SignaturePad
                        ref={signaturePad}
                        canvasProps={{
                          width: 500,
                          height: 200,
                          className: "w-full h-[200px] rounded-lg"
                        }}
                      />
                    </div>
                    {dischargeValidation.signature && (
                      <p className="text-red-500 text-xs mt-1">{dischargeValidation.signature}</p>
                    )}
                    <button
                      onClick={() => signaturePad.current?.clear()}
                      className="mt-3 py-2 px-5 bg-gray-500 text-white border-none rounded cursor-pointer text-sm hover:bg-gray-600"
                      disabled={loading}
                    >
                      Clear Signature
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <button
                      onClick={openDischargeLocationModal}
                      className="py-5 bg-green-500 text-white border-none rounded-xl cursor-pointer text-base font-semibold transition-all hover:bg-green-600"
                      disabled={loading}
                    >
                      🏠 Discharge Patient
                    </button>
                    
                    <button
                      onClick={async () => {
                        const beds = await fetchAvailableBeds();
                        if (beds.length > 0) {
                          setAvailableBedsList(beds);
                          setShowBedListNotification(true);
                        } else {
                          alert(`❌ No beds available in ${user?.ward} ward. Please check other wards.`);
                        }
                      }}
                      className="py-5 bg-amber-500 text-white border-none rounded-xl cursor-pointer text-base font-semibold transition-all hover:bg-amber-600"
                      disabled={loading}
                    >
                      🏥 Admit to Ward
                    </button>
                    
                    <button
                      onClick={openReferralModal}
                      className="py-5 bg-violet-500 text-white border-none rounded-xl cursor-pointer text-base font-semibold transition-all hover:bg-violet-600"
                      disabled={loading}
                    >
                      🔄 Refer Patient
                    </button>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-xl mt-6">
                    <h4 className="text-base font-semibold mb-3">Discharge Summary Preview</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 m-0 mb-1">Diagnosis</p>
                        <p className="text-sm font-medium m-0">
                          {diagnosis.primary || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 m-0 mb-1">ICD-10</p>
                        <p className="text-sm font-medium m-0">
                          {diagnosis.icd10 || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 m-0 mb-1">Prescriptions</p>
                        <p className="text-sm font-medium m-0">
                          {prescriptions.length} medications
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 m-0 mb-1">Lab Tests</p>
                        <p className="text-sm font-medium m-0">
                          {labRequests.length} requested
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Modal Footer */}
              <div className="mt-8 flex justify-end gap-3 border-t-2 border-gray-200 pt-5">
                <button
                  onClick={() => setShowPatientModal(false)}
                  className="py-2.5 px-6 bg-gray-100 text-gray-600 border-none rounded-full cursor-pointer text-sm font-medium hover:bg-gray-200"
                  disabled={loading}
                >
                  Close
                </button>
                {activeTab !== 'disposition' && (
                  <button
                    onClick={handleSaveDiagnosis}
                    className="py-2.5 px-6 text-white border-none rounded-full cursor-pointer text-sm font-semibold"
                    style={{ backgroundColor: currentWard.primaryColor }}
                    disabled={loading}
                  >
                    Save Progress
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Discharge Location Modal */}
        {showDischargeLocationModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2100] backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-md w-[90%]">
              <h3 className="text-xl font-semibold mb-6">
                Select Discharge Location
              </h3>

              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">
                  Discharge Location <span className="text-red-500">*</span>
                </label>
                <select
                  value={dischargeLocation}
                  onChange={(e) => {
                    setDischargeLocation(e.target.value);
                    setDischargeValidation(prev => ({ ...prev, dischargeLocation: '' }));
                  }}
                  className={`w-full p-3 border ${dischargeValidation.dischargeLocation ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm`}
                >
                  <option value="">Choose location...</option>
                  {dischargeLocations.map(location => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
                {dischargeValidation.dischargeLocation && (
                  <p className="text-red-500 text-xs mt-1">{dischargeValidation.dischargeLocation}</p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDischargeLocationModal(false)}
                  className="py-2.5 px-6 bg-gray-100 text-gray-600 border-none rounded-full cursor-pointer hover:bg-gray-200"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDischargeWithLocation}
                  disabled={!dischargeLocation || loading}
                  className={`py-2.5 px-6 text-white border-none rounded-full cursor-pointer ${
                    !dischargeLocation || loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{ backgroundColor: currentWard.primaryColor }}
                >
                  {loading ? 'Processing...' : 'Confirm Discharge'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Referral Modal */}
        {showReferralModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2100] backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-[90%] max-h-[80vh] overflow-auto">
              <h3 className="text-xl font-semibold mb-6">
                Refer Patient
              </h3>

              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => {
                    setReferralType('internal');
                    setSelectedInternalWard('');
                    setExternalReferralData(null);
                    setDischargeValidation({});
                  }}
                  className={`flex-1 py-3 rounded-lg cursor-pointer font-semibold ${
                    referralType === 'internal' 
                      ? 'text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={{ backgroundColor: referralType === 'internal' ? currentWard.primaryColor : '' }}
                >
                  🏥 Internal Referral
                </button>
                <button
                  onClick={() => {
                    setReferralType('external');
                    setSelectedInternalWard('');
                    setExternalReferralData(null);
                    setDischargeValidation({});
                  }}
                  className={`flex-1 py-3 rounded-lg cursor-pointer font-semibold ${
                    referralType === 'external' 
                      ? 'text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={{ backgroundColor: referralType === 'external' ? currentWard.primaryColor : '' }}
                >
                  🌍 External Referral
                </button>
              </div>

              {referralType === 'internal' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Ward *
                  </label>
                  <select
                    value={selectedInternalWard}
                    onChange={(e) => {
                      setSelectedInternalWard(e.target.value);
                      setDischargeValidation(prev => ({ ...prev, ward: '' }));
                    }}
                    className={`w-full p-3 border ${dischargeValidation.ward ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm mb-4`}
                  >
                    <option value="">Choose a ward...</option>
                    {internalWards.map(ward => (
                      <option key={ward} value={ward}>
                        {ward} Ward - {wardConfig[ward]?.title}
                      </option>
                    ))}
                  </select>
                  {dischargeValidation.ward && (
                    <p className="text-red-500 text-xs mt-1">{dischargeValidation.ward}</p>
                  )}

                  {selectedInternalWard && (
                    <div className="mt-4">
                      <label className="text-sm font-medium mb-2 block">
                        Select Bed (Optional - Leave empty to assign later)
                      </label>
                      <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                        <BedSelection
                          ward={selectedInternalWard}
                          hospitalId={user?.hospital_id}
                          onBedSelect={setReferralSelectedBed}
                          selectedBed={referralSelectedBed}
                          title="Available Beds"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowReferralModal(false);
                        setSelectedInternalWard('');
                        setSelectedBed('');
                      }}
                      className="py-2.5 px-6 bg-gray-100 text-gray-600 border-none rounded-full cursor-pointer hover:bg-gray-200"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInternalRefer}
                      disabled={!selectedInternalWard || loading}
                      className={`py-2.5 px-6 text-white border-none rounded-full cursor-pointer ${
                        !selectedInternalWard || loading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{ backgroundColor: currentWard.primaryColor }}
                    >
                      {loading ? 'Processing...' : 'Send Referral'}
                    </button>
                  </div>
                </div>
              )}

              {referralType === 'external' && (
                <div>
                  <div className={`${dischargeValidation.hospital ? 'border-red-500 border rounded-lg' : ''}`}>
                    <EthiopianHierarchySelector onSelect={setExternalReferralData} />
                  </div>
                  {dischargeValidation.hospital && (
                    <p className="text-red-500 text-xs mt-1">{dischargeValidation.hospital}</p>
                  )}
                  
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowReferralModal(false)}
                      className="py-2.5 px-6 bg-gray-100 text-gray-600 border-none rounded-full cursor-pointer hover:bg-gray-200"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExternalRefer}
                      disabled={!externalReferralData || loading}
                      className={`py-2.5 px-6 text-white border-none rounded-full cursor-pointer ${
                        !externalReferralData || loading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{ backgroundColor: currentWard.primaryColor }}
                    >
                      {loading ? 'Processing...' : 'Send Referral'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bed Selection Notification Modal */}
        {showBedListNotification && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2100] backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Select Bed for Admission</h3>
                <button
                  onClick={() => {
                    setShowBedListNotification(false);
                    setAvailableBedsList([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  ×
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                Available Beds in <span className="font-semibold">{user?.ward}</span> Ward:
              </p>
              
              {availableBedsList.length === 0 ? (
                <div className="text-center py-8 bg-yellow-50 rounded-lg">
                  <span className="text-4xl text-yellow-500 mx-auto mb-2 block">🛏️</span>
                  <p className="text-gray-600">No beds available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto mb-4">
                  {availableBedsList.map(bed => (
                    <button
                      key={bed.id}
                      onClick={() => {
                        setSelectedBed(bed.id);
                        setShowBedListNotification(false);
                        handleAdmit(bed.id);
                      }}
                      className="border-2 border-green-200 bg-green-50 hover:bg-green-100 rounded-xl p-4 transition-all hover:shadow-md hover:border-green-500 group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-lg text-gray-800">Bed {bed.number}</span>
                        <span className="text-2xl">🛏️</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        {bed.type === 'general' ? 'General Ward' : 
                         bed.type === 'private' ? 'Private Room' :
                         bed.type === 'icu' ? 'ICU' :
                         bed.type === 'isolation' ? 'Isolation' : 'General'}
                      </div>
                      <div className="text-xs text-green-600 font-medium mt-2">
                        ✓ Available - Click to Admit
                      </div>
                      {bed.notes && (
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          {bed.notes}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  {availableBedsList.length} bed(s) available
                </div>
                <button
                  onClick={() => {
                    setShowBedListNotification(false);
                    setAvailableBedsList([]);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Viewer Modal */}
        {showImageModal && selectedImage && (
          <div 
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9999] backdrop-blur-sm"
            onClick={() => {
              setShowImageModal(false);
              setSelectedImage(null);
            }}
          >
            <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setSelectedImage(null);
                }}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 text-3xl z-10 transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                ×
              </button>
              
              <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
                <img
                  src={selectedImage.url}
                  alt="Radiology Image"
                  className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                  onError={(e) => {
                    console.error('❌ Failed to load full-size image:', selectedImage.url);
                    e.target.onerror = null;
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 24 24" fill="none" stroke="%23ff6b6b" stroke-width="2"%3E%3Crect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                    e.target.style.objectFit = 'contain';
                    e.target.style.maxWidth = '80%';
                    e.target.style.maxHeight = '80%';
                  }}
                />
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white p-4 rounded-b-lg">
                <p className="text-sm font-medium">{selectedImage.filename || 'Radiology Image'}</p>
                {selectedImage.uploaded_at && (
                  <p className="text-xs text-gray-300 mt-1">📅 Uploaded: {new Date(selectedImage.uploaded_at).toLocaleString()}</p>
                )}
              </div>
              
              <button
                onClick={() => {
                  const imageUrl = selectedImage.url;
                  const filename = selectedImage.filename || `radiology-image-${Date.now()}.jpg`;
                  fetch(imageUrl)
                    .then(response => response.blob())
                    .then(blob => {
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = filename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    })
                    .catch(error => {
                      const link = document.createElement('a');
                      link.href = imageUrl;
                      link.download = filename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    });
                }}
                className="absolute top-4 right-12 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                title="Download Image"
              >
                💾
              </button>
              
              <div className="absolute bottom-20 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                Click outside to close
              </div>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
                  <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition">×</button>
                </div>
                <div className="space-y-4">
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="flex gap-3 pt-4">
                    <button onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                      Cancel
                    </button>
                    <button onClick={changePassword} className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition">
                      Change Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;