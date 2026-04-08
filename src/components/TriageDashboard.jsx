// frontend/src/components/TriageDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const TriageDashboard = ({ user, onLogout }) => {
  const [triageQueue, setTriageQueue] = useState([]);
  const [triagedPatients, setTriagedPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});
  const [warningMessages, setWarningMessages] = useState({});
  
  // Vital signs state matching your model
  const [vitalsData, setVitalsData] = useState({
    blood_pressure: '',
    temperature: '',
    heart_rate: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    height: '',
    pain_level: '',
    consciousness: 'Alert',
    is_pregnant: false,
    weeks_pregnant: '',
    notes: '',
    is_critical: false
  });
  
  const [selectedWard, setSelectedWard] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stats, setStats] = useState({
    waiting: 0,
    opd: 0,
    eme: 0,
    anc: 0
  });
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const navigate = useNavigate();
  const API_URL = 'http://localhost:5001';

  // Enhanced validation functions with realistic medical ranges
  const validateBloodPressure = (bp, age, isPregnant = false) => {
    if (!bp) return 'Blood pressure is required';
    
    const bpRegex = /^\d{2,3}\/\d{2,3}$/;
    if (!bpRegex.test(bp)) return 'Invalid format. Use format: 120/80 (numbers only)';
    
    const [systolic, diastolic] = bp.split('/').map(Number);
    
    // Expanded ranges based on clinical scenarios
    // Hypotension: < 90/60, Hypertension: > 180/120
    if (systolic < 70) return '⚠️ Systolic is very low (< 70). Immediate attention needed!';
    if (systolic > 220) return '⚠️ Systolic is critically high (> 220). Emergency!';
    if (diastolic < 40) return '⚠️ Diastolic is very low (< 40). Immediate attention needed!';
    if (diastolic > 130) return '⚠️ Diastolic is critically high (> 130). Emergency!';
    
    // Clinical warnings (not errors)
    if (systolic < 90 && systolic >= 70) {
      setWarningMessages(prev => ({ ...prev, blood_pressure: '⚠️ Low blood pressure (Hypotension) - Monitor closely' }));
    } else if (systolic > 180) {
      setWarningMessages(prev => ({ ...prev, blood_pressure: '⚠️ High blood pressure (Hypertension) - Requires evaluation' }));
    } else {
      setWarningMessages(prev => ({ ...prev, blood_pressure: '' }));
    }
    
    return '';
  };

  const validateTemperature = (temp) => {
    if (!temp) return 'Temperature is required';
    const numTemp = parseFloat(temp);
    if (isNaN(numTemp)) return 'Temperature must be a number';
    
    // Expanded ranges - hypothermia to hyperthermia
    if (numTemp < 32) return '⚠️ Critically low temperature (< 32°C) - Severe hypothermia!';
    if (numTemp < 35 && numTemp >= 32) {
      setWarningMessages(prev => ({ ...prev, temperature: '⚠️ Hypothermia - Keep patient warm' }));
      return '';
    }
    if (numTemp > 41) return '⚠️ Critically high temperature (> 41°C) - Hyperpyrexia! Emergency!';
    if (numTemp > 39 && numTemp <= 41) {
      setWarningMessages(prev => ({ ...prev, temperature: '⚠️ High fever - Monitor closely' }));
      return '';
    }
    if (numTemp < 36 && numTemp >= 35) {
      setWarningMessages(prev => ({ ...prev, temperature: '⚠️ Mild hypothermia - Monitor temperature' }));
      return '';
    }
    
    setWarningMessages(prev => ({ ...prev, temperature: '' }));
    return '';
  };

  const validateHeartRate = (hr, age) => {
    if (!hr) return 'Heart rate is required';
    const numHr = parseInt(hr);
    if (isNaN(numHr)) return 'Heart rate must be a number';
    
    // Age-based ranges (approximate)
    let lowNormal = 60;
    let highNormal = 100;
    
    if (age < 1) { // Infant
      lowNormal = 100;
      highNormal = 160;
    } else if (age < 12) { // Child
      lowNormal = 70;
      highNormal = 120;
    } else if (age >= 65) { // Elderly
      lowNormal = 60;
      highNormal = 100;
    }
    
    // Critical ranges
    if (numHr < 40) return '⚠️ Severe bradycardia (< 40 bpm) - Emergency!';
    if (numHr > 180) return '⚠️ Severe tachycardia (> 180 bpm) - Emergency!';
    
    // Warning ranges
    if (numHr < lowNormal && numHr >= 40) {
      setWarningMessages(prev => ({ ...prev, heart_rate: `⚠️ Bradycardia (${numHr} bpm) - Monitor` }));
    } else if (numHr > highNormal && numHr <= 180) {
      setWarningMessages(prev => ({ ...prev, heart_rate: `⚠️ Tachycardia (${numHr} bpm) - Monitor` }));
    } else {
      setWarningMessages(prev => ({ ...prev, heart_rate: '' }));
    }
    
    return '';
  };

  const validateRespiratoryRate = (rr, age) => {
    if (!rr) return '';
    const numRr = parseInt(rr);
    if (isNaN(numRr)) return 'Respiratory rate must be a number';
    
    // Age-based normal ranges
    let lowNormal = 12;
    let highNormal = 20;
    
    if (age < 1) { // Infant
      lowNormal = 30;
      highNormal = 60;
    } else if (age < 12) { // Child
      lowNormal = 20;
      highNormal = 30;
    }
    
    if (numRr < 8) return '⚠️ Severe bradypnea (< 8) - Respiratory failure risk!';
    if (numRr > 40) return '⚠️ Severe tachypnea (> 40) - Respiratory distress!';
    
    if (numRr < lowNormal && numRr >= 8) {
      setWarningMessages(prev => ({ ...prev, respiratory_rate: `⚠️ Bradypnea (${numRr}) - Monitor breathing` }));
    } else if (numRr > highNormal && numRr <= 40) {
      setWarningMessages(prev => ({ ...prev, respiratory_rate: `⚠️ Tachypnea (${numRr}) - Monitor oxygen` }));
    } else {
      setWarningMessages(prev => ({ ...prev, respiratory_rate: '' }));
    }
    
    return '';
  };

  const validateOxygenSaturation = (o2) => {
    if (!o2) return 'Oxygen saturation is required';
    const numO2 = parseInt(o2);
    if (isNaN(numO2)) return 'Oxygen saturation must be a number';
    
    if (numO2 < 70) return '⚠️ Critically low O2 (< 70%) - Immediate intervention!';
    if (numO2 < 85 && numO2 >= 70) {
      setWarningMessages(prev => ({ ...prev, oxygen_saturation: '⚠️ Severe hypoxia - Urgent oxygen needed!' }));
      return '';
    }
    if (numO2 < 90 && numO2 >= 85) {
      setWarningMessages(prev => ({ ...prev, oxygen_saturation: '⚠️ Hypoxia - Administer oxygen' }));
      return '';
    }
    if (numO2 > 100) return 'O2 saturation cannot exceed 100%';
    
    setWarningMessages(prev => ({ ...prev, oxygen_saturation: '' }));
    return '';
  };

  const validateWeight = (weight, age) => {
    if (!weight) return '';
    const numWeight = parseFloat(weight);
    if (isNaN(numWeight)) return 'Weight must be a number';
    
    // Realistic weight ranges for all ages
    if (numWeight < 0.5) return 'Weight too low (< 0.5 kg)';
    if (numWeight > 500) return 'Weight too high (> 500 kg)';
    
    if (numWeight < 2 && age > 1) {
      setWarningMessages(prev => ({ ...prev, weight: '⚠️ Severely underweight - Nutritional assessment needed' }));
    } else if (numWeight > 200) {
      setWarningMessages(prev => ({ ...prev, weight: '⚠️ Severe obesity - Consider mobility needs' }));
    } else {
      setWarningMessages(prev => ({ ...prev, weight: '' }));
    }
    
    return '';
  };

  const validateHeight = (height) => {
    if (!height) return '';
    const numHeight = parseFloat(height);
    if (isNaN(numHeight)) return 'Height must be a number';
    
    if (numHeight < 30) return 'Height too low (< 30 cm)';
    if (numHeight > 280) return 'Height too high (> 280 cm)';
    
    return '';
  };

  const validatePainLevel = (pain) => {
    if (!pain) return '';
    const numPain = parseInt(pain);
    if (isNaN(numPain)) return 'Pain level must be a number';
    
    if (numPain < 0 || numPain > 10) return 'Pain level should be between 0-10';
    
    if (numPain >= 7) {
      setWarningMessages(prev => ({ ...prev, pain_level: '⚠️ Severe pain - Immediate pain relief needed' }));
    } else if (numPain >= 4) {
      setWarningMessages(prev => ({ ...prev, pain_level: '⚠️ Moderate pain - Consider analgesia' }));
    } else {
      setWarningMessages(prev => ({ ...prev, pain_level: '' }));
    }
    
    return '';
  };

  const validateWeeksPregnant = (weeks) => {
    if (!weeks) return '';
    const numWeeks = parseInt(weeks);
    if (isNaN(numWeeks)) return 'Weeks must be a number';
    if (numWeeks < 1 || numWeeks > 42) return 'Weeks should be between 1-42';
    
    if (numWeeks > 40) {
      setWarningMessages(prev => ({ ...prev, weeks_pregnant: '⚠️ Post-term pregnancy - Monitor closely' }));
    } else if (numWeeks < 37 && numWeeks > 20) {
      setWarningMessages(prev => ({ ...prev, weeks_pregnant: '⚠️ Preterm pregnancy risk' }));
    } else {
      setWarningMessages(prev => ({ ...prev, weeks_pregnant: '' }));
    }
    
    return '';
  };

  const validateAllFields = () => {
    const errors = {};
    const patientAge = selectedPatient?.age || 30; // Default adult age
    
    errors.blood_pressure = validateBloodPressure(vitalsData.blood_pressure, patientAge, vitalsData.is_pregnant);
    errors.temperature = validateTemperature(vitalsData.temperature);
    errors.heart_rate = validateHeartRate(vitalsData.heart_rate, patientAge);
    errors.oxygen_saturation = validateOxygenSaturation(vitalsData.oxygen_saturation);
    errors.respiratory_rate = validateRespiratoryRate(vitalsData.respiratory_rate, patientAge);
    errors.weight = validateWeight(vitalsData.weight, patientAge);
    errors.height = validateHeight(vitalsData.height);
    errors.pain_level = validatePainLevel(vitalsData.pain_level);
    
    if (vitalsData.is_pregnant && vitalsData.weeks_pregnant) {
      errors.weeks_pregnant = validateWeeksPregnant(vitalsData.weeks_pregnant);
    }
    
    setValidationErrors(errors);
    
    // Check if there are any critical errors (not warnings)
    const hasErrors = Object.values(errors).some(error => error !== '' && !error.includes('⚠️'));
    return !hasErrors;
  };

  // Calculate BMI automatically
  const calculateBMI = () => {
    if (vitalsData.weight && vitalsData.height) {
      const heightInM = vitalsData.height / 100;
      const bmi = vitalsData.weight / (heightInM * heightInM);
      const bmiValue = bmi.toFixed(1);
      
      // Add BMI interpretation
      if (bmi < 18.5) return `${bmiValue} (Underweight)`;
      if (bmi < 25) return `${bmiValue} (Normal)`;
      if (bmi < 30) return `${bmiValue} (Overweight)`;
      return `${bmiValue} (Obese)`;
    }
    return null;
  };

  // Enhanced critical vitals check with more nuanced detection
  const checkCriticalVitals = () => {
    let critical = false;
    let criticalReasons = [];
    
    // Blood pressure critical
    if (vitalsData.blood_pressure) {
      const systolic = parseInt(vitalsData.blood_pressure.split('/')[0]);
      const diastolic = parseInt(vitalsData.blood_pressure.split('/')[1]);
      if (systolic > 200 || systolic < 70) critical = true;
      if (diastolic > 120 || diastolic < 40) critical = true;
    }
    
    // Temperature critical (severe hypo/hyperthermia)
    if (vitalsData.temperature && (vitalsData.temperature < 32 || vitalsData.temperature > 41)) {
      critical = true;
    }
    
    // Heart rate critical
    if (vitalsData.heart_rate && (vitalsData.heart_rate < 40 || vitalsData.heart_rate > 160)) {
      critical = true;
    }
    
    // Oxygen saturation critical
    if (vitalsData.oxygen_saturation && vitalsData.oxygen_saturation < 85) {
      critical = true;
    }
    
    // Respiratory rate critical
    if (vitalsData.respiratory_rate && (vitalsData.respiratory_rate < 10 || vitalsData.respiratory_rate > 30)) {
      critical = true;
    }
    
    // Consciousness level critical
    if (vitalsData.consciousness !== 'Alert') {
      critical = true;
    }
    
    return critical;
  };

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    if (!user?.hospital_id) return;

    const token = localStorage.getItem('token');
    
    const newSocket = io(API_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setConnectionStatus('connected');
      newSocket.emit('join_triage', user.hospital_id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket error:', error);
      setConnectionStatus('disconnected');
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnectionStatus('disconnected');
    });

    // Listen for new patients
    newSocket.on('new_patient_registered', (data) => {
      console.log('🆕 New patient:', data);
      if (data.hospital_id === user?.hospital_id) {
        fetchTriageQueue();
        fetchStats();
        setMessage({ type: 'success', text: `New patient ${data.patient_name} added` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    });

    newSocket.on('returning_patient', (data) => {
      console.log('🔄 Returning patient:', data);
      if (data.hospital_id === user?.hospital_id) {
        fetchTriageQueue();
        fetchStats();
        setMessage({ type: 'info', text: `Returning patient ${data.patient_name}` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    });

    newSocket.on('patient_removed_from_triage', (data) => {
      console.log('❌ Patient removed:', data);
      fetchTriageQueue();
      fetchStats();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user?.hospital_id]);

  // ==================== FETCH DATA ====================
  const fetchTriageQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/triage/queue`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setTriageQueue(data.patients);
        setStats(prev => ({ ...prev, waiting: data.patients.length }));
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
  };

  const fetchTriagedPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/triage/triaged`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setTriagedPatients(data.patients);
      }
    } catch (error) {
      console.error('Error fetching triaged:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/triage/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Initial load
  useEffect(() => {
    if (user?.hospital_id) {
      fetchTriageQueue();
      fetchTriagedPatients();
      fetchStats();
      
      // Refresh every 30 seconds
      const interval = setInterval(() => {
        fetchTriageQueue();
        fetchStats();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?.hospital_id]);

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  // Handle select patient for vitals
  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setSelectedWard('');
    setShowVitalsModal(true);
    setValidationErrors({});
    setWarningMessages({});
    setVitalsData({
      blood_pressure: '',
      temperature: '',
      heart_rate: '',
      respiratory_rate: '',
      oxygen_saturation: '',
      weight: '',
      height: '',
      pain_level: '',
      consciousness: 'Alert',
      is_pregnant: false,
      weeks_pregnant: '',
      notes: '',
      is_critical: false
    });
  };

  const handleVitalsChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Clear validation error and warning for this field
    setValidationErrors(prev => ({ ...prev, [name]: '' }));
    setWarningMessages(prev => ({ ...prev, [name]: '' }));
    
    // Update based on input type
    if (type === 'checkbox') {
      setVitalsData(prev => ({
        ...prev,
        [name]: checked,
        is_critical: checkCriticalVitals()
      }));
    } else {
      setVitalsData(prev => ({
        ...prev,
        [name]: value,
        is_critical: checkCriticalVitals()
      }));
    }
  };

  const handleWardChange = (e) => {
    setSelectedWard(e.target.value);
  };

  const handleSubmitVitals = async (e) => {
    e.preventDefault();
    
    // Validate all fields before submission
    if (!validateAllFields()) {
      setMessage({ 
        type: 'error', 
        text: 'Please fix critical validation errors before submitting' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    if (!selectedWard) {
      setMessage({ type: 'error', text: 'Please select a ward' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Calculate BMI with interpretation
      const bmi = calculateBMI();
      
      // Prepare vitals data matching your model
      const vitalsPayload = {
        ...vitalsData,
        bmi,
        is_critical: checkCriticalVitals(),
        recorded_by_id: user?.id,
        recorded_by_name: user?.full_name,
        recorded_at: new Date().toISOString(),
        warnings: warningMessages // Include warnings in payload
      };

      const response = await fetch(`${API_URL}/api/triage/send-to-ward`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          vitals: vitalsPayload,
          ward: selectedWard,
          notes: vitalsData.notes || vitalsData.chief_complaint
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Patient sent to ${selectedWard} Ward` 
        });

        setShowVitalsModal(false);
        setSelectedPatient(null);
        setSelectedWard('');
        
        // Refresh data
        fetchTriageQueue();
        fetchTriagedPatients();
        fetchStats();
        
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        throw new Error(data.message || 'Failed to send patient');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: error.message || 'Error sending patient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Get status badge style
  const getStatusStyle = (status) => {
    const styles = {
      'in_triage': { bg: 'bg-amber-100', color: 'text-amber-800', text: 'Waiting for Triage' },
      'in_opd': { bg: 'bg-green-100', color: 'text-green-800', text: 'In OPD Ward' },
      'in_emergency': { bg: 'bg-red-100', color: 'text-red-800', text: 'In EME Ward' },
      'in_anc': { bg: 'bg-purple-100', color: 'text-purple-800', text: 'In ANC Ward' },
      'with_doctor': { bg: 'bg-blue-100', color: 'text-blue-800', text: 'With Doctor' },
      'admitted': { bg: 'bg-orange-100', color: 'text-orange-800', text: 'Admitted' },
      'discharged': { bg: 'bg-gray-100', color: 'text-gray-800', text: 'Discharged' },
      'referred': { bg: 'bg-pink-100', color: 'text-pink-800', text: 'Referred' }
    };
    return styles[status] || { bg: 'bg-gray-100', color: 'text-gray-800', text: status };
  };

  // Get ward badge style
  const getWardStyle = (ward) => {
    const styles = {
      'OPD': { bg: 'bg-green-100', color: 'text-green-800', text: 'OPD Ward' },
      'EME': { bg: 'bg-red-100', color: 'text-red-800', text: 'EME Ward' },
      'ANC': { bg: 'bg-purple-100', color: 'text-purple-800', text: 'ANC Ward' }
    };
    return styles[ward] || { bg: 'bg-gray-100', color: 'text-gray-800', text: 'Not Assigned' };
  };

  const ConnectionStatusBanner = () => {
    if (connectionStatus === 'connected') return null;
    
    return (
      <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[10000] ${
        connectionStatus === 'connecting' ? 'bg-orange-500' : 'bg-red-500'
      } text-white px-6 py-2 rounded-full shadow-lg flex items-center gap-3`}>
        <span className="text-xl">
          {connectionStatus === 'connecting' ? '🔄' : '⚠️'}
        </span>
        {connectionStatus === 'connecting' 
          ? 'Connecting to server...' 
          : 'Disconnected from server. Trying to reconnect...'}
      </div>
    );
  };

  return (
    <div className="font-sans bg-gray-100 min-h-screen">
      <ConnectionStatusBanner />
      
      {/* Header */}
      <div className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 m-0">Triage Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.full_name || 'Triage Nurse'} • {user?.hospital_name || 'Hospital'}
          </p>
          <p className={`text-xs mt-1 ${connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
            {connectionStatus === 'connected' ? '● Connected' : '○ Disconnected'}
          </p>
        </div>
        <button 
          onClick={handleLogout} 
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition cursor-pointer text-sm"
        >
          Logout
        </button>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`mx-6 mt-4 p-3 rounded-lg flex justify-between items-center ${
          message.type === 'error' ? 'bg-red-50 border-l-4 border-red-600 text-red-800' : 'bg-green-50 border-l-4 border-green-600 text-green-800'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })} className="bg-none border-none cursor-pointer text-lg">×</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="px-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500 mb-2">Waiting for Triage</p>
            <p className="text-3xl font-bold text-orange-500">{triageQueue.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500 mb-2">OPD Ward</p>
            <p className="text-3xl font-bold text-green-500">{stats.opd}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500 mb-2">EME Ward</p>
            <p className="text-3xl font-bold text-red-500">{stats.eme}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500 mb-2">ANC Ward</p>
            <p className="text-3xl font-bold text-purple-500">{stats.anc}</p>
          </div>
        </div>

        {/* Triage Queue */}
        <div className="bg-white rounded-lg p-6 shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold m-0">Triage Queue</h2>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
              {triageQueue.length} waiting
            </span>
          </div>
          
          {triageQueue.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg mb-2">No patients waiting for triage</p>
              <p className="text-sm">Patients from Card Office will appear here automatically</p>
            </div>
          ) : (
            <div className="space-y-3">
              {triageQueue.map(patient => (
                <div key={patient.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center bg-gray-50 hover:shadow transition">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-blue-600">
                        {patient.card_number}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusStyle(patient.status).bg} ${getStatusStyle(patient.status).color}`}>
                        {getStatusStyle(patient.status).text}
                      </span>
                    </div>
                    <p className="font-bold mb-1">
                      {patient.first_name} {patient.last_name}
                    </p>
                    <p className="text-sm text-gray-500 mb-1">
                      {patient.age} yrs, {patient.gender} • {patient.phone || 'No phone'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Registered: {new Date(patient.registered_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectPatient(patient)}
                    className={`px-4 py-2 bg-blue-600 text-white rounded-md transition ${
                      loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 cursor-pointer'
                    }`}
                    disabled={loading}
                  >
                    Record Vitals
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Triaged */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-bold mb-4">Recently Triaged</h2>
          
          {triagedPatients.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p>No patients triaged yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">Card Number</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">Patient</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">Age/Gender</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">Assigned Ward</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">Status</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">Triaged By</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {triagedPatients.slice(0, 10).map(patient => {
                    const wardStyle = getWardStyle(patient.ward);
                    const statusStyle = getStatusStyle(patient.status);
                    
                    return (
                      <tr key={patient.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-3 font-mono">{patient.card_number}</td>
                        <td className="p-3">{patient.first_name} {patient.last_name}</td>
                        <td className="p-3">{patient.age} / {patient.gender}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${wardStyle.bg} ${wardStyle.color}`}>
                            {wardStyle.text}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${statusStyle.bg} ${statusStyle.color}`}>
                            {statusStyle.text}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-500">
                          {patient.triage_info?.triaged_by || 'N/A'}
                        </td>
                        <td className="p-3 text-sm text-gray-500">
                          {new Date(patient.triaged_at || patient.registered_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Vitals Modal - With Enhanced Validation */}
      {showVitalsModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-5 overflow-auto">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold m-0">Record Vital Signs</h2>
              <button 
                onClick={() => {
                  setShowVitalsModal(false);
                  setSelectedPatient(null);
                }}
                className="bg-none border-none text-2xl cursor-pointer hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="mb-5 p-3 bg-gray-50 rounded-lg">
              <p className="mb-1"><strong>Patient:</strong> {selectedPatient.first_name} {selectedPatient.last_name}</p>
              <p className="mb-1"><strong>Card:</strong> {selectedPatient.card_number}</p>
              <p><strong>Age/Gender:</strong> {selectedPatient.age} yrs / {selectedPatient.gender}</p>
            </div>

            <form onSubmit={handleSubmitVitals}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Blood Pressure */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Blood Pressure <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="blood_pressure"
                    value={vitalsData.blood_pressure}
                    onChange={handleVitalsChange}
                    required
                    placeholder="120/80"
                    className={`w-full p-2 border rounded-md ${validationErrors.blood_pressure ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {validationErrors.blood_pressure && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.blood_pressure}</p>
                  )}
                  {warningMessages.blood_pressure && !validationErrors.blood_pressure && (
                    <p className="text-orange-500 text-xs mt-1">{warningMessages.blood_pressure}</p>
                  )}
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Temperature (°C) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="temperature"
                    value={vitalsData.temperature}
                    onChange={handleVitalsChange}
                    required
                    step="0.1"
                    placeholder="36.6"
                    className={`w-full p-2 border rounded-md ${validationErrors.temperature ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {validationErrors.temperature && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.temperature}</p>
                  )}
                  {warningMessages.temperature && !validationErrors.temperature && (
                    <p className="text-orange-500 text-xs mt-1">{warningMessages.temperature}</p>
                  )}
                </div>

                {/* Heart Rate */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Heart Rate (bpm) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="heart_rate"
                    value={vitalsData.heart_rate}
                    onChange={handleVitalsChange}
                    required
                    placeholder="72"
                    className={`w-full p-2 border rounded-md ${validationErrors.heart_rate ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {validationErrors.heart_rate && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.heart_rate}</p>
                  )}
                  {warningMessages.heart_rate && !validationErrors.heart_rate && (
                    <p className="text-orange-500 text-xs mt-1">{warningMessages.heart_rate}</p>
                  )}
                </div>

                {/* Respiratory Rate */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Respiratory Rate
                  </label>
                  <input
                    type="number"
                    name="respiratory_rate"
                    value={vitalsData.respiratory_rate}
                    onChange={handleVitalsChange}
                    placeholder="16"
                    className={`w-full p-2 border rounded-md ${validationErrors.respiratory_rate ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {validationErrors.respiratory_rate && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.respiratory_rate}</p>
                  )}
                  {warningMessages.respiratory_rate && !validationErrors.respiratory_rate && (
                    <p className="text-orange-500 text-xs mt-1">{warningMessages.respiratory_rate}</p>
                  )}
                </div>

                {/* Oxygen Saturation */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    O2 Saturation (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="oxygen_saturation"
                    value={vitalsData.oxygen_saturation}
                    onChange={handleVitalsChange}
                    required
                    placeholder="98"
                    min="0"
                    max="100"
                    className={`w-full p-2 border rounded-md ${validationErrors.oxygen_saturation ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {validationErrors.oxygen_saturation && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.oxygen_saturation}</p>
                  )}
                  {warningMessages.oxygen_saturation && !validationErrors.oxygen_saturation && (
                    <p className="text-orange-500 text-xs mt-1">{warningMessages.oxygen_saturation}</p>
                  )}
                </div>

                {/* Pain Level */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Pain Level (0-10)
                  </label>
                  <input
                    type="number"
                    name="pain_level"
                    value={vitalsData.pain_level}
                    onChange={handleVitalsChange}
                    min="0"
                    max="10"
                    placeholder="0"
                    className={`w-full p-2 border rounded-md ${validationErrors.pain_level ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {validationErrors.pain_level && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.pain_level}</p>
                  )}
                  {warningMessages.pain_level && !validationErrors.pain_level && (
                    <p className="text-orange-500 text-xs mt-1">{warningMessages.pain_level}</p>
                  )}
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={vitalsData.weight}
                    onChange={handleVitalsChange}
                    step="0.1"
                    placeholder="70"
                    className={`w-full p-2 border rounded-md ${validationErrors.weight ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {validationErrors.weight && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.weight}</p>
                  )}
                  {warningMessages.weight && !validationErrors.weight && (
                    <p className="text-orange-500 text-xs mt-1">{warningMessages.weight}</p>
                  )}
                </div>

                {/* Height */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    name="height"
                    value={vitalsData.height}
                    onChange={handleVitalsChange}
                    step="0.1"
                    placeholder="170"
                    className={`w-full p-2 border rounded-md ${validationErrors.height ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {validationErrors.height && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.height}</p>
                  )}
                </div>

                {/* Consciousness Level */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Consciousness Level
                  </label>
                  <select
                    name="consciousness"
                    value={vitalsData.consciousness}
                    onChange={handleVitalsChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="Alert">Alert</option>
                    <option value="Verbal">Verbal</option>
                    <option value="Pain">Pain</option>
                    <option value="Unresponsive">Unresponsive</option>
                  </select>
                </div>

                {/* BMI Display */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    BMI (calculated)
                  </label>
                  <input
                    type="text"
                    value={calculateBMI() || '—'}
                    disabled
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>

                {/* Pregnancy */}
                {selectedPatient.gender === 'Female' && selectedPatient.age >= 15 && selectedPatient.age <= 50 && (
                  <>
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="is_pregnant"
                          checked={vitalsData.is_pregnant}
                          onChange={handleVitalsChange}
                        />
                        <span className="text-sm font-medium">Patient is pregnant</span>
                      </label>
                    </div>

                    {vitalsData.is_pregnant && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          Weeks Pregnant
                        </label>
                        <input
                          type="number"
                          name="weeks_pregnant"
                          value={vitalsData.weeks_pregnant}
                          onChange={handleVitalsChange}
                          min="1"
                          max="42"
                          placeholder="Enter weeks"
                          className={`w-full p-2 border rounded-md ${validationErrors.weeks_pregnant ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {validationErrors.weeks_pregnant && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.weeks_pregnant}</p>
                        )}
                        {warningMessages.weeks_pregnant && !validationErrors.weeks_pregnant && (
                          <p className="text-orange-500 text-xs mt-1">{warningMessages.weeks_pregnant}</p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Clinical Notes
                  </label>
                  <textarea
                    name="notes"
                    value={vitalsData.notes}
                    onChange={handleVitalsChange}
                    rows="3"
                    placeholder="Additional observations, notes, or chief complaint..."
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>

                {/* Critical Flag Display */}
                {checkCriticalVitals() && (
                  <div className="md:col-span-2 bg-red-50 text-red-700 p-3 rounded-lg border border-red-500 text-center font-bold">
                    🚨 CRITICAL VITALS DETECTED - Patient requires immediate attention! Recommended: EME Ward
                  </div>
                )}

                {/* Ward Selection */}
                <div className="md:col-span-2 mt-4 pt-4 border-t-2 border-gray-200">
                  <h3 className="text-lg font-bold mb-3">Assign Patient to Ward</h3>
                  <div className="flex gap-4 flex-wrap">
                    <label className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer flex-1 min-w-[120px] ${
                      selectedWard === 'OPD' ? 'border-2 border-green-500 bg-green-50' : 'border border-gray-300 bg-white'
                    }`}>
                      <input
                        type="radio"
                        name="ward"
                        value="OPD"
                        checked={selectedWard === 'OPD'}
                        onChange={handleWardChange}
                        className="mr-2"
                        required
                      />
                      <div>
                        <span className="font-bold text-green-700">OPD</span>
                        <br />
                        <span className="text-xs text-gray-500">Outpatient</span>
                      </div>
                    </label>

                    <label className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer flex-1 min-w-[120px] ${
                      selectedWard === 'EME' ? 'border-2 border-red-500 bg-red-50' : 'border border-gray-300 bg-white'
                    }`}>
                      <input
                        type="radio"
                        name="ward"
                        value="EME"
                        checked={selectedWard === 'EME'}
                        onChange={handleWardChange}
                        className="mr-2"
                        required
                      />
                      <div>
                        <span className="font-bold text-red-700">EME</span>
                        <br />
                        <span className="text-xs text-gray-500">Emergency</span>
                      </div>
                    </label>

                    <label className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer flex-1 min-w-[120px] ${
                      selectedWard === 'ANC' ? 'border-2 border-purple-500 bg-purple-50' : 'border border-gray-300 bg-white'
                    }`}>
                      <input
                        type="radio"
                        name="ward"
                        value="ANC"
                        checked={selectedWard === 'ANC'}
                        onChange={handleWardChange}
                        className="mr-2"
                        required
                      />
                      <div>
                        <span className="font-bold text-purple-700">ANC</span>
                        <br />
                        <span className="text-xs text-gray-500">Antenatal</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowVitalsModal(false);
                    setSelectedPatient(null);
                  }}
                  className="px-5 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-5 py-2 bg-blue-600 text-white rounded-md transition ${
                    loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 cursor-pointer'
                  }`}
                >
                  {loading ? 'Processing...' : 'Complete Triage & Send to Ward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TriageDashboard;