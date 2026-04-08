import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSpinner } from 'react-icons/fa';

const StaffDashboard = ({ user }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Redirect based on department
    const department = user.department?.toLowerCase();
    
    const departmentRoutes = {
      'doctor': '/staff/doctor-dashboard',
      'nurse': '/staff/nurse-dashboard',
      'pharma': '/staff/pharma-dashboard',
      'lab': '/staff/lab-dashboard',
      'radio': '/staff/radio-dashboard',
      'midwife': '/staff/midwife-dashboard',
      'triage': '/staff/triage-dashboard',
      'cardofffice': '/staff/card-office-dashboard',
      'bed_management': '/staff/bed-management-dashboard',
      'human_resource': '/staff/hr-dashboard'
    };

    const targetRoute = departmentRoutes[department] || '/staff/default-dashboard';
    navigate(targetRoute);
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-100">
      <div className="text-center">
        <FaSpinner className="animate-spin text-4xl text-teal-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to your department dashboard...</p>
      </div>
    </div>
  );
};

export default StaffDashboard;