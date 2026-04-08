// src/components/PharmacyStatus.jsx
import React from 'react';

const PharmacyStatus = ({ prescriptions }) => {
  const getStatusIcon = (status) => {
    const icons = {
      'sent': '📤',
      'received': '📦',
      'processing': '⚙️',
      'dispensed': '✅',
      'pending': '⏳'
    };
    return icons[status] || '⏳';
  };

  const getStatusColor = (status) => {
    const colors = {
      'sent': '#f59e0b',
      'received': '#3b82f6',
      'processing': '#8b5cf6',
      'dispensed': '#10b981',
      'pending': '#94a3b8'
    };
    return colors[status] || '#94a3b8';
  };

  const getStatusText = (status) => {
    const texts = {
      'sent': 'Sent to Pharmacy',
      'received': 'Received by Pharmacy',
      'processing': 'Processing',
      'dispensed': 'Dispensed - Ready for Pickup',
      'pending': 'Pending'
    };
    return texts[status] || status;
  };

  const allDispensed = prescriptions.every(p => p.status === 'dispensed');
  const sentCount = prescriptions.filter(p => p.status === 'sent').length;
  const receivedCount = prescriptions.filter(p => p.status === 'received').length;
  const processingCount = prescriptions.filter(p => p.status === 'processing').length;
  const dispensedCount = prescriptions.filter(p => p.status === 'dispensed').length;

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '24px',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>💊</span> Pharmacy Status
        </h4>
        {allDispensed ? (
          <span style={{
            backgroundColor: '#10b981',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            ✓ All Medications Ready
          </span>
        ) : (
          <span style={{
            backgroundColor: '#f59e0b',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            ⏳ Awaiting Pharmacy
          </span>
        )}
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>{sentCount}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Sent</div>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>{receivedCount}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Received</div>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#8b5cf6' }}>{processingCount}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Processing</div>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{dispensedCount}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Dispensed</div>
        </div>
      </div>

      {/* Prescription List */}
      <div style={{ display: 'grid', gap: '12px' }}>
        {prescriptions.map(prescription => (
          <div key={prescription.id} style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'white'
          }}>
            <div>
              <p style={{ fontWeight: '600', margin: '0 0 4px' }}>
                {prescription.name} {prescription.dosage}
              </p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                {prescription.frequency} • {prescription.route}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>{getStatusIcon(prescription.status)}</span>
              <span style={{
                padding: '4px 12px',
                backgroundColor: `${getStatusColor(prescription.status)}20`,
                color: getStatusColor(prescription.status),
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {getStatusText(prescription.status)}
              </span>
              {prescription.pharmacy_notes && (
                <span style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                  maxWidth: '200px'
                }}>
                  📝 {prescription.pharmacy_notes}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PharmacyStatus;