// File: C:/Users/fmgt/OneDrive/Desktop/Project/frontend/src/components/EthiopianHierarchySelector.jsx

import React, { useState } from 'react';

const EthiopianHierarchySelector = ({ onSelect }) => {
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedWoreda, setSelectedWoreda] = useState('');
  const [selectedKebele, setSelectedKebele] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');

  const regions = [
    { id: 1, name: 'Tigray' },
    { id: 2, name: 'Afar' },
    { id: 3, name: 'Amhara' },
    { id: 4, name: 'Oromia' },
    { id: 5, name: 'Somali' },
    { id: 6, name: 'Benishangul-Gumuz' },
    { id: 7, name: 'SNNPR' },
    { id: 8, name: 'Gambella' },
    { id: 9, name: 'Harari' },
    { id: 10, name: 'Addis Ababa' },
    { id: 11, name: 'Dire Dawa' },
    { id: 12, name: 'Sidama' },
    { id: 13, name: 'South West' }
  ];

  const zones = {
    3: [
      { id: 101, name: 'North Gondar' },
      { id: 102, name: 'South Gondar' },
      { id: 103, name: 'North Wollo' },
      { id: 104, name: 'South Wollo' },
      { id: 105, name: 'North Shewa' },
      { id: 106, name: 'East Gojjam' },
      { id: 107, name: 'West Gojjam' },
      { id: 108, name: 'Wag Hemra' },
      { id: 109, name: 'Awi' },
      { id: 110, name: 'Oromia' }
    ]
  };

  const woredas = {
    101: [
      { id: 1001, name: 'Dembiya' },
      { id: 1002, name: 'Gondar Zuria' },
      { id: 1003, name: 'Metema' }
    ]
  };

  const kebeles = {
    1001: [
      { id: 10001, name: 'Kebele 01' },
      { id: 10002, name: 'Kebele 02' },
      { id: 10003, name: 'Kebele 03' }
    ]
  };

  const hospitals = {
    10001: [
      { id: 1, name: 'Dembiya General Hospital', type: 'Government', beds: 150 },
      { id: 2, name: 'Gondar University Hospital', type: 'Teaching', beds: 500 }
    ]
  };

  const handleRegionChange = (e) => {
    setSelectedRegion(e.target.value);
    setSelectedZone('');
    setSelectedWoreda('');
    setSelectedKebele('');
    setSelectedHospital('');
    onSelect(null);
  };

  const handleZoneChange = (e) => {
    setSelectedZone(e.target.value);
    setSelectedWoreda('');
    setSelectedKebele('');
    setSelectedHospital('');
    onSelect(null);
  };

  const handleWoredaChange = (e) => {
    setSelectedWoreda(e.target.value);
    setSelectedKebele('');
    setSelectedHospital('');
    onSelect(null);
  };

  const handleKebeleChange = (e) => {
    setSelectedKebele(e.target.value);
    setSelectedHospital('');
    onSelect(null);
  };

  const handleHospitalSelect = (hospitalId) => {
    setSelectedHospital(hospitalId);
    const hospital = hospitals[selectedKebele]?.find(h => h.id === parseInt(hospitalId));
    onSelect({
      hospital: hospital
    });
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div>
        <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
          Region
        </label>
        <select
          value={selectedRegion}
          onChange={handleRegionChange}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        >
          <option value="">Select Region</option>
          {regions.map(region => (
            <option key={region.id} value={region.id}>{region.name}</option>
          ))}
        </select>
      </div>

      {selectedRegion && zones[selectedRegion] && (
        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
            Zone
          </label>
          <select
            value={selectedZone}
            onChange={handleZoneChange}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="">Select Zone</option>
            {zones[selectedRegion].map(zone => (
              <option key={zone.id} value={zone.id}>{zone.name}</option>
            ))}
          </select>
        </div>
      )}

      {selectedZone && woredas[selectedZone] && (
        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
            Woreda
          </label>
          <select
            value={selectedWoreda}
            onChange={handleWoredaChange}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="">Select Woreda</option>
            {woredas[selectedZone].map(woreda => (
              <option key={woreda.id} value={woreda.id}>{woreda.name}</option>
            ))}
          </select>
        </div>
      )}

      {selectedWoreda && kebeles[selectedWoreda] && (
        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
            Kebele
          </label>
          <select
            value={selectedKebele}
            onChange={handleKebeleChange}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="">Select Kebele</option>
            {kebeles[selectedWoreda].map(kebele => (
              <option key={kebele.id} value={kebele.id}>{kebele.name}</option>
            ))}
          </select>
        </div>
      )}

      {selectedKebele && hospitals[selectedKebele] && (
        <div>
          <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
            Hospital
          </label>
          <div style={{ display: 'grid', gap: '8px' }}>
            {hospitals[selectedKebele].map(hospital => (
              <button
                key={hospital.id}
                onClick={() => handleHospitalSelect(hospital.id)}
                style={{
                  padding: '12px',
                  backgroundColor: selectedHospital === hospital.id ? '#10b981' : 'white',
                  color: selectedHospital === hospital.id ? 'white' : '#1f2937',
                  border: selectedHospital === hospital.id ? 'none' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <p style={{ fontWeight: '600', margin: '0 0 4px' }}>{hospital.name}</p>
                <p style={{ fontSize: '12px', margin: 0, color: selectedHospital === hospital.id ? 'rgba(255,255,255,0.9)' : '#64748b' }}>
                  {hospital.type} • {hospital.beds} beds
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EthiopianHierarchySelector;