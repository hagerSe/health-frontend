import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSpinner, FaBed, FaCheck, FaTools, FaUser, FaCalendarAlt, FaSync } from 'react-icons/fa';

const BedSelection = ({ ward, hospitalId, onBedSelect, selectedBed, title = "Select Bed" }) => {
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = 'http://localhost:5001';

  useEffect(() => {
    if (ward && hospitalId) {
      fetchAvailableBeds();
    }
  }, [ward, hospitalId]);

  const fetchAvailableBeds = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      console.log(`🔍 Fetching available beds for ${ward} ward`);
      
      const res = await axios.get(`${API_URL}/api/doctor/available-beds`, {
        params: {
          ward: ward,
          hospital_id: hospitalId
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        console.log(`✅ Found ${res.data.beds.length} available beds in ${ward} ward`);
        setBeds(res.data.beds);
        if (res.data.beds.length === 0) {
          setError('No beds available in this ward');
        }
      } else {
        setError('Failed to load beds');
      }
    } catch (error) {
      console.error('❌ Error fetching beds:', error);
      setError(error.response?.data?.message || 'Could not load beds');
    } finally {
      setLoading(false);
    }
  };

  const getBedIcon = (status) => {
    switch(status) {
      case 'available': return <FaCheck className="text-green-500" />;
      case 'occupied': return <FaUser className="text-red-500" />;
      case 'maintenance': return <FaTools className="text-gray-500" />;
      case 'reserved': return <FaCalendarAlt className="text-blue-500" />;
      default: return <FaBed className="text-gray-400" />;
    }
  };

  const getBedTypeText = (type) => {
    const types = {
      general: 'General',
      private: 'Private',
      'semi-private': 'Semi-Private',
      icu: 'ICU',
      isolation: 'Isolation'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <FaSpinner className="animate-spin text-amber-500 mx-auto mb-2" />
        <p className="text-xs text-gray-500">Loading beds...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-red-500 mb-2">{error}</p>
        <button
          onClick={fetchAvailableBeds}
          className="text-xs text-blue-500 hover:text-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (beds.length === 0) {
    return (
      <div className="text-center py-4">
        <FaBed className="text-2xl text-gray-300 mx-auto mb-2" />
        <p className="text-xs text-gray-500">No available beds in {ward} ward</p>
        <p className="text-xs text-gray-400 mt-1">Patient will be processed without bed assignment</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2">
        <p className="text-xs font-medium text-gray-600">{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {beds.map(bed => {
          const isAvailable = bed.status === 'available';
          const isSelected = selectedBed === bed.id;
          
          return (
            <div
              key={bed.id}
              onClick={() => isAvailable && onBedSelect(bed.id)}
              className={`border rounded-lg p-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-amber-500 bg-amber-50'
                  : isAvailable
                  ? 'border-green-200 hover:border-green-500 hover:bg-green-50'
                  : 'border-gray-200 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Bed {bed.number}</span>
                <span className="text-sm">{getBedIcon(bed.status)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {getBedTypeText(bed.type)}
              </div>
              {bed.status === 'available' && (
                <div className="text-xs text-green-600 mt-1">
                  ✓ Available
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-center">
        <button
          onClick={fetchAvailableBeds}
          className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
        >
          <FaSync className="text-xs" /> Refresh
        </button>
      </div>
      <div className="mt-2 text-xs text-gray-400 text-center">
        {beds.filter(b => b.status === 'available').length} bed(s) available
      </div>
    </div>
  );
};

export default BedSelection;