import React, { useState, useEffect } from 'react';
import { Calendar, LogOut, Plus, BarChart3, Filter, X, ChevronLeft, ChevronRight, Users, MessageSquare, Check, XCircle, Clock } from 'lucide-react';
import axios from 'axios';
import API, { AnnualLeaveAPI } from '../api/api';

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR');
}

function calculateLeaveDays(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const timeDiff = endDate - startDate;
  const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
  return days;
}

const ManagerDashboard = () => {
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showTeamRequestsModal, setShowTeamRequestsModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [teamStatusFilter, setTeamStatusFilter] = useState('All Status');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [teamRequests, setTeamRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [totalLeaveDays, setTotalLeaveDays] = useState(0);
  const [usedDays, setUsedDays] = useState(0);
  const [remainingDays, setRemainingDays] = useState(0);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());

  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [commentData, setCommentData] = useState({
    comment: '',
    action: '' // 'approve' or 'reject'
  });

  useEffect(() => {
    const fetchManagerData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        // 1. Kendi izinleri (Manager'ın kendi izin talepleri)
        const myLeavesRes = await axios.get('http://localhost:5050/api/leave/mine', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const { leaves, usedDays, remainingDays, totalLeaveDays } = myLeavesRes.data;
        setLeaveRequests(leaves);
        setUsedDays(usedDays);
        setRemainingDays(remainingDays);
        setTotalLeaveDays(totalLeaveDays);

        // 2. Departmandaki diğer kullanıcıların izinleri (Team requests)
        const teamLeavesRes = await axios.get('http://localhost:5050/api/manager/leaves', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Departman izinleri:', teamLeavesRes.data.leaves);

        if (teamLeavesRes.data?.leaves) {
          setTeamRequests(teamLeavesRes.data.leaves);
        } else {
          setTeamRequests([]);
        }

      } catch (error) {
        console.error('Manager data fetch failed:', error.response?.data || error.message);
      }
    };

    fetchManagerData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = '/login';
  };

  const handleSubmit = async () => {
    if (formData.startDate && formData.endDate && formData.reason) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      const userId = localStorage.getItem('userId');

      if (!userId) {
        alert("User information not found. Please login again.");
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
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setLeaveRequests([...leaveRequests, response.data.leave]);
        setFormData({ startDate: '', endDate: '', reason: '' });
        setShowModal(false);
      } catch (error) {
        console.error('Leave request failed:', error);
        alert('Leave request could not be submitted.');
      }
    }
  };

  const handleApproveReject = async () => {
    if (!selectedRequest || !commentData.action) return;

    try {
      const token = localStorage.getItem('token');
      
      if (commentData.action === 'approve') {
        // Approve endpoint - sadece POST isteği
        const response = await axios.post(
          `http://localhost:5050/api/manager/approve/${selectedRequest.id}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } else {
        // Reject endpoint - POST isteği + comment body'de
        const response = await axios.post(
          `http://localhost:5050/api/manager/reject/${selectedRequest.id}`,
          {
            comment: commentData.comment
          },
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      // Team requests listesini güncelle
      setTeamRequests(prevTeamRequests => 
        prevTeamRequests.map(req => 
          req.id === selectedRequest.id 
            ? { 
                ...req, 
                status: commentData.action === 'approve' ? 'APPROVED' : 'REJECTED',
                comment: commentData.comment 
              }
            : req
        )
      );

      setShowCommentModal(false);
      setCommentData({ comment: '', action: '' });
      setSelectedRequest(null);
      
      alert(`Leave request ${commentData.action === 'approve' ? 'approved' : 'rejected'} successfully.`);
    } catch (error) {
      console.error('Status update failed:', error);
      alert('Could not update leave request status.');
    }
  };

  const openCommentModal = (request, action) => {
    setSelectedRequest(request);
    setCommentData({ comment: '', action });
    setShowCommentModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
  }
};


  const filteredRequests = statusFilter === 'All Status' 
    ? leaveRequests 
    : leaveRequests.filter(req => req.status === statusFilter);

  const filteredTeamRequests = teamStatusFilter === 'All Status'
    ? teamRequests
    : teamRequests.filter(req => req.status === teamStatusFilter);

  const pendingRequests = leaveRequests.filter(req => req.status === 'PENDING').length;
  const pendingTeamRequests = teamRequests.filter(req => req.status === 'PENDING').length;

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
      if (leave.status === 'APPROVED') {
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

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

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
                <h1 className="text-xl font-semibold text-gray-900">Manager Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back {user?.name}</p>
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
              <h2 className="text-lg font-medium text-gray-900 mb-6">My Annual Leave Balance</h2>
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

            {/* My Leave Requests Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">My Leave Requests</h2>
                    <p className="text-sm text-gray-500">Track your submitted leave requests</p>
                  </div>
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-2" />
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                      <option>All Status</option>
                      <option>PENDING</option>
                      <option>APPROVED</option>
                      <option>REJECTED</option>
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
                              request.status === 'APPROVED' ? 'bg-green-500' :
                              request.status === 'PENDING' ? 'bg-orange-500' : 'bg-red-500'
                            }`}></span>
                            <div className="text-sm text-gray-900">
                              {formatDate(request.startDate)}<br />
                              <span className="text-gray-500">to {formatDate(request.endDate)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {calculateLeaveDays(request.startDate, request.endDate)} days
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(request.createdAt || request.appliedDate || new Date())}
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
                  View My Leave History
                </button>
                <button 
                  onClick={() => setShowCalendarModal(true)}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  My Leave Calendar
                </button>
                <button 
                  onClick={() => setShowTeamRequestsModal(true)}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Team Leave Requests
                </button>
              </div>
            </div>

            {/* Leave Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <BarChart3 className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">My Leave Overview</h2>
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
                  <span className="text-sm text-gray-500">My Pending requests</span>
                  <span className="text-sm font-medium">{pendingRequests} request</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Next expiry</span>
                  <span className="text-sm font-medium">Dec 31, 2024</span>
                </div>
              </div>
            </div>

            {/* Team Management Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <Users className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Team Management</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Pending Team Requests</span>
                  <span className="text-sm font-medium text-orange-600">{pendingTeamRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Team Requests</span>
                  <span className="text-sm font-medium">{teamRequests.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">This Month</span>
                  <span className="text-sm font-medium">
                    {teamRequests.filter(req => {
                      const reqDate = new Date(req.createdAt);
                      const now = new Date();
                      return reqDate.getMonth() === now.getMonth() && reqDate.getFullYear() === now.getFullYear();
                    }).length}
                  </span>
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
              <h3 className="text-lg font-medium text-gray-900">My Leave History</h3>
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
                              request.status === 'APPROVED' ? 'bg-green-500' :
                              request.status === 'PENDING' ? 'bg-orange-500' : 'bg-red-500'
                            }`}></span>
                            <div className="text-sm text-gray-900">
                              {formatDate(request.startDate)}<br />
                              <span className="text-gray-500">to {formatDate(request.endDate)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {calculateLeaveDays(request.startDate, request.endDate)} days
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(request.createdAt || request.appliedDate || new Date())}
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
              <h3 className="text-lg font-medium text-gray-900">My Leave Calendar</h3>
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
                  <div className="w-3 h-3 bg-green-200 border border-green-400 rounded mr-2"></div>
                  <span className="text-gray-600">Approved Leave</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-400 rounded mr-2"></div>
                  <span className="text-gray-600">Today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Leave Requests Modal */}
      {showTeamRequestsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Team Leave Requests</h3>
                <p className="text-sm text-gray-500">Review and manage leave requests from your team</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 text-gray-400 mr-2" />
                  <select 
                    value={teamStatusFilter}
                    onChange={(e) => setTeamStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option>All Status</option>
                    <option>PENDING</option>
                    <option>APPROVED</option>
                    <option>REJECTED</option>
                  </select>
                </div>
                <button 
                  onClick={() => setShowTeamRequestsModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTeamRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {request?.user?.name ? request.user.name.charAt(0) : 'U'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {request?.user?.name || 'Unknown Employee'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {request?.user?.department?.name || request?.user?.Department?.name || 'Unknown Department'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(request.startDate)}<br />
                            <span className="text-gray-500">to {formatDate(request.endDate)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {calculateLeaveDays(request.startDate, request.endDate)} days
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(request.createdAt || request.appliedDate || new Date())}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {request.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => openCommentModal(request, 'approve')}
                                  className="text-green-600 hover:text-green-900 inline-flex items-center"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => openCommentModal(request, 'reject')}
                                  className="text-red-600 hover:text-red-900 inline-flex items-center"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setCommentData({ comment: request.comment || '', action: '' });
                                setShowCommentModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              {request.comment ? 'View Comment' : 'Add Comment'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredTeamRequests.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No team leave requests found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comment/Approval Modal */}
      {showCommentModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {commentData.action === 'approve' ? 'Approve Leave Request' : 
                 commentData.action === 'reject' ? 'Reject Leave Request' : 
                 'Add Comment'}
              </h3>
              <button 
                onClick={() => {
                  setShowCommentModal(false);
                  setCommentData({ comment: '', action: '' });
                  setSelectedRequest(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Request Details:</h4>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p><span className="font-medium">Employee:</span> {selectedRequest?.user?.name || 'Unknown'}</p>
                  <p><span className="font-medium">Duration:</span> {formatDate(selectedRequest.startDate)} to {formatDate(selectedRequest.endDate)}</p>
                  <p><span className="font-medium">Days:</span> {calculateLeaveDays(selectedRequest.startDate, selectedRequest.endDate)} days</p>
                  <p><span className="font-medium">Reason:</span> {selectedRequest.reason}</p>
                </div>
              </div>

              {selectedRequest.comment && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Existing Comment:</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    {selectedRequest.comment}
                  </div>
                </div>
              )}
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {commentData.action === 'reject' ? 'Comment (required for rejection):' : 
                   commentData.action === 'approve' ? 'Comment (optional):' : 
                   'Add Comment:'}
                </label>
                <textarea
                  value={commentData.comment}
                  onChange={(e) => setCommentData({...commentData, comment: e.target.value})}
                  placeholder={
                    commentData.action === 'approve' ? 'Optional: Add a comment for approval...' :
                    commentData.action === 'reject' ? 'Required: Please provide a reason for rejection...' :
                    'Add your comment here...'
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {commentData.action === 'reject' && !commentData.comment.trim() && (
                  <p className="text-red-500 text-xs mt-1">Comment is required for rejection</p>
                )}
              </div>
              
              <div className="flex space-x-3">
                {commentData.action ? (
                  <button
                    onClick={handleApproveReject}
                    disabled={commentData.action === 'reject' && !commentData.comment.trim()}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                      commentData.action === 'approve' 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : commentData.comment.trim()
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-red-300 text-white cursor-not-allowed'
                    }`}
                  >
                    {commentData.action === 'approve' ? 'Approve Request' : 'Reject Request'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // Add comment without changing status
                      if (commentData.comment.trim()) {
                        setTeamRequests(teamRequests.map(req => 
                          req.id === selectedRequest.id 
                            ? { ...req, comment: commentData.comment }
                            : req
                        ));
                        setShowCommentModal(false);
                        setCommentData({ comment: '', action: '' });
                        setSelectedRequest(null);
                      }
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    Add Comment
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setCommentData({ comment: '', action: '' });
                    setSelectedRequest(null);
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;