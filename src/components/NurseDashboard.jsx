import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import SignaturePad from 'react-signature-canvas';
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
  FaPlus, FaUpload, FaClipboardList, FaSyringe, FaThermometerHalf,
  FaNotesMedical, FaWheelchair, FaHandHoldingHeart, FaProcedures,
  FaSync
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ScheduleViewer from '../components/ScheduleViewer';

const NurseDashboard = ({ user, onLogout }) => {
  // ==================== STATE MANAGEMENT ====================
  const [patients, setPatients] = useState([]);
  const [queuePatients, setQueuePatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [activeTab, setActiveTab] = useState('vitals');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [notification, setNotification] = useState(null);
  const [showDischargeList, setShowDischargeList] = useState(false);
  const [stats, setStats] = useState({
    waiting: 0,
    inProgress: 0,
    completed: 0,
    pendingVitals: 0,
    admitted: 0,
    discharged: 0
  });
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // ==================== GOOGLE SEARCH STATE ====================
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);

  // ==================== REPORT STATES ====================
  const [reportMainTab, setReportMainTab] = useState('queue');
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
  const [doctors, setDoctors] = useState([]);
  const [pharmacyStaff, setPharmacyStaff] = useState([]);
  const [labStaff, setLabStaff] = useState([]);
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
    nurse_type: '',
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

  // ==================== NURSE SPECIFIC STATES ====================
  const [vitalsData, setVitalsData] = useState({
    temperature: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    pain_level: '',
    weight: '',
    height: '',
    blood_glucose: '',
    chief_complaint: ''
  });
  
  const [nursingNotes, setNursingNotes] = useState('');
  const [medicationAdministration, setMedicationAdministration] = useState([]);
  const [newMedicationAdmin, setNewMedicationAdmin] = useState({
    medication_name: '',
    dosage: '',
    route: 'oral',
    time_administered: '',
    notes: '',
    status: 'pending'
  });
  
  const [patientCareTasks, setPatientCareTasks] = useState([]);
  const [newCareTask, setNewCareTask] = useState({
    task_type: 'bathing',
    priority: 'routine',
    notes: '',
    scheduled_time: ''
  });
  
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [bedAssignments, setBedAssignments] = useState([]);
  const [vitalsHistory, setVitalsHistory] = useState([]);

  // Validation errors
  const [vitalsValidation, setVitalsValidation] = useState({});
  const [medicationValidation, setMedicationValidation] = useState({});
  const [taskValidation, setTaskValidation] = useState({});
  
  const [realTimeNotification, setRealTimeNotification] = useState(null);

  // ==================== WARD CONFIGURATION ====================
  const wardConfig = {
    'OPD': {
      title: 'OPD Nurse Dashboard',
      primaryColor: '#0d9488',
      secondaryColor: '#14b8a6',
      accentColor: '#0f766e',
      bgGradient: 'from-teal-600 to-emerald-500',
      queueTitle: 'OPD Patients',
      icon: '🏥',
      sidebarIcon: '👩‍⚕️'
    },
    'EME': {
      title: 'Emergency Nurse Dashboard',
      primaryColor: '#ef4444',
      secondaryColor: '#f87171',
      accentColor: '#dc2626',
      bgGradient: 'from-red-500 to-rose-400',
      queueTitle: 'Emergency Patients',
      icon: '🚨',
      sidebarIcon: '⚕️'
    },
    'ANC': {
      title: 'Antenatal Nurse Dashboard',
      primaryColor: '#8b5cf6',
      secondaryColor: '#a78bfa',
      accentColor: '#7c3aed',
      bgGradient: 'from-violet-500 to-purple-400',
      queueTitle: 'Maternity Patients',
      icon: '🤰',
      sidebarIcon: '👶'
    },
    'WARD': {
      title: 'Ward Nurse Dashboard',
      primaryColor: '#3b82f6',
      secondaryColor: '#60a5fa',
      accentColor: '#2563eb',
      bgGradient: 'from-blue-600 to-indigo-500',
      queueTitle: 'Ward Patients',
      icon: '🛏️',
      sidebarIcon: '🏥'
    }
  };

  const currentWard = wardConfig[user?.ward] || wardConfig['WARD'];

  // API Configuration
  const API_URL = 'http://localhost:5001';
  const SOCKET_URL = 'http://localhost:5001';

  // Refs
  const signaturePad = useRef(null);
  const socket = useRef(null);
  const navigate = useNavigate();

  // ==================== HELPER FUNCTIONS ====================
  const getNurseFullName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.first_name && user?.last_name) return `${user.first_name} ${user.last_name}`;
    if (user?.name) return user.name;
    return 'Nurse';
  };

  // ==================== GOOGLE SEARCH HANDLER ====================
  const handleGoogleSearch = () => {
    if (searchQuery.trim()) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' nursing medical reference')}`;
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

  // ==================== REPORT FUNCTIONS ====================

  const fetchReportsInbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/nurse/reports/inbox`, {
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
      const res = await axios.get(`${API_URL}/api/nurse/reports/outbox`, {
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

  // Fetch all recipient types for sending reports
  const fetchHospitalAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/nurse/hospital-admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHospitalAdmins(res.data.admins);
      }
    } catch (error) {
      console.error('Error fetching hospital admins:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/nurse/doctors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setDoctors(res.data.doctors);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchPharmacyStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/nurse/pharmacy-staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPharmacyStaff(res.data.staff);
      }
    } catch (error) {
      console.error('Error fetching pharmacy staff:', error);
    }
  };

  const fetchLabStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/nurse/lab-staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setLabStaff(res.data.staff);
      }
    } catch (error) {
      console.error('Error fetching lab staff:', error);
    }
  };

  const fetchAllStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/nurse/all-staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setStaffMembers(res.data.staff);
      }
    } catch (error) {
      console.error('Error fetching all staff:', error);
    }
  };

  const handleFileAttachment = (e) => {
    const files = Array.from(e.target.files);
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024;
    
    const validFiles = files.filter(file => {
      if (!validTypes.includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Only images and PDF files are allowed.`);
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
      if (sendReportForm.reminder_date) {
        formData.append('reminder_date', sendReportForm.reminder_date);
        formData.append('reminder_frequency', sendReportForm.reminder_frequency);
      }
      
      sendReportForm.attachments.forEach((file, index) => {
        formData.append('attachments', file);
      });
      
      const res = await axios.post(`${API_URL}/api/nurse/reports/send`, formData, {
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

  const markReportAsRead = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/nurse/reports/${reportId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReportsInbox();
    } catch (error) {
      console.error('Error marking report as read:', error);
    }
  };

  const viewReportDetails = (report) => {
    setSelectedReport(report);
    setShowReportDetailModal(true);
    if (!report.is_opened) {
      markReportAsRead(report.id);
    }
  };

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
      
      const res = await axios.post(`${API_URL}/api/nurse/reports/${selectedReport.id}/reply`, formData, {
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

  const handleSetReminder = async () => {
    if (!reminderData.reminder_date) {
      setMessage({ type: 'error', text: 'Please select a reminder date' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/nurse/reports/${reminderData.report_id}/reminder`, {
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
      const res = await axios.get(`${API_URL}/api/nurse/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const nurse = res.data.nurse;
        setProfileData({
          first_name: nurse.first_name || '',
          middle_name: nurse.middle_name || '',
          last_name: nurse.last_name || '',
          gender: nurse.gender || '',
          age: nurse.age || '',
          phone: nurse.phone || '',
          email: nurse.email || '',
          nurse_type: nurse.nurse_type || '',
          license_number: nurse.license_number || '',
          years_of_experience: nurse.years_of_experience || '',
          employee_id: nurse.employee_id || '',
          emergency_contact_name: nurse.emergency_contact?.name || '',
          emergency_contact_phone: nurse.emergency_contact?.phone || '',
          emergency_contact_relationship: nurse.emergency_contact?.relationship || '',
          bio: nurse.bio || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/nurse/profile`, {
        first_name: profileData.first_name,
        middle_name: profileData.middle_name,
        last_name: profileData.last_name,
        gender: profileData.gender,
        age: profileData.age,
        phone: profileData.phone,
        nurse_type: profileData.nurse_type,
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
      const res = await axios.put(`${API_URL}/api/nurse/change-password`, {
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

  // ==================== NURSE SPECIFIC FUNCTIONS ====================

  const validateVitals = () => {
    const errors = {};
    if (vitalsData.temperature) {
      const temp = parseFloat(vitalsData.temperature);
      if (temp < 35 || temp > 42) {
        errors.temperature = 'Temperature should be between 35-42°C';
      }
    }
    if (vitalsData.blood_pressure_systolic) {
      const systolic = parseInt(vitalsData.blood_pressure_systolic);
      if (systolic < 50 || systolic > 250) {
        errors.blood_pressure_systolic = 'Systolic BP should be between 50-250 mmHg';
      }
    }
    if (vitalsData.blood_pressure_diastolic) {
      const diastolic = parseInt(vitalsData.blood_pressure_diastolic);
      if (diastolic < 30 || diastolic > 150) {
        errors.blood_pressure_diastolic = 'Diastolic BP should be between 30-150 mmHg';
      }
    }
    if (vitalsData.heart_rate) {
      const hr = parseInt(vitalsData.heart_rate);
      if (hr < 30 || hr > 200) {
        errors.heart_rate = 'Heart rate should be between 30-200 bpm';
      }
    }
    if (vitalsData.oxygen_saturation) {
      const o2 = parseInt(vitalsData.oxygen_saturation);
      if (o2 < 50 || o2 > 100) {
        errors.oxygen_saturation = 'O2 saturation should be between 50-100%';
      }
    }
    setVitalsValidation(errors);
    return Object.keys(errors).length === 0;
  };

  const validateMedicationAdmin = () => {
    const errors = {};
    if (!newMedicationAdmin.medication_name) {
      errors.medication_name = 'Medication name is required';
    }
    if (!newMedicationAdmin.dosage) {
      errors.dosage = 'Dosage is required';
    }
    if (!newMedicationAdmin.time_administered) {
      errors.time_administered = 'Administration time is required';
    }
    setMedicationValidation(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCareTask = () => {
    const errors = {};
    if (!newCareTask.task_type) {
      errors.task_type = 'Task type is required';
    }
    setTaskValidation(errors);
    return Object.keys(errors).length === 0;
  };

  const handleVitalsChange = (e) => {
    const { name, value } = e.target;
    setVitalsData({ ...vitalsData, [name]: value });
    setVitalsValidation(prev => ({ ...prev, [name]: '' }));
  };

  const saveVitals = async () => {
    if (!validateVitals()) {
      setMessage({ type: 'error', text: 'Please fix validation errors' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/nurse/save-vitals`, {
        patient_id: selectedPatient.id,
        vitals: {
          temperature: vitalsData.temperature,
          blood_pressure: vitalsData.blood_pressure_systolic && vitalsData.blood_pressure_diastolic 
            ? `${vitalsData.blood_pressure_systolic}/${vitalsData.blood_pressure_diastolic}`
            : null,
          heart_rate: vitalsData.heart_rate,
          respiratory_rate: vitalsData.respiratory_rate,
          oxygen_saturation: vitalsData.oxygen_saturation,
          pain_level: vitalsData.pain_level,
          weight: vitalsData.weight,
          height: vitalsData.height,
          blood_glucose: vitalsData.blood_glucose,
          chief_complaint: vitalsData.chief_complaint
        },
        nurse_id: user?.id,
        nurse_name: getNurseFullName(),
        hospital_id: user?.hospital_id,
        ward: user?.ward
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Vitals saved successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        
        if (socket.current) {
          socket.current.emit('vitals_recorded', {
            patient_id: selectedPatient.id,
            patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
            nurse_name: getNurseFullName(),
            ward: user?.ward,
            hospital_id: user?.hospital_id,
            vitals: vitalsData
          });
        }
        
        fetchVitalsHistory(selectedPatient.id);
      }
    } catch (error) {
      console.error('Error saving vitals:', error);
      setMessage({ type: 'error', text: 'Error saving vitals' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const saveNursingNotes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/nurse/save-notes`, {
        patient_id: selectedPatient.id,
        notes: nursingNotes,
        nurse_id: user?.id,
        nurse_name: getNurseFullName(),
        hospital_id: user?.hospital_id,
        ward: user?.ward
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Nursing notes saved!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error saving nursing notes:', error);
      setMessage({ type: 'error', text: 'Error saving notes' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const addMedicationAdministration = () => {
    if (!validateMedicationAdmin()) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const medication = {
      id: Date.now().toString(),
      ...newMedicationAdmin,
      administered_at: new Date().toISOString(),
      administered_by: getNurseFullName(),
      status: 'administered'
    };
    setMedicationAdministration([...medicationAdministration, medication]);
    setNewMedicationAdmin({
      medication_name: '',
      dosage: '',
      route: 'oral',
      time_administered: '',
      notes: '',
      status: 'pending'
    });
    setMedicationValidation({});
  };

  const addCareTask = () => {
    if (!validateCareTask()) {
      setMessage({ type: 'error', text: 'Please select task type' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const task = {
      id: Date.now().toString(),
      ...newCareTask,
      created_at: new Date().toISOString(),
      status: 'pending',
      completed_at: null
    };
    setPatientCareTasks([...patientCareTasks, task]);
    setNewCareTask({
      task_type: 'bathing',
      priority: 'routine',
      notes: '',
      scheduled_time: ''
    });
    setTaskValidation({});
  };

  const completeCareTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/nurse/complete-task/${taskId}`, {
        patient_id: selectedPatient.id,
        nurse_id: user?.id
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setPatientCareTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: 'completed', completed_at: new Date().toISOString() } : task
      ));
      
      setMessage({ type: 'success', text: 'Task completed!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const fetchVitalsHistory = async (patientId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/nurse/vitals-history/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setVitalsHistory(res.data.vitals);
      }
    } catch (error) {
      console.error('Error fetching vitals history:', error);
    }
  };

  const fetchAssignedPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/nurse/assigned-patients`, {
        params: {
          nurse_id: user?.id,
          hospital_id: user?.hospital_id,
          ward: user?.ward
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAssignedPatients(res.data.patients);
        setStats(prev => ({ ...prev, inProgress: res.data.patients.length }));
      }
    } catch (error) {
      console.error('Error fetching assigned patients:', error);
    }
  };

  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user?.hospital_id || !user?.ward) return;

      const res = await axios.get(`${API_URL}/api/nurse/queue`, {
        params: {
          ward: user.ward,
          hospital_id: user.hospital_id,
          nurse_id: user.id
        },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      
      if (res.data.success) {
        setQueuePatients(res.data.queue || []);
        setStats(prev => ({ ...prev, waiting: res.data.queue?.length || 0 }));
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
      setQueuePatients([]);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user?.hospital_id || !user?.ward) return;

      const res = await axios.get(`${API_URL}/api/nurse/stats`, {
        params: { ward: user.ward, hospital_id: user.hospital_id, nurse_id: user.id },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleTakePatient = async (patient) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const res = await axios.post(`${API_URL}/api/nurse/assign-patient`, {
        patient_id: patient.id,
        nurse_id: user?.id,
        nurse_name: getNurseFullName(),
        ward: user?.ward,
        hospital_id: user?.hospital_id
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setSelectedPatient(res.data.patient);
        setShowPatientModal(true);
        setActiveTab('vitals');
        setQueuePatients(prev => prev.filter(p => p.id !== patient.id));
        
        if (res.data.patient.vitals) {
          const bp = res.data.patient.vitals.blood_pressure?.split('/');
          setVitalsData({
            temperature: res.data.patient.vitals.temperature || '',
            blood_pressure_systolic: bp?.[0] || '',
            blood_pressure_diastolic: bp?.[1] || '',
            heart_rate: res.data.patient.vitals.heart_rate || '',
            respiratory_rate: res.data.patient.vitals.respiratory_rate || '',
            oxygen_saturation: res.data.patient.vitals.oxygen_saturation || '',
            pain_level: res.data.patient.vitals.pain_level || '',
            weight: res.data.patient.vitals.weight || '',
            height: res.data.patient.vitals.height || '',
            blood_glucose: res.data.patient.vitals.blood_glucose || '',
            chief_complaint: res.data.patient.vitals.chief_complaint || ''
          });
        }
        
        fetchVitalsHistory(patient.id);
        setMessage({ type: 'success', text: 'Patient assigned successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error taking patient:', error);
      setMessage({ type: 'error', text: 'Error taking patient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const completePatientCare = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/nurse/complete-care`, {
        patient_id: selectedPatient.id,
        nurse_id: user?.id,
        nurse_name: getNurseFullName(),
        vitals: vitalsData,
        nursing_notes: nursingNotes,
        medications_administered: medicationAdministration,
        care_tasks_completed: patientCareTasks.filter(t => t.status === 'completed')
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Patient care completed!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setShowPatientModal(false);
        setSelectedPatient(null);
        setVitalsData({
          temperature: '', blood_pressure_systolic: '', blood_pressure_diastolic: '',
          heart_rate: '', respiratory_rate: '', oxygen_saturation: '', pain_level: '',
          weight: '', height: '', blood_glucose: '', chief_complaint: ''
        });
        setNursingNotes('');
        setMedicationAdministration([]);
        setPatientCareTasks([]);
        fetchStats();
        fetchAssignedPatients();
      }
    } catch (error) {
      console.error('Error completing care:', error);
      setMessage({ type: 'error', text: 'Error completing care' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
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
                <p className="text-sm font-bold text-gray-900">{realTimeNotification.title}</p>
              </div>
              <p className="text-sm text-gray-600 mb-2">{realTimeNotification.message}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>🕒 {new Date(realTimeNotification.timestamp).toLocaleTimeString()}</span>
                <span>👩‍⚕️ {realTimeNotification.sender}</span>
              </div>
            </div>
            <button onClick={() => setRealTimeNotification(null)} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
              <FaTimes className="text-sm" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const ConnectionStatusBanner = () => {
    if (connectionStatus === 'connected') return null;
    
    return (
      <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-2 rounded-full shadow-lg flex items-center gap-3 ${
        connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
      } text-white`}>
        <span>{connectionStatus === 'connecting' ? '🔄' : '⚠️'}</span>
        <span>
          {connectionStatus === 'connecting' 
            ? 'Connecting to server...' 
            : 'Disconnected from server. Trying to reconnect...'}
        </span>
      </div>
    );
  };

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    if (!user?.hospital_id || !user?.ward) return;

    const token = localStorage.getItem('token');
    
    socket.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });
    
    socket.current.on('connect', () => {
      setConnectionStatus('connected');
      
      if (user?.hospital_id && user?.ward) {
        const wardRoom = `hospital_${user.hospital_id}_ward_${user.ward}_nurse`;
        socket.current.emit('join', wardRoom);
        
        // Join staff personal room for schedule updates
        socket.current.emit('join_staff', { 
          staffId: user.id, 
          hospitalId: user.hospital_id 
        });
      }
    });
    
    socket.current.on('connect_error', () => setConnectionStatus('disconnected'));
    socket.current.on('disconnect', () => setConnectionStatus('disconnected'));

    // Listen for schedule events
    socket.current.on('weekly_schedule_ready', (data) => {
      setRealTimeNotification({
        id: Date.now(),
        type: 'schedule',
        title: 'Weekly Schedule Ready',
        message: `Your schedule for ${data.week_range} is ready. ${data.schedules_count} shifts, ${data.total_hours} hours.`,
        priority: 'high',
        timestamp: new Date(),
        sender: 'System'
      });
      
      if (reportMainTab === 'schedule') {
        const event = new CustomEvent('refreshSchedule');
        window.dispatchEvent(event);
      }
      setTimeout(() => setRealTimeNotification(null), 10000);
    });

    socket.current.on('new_schedule_assigned', (data) => {
      setRealTimeNotification({
        id: Date.now(),
        type: 'schedule',
        title: 'New Schedule Assigned',
        message: `${data.shift} Shift on ${data.date} in ${data.ward} Ward`,
        priority: 'high',
        timestamp: new Date(),
        sender: 'System'
      });
      
      if (reportMainTab === 'schedule') {
        const event = new CustomEvent('refreshSchedule');
        window.dispatchEvent(event);
      }
      setTimeout(() => setRealTimeNotification(null), 8000);
    });

    socket.current.on('schedule_updated_notification', (data) => {
      setRealTimeNotification({
        id: Date.now(),
        type: 'schedule',
        title: 'Schedule Updated',
        message: `Your ${data.shift} shift on ${data.date} has been ${data.status || 'updated'}`,
        priority: 'medium',
        timestamp: new Date(),
        sender: 'System'
      });
      
      if (reportMainTab === 'schedule') {
        const event = new CustomEvent('refreshSchedule');
        window.dispatchEvent(event);
      }
      setTimeout(() => setRealTimeNotification(null), 6000);
    });

    socket.current.on('schedule_cancelled', (data) => {
      setRealTimeNotification({
        id: Date.now(),
        type: 'schedule',
        title: 'Schedule Cancelled',
        message: `Your ${data.shift} shift on ${data.date} has been cancelled.`,
        priority: 'urgent',
        timestamp: new Date(),
        sender: 'System'
      });
      
      if (reportMainTab === 'schedule') {
        const event = new CustomEvent('refreshSchedule');
        window.dispatchEvent(event);
      }
      setTimeout(() => setRealTimeNotification(null), 8000);
    });

    socket.current.on('report_reply', (data) => {
      setRealTimeNotification({
        id: Date.now(),
        type: 'reply',
        title: 'New Reply Received',
        message: data.message,
        priority: data.priority || 'medium',
        timestamp: new Date(),
        sender: data.sender_name
      });
      fetchReportsInbox();
      setTimeout(() => setRealTimeNotification(null), 8000);
    });

    socket.current.on('new_patient_assigned', (data) => {
      setRealTimeNotification({
        id: Date.now(),
        type: 'assignment',
        title: 'New Patient Assigned',
        message: `${data.patient_name} has been assigned to you`,
        priority: 'high',
        timestamp: new Date(),
        sender: 'System'
      });
      fetchQueue();
      fetchAssignedPatients();
      setTimeout(() => setRealTimeNotification(null), 8000);
    });

    fetchQueue();
    fetchStats();
    fetchAssignedPatients();
    fetchReportsInbox();
    fetchReportsOutbox();
    fetchHospitalAdmins();
    fetchDoctors();
    fetchPharmacyStaff();
    fetchLabStaff();
    fetchAllStaff();
    fetchProfile();

    const interval = setInterval(() => {
      fetchQueue();
      fetchStats();
      fetchAssignedPatients();
      fetchReportsInbox();
    }, 30000);

    return () => {
      if (socket.current) socket.current.disconnect();
      clearInterval(interval);
    };
  }, [user?.hospital_id, user?.ward]);

  // ==================== RENDER HELPERS ====================
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
    const icons = { low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴' };
    return icons[priority] || '🟡';
  };

  const getTaskTypeIcon = (taskType) => {
    const icons = {
      bathing: '🛁',
      feeding: '🍽️',
      medication: '💊',
      wound_care: '🩹',
      mobility: '🚶',
      monitoring: '📊',
      education: '📚',
      other: '📝'
    };
    return icons[taskType] || '📋';
  };

  const handleLogout = () => {
    if (socket.current) socket.current.disconnect();
    if (onLogout) onLogout();
    navigate('/login');
  };

  // ==================== MAIN RENDER ====================
  return (
    <div className="font-sans bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen flex">
      <ConnectionStatusBanner />
      <RealTimeNotification />

      {/* ==================== SIDEBAR ==================== */}
      <div className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col h-screen sticky top-0 shadow-2xl z-50`}>
        {/* Sidebar Header */}
        <div className={`${sidebarCollapsed ? 'py-5 px-0' : 'p-6'} border-b border-slate-700/50 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">{currentWard.sidebarIcon}</span>
              </div>
              <div>
                <h3 className="m-0 text-lg font-semibold">{user?.ward} Ward</h3>
                <p className="mt-0.5 text-xs text-slate-400">Nurse {user?.full_name || getNurseFullName()}</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">{currentWard.sidebarIcon}</span>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="bg-slate-700/50 hover:bg-slate-600 rounded-lg p-2 transition">
            {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>

        {/* Navigation Menu */}
        <div className={`flex-1 ${sidebarCollapsed ? 'py-4 px-0' : 'p-4'}`}>
          {/* Patient Queue */}
          <div onClick={() => { setShowDischargeList(false); setReportMainTab('queue'); }} 
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 rounded-xl ${reportMainTab === 'queue' && !showDischargeList ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all`}>
            <span className="text-xl">👥</span>
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-sm font-medium">Patient Queue</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-white/20">{queuePatients.length}</span>
              </>
            )}
          </div>

          {/* My Patients */}
          <div onClick={() => { setShowDischargeList(false); setReportMainTab('my_patients'); fetchAssignedPatients(); }}
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'my_patients' && !showDischargeList ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all`}>
            <span className="text-xl">🩺</span>
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-sm font-medium">My Patients</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-teal-500/80">{stats.inProgress}</span>
              </>
            )}
          </div>

          {/* My Schedule */}
          <div onClick={() => { setShowDischargeList(false); setReportMainTab('schedule'); }}
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'schedule' && !showDischargeList ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all`}>
            <span className="text-xl">📅</span>
            {!sidebarCollapsed && (
              <span className="flex-1 text-sm font-medium">My Schedule</span>
            )}
          </div>

          {/* Reports Inbox */}
          <div onClick={() => { setShowDischargeList(false); setReportMainTab('inbox'); fetchReportsInbox(); }}
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'inbox' && !showDischargeList ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all relative`}>
            <span className="text-xl">📬</span>
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-sm font-medium">Inbox</span>
                {unreadReportsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 animate-pulse">{unreadReportsCount}</span>
                )}
              </>
            )}
            {sidebarCollapsed && unreadReportsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center">{unreadReportsCount}</span>
            )}
          </div>

          {/* Sent Reports */}
          <div onClick={() => { setShowDischargeList(false); setReportMainTab('sent'); fetchReportsOutbox(); }}
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'sent' && !showDischargeList ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all`}>
            <span className="text-xl">📤</span>
            {!sidebarCollapsed && <span className="flex-1 text-sm font-medium">Sent Reports</span>}
          </div>

          {/* Profile */}
          <div onClick={() => { setShowDischargeList(false); setReportMainTab('profile'); }}
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'profile' && !showDischargeList ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all`}>
            <span className="text-xl">👤</span>
            {!sidebarCollapsed && <span className="flex-1 text-sm font-medium">Profile</span>}
          </div>

          {/* Quick Stats */}
          {!sidebarCollapsed && (
            <div className="px-4 mt-auto pt-6">
              <p className="text-[10px] text-slate-500 mb-3 uppercase">Today's Stats</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <div className="text-xl font-bold text-emerald-400">{stats.completed}</div>
                  <div className="text-[10px] text-slate-400">Completed</div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <div className="text-xl font-bold text-amber-400">{stats.pendingVitals}</div>
                  <div className="text-[10px] text-slate-400">Pending Vitals</div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <div className="text-xl font-bold text-blue-400">{stats.admitted}</div>
                  <div className="text-[10px] text-slate-400">Admitted</div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <div className="text-xl font-bold text-purple-400">{stats.discharged}</div>
                  <div className="text-[10px] text-slate-400">Discharged</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className={`${sidebarCollapsed ? 'py-4 px-0' : 'p-5'} border-t border-slate-700/50`}>
          <button onClick={handleLogout} className={`w-full ${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} bg-transparent border border-slate-600 rounded-xl text-red-400 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 text-sm transition-all hover:bg-red-500/10`}>
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
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                  <span>{currentWard.icon}</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white m-0 drop-shadow-md">
                    {reportMainTab === 'inbox' ? 'Reports - Inbox' : 
                     reportMainTab === 'sent' ? 'Reports - Sent' : 
                     reportMainTab === 'profile' ? 'My Profile' : 
                     reportMainTab === 'my_patients' ? 'My Assigned Patients' :
                     reportMainTab === 'schedule' ? 'My Schedule' :
                     currentWard.title}
                  </h1>
                  <p className="text-base text-white/90 mt-1">
                    Nurse {user?.full_name || getNurseFullName()} • {user?.hospital_name} • {user?.ward} Ward
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Google Search Button */}
              <button onClick={() => setShowSearchBar(!showSearchBar)}
                      className="bg-white/20 backdrop-blur px-4 py-2.5 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition shadow-lg text-sm font-medium">
                <FaSearch /> <span className="hidden sm:inline">Medical Search</span>
              </button>

              {/* Send Report Button */}
              <button onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); fetchDoctors(); fetchPharmacyStaff(); fetchLabStaff(); }}
                      className="bg-white/20 backdrop-blur px-4 py-2.5 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition shadow-lg text-sm font-medium">
                <FaPaperPlane /> <span className="hidden sm:inline">Send Report</span>
              </button>
              
              {/* Stats Display */}
              <div className="flex gap-4 bg-white/10 backdrop-blur py-2 px-5 rounded-full">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{queuePatients.length}</div>
                  <div className="text-[10px] text-white/70">Queue</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.inProgress}</div>
                  <div className="text-[10px] text-white/70">In Progress</div>
                </div>
                <div className="w-px h-8 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.completed}</div>
                  <div className="text-[10px] text-white/70">Completed</div>
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
                  placeholder="Search nursing and medical information on Google..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  onClick={handleGoogleSearch}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Search Google
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Toast */}
        {message.text && (
          <div className={`fixed bottom-8 right-8 z-[1000] ${message.type === 'error' ? 'bg-red-100 text-red-800 border-red-400' : 'bg-green-100 text-green-800 border-green-400'} py-3 px-6 rounded-lg shadow-md border-l-4 animate-slide-in`}>
            {message.text}
          </div>
        )}

        {/* Main Content Area */}
        <div className="max-w-[1600px] mx-auto p-8">
          {/* Send Report Modal */}
          <AnimatePresence>
            {showSendReportModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                         className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowSendReportModal(false)}>
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                           className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <FaPaperPlane className="text-blue-500" /> Send Report
                    </h2>
                    <button onClick={() => setShowSendReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full">×</button>
                  </div>
                  
                  <form onSubmit={handleSendReport} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" value="hospital_admin" checked={sendReportForm.recipient_type === 'hospital_admin'}
                                 onChange={(e) => setSendReportForm({...sendReportForm, recipient_type: e.target.value, recipient_id: ''})} />
                          <span>🏢 Hospital Admin</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" value="doctor" checked={sendReportForm.recipient_type === 'doctor'}
                                 onChange={(e) => setSendReportForm({...sendReportForm, recipient_type: e.target.value, recipient_id: ''})} />
                          <span>👨‍⚕️ Doctor</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" value="pharmacy" checked={sendReportForm.recipient_type === 'pharmacy'}
                                 onChange={(e) => setSendReportForm({...sendReportForm, recipient_type: e.target.value, recipient_id: ''})} />
                          <span>💊 Pharmacy</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" value="lab" checked={sendReportForm.recipient_type === 'lab'}
                                 onChange={(e) => setSendReportForm({...sendReportForm, recipient_type: e.target.value, recipient_id: ''})} />
                          <span>🔬 Lab</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Recipient *</label>
                      <select value={sendReportForm.recipient_id} onChange={(e) => setSendReportForm({...sendReportForm, recipient_id: e.target.value})}
                              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" required>
                        <option value="">Select Recipient...</option>
                        {sendReportForm.recipient_type === 'hospital_admin' && hospitalAdmins.map(admin => (
                          <option key={admin.id} value={admin.id}>{admin.full_name} - {admin.hospital_name}</option>
                        ))}
                        {sendReportForm.recipient_type === 'doctor' && doctors.map(doc => (
                          <option key={doc.id} value={doc.id}>Dr. {doc.full_name} - {doc.specialization || doc.ward} Ward</option>
                        ))}
                        {sendReportForm.recipient_type === 'pharmacy' && pharmacyStaff.map(pharm => (
                          <option key={pharm.id} value={pharm.id}>{pharm.full_name} - Pharmacy</option>
                        ))}
                        {sendReportForm.recipient_type === 'lab' && labStaff.map(lab => (
                          <option key={lab.id} value={lab.id}>{lab.full_name} - Lab</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                      <select value={sendReportForm.priority} onChange={(e) => setSendReportForm({...sendReportForm, priority: e.target.value})}
                              className="w-full p-3 border border-gray-300 rounded-xl">
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🟠 High</option>
                        <option value="urgent">🔴 Urgent</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                      <input type="text" value={sendReportForm.title} onChange={(e) => setSendReportForm({...sendReportForm, title: e.target.value})}
                             placeholder="e.g., Patient Care Report" className="w-full p-3 border border-gray-300 rounded-xl" required />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                      <textarea value={sendReportForm.body} onChange={(e) => setSendReportForm({...sendReportForm, body: e.target.value})}
                                rows="5" placeholder="Enter report details..." className="w-full p-3 border border-gray-300 rounded-xl resize-none" required />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                      <input type="file" ref={fileInputRef} onChange={handleFileAttachment} multiple accept="image/*,.pdf"
                             className="w-full p-2 border border-gray-300 rounded-xl file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                      {attachmentPreview.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {attachmentPreview.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                {file.url ? <img src={file.url} alt={file.name} className="w-8 h-8 object-cover rounded" /> : <FaPaperclip className="text-gray-400" />}
                                <span className="text-sm text-gray-600 truncate max-w-[200px]">{file.name}</span>
                              </div>
                              <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:text-red-700"><FaTrash size={14} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <button type="button" onClick={() => setShowSendReportModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                        Cancel
                      </button>
                      <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                         className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowReportDetailModal(false)}>
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                           className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4 pb-3 border-b">
                    <div className="flex items-center gap-2">
                      {!selectedReport.is_opened ? <FaEnvelope className="text-blue-500" /> : <FaEnvelopeOpen className="text-gray-400" />}
                      <h2 className="text-xl font-bold text-gray-800">{selectedReport.title}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setShowReminderModal(true); setReminderData({...reminderData, report_id: selectedReport.id}); }}
                              className="p-2 text-amber-500 hover:bg-amber-50 rounded-full transition"><FaBellIcon /></button>
                      <button onClick={() => setShowReportDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full">×</button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div><p className="text-sm text-gray-500">From</p><p className="font-semibold">{selectedReport.sender_full_name}</p></div>
                      <div className="text-right"><p className="text-sm text-gray-500">Priority</p><span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadge(selectedReport.priority)}`}>{getPriorityIcon(selectedReport.priority)} {selectedReport.priority}</span></div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500 mb-2">Message</p><p className="whitespace-pre-wrap text-gray-800">{selectedReport.body}</p></div>
                    <div className="flex gap-3 pt-4 border-t">
                      <button onClick={() => { setShowReportDetailModal(false); setShowReplyModal(true); }} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center gap-2"><FaReply /> Reply</button>
                      <button onClick={() => setShowReportDetailModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">Close</button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reply Modal */}
          <AnimatePresence>
            {showReplyModal && selectedReport && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                         className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowReplyModal(false)}>
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                           className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold flex items-center gap-2"><FaReply className="text-blue-500" /> Reply to Report</h2><button onClick={() => setShowReplyModal(false)}>×</button></div>
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Original Report</p><p className="text-sm font-medium">{selectedReport.title}</p></div>
                  <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows="5" placeholder="Type your reply..." className="w-full p-3 border border-gray-300 rounded-xl" />
                  <div className="flex gap-3 pt-4 mt-2">
                    <button onClick={() => setShowReplyModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl">Cancel</button>
                    <button onClick={handleSendReply} disabled={loading || !replyText.trim()} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                      {loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />} Send Reply
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reminder Modal */}
          <AnimatePresence>
            {showReminderModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                         className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowReminderModal(false)}>
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                           className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold flex items-center gap-2"><FaBellIcon className="text-amber-500" /> Set Reminder</h2><button onClick={() => setShowReminderModal(false)}>×</button></div>
                  <div className="space-y-4">
                    <input type="date" value={reminderData.reminder_date} onChange={(e) => setReminderData({...reminderData, reminder_date: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" min={new Date().toISOString().split('T')[0]} />
                    <select value={reminderData.frequency} onChange={(e) => setReminderData({...reminderData, frequency: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl"><option value="once">Once</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select>
                    <div className="flex gap-3 pt-4">
                      <button onClick={() => setShowReminderModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl">Cancel</button>
                      <button onClick={handleSetReminder} className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-xl"><FaBellIcon /> Set Reminder</button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* My Schedule View */}
          {reportMainTab === 'schedule' && !showDischargeList && (
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

          {/* Patient Queue View */}
          {reportMainTab === 'queue' && !showDischargeList && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                  <div className="flex justify-between items-center">
                    <div><p className="text-sm text-gray-500">Waiting in Queue</p><p className="text-3xl font-bold text-blue-600">{queuePatients.length}</p></div>
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">👥</div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                  <div className="flex justify-between items-center">
                    <div><p className="text-sm text-gray-500">In Progress</p><p className="text-3xl font-bold text-indigo-600">{stats.inProgress}</p></div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl">🩺</div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                  <div className="flex justify-between items-center">
                    <div><p className="text-sm text-gray-500">Completed Today</p><p className="text-3xl font-bold text-emerald-600">{stats.completed}</p></div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl">✅</div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                  <div className="flex justify-between items-center">
                    <div><p className="text-sm text-gray-500">Pending Vitals</p><p className="text-3xl font-bold text-amber-600">{stats.pendingVitals}</p></div>
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">❤️</div>
                  </div>
                </div>
              </div>

              {/* Patient Queue Table */}
              <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">{currentWard.queueTitle}</h2>
                  <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
                </div>
                
                {queuePatients.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <span className="text-5xl block mb-4">🛋️</span>
                    <p className="text-lg text-gray-500">No patients waiting</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {queuePatients.map(patient => (
                      <div key={patient.id} className="border border-gray-200 rounded-xl p-5 flex justify-between items-center shadow-sm hover:shadow-lg transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="font-mono text-sm px-2 py-1 rounded bg-blue-50 text-blue-700">{patient.card_number}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${patient.priority === 'critical' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {patient.priority || 'routine'}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold m-0">{patient.first_name} {patient.last_name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{patient.age} yrs, {patient.gender}</p>
                          <p className="text-sm text-gray-600 mt-2"><span className="font-semibold">Complaint:</span> {patient.chief_complaint || 'Not recorded'}</p>
                        </div>
                        <button onClick={() => handleTakePatient(patient)} className={`py-3 px-7 text-white rounded-xl cursor-pointer text-base font-semibold transition-all shadow-md ml-5 bg-gradient-to-r ${currentWard.bgGradient} hover:opacity-90`} disabled={loading}>
                          Start Care
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* My Patients View */}
          {reportMainTab === 'my_patients' && !showDischargeList && (
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">🩺 My Assigned Patients</h2>
                <button onClick={fetchAssignedPatients} className="px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200"><FaSpinner className={loading ? 'animate-spin inline' : 'inline'} /> Refresh</button>
              </div>
              
              {assignedPatients.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <span className="text-5xl block mb-4">👩‍⚕️</span>
                  <p className="text-lg text-gray-500">No patients assigned</p>
                  <p className="text-sm text-gray-400">Patients will appear here when assigned to you</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {assignedPatients.map(patient => (
                    <div key={patient.id} className="border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold m-0">{patient.first_name} {patient.last_name}</h3>
                            <span className="text-sm text-gray-500">Card: {patient.card_number}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2"><span className="font-semibold">Bed:</span> {patient.bed_number || 'Not assigned'} | <span className="font-semibold">Status:</span> {patient.care_status || 'In progress'}</p>
                          <p className="text-sm text-gray-600"><span className="font-semibold">Last vitals:</span> {patient.last_vitals_time ? new Date(patient.last_vitals_time).toLocaleString() : 'Not recorded'}</p>
                        </div>
                        <button onClick={() => { setSelectedPatient(patient); setShowPatientModal(true); setActiveTab('vitals'); fetchVitalsHistory(patient.id); }} className="py-2 px-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">Continue Care</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reports Inbox View */}
          {reportMainTab === 'inbox' && !showDischargeList && (
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">📬 Reports Inbox</h2>
                <button onClick={fetchReportsInbox} className="px-4 py-2 bg-gray-100 rounded-xl"><FaSpinner className={reportsLoading ? 'animate-spin' : ''} /> Refresh</button>
              </div>
              {reportsInbox.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <span className="text-5xl block mb-4">📭</span>
                  <p className="text-lg text-gray-500">No reports in inbox</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {reportsInbox.map(report => (
                    <div key={report.id} className={`border rounded-xl p-5 cursor-pointer hover:shadow-md ${!report.is_opened ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`} onClick={() => viewReportDetails(report)}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3"><h3 className="font-semibold">{report.title}</h3></div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadge(report.priority)}`}>{getPriorityIcon(report.priority)} {report.priority}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{report.body}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500"><span>From: {report.sender_full_name}</span><span>{new Date(report.sent_at).toLocaleString()}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sent Reports View */}
          {reportMainTab === 'sent' && !showDischargeList && (
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-semibold">📤 Sent Reports</h2><button onClick={fetchReportsOutbox} className="px-4 py-2 bg-gray-100 rounded-xl">Refresh</button></div>
              {reportsOutbox.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><span className="text-5xl block mb-4">📪</span><p className="text-lg text-gray-500">No sent reports</p></div>
              ) : (
                <div className="grid gap-4">
                  {reportsOutbox.map(report => (
                    <div key={report.id} className="border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-md bg-white" onClick={() => viewReportDetails(report)}>
                      <div className="flex justify-between items-start mb-3"><h3 className="font-semibold">{report.title}</h3><span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadge(report.priority)}`}>{getPriorityIcon(report.priority)} {report.priority}</span></div>
                      <div className="flex justify-between items-center text-xs text-gray-500"><span>To: {report.recipient_full_name}</span><span>Sent: {new Date(report.sent_at).toLocaleString()}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile View */}
          {reportMainTab === 'profile' && !showDischargeList && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl"><FaUserCircle className="text-blue-600 text-6xl" /></div>
                  <div className="text-white"><h2 className="text-2xl font-bold">{profileData.first_name} {profileData.last_name}</h2><p className="text-blue-100">{user?.department || 'Nurse'} • {user?.ward} Ward</p></div>
                </div>
              </div>
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold">Personal Information</h3>
                  {!isEditingProfile ? <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"><FaEdit /> Edit Profile</button>
                  : <div className="flex gap-2"><button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 border rounded-xl">Cancel</button><button onClick={updateProfile} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl"><FaSave /> Save</button></div>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-5"><h4 className="text-md font-semibold text-blue-600 mb-4">Personal Info</h4>
                    <div className="space-y-3">
                      <div><label className="text-xs text-gray-500">First Name</label>{isEditingProfile ? <input type="text" value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /> : <p className="font-medium">{profileData.first_name || 'Not set'}</p>}</div>
                      <div><label className="text-xs text-gray-500">Last Name</label>{isEditingProfile ? <input type="text" value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /> : <p className="font-medium">{profileData.last_name || 'Not set'}</p>}</div>
                      <div><label className="text-xs text-gray-500">Phone</label>{isEditingProfile ? <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /> : <p>{profileData.phone || 'Not set'}</p>}</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-5"><h4 className="text-md font-semibold text-blue-600 mb-4">Professional Info</h4>
                    <div className="space-y-3">
                      <div><label className="text-xs text-gray-500">Nurse Type</label>{isEditingProfile ? <input type="text" value={profileData.nurse_type} onChange={(e) => setProfileData({...profileData, nurse_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /> : <p>{profileData.nurse_type || 'Not set'}</p>}</div>
                      <div><label className="text-xs text-gray-500">License Number</label>{isEditingProfile ? <input type="text" value={profileData.license_number} onChange={(e) => setProfileData({...profileData, license_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /> : <p>{profileData.license_number || 'Not set'}</p>}</div>
                      <div><label className="text-xs text-gray-500">Years of Experience</label>{isEditingProfile ? <input type="number" value={profileData.years_of_experience} onChange={(e) => setProfileData({...profileData, years_of_experience: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /> : <p>{profileData.years_of_experience || '0'} years</p>}</div>
                    </div>
                  </div>
                </div>
                <hr className="my-6" />
                <div className="flex gap-4"><button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-5 py-2.5 border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50"><FaKey /> Change Password</button><button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700"><FaSignOutAlt /> Logout</button></div>
              </div>
            </div>
          )}

          {/* Change Password Modal */}
          {showPasswordModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <h2 className="text-xl font-bold mb-4">Change Password</h2>
                <div className="space-y-4">
                  <input type="password" placeholder="Current Password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} className="w-full p-3 border rounded-xl" />
                  <input type="password" placeholder="New Password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} className="w-full p-3 border rounded-xl" />
                  <input type="password" placeholder="Confirm New Password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} className="w-full p-3 border rounded-xl" />
                  <div className="flex gap-3"><button onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2 border rounded-xl">Cancel</button><button onClick={changePassword} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl">Change Password</button></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Patient Care Modal */}
        {showPatientModal && selectedPatient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-6xl w-[95%] max-h-[90vh] overflow-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b-2">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Patient Care - {currentWard.icon} {user?.ward} Ward</h2>
                  <p className="text-sm text-gray-500">{selectedPatient.first_name} {selectedPatient.last_name} • Card: {selectedPatient.card_number}</p>
                </div>
                <button onClick={() => setShowPatientModal(false)} className="text-3xl cursor-pointer text-gray-500 hover:text-gray-900">×</button>
              </div>

              {/* Patient Info Card */}
              <div className="bg-gray-50 rounded-2xl p-5 mb-6 grid grid-cols-4 gap-4">
                <div><p className="text-xs text-gray-500">Age / Gender</p><p className="font-semibold">{selectedPatient.age} yrs / {selectedPatient.gender}</p></div>
                <div><p className="text-xs text-gray-500">Phone</p><p className="font-semibold">{selectedPatient.phone || 'N/A'}</p></div>
                <div><p className="text-xs text-gray-500">Assigned At</p><p className="font-semibold">{new Date(selectedPatient.assigned_at).toLocaleTimeString()}</p></div>
                <div><p className="text-xs text-gray-500">Bed</p><p className="font-semibold">{selectedPatient.bed_number || 'Not assigned'}</p></div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b-2 pb-3 overflow-x-auto">
                {[
                  { id: 'vitals', label: '❤️ Vitals', icon: '❤️' },
                  { id: 'medications', label: '💊 Medications', icon: '💊' },
                  { id: 'care_tasks', label: '📋 Care Tasks', icon: '📋' },
                  { id: 'notes', label: '📝 Nursing Notes', icon: '📝' },
                  { id: 'history', label: '📊 Vitals History', icon: '📊' }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-2.5 px-5 rounded-full cursor-pointer text-sm font-medium transition-all ${activeTab === tab.id ? 'text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'}`} style={{ backgroundColor: activeTab === tab.id ? currentWard.primaryColor : 'transparent' }}>
                    <span>{tab.icon}</span> {tab.label}
                  </button>
                ))}
              </div>

              {/* Vitals Tab */}
              {activeTab === 'vitals' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Record Vital Signs</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div><label className="block text-sm font-medium mb-2">Temperature (°C)</label><input type="number" step="0.1" name="temperature" value={vitalsData.temperature} onChange={handleVitalsChange} className={`w-full p-2 border ${vitalsValidation.temperature ? 'border-red-500' : 'border-gray-200'} rounded-lg`} /><small className="text-xs text-gray-400">Normal: 36.1-37.2°C</small></div>
                    <div><label className="block text-sm font-medium mb-2">Blood Pressure (Systolic)</label><input type="number" name="blood_pressure_systolic" value={vitalsData.blood_pressure_systolic} onChange={handleVitalsChange} className={`w-full p-2 border ${vitalsValidation.blood_pressure_systolic ? 'border-red-500' : 'border-gray-200'} rounded-lg`} /></div>
                    <div><label className="block text-sm font-medium mb-2">Blood Pressure (Diastolic)</label><input type="number" name="blood_pressure_diastolic" value={vitalsData.blood_pressure_diastolic} onChange={handleVitalsChange} className={`w-full p-2 border ${vitalsValidation.blood_pressure_diastolic ? 'border-red-500' : 'border-gray-200'} rounded-lg`} /></div>
                    <div><label className="block text-sm font-medium mb-2">Heart Rate (bpm)</label><input type="number" name="heart_rate" value={vitalsData.heart_rate} onChange={handleVitalsChange} className={`w-full p-2 border ${vitalsValidation.heart_rate ? 'border-red-500' : 'border-gray-200'} rounded-lg`} /><small className="text-xs text-gray-400">Normal: 60-100 bpm</small></div>
                    <div><label className="block text-sm font-medium mb-2">Respiratory Rate (/min)</label><input type="number" name="respiratory_rate" value={vitalsData.respiratory_rate} onChange={handleVitalsChange} className="w-full p-2 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">O2 Saturation (%)</label><input type="number" name="oxygen_saturation" value={vitalsData.oxygen_saturation} onChange={handleVitalsChange} className={`w-full p-2 border ${vitalsValidation.oxygen_saturation ? 'border-red-500' : 'border-gray-200'} rounded-lg`} /><small className="text-xs text-gray-400">Normal: ≥95%</small></div>
                    <div><label className="block text-sm font-medium mb-2">Pain Level (0-10)</label><input type="number" name="pain_level" value={vitalsData.pain_level} onChange={handleVitalsChange} className="w-full p-2 border border-gray-200 rounded-lg" min="0" max="10" /></div>
                    <div><label className="block text-sm font-medium mb-2">Weight (kg)</label><input type="number" step="0.1" name="weight" value={vitalsData.weight} onChange={handleVitalsChange} className="w-full p-2 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">Height (cm)</label><input type="number" step="0.1" name="height" value={vitalsData.height} onChange={handleVitalsChange} className="w-full p-2 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">Blood Glucose (mg/dL)</label><input type="number" name="blood_glucose" value={vitalsData.blood_glucose} onChange={handleVitalsChange} className="w-full p-2 border border-gray-200 rounded-lg" /></div>
                    <div className="col-span-2"><label className="block text-sm font-medium mb-2">Chief Complaint / Notes</label><textarea name="chief_complaint" value={vitalsData.chief_complaint} onChange={handleVitalsChange} rows="2" className="w-full p-2 border border-gray-200 rounded-lg" /></div>
                  </div>
                  <div className="flex justify-end"><button onClick={saveVitals} disabled={loading} className="py-3 px-8 text-white rounded-full font-semibold bg-gradient-to-r from-blue-600 to-indigo-600">{loading ? <FaSpinner className="animate-spin" /> : 'Save Vitals'}</button></div>
                </div>
              )}

              {/* Medications Tab */}
              {activeTab === 'medications' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Medication Administration</h3>
                  <div className="bg-gray-50 p-5 rounded-xl mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><label className="text-xs font-medium">Medication Name *</label><input type="text" value={newMedicationAdmin.medication_name} onChange={(e) => setNewMedicationAdmin({...newMedicationAdmin, medication_name: e.target.value})} className="w-full p-2 border rounded-md" /></div>
                      <div><label className="text-xs font-medium">Dosage *</label><input type="text" value={newMedicationAdmin.dosage} onChange={(e) => setNewMedicationAdmin({...newMedicationAdmin, dosage: e.target.value})} placeholder="e.g., 500mg" className="w-full p-2 border rounded-md" /></div>
                      <div><label className="text-xs font-medium">Route</label><select value={newMedicationAdmin.route} onChange={(e) => setNewMedicationAdmin({...newMedicationAdmin, route: e.target.value})} className="w-full p-2 border rounded-md"><option value="oral">Oral</option><option value="IV">IV</option><option value="IM">IM</option><option value="topical">Topical</option></select></div>
                      <div><label className="text-xs font-medium">Time *</label><input type="time" value={newMedicationAdmin.time_administered} onChange={(e) => setNewMedicationAdmin({...newMedicationAdmin, time_administered: e.target.value})} className="w-full p-2 border rounded-md" /></div>
                      <div className="col-span-4"><label className="text-xs font-medium">Notes</label><input type="text" value={newMedicationAdmin.notes} onChange={(e) => setNewMedicationAdmin({...newMedicationAdmin, notes: e.target.value})} className="w-full p-2 border rounded-md" /></div>
                    </div>
                    <button onClick={addMedicationAdministration} className="mt-4 py-2 px-5 bg-blue-600 text-white rounded-full text-sm">+ Add Medication</button>
                  </div>
                  {medicationAdministration.length > 0 && (
                    <div><h4 className="font-semibold mb-3">Administered Medications</h4><div className="grid gap-2">{medicationAdministration.map(med => (<div key={med.id} className="border rounded-lg p-3 bg-white"><p className="font-semibold m-0">{med.medication_name} {med.dosage}</p><p className="text-xs text-gray-500 m-0">{med.route} • Administered at: {med.time_administered}</p></div>))}</div></div>
                  )}
                </div>
              )}

              {/* Care Tasks Tab */}
              {activeTab === 'care_tasks' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Patient Care Tasks</h3>
                  <div className="bg-gray-50 p-5 rounded-xl mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><label className="text-xs font-medium">Task Type *</label><select value={newCareTask.task_type} onChange={(e) => setNewCareTask({...newCareTask, task_type: e.target.value})} className="w-full p-2 border rounded-md"><option value="bathing">🛁 Bathing</option><option value="feeding">🍽️ Feeding</option><option value="wound_care">🩹 Wound Care</option><option value="mobility">🚶 Mobility Assistance</option><option value="monitoring">📊 Monitoring</option><option value="education">📚 Patient Education</option></select></div>
                      <div><label className="text-xs font-medium">Priority</label><select value={newCareTask.priority} onChange={(e) => setNewCareTask({...newCareTask, priority: e.target.value})} className="w-full p-2 border rounded-md"><option value="routine">Routine</option><option value="urgent">Urgent</option></select></div>
                      <div><label className="text-xs font-medium">Scheduled Time</label><input type="time" value={newCareTask.scheduled_time} onChange={(e) => setNewCareTask({...newCareTask, scheduled_time: e.target.value})} className="w-full p-2 border rounded-md" /></div>
                      <div className="col-span-4"><label className="text-xs font-medium">Notes</label><input type="text" value={newCareTask.notes} onChange={(e) => setNewCareTask({...newCareTask, notes: e.target.value})} className="w-full p-2 border rounded-md" /></div>
                    </div>
                    <button onClick={addCareTask} className="mt-4 py-2 px-5 bg-blue-600 text-white rounded-full text-sm">+ Add Task</button>
                  </div>
                  {patientCareTasks.length > 0 && (
                    <div><h4 className="font-semibold mb-3">Care Tasks</h4><div className="grid gap-2">{patientCareTasks.map(task => (<div key={task.id} className={`border rounded-lg p-3 flex justify-between items-center ${task.status === 'completed' ? 'bg-green-50' : 'bg-white'}`}><div><p className="font-semibold m-0">{getTaskTypeIcon(task.task_type)} {task.task_type}</p><p className="text-xs text-gray-500">{task.notes}</p></div>{task.status !== 'completed' && <button onClick={() => completeCareTask(task.id)} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm">Complete</button>}</div>))}</div></div>
                  )}
                </div>
              )}

              {/* Nursing Notes Tab */}
              {activeTab === 'notes' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Nursing Notes</h3>
                  <textarea value={nursingNotes} onChange={(e) => setNursingNotes(e.target.value)} rows="8" placeholder="Enter nursing observations, patient progress, concerns, etc..." className="w-full p-4 border border-gray-200 rounded-xl resize-none" />
                  <div className="flex justify-end mt-4"><button onClick={saveNursingNotes} disabled={loading} className="py-3 px-8 bg-blue-600 text-white rounded-full font-semibold">{loading ? <FaSpinner className="animate-spin" /> : 'Save Notes'}</button></div>
                </div>
              )}

              {/* Vitals History Tab */}
              {activeTab === 'history' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Vital Signs History</h3>
                  {vitalsHistory.length === 0 ? <p className="text-center text-gray-400 py-8">No vital signs recorded yet</p> : <div className="space-y-3">{vitalsHistory.map((record, idx) => (<div key={idx} className="border rounded-lg p-4 bg-gray-50"><div className="flex justify-between mb-2"><span className="font-semibold">{new Date(record.recorded_at).toLocaleString()}</span><span className="text-sm text-gray-500">Recorded by: {record.recorded_by}</span></div><div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm"><div><span className="text-gray-500">Temp:</span> {record.temperature || 'N/A'}°C</div><div><span className="text-gray-500">BP:</span> {record.blood_pressure || 'N/A'}</div><div><span className="text-gray-500">HR:</span> {record.heart_rate || 'N/A'}</div><div><span className="text-gray-500">O2:</span> {record.oxygen_saturation || 'N/A'}%</div><div><span className="text-gray-500">Pain:</span> {record.pain_level || 'N/A'}/10</div><div><span className="text-gray-500">RR:</span> {record.respiratory_rate || 'N/A'}</div></div></div>))}</div>}
                </div>
              )}

              <div className="mt-8 flex justify-end gap-3 border-t-2 pt-5">
                <button onClick={() => setShowPatientModal(false)} className="py-2.5 px-6 bg-gray-100 text-gray-600 rounded-full">Close</button>
                <button onClick={completePatientCare} disabled={loading} className="py-2.5 px-6 bg-emerald-600 text-white rounded-full font-semibold">{loading ? <FaSpinner className="animate-spin" /> : 'Complete Care & Handover'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Image Viewer Modal */}
        {showImageModal && selectedImage && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9999]" onClick={() => setShowImageModal(false)}>
            <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowImageModal(false)} className="absolute -top-12 right-0 text-white text-3xl">×</button>
              <img src={selectedImage.url} alt="Medical Image" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NurseDashboard;