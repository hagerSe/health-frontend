import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  FaCalendarAlt, FaUserMd, FaHospitalUser, FaClock, FaPlus, 
  FaEdit, FaTrash, FaSave, FaTimes, FaSync, FaSearch, 
  FaEye, FaCheck, FaBan, FaExchangeAlt, FaUserPlus,
  FaChevronLeft, FaChevronRight, FaPrint, FaFileExcel,
  FaBell, FaChartBar, FaUsers, FaBuilding, FaClock as FaClockIcon,
  FaFilter, FaDownload, FaUpload, FaCog, FaHistory
} from 'react-icons/fa';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const HRSchedulingDashboard = ({ user, onLogout }) => {
  // ==================== STATE MANAGEMENT ====================
  const [activeView, setActiveView] = useState('calendar');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [notification, setNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWard, setSelectedWard] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // ==================== DATA STATES ====================
  const [staff, setStaff] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [wards, setWards] = useState(['OPD', 'EME', 'ANC']);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [shiftSwaps, setShiftSwaps] = useState([]);
  const [stats, setStats] = useState({
    totalStaff: 0,
    onDuty: 0,
    onLeave: 0,
    shiftsToday: 0,
    pendingRequests: 0,
    staffByDepartment: [],
    upcomingShifts: []
  });
  
  // ==================== MODAL STATES ====================
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showStaffDetailsModal, setShowStaffDetailsModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [staffSchedules, setStaffSchedules] = useState([]);
  const [newStaff, setNewStaff] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    ward: '',
    role: '',
    max_hours_per_week: 40
  });
  
  // ==================== SHIFT DEFINITIONS ====================
  const shiftDefinitions = {
    'OPD': {
      morning: { name: 'Morning', start: '08:00', end: '14:00', color: '#10b981', icon: '🌅', hours: 6 },
      afternoon: { name: 'Afternoon', start: '14:00', end: '20:00', color: '#f59e0b', icon: '☀️', hours: 6 },
      night: { name: 'Night', start: '20:00', end: '08:00', color: '#ef4444', icon: '🌙', hours: 12 }
    },
    'EME': {
      morning: { name: 'Morning', start: '08:00', end: '14:00', color: '#ef4444', icon: '🌅', hours: 6 },
      afternoon: { name: 'Afternoon', start: '14:00', end: '20:00', color: '#f97316', icon: '☀️', hours: 6 },
      night: { name: 'Night', start: '20:00', end: '08:00', color: '#dc2626', icon: '🌙', hours: 12 }
    },
    'ANC': {
      morning: { name: 'Morning', start: '08:00', end: '14:00', color: '#8b5cf6', icon: '🌅', hours: 6 },
      afternoon: { name: 'Afternoon', start: '14:00', end: '20:00', color: '#a78bfa', icon: '☀️', hours: 6 },
      night: { name: 'Night', start: '20:00', end: '08:00', color: '#7c3aed', icon: '🌙', hours: 12 }
    }
  };

  // API Configuration
  const API_URL = 'http://localhost:5001';
  const socket = useRef(null);
  const navigate = useNavigate();

  // ==================== CONNECTION STATUS BANNER ====================
  const ConnectionStatusBanner = () => {
    if (connectionStatus === 'connected') return null;
    return (
      <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-2 rounded-full shadow-lg flex items-center gap-3 ${
        connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
      } text-white`}>
        <span>{connectionStatus === 'connecting' ? '🔄 Connecting...' : '⚠️ Disconnected'}</span>
        <button onClick={() => fetchAllData()} className="ml-2 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30">
          Retry
        </button>
      </div>
    );
  };

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    if (!user?.hospital_id) return;
    initializeSocket();
    fetchAllData();
    
    const interval = setInterval(() => fetchAllData(), 60000);
    return () => {
      if (socket.current) socket.current.disconnect();
      clearInterval(interval);
    };
  }, [user?.hospital_id]);

  const initializeSocket = () => {
    const token = localStorage.getItem('token');
    socket.current = io(API_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    socket.current.on('connect', () => {
      console.log('✅ HR Socket connected');
      setConnectionStatus('connected');
      socket.current.emit('join', `hospital_${user?.hospital_id}_hr`);
    });

    socket.current.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err);
      setConnectionStatus('disconnected');
    });
    
    socket.current.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnectionStatus('disconnected');
    });

    socket.current.on('schedule_updated', (data) => {
      console.log('📅 Schedule updated:', data);
      setNotification({ type: 'info', message: `Schedule updated: ${data.count || 'Changes'} made` });
      fetchAllData();
      setTimeout(() => setNotification(null), 5000);
    });

    socket.current.on('staff_updated', (data) => {
      console.log('👥 Staff updated:', data);
      setNotification({ type: 'success', message: `Staff ${data.action}: ${data.staff?.first_name} ${data.staff?.last_name}` });
      fetchStaff();
      setTimeout(() => setNotification(null), 5000);
    });

    socket.current.on('leave_request_updated', (data) => {
      console.log('📋 Leave request updated:', data);
      setNotification({ type: data.status === 'approved' ? 'success' : 'info', message: `Leave request ${data.status} for ${data.staff_name}` });
      fetchLeaveRequests();
      fetchSchedules();
      setTimeout(() => setNotification(null), 5000);
    });

    socket.current.on('shift_swap_request', (data) => {
      console.log('🔄 Shift swap request:', data);
      setNotification({ type: 'info', message: `Shift swap request from ${data.staff_name}` });
      fetchAllData();
      setTimeout(() => setNotification(null), 5000);
    });

    socket.current.on('new_schedule', (data) => {
      console.log('📅 New schedule assigned:', data);
      setNotification({ type: 'info', message: `New ${data.shift} shift scheduled on ${new Date(data.date).toLocaleDateString()} in ${data.ward} ward` });
      fetchSchedules();
      setTimeout(() => setNotification(null), 8000);
    });
  };

  // ==================== API CALLS ====================
  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStaff(),
      fetchSchedules(),
      fetchShiftTypes(),
      fetchLeaveRequests(),
      fetchStats()
    ]);
    setLoading(false);
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hr/staff`, {
        params: { hospital_id: user?.hospital_id },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setStaff(res.data.staff || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem('token');
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60);
      
      const res = await axios.get(`${API_URL}/api/hr/schedules`, {
        params: { 
          hospital_id: user?.hospital_id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSchedules(res.data.schedules || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchShiftTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hr/shifts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setShiftTypes(res.data.shifts || []);
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hr/leave-requests`, {
        params: { hospital_id: user?.hospital_id },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setLeaveRequests(res.data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hr/stats`, {
        params: { hospital_id: user?.hospital_id },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // ==================== STAFF SCHEDULE FETCH ====================
  const fetchStaffSchedule = async (staffMember) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60);
      
      const res = await axios.get(`${API_URL}/api/hr/schedules`, {
        params: {
          hospital_id: user?.hospital_id,
          staff_id: staffMember.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        const sortedSchedules = (res.data.schedules || []).sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        );
        setStaffSchedules(sortedSchedules);
        setViewingStaff(staffMember);
        setShowStaffDetailsModal(true);
      } else {
        setStaffSchedules([]);
        setViewingStaff(staffMember);
        setShowStaffDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching staff schedule:', error);
      setStaffSchedules([]);
      setViewingStaff(staffMember);
      setShowStaffDetailsModal(true);
    } finally {
      setLoading(false);
    }
  };

  // ==================== SCHEDULING LOGIC ====================
  const autoGenerateSchedule = async (startDate, endDate, ward) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/hr/schedule/auto-generate`, {
        hospital_id: user?.hospital_id,
        start_date: startDate,
        end_date: endDate,
        ward: ward,
        shift_definitions: shiftDefinitions
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.data.success) {
        setMessage({ type: 'success', text: `Generated ${res.data.schedules?.length || 0} shifts successfully!` });
        fetchSchedules();
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error generating schedule' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // ==================== STAFF MANAGEMENT ====================
  const addStaff = async () => {
    if (!newStaff.first_name || !newStaff.last_name || !newStaff.email) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/hr/staff`, {
        ...newStaff,
        hospital_id: user?.hospital_id
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.data.success) {
        setMessage({ type: 'success', text: `Staff added successfully! Password: ${res.data.staff.password}` });
        fetchStaff();
        setShowStaffModal(false);
        setNewStaff({
          first_name: '', last_name: '', email: '', phone: '', department: '', ward: '', role: '', max_hours_per_week: 40
        });
      }
    } catch (error) {
      console.error('Error adding staff:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error adding staff' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const updateSchedule = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/hr/schedule/${editingSchedule.id}`, {
        shift_type: editingSchedule.shift_type,
        status: editingSchedule.status
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Schedule updated!' });
        fetchSchedules();
        setShowScheduleModal(false);
        setEditingSchedule(null);
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      setMessage({ type: 'error', text: 'Error updating schedule' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const approveLeaveRequest = async (requestId, status) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/hr/leave-request/${requestId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setMessage({ type: 'success', text: `Leave request ${status}` });
        fetchLeaveRequests();
        fetchSchedules();
      }
    } catch (error) {
      console.error('Error approving leave:', error);
      setMessage({ type: 'error', text: 'Error processing leave request' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // ==================== CALENDAR EVENTS ====================
  const getCalendarEvents = () => {
    const events = [];
    
    schedules.forEach(schedule => {
      const shift = shiftDefinitions[schedule.ward]?.[schedule.shift_type];
      if (shift) {
        const startDateTime = new Date(schedule.date);
        const [startHour, startMinute] = shift.start.split(':');
        startDateTime.setHours(parseInt(startHour), parseInt(startMinute));
        
        let endDateTime = new Date(schedule.date);
        const [endHour, endMinute] = shift.end.split(':');
        endDateTime.setHours(parseInt(endHour), parseInt(endMinute));
        
        if (parseInt(endHour) < parseInt(startHour)) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }
        
        events.push({
          id: schedule.id,
          title: `${schedule.staff_name || schedule.staff?.full_name} - ${shift.name} (${schedule.ward})`,
          start: startDateTime,
          end: endDateTime,
          resource: schedule,
          color: shift.color
        });
      }
    });
    
    return events;
  };

  // ==================== HELPER FUNCTIONS ====================
  const getWeekNumber = (date) => {
    const d = new Date(date);
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // ==================== STAFF DETAILS MODAL ====================
  const StaffDetailsModalComponent = () => {
    if (!viewingStaff) return null;
    
    const today = new Date().toISOString().split('T')[0];
    const allSchedules = staffSchedules || [];
    
    const upcomingSchedules = allSchedules.filter(s => s.date >= today);
    const pastSchedules = allSchedules.filter(s => s.date < today);
    
    // Group schedules by week for upcoming
    const groupByWeek = (schedules) => {
      const weeks = {};
      schedules.forEach(schedule => {
        const weekNum = getWeekNumber(schedule.date);
        const year = new Date(schedule.date).getFullYear();
        const weekKey = `${year}-W${weekNum}`;
        if (!weeks[weekKey]) weeks[weekKey] = [];
        weeks[weekKey].push(schedule);
      });
      return weeks;
    };
    
    const upcomingWeeks = groupByWeek(upcomingSchedules);
    
    // Group past schedules by month
    const groupByMonth = (schedules) => {
      const months = {};
      schedules.forEach(schedule => {
        const date = new Date(schedule.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (!months[monthKey]) {
          months[monthKey] = { name: monthName, schedules: [] };
        }
        months[monthKey].schedules.push(schedule);
      });
      return months;
    };
    
    const pastMonths = groupByMonth(pastSchedules);
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
        <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-4 border-b z-10">
            <h3 className="text-xl font-semibold">Staff Schedule - {viewingStaff.first_name} {viewingStaff.last_name}</h3>
            <button onClick={() => setShowStaffDetailsModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>
          
          {/* Staff Info Card */}
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-violet-200 rounded-full flex items-center justify-center text-3xl font-bold text-violet-700">
                {viewingStaff.first_name?.[0]}{viewingStaff.last_name?.[0]}
              </div>
              <div>
                <h4 className="text-lg font-semibold">{viewingStaff.first_name} {viewingStaff.last_name}</h4>
                <p className="text-sm text-gray-600">{viewingStaff.role} • {viewingStaff.ward} Ward • {viewingStaff.department}</p>
                <p className="text-xs text-gray-500">{viewingStaff.email}</p>
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="border rounded-lg p-3 text-center bg-violet-50">
              <p className="text-2xl font-bold text-violet-600">{allSchedules.length}</p>
              <p className="text-xs text-gray-500">Total Shifts</p>
            </div>
            <div className="border rounded-lg p-3 text-center bg-green-50">
              <p className="text-2xl font-bold text-green-600">{upcomingSchedules.length}</p>
              <p className="text-xs text-gray-500">Upcoming</p>
            </div>
            <div className="border rounded-lg p-3 text-center bg-orange-50">
              <p className="text-2xl font-bold text-orange-600">{pastSchedules.length}</p>
              <p className="text-xs text-gray-500">Past</p>
            </div>
            <div className="border rounded-lg p-3 text-center bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">
                {allSchedules.filter(s => s.shift_type === 'night').length}
              </p>
              <p className="text-xs text-gray-500">Night Shifts</p>
            </div>
          </div>
          
          {/* Upcoming Schedule Section */}
          {upcomingSchedules.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <FaCalendarAlt className="text-green-500" /> Upcoming Shifts
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {upcomingSchedules.map(schedule => {
                  const shift = shiftDefinitions[schedule.ward]?.[schedule.shift_type];
                  const scheduleDate = new Date(schedule.date);
                  const isToday = schedule.date === today;
                  
                  return (
                    <div 
                      key={schedule.id} 
                      className={`border rounded-lg p-3 flex justify-between items-center ${
                        isToday ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:shadow-md'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {isToday && <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">Today</span>}
                          <p className="font-semibold">
                            {scheduleDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: shift?.color }}>
                            {shift?.icon} {shift?.name} ({shift?.start} - {shift?.end})
                          </span>
                          <span className="text-xs text-gray-500">📍 {schedule.ward} Ward</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            schedule.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                            schedule.status === 'completed' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {schedule.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{shift?.hours}h shift</p>
                        <p className="text-xs text-gray-400">ID: #{schedule.id}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Weekly View for Upcoming */}
          {Object.keys(upcomingWeeks).length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <FaCalendarAlt className="text-violet-500" /> Weekly View
              </h4>
              <div className="space-y-4">
                {Object.entries(upcomingWeeks).map(([weekKey, weekSchedules]) => {
                  const sortedWeekSchedules = weekSchedules.sort((a, b) => new Date(a.date) - new Date(b.date));
                  const startDate = new Date(sortedWeekSchedules[0].date);
                  const endDate = new Date(sortedWeekSchedules[sortedWeekSchedules.length - 1].date);
                  
                  return (
                    <details key={weekKey} className="border rounded-lg p-3">
                      <summary className="cursor-pointer text-sm text-gray-600 font-medium hover:text-violet-600">
                        Week {weekKey.split('-W')[1]} ({startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}) - {weekSchedules.length} shifts
                      </summary>
                      <div className="mt-3 space-y-2">
                        {sortedWeekSchedules.map(schedule => {
                          const shift = shiftDefinitions[schedule.ward]?.[schedule.shift_type];
                          const scheduleDate = new Date(schedule.date);
                          const dayName = scheduleDate.toLocaleDateString('en-US', { weekday: 'short' });
                          
                          return (
                            <div key={schedule.id} className="flex justify-between items-center border-b pb-2 hover:bg-gray-50 p-2 rounded">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium w-12">{dayName}</span>
                                <span className="text-sm">{scheduleDate.toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm" style={{ color: shift?.color }}>{shift?.name}</span>
                                <span className="text-xs text-gray-500">{schedule.ward}</span>
                                <span className="text-xs text-gray-400">{shift?.start} - {shift?.end}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Past Schedule Section by Month */}
          {pastSchedules.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <FaHistory className="text-gray-500" /> Past Shifts
              </h4>
              <details className="border rounded-lg p-3">
                <summary className="cursor-pointer text-sm text-gray-600 font-medium hover:text-violet-600">
                  Show {pastSchedules.length} past shift(s)
                </summary>
                <div className="mt-3 space-y-4">
                  {Object.values(pastMonths).map((month, idx) => (
                    <div key={idx}>
                      <h5 className="font-medium text-sm text-gray-500 mb-2">{month.name}</h5>
                      <div className="space-y-1 pl-2">
                        {month.schedules.map(schedule => {
                          const shift = shiftDefinitions[schedule.ward]?.[schedule.shift_type];
                          const scheduleDate = new Date(schedule.date);
                          
                          return (
                            <div key={schedule.id} className="border-l-4 border-gray-300 pl-3 py-1 hover:bg-gray-50">
                              <p className="text-sm font-medium">{scheduleDate.toLocaleDateString()}</p>
                              <p className="text-xs text-gray-500">
                                {shift?.name} ({shift?.start} - {shift?.end}) - {schedule.ward} Ward
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
          
          {/* No Schedule Message */}
          {allSchedules.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FaCalendarAlt className="text-5xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No schedule found for this staff member</p>
              <p className="text-xs text-gray-400 mt-1">Use "Auto-Schedule Week" to generate shifts for all staff</p>
            </div>
          )}
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button 
              onClick={() => {
                setShowStaffDetailsModal(false);
                autoGenerateSchedule(new Date(), new Date(Date.now() + 7*24*60*60*1000), 'all');
              }} 
              className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
            >
              <FaPlus className="inline mr-1" size={12} /> Generate Schedule
            </button>
            <button onClick={() => setShowStaffDetailsModal(false)} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==================== RENDER COMPONENTS ====================
  const StaffListView = () => {
    const filteredStaff = staff.filter(s =>
      (s.first_name + ' ' + s.last_name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.ward?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Staff Directory</h2>
            <button onClick={() => setShowStaffModal(true)} className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 flex items-center gap-2">
              <FaUserPlus /> Add Staff
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid gap-4">
            {filteredStaff.map(staffMember => (
              <div key={staffMember.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-semibold text-lg">{staffMember.first_name} {staffMember.last_name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        staffMember.role === 'Doctor' ? 'bg-blue-100 text-blue-800' :
                        staffMember.role === 'Nurse' ? 'bg-green-100 text-green-800' :
                        staffMember.role === 'Midwife' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>{staffMember.role || staffMember.department}</span>
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">{staffMember.ward} Ward</span>
                      <span className="px-2 py-1 rounded-full text-xs bg-violet-100 text-violet-600">{staffMember.department}</span>
                    </div>
                    <p className="text-sm text-gray-500">Email: {staffMember.email} | Phone: {staffMember.phone || 'N/A'}</p>
                    <p className="text-xs text-gray-400 mt-1">Max hours/week: {staffMember.max_hours_per_week}h | Status: {staffMember.status}</p>
                  </div>
                  <button 
                    onClick={() => fetchStaffSchedule(staffMember)} 
                    className="px-3 py-1 text-violet-500 hover:text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors flex items-center gap-1"
                    disabled={loading}
                  >
                    <FaEye size={12} /> View Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const WardView = () => {
    const getTodaySchedules = () => {
      const today = new Date().toISOString().split('T')[0];
      return schedules.filter(s => s.date === today);
    };
    
    const getUpcomingSchedules = () => {
      const today = new Date().toISOString().split('T')[0];
      return schedules.filter(s => s.date > today).slice(0, 10);
    };
    
    const allStaff = staff;
    const todaySchedules = getTodaySchedules();
    const upcomingSchedules = getUpcomingSchedules();
    
    return (
      <div className="space-y-6">
        {/* Today's Schedule - All Wards */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50">
            <h3 className="text-lg font-semibold">Today's Schedule - All Wards</h3>
            <p className="text-sm text-gray-500">{todaySchedules.length} shifts today</p>
          </div>
          <div className="p-4">
            {todaySchedules.length > 0 ? (
              <div className="space-y-2">
                {todaySchedules.map(schedule => {
                  const shift = shiftDefinitions[schedule.ward]?.[schedule.shift_type];
                  return (
                    <div key={schedule.id} className="text-sm p-3 rounded-lg flex items-center justify-between border" style={{ backgroundColor: `${shift?.color}10` }}>
                      <div>
                        <p className="font-medium">{schedule.staff_name || schedule.staff?.full_name}</p>
                        <p className="text-xs text-gray-500">{schedule.ward} Ward</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium" style={{ color: shift?.color }}>{shift?.name}</p>
                        <p className="text-xs text-gray-500">{shift?.start} - {shift?.end}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No shifts scheduled today</p>
            )}
          </div>
        </div>
        
        {/* Upcoming Shifts - All Wards */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50">
            <h3 className="text-lg font-semibold">Upcoming Shifts - All Wards</h3>
            <p className="text-sm text-gray-500">Next {upcomingSchedules.length} upcoming shifts</p>
          </div>
          <div className="p-4">
            {upcomingSchedules.length > 0 ? (
              <div className="space-y-2">
                {upcomingSchedules.map(schedule => {
                  const shift = shiftDefinitions[schedule.ward]?.[schedule.shift_type];
                  return (
                    <div key={schedule.id} className="text-sm p-3 rounded-lg flex items-center justify-between border hover:shadow-md">
                      <div>
                        <p className="font-medium">{schedule.staff_name || schedule.staff?.full_name}</p>
                        <p className="text-xs text-gray-500">{schedule.ward} Ward</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{new Date(schedule.date).toLocaleDateString()}</p>
                        <p className="text-sm" style={{ color: shift?.color }}>{shift?.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No upcoming shifts</p>
            )}
          </div>
        </div>
        
        {/* Staff List - All Staff */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50">
            <h3 className="text-lg font-semibold">All Staff Members</h3>
            <p className="text-sm text-gray-500">{allStaff.length} total staff</p>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allStaff.map(staffMember => (
                <div key={staffMember.id} className="text-sm p-2 rounded-lg border flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <p className="font-medium">{staffMember.first_name} {staffMember.last_name}</p>
                    <p className="text-xs text-gray-500">{staffMember.role} • {staffMember.ward}</p>
                  </div>
                  <button 
                    onClick={() => fetchStaffSchedule(staffMember)}
                    className="text-violet-500 hover:text-violet-700 text-xs"
                  >
                    <FaEye size={12} /> View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CalendarView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4" style={{ height: '70vh' }}>
      <Calendar
        localizer={localizer}
        events={getCalendarEvents()}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        views={['month', 'week', 'day']}
        defaultView={Views.MONTH}
        onSelectEvent={(event) => {
          setEditingSchedule(event.resource);
          setShowScheduleModal(true);
        }}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: event.color,
            borderRadius: '4px',
            border: 'none',
            color: 'white',
            fontWeight: '500'
          }
        })}
        formats={{
          eventTimeRangeFormat: (range) => {
            return `${moment(range.start).format('HH:mm')} - ${moment(range.end).format('HH:mm')}`;
          }
        }}
      />
    </div>
  );

  const LeaveRequestsView = () => {
    const pendingRequests = leaveRequests.filter(r => r.status === 'pending');
    const approvedRequests = leaveRequests.filter(r => r.status === 'approved');
    
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FaClockIcon className="text-yellow-500" /> Pending Leave Requests
              {pendingRequests.length > 0 && (
                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">{pendingRequests.length}</span>
              )}
            </h2>
          </div>
          <div className="p-6">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No pending leave requests</div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map(request => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-lg">{request.staff_name}</p>
                          <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">Pending</span>
                        </div>
                        <p className="text-sm text-gray-500">📅 From {new Date(request.start_date).toLocaleDateString()} to {new Date(request.end_date).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-500">📝 Reason: {request.reason || 'Not specified'}</p>
                        <p className="text-xs text-gray-400 mt-1">Requested on: {new Date(request.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveLeaveRequest(request.id, 'approved')} className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 flex items-center gap-1">
                          <FaCheck size={12} /> Approve
                        </button>
                        <button onClick={() => approveLeaveRequest(request.id, 'rejected')} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 flex items-center gap-1">
                          <FaTimes size={12} /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {approvedRequests.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FaCheck className="text-green-500" /> Approved Leave Requests
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {approvedRequests.map(request => (
                  <div key={request.id} className="border border-green-200 bg-green-50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{request.staff_name}</p>
                        <p className="text-xs text-gray-500">{new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}</p>
                      </div>
                      <span className="text-xs text-green-600">✓ Approved</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ShiftSwapRequestsView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Shift Swap Requests</h2>
      </div>
      <div className="p-6">
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FaExchangeAlt className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No pending shift swap requests</p>
          <p className="text-xs text-gray-400 mt-1">Shift swap requests will appear here when staff request to swap shifts</p>
        </div>
      </div>
    </div>
  );

  // ==================== MAIN RENDER ====================
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <ConnectionStatusBanner />
      
      <style>{`
        .rbc-event { padding: 2px 5px; font-size: 12px; }
        .rbc-calendar { background: white; border-radius: 12px; }
        .rbc-toolbar button { border-radius: 8px; }
        .rbc-toolbar button.rbc-active { background-color: #8b5cf6; color: white; }
        .rbc-toolbar button:hover { background-color: #e9d5ff; }
        .rbc-month-view { border-radius: 12px; }
        .rbc-header { padding: 8px; font-weight: 600; }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-violet-800 text-white transition-all duration-300 flex flex-col h-screen sticky top-0 shadow-xl`}>
        <div className={`${sidebarCollapsed ? 'py-5 px-0' : 'p-6'} border-b border-violet-700 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <FaCalendarAlt className="text-3xl text-violet-300" />
              <div>
                <h3 className="text-lg font-semibold">HR Scheduling</h3>
                <p className="text-xs text-violet-300">Staff Management</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && <FaCalendarAlt className="text-3xl" />}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-violet-300 hover:text-white">
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="p-4 bg-violet-900 m-4 rounded-xl">
            <p className="text-xs text-violet-300">Human Resources</p>
            <p className="text-sm font-medium">{user?.full_name}</p>
            <p className="text-xs text-violet-300 truncate">{user?.hospital_name}</p>
          </div>
        )}

        <div className={`flex-1 ${sidebarCollapsed ? 'py-4 px-0' : 'p-4'}`}>
          <div className="space-y-2">
            {[
              { id: 'calendar', icon: <FaCalendarAlt />, label: 'Calendar View', badge: null },
              { id: 'staff', icon: <FaUsers />, label: 'Staff Directory', badge: stats.totalStaff },
              { id: 'wards', icon: <FaBuilding />, label: 'Ward View', badge: wards.length },
              { id: 'leave', icon: <FaClockIcon />, label: 'Leave Requests', badge: leaveRequests.filter(r => r.status === 'pending').length },
              { id: 'swaps', icon: <FaExchangeAlt />, label: 'Shift Swaps', badge: 0 }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-lg transition-all ${activeView === item.id ? 'bg-violet-600' : 'hover:bg-violet-700'}`}
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
        </div>

        <div className={`${sidebarCollapsed ? 'py-4 px-0' : 'p-5'} border-t border-violet-700`}>
          <button
            onClick={onLogout}
            className={`w-full ${sidebarCollapsed ? 'py-3 px-0' : 'py-3 px-5'} bg-transparent border border-violet-600 rounded-lg text-red-400 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 text-sm transition-all hover:bg-red-500/20`}
          >
            <span>🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-500 text-white py-5 px-8 shadow-lg sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Staff Scheduling Dashboard</h1>
              <p className="text-violet-100 mt-1">Manage staff shifts and schedules • {user?.hospital_name}</p>
              <p className="text-violet-200 text-xs mt-1">
                {connectionStatus === 'connected' ? '🟢 Live Connection' : '🔴 Offline'}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <div className="text-xl font-bold">{stats.totalStaff}</div>
                <div className="text-xs">Total Staff</div>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <div className="text-xl font-bold text-green-300">{stats.onDuty}</div>
                <div className="text-xs">On Duty</div>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <div className="text-xl font-bold text-yellow-300">{stats.onLeave}</div>
                <div className="text-xs">On Leave</div>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <div className="text-xl font-bold text-blue-300">{stats.shiftsToday}</div>
                <div className="text-xs">Shifts Today</div>
              </div>
              <button 
                onClick={() => autoGenerateSchedule(new Date(), new Date(Date.now() + 7*24*60*60*1000), 'all')} 
                className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition-all flex items-center gap-2"
                disabled={loading}
              >
                <FaSync className={loading ? 'animate-spin' : ''} /> Auto-Schedule Week
              </button>
              <button 
                onClick={() => fetchAllData()} 
                className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition-all flex items-center gap-2"
                disabled={loading}
              >
                <FaSync className={loading ? 'animate-spin' : ''} size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className="fixed top-24 right-8 z-[1000] max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-slide-in border-l-4 border-blue-500">
            <div className="p-4 flex items-center gap-3">
              <span className="text-2xl">ℹ️</span>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{notification.message}</p>
              </div>
              <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-gray-800">×</button>
            </div>
          </div>
        )}

        {/* Message */}
        {message.text && (
          <div className={`fixed bottom-8 right-8 z-[1000] ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} py-3 px-6 rounded-lg shadow-md animate-slide-in`}>
            {message.text}
          </div>
        )}

        <div className="max-w-7xl mx-auto p-8">
          {/* Search Bar */}
          {(activeView === 'staff' || activeView === 'wards') && (
            <div className="mb-6 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, department, or ward..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          )}

          {/* View Renderer */}
          {activeView === 'calendar' && <CalendarView />}
          {activeView === 'staff' && <StaffListView />}
          {activeView === 'wards' && <WardView />}
          {activeView === 'leave' && <LeaveRequestsView />}
          {activeView === 'swaps' && <ShiftSwapRequestsView />}
        </div>
      </div>

      {/* Add Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Add New Staff</h3>
              <button onClick={() => setShowStaffModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="First Name *" value={newStaff.first_name} onChange={(e) => setNewStaff({...newStaff, first_name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg" />
                <input type="text" placeholder="Last Name *" value={newStaff.last_name} onChange={(e) => setNewStaff({...newStaff, last_name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg" />
              </div>
              <input type="email" placeholder="Email *" value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg" />
              <input type="tel" placeholder="Phone" value={newStaff.phone} onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg" />
              <select value={newStaff.department} onChange={(e) => setNewStaff({...newStaff, department: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg">
                <option value="">Select Department</option>
                <option value="Doctor">Doctor</option>
                <option value="Nurse">Nurse</option>
                <option value="Midwife">Midwife</option>
                <option value="Lab">Lab</option>
                <option value="Radio">Radio</option>
                <option value="Pharma">Pharma</option>
                <option value="Human_Resource">Human Resource</option>
              </select>
              <select value={newStaff.ward} onChange={(e) => setNewStaff({...newStaff, ward: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg">
                <option value="">Select Ward</option>
                {wards.map(w => <option key={w} value={w}>{w} Ward</option>)}
              </select>
              <select value={newStaff.role} onChange={(e) => setNewStaff({...newStaff, role: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg">
                <option value="">Select Role</option>
                <option value="Doctor">Doctor</option>
                <option value="Nurse">Nurse</option>
                <option value="Midwife">Midwife</option>
                <option value="Technician">Technician</option>
                <option value="Administrator">Administrator</option>
              </select>
              <input type="number" placeholder="Max Hours Per Week" value={newStaff.max_hours_per_week} onChange={(e) => setNewStaff({...newStaff, max_hours_per_week: parseInt(e.target.value)})} className="w-full p-3 border border-gray-200 rounded-lg" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowStaffModal(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={addStaff} className="px-4 py-2 bg-violet-500 text-white rounded-lg">Add Staff</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Schedule Modal */}
      {showScheduleModal && editingSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Edit Schedule</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <div className="space-y-4">
              <p><strong>Staff:</strong> {editingSchedule.staff_name}</p>
              <p><strong>Date:</strong> {new Date(editingSchedule.date).toLocaleDateString()}</p>
              <p><strong>Ward:</strong> {editingSchedule.ward}</p>
              <select 
                value={editingSchedule.shift_type} 
                onChange={(e) => setEditingSchedule({...editingSchedule, shift_type: e.target.value})} 
                className="w-full p-3 border border-gray-200 rounded-lg"
              >
                <option value="morning">Morning (8am-2pm)</option>
                <option value="afternoon">Afternoon (2pm-8pm)</option>
                <option value="night">Night (8pm-8am)</option>
              </select>
              <select 
                value={editingSchedule.status} 
                onChange={(e) => setEditingSchedule({...editingSchedule, status: e.target.value})} 
                className="w-full p-3 border border-gray-200 rounded-lg"
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={updateSchedule} className="px-4 py-2 bg-violet-500 text-white rounded-lg">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Details Modal */}
      {showStaffDetailsModal && <StaffDetailsModalComponent />}
    </div>
  );
};

export default HRSchedulingDashboard;