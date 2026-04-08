// src/components/DischargeList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DischargeList = ({ hospitalId, ward, dischargedPatients = [], onRefresh }) => {
  const [filter, setFilter] = useState('today');
  const [loading, setLoading] = useState(false);
  const [localDischarges, setLocalDischarges] = useState([]);
  const [expandedPatient, setExpandedPatient] = useState(null);

  const API_URL = 'http://localhost:5001';

  // Use either props or fetch locally
  useEffect(() => {
    if (dischargedPatients && dischargedPatients.length > 0) {
      setLocalDischarges(dischargedPatients);
    } else {
      fetchDischarges();
    }
  }, [dischargedPatients, hospitalId, ward]);

  const fetchDischarges = async () => {
    if (!hospitalId || !ward) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_URL}/api/doctor/discharged-patients`,
        { 
          params: {
            hospital_id: hospitalId,
            ward: ward
          },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );
      
      if (res.data.success) {
        setLocalDischarges(res.data.patients || []);
      }
    } catch (error) {
      console.error('Error fetching discharged patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      fetchDischarges();
    }
  };

  // Filter discharges based on selection
  const filteredDischarges = localDischarges.filter(d => {
    if (filter === 'today') {
      const today = new Date().toDateString();
      const dischargeDate = d.discharge_date ? new Date(d.discharge_date).toDateString() : null;
      return dischargeDate === today;
    }
    if (filter === 'pending') {
      return d.status === 'pending_pharmacy' || d.pharmacy_status?.pending_count > 0;
    }
    return true; // 'all' filter
  });

  const getStatusColor = (status) => {
    const colors = {
      'completed': '#10b981',
      'pending_pharmacy': '#f59e0b',
      'referred': '#8b5cf6',
      'discharged': '#10b981',
      'admitted': '#3b82f6',
      'deceased': '#6b7280'
    };
    return colors[status] || '#64748b';
  };

  const getStatusText = (patient) => {
    if (patient.discharge_location === 'Deceased') return 'Deceased';
    if (patient.status === 'discharged') return 'Discharged';
    if (patient.status === 'referred') return 'Referred';
    if (patient.pharmacy_status?.pending_count > 0) return 'Pending Pharmacy';
    return patient.status || 'Completed';
  };

  const getStatusIcon = (patient) => {
    if (patient.discharge_location === 'Deceased') return '⚰️';
    if (patient.status === 'discharged') return '✅';
    if (patient.status === 'referred') return '🔄';
    if (patient.pharmacy_status?.pending_count > 0) return '⏳';
    return '📋';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const toggleExpand = (patientId) => {
    if (expandedPatient === patientId) {
      setExpandedPatient(null);
    } else {
      setExpandedPatient(patientId);
    }
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px 24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
        <p style={{ color: '#64748b' }}>Loading discharge list...</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
            📋 Discharge List - {ward} Ward
          </h3>
          <span style={{
            backgroundColor: '#e2e8f0',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.875rem'
          }}>
            {filteredDischarges.length} patients
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setFilter('today')} 
            style={{
              padding: '8px 16px',
              backgroundColor: filter === 'today' ? '#3b82f6' : '#f1f5f9',
              color: filter === 'today' ? 'white' : '#475569',
              border: 'none',
              borderRadius: '40px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            Today
          </button>
          <button 
            onClick={() => setFilter('pending')} 
            style={{
              padding: '8px 16px',
              backgroundColor: filter === 'pending' ? '#f59e0b' : '#f1f5f9',
              color: filter === 'pending' ? 'white' : '#475569',
              border: 'none',
              borderRadius: '40px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            Pending
          </button>
          <button 
            onClick={() => setFilter('all')} 
            style={{
              padding: '8px 16px',
              backgroundColor: filter === 'all' ? '#64748b' : '#f1f5f9',
              color: filter === 'all' ? 'white' : '#475569',
              border: 'none',
              borderRadius: '40px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            All
          </button>
          <button 
            onClick={handleRefresh}
            style={{
              padding: '8px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '40px',
              cursor: 'pointer',
              fontSize: '1rem',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              hover: { backgroundColor: '#e2e8f0' }
            }}
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {filteredDischarges.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '2px dashed #e2e8f0'
        }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📭</span>
          <p style={{ fontSize: '18px', color: '#64748b', marginBottom: '8px' }}>No discharges found</p>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            {filter === 'today' ? 'No patients discharged today' : 
             filter === 'pending' ? 'No pending pharmacy discharges' : 
             'No discharge records available'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredDischarges.map(patient => (
            <div key={patient.id} style={{
              padding: '16px',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              cursor: 'pointer'
            }}
            onClick={() => toggleExpand(patient.id)}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: expandedPatient === patient.id ? '12px' : '0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span style={{ fontSize: '1.2rem' }}>{getStatusIcon(patient)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1rem' }}>{patient.patient_name}</strong>
                      <span style={{
                        backgroundColor: getStatusColor(patient.status),
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {getStatusText(patient)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
                      {patient.diagnosis || 'Diagnosis not recorded'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {formatDate(patient.discharge_date || patient.updatedAt)}
                  </span>
                  <span style={{ fontSize: '1rem', color: '#94a3b8' }}>
                    {expandedPatient === patient.id ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {expandedPatient === patient.id && (
                <div style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #e2e8f0',
                  fontSize: '0.875rem'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div>
                      <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.75rem' }}>Discharge Location</p>
                      <p style={{ margin: 0, fontWeight: '500' }}>{patient.discharge_location || 'Home'}</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.75rem' }}>Discharged By</p>
                      <p style={{ margin: 0, fontWeight: '500' }}>Dr. {patient.doctor_name}</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.75rem' }}>Prescriptions</p>
                      <p style={{ margin: 0, fontWeight: '500' }}>{patient.prescriptions?.length || 0} medications</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.75rem' }}>Pharmacy Status</p>
                      <p style={{ margin: 0, fontWeight: '500' }}>
                        {patient.pharmacy_status?.pending_count > 0 
                          ? `${patient.pharmacy_status.pending_count} pending` 
                          : 'All dispensed'}
                      </p>
                    </div>
                    {patient.discharge_notes && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.75rem' }}>Discharge Notes</p>
                        <p style={{ margin: 0, fontStyle: 'italic' }}>{patient.discharge_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DischargeList;