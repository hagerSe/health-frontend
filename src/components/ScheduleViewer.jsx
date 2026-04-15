import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaClock, FaSun, FaMoon, FaCloudSun, FaSpinner, FaBell, FaSync } from 'react-icons/fa';

const ScheduleViewer = ({ user, compact = false }) => {
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('today');
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Generate mock schedule data
  const generateMockSchedule = () => {
    const shifts = ['morning', 'afternoon', 'night'];
    const shiftNames = { morning: 'Morning', afternoon: 'Afternoon', night: 'Night' };
    const shiftTimes = { morning: '08:00 - 16:00', afternoon: '13:00 - 21:00', night: '22:00 - 06:00' };
    const wards = ['OPD', 'EME', 'ANC'];
    
    const schedules = [];
    const today = new Date();
    
    // Generate for next 14 days
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Add schedule for weekdays (Monday-Friday)
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const shiftType = shifts[Math.floor(Math.random() * shifts.length)];
        schedules.push({
          id: `shift_${i}`,
          shift_type: shiftType,
          shift_name: shiftNames[shiftType],
          start_time: shiftTimes[shiftType].split(' - ')[0],
          end_time: shiftTimes[shiftType].split(' - ')[1],
          hours: 8,
          ward: wards[Math.floor(Math.random() * wards.length)],
          date: dateStr,
          status: i === 0 ? 'ongoing' : 'scheduled'
        });
      }
    }
    
    return schedules;
  };

  const [schedules, setSchedules] = useState([]);
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load mock data
    setTimeout(() => {
      const mockSchedules = generateMockSchedule();
      setSchedules(mockSchedules);
      calculateStats(mockSchedules);
      generateMockNotifications();
      setLoading(false);
    }, 500);
  }, []);

  const calculateStats = (scheds) => {
    const today = new Date().toISOString().split('T')[0];
    const todayShifts = scheds.filter(s => s.date === today);
    
    // This week (Sunday to Saturday)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    const thisWeekShifts = scheds.filter(s => {
      const shiftDate = new Date(s.date);
      return shiftDate >= weekStart && shiftDate < weekEnd;
    });
    
    // Next week
    const nextWeekStart = new Date(weekEnd);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekStart.getDate() + 7);
    
    const nextWeekShifts = scheds.filter(s => {
      const shiftDate = new Date(s.date);
      return shiftDate >= nextWeekStart && shiftDate < nextWeekEnd;
    });
    
    // Upcoming (next 7 days from today)
    const upcomingShifts = scheds.filter(s => {
      const shiftDate = new Date(s.date);
      return shiftDate >= now;
    });
    
    setStats({
      today: { shift_count: todayShifts.length, total_hours: todayShifts.length * 8 },
      this_week: { shift_count: thisWeekShifts.length, total_hours: thisWeekShifts.length * 8 },
      next_week: { shift_count: nextWeekShifts.length, total_hours: nextWeekShifts.length * 8 },
      upcoming: { shift_count: upcomingShifts.length, total_hours: upcomingShifts.length * 8 }
    });
  };

  const generateMockNotifications = () => {
    const mockNotifications = [
      {
        id: '1',
        title: 'Shift Reminder',
        message: 'You have a morning shift tomorrow at OPD ward',
        date: new Date(Date.now() + 86400000).toISOString(),
        type: 'shift_reminder',
        read: false
      },
      {
        id: '2',
        title: 'Schedule Updated',
        message: 'Your schedule for next week has been published',
        date: new Date().toISOString(),
        type: 'schedule_update',
        read: false
      }
    ];
    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.read).length);
  };

  const refreshData = () => {
    setRefreshing(true);
    setTimeout(() => {
      const mockSchedules = generateMockSchedule();
      setSchedules(mockSchedules);
      calculateStats(mockSchedules);
      generateMockNotifications();
      setRefreshing(false);
    }, 500);
  };

  const markNotificationRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const getShiftIcon = (shiftType) => {
    switch(shiftType) {
      case 'morning': return <FaSun className="text-yellow-500" />;
      case 'afternoon': return <FaCloudSun className="text-orange-500" />;
      case 'night': return <FaMoon className="text-indigo-500" />;
      default: return <FaClock className="text-gray-500" />;
    }
  };

  const getShiftColor = (shiftType) => {
    switch(shiftType) {
      case 'morning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'afternoon': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'night': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get today's schedule
  const getTodaySchedule = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayShifts = schedules.filter(s => s.date === today);
    const currentTime = new Date().getHours();
    
    let currentShift = null;
    let upcomingShift = null;
    
    for (const shift of todayShifts) {
      const startHour = parseInt(shift.start_time.split(':')[0]);
      const endHour = parseInt(shift.end_time.split(':')[0]);
      
      if (currentTime >= startHour && currentTime < endHour) {
        currentShift = shift;
      } else if (currentTime < startHour && !upcomingShift) {
        upcomingShift = shift;
      }
    }
    
    return { current_shift: currentShift, upcoming_shift: upcomingShift, date: today };
  };

  // Get weekly view
  const getWeeklyView = () => {
    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const currentDay = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - currentDay);
    
    const weeklyData = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const daySchedules = schedules.filter(s => s.date === dateStr);
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      
      weeklyData.push({
        day: weekDays[i],
        date: dateStr,
        date_formatted: `${date.getMonth() + 1}/${date.getDate()}`,
        is_today: isToday,
        has_shifts: daySchedules.length > 0,
        shifts: daySchedules
      });
    }
    
    return weeklyData;
  };

  const todaySchedule = getTodaySchedule();
  const upcomingSchedules = schedules.filter(s => new Date(s.date) > new Date());
  const weeklyView = getWeeklyView();

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <FaSpinner className="animate-spin text-2xl text-teal-500" />
        <span className="ml-2 text-gray-500">Loading schedule...</span>
      </div>
    );
  }

  // Compact view for sidebar widget
  if (compact) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FaCalendarAlt className="text-teal-500" /> Today's Schedule
          </h3>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1 hover:bg-gray-100 rounded-full"
          >
            <FaBell className="text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        
        {todaySchedule.current_shift ? (
          <div className={`p-3 rounded-lg border ${getShiftColor(todaySchedule.current_shift.shift_type)}`}>
            <div className="flex items-center gap-2 mb-1">
              {getShiftIcon(todaySchedule.current_shift.shift_type)}
              <span className="font-medium">{todaySchedule.current_shift.shift_name} Shift</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-auto">Ongoing</span>
            </div>
            <p className="text-sm">{todaySchedule.current_shift.start_time} - {todaySchedule.current_shift.end_time}</p>
            <p className="text-xs text-gray-500 mt-1">📍 {todaySchedule.current_shift.ward} Ward</p>
          </div>
        ) : todaySchedule.upcoming_shift ? (
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              {getShiftIcon(todaySchedule.upcoming_shift.shift_type)}
              <span className="font-medium">{todaySchedule.upcoming_shift.shift_name} Shift</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-auto">Upcoming</span>
            </div>
            <p className="text-sm">Starts at {todaySchedule.upcoming_shift.start_time}</p>
            <p className="text-xs text-gray-500 mt-1">📍 {todaySchedule.upcoming_shift.ward} Ward</p>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400 text-sm">
            No shifts scheduled today
          </div>
        )}
        
        {stats && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">This week:</span>
              <span className="font-medium">{stats.this_week?.shift_count || 0} shifts</span>
              <span className="text-gray-500">|</span>
              <span className="font-medium">{stats.this_week?.total_hours || 0}h</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button 
          onClick={refreshData}
          disabled={refreshing}
          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-1"
        >
          <FaSync className={refreshing ? 'animate-spin text-xs' : 'text-xs'} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Schedule Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl p-4 text-white">
            <p className="text-xs opacity-90">Today</p>
            <p className="text-2xl font-bold">{stats.today?.shift_count || 0}</p>
            <p className="text-xs opacity-75">{stats.today?.total_hours || 0} hours</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl p-4 text-white">
            <p className="text-xs opacity-90">This Week</p>
            <p className="text-2xl font-bold">{stats.this_week?.shift_count || 0}</p>
            <p className="text-xs opacity-75">{stats.this_week?.total_hours || 0} hours</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white">
            <p className="text-xs opacity-90">Next Week</p>
            <p className="text-2xl font-bold">{stats.next_week?.shift_count || 0}</p>
            <p className="text-xs opacity-75">{stats.next_week?.total_hours || 0} hours</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-4 text-white">
            <p className="text-xs opacity-90">Upcoming</p>
            <p className="text-2xl font-bold">{stats.upcoming?.shift_count || 0}</p>
            <p className="text-xs opacity-75">next 14 days</p>
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveView('today')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeView === 'today'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setActiveView('upcoming')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeView === 'upcoming'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Upcoming ({upcomingSchedules.length})
        </button>
        <button
          onClick={() => setActiveView('weekly')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeView === 'weekly'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Weekly View
        </button>
      </div>

      {/* Today View */}
      {activeView === 'today' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FaCalendarAlt className="text-teal-500" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          
          {todaySchedule.current_shift && (
            <div className={`p-4 rounded-lg border ${getShiftColor(todaySchedule.current_shift.shift_type)} mb-3`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getShiftIcon(todaySchedule.current_shift.shift_type)}
                  <span className="font-semibold">{todaySchedule.current_shift.shift_name} Shift</span>
                </div>
                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">In Progress</span>
              </div>
              <p className="text-sm">{todaySchedule.current_shift.start_time} - {todaySchedule.current_shift.end_time}</p>
              <p className="text-sm text-gray-600 mt-1">📍 {todaySchedule.current_shift.ward} Ward</p>
              <p className="text-xs text-gray-500 mt-2">⏱️ {todaySchedule.current_shift.hours} hours</p>
            </div>
          )}
          
          {todaySchedule.upcoming_shift && (
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getShiftIcon(todaySchedule.upcoming_shift.shift_type)}
                  <span className="font-semibold">{todaySchedule.upcoming_shift.shift_name} Shift</span>
                </div>
                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Up Next</span>
              </div>
              <p className="text-sm">Starts at {todaySchedule.upcoming_shift.start_time}</p>
              <p className="text-sm text-gray-600 mt-1">📍 {todaySchedule.upcoming_shift.ward} Ward</p>
            </div>
          )}
          
          {!todaySchedule.current_shift && !todaySchedule.upcoming_shift && (
            <div className="text-center py-8 text-gray-400">
              <FaCalendarAlt className="text-4xl mx-auto mb-2 opacity-50" />
              <p>No shifts scheduled for today</p>
              <p className="text-xs mt-1">Enjoy your day off! 🎉</p>
            </div>
          )}
        </div>
      )}

      {/* Upcoming View */}
      {activeView === 'upcoming' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Upcoming Shifts ({upcomingSchedules.length})</h3>
          {upcomingSchedules.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FaCalendarAlt className="text-4xl mx-auto mb-2 opacity-50" />
              <p>No upcoming shifts scheduled</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {upcomingSchedules.map((schedule, idx) => (
                <div key={schedule.id || idx} className={`p-3 rounded-lg border ${getShiftColor(schedule.shift_type)}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getShiftIcon(schedule.shift_type)}
                        <span className="font-medium">{schedule.shift_name} Shift</span>
                      </div>
                      <p className="text-sm font-medium">{new Date(schedule.date).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">{schedule.start_time} - {schedule.end_time}</p>
                      <p className="text-xs text-gray-600 mt-1">📍 {schedule.ward} Ward</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{schedule.hours}h</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                        {schedule.status || 'scheduled'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly View */}
      {activeView === 'weekly' && weeklyView.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <div className="min-w-[700px] grid grid-cols-7 gap-px bg-gray-200">
            {weeklyView.map((day, index) => (
              <div key={index} className={`bg-white p-3 min-h-[160px] ${day.is_today ? 'bg-teal-50' : ''}`}>
                <div className="text-center mb-2 pb-2 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500">{day.day}</p>
                  <p className={`text-sm font-semibold ${day.is_today ? 'text-teal-600' : 'text-gray-700'}`}>
                    {day.date_formatted}
                  </p>
                </div>
                {day.has_shifts ? (
                  day.shifts.map((shift, idx) => (
                    <div key={idx} className={`text-xs p-1.5 rounded mb-1 ${getShiftColor(shift.shift_type)}`}>
                      <div className="flex items-center gap-1">
                        {getShiftIcon(shift.shift_type)}
                        <span className="font-medium">{shift.shift_name}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{shift.start_time} - {shift.end_time}</p>
                      <p className="text-[10px] text-gray-600">{shift.ward}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-400">OFF</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleViewer;