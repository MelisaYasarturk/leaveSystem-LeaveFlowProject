import React, { useState, useEffect } from 'react';
import { Calendar, LogOut, Plus, BarChart3, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import API, { AnnualLeaveAPI } from '../api/api';

// Tarih formatlama fonksiyonu
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    let date;
    
    // Handle different date formats more robustly
    if (typeof dateStr === 'string') {
      // Handle ISO string, yyyy-mm-dd, or other string formats
      if (dateStr.includes('T')) {
        // ISO format like "2024-01-15T10:30:00.000Z"
        date = new Date(dateStr);
      } else if (dateStr.includes('-')) {
        // Date format like "2024-01-15"
        date = new Date(dateStr + 'T00:00:00');
      } else {
        // Try parsing as is
        date = new Date(dateStr);
      }
    } else if (dateStr instanceof Date) {
      date = dateStr;
    } else if (typeof dateStr === 'number') {
      // Unix timestamp
      date = new Date(dateStr);
    } else {
      return 'N/A';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateStr);
      return 'N/A';
    }
    
    // Format date consistently
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Date formatting error:', error, dateStr);
    return 'N/A';
  }
}

// Çalışma yılını hesapla (backend ile aynı mantık)
function calculateYearsOfService(startDate) {
  try {
    if (!startDate) return 'N/A';
    
    const now = new Date();
    const start = new Date(startDate);
    
    // Geçersiz tarih kontrolü
    if (isNaN(start.getTime())) {
      console.warn('Geçersiz startDate:', startDate);
      return 'N/A';
    }
    
    // Yıl, ay ve gün olarak hesapla (daha hassas)
    const yearDiff = now.getFullYear() - start.getFullYear();
    const monthDiff = now.getMonth() - start.getMonth();
    const dayDiff = now.getDate() - start.getDate();
    
    // Tam yıl hesaplama
    let yearsOfService = yearDiff;
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      yearsOfService--;
    }
    
    // Ondalık kısmı da hesapla (ay bazında)
    let decimalPart = 0;
    if (monthDiff >= 0) {
      decimalPart = monthDiff / 12;
      if (dayDiff >= 0) {
        decimalPart += dayDiff / 365.25;
      }
    } else {
      decimalPart = (12 + monthDiff) / 12;
      if (dayDiff >= 0) {
        decimalPart += dayDiff / 365.25;
      }
    }
    
    const result = (yearsOfService + decimalPart).toFixed(1);
    return isNaN(result) ? 'N/A' : result;
  } catch (error) {
    console.error('Years of service hesaplama hatası:', error);
    return 'N/A';
  }
}

const user = JSON.parse(localStorage.getItem("user"));

console.log(user?.name);      // Kullanıcının ismi
console.log(user?.role);      // Rolü: employee, manager, hr
console.log(user?.isApprover); // Yetkisi varsa true/false


