import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

const CardOfficeStaffDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('register');
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    age: '',
    gender: 'Male',
    phone: ''
  });
  
  // Add validation errors state
  const [formErrors, setFormErrors] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    age: '',
    phone: ''
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stats, setStats] = useState({
    today: 0,
    inTriage: 0,
    active: 0,
    total: 0
  });
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const navigate = useNavigate();
  const API_URL = 'http://localhost:5001';

  // ==================== VALIDATION FUNCTIONS ====================
  
  // Validate name (only letters, spaces, hyphens, and apostrophes)
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

  // Validate age (number, between 0-120)
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

  // Validate phone number (optional, but if provided must be valid)
  const validatePhone = (phone) => {
    if (!phone) return ''; // Phone is optional
    
    const phoneRegex = /^[0-9\s\-+()]+$/;
    if (!phoneRegex.test(phone)) {
      return 'Phone can only contain numbers, spaces, and + - ( )';
    }
    
    // Remove non-digit characters for length check
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      return 'Phone must have at least 10 digits';
    }
    if (digitsOnly.length > 15) {
      return 'Phone must have less than 15 digits';
    }
    return '';
  };

  // Validate entire form
  const validateForm = () => {
    const errors = {
      first_name: validateName(formData.first_name, 'First name'),
      last_name: validateName(formData.last_name, 'Last name'),
      middle_name: formData.middle_name ? validateName(formData.middle_name, 'Middle name') : '',
      age: validateAge(formData.age),
      phone: validatePhone(formData.phone)
    };
    
    setFormErrors(errors);
    
    // Return true if no errors
    return !Object.values(errors).some(error => error !== '');
  };

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    if (!user?.hospital_id) {
      console.log('Waiting for user data...');
      return;
    }

    const token = localStorage.getItem('token');
    
    const newSocket = io(API_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setConnectionStatus('connected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnectionStatus('disconnected');
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) newSocket.disconnect();
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

  useEffect(() => {
    if (user?.hospital_id) {
      fetchRecentPatients();
      fetchStats();
    }
  }, [user?.hospital_id]);

  // ==================== HANDLE REGISTRATION ====================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      setMessage({ 
        type: 'error', 
        text: 'Please fix the errors in the form before submitting' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }
    
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      
      // Clean phone number before sending (remove spaces, etc. but keep format)
      const cleanedFormData = {
        ...formData,
        phone: formData.phone.replace(/\s/g, '') // Remove spaces from phone
      };
      
      const response = await axios.post(
        `${API_URL}/api/cardoffice/patients/register`,
        cleanedFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Patient ${formData.first_name} ${formData.last_name} registered! Card: ${response.data.patient.card_number}` 
        });

        // Reset form
        setFormData({
          first_name: '',
          middle_name: '',
          last_name: '',
          age: '',
          gender: 'Male',
          phone: ''
        });
        
        // Reset errors
        setFormErrors({
          first_name: '',
          middle_name: '',
          last_name: '',
          age: '',
          phone: ''
        });

        // Show print modal
        setSelectedPatient(response.data.patient);
        setShowPrintModal(true);

        // Refresh data
        fetchRecentPatients();
        fetchStats();
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error registering patient' 
      });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // ==================== SEARCH PATIENTS (FIXED) ====================
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setMessage({ type: 'error', text: 'Please enter a search term' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Fix: Properly encode the search query
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
      } else {
        setSearchResults([]);
        setMessage({ type: 'error', text: response.data.message || 'Search failed' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Search error:', error);
      console.error('Error details:', error.response?.data);
      setSearchResults([]);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error searching patients. Please try again.' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Handle search on Enter key
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // ==================== SEND RETURNING PATIENT TO TRIAGE ====================
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
        setMessage({ 
          type: 'success', 
          text: `Patient ${patient.first_name} ${patient.last_name} sent to triage` 
        });
        
        // Refresh search results
        handleSearch();
      }
    } catch (error) {
      console.error('Error sending to triage:', error);
      setMessage({ type: 'error', text: 'Error sending patient to triage' });
    } finally {
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // ==================== VIEW PATIENT HISTORY ====================
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

  // ==================== CLEAR SEARCH ====================
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setMessage({ type: '', text: '' });
  };

  // ==================== GET STATUS STYLE ====================
  const getStatusStyle = (status) => {
    const styles = {
      'in_triage': { bg: '#fef3c7', color: '#92400e', text: 'In Triage' },
      'in_opd': { bg: '#dcfce7', color: '#166534', text: 'In OPD' },
      'in_emergency': { bg: '#fee2e2', color: '#991b1b', text: 'In Emergency' },
      'in_anc': { bg: '#f3e8ff', color: '#6b21a8', text: 'In ANC' },
      'with_doctor': { bg: '#dbeafe', color: '#1e40af', text: 'With Doctor' },
      'admitted': { bg: '#fed7aa', color: '#9a3412', text: 'Admitted' },
      'discharged': { bg: '#e5e7eb', color: '#4b5563', text: 'Discharged' },
      'referred': { bg: '#fbcfe8', color: '#9d174d', text: 'Referred' },
      'cancelled': { bg: '#f3f4f6', color: '#6b7280', text: 'Cancelled' }
    };
    return styles[status] || { bg: '#f3f4f6', color: '#4b5563', text: status || 'Unknown' };
  };

  // ==================== CONNECTION STATUS BANNER ====================
  const ConnectionStatusBanner = () => {
    if (connectionStatus === 'connected') return null;
    
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        backgroundColor: connectionStatus === 'connecting' ? '#f59e0b' : '#ef4444',
        color: 'white',
        padding: '8px 24px',
        borderRadius: '40px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span>{connectionStatus === 'connecting' ? '🔄' : '⚠️'}</span>
        {connectionStatus === 'connecting' 
          ? 'Connecting to server...' 
          : 'Disconnected from server'}
      </div>
    );
  };

  // ==================== RENDER ====================
  return (
    <div style={{ 
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      backgroundColor: '#f8fafc', 
      minHeight: '100vh' 
    }}>
      <ConnectionStatusBanner />
      
      {/* Header */}
      <div style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            Card Office Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0' }}>
            {user?.full_name} • {user?.hospital_name}
          </p>
          <p style={{ 
            fontSize: '12px', 
            color: connectionStatus === 'connected' ? '#10b981' : '#ef4444', 
            margin: '4px 0 0' 
          }}>
            {connectionStatus === 'connected' ? '● Connected' : '○ Disconnected'}
          </p>
        </div>
        <button 
          onClick={onLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{ padding: '24px' }}>
        {/* Message Display */}
        {message.text && (
          <div style={{
            marginBottom: '16px',
            padding: '12px 16px',
            backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7',
            borderLeft: `4px solid ${message.type === 'error' ? '#dc2626' : '#16a34a'}`,
            color: message.type === 'error' ? '#991b1b' : '#166534',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{message.text}</span>
            <button 
              onClick={() => setMessage({ type: '', text: '' })}
              style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px' }}>
              Today's Registrations
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6', margin: 0 }}>
              {stats.today}
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px' }}>
              In Triage
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#f97316', margin: 0 }}>
              {stats.inTriage}
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px' }}>
              Active Patients
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981', margin: 0 }}>
              {stats.active}
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px' }}>
              Total Patients
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#8b5cf6', margin: 0 }}>
              {stats.total}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {['register', 'search', 'recent'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none',
                  color: activeTab === tab ? '#3b82f6' : '#6b7280',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'register' ? 'Register Patient' : 
                 tab === 'search' ? 'Search Patients' : 'Recent Registrations'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          {/* Register Tab */}
          {activeTab === 'register' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>
                Register New Patient
              </h2>
              
              <form onSubmit={handleRegister} style={{ maxWidth: '600px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      First Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        border: formErrors.first_name ? '1px solid #ef4444' : '1px solid #d1d5db', 
                        borderRadius: '6px' 
                      }}
                      placeholder="Enter first name (letters only)"
                    />
                    {formErrors.first_name && (
                      <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                        {formErrors.first_name}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middle_name"
                      value={formData.middle_name}
                      onChange={handleInputChange}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        border: formErrors.middle_name ? '1px solid #ef4444' : '1px solid #d1d5db', 
                        borderRadius: '6px' 
                      }}
                      placeholder="Enter middle name (optional)"
                    />
                    {formErrors.middle_name && (
                      <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                        {formErrors.middle_name}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Last Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        border: formErrors.last_name ? '1px solid #ef4444' : '1px solid #d1d5db', 
                        borderRadius: '6px' 
                      }}
                      placeholder="Enter last name (letters only)"
                    />
                    {formErrors.last_name && (
                      <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                        {formErrors.last_name}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Age <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      min="0"
                      max="120"
                      step="1"
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        border: formErrors.age ? '1px solid #ef4444' : '1px solid #d1d5db', 
                        borderRadius: '6px' 
                      }}
                      placeholder="Enter age (0-120)"
                    />
                    {formErrors.age && (
                      <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                        {formErrors.age}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Gender <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        border: formErrors.phone ? '1px solid #ef4444' : '1px solid #d1d5db', 
                        borderRadius: '6px' 
                      }}
                      placeholder="Enter phone number (10-15 digits)"
                    />
                    {formErrors.phone && (
                      <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                        {formErrors.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.5 : 1,
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {loading ? 'Registering...' : 'Register Patient'}
                  </button>
                </div>
              </form>

              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#eff6ff',
                borderRadius: '6px'
              }}>
                <p style={{ fontSize: '14px', color: '#1d4ed8', margin: 0 }}>
                  <strong>Note:</strong> After registration, patient will automatically be sent to Triage
                </p>
                <p style={{ fontSize: '12px', color: '#1d4ed8', margin: '8px 0 0 0' }}>
                  <strong>Validation Rules:</strong> Names: letters only | Age: 0-120 years | Phone: 10-15 digits
                </p>
              </div>
            </div>
          )}

          {/* Search Tab - FIXED */}
          {activeTab === 'search' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>
                Search Patients
              </h2>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  placeholder="Search by card number, name, or phone..."
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {searchResults.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    Search Results ({searchResults.length})
                  </h3>
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {searchResults.map(patient => {
                      const statusStyle = getStatusStyle(patient.status);
                      return (
                        <div
                          key={patient.id || patient.card_number}
                          style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '12px',
                            backgroundColor: '#f9fafb'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#3b82f6' }}>
                                  {patient.card_number}
                                </span>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  backgroundColor: statusStyle.bg,
                                  color: statusStyle.color
                                }}>
                                  {statusStyle.text}
                                </span>
                              </div>
                              
                              <p style={{ fontWeight: 'bold', margin: '0 0 4px' }}>
                                {patient.first_name} {patient.middle_name || ''} {patient.last_name}
                              </p>
                              
                              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px' }}>
                                {patient.age} years • {patient.gender}
                              </p>
                              
                              {patient.phone && (
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                                  📞 {patient.phone}
                                </p>
                              )}
                              
                              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                Registered: {new Date(patient.registered_at).toLocaleDateString()}
                              </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <button
                                onClick={() => handleViewHistory(patient)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                View History
                              </button>
                              
                              {patient.status !== 'in_triage' && patient.status !== 'with_doctor' && (
                                <button
                                  onClick={() => handleSendToTriage(patient)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#f97316',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Send to Triage
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
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                  <p style={{ fontSize: '18px', marginBottom: '8px' }}>No patients found</p>
                  <p style={{ fontSize: '14px' }}>Try searching with a different term</p>
                </div>
              )}
            </div>
          )}

          {/* Recent Tab */}
          {activeTab === 'recent' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
                Recent Registrations
              </h2>
              
              {recentPatients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                  <p style={{ fontSize: '18px', marginBottom: '8px' }}>No patients registered yet</p>
                  <p style={{ fontSize: '14px' }}>Register your first patient to get started</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                          Card Number
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                          Patient Name
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                          Age/Gender
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                          Phone
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                          Status
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                          Registered
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPatients.map(patient => {
                        const statusStyle = getStatusStyle(patient.status);
                        return (
                          <tr key={patient.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                              {patient.card_number}
                            </td>
                            <td style={{ padding: '12px' }}>
                              {patient.first_name} {patient.middle_name || ''} {patient.last_name}
                            </td>
                            <td style={{ padding: '12px' }}>
                              {patient.age} yrs / {patient.gender}
                            </td>
                            <td style={{ padding: '12px' }}>
                              {patient.phone || '-'}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                backgroundColor: statusStyle.bg,
                                color: statusStyle.color
                              }}>
                                {statusStyle.text}
                              </span>
                             </td>
                            <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
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
        </div>
      </div>

      {/* Print Card Modal */}
      {showPrintModal && selectedPatient && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Patient Card</h2>
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setSelectedPatient(null);
                }}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{
              border: '2px solid #2563eb',
              borderRadius: '12px',
              padding: '20px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af', margin: '0 0 4px' }}>
                  {user?.hospital_name}
                </h3>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Patient Identification Card</p>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: 'bold', color: '#2563eb' }}>
                  {selectedPatient.card_number}
                </span>
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px' }}>
                  {selectedPatient.first_name} {selectedPatient.middle_name || ''} {selectedPatient.last_name}
                </p>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px' }}>
                  {selectedPatient.gender} • {selectedPatient.age} years
                </p>
                {selectedPatient.phone && (
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    📞 {selectedPatient.phone}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setSelectedPatient(null);
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Print Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardOfficeStaffDashboard;