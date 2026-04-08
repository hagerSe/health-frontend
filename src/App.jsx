import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Contact from'./pages/Contact';
import Login from './pages/Login';
import About from './pages/About';
import FederalDashboard from './components/FederalDashboard';
import RegionalDashboard from './components/RegionalDashboard';
import ZoneDashboard from './components/ZoneDashboard';
import WoredaDashboard from './components/WoredaDashboard';
import KebeleDashboard from './components/KebeleDashboard';
import HospitalDashboard from './components/HospitalDashboard';

import DoctorDashboard from './components/DoctorDashboard';
import NurseDashboard from './components/NurseDashboard';
import PharmaDashboard from './components/PharmaDashboard';
import LabDashboard from './components/LabDashboard';
import RadioDashboard from './components/RadioDashboard';
import MidwifeDashboard from './components/MidwifeDashboard';
import TriageDashboard from './components/TriageDashboard';
import CardOfficeStaffDashboard from './components/CardOfficeStaffDashboard'; // Add this import
import BedManagementDashboard from './components/BedManagementDashboard';
import HRDashboard from './components/HRDashboard';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on app load
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <Routes>
        {/* Public Routes */}
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login setAdmin={setUser} />} />
         <Route path='/contact' element={<Contact setAdmin={setUser} />} />
           <Route path='/about' element={<About setAdmin={setUser} />} />
        {/* Protected Routes - Admin Levels */}
        <Route 
          path='/federal-dashboard' 
          element={
            user?.userType === 'federal' ? 
            <FederalDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />
        
        <Route 
          path='/regional-dashboard' 
          element={
            user?.userType === 'regional' ? 
            <RegionalDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />
        
        <Route 
          path='/zone-dashboard' 
          element={
            user?.userType === 'zone' ? 
            <ZoneDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />
        
        <Route 
          path='/woreda-dashboard' 
          element={
            user?.userType === 'woreda' ? 
            <WoredaDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />
        
        <Route 
          path='/kebele-dashboard' 
          element={
            user?.userType === 'kebele' ? 
            <KebeleDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />
        
        <Route 
          path='/hospital-dashboard' 
          element={
            user?.userType === 'hospital' ? 
            <HospitalDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        {/* Card Office - Hospital Admin Access */}
     
        
        {/* Staff Department Routes */}
        <Route 
          path='/doctor-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Doctor' ? 
            <DoctorDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/nurse-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Nurse' ? 
            <NurseDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/pharma-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Pharma' ? 
            <PharmaDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/lab-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Lab' ? 
            <LabDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/radio-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Radio' ? 
            <RadioDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/midwife-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Midwife' ? 
            <MidwifeDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/triage-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Triage' ? 
            <TriageDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/card-office-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'cardofffice' ? 
            <CardOfficeStaffDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/bed-management-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Bed_Management' ? 
            <BedManagementDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/hr-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Human_Resource' ? 
            <HRDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />
        
        {/* Fallback staff dashboard - for any unmatched department */}
        <Route 
          path='/staff-dashboard' 
          element={
            user?.userType === 'staff' ? 
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                <h1 className="text-2xl font-bold text-blue-600 mb-4">Staff Dashboard</h1>
                <p className="text-gray-600 mb-4">Welcome, {user?.full_name}</p>
                <p className="text-gray-500">Department: {user?.department}</p>
                <p className="text-gray-400 mt-4 text-sm">Department-specific dashboard coming soon...</p>
                <button
                  onClick={handleLogout}
                  className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            </div> : 
            <Navigate to="/login" />
          } 
        />
        
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

export default App;