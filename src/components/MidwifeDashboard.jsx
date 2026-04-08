import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import SignaturePad from 'react-signature-canvas';
import BedSelection from './BedSelection';
import PharmacyStatus from './PharmacyStatus';
import DischargeList from './DischargeList';
import EthiopianHierarchySelector from './EthiopianHierarchySelector';
import { FaSpinner, FaBaby, FaStethoscope, FaCalendarAlt, FaHeartbeat, FaRuler, FaWeight, FaSyringe, FaNotesMedical, FaUserMd, FaPlus, FaEye, FaCheck, FaTimes, FaSync, FaSearch, FaFileAlt, FaBabyCarriage, FaPrescription, FaDiagnoses, FaHospitalUser, FaSignOutAlt, FaBed, FaArrowRight, FaArrowLeft, FaPrint, FaDownload, FaHistory } from 'react-icons/fa';

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
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [searchTerm, setSearchTerm] = useState('');
  
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

  // Refs
  const signaturePad = useRef(null);
  const socket = useRef(null);
  const navigate = useNavigate();

  // API Configuration
  const API_URL = 'http://localhost:5001';
  
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

  // Ward configuration for ANC
  const wardConfig = {
    'ANC': {
      title: 'Antenatal Care Dashboard',
      primaryColor: '#8b5cf6',
      secondaryColor: '#a78bfa',
      accentColor: '#7c3aed',
      bgGradient: 'from-violet-600 to-purple-500',
      queueTitle: 'Antenatal Patients',
      icon: '🤰',
      sidebarIcon: '👶',
      statusFilter: 'in_anc'
    }
  };

  const currentWard = wardConfig['ANC'];

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

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    if (!user?.hospital_id) return;

    initializeSocket();
    fetchPatients();
    fetchStats();
    fetchDischargedPatients();

    const interval = setInterval(() => {
      fetchPatients();
      fetchStats();
      if (showDischargeList) {
        fetchDischargedPatients();
      }
    }, 30000);

    return () => {
      if (socket.current) socket.current.disconnect();
      clearInterval(interval);
    };
  }, [user?.hospital_id, showDischargeList]);

  const initializeSocket = () => {
    const token = localStorage.getItem('token');
    
    socket.current = io(API_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    socket.current.on('connect', () => {
      console.log('✅ Midwife socket connected');
      setConnectionStatus('connected');
      socket.current.emit('join', `hospital_${user?.hospital_id}_ward_ANC`);
    });

    socket.current.on('connect_error', () => {
      setConnectionStatus('disconnected');
    });

    socket.current.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    // Listen for new ANC patients from triage
    socket.current.on('new_anc_patient', (data) => {
      console.log('🤰 New ANC patient:', data);
      setNotification({
        type: 'info',
        message: `🆕 New antenatal patient: ${data.patient_name}`
      });
      fetchPatients();
      fetchStats();
      setTimeout(() => setNotification(null), 5000);
    });

    // Listen for referred patients to ANC
    socket.current.on('patient_referred_to_anc', (data) => {
      console.log('📋 Patient referred to ANC:', data);
      setNotification({
        type: 'info',
        message: `📋 Patient referred to ANC: ${data.patient_name}`
      });
      fetchPatients();
      fetchStats();
      setTimeout(() => setNotification(null), 5000);
    });

    // Listen for lab results
    socket.current.on('lab_result_ready', (data) => {
      console.log('📋 Lab results ready:', data);
      setNotification({
        type: 'success',
        message: `🔬 New lab results for ${data.patient_name}`
      });
      if (selectedPatient?.id === data.patient_id) {
        fetchLabResults(data.patient_id);
      }
      setTimeout(() => setNotification(null), 5000);
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
      setNotification({
        type: 'info',
        message: `💊 Prescription ${data.status}: ${data.medication_name}`
      });
      setTimeout(() => setNotification(null), 5000);
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
        
        // Filter by categories
        setHighRiskPatients(patientsList.filter(p => p.antenatal_data?.high_risk));
        setPostnatalPatients(patientsList.filter(p => p.status === 'postnatal'));
        
        // Count due this week
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
      console.error('Error fetching lab results:', error);
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
      console.error('Error fetching discharged patients:', error);
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
        
        // Load patient's antenatal data
        if (res.data.patient.antenatal_data) {
          setAntenatalData(res.data.patient.antenatal_data);
        }
        
        // Load vital signs if exist
        if (res.data.patient.vitals) {
          setVitalSigns(res.data.patient.vitals);
        }
        
        // Load diagnosis if exist
        if (res.data.patient.diagnosis) {
          setDiagnosis(res.data.patient.diagnosis);
        }
        
        // Load prescriptions if exist
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
      setMessage({ type: 'error', text: 'Error assigning patient' });
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
      setMessage({ type: 'error', text: 'Error saving diagnosis' });
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
      setMessage({ type: 'error', text: 'Error saving prescriptions' });
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
        setStats(prev => ({ ...prev, pendingLabs: prev.pendingLabs + 1 }));
        
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

  const calculateEDD = (lmp) => {
    if (!lmp) return '';
    const lmpDate = new Date(lmp);
    const eddDate = new Date(lmpDate);
    eddDate.setDate(lmpDate.getDate() + 280);
    return eddDate.toISOString().split('T')[0];
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
      setMessage({ type: 'error', text: 'Error saving record' });
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
      setMessage({ type: 'error', text: 'Error discharging patient' });
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
      setMessage({ type: 'error', text: 'Error recording delivery' });
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
      setMessage({ type: 'error', text: 'Error referring patient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== HELPER FUNCTIONS ====================
  const getRiskLevelColor = (isHighRisk) => {
    return isHighRisk ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
  };

  const getRiskLevelText = (isHighRisk) => {
    return isHighRisk ? '⚠️ High Risk' : '✅ Normal';
  };

  const getRequestStatus = (item) => {
    if (!item) return 'pending';
    if (item.status === 'completed' || item.status === 'dispensed') return 'completed';
    if (item.status === 'in_progress') return 'in_progress';
    return 'pending';
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

  // ==================== DEBUG BUTTONS ====================
  const DebugButtons = () => (
    <div className="fixed bottom-5 right-5 z-[9999] flex gap-2">
      <button 
        onClick={async () => {
          try {
            const res = await fetch(`${API_URL}/api/test/socket-status`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            alert(`Connected clients: ${data.connectedClients}`);
          } catch (err) {
            alert('Error checking socket status');
          }
        }}
        className="px-3 py-1 bg-blue-500 text-white rounded text-xs"
      >
        🔌 Socket
      </button>
    </div>
  );

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <ConnectionStatusBanner />
      
      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-pulse-custom { animation: pulse 2s infinite; }
        .animate-fade-in { animation: fadeIn 0.5s ease; }
        .animate-slide-in { animation: slideIn 0.3s ease; }
      `}</style>

      {/* ==================== SIDEBAR ==================== */}
      <div className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-violet-800 text-white transition-all duration-300 flex flex-col h-screen sticky top-0 shadow-xl`}>
        <div className={`${sidebarCollapsed ? 'py-5 px-0' : 'p-6'} border-b border-violet-700 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <FaBaby className="text-3xl text-violet-300" />
              <div>
                <h3 className="m-0 text-lg font-semibold">Midwife</h3>
                <p className="mt-1 text-xs text-violet-300">ANC Ward</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && <FaBaby className="text-3xl" />}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-violet-300 hover:text-white">
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="p-4 bg-violet-900 m-4 rounded-xl">
            <p className="text-xs text-violet-300 m-0 mb-2">Midwife</p>
            <p className="text-sm font-medium m-0 mb-1">{user?.full_name}</p>
            <p className="text-xs text-violet-300">{user?.hospital_name}</p>
          </div>
        )}

        <div className={`flex-1 ${sidebarCollapsed ? 'py-4 px-0' : 'p-4'}`}>
          <div className="mb-6">
            {!sidebarCollapsed && (
              <p className="text-xs text-violet-400 mx-5 mb-2 uppercase tracking-wider">Patient Management</p>
            )}
            {[
              { id: 'antenatal', icon: '🤰', label: 'Antenatal Care', badge: stats.antenatal },
              { id: 'postnatal', icon: '👶', label: 'Postnatal Care', badge: stats.postnatal },
              { id: 'high-risk', icon: '⚠️', label: 'High Risk', badge: stats.highRisk },
              { id: 'deliveries', icon: '🏥', label: 'Deliveries', badge: stats.deliveries }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-lg transition-all ${activeTab === item.id ? 'bg-violet-600' : 'hover:bg-violet-700'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                </div>
                {!sidebarCollapsed && item.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span>
                )}
              </button>
            ))}
          </div>

          <div onClick={() => {
            setShowDischargeList(!showDischargeList);
            if (!showDischargeList) fetchDischargedPatients();
          }} className={`${sidebarCollapsed ? 'py-3 px-0' : 'py-3 px-5'} mx-2 mt-2 rounded-lg ${showDischargeList ? 'bg-white/15' : 'bg-transparent'} flex items-center gap-3 cursor-pointer transition-all hover:bg-white/10`}>
            <span className="text-xl">📋</span>
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-sm">Discharge List</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500">{stats.completedToday}</span>
              </>
            )}
          </div>

          {!sidebarCollapsed && (
            <div className="px-5 mt-6">
              <p className="text-xs text-violet-400 m-0 mb-2 uppercase tracking-wider">Weekly Overview</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-violet-900 p-2.5 rounded-lg">
                  <div className="text-base font-semibold text-green-400">{stats.dueThisWeek}</div>
                  <div className="text-[10px] text-violet-300">Due This Week</div>
                </div>
                <div className="bg-violet-900 p-2.5 rounded-lg">
                  <div className="text-base font-semibold text-yellow-400">{stats.upcomingAppointments}</div>
                  <div className="text-[10px] text-violet-300">Appointments</div>
                </div>
                <div className="bg-violet-900 p-2.5 rounded-lg">
                  <div className="text-base font-semibold text-pink-400">{stats.pendingPharmacy}</div>
                  <div className="text-[10px] text-violet-300">Pharmacy</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`${sidebarCollapsed ? 'py-4 px-0' : 'p-5'} border-t border-violet-700`}>
          <button onClick={handleLogout} className={`w-full ${sidebarCollapsed ? 'py-3 px-0' : 'py-3 px-5'} bg-transparent border border-violet-600 rounded-lg text-red-400 cursor-pointer flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 text-sm transition-all hover:bg-red-500/20`}>
            <span>🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-500 text-white py-6 px-8 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{currentWard.title}</h1>
              <p className="text-violet-100 mt-1">{user?.hospital_name} • {user?.full_name}</p>
              <p className="text-violet-200 text-sm mt-1">
                {connectionStatus === 'connected' ? '🟢 Live Connection' : '🔴 Offline'}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center"><div className="text-2xl font-bold">{stats.antenatal}</div><div className="text-xs">Antenatal</div></div>
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center"><div className="text-2xl font-bold">{stats.postnatal}</div><div className="text-xs">Postnatal</div></div>
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center"><div className="text-2xl font-bold">{stats.deliveries}</div><div className="text-xs">Deliveries</div></div>
              {stats.highRisk > 0 && <div className="bg-red-500 px-4 py-2 rounded-lg text-center animate-pulse"><div className="text-2xl font-bold">{stats.highRisk}</div><div className="text-xs">High Risk</div></div>}
              <button onClick={() => { fetchPatients(); fetchStats(); }} className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2" disabled={loading}>
                <FaSync className={loading ? 'animate-spin' : ''} /><span className="text-sm">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {notification && (
          <div className={`fixed top-24 right-8 z-[1000] max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-slide-in border-l-4 ${notification.type === 'info' ? 'border-blue-500' : 'border-green-500'}`}>
            <div className="p-4 flex items-center gap-3">
              <span className="text-2xl">{notification.type === 'info' ? 'ℹ️' : '✅'}</span>
              <div className="flex-1"><p className="m-0 text-sm text-gray-800">{notification.message}</p></div>
              <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-gray-800">×</button>
            </div>
          </div>
        )}

        {message.text && (
          <div className={`fixed bottom-8 right-8 z-[1000] ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} py-3 px-6 rounded-lg shadow-md`}>
            {message.text}
          </div>
        )}

        <div className="max-w-7xl mx-auto p-8">
          {!showDischargeList ? (
            <>
              {/* Search Bar */}
              <div className="mb-6 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search by patient name or card number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>

              {/* Patient List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {activeTab === 'antenatal' && 'Antenatal Care Patients'}
                    {activeTab === 'postnatal' && 'Postnatal Care Patients'}
                    {activeTab === 'high-risk' && 'High Risk Pregnancies'}
                    {activeTab === 'deliveries' && 'Recent Deliveries'}
                  </h2>
                </div>
                <div className="p-6">
                  {loading && filteredPatients.length === 0 ? (
                    <div className="text-center py-12"><FaSpinner className="animate-spin text-3xl text-violet-500 mx-auto mb-3" /><p className="text-gray-500">Loading patients...</p></div>
                  ) : filteredPatients.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <FaBabyCarriage className="text-5xl text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No patients found</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {filteredPatients.map(patient => {
                        const isHighRisk = patient.antenatal_data?.high_risk;
                        const weeks = patient.antenatal_data?.gestational_weeks || (patient.antenatal_data?.lmp ? calculateWeeks(patient.antenatal_data.lmp) : 'N/A');
                        return (
                          <div key={patient.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3 flex-wrap">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-800">{weeks} weeks</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(isHighRisk)}`}>{getRiskLevelText(isHighRisk)}</span>
                                  {patient.antenatal_data?.edd && <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">EDD: {new Date(patient.antenatal_data.edd).toLocaleDateString()}</span>}
                                </div>
                                <h3 className="font-semibold text-lg">{patient.first_name} {patient.middle_name} {patient.last_name}</h3>
                                <p className="text-sm text-gray-500 mt-1">Card: {patient.card_number} • Age: {patient.age} yrs • G{patient.antenatal_data?.gravida || '?'} P{patient.antenatal_data?.para || '?'}</p>
                                {patient.antenatal_data?.risk_factors?.length > 0 && <p className="text-xs text-red-600 mt-1">⚠️ Risk: {patient.antenatal_data.risk_factors.join(', ')}</p>}
                              </div>
                              <button onClick={() => handleTakePatient(patient)} disabled={loading} className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 flex items-center gap-2"><FaEye /> View Care</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <DischargeList hospitalId={user?.hospital_id} ward="ANC" dischargedPatients={dischargedPatients} onRefresh={fetchDischargedPatients} />
          )}
        </div>

        {/* Patient Consultation Modal */}
        {showPatientModal && selectedPatient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl p-8 max-w-6xl w-[95%] max-h-[90vh] overflow-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Antenatal Care - {selectedPatient.first_name} {selectedPatient.last_name}</h2>
                  <p className="text-sm text-gray-500">Card: {selectedPatient.card_number}</p>
                </div>
                <button onClick={() => setShowPatientModal(false)} className="text-gray-500 hover:text-gray-700 text-3xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">×</button>
              </div>

              {/* Patient Info Card */}
              <div className="bg-violet-50 rounded-2xl p-5 mb-6 grid grid-cols-5 gap-4">
                <div><p className="text-xs text-gray-500">Age</p><p className="text-base font-semibold">{selectedPatient.age} yrs</p></div>
                <div><p className="text-xs text-gray-500">Gravida/Para</p><p className="text-base font-semibold">G{antenatalData.gravida || '?'} / P{antenatalData.para || '?'}</p></div>
                <div><p className="text-xs text-gray-500">Gestational Weeks</p><p className="text-base font-semibold">{antenatalData.gestational_weeks || 'N/A'} weeks</p></div>
                <div><p className="text-xs text-gray-500">Expected Delivery</p><p className="text-base font-semibold">{antenatalData.edd ? new Date(antenatalData.edd).toLocaleDateString() : 'N/A'}</p></div>
                <div><p className="text-xs text-gray-500">Risk Status</p><p className={`text-base font-semibold ${antenatalData.high_risk ? 'text-red-600' : 'text-green-600'}`}>{antenatalData.high_risk ? '⚠️ High Risk' : '✅ Normal'}</p></div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b-2 border-gray-200 pb-3 overflow-x-auto whitespace-nowrap">
                {[
                  { id: 'antenatal', label: '🤰 Antenatal', icon: '🤰' },
                  { id: 'vitals', label: '❤️ Vitals', icon: '❤️' },
                  { id: 'diagnosis', label: '📋 Diagnosis', icon: '📋' },
                  { id: 'prescriptions', label: '💊 Prescriptions', icon: '💊' },
                  { id: 'lab', label: '🔬 Lab Tests', icon: '🔬' },
                  { id: 'visits', label: '📅 Visits', icon: '📅' },
                  { id: 'delivery', label: '🏥 Delivery', icon: '🏥' },
                  { id: 'disposition', label: '🏠 Disposition', icon: '🏠' }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-2.5 px-5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all ${activeTab === tab.id ? 'text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'}`} style={{ backgroundColor: activeTab === tab.id ? '#8b5cf6' : 'transparent' }}>
                    <span>{tab.icon}</span>{tab.label}
                  </button>
                ))}
              </div>

              {/* Antenatal Info Tab */}
              {activeTab === 'antenatal' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Antenatal Information</h3>
                  <div className="grid grid-cols-2 gap-5 mb-6">
                    <div><label className="block text-sm font-medium mb-2">Last Menstrual Period (LMP)</label><input type="date" name="lmp" value={antenatalData.lmp || ''} onChange={handleAntenatalDataChange} className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">Expected Delivery Date (EDD)</label><input type="date" name="edd" value={antenatalData.edd || ''} onChange={handleAntenatalDataChange} className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">Gestational Weeks</label><input type="number" name="gestational_weeks" value={antenatalData.gestational_weeks || ''} onChange={handleAntenatalDataChange} placeholder="e.g., 24" className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">Gravida (Pregnancies)</label><input type="number" name="gravida" value={antenatalData.gravida || ''} onChange={handleAntenatalDataChange} placeholder="e.g., 2" className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">Para (Births)</label><input type="number" name="para" value={antenatalData.para || ''} onChange={handleAntenatalDataChange} placeholder="e.g., 1" className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200"><input type="checkbox" id="high_risk" checked={antenatalData.high_risk} onChange={(e) => setAntenatalData({ ...antenatalData, high_risk: e.target.checked })} className="w-4 h-4" /><label htmlFor="high_risk" className="text-sm font-medium text-red-600">⚠️ Mark as High Risk Pregnancy</label></div>
                  </div>
                  <div className="mb-6"><label className="block text-sm font-medium mb-2">Risk Factors</label><textarea name="risk_factors" value={Array.isArray(antenatalData.risk_factors) ? antenatalData.risk_factors.join(', ') : ''} onChange={(e) => setAntenatalData({ ...antenatalData, risk_factors: e.target.value.split(',').map(f => f.trim()) })} rows="3" placeholder="e.g., Hypertension, Diabetes, Previous C-section..." className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                  <div className="flex justify-end"><button onClick={saveAntenatalRecord} className="px-6 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 flex items-center gap-2" disabled={loading}>{loading ? <FaSpinner className="animate-spin" /> : <FaCheck />} Save Antenatal Info</button></div>
                </div>
              )}

              {/* Vitals Tab */}
              {activeTab === 'vitals' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Vital Signs & Measurements</h3>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div><label className="block text-sm font-medium mb-2">Blood Pressure</label><input type="text" name="blood_pressure" value={vitalSigns.blood_pressure} onChange={handleVitalSignsChange} placeholder="e.g., 120/80" className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">Heart Rate (bpm)</label><input type="number" name="heart_rate" value={vitalSigns.heart_rate} onChange={handleVitalSignsChange} placeholder="e.g., 80" className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">Temperature (°C)</label><input type="number" step="0.1" name="temperature" value={vitalSigns.temperature} onChange={handleVitalSignsChange} placeholder="e.g., 36.5" className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">Weight (kg)</label><input type="number" step="0.1" name="weight" value={vitalSigns.weight} onChange={handleVitalSignsChange} placeholder="e.g., 65.5" className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">Height (cm)</label><input type="number" name="height" value={vitalSigns.height} onChange={handleVitalSignsChange} placeholder="e.g., 160" className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">BMI</label><input type="text" value={vitalSigns.weight && vitalSigns.height ? (vitalSigns.weight / ((vitalSigns.height/100) ** 2)).toFixed(1) : ''} readOnly className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50" /></div>
                    <div><label className="block text-sm font-medium mb-2">Fundal Height (cm)</label><input type="number" name="fundal_height" value={vitalSigns.fundal_height} onChange={handleVitalSignsChange} placeholder="e.g., 24" className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">Fetal Heart Rate (bpm)</label><input type="number" name="fetal_heart_rate" value={vitalSigns.fetal_heart_rate} onChange={handleVitalSignsChange} placeholder="e.g., 140" className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">Fetal Movement</label><select name="fetal_movement" value={vitalSigns.fetal_movement} onChange={handleVitalSignsChange} className="w-full p-3 border border-gray-200 rounded-lg"><option value="normal">Normal</option><option value="decreased">Decreased</option><option value="increased">Increased</option><option value="absent">Absent</option></select></div>
                  </div>
                  <div className="flex justify-end"><button onClick={saveAntenatalRecord} className="px-6 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 flex items-center gap-2" disabled={loading}>{loading ? <FaSpinner className="animate-spin" /> : <FaCheck />} Save Vitals</button></div>
                </div>
              )}

              {/* Diagnosis Tab */}
              {activeTab === 'diagnosis' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Diagnosis</h3>
                  <div className="grid gap-5">
                    <div><label className="block text-sm font-medium mb-2">Primary Diagnosis <span className="text-red-500">*</span></label><input type="text" name="primary" value={diagnosis.primary} onChange={handleDiagnosisChange} placeholder="e.g., Normal Pregnancy" className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">ICD-10 Code</label><input type="text" name="icd10" value={diagnosis.icd10} onChange={handleDiagnosisChange} placeholder="e.g., O09.5" className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-2">Clinical Notes</label><textarea name="notes" value={diagnosis.notes} onChange={handleDiagnosisChange} rows="4" placeholder="Enter clinical findings and observations..." className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    <div className="flex justify-end"><button onClick={handleSaveDiagnosis} className="px-6 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600" disabled={loading}>Save Diagnosis</button></div>
                  </div>
                </div>
              )}

              {/* Prescriptions Tab */}
              {activeTab === 'prescriptions' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Prescriptions</h3>
                  <div className="bg-gray-50 p-5 rounded-xl mb-6">
                    <h4 className="text-base font-semibold mb-4">Add Medication</h4>
                    <div className="grid grid-cols-4 gap-3">
                      <div><label className="text-xs font-medium">Medication Name *</label><input type="text" name="name" value={newMedication.name} onChange={handleMedicationChange} placeholder="e.g., Ferrous Sulfate" className="w-full p-2 border border-gray-200 rounded-md" /></div>
                      <div><label className="text-xs font-medium">Dosage *</label><input type="text" name="dosage" value={newMedication.dosage} onChange={handleMedicationChange} placeholder="e.g., 200mg" className="w-full p-2 border border-gray-200 rounded-md" /></div>
                      <div><label className="text-xs font-medium">Frequency</label><input type="text" name="frequency" value={newMedication.frequency} onChange={handleMedicationChange} placeholder="e.g., twice daily" className="w-full p-2 border border-gray-200 rounded-md" /></div>
                      <div><label className="text-xs font-medium">Duration</label><input type="text" name="duration" value={newMedication.duration} onChange={handleMedicationChange} placeholder="e.g., 7 days" className="w-full p-2 border border-gray-200 rounded-md" /></div>
                      <div><label className="text-xs font-medium">Route</label><select name="route" value={newMedication.route} onChange={handleMedicationChange} className="w-full p-2 border border-gray-200 rounded-md"><option value="oral">Oral</option><option value="IV">IV</option><option value="IM">IM</option></select></div>
                      <div className="col-span-3"><label className="text-xs font-medium">Notes</label><input type="text" name="notes" value={newMedication.notes} onChange={handleMedicationChange} placeholder="Additional instructions" className="w-full p-2 border border-gray-200 rounded-md" /></div>
                    </div>
                    <button onClick={addMedication} className="mt-4 py-2 px-5 bg-violet-500 text-white rounded-full text-sm font-medium" disabled={loading}>+ Add Medication</button>
                  </div>
                  {prescriptions.length > 0 ? (
                    <div><h4 className="text-base font-semibold mb-4">Current Prescriptions</h4><div className="grid gap-3">{prescriptions.map(med => (<div key={med.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"><div><p className="font-semibold">{med.name} {med.dosage}</p><p className="text-sm text-gray-500">{med.frequency} for {med.duration} • {med.route}</p></div><div className="flex items-center gap-3"><span className={`px-2 py-1 rounded-full text-xs ${med.status === 'dispensed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{med.status === 'dispensed' ? '✓ Dispensed' : '⏳ Pending'}</span><button onClick={() => removeMedication(med.id)} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs hover:bg-red-200">Remove</button></div></div>))}</div><div className="mt-5 flex justify-end"><button onClick={savePrescriptions} className="px-6 py-2 bg-violet-500 text-white rounded-lg" disabled={loading}>Send to Pharmacy</button></div></div>
                  ) : <p className="text-center text-gray-400 py-10">No prescriptions added yet</p>}
                  {prescriptions.some(p => p.status !== 'pending') && <PharmacyStatus prescriptions={prescriptions} />}
                </div>
              )}

              {/* Lab Tests Tab */}
              {activeTab === 'lab' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">ANC Lab Tests</h3>
                  <div className="bg-gray-50 p-5 rounded-xl mb-6">
                    <h4 className="text-base font-semibold mb-4">Request Lab Test</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs font-medium">Test Type</label><select name="testType" value={newLabRequest.testType} onChange={handleLabRequestChange} className="w-full p-2 border border-gray-200 rounded-md"><option value="blood">Blood</option><option value="urine">Urine</option><option value="stool">Stool</option></select></div>
                      <div><label className="text-xs font-medium">Test Name</label><select name="testName" value={newLabRequest.testName} onChange={handleLabRequestChange} className="w-full p-2 border border-gray-200 rounded-md"><option value="">Select test</option>{labTests[newLabRequest.testType]?.map(test => <option key={test} value={test}>{test}</option>)}</select></div>
                      <div><label className="text-xs font-medium">Priority</label><select name="priority" value={newLabRequest.priority} onChange={handleLabRequestChange} className="w-full p-2 border border-gray-200 rounded-md"><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT</option></select></div>
                      <div className="col-span-2"><label className="text-xs font-medium">Clinical Notes</label><input type="text" name="notes" value={newLabRequest.notes} onChange={handleLabRequestChange} placeholder="e.g., Routine ANC screening" className="w-full p-2 border border-gray-200 rounded-md" /></div>
                    </div>
                    <button onClick={addLabRequest} className="mt-4 py-2 px-5 bg-violet-500 text-white rounded-full text-sm font-medium" disabled={loading}>Send to Laboratory</button>
                  </div>
                  {labResults.length > 0 && (<div><h4 className="text-base font-semibold mb-4">Lab Results</h4><div className="grid gap-3">{labResults.map(result => (<div key={result.id} className={`border rounded-lg p-4 ${result.critical ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}><p className="font-semibold">{result.test_name}</p><p className="text-sm">{result.result}</p><p className="text-xs text-gray-400">Reported: {new Date(result.reported_at).toLocaleString()}</p></div>))}</div></div>)}
                </div>
              )}

              {/* Visits Tab */}
              {activeTab === 'visits' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Antenatal Visit Records</h3>
                  <div className="bg-gray-50 p-5 rounded-xl mb-6">
                    <h4 className="text-base font-semibold mb-4">Record New Visit</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="col-span-2"><label className="block text-sm font-medium mb-2">Chief Complaints</label><textarea name="complaints" value={visitNotes.complaints} onChange={handleVisitNotesChange} rows="2" placeholder="Any complaints during this visit..." className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                      <div className="col-span-2"><label className="block text-sm font-medium mb-2">Examination Findings</label><textarea name="examination" value={visitNotes.examination} onChange={handleVisitNotesChange} rows="3" placeholder="Examination findings..." className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                      <div className="col-span-2"><label className="block text-sm font-medium mb-2">Advice Given</label><textarea name="advice" value={visitNotes.advice} onChange={handleVisitNotesChange} rows="2" placeholder="Health education and advice..." className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-2">Next Appointment</label><input type="date" name="next_appointment" value={visitNotes.next_appointment} onChange={handleVisitNotesChange} className="w-full p-3 border border-gray-200 rounded-lg" /></div>
                    </div>
                    <button onClick={saveAntenatalRecord} className="px-4 py-2 bg-violet-500 text-white rounded-lg flex items-center gap-2" disabled={loading}><FaPlus /> Record Visit</button>
                  </div>
                  {antenatalVisits.length > 0 && (<div><h4 className="text-base font-semibold mb-4">Visit History</h4><div className="space-y-3">{antenatalVisits.map((visit, idx) => (<div key={idx} className="border border-gray-200 rounded-lg p-4"><div className="flex justify-between items-start mb-2"><p className="font-semibold">Visit {idx + 1} - {new Date(visit.visit_date).toLocaleDateString()}</p><span className="text-xs text-gray-500">Week {visit.gestational_weeks}</span></div><p className="text-sm text-gray-600"><strong>Complaints:</strong> {visit.complaints || 'None'}</p><p className="text-sm text-gray-600"><strong>Examination:</strong> {visit.examination || 'None'}</p><p className="text-sm text-gray-600"><strong>Advice:</strong> {visit.advice || 'None'}</p><p className="text-xs text-gray-400 mt-2">Next: {visit.next_appointment ? new Date(visit.next_appointment).toLocaleDateString() : 'Not scheduled'}</p></div>))}</div></div>)}
                </div>
              )}

              {/* Delivery Tab */}
              {activeTab === 'delivery' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Delivery Record</h3>
                  <div className="bg-yellow-50 p-5 rounded-xl mb-6 border border-yellow-200">
                    <p className="text-sm text-yellow-800 mb-3">⚠️ Record delivery only when patient is in labor or has delivered</p>
                    <div className="mb-6"><label className="block text-sm font-medium mb-2">Digital Signature <span className="text-red-500">*</span></label><div className="border-2 border-gray-200 rounded-xl p-1 bg-white"><SignaturePad ref={signaturePad} canvasProps={{ width: 500, height: 200, className: "w-full h-[200px] rounded-lg" }} /></div><button onClick={() => signaturePad.current?.clear()} className="mt-3 py-2 px-5 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">Clear Signature</button></div>
                    <button onClick={recordDelivery} className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2" disabled={loading}><FaBabyCarriage /> Record Delivery</button>
                  </div>
                </div>
              )}

              {/* Disposition Tab */}
              {activeTab === 'disposition' && (
                <div>
                  <h3 className="text-lg font-semibold mb-5">Patient Disposition</h3>
                  <div className="mb-6"><label className="block text-sm font-medium mb-2">Digital Signature <span className="text-red-500">*</span></label><div className="border-2 border-gray-200 rounded-xl p-1 bg-white"><SignaturePad ref={signaturePad} canvasProps={{ width: 500, height: 200, className: "w-full h-[200px] rounded-lg" }} /></div><button onClick={() => signaturePad.current?.clear()} className="mt-3 py-2 px-5 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">Clear Signature</button></div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <button onClick={openDischargeLocationModal} className="py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600" disabled={loading}>🏠 Discharge</button>
                    <button onClick={async () => { const beds = await fetchAvailableBeds(); if (beds.length > 0) setShowBedListNotification(true); else alert('No beds available'); }} className="py-4 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600" disabled={loading}>🏥 Admit to Ward</button>
                    <button onClick={openReferralModal} className="py-4 bg-violet-500 text-white rounded-xl font-semibold hover:bg-violet-600" disabled={loading}>🔄 Refer Patient</button>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-xl"><h4 className="text-base font-semibold mb-3">Summary Preview</h4><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-gray-500">Diagnosis</p><p className="text-sm font-medium">{diagnosis.primary || 'Not set'}</p></div><div><p className="text-xs text-gray-500">ICD-10</p><p className="text-sm font-medium">{diagnosis.icd10 || 'Not set'}</p></div><div><p className="text-xs text-gray-500">Prescriptions</p><p className="text-sm font-medium">{prescriptions.length} medications</p></div></div></div>
                </div>
              )}

              <div className="mt-8 flex justify-end gap-3 border-t-2 border-gray-200 pt-5">
                <button onClick={() => setShowPatientModal(false)} className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Close</button>
                <button onClick={saveAntenatalRecord} className="px-6 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 flex items-center gap-2" disabled={loading}>{loading ? <FaSpinner className="animate-spin" /> : <FaCheck />} Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* Discharge Location Modal */}
        {showDischargeLocationModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2100]">
            <div className="bg-white rounded-3xl p-8 max-w-md w-[90%]"><h3 className="text-xl font-semibold mb-6">Select Discharge Location</h3><select value={dischargeLocation} onChange={(e) => setDischargeLocation(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg mb-6"><option value="">Choose location...</option>{dischargeLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select><div className="flex justify-end gap-3"><button onClick={() => setShowDischargeLocationModal(false)} className="px-6 py-2 bg-gray-100 rounded-lg">Cancel</button><button onClick={handleDischargeWithLocation} disabled={!dischargeLocation || loading} className="px-6 py-2 bg-green-500 text-white rounded-lg">Confirm Discharge</button></div></div>
          </div>
        )}

        {/* Referral Modal */}
        {showReferralModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2100]">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-[90%] max-h-[80vh] overflow-auto"><h3 className="text-xl font-semibold mb-6">Refer Patient</h3>
              <div className="flex gap-4 mb-6"><button onClick={() => { setReferralType('internal'); setSelectedInternalWard(''); setExternalReferralData(null); }} className={`flex-1 py-3 rounded-lg font-semibold ${referralType === 'internal' ? 'text-white' : 'bg-gray-100'}`} style={{ backgroundColor: referralType === 'internal' ? '#8b5cf6' : '' }}>🏥 Internal</button><button onClick={() => { setReferralType('external'); setSelectedInternalWard(''); setExternalReferralData(null); }} className={`flex-1 py-3 rounded-lg font-semibold ${referralType === 'external' ? 'text-white' : 'bg-gray-100'}`} style={{ backgroundColor: referralType === 'external' ? '#8b5cf6' : '' }}>🌍 External</button></div>
              {referralType === 'internal' && (<div><select value={selectedInternalWard} onChange={(e) => setSelectedInternalWard(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg mb-4"><option value="">Select Ward...</option>{internalWards.map(ward => <option key={ward} value={ward}>{ward} Ward</option>)}</select>{selectedInternalWard && (<div className="mt-4"><label className="text-sm font-medium mb-2 block">Select Bed (Optional)</label><BedSelection ward={selectedInternalWard} hospitalId={user?.hospital_id} onBedSelect={setReferralSelectedBed} selectedBed={referralSelectedBed} title="Available Beds" /></div>)}<div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowReferralModal(false)} className="px-6 py-2 bg-gray-100 rounded-lg">Cancel</button><button onClick={handleInternalRefer} disabled={!selectedInternalWard || loading} className="px-6 py-2 bg-violet-500 text-white rounded-lg">Send Referral</button></div></div>)}
              {referralType === 'external' && (<div><EthiopianHierarchySelector onSelect={setExternalReferralData} /><div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowReferralModal(false)} className="px-6 py-2 bg-gray-100 rounded-lg">Cancel</button><button onClick={handleExternalRefer} disabled={!externalReferralData || loading} className="px-6 py-2 bg-violet-500 text-white rounded-lg">Send Referral</button></div></div>)}
            </div>
          </div>
        )}

        {/* Bed Selection Modal */}
        {showBedListNotification && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2100]">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full"><h3 className="text-xl font-semibold mb-4">Select Bed for Admission</h3><p className="text-sm text-gray-600 mb-3">Available Beds in ANC Ward:</p>{availableBedsList.length === 0 ? (<div className="text-center py-8 bg-yellow-50 rounded-lg"><span className="text-4xl block">🛏️</span><p>No beds available</p></div>) : (<div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto mb-4">{availableBedsList.map(bed => (<button key={bed.id} onClick={() => { setShowBedListNotification(false); handleAdmit(bed.id); }} className="border-2 border-green-200 bg-green-50 hover:bg-green-100 rounded-xl p-4"><div className="flex justify-between"><span className="font-bold">Bed {bed.number}</span><span>🛏️</span></div><div className="text-xs text-gray-600">{bed.type === 'general' ? 'General Ward' : 'Private Room'}</div><div className="text-xs text-green-600 mt-2">✓ Available</div></button>))}</div>)}<button onClick={() => setShowBedListNotification(false)} className="w-full px-4 py-2 bg-gray-100 rounded-lg">Cancel</button></div>
          </div>
        )}

        <DebugButtons />
      </div>
    </div>
  );
};

export default MidwifeDashboard;