const EmployeeDashboard = () => {
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [leaveRequests, setLeaveRequests] = useState([]);

  const [totalLeaveDays, setTotalLeaveDays] = useState(0);
  const [usedDays, setUsedDays] = useState(0);
  const [remainingDays, setRemainingDays] = useState(0);
  const [yearsOfService, setYearsOfService] = useState(0);
  const [expectedLeaveDays, setExpectedLeaveDays] = useState(0);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());

  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
  const fetchLeaves = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // İzin bilgileri
      const response = await axios.get('http://localhost:5050/api/leave/mine', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { leaves, usedDays, remainingDays, totalLeaveDays, yearsOfService, expectedLeaveDays } = response.data;

      setLeaveRequests(leaves);
      setUsedDays(usedDays);
      setRemainingDays(remainingDays);
      setTotalLeaveDays(totalLeaveDays);
      setYearsOfService(yearsOfService || 0);
      setExpectedLeaveDays(expectedLeaveDays || totalLeaveDays);

      // Çalışan bilgilerini de çek (başlangıç tarihi için)
      const userResponse = await axios.get('http://localhost:5050/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Çalışanın başlangıç tarihini kontrol et ve bilgi göster
      if (userResponse.data.user) {
        const calculatedYears = calculateYearsOfService(userResponse.data.user.startDate);
        
        // 5 yıl geçmişse bildirim göster
        if (calculatedYears >= 5 && totalLeaveDays === 28) {
          // Başarılı güncelleme bildirimi (optional)
          console.log('Tebrikler! 5+ yıl hizmet nedeniyle yıllık izin hakkınız 28 güne çıkarıldı.');
        }
      }
    } catch (error) {
      console.error('İzin verileri çekilemedi:', error);
    }
  };

  fetchLeaves();
}, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = '/login'; // Redirect to login page
  };

  const handleSubmit = async () => {
    if (formData.startDate && formData.endDate && formData.reason) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      const userId = localStorage.getItem('userId');

      if (!userId) {
        alert("Kullanıcı bilgisi alınamadı. Lütfen tekrar giriş yapın.");
        return;
      }

      const newRequest = {
        startDate: formData.startDate,
        endDate: formData.endDate,
        duration,
        reason: formData.reason,
        status: 'Pending',
        appliedDate: new Date().toISOString().split('T')[0],
        userId: userId
      };

      try {
        const token = localStorage.getItem('token');

        const response = await axios.post(
          'http://localhost:5050/api/leave/create',
          newRequest,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setLeaveRequests([...leaveRequests, response.data.leave]);
        setFormData({ startDate: '', endDate: '', reason: '' });
        setShowModal(false);
      } catch (error) {
        console.error('Leave request failed:', error);
        alert('İzin isteği gönderilemedi.');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-500 text-white';
      case 'Pending': return 'bg-orange-500 text-white';
      case 'Rejected': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const filteredRequests = statusFilter === 'All Status' 
    ? leaveRequests 
    : leaveRequests.filter(req => req.status === statusFilter);

  const pendingRequests = leaveRequests.filter(req => req.status === 'Pending').length;

  // Calendar functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

     const isLeaveDay = (date) => {
     const dateStr = date.toISOString().split('T')[0];
     return leaveRequests.some(leave => {
       if (leave.status === 'Approved' || leave.status === 'APPROVED') {
         const startDate = new Date(leave.startDate);
         const endDate = new Date(leave.endDate);
         return date >= startDate && date <= endDate;
       }
       return false;
     });
   };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isLeave = isLeaveDay(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div
          key={day}
          className={`p-2 text-center text-sm border rounded ${
            isLeave ? 'bg-green-200 border-green-400' : 'border-gray-200'
          } ${isToday ? 'bg-blue-100 border-blue-400' : ''}`}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
const user = JSON.parse(localStorage.getItem("user"));
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-blue-600 p-2 rounded-lg mr-3">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">LeaveFlow Dashboard</h1>
                <span className="text-sm text-gray-600">Welcome back {user?.name}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-500"
              >
                <LogOut className="h-5 w-5" />
                <span className="ml-1 text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Annual Leave Balance */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Annual Leave Balance</h2>
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <svg className="w-32 h-32" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeDasharray={`${(remainingDays / totalLeaveDays) * 100}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{remainingDays}</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-gray-600 mb-2">{remainingDays} of {totalLeaveDays} days remaining</p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Used this year: {usedDays} days</span>
                  <span>{Math.round((remainingDays / totalLeaveDays) * 100)}% remaining</span>
                </div>
                
                                 
              </div>
                         </div>



             {/* Leave Requests Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">My Annual Leave Requests</h2>
                    <p className="text-sm text-gray-500">Track your submitted annual leave requests</p>
                  </div>
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-2" />
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                      <option>All Status</option>
                      <option>Pending</option>
                      <option>Approved</option>
                      <option>Rejected</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRequests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              request.status === 'Approved' ? 'bg-green-500' :
                              request.status === 'Pending' ? 'bg-orange-500' : 'bg-red-500'
                            }`}></span>
                            <div className="text-sm text-gray-900">
                              {request.startDate}<br />
                              <span className="text-gray-500">to {request.endDate}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.duration} days
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.appliedDate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowModal(true)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Request Annual Leave
                </button>
                <button 
                  onClick={() => setShowHistoryModal(true)}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Leave History
                </button>
                <button 
                  onClick={() => setShowCalendarModal(true)}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Leave Calendar
                </button>
              </div>
            </div>

            

            {/* Leave Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <BarChart3 className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Leave Overview</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Days Used This Year</span>
                  <span className="text-sm font-medium">{usedDays}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(usedDays / totalLeaveDays) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Remaining days</span>
                  <span className="text-sm font-medium">{remainingDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Pending requests</span>
                  <span className="text-sm font-medium">{pendingRequests} request</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Next expiry</span>
                  <span className="text-sm font-medium">Dec 31, 2024</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Create Annual Leave Request</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Request time off from your annual leave allowance</p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="block text-sm font-medium text-gray-700 mb-1">Start Date</div>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <div className="block text-sm font-medium text-gray-700 mb-1">End Date</div>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <div className="block text-sm font-medium text-gray-700 mb-1">Reason for Leave</div>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="Please provide a reason for your annual leave request..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-20 resize-none"
                />
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-6">
                <p className="text-sm text-green-700">This request will be deducted from your annual leave balance</p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Leave History</h3>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaveRequests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              request.status === 'Approved' ? 'bg-green-500' :
                              request.status === 'Pending' ? 'bg-orange-500' : 'bg-red-500'
                            }`}></span>
                            <div className="text-sm text-gray-900">
                              {request.startDate}<br />
                              <span className="text-gray-500">to {request.endDate}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.duration} days
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.appliedDate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Leave Calendar</h3>
              <button 
                onClick={() => setShowCalendarModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={previousMonth}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h4 className="text-lg font-medium">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h4>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
              
              <div className="mt-4 flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-200 border border-green-400 rounded mr-2"></div>
                  <span>Approved Leave</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-400 rounded mr-2"></div>
                  <span>Today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;