import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaHome, FaHospital, FaBell, FaUserCircle, FaSignOutAlt,
  FaInbox, FaPaperPlane, FaUsers, FaChartBar,
  FaPlus, FaSearch, FaChevronLeft, FaChevronRight,
  FaClock, FaExclamationTriangle,
  FaEnvelope, FaEnvelopeOpen, FaTimes, FaCheck, FaSpinner,
  FaUserMd, FaUserNurse, FaFlask, FaXRay, FaBaby,
  FaBed, FaUserTie, FaCreditCard,
  FaCalendarAlt, FaPhone, FaEnvelope as FaEnvelopeIcon,
  FaHeartbeat, FaPills, FaHospitalAlt,
  FaChartLine, FaFileExport, FaCalendarWeek,
  FaStethoscope, FaProcedures, FaUserInjured, FaEdit, FaSave, FaKey, FaCamera
} from 'react-icons/fa';

const HospitalDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [staff, setStaff] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showStaffDetailModal, setShowStaffDetailModal] = useState(false);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recipients, setRecipients] = useState([]);
  const [kebeleAdmin, setKebeleAdmin] = useState(null);
  const [staffByDepartment, setStaffByDepartment] = useState({});
  
  // Profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    age: '',
    phone: '',
    email: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // Report states
  const [reportSubTab, setReportSubTab] = useState('personnel');
  const [selectedWard, setSelectedWard] = useState('all');
  const [staffByWard, setStaffByWard] = useState({});
  const [selectedStaffType, setSelectedStaffType] = useState('Doctor');
  const [staffPerformanceData, setStaffPerformanceData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAgeInterval, setSelectedAgeInterval] = useState('all');
  const [ageFilteredStaff, setAgeFilteredStaff] = useState([]);
  
  // Send report states
  const [recipientType, setRecipientType] = useState(''); // 'kebele' or 'staff'
  const [reportFormData, setReportFormData] = useState({
    title: '',
    subject: '',
    body: '',
    priority: 'medium',
    recipient_type: '',
    recipient_id: ''
  });
  
  const noWardDepartments = ['Triage', 'Bed_Management', 'Human_Resource', 'Card_Office', 'Pharma', 'Lab', 'Radio'];
  
  const [staffFormData, setStaffFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: 'Male',
    age: '',
    email: '',
    password: '',
    phone: '',
    department: 'Doctor',
    ward: ''
  });

  const departmentIcons = {
    Doctor: <FaUserMd className="text-blue-500" />,
    Nurse: <FaUserNurse className="text-green-500" />,
    Pharma: <FaPills className="text-purple-500" />,
    Lab: <FaFlask className="text-yellow-500" />,
    Radio: <FaXRay className="text-indigo-500" />,
    Midwife: <FaBaby className="text-pink-500" />,
    Triage: <FaHeartbeat className="text-orange-500" />,
    Card_Office: <FaCreditCard className="text-red-500" />,
    Bed_Management: <FaBed className="text-teal-500" />,
    Human_Resource: <FaUserTie className="text-gray-500" />
  };

  const departmentColors = {
    Doctor: 'bg-blue-100 text-blue-800',
    Nurse: 'bg-green-100 text-green-800',
    Pharma: 'bg-purple-100 text-purple-800',
    Lab: 'bg-yellow-100 text-yellow-800',
    Radio: 'bg-indigo-100 text-indigo-800',
    Midwife: 'bg-pink-100 text-pink-800',
    Triage: 'bg-orange-100 text-orange-800',
    Card_Office: 'bg-red-100 text-red-800',
    Bed_Management: 'bg-teal-100 text-teal-800',
    Human_Resource: 'bg-gray-100 text-gray-800'
  };

  const wards = ['OPD', 'EME', 'ANC'];
  const staffTypes = ['Doctor', 'Nurse', 'Pharma'];
  const ageIntervals = [
    { label: 'All Ages', value: 'all' },
    { label: '20-30 years', value: '20-30', min: 20, max: 30 },
    { label: '31-40 years', value: '31-40', min: 31, max: 40 },
    { label: '41-50 years', value: '41-50', min: 41, max: 50 },
    { label: '51-60 years', value: '51-60', min: 51, max: 60 },
    { label: '60+ years', value: '60+', min: 61, max: 200 }
  ];

  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchProfile();
    if (activeTab === 'reports') {
      fetchReportsData();
      if (reportSubTab === 'personnel') {
        fetchPersonnelData();
      } else {
        fetchStatusData();
      }
      fetchRecommendations();
    }
    
    const interval = setInterval(() => {
      if (activeTab === 'reports') {
        autoRefreshData();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [activeTab, currentPage, searchTerm, departmentFilter, reportSubTab, selectedWard, selectedStaffType, dateRange]);

  useEffect(() => {
    processStaffStatistics();
    processStaffByWard();
  }, [staff]);

  useEffect(() => {
    filterStaffByAge();
  }, [staff, selectedWard, selectedAgeInterval]);

  const autoRefreshData = async () => {
    setRefreshing(true);
    await fetchPersonnelData();
    await fetchStatusData();
    await fetchRecommendations();
    setRefreshing(false);
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5001/api/hospital/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const hospital = res.data.hospital;
        setProfileData({
          first_name: hospital.first_name || '',
          middle_name: hospital.middle_name || '',
          last_name: hospital.last_name || '',
          gender: hospital.gender || '',
          age: hospital.age || '',
          phone: hospital.phone || '',
          email: hospital.email || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('http://localhost:5001/api/hospital/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setIsEditingProfile(false);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating profile');
    }
  };

  const changePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('New passwords do not match');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('http://localhost:5001/api/hospital/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setShowPasswordModal(false);
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        alert('Password changed successfully!');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error changing password');
    }
  };

  const filterStaffByAge = () => {
    let baseStaff = selectedWard === 'all' ? staff : (staffByWard[selectedWard] || []);
    
    if (selectedAgeInterval !== 'all') {
      const interval = ageIntervals.find(i => i.value === selectedAgeInterval);
      if (interval) {
        baseStaff = baseStaff.filter(member => {
          const age = parseInt(member.age);
          return age >= interval.min && age <= interval.max;
        });
      }
    }
    
    setAgeFilteredStaff(baseStaff);
  };

  const processStaffStatistics = () => {
    const byDept = {};
    
    staff.forEach(member => {
      if (!byDept[member.department]) {
        byDept[member.department] = {
          total: 0,
          male: 0,
          female: 0,
          other: 0,
          staff: [],
          wards: {},
          ages: []
        };
      }
      
      byDept[member.department].total++;
      byDept[member.department].staff.push(member);
      if (member.age && !isNaN(member.age)) {
        byDept[member.department].ages.push(parseInt(member.age));
      }
      
      if (member.gender === 'Male') byDept[member.department].male++;
      else if (member.gender === 'Female') byDept[member.department].female++;
      else byDept[member.department].other++;
      
      if (member.ward) {
        if (!byDept[member.department].wards[member.ward]) {
          byDept[member.department].wards[member.ward] = 0;
        }
        byDept[member.department].wards[member.ward]++;
      }
    });
    
    setStaffByDepartment(byDept);
  };

  const processStaffByWard = () => {
    const byWard = { OPD: [], EME: [], ANC: [] };
    
    staff.forEach(member => {
      if (member.ward && byWard[member.ward]) {
        byWard[member.ward].push(member);
      }
    });
    
    setStaffByWard(byWard);
  };

  const getGenderDistribution = () => {
    const filteredStaff = selectedWard === 'all' ? staff : (staffByWard[selectedWard] || []);
    
    return {
      male: filteredStaff.filter(s => s.gender === 'Male').length,
      female: filteredStaff.filter(s => s.gender === 'Female').length,
      other: filteredStaff.filter(s => s.gender !== 'Male' && s.gender !== 'Female').length
    };
  };

  const fetchPersonnelData = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.get('http://localhost:5001/api/hospital/staff', { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      console.error('Error fetching personnel data:', error);
    }
  };

  const fetchStatusData = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      
      let endpoint = '';
      
      if (selectedStaffType === 'Doctor') {
        endpoint = `http://localhost:5001/api/hospital/doctors/performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      } else if (selectedStaffType === 'Nurse') {
        endpoint = `http://localhost:5001/api/hospital/nurses/performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      } else if (selectedStaffType === 'Lab') {
        endpoint = `http://localhost:5001/api/hospital/lab/performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      } else if (selectedStaffType === 'Pharma') {
        endpoint = `http://localhost:5001/api/hospital/pharmacy/performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      } else if (selectedStaffType === 'Triage') {
        endpoint = `http://localhost:5001/api/hospital/triage/performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      }
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setStaffPerformanceData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching status data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [patientStatsRes, staffCountRes] = await Promise.all([
        axios.get('http://localhost:5001/api/hospital/patients/stats', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5001/api/hospital/staff/count-by-department', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const recommendationsList = [];
      
      if (patientStatsRes.data.success && staffCountRes.data.success) {
        const totalPatients = patientStatsRes.data.totalPatients || 0;
        const doctors = staffCountRes.data.data?.doctor || 0;
        const nurses = staffCountRes.data.data?.nurse || 0;
        
        const doctorRatio = totalPatients / (doctors || 1);
        const nurseRatio = totalPatients / (nurses || 1);
        
        if (doctorRatio > 20) {
          recommendationsList.push({
            type: 'warning',
            message: `⚠️ Doctor-to-Patient ratio is ${doctorRatio.toFixed(1)}:1. Recommended ratio is 1:20. Consider hiring ${Math.ceil(doctorRatio - 20)} more doctors.`
          });
        } else {
          recommendationsList.push({
            type: 'success',
            message: `✅ Doctor-to-Patient ratio is ${doctorRatio.toFixed(1)}:1. Optimal.`
          });
        }
        
        if (nurseRatio > 10) {
          recommendationsList.push({
            type: 'warning',
            message: `⚠️ Nurse-to-Patient ratio is ${nurseRatio.toFixed(1)}:1. Recommended ratio is 1:10. Consider hiring ${Math.ceil(nurseRatio - 10)} more nurses.`
          });
        } else {
          recommendationsList.push({
            type: 'success',
            message: `✅ Nurse-to-Patient ratio is ${nurseRatio.toFixed(1)}:1. Optimal.`
          });
        }
      }
      
      setRecommendations(recommendationsList);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [statsRes, inboxRes, outboxRes, staffRes, notifRes] = await Promise.all([
        axios.get('http://localhost:5001/api/hospital/dashboard/stats', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`http://localhost:5001/api/hospital/reports/inbox?page=${currentPage}&search=${searchTerm}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`http://localhost:5001/api/hospital/reports/outbox?page=${currentPage}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`http://localhost:5001/api/hospital/staff?page=${currentPage}&search=${searchTerm}&department=${departmentFilter}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5001/api/hospital/notifications?limit=5', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (inboxRes.data.success) {
        setInbox(inboxRes.data.reports);
        setTotalPages(inboxRes.data.totalPages);
        setUnreadCount(inboxRes.data.unreadCount);
      }
      if (outboxRes.data.success) setOutbox(outboxRes.data.reports);
      if (staffRes.data.success) {
        setStaff(staffRes.data.staff);
        setTotalPages(staffRes.data.totalPages);
      }
      if (notifRes.data.success) {
        setNotifications(notifRes.data.notifications);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportsData = async () => {
    // Keep existing fetchReportsData function
  };

  // NEW: Fetch kebele admin for this hospital
  const fetchKebeleAdmin = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5001/api/hospital/kebele-admin', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setKebeleAdmin(res.data.kebele_admin);
      }
    } catch (error) {
      console.error('Error fetching kebele admin:', error);
    }
  };

  // NEW: Fetch all staff in this hospital for sending reports
  const fetchAllStaffRecipients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5001/api/hospital/staff/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setRecipients(res.data.staff);
      }
    } catch (error) {
      console.error('Error fetching staff recipients:', error);
    }
  };

  // NEW: Send report to kebele or staff
  const handleSendReport = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      const res = await axios.post('http://localhost:5001/api/hospital/reports/send', {
        title: reportFormData.title,
        subject: reportFormData.subject,
        body: reportFormData.body,
        priority: reportFormData.priority,
        recipient_type: recipientType,
        recipient_id: reportFormData.recipient_id
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setShowReportModal(false);
        setRecipientType('');
        setReportFormData({
          title: '',
          subject: '',
          body: '',
          priority: 'medium',
          recipient_type: '',
          recipient_id: ''
        });
        alert('Report sent successfully!');
        fetchDashboardData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error sending report');
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const submitData = { ...staffFormData };
      
      if (noWardDepartments.includes(staffFormData.department)) {
        delete submitData.ward;
      }
      
      const res = await axios.post('http://localhost:5001/api/hospital/staff', submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setStaffFormData({
          first_name: '',
          middle_name: '',
          last_name: '',
          gender: 'Male',
          age: '',
          email: '',
          password: '',
          phone: '',
          department: 'Doctor',
          ward: ''
        });
        setShowStaffModal(false);
        fetchDashboardData();
        alert(`${staffFormData.department} staff member created successfully!`);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating staff member');
    }
  };

  const markNotificationAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5001/api/hospital/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5001/api/hospital/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    navigate('/login');
  };

  const exportToCSV = () => {
    // Keep existing export function
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800 animate-pulse'
    };
    return colors[priority] || colors.medium;
  };

  const getDepartmentIcon = (department) => {
    return departmentIcons[department] || <FaUserCircle className="text-gray-500" />;
  };

  const getDepartmentColor = (department) => {
    return departmentColors[department] || 'bg-gray-100 text-gray-800';
  };

  const departments = [
    'Doctor', 'Nurse', 'Pharma', 'Lab', 'Radio', 
    'Midwife', 'Triage', 'Card_Office', 'Bed_Management', 'Human_Resource'
  ];

  const viewStaffDetails = (staffMember) => {
    setSelectedStaff(staffMember);
    setShowStaffDetailModal(true);
  };

  const viewReportDetails = (report) => {
    setSelectedReport(report);
    setShowReportDetailModal(true);
  };

  const needsWardSelection = !noWardDepartments.includes(staffFormData.department);

  const renderAgeFilter = () => {
    const gender = getGenderDistribution();
    const total = gender.male + gender.female + gender.other;
    
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-700 text-sm mb-2">Filter by Age</h3>
            <select
              value={selectedAgeInterval}
              onChange={(e) => setSelectedAgeInterval(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {ageIntervals.map(interval => (
                <option key={interval.value} value={interval.value}>
                  {interval.label}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-gray-500">
              {ageFilteredStaff.length} staff members
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-700 text-sm mb-2">Gender Distribution</h3>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs">👨 Male</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${total > 0 ? (gender.male / total) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-xs font-bold">{gender.male}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs">👩 Female</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 rounded-full" style={{ width: `${total > 0 ? (gender.female / total) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-xs font-bold">{gender.female}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStaffCards = () => {
    if (ageFilteredStaff.length === 0) {
      return (
        <div className="text-center py-8">
          <FaUsers className="text-3xl text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No staff members in this category</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ageFilteredStaff.map((member) => (
          <div
            key={member.id}
            className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => viewStaffDetails(member)}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">
                {getDepartmentIcon(member.department)}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 text-sm">{member.full_name}</h4>
                <p className="text-xs text-blue-600">{member.department}</p>
              </div>
            </div>
            <div className="space-y-0.5 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <FaUserCircle className="text-gray-400 text-xs" />
                <span>{member.gender}, {member.age} yrs</span>
              </div>
              {member.ward && (
                <div className="flex items-center gap-1">
                  <FaHospitalAlt className="text-gray-400 text-xs" />
                  <span>Ward: {member.ward}</span>
                </div>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <span className={`text-xs px-2 py-0.5 rounded-full ${getDepartmentColor(member.department)}`}>
                {member.department}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStatusTable = () => {
    if (refreshing && staffPerformanceData.length === 0) {
      return (
        <div className="text-center py-8">
          <FaSpinner className="animate-spin text-2xl text-blue-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Loading performance data...</p>
        </div>
      );
    }
    
    if (staffPerformanceData.length === 0) {
      return (
        <div className="text-center py-8">
          <FaChartLine className="text-3xl text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No data available for {selectedStaffType}s</p>
        </div>
      );
    }
    
    if (selectedStaffType === 'Doctor') {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Doctor Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Admitted</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discharged</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Referred</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Severe</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staffPerformanceData.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => {
                  const staffMember = staff.find(s => s.id === doc.id);
                  if (staffMember) viewStaffDetails(staffMember);
                }}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                    <div className="text-xs text-gray-500">Doctor</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-600">{doc.admitted}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600">{doc.discharged}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-orange-600">{doc.referred}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${doc.severe > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {doc.severe}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-purple-600">{doc.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Staff Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Performance Metrics</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {staffPerformanceData.map((staff) => (
              <tr key={staff.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                  <div className="text-xs text-gray-500">{selectedStaffType}</div>
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {Object.entries(staff).filter(([key]) => !['id', 'name', 'total'].includes(key)).map(([key, val]) => (
                    <span key={key} className="inline-block mr-2 mb-1 text-xs">
                      {key}: <strong>{val}</strong>
                    </span>
                  ))}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-purple-600">{staff.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-100">
        <div className="text-center">
          <FaSpinner className="animate-spin text-3xl text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Loading Hospital Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className={`bg-gradient-to-b from-blue-900 to-blue-800 text-white transition-all duration-300 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <FaHospital className="text-xl" />
                <span className="font-bold text-base">Hospital Admin</span>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                activeTab === 'dashboard' ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
            >
              <FaHome className="text-lg" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                activeTab === 'staff' ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
            >
              <FaUsers className="text-lg" />
              {!sidebarCollapsed && <span>Staff</span>}
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                activeTab === 'reports' ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
            >
              <FaChartBar className="text-lg" />
              {!sidebarCollapsed && <span>Reports</span>}
            </button>

            <button
              onClick={() => setActiveTab('inbox')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors relative text-sm ${
                activeTab === 'inbox' ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
            >
              <FaInbox className="text-lg" />
              {!sidebarCollapsed && <span>Inbox</span>}
              {unreadCount > 0 && (
                <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('outbox')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                activeTab === 'outbox' ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
            >
              <FaPaperPlane className="text-lg" />
              {!sidebarCollapsed && <span>Outbox</span>}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                activeTab === 'profile' ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
            >
              <FaUserCircle className="text-lg" />
              {!sidebarCollapsed && <span>Profile</span>}
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-lg sticky top-0 z-40">
          <div className="px-6 py-3">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  {activeTab === 'dashboard' && 'Hospital Dashboard'}
                  {activeTab === 'staff' && 'Staff Management'}
                  {activeTab === 'reports' && 'Reports & Analytics'}
                  {activeTab === 'inbox' && 'Inbox'}
                  {activeTab === 'outbox' && 'Sent Reports'}
                  {activeTab === 'profile' && 'My Profile'}
                </h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  Welcome, {profileData.first_name || user?.full_name || 'Admin'}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {refreshing && (
                  <FaSpinner className="animate-spin text-blue-500 text-base" />
                )}
                <button
                  onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                  className="relative p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FaBell className="text-lg text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Notification Panel */}
        {showNotificationPanel && (
          <div className="absolute right-6 top-16 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
            <div className="p-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      !notif.is_read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => markNotificationAsRead(notif.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {notif.type === 'report_sent' && <FaPaperPlane className="text-blue-500 text-xs" />}
                        {notif.type === 'report_opened' && <FaEnvelopeOpen className="text-purple-500 text-xs" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <FaBell className="text-2xl mx-auto mb-2 text-gray-300" />
                  <p className="text-xs">No notifications</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-4">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div><p className="text-gray-500 text-xs">Inbox</p><p className="text-2xl font-bold text-blue-600">{stats?.inbox || 0}</p></div>
                    <FaInbox className="text-3xl text-blue-200" />
                  </div>
                  <div className="mt-1 flex gap-2 text-xs">
                    <span className="text-yellow-600">{stats?.unread || 0} unread</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div><p className="text-gray-500 text-xs">Outbox</p><p className="text-2xl font-bold text-green-600">{stats?.outbox || 0}</p></div>
                    <FaPaperPlane className="text-3xl text-green-200" />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div><p className="text-gray-500 text-xs">Total Staff</p><p className="text-2xl font-bold text-purple-600">{staff.length}</p></div>
                    <FaUsers className="text-3xl text-purple-200" />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div><p className="text-gray-500 text-xs">Departments</p><p className="text-2xl font-bold text-gray-600">{Object.keys(staffByDepartment).length}</p></div>
                    <FaHospitalAlt className="text-3xl text-gray-200" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-bold mb-3">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button onClick={() => { setShowReportModal(true); fetchKebeleAdmin(); fetchAllStaffRecipients(); }} className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">New Report</button>
                  <button onClick={() => { setActiveTab('staff'); setShowStaffModal(true); }} className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">Add Staff</button>
                  <button onClick={() => setActiveTab('reports')} className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">View Reports</button>
                </div>
              </div>
            </div>
          )}

          {/* Staff Tab */}
          {activeTab === 'staff' && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Staff Management</h2>
                <button onClick={() => setShowStaffModal(true)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm">+ Add Staff</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {staff.map((member) => (
                  <div key={member.id} className="bg-blue-50 rounded-lg p-3 cursor-pointer hover:shadow" onClick={() => viewStaffDetails(member)}>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">{getDepartmentIcon(member.department)}</div>
                      <div><h3 className="font-bold text-sm">{member.full_name}</h3><p className="text-xs text-gray-600">{member.department}</p></div>
                    </div>
                    <div className="mt-1 text-xs text-gray-600 truncate">{member.email}</div>
                    <div className="mt-1 flex justify-between text-xs"><span>{member.gender}, {member.age} yrs</span><span className={`px-2 py-0.5 rounded-full text-xs ${member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{member.status}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex gap-2">
                    <button onClick={() => setReportSubTab('personnel')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${reportSubTab === 'personnel' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                      <FaUsers className="inline mr-1 text-xs" /> Personnel
                    </button>
                    <button onClick={() => setReportSubTab('status')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${reportSubTab === 'status' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                      <FaChartLine className="inline mr-1 text-xs" /> Status
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowDatePicker(!showDatePicker)} className="px-2 py-1.5 bg-gray-100 rounded-lg text-sm"><FaCalendarWeek /></button>
                    <button onClick={exportToCSV} className="px-2 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm"><FaFileExport /></button>
                    <button onClick={autoRefreshData} className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm"><FaSpinner className={refreshing ? 'animate-spin' : ''} /></button>
                  </div>
                </div>
                {showDatePicker && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg flex gap-3">
                    <div><label className="block text-xs">Start Date</label><input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})} className="px-2 py-1 text-sm border rounded-lg" /></div>
                    <div><label className="block text-xs">End Date</label><input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})} className="px-2 py-1 text-sm border rounded-lg" /></div>
                    <button onClick={() => { fetchStatusData(); setShowDatePicker(false); }} className="self-end px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">Apply</button>
                  </div>
                )}
              </div>

              {reportSubTab === 'personnel' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg shadow p-4">
                    <h2 className="text-lg font-bold mb-3">Staff by Ward</h2>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedWard('all')} className={`px-3 py-1 rounded-lg text-sm ${selectedWard === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>All Staff ({staff.length})</button>
                      {wards.map(ward => <button key={ward} onClick={() => setSelectedWard(ward)} className={`px-3 py-1 rounded-lg text-sm ${selectedWard === ward ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{ward} ({staffByWard[ward]?.length || 0})</button>)}
                    </div>
                  </div>

                  {renderAgeFilter()}
                  
                  <div className="bg-white rounded-lg shadow p-4">
                    <h2 className="text-lg font-bold mb-3">{selectedWard === 'all' ? 'All Staff' : `${selectedWard} Ward Staff`}</h2>
                    {renderStaffCards()}
                  </div>

                  {recommendations.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-4">
                      <h2 className="text-lg font-bold mb-3">Staff-to-Patient Ratio Recommendations</h2>
                      {recommendations.map((rec, idx) => (
                        <div key={idx} className={`p-3 rounded-lg text-sm ${rec.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-500' : 'bg-green-50 border-l-4 border-green-500'}`}>
                          <p className={rec.type === 'warning' ? 'text-yellow-800' : 'text-green-800'}>{rec.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {reportSubTab === 'status' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg shadow p-4">
                    <h2 className="text-lg font-bold mb-3">Staff Performance by Type</h2>
                    <div className="flex gap-2 flex-wrap">
                      {staffTypes.map(type => (
                        <button key={type} onClick={() => { setSelectedStaffType(type); fetchStatusData(); }} className={`px-3 py-1 rounded-lg text-sm font-medium ${selectedStaffType === type ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                          {type === 'Doctor' && <FaUserMd className="inline mr-1 text-xs" />}
                          {type === 'Nurse' && <FaUserNurse className="inline mr-1 text-xs" />}
                          {type === 'Lab' && <FaFlask className="inline mr-1 text-xs" />}
                          {type === 'Pharma' && <FaPills className="inline mr-1 text-xs" />}
                          {type === 'Triage' && <FaHeartbeat className="inline mr-1 text-xs" />}
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h2 className="text-lg font-bold">{selectedStaffType} Performance Report <span className="text-xs font-normal text-gray-500">({dateRange.startDate} to {dateRange.endDate})</span></h2>
                      <div className="text-xs text-gray-500">Total: {staffPerformanceData.length}</div>
                    </div>
                    {renderStatusTable()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inbox Tab */}
          {activeTab === 'inbox' && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Inbox</h2>
                <button onClick={() => { setShowReportModal(true); fetchKebeleAdmin(); fetchAllStaffRecipients(); }} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">+ New Report</button>
              </div>
              {inbox.map((report) => (
                <div key={report.id} className="border rounded-lg p-3 mb-2 cursor-pointer hover:shadow-sm" onClick={() => viewReportDetails(report)}>
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-sm">{report.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityBadge(report.priority)}`}>{report.priority}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">From: {report.sender_full_name}</p>
                  <p className="text-xs text-gray-500">{new Date(report.sent_at).toLocaleString()}</p>
                </div>
              ))}
              {inbox.length === 0 && <p className="text-center py-6 text-gray-500 text-sm">No reports in inbox</p>}
            </div>
          )}

          {/* Outbox Tab */}
          {activeTab === 'outbox' && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Sent Reports</h2>
                <button onClick={() => fetchDashboardData()} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">Refresh</button>
              </div>
              {outbox.map((report) => (
                <div key={report.id} className="border rounded-lg p-3 mb-2 cursor-pointer hover:shadow-sm" onClick={() => viewReportDetails(report)}>
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-sm">{report.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityBadge(report.priority)}`}>{report.priority}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">To: {report.recipient_full_name}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">Sent: {new Date(report.sent_at).toLocaleString()}</p>
                    <span className="text-xs text-gray-400">
                      {report.is_opened ? '✓ Opened' : '✗ Not opened'}
                    </span>
                  </div>
                </div>
              ))}
              {outbox.length === 0 && <p className="text-center py-6 text-gray-500 text-sm">No sent reports</p>}
            </div>
          )}

          {/* Profile Tab - Modern */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <FaUserCircle className="text-blue-600 text-5xl" />
                    </div>
                    <button className="absolute bottom-0 right-0 bg-blue-500 p-1.5 rounded-full text-white hover:bg-blue-600">
                      <FaCamera className="text-xs" />
                    </button>
                  </div>
                  <div className="ml-4 text-white">
                    <h2 className="text-xl font-bold">{profileData.first_name} {profileData.last_name}</h2>
                    <p className="text-blue-100 text-sm">Hospital Administrator</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Personal Information</h3>
                  {!isEditingProfile ? (
                    <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">
                      <FaEdit /> Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setIsEditingProfile(false)} className="px-3 py-1.5 border rounded-lg text-sm">Cancel</button>
                      <button onClick={updateProfile} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm">
                        <FaSave /> Save
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">First Name</label>
                    {isEditingProfile ? (
                      <input type="text" value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    ) : (
                      <p className="text-gray-800">{profileData.first_name || 'Not set'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Middle Name</label>
                    {isEditingProfile ? (
                      <input type="text" value={profileData.middle_name} onChange={(e) => setProfileData({...profileData, middle_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    ) : (
                      <p className="text-gray-800">{profileData.middle_name || 'Not set'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Last Name</label>
                    {isEditingProfile ? (
                      <input type="text" value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    ) : (
                      <p className="text-gray-800">{profileData.last_name || 'Not set'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Gender</label>
                    {isEditingProfile ? (
                      <select value={profileData.gender} onChange={(e) => setProfileData({...profileData, gender: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="">Select</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    ) : (
                      <p className="text-gray-800">{profileData.gender || 'Not set'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Age</label>
                    {isEditingProfile ? (
                      <input type="number" value={profileData.age} onChange={(e) => setProfileData({...profileData, age: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    ) : (
                      <p className="text-gray-800">{profileData.age || 'Not set'} years</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Phone</label>
                    {isEditingProfile ? (
                      <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    ) : (
                      <p className="text-gray-800">{profileData.phone || 'Not set'}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                    <p className="text-gray-800">{profileData.email}</p>
                  </div>
                </div>
                
                <hr className="my-4" />
                
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Security</h3>
                </div>
                
                <div>
                  <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm">
                    <FaKey /> Change Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Add Hospital Staff</h2><button onClick={() => setShowStaffModal(false)}><FaTimes /></button></div>
              <form onSubmit={handleCreateStaff} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><input type="text" placeholder="First Name" value={staffFormData.first_name} onChange={(e) => setStaffFormData({...staffFormData, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required /></div>
                  <div><input type="text" placeholder="Middle Name" value={staffFormData.middle_name} onChange={(e) => setStaffFormData({...staffFormData, middle_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><input type="text" placeholder="Last Name" value={staffFormData.last_name} onChange={(e) => setStaffFormData({...staffFormData, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required /></div>
                  <div><select value={staffFormData.gender} onChange={(e) => setStaffFormData({...staffFormData, gender: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"><option>Male</option><option>Female</option><option>Other</option></select></div>
                  <div><input type="number" placeholder="Age" value={staffFormData.age} onChange={(e) => setStaffFormData({...staffFormData, age: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required /></div>
                  <div className="md:col-span-2"><input type="email" placeholder="Email" value={staffFormData.email} onChange={(e) => setStaffFormData({...staffFormData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required /></div>
                  <div className="md:col-span-2"><input type="tel" placeholder="Phone" value={staffFormData.phone} onChange={(e) => setStaffFormData({...staffFormData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                  <div className="md:col-span-2"><select value={staffFormData.department} onChange={(e) => setStaffFormData({...staffFormData, department: e.target.value, ward: ''})} className="w-full px-3 py-2 border rounded-lg text-sm">{departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}</select></div>
                  {needsWardSelection && <div className="md:col-span-2"><select value={staffFormData.ward} onChange={(e) => setStaffFormData({...staffFormData, ward: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required><option value="">Select Ward</option>{wards.map(ward => <option key={ward} value={ward}>{ward}</option>)}</select></div>}
                  <div className="md:col-span-2"><input type="password" placeholder="Password" value={staffFormData.password} onChange={(e) => setStaffFormData({...staffFormData, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required minLength="6" /></div>
                </div>
                <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowStaffModal(false)} className="px-3 py-1.5 border rounded-lg text-sm">Cancel</button><button type="submit" className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm">Create Staff</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Send Report Modal - Simplified */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Send New Report</h2><button onClick={() => setShowReportModal(false)}><FaTimes /></button></div>
              <form onSubmit={handleSendReport} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Recipient Type</label>
                  <div className="flex gap-3">
                    {kebeleAdmin && (
                      <label className="flex items-center gap-2">
                        <input type="radio" value="kebele" checked={recipientType === 'kebele'} onChange={(e) => { setRecipientType(e.target.value); setReportFormData({...reportFormData, recipient_id: kebeleAdmin.id}); }} />
                        <span>Kebele Admin ({kebeleAdmin?.kebele_name})</span>
                      </label>
                    )}
                    <label className="flex items-center gap-2">
                      <input type="radio" value="staff" checked={recipientType === 'staff'} onChange={(e) => { setRecipientType(e.target.value); setReportFormData({...reportFormData, recipient_id: ''}); }} />
                      <span>Hospital Staff</span>
                    </label>
                  </div>
                </div>
                
                {recipientType === 'staff' && (
                  <select value={reportFormData.recipient_id} onChange={(e) => setReportFormData({...reportFormData, recipient_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required>
                    <option value="">Select Staff Member</option>
                    {recipients.map(s => <option key={s.id} value={s.id}>{s.full_name} - {s.department}</option>)}
                  </select>
                )}
                
                <select value={reportFormData.priority} onChange={(e) => setReportFormData({...reportFormData, priority: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <input type="text" placeholder="Title" value={reportFormData.title} onChange={(e) => setReportFormData({...reportFormData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                <textarea placeholder="Message" value={reportFormData.body} onChange={(e) => setReportFormData({...reportFormData, body: e.target.value})} rows="5" className="w-full px-3 py-2 border rounded-lg text-sm" required />
                <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowReportModal(false)} className="px-3 py-1.5 border rounded-lg text-sm">Cancel</button><button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">Send</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Staff Details Modal */}
      {showStaffDetailModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Staff Details</h2><button onClick={() => { setShowStaffDetailModal(false); setSelectedStaff(null); }}><FaTimes /></button></div>
              <div className="flex items-center gap-3 mb-4"><div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl">{getDepartmentIcon(selectedStaff.department)}</div><div><h3 className="text-lg font-bold">{selectedStaff.full_name}</h3><p className="text-blue-600 text-sm">{selectedStaff.department}</p>{selectedStaff.ward && <p className="text-xs text-gray-500">Ward: {selectedStaff.ward}</p>}</div></div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs">First Name</p><p className="font-medium">{selectedStaff.first_name}</p></div>
                  <div><p className="text-gray-500 text-xs">Last Name</p><p className="font-medium">{selectedStaff.last_name}</p></div>
                  <div><p className="text-gray-500 text-xs">Gender</p><p className="font-medium">{selectedStaff.gender}</p></div>
                  <div><p className="text-gray-500 text-xs">Age</p><p className="font-medium">{selectedStaff.age} years</p></div>
                </div>
              </div>
              <div className="mt-3"><h4 className="font-semibold text-sm">Contact</h4><div className="flex items-center gap-2 mt-1 text-sm"><FaEnvelopeIcon className="text-gray-400 text-xs" /><span>{selectedStaff.email}</span></div>{selectedStaff.phone && <div className="flex items-center gap-2 mt-1 text-sm"><FaPhone className="text-gray-400 text-xs" /><span>{selectedStaff.phone}</span></div>}</div>
            </div>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Report Details</h2><button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }}><FaTimes /></button></div>
              <div className="space-y-3">
                <div className="flex justify-between"><span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityBadge(selectedReport.priority)}`}>{selectedReport.priority}</span><span className="text-xs text-gray-500">{new Date(selectedReport.sent_at).toLocaleString()}</span></div>
                <h3 className="text-base font-semibold">{selectedReport.title}</h3>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm whitespace-pre-line">{selectedReport.body}</p></div>
                <div className="text-sm"><p><strong>From:</strong> {selectedReport.sender_full_name}</p><p><strong>To:</strong> {selectedReport.recipient_full_name}</p><p><strong>Status:</strong> {selectedReport.status}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Change Password</h2><button onClick={() => setShowPasswordModal(false)}><FaTimes /></button></div>
              <div className="space-y-3">
                <input type="password" placeholder="Current Password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                <input type="password" placeholder="New Password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                <input type="password" placeholder="Confirm New Password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                <div className="flex justify-end gap-3"><button onClick={() => setShowPasswordModal(false)} className="px-3 py-1.5 border rounded-lg text-sm">Cancel</button><button onClick={changePassword} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">Change Password</button></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalDashboard;