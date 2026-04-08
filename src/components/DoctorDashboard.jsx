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
import { FaSpinner, FaCheck } from 'react-icons/fa';

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

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});
  const [diagnosisValidation, setDiagnosisValidation] = useState({});
  const [prescriptionValidation, setPrescriptionValidation] = useState({});
  const [labValidation, setLabValidation] = useState({});
  const [radiologyValidation, setRadiologyValidation] = useState({});
  const [dischargeValidation, setDischargeValidation] = useState({});

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

  // ==================== VALIDATION FUNCTIONS ====================
  
  // Diagnosis validation
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
  
  // Medication validation
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
  
  // Lab request validation
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
  
  // Radiology request validation
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
  
  // Discharge validation
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
  
  // Admission validation
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
  
  // Referral validation
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
      primaryColor: '#10b981',
      secondaryColor: '#34d399',
      accentColor: '#059669',
      bgGradient: 'from-emerald-500 to-green-400',
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
      bgGradient: 'from-red-500 to-red-400',
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
      bgGradient: 'from-violet-500 to-violet-400',
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

  // All internal wards for referral - ONLY THREE WARDS (matches Bed model)
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
        `${API_URL}/api/doctor/queue`,
        { 
          params: {
            hospital_id: user?.hospital_id,
            ward: user?.ward,
            status: 'discharged',
            limit: 50
          },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );
      
      if (res.data.success) {
        const discharged = (res.data.queue || []).filter(p => p.status === 'discharged');
        
        const formattedPatients = discharged.map(patient => ({
          id: patient.id,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          card_number: patient.card_number,
          diagnosis: patient.diagnosis?.primary || 'Not recorded',
          doctor_name: patient.doctor_name || 'Unknown',
          discharge_date: patient.updatedAt,
          discharge_location: patient.discharge_location || 'Home',
          discharge_notes: patient.discharge_notes || '',
          status: patient.status,
          pharmacy_status: patient.pharmacy_status || { pending_count: 0, all_dispensed: true },
          prescriptions: patient.prescriptions || []
        }));
        
        setDischargedPatients(formattedPatients);
      }
    } catch (error) {
      console.error('Error fetching discharged patients:', error);
      try {
        const statsRes = await axios.get(
          `${API_URL}/api/doctor/stats`,
          { 
            params: {
              hospital_id: user?.hospital_id,
              ward: user?.ward,
              doctor_id: user?.id
            },
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        console.log('Stats:', statsRes.data);
      } catch (statsError) {
        console.error('Error fetching stats:', statsError);
      }
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
        console.log('🔄 Refreshing lab results for current patient');
        fetchLabResults(data.patient_id);
        
        if (activeTab === 'results') {
          setTimeout(() => {
            console.log('🔄 Auto-refreshing results tab');
            fetchLabResults(data.patient_id);
          }, 1000);
        }
      } else {
        setQueuePatients(prev => prev.map(p => 
          p.id === data.patient_id 
            ? { ...p, has_new_results: true } 
            : p
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
      
      setNotification({
        type: 'error',
        message: message
      });
      
      if (selectedPatient?.id === data.patient_id) {
        fetchLabResults(data.patient_id);
      }
      
      setTimeout(() => setNotification(null), 10000);
    });

    socket.current.on('radiology_report_ready', (data) => {
      console.log('📷 Radiology report ready event received:', data);
      console.log('📊 Current selected patient:', selectedPatient);
      console.log('🏥 Patient ID in event:', data.patient_id);
      
      setNotification({
        type: data.critical ? 'error' : 'success',
        message: `${data.critical ? '⚠️ CRITICAL: ' : '📷 '}Radiology report ready for ${data.patient_name} (${data.exam_type})`
      });
      
      if (selectedPatient && selectedPatient.id === data.patient_id) {
        console.log('🔄 Refreshing radiology results for current patient');
        fetchRadiologyResults(data.patient_id);
        
        if (activeTab === 'results') {
          setTimeout(() => {
            fetchRadiologyResults(data.patient_id);
          }, 500);
        }
      } else {
        setQueuePatients(prev => prev.map(p => 
          p.id === data.patient_id 
            ? { ...p, has_new_results: true, has_new_radiology: true } 
            : p
        ));
      }
      
      fetchStats();
      setTimeout(() => setNotification(null), 8000);
    });

    socket.current.on('direct_radiology_report', (data) => {
      console.log('📷 Direct radiology report received:', data);
      
      if (data.doctor_id === user?.id) {
        setNotification({
          type: data.critical ? 'error' : 'success',
          message: `${data.critical ? '⚠️ CRITICAL: ' : '📷 '}Radiology report ready for ${data.patient_name}`
        });
        
        if (selectedPatient && selectedPatient.id === data.patient_id) {
          fetchRadiologyResults(data.patient_id);
        } else {
          setQueuePatients(prev => prev.map(p => 
            p.id === data.patient_id 
              ? { ...p, has_new_results: true, has_new_radiology: true } 
              : p
          ));
        }
        
        setTimeout(() => setNotification(null), 8000);
      }
    });

    socket.current.on('radiology_broadcast', (data) => {
      console.log('📢 Radiology broadcast received:', data);
      
      if (data.type === 'report_completed' && data.hospital_id === user?.hospital_id) {
        setNotification({
          type: 'info',
          message: `📷 New radiology report available for patient`
        });
        fetchStats();
        setTimeout(() => setNotification(null), 5000);
      }
    });

    socket.current.on('prescription_status_update', (data) => {
      console.log('💊 Prescription status updated:', data);
      
      if (data.patient_id === selectedPatient?.id) {
        setPrescriptions(prev => 
          prev.map(p => 
            p.id === data.prescription_id 
              ? { ...p, status: data.status, pharmacy_notes: data.notes, updated_at: data.updated_at }
              : p
          )
        );
        
        setNotification({
          type: 'info',
          message: `💊 Prescription ${data.status}: ${data.medication_name}`
        });
        setTimeout(() => setNotification(null), 5000);
        
        if (data.status === 'dispensed') {
          const allDispensed = prescriptions.every(p => p.status === 'dispensed');
          if (allDispensed) {
            setStats(prev => ({ ...prev, pendingPharmacy: Math.max(0, prev.pendingPharmacy - 1) }));
          }
        }
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

    const interval = setInterval(() => {
      fetchQueue();
      fetchStats();
      if (showDischargeList) {
        fetchDischargedPatients();
      }
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
      
      if (!token) {
        console.error('No token found');
        return;
      }

      if (!user?.hospital_id || !user?.ward) {
        console.log('Waiting for user data...');
        return;
      }

      console.log(`Fetching queue for ${user.ward} ward, hospital ${user.hospital_id}...`);
      
      const res = await axios.get(
        `${API_URL}/api/doctor/queue`,
        { 
          params: {
            ward: user.ward,
            hospital_id: user.hospital_id,
            doctor_id: user.id,
            status: currentWard.statusFilter
          },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );
      
      if (res.data.success) {
        console.log(`Queue received: ${res.data.queue?.length || 0} patients`);
        
        const processedQueue = (res.data.queue || []).map(patient => ({
          ...patient,
          has_new_results: patient.has_new_results || false
        }));
        
        setQueuePatients(processedQueue);
        setStats(prev => ({ ...prev, waiting: processedQueue.length }));
      } else {
        console.log('No patients in queue');
        setQueuePatients([]);
        setStats(prev => ({ ...prev, waiting: 0 }));
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
      
      if (error.response?.status === 401) {
        setMessage({ type: 'error', text: 'Session expired. Please login again.' });
        setTimeout(() => onLogout(), 2000);
      } else if (error.code === 'ECONNABORTED') {
        setMessage({ type: 'error', text: 'Request timeout - server not responding' });
      } else {
        setMessage({ type: 'error', text: 'Cannot connect to server' });
      }
      
      setQueuePatients([]);
      setStats(prev => ({ ...prev, waiting: 0 }));
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };
const fetchRadiologyResults = async (patientId) => {
  try {
    const token = localStorage.getItem('token');
    console.log(`📷 Fetching radiology results for patient: ${patientId}`);
    
    const res = await axios.get(
      `${API_URL}/api/doctor/radiology-results/${patientId}`,
      { 
        params: {
          doctor_id: user?.id,
          hospital_id: user?.hospital_id
        },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      }
    );
    
    console.log('📷 Radiology results API response:', res.data);
    
    if (res.data.success) {
      let results = [];
      
      if (res.data.results) {
        results = res.data.results;
      } else if (Array.isArray(res.data)) {
        results = res.data;
      } else if (res.data.radiology_reports) {
        results = res.data.radiology_reports;
      }
      
      // Process images - B2 URLs are already full URLs
      // No modification needed, just log them
      results.forEach(result => {
        if (result.images && result.images.length > 0) {
          console.log(`📸 Result ${result.id} has ${result.images.length} B2 images`);
          result.images.forEach((img, idx) => {
            console.log(`  Image ${idx + 1}: ${img.url}`);
          });
        }
      });
      
      console.log('📷 Setting radiology results:', results);
      setRadiologyResults(results || []);
      
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const newCriticalResults = (results || []).filter(r => 
        r.critical && new Date(r.reported_at) > oneMinuteAgo
      );
      
      if (newCriticalResults.length > 0) {
        setNotification({
          type: 'error',
          message: `⚠️ CRITICAL: New critical radiology finding for ${selectedPatient?.first_name || 'patient'}`
        });
        setTimeout(() => setNotification(null), 10000);
      }
    } else {
      console.log('📷 No radiology results found');
      setRadiologyResults([]);
    }
  } catch (error) {
    console.error('❌ Error fetching radiology results:', error);
    setRadiologyResults([]);
  }
};
  const fetchLabResults = async (patientId) => {
    try {
      const token = localStorage.getItem('token');
      console.log(`📊 Fetching lab results for patient: ${patientId}`, { 
        doctor_id: user?.id, 
        hospital_id: user?.hospital_id 
      });
      
      const res = await axios.get(
        `${API_URL}/api/doctor/lab-results/${patientId}`,
        { 
          params: {
            doctor_id: user?.id,
            hospital_id: user?.hospital_id
          },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );
      
      console.log('📊 Lab results API response:', res.data);
      
      if (res.data.success) {
        let results = [];
        
        if (res.data.results) {
          results = res.data.results;
        } else if (res.data.completed) {
          results = res.data.completed;
        } else if (Array.isArray(res.data)) {
          results = res.data;
        }
        
        console.log('📊 Setting lab results:', results);
        setLabResults(results);
        
        if (res.data.summary) {
          setStats(prev => ({
            ...prev,
            pendingLabs: res.data.summary.pending_count,
            completedLabs: res.data.summary.completed_count
          }));
        }
      } else {
        console.log('📊 No lab results found');
        setLabResults([]);
      }
    } catch (error) {
      console.error('❌ Error fetching lab results:', error);
      setLabResults([]);
    }
  };
  
  const fetchAvailableBeds = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_URL}/api/doctor/available-beds`,
        { 
          params: {
            ward: user?.ward,
            hospital_id: user?.hospital_id
          },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );
      
      if (res.data.success) {
        console.log(`✅ Found ${res.data.beds.length} available beds`);
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
          doctor_name: user?.full_name,
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
        
        if (res.data.patient.prescriptions) {
          setPrescriptions(res.data.patient.prescriptions);
        }
        
        if (res.data.patient.diagnosis) {
          setDiagnosis(res.data.patient.diagnosis);
        }

        setMessage({ type: 'success', text: 'Patient assigned successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error taking patient:', error);
      
      if (error.response?.status === 404) {
        setMessage({ type: 'error', text: 'Patient not found' });
      } else if (error.response?.status === 401) {
        setMessage({ type: 'error', text: 'Session expired' });
      } else {
        setMessage({ type: 'error', text: 'Error taking patient' });
      }
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== DIAGNOSIS ====================
  const handleDiagnosisChange = (e) => {
    const { name, value } = e.target;
    setDiagnosis({
      ...diagnosis,
      [name]: value
    });
    // Clear validation error for this field
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
        {
          patient_id: selectedPatient.id,
          diagnosis: diagnosis,
          doctor_id: user?.id,
          hospital_id: user?.hospital_id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Diagnosis saved' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        
        setSelectedPatient(prev => ({
          ...prev,
          diagnosis: diagnosis
        }));
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
    setNewMedication({
      ...newMedication,
      [name]: value
    });
    // Clear validation for this field
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
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      route: 'oral',
      notes: '',
      quantity: 1,
      unit: 'tablet'
    });
    setPrescriptionValidation({});
  };

  const removeMedication = (id) => {
    setPrescriptions(prescriptions.filter(p => p.id !== id));
  };

  // In DoctorDashboard.jsx - Complete savePrescriptions function
  const savePrescriptions = async () => {
    if (prescriptions.length === 0) {
      setMessage({ type: 'error', text: 'No prescriptions to save' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Format prescriptions as items array for pharmacy
      const items = prescriptions.map(p => ({
        name: p.name,
        dosage: p.dosage,
        quantity: p.quantity || 1,
        unit: p.unit || (p.route === 'oral' ? 'tablet' : 'ml'),
        frequency: p.frequency || 'as directed',
        duration: p.duration || 'as prescribed',
        route: p.route || 'oral',
        notes: p.notes || ''
      }));
      
      console.log('📋 Sending prescription to backend:', {
        patient_id: selectedPatient.id,
        patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
        items: items,
        doctor_id: user?.id,
        doctor_name: user?.full_name,
        ward: user?.ward,
        hospital_id: user?.hospital_id
      });
      
      const res = await axios.post(
        `${API_URL}/api/doctor/save-prescriptions`,
        {
          patient_id: selectedPatient.id,
          patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
          prescriptions: items,
          doctor_id: user?.id,
          doctor_name: user?.full_name,
          ward: user?.ward,
          hospital_id: user?.hospital_id,
          priority: 'routine',
          notes: diagnosis.notes || ''
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setMessage({ type: 'success', text: `${prescriptions.length} prescription(s) sent to pharmacy successfully!` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        
        // Clear prescriptions after sending
        setPrescriptions([]);
        
        // Emit socket event for pharmacy - THIS IS CRITICAL
        if (socket.current && socket.current.connected) {
          const pharmacyData = {
            prescription_id: res.data.prescription?.id,
            prescription_number: res.data.prescription?.prescription_number,
            patient_id: selectedPatient.id,
            patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
            doctor_id: user?.id,
            doctor_name: user?.full_name,
            ward: user?.ward,
            hospital_id: user?.hospital_id,
            priority: 'routine',
            items_count: prescriptions.length,
            items: items,
            notes: diagnosis.notes || '',
            prescribed_at: new Date().toISOString(),
            status: 'pending'
          };
          
          console.log('📡 Emitting new_prescriptions event to pharmacy:', pharmacyData);
          socket.current.emit('new_prescriptions', pharmacyData);
          
          // Also emit to pharmacy room directly
          socket.current.emit('to_pharmacy', pharmacyData);
        } else {
          console.warn('⚠️ Socket not connected, prescription saved but real-time notification not sent');
        }
      }
    } catch (error) {
      console.error('❌ Error saving prescriptions:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error saving prescriptions' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };
  
  // ==================== LAB REQUESTS ====================
  const handleLabRequestChange = (e) => {
    const { name, value } = e.target;
    setNewLabRequest({
      ...newLabRequest,
      [name]: value
    });
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
          doctor_name: user?.full_name,
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
            doctor_name: user?.full_name,
            ward: user?.ward,
            hospital_id: user?.hospital_id
          });
        }

        setStats(prev => ({
          ...prev,
          pendingLabs: prev.pendingLabs + 1
        }));

        setNewLabRequest({
          testType: 'blood',
          testName: '',
          priority: 'routine',
          notes: ''
        });
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
    setNewRadiologyRequest({
      ...newRadiologyRequest,
      [name]: value
    });
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
          doctor_name: user?.full_name,
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
            doctor_name: user?.full_name,
            ward: user?.ward,
            hospital_id: user?.hospital_id
          });
        }

        setStats(prev => ({
          ...prev,
          pendingRadiology: prev.pendingRadiology + 1
        }));

        setNewRadiologyRequest({
          examType: 'X-ray',
          bodyPart: '',
          priority: 'routine',
          notes: ''
        });
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
        `⚠️ ${pendingPrescriptions.length} prescription(s) not yet dispensed by pharmacy.\n\n` +
        `Dispensed: ${prescriptions.filter(p => p.status === 'dispensed').length}\n` +
        `Pending Pharmacy: ${pendingPrescriptions.length}\n\n` +
        `Are you sure you want to discharge to ${dischargeLocation}? (Emergency Override)`
      );
      
      if (!confirmDischarge) {
        return;
      }
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
          doctor_name: user?.full_name,
          hospital_id: user?.hospital_id,
          ward: user?.ward,
          diagnosis: diagnosis,
          prescriptions: prescriptions,
          lab_requests: labRequests,
          lab_results: labResults,
          radiology_requests: radiologyRequests,
          radiology_results: radiologyResults,
          discharge_type: 'discharge',
          discharge_location: dischargeLocation,
          signature: signature,
          discharge_notes: diagnosis.notes,
          pharmacy_status: {
            all_dispensed: pendingPrescriptions.length === 0,
            pending_count: pendingPrescriptions.length,
            emergency_override: pendingPrescriptions.length > 0
          }
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
            doctor_name: user?.full_name,
            ward: user?.ward,
            hospital_id: user?.hospital_id,
            discharge_type: 'discharge',
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
          doctor_name: user?.full_name,
          hospital_id: user?.hospital_id,
          ward: user?.ward,
          bed_id: bedId,
          diagnosis: diagnosis,
          prescriptions: prescriptions,
          lab_requests: labRequests,
          lab_results: labResults,
          radiology_requests: radiologyRequests,
          radiology_results: radiologyResults,
          signature: signature,
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
            doctor_name: user?.full_name,
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
          doctor_name: user?.full_name,
          hospital_id: user?.hospital_id,
          ward: user?.ward,
          referral_type: 'internal',
          destination: selectedInternalWard,
          bed_id: referralSelectedBed || null,
          diagnosis: diagnosis,
          prescriptions: prescriptions,
          lab_requests: labRequests,
          lab_results: labResults,
          radiology_requests: radiologyRequests,
          radiology_results: radiologyResults,
          signature: signature,
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
            doctor_name: user?.full_name,
            referral_type: 'internal',
            destination: selectedInternalWard,
            bed_id: referralSelectedBed,
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
          doctor_name: user?.full_name,
          hospital_id: user?.hospital_id,
          ward: user?.ward,
          referral_type: 'external',
          destination: externalReferralData.hospital.name,
          external_data: externalReferralData,
          diagnosis: diagnosis,
          prescriptions: prescriptions,
          lab_requests: labRequests,
          lab_results: labResults,
          radiology_requests: radiologyRequests,
          radiology_results: radiologyResults,
          signature: signature,
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
            doctor_name: user?.full_name,
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
      if (systolic > thresholds.bpSystolic.max || systolic < thresholds.bpSystolic.min) {
        return true;
      }
    }
    if (vital === 'temperature' && value) {
      if (value > thresholds.temperature.max || value < thresholds.temperature.min) {
        return true;
      }
    }
    if (vital === 'heartRate' && value) {
      if (value > thresholds.heartRate.max || value < thresholds.heartRate.min) {
        return true;
      }
    }
    if (vital === 'o2' && value) {
      if (value < thresholds.o2Saturation.min) {
        return true;
      }
    }
    return false;
  };

  const getRequestStatus = (item) => {
    if (!item) return 'pending';
    if (item.status === 'completed' || item.status === 'reported') return 'completed';
    if (item.status === 'in_progress') return 'in_progress';
    return 'pending';
  };

  const labTests = {
    blood: [
      'CBC (Complete Blood Count)',
      'Blood Chemistry',
      'Blood Gas',
      'Troponin',
      'PT/INR',
      'Blood Culture',
      'Malaria Test',
      'Typhoid Test',
      'Blood Sugar',
      'Liver Function Test',
      'Kidney Function Test'
    ],
    urine: [
      'Urinalysis',
      'Urine Culture',
      'Urine Pregnancy Test',
      'Urine Toxicology',
      'Urine Microscopy'
    ],
    stool: [
      'Stool Culture',
      'Stool Ova & Parasites',
      'Stool Occult Blood',
      'Stool Antigen',
      'Stool Microscopy'
    ]
  };

  const handleLogout = () => {
    if (socket.current) {
      socket.current.disconnect();
    }
    if (onLogout) onLogout();
    navigate('/login');
  };

  // ==================== DEBUG BUTTONS ====================
  const DebugButtons = () => (
    <div className="fixed bottom-5 right-5 z-[9999] flex gap-2">
      <button 
        onClick={async () => {
          try {
            const res = await fetch(`${API_URL}/api/test/socket-status`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            const data = await res.json();
            console.log('📊 Socket Status:', data);
            alert(`Connected clients: ${data.connectedClients}\nRooms: ${JSON.stringify(data.rooms, null, 2)}`);
          } catch (err) {
            console.error('Error checking socket status:', err);
            alert('Error checking socket status');
          }
        }}
        className="px-5 py-2 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
      >
        🔌 Check Socket
      </button>
      
      <button 
        onClick={async () => {
          try {
            const res = await fetch(`${API_URL}/api/test/triage-send-to-opd`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                hospitalId: user?.hospital_id || 1,
                patientName: 'Test Patient',
                ward: user?.ward || 'OPD'
              })
            });
            const data = await res.json();
            console.log('📨 Test emit result:', data);
            alert(`Test event sent! Listeners in room: ${data.listeners}`);
          } catch (err) {
            console.error('Error sending test event:', err);
            alert('Error sending test event');
          }
        }}
        className="px-5 py-2 bg-amber-500 text-white border-none rounded cursor-pointer font-bold hover:bg-amber-600 transition-colors"
      >
        🧪 Test Triage Send
      </button>

      <button 
        onClick={() => {
          if (socket.current) {
            socket.current.emit('get_rooms');
            alert('Requested room info - check console');
          }
        }}
        className="px-5 py-2 bg-green-500 text-white border-none rounded cursor-pointer font-bold hover:bg-green-600 transition-colors"
      >
        📍 Get Rooms
      </button>
    </div>
  );

  // ==================== RENDER ====================
  return (
    <div className="font-sans bg-gray-50 min-h-screen flex">
      <ConnectionStatusBanner />
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-pulse-custom { animation: pulse 2s infinite; }
        .animate-fade-in { animation: fadeIn 0.5s ease; }
        .animate-slide-in { animation: slideIn 0.3s ease; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ==================== SIDEBAR ==================== */}
      <div className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-slate-800 text-white transition-all duration-300 flex flex-col h-screen sticky top-0 shadow-xl`}>
        {/* Sidebar Header */}
        <div className={`${sidebarCollapsed ? 'py-5 px-0' : 'p-6'} border-b border-slate-700 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentWard.sidebarIcon}</span>
              <div>
                <h3 className="m-0 text-lg font-semibold">{user?.ward} Ward</h3>
                <p className="mt-1 text-xs text-slate-400">Dr. {user?.full_name}</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <span className="text-3xl">{currentWard.sidebarIcon}</span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="bg-none border-none text-slate-400 cursor-pointer text-xl p-1 flex items-center justify-center hover:text-white transition-colors"
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Doctor Info */}
        {!sidebarCollapsed && (
          <div className="p-4 bg-slate-900 m-4 rounded-xl">
            <p className="text-xs text-slate-400 m-0 mb-2">Hospital</p>
            <p className="text-sm font-medium m-0 mb-1">{user?.hospital_name}</p>
            <p className="text-xs" style={{ color: currentWard.primaryColor }}>
              ID: {user?.hospital_id} • {user?.ward}
            </p>
          </div>
        )}

        {/* Navigation Menu */}
        <div className={`flex-1 ${sidebarCollapsed ? 'py-4 px-0' : 'p-4'}`}>
          <div className="mb-6">
            {!sidebarCollapsed && (
              <p className="text-xs text-slate-600 mx-5 mb-2 uppercase tracking-wider">
                Main Menu
              </p>
            )}
            
            {/* Queue Menu Item */}
            <div className={`${sidebarCollapsed ? 'py-3 px-0' : 'py-3 px-5'} mx-2 rounded-lg bg-white/10 flex items-center gap-3 cursor-pointer`}>
              <span className="text-xl">👥</span>
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-sm">Patient Queue</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs`} style={{ backgroundColor: currentWard.primaryColor }}>
                    {queuePatients.length}
                  </span>
                </>
              )}
            </div>

            {/* Discharge List Menu Item */}
            <div
              onClick={() => {
                setShowDischargeList(!showDischargeList);
                if (!showDischargeList) {
                  fetchDischargedPatients();
                }
              }}
              className={`${sidebarCollapsed ? 'py-3 px-0' : 'py-3 px-5'} mx-2 mt-2 rounded-lg ${showDischargeList ? 'bg-white/15' : 'bg-transparent'} flex items-center gap-3 cursor-pointer transition-all hover:bg-white/10`}
            >
              <span className="text-xl">📋</span>
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-sm">Discharge List</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500">
                    {stats.completed}
                  </span>
                </>
              )}
            </div>

            {/* Stats for collapsed sidebar */}
            {sidebarCollapsed && (
              <div className="text-center mt-4">
                <div className="text-base font-semibold" style={{ color: currentWard.primaryColor }}>
                  {queuePatients.length}
                </div>
                <div className="text-[10px] text-slate-400">Queue</div>
              </div>
            )}
          </div>

          {/* Quick Stats in Sidebar */}
          {!sidebarCollapsed && (
            <div className="px-5">
              <p className="text-xs text-slate-600 m-0 mb-2 uppercase tracking-wider">
                Today's Stats
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900 p-2.5 rounded-lg">
                  <div className="text-base font-semibold text-green-500">{stats.completed}</div>
                  <div className="text-[10px] text-slate-400">Completed</div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg">
                  <div className="text-base font-semibold text-amber-500">{stats.pendingLabs}</div>
                  <div className="text-[10px] text-slate-400">Pending Labs</div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg">
                  <div className="text-base font-semibold text-violet-500">{stats.pendingRadiology}</div>
                  <div className="text-[10px] text-slate-400">Pending Rad</div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg">
                  <div className="text-base font-semibold text-blue-500">{stats.admitted}</div>
                  <div className="text-[10px] text-slate-400">Admitted</div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg col-span-2">
                  <div className="text-base font-semibold text-pink-500">{stats.pendingPharmacy || 0}</div>
                  <div className="text-[10px] text-slate-400">Pending Pharmacy</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div className={`${sidebarCollapsed ? 'py-4 px-0' : 'p-5'} border-t border-slate-700`}>
          <button
            onClick={handleLogout}
            className={`w-full ${sidebarCollapsed ? 'py-3 px-0' : 'py-3 px-5'} bg-transparent border border-slate-600 rounded-lg text-red-500 cursor-pointer flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 text-sm transition-all hover:bg-red-500/20`}
          >
            <span>🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className={`bg-gradient-to-r ${currentWard.bgGradient} py-5 px-8 shadow-lg`}>
          <div className="max-w-[1600px] mx-auto flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{currentWard.icon}</span>
                <div>
                  <h1 className="text-3xl font-bold text-white m-0 drop-shadow-md">
                    {currentWard.title}
                  </h1>
                  <p className="text-base text-white/90 mt-1 flex items-center gap-2">
                    <span>Dr. {user?.full_name || 'Doctor'}</span>
                    <span className="text-lg">•</span>
                    <span>{user?.hospital_name}</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {user?.ward} Ward
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-5">
              <div className="flex gap-4 bg-white/10 py-2 px-5 rounded-full">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{queuePatients.length}</div>
                  <div className="text-xs text-white/80">Waiting</div>
                </div>
                <div className="w-px h-7 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.completed}</div>
                  <div className="text-xs text-white/80">Completed</div>
                </div>
                <div className="w-px h-7 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.pendingLabs + stats.pendingRadiology}</div>
                  <div className="text-xs text-white/80">Pending</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className={`fixed top-24 right-8 z-[1000] max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-slide-in border-l-4 ${notification.type === 'info' ? 'border-blue-500' : notification.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
            <div className="p-4 flex items-center gap-3">
              <span className="text-2xl">
                {notification.type === 'info' ? 'ℹ️' : notification.type === 'error' ? '⚠️' : '✅'}
              </span>
              <div className="flex-1">
                <p className="m-0 text-sm text-gray-800">
                  {notification.message}
                </p>
              </div>
              <button 
                onClick={() => setNotification(null)}
                className="bg-none border-none text-lg cursor-pointer text-gray-500 hover:text-gray-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Message */}
        {message.text && (
          <div className={`fixed bottom-8 right-8 z-[1000] ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} py-3 px-6 rounded-lg shadow-md animate-slide-in`}>
            {message.text}
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-[1600px] mx-auto p-8">
          {/* Show either Queue or Discharge List */}
          {!showDischargeList ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-5 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 m-0 mb-2">Waiting in Queue</p>
                      <p className="text-4xl font-bold text-gray-900 m-0">
                        {queuePatients.length}
                      </p>
                    </div>
                    <div className={`w-14 h-14 rounded-xl bg-opacity-20 flex items-center justify-center`} style={{ backgroundColor: `${currentWard.primaryColor}20` }}>
                      <span className="text-3xl">👥</span>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-500">
                    {queuePatients.filter(p => p.triage_info?.priority === 'critical').length} Critical
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 m-0 mb-2">In Consultation</p>
                      <p className="text-4xl font-bold text-gray-900 m-0">
                        {selectedPatient ? 1 : 0}
                      </p>
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                      <span className="text-3xl">👨‍⚕️</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 m-0 mb-2">Completed Today</p>
                      <p className="text-4xl font-bold text-gray-900 m-0">
                        {stats.completed}
                      </p>
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                      <span className="text-3xl">✅</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 m-0 mb-2">Pending Results</p>
                      <p className="text-4xl font-bold text-gray-900 m-0">
                        {stats.pendingLabs + stats.pendingRadiology}
                      </p>
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                      <span className="text-3xl">🔬</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 m-0 mb-2">Pending Pharmacy</p>
                      <p className="text-4xl font-bold text-gray-900 m-0">
                        {stats.pendingPharmacy || 0}
                      </p>
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                      <span className="text-3xl">💊</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Queue */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-gray-900 m-0">
                      {currentWard.queueTitle}
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white`} style={{ backgroundColor: currentWard.primaryColor }}>
                      {queuePatients.length} waiting
                    </span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-sm text-gray-500">
                      Last updated: {new Date().toLocaleTimeString()}
                    </span>
                    <span className={`w-2 h-2 rounded-full inline-block ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse-custom' : 'bg-red-500'}`} />
                  </div>
                </div>
                
                {queuePatients.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <span className="text-5xl block mb-4">🛋️</span>
                    <p className="text-lg text-gray-500 mb-2">No patients waiting</p>
                    <p className="text-sm text-gray-400">
                      Patients from triage will appear here automatically
                    </p>
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
                          className={`${hasCritical ? 'border-2 border-red-500 bg-red-50' : 'border border-gray-200 bg-white'} rounded-xl p-5 flex justify-between items-center shadow-sm transition-all cursor-pointer animate-fade-in`}
                          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.boxShadow = hasCritical ? '0 4px 12px rgba(239,68,68,0.1)' : 'none'}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`font-mono text-sm px-2 py-1 rounded bg-opacity-10`} style={{ color: currentWard.primaryColor, backgroundColor: `${currentWard.primaryColor}10` }}>
                                {patient.card_number}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${priority.bg} ${priority.color}`}>
                                <span>{priority.icon}</span>
                                {priority.text}
                              </span>
                              {hasCritical && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                  ⚠️ CRITICAL VITALS
                                </span>
                              )}
                              {patient.has_new_results && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white flex items-center gap-1">
                                  <span>🔬</span>
                                  New Results
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 mb-2">
                              <h3 className="text-lg font-semibold m-0">
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
                                  <span className="font-semibold">
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
                            className={`py-3 px-7 text-white border-none rounded-full cursor-pointer text-base font-semibold transition-all shadow-md ml-5 whitespace-nowrap hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
                            style={{ backgroundColor: currentWard.primaryColor }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = currentWard.accentColor}
                            onMouseLeave={(e) => e.target.style.backgroundColor = currentWard.primaryColor}
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
          ) : (
            <DischargeList 
              hospitalId={user?.hospital_id}
              ward={user?.ward}
              dischargedPatients={dischargedPatients}
              onRefresh={fetchDischargedPatients}
            />
          )}
        </div>

        {/* Patient Consultation Modal */}
        {showPatientModal && selectedPatient && (
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
              {/* Radiology Results Section */}
{/* Radiology Results Section */}
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
                    // Get the image URL - handle different formats
                    let imageUrl = img.url || img;
                    
                    console.log(`📸 Image ${idx + 1} URL:`, imageUrl);
                    
                    // B2 URLs are already full URLs - use them directly
                    if (imageUrl && imageUrl.startsWith('http')) {
                      console.log(`✅ Using B2 URL directly: ${imageUrl.substring(0, 100)}...`);
                    } else if (imageUrl && !imageUrl.startsWith('http')) {
                      // Fallback for relative paths
                      imageUrl = `${API_URL}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
                      console.log(`🔄 Converted to: ${imageUrl}`);
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

        {/* ==================== IMAGE VIEWER MODAL ==================== */}
        {showImageModal && selectedImage && (
          <div 
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9999] backdrop-blur-sm"
            onClick={() => {
              setShowImageModal(false);
              setSelectedImage(null);
            }}
          >
            <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setSelectedImage(null);
                }}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 text-3xl z-10 transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                ×
              </button>
              
              {/* Image Container */}
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
              
              {/* Image Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white p-4 rounded-b-lg">
                <p className="text-sm font-medium">
                  {selectedImage.filename || 'Radiology Image'}
                </p>
                {selectedImage.uploaded_at && (
                  <p className="text-xs text-gray-300 mt-1">
                    📅 Uploaded: {new Date(selectedImage.uploaded_at).toLocaleString()}
                  </p>
                )}
                {selectedImage.url && (
                  <p className="text-xs text-gray-400 mt-1 truncate font-mono">
                    📁 Path: {selectedImage.url}
                  </p>
                )}
              </div>
              
              {/* Download Button */}
              <button
                onClick={() => {
                  const imageUrl = selectedImage.url;
                  const filename = selectedImage.filename || `radiology-image-${Date.now()}.jpg`;
                  console.log('💾 Downloading image:', { imageUrl, filename });
                  
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
                      console.log('✅ Image downloaded successfully');
                    })
                    .catch(error => {
                      console.error('❌ Error downloading image:', error);
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
              
              {/* Zoom Hint */}
              <div className="absolute bottom-20 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                Click outside to close
              </div>
            </div>
          </div>
        )}

        {/* Debug Buttons */}
        <DebugButtons />
      </div>
    </div>
  );
};

export default DoctorDashboard;