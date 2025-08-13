import React, { useState, useEffect } from 'react';
import { 
  Calendar, LogOut, Plus, BarChart3, Filter, X, Users, UserPlus, 
  Trash2, Edit3, Search, Building2, UserCheck, Clock, 
  PieChart, TrendingUp, Eye, CheckCircle, XCircle 
} from 'lucide-react';
import API, { AnnualLeaveAPI } from '../api/api';

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

// Enhanced date formatting function specifically for applied dates
function formatAppliedDate(dateStr) {
  if (!dateStr) {
    // If no date provided, use current date as fallback
    console.warn('No applied date provided, using current date');
    return formatDate(new Date());
  }
  
  const formatted = formatDate(dateStr);
  return formatted === 'N/A' ? formatDate(new Date()) : formatted;
}

function calculateLeaveDays(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const timeDiff = endDate - startDate;
  const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
  return days;
}

const HRDashboard = () => {
  // Modal states
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAllUsersModal, setShowAllUsersModal] = useState(false);
  const [showAllLeavesModal, setShowAllLeavesModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);

  // Data states
  const [myLeaveRequests, setMyLeaveRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [statistics, setStatistics] = useState({});
  
  // User's own leave info
  const [totalLeaveDays, setTotalLeaveDays] = useState(0);
  const [usedDays, setUsedDays] = useState(0);
  const [remainingDays, setRemainingDays] = useState(0);

  // Filter states
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('All Status');
  const [userRoleFilter, setUserRoleFilter] = useState('All Roles');
  const [userDepartmentFilter, setUserDepartmentFilter] = useState('All Departments');
  const [allLeavesStatusFilter, setAllLeavesStatusFilter] = useState('All Status');
  const [allLeavesDepartmentFilter, setAllLeavesDepartmentFilter] = useState('All Departments');
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Form states
  const [leaveFormData, setLeaveFormData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    departmentId: ''
  });

  const [editingUser, setEditingUser] = useState(null);
  const [tempRole, setTempRole] = useState('');
  const [tempDepartment, setTempDepartment] = useState('');

  // Current user state - Real auth data
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize current user from localStorage or API
  useEffect(() => {
    const initializeUser = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedRole = localStorage.getItem('role');
        const storedUserId = localStorage.getItem('userId');
        
        if (storedUser && storedRole && storedUserId) {
          const user = JSON.parse(storedUser);
          setCurrentUser({
            id: parseInt(storedUserId),
            name: user.name || 'HR User',
            role: storedRole.toUpperCase(),
            isApprover: storedRole.toLowerCase() === 'hr' || storedRole.toLowerCase() === 'manager'
          });
        } else {
          // Fallback to default HR user
          setCurrentUser({
            id: 3,
            name: 'HR User',
            role: 'HR',
            isApprover: true
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('User initialization error:', error);
        setCurrentUser({
          id: 3,
          name: 'HR User',
          role: 'HR',
          isApprover: true
        });
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  // Fetch all data on component mount
  useEffect(() => {
    if (currentUser) {
      fetchHRData();
    }
  }, [currentUser]);

  const fetchHRData = async () => {
    try {
      // 1. HR'ın kendi izin bilgileri
      const myLeavesRes = await API.get('/leave/mine');
      
      if (myLeavesRes.data) {
        // Enhanced data processing with better date handling
        const processedLeaves = (myLeavesRes.data.leaves || []).map(leave => ({
          ...leave,
          // Ensure dates are properly formatted
          createdAt: leave.createdAt || leave.appliedDate || new Date().toISOString(),
          startDate: leave.startDate,
          endDate: leave.endDate
        }));
        
        setMyLeaveRequests(processedLeaves);
        setUsedDays(myLeavesRes.data.usedDays || 0);
        setRemainingDays(myLeavesRes.data.remainingDays || 0);
        setTotalLeaveDays(myLeavesRes.data.totalLeaveDays || 0);
      }

      // 2. Tüm kullanıcılar
      const usersRes = await API.get('/hr/all-users');
      setAllUsers(usersRes.data.users || []);

      // 3. Departmanlar - Tüm departmanları al
      const deptRes = await API.get('/hr/departments');
      if (deptRes.data.departments) {
        setDepartments(deptRes.data.departments);
      } else {
        // Kullanıcılardan departman bilgilerini çıkar
        const deptMap = new Map();
        usersRes.data.users.forEach(user => {
          if (user.department && user.department !== 'Departman yok') {
            if (!deptMap.has(user.department)) {
              deptMap.set(user.department, {
                id: deptMap.size + 1, // Geçici ID
                name: user.department,
                userCount: 1
              });
            } else {
              deptMap.get(user.department).userCount++;
            }
          }
        });
        setDepartments(Array.from(deptMap.values()));
      }

      // 4. Tüm izinler
      const leavesRes = await API.get('/hr/leaves');
      setAllLeaves(leavesRes.data.leaves || []);

      // 5. İstatistikler
      const statsRes = await API.get('/hr/statistics');
      setStatistics(statsRes.data || {});

    } catch (error) {
      console.error('HR data fetch failed:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = '/login';
  };

  // Create leave request
  const handleLeaveSubmit = async () => {
    if (leaveFormData.startDate && leaveFormData.endDate && leaveFormData.reason) {
      try {
        const duration = calculateLeaveDays(leaveFormData.startDate, leaveFormData.endDate);
        
        const newRequest = {
          startDate: leaveFormData.startDate,
          endDate: leaveFormData.endDate,
          duration,
          reason: leaveFormData.reason,
          userId: currentUser.id
        };

        const response = await API.post('/leave/create', newRequest);

        // Enhanced new request processing with proper date
        const processedNewLeave = {
          ...response.data.leave,
          createdAt: response.data.leave.createdAt || new Date().toISOString()
        };

        setMyLeaveRequests([...myLeaveRequests, processedNewLeave]);
        setLeaveFormData({ startDate: '', endDate: '', reason: '' });
        setShowLeaveModal(false);
        alert('Leave request submitted successfully!');
      } catch (error) {
        console.error('Leave request failed:', error);
        alert('Leave request could not be submitted.');
      }
    } else {
      alert('Please fill in all fields');
    }
  };

  // Create user - Fixed validation and clear form
  const handleUserSubmit = async () => {
    if (userFormData.name && userFormData.email && userFormData.password && userFormData.departmentId) {
      try {
        // Backend'e gönderilecek veriyi hazırla
        const userData = {
          ...userFormData,
          departmentId: parseInt(userFormData.departmentId), // Integer'a çevir
          role: userFormData.role.toLowerCase() // Backend'de küçük harf bekleniyor
        };

        const response = await API.post('/hr/users', userData);

        // Find department name for display
        const selectedDept = departments.find(d => d.id === parseInt(userFormData.departmentId));
        const newUser = {
          ...response.data.user,
          department: selectedDept ? selectedDept.name : 'Unknown Department'
        };

        setAllUsers([...allUsers, newUser]);
        setUserFormData({ name: '', email: '', password: '', role: 'employee', departmentId: '' });
        setShowUserModal(false);
        alert('User created successfully!');
      } catch (error) {
        console.error('User creation failed:', error);
        alert('User could not be created.');
      }
    } else {
      alert('Please fill in all required fields');
    }
  };

  // Update user role - Fixed to actually update the role
  const handleRoleUpdate = async (userId, newRole) => {
    try {
      // Backend expects lowercase roles
      const roleToSend = newRole.toLowerCase();
      await API.put(`/hr/users/${userId}/role`, { role: roleToSend });

      // Update the user in the state with the new role
      setAllUsers(allUsers.map(user =>
        user.id === userId ? { ...user, role: roleToSend } : user
      ));
      setEditingUser(null);
      setTempRole('');
      alert('User role updated successfully!');
    } catch (error) {
      console.error('Role update failed:', error);
      alert('Role could not be updated.');
    }
  };

  const handleDepartmentUpdate = async (userId, newDepartmentId) => {
    try {
      await API.put(`/hr/users/${userId}/department`, { departmentId: newDepartmentId });

      // Update the user in the state with the new department
      const updatedDepartment = newDepartmentId ? departments.find(dept => dept.id === parseInt(newDepartmentId)) : null;
      setAllUsers(allUsers.map(user =>
        user.id === userId ? { 
          ...user, 
          department: updatedDepartment?.name || 'N/A',
          departmentId: updatedDepartment?.id || null
        } : user
      ));
      setEditingUser(null);
      setTempDepartment('');
      alert('User department updated successfully!');
    } catch (error) {
      console.error('Department update failed:', error);
      alert('Department could not be updated.');
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await API.delete(`/hr/users/${userId}`);

        setAllUsers(allUsers.filter(user => user.id !== userId));
        alert('User deleted successfully!');
      } catch (error) {
        console.error('User deletion failed:', error);
        alert('User could not be deleted.');
      }
    }
  };

  // Filter functions - Fixed to work properly with case-insensitive status filtering
  const filteredMyLeaves = leaveStatusFilter === 'All Status' 
    ? myLeaveRequests 
    : myLeaveRequests.filter(req => (req.status || '').toUpperCase() === leaveStatusFilter.toUpperCase());

  const filteredUsers = allUsers.filter(user => {
    const matchesRole = userRoleFilter === 'All Roles' || user.role === userRoleFilter;
    const matchesDept = userDepartmentFilter === 'All Departments' || 
                       (user.department && user.department === userDepartmentFilter);
    const matchesSearch = user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(userSearchTerm.toLowerCase());
    return matchesRole && matchesDept && matchesSearch;
  });

  // Fixed filtering for all leaves - department filtering by name instead of ID and case-insensitive status
  const filteredAllLeaves = allLeaves.filter(leave => {
    const matchesStatus = allLeavesStatusFilter === 'All Status' || 
                         (leave.status || '').toUpperCase() === allLeavesStatusFilter.toUpperCase();
    const matchesDept = allLeavesDepartmentFilter === 'All Departments' || 
                       (leave.user?.department?.name === allLeavesDepartmentFilter);
    return matchesStatus && matchesDept;
  });

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-purple-600 p-2 rounded-lg mr-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">HR Dashboard</h1>
                <p className="text-sm text-gray-500">Human Resources Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome back, {currentUser?.name}</span>
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
          
          {/* Left Column - Statistics */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Quick Statistics Cards - Fixed with real data */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{statistics.totalUsers || 0}</p>
                    <p className="text-gray-600 text-sm">Total Users</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <UserCheck className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{statistics.totalManagers || 0}</p>
                    <p className="text-gray-600 text-sm">Managers</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{statistics.pendingLeaves || 0}</p>
                    <p className="text-gray-600 text-sm">Pending Leaves</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
                    <p className="text-gray-600 text-sm">Departments</p>
                  </div>
                </div>
              </div>
            </div>

            {/* My Leave Balance */}
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
                      strokeDasharray={`${totalLeaveDays > 0 ? (remainingDays / totalLeaveDays) * 100 : 0}, 100`}
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
                  <span>{totalLeaveDays > 0 ? Math.round((remainingDays / totalLeaveDays) * 100) : 0}% remaining</span>
                </div>
              </div>
            </div>

            {/* My Leave Requests Table - Fixed Applied date formatting */}
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
                      value={leaveStatusFilter}
                      onChange={(e) => setLeaveStatusFilter(e.target.value)}
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
                    {filteredMyLeaves.map((request) => (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              (request.status || '').toUpperCase() === 'APPROVED' ? 'bg-green-500' :
                              (request.status || '').toUpperCase() === 'PENDING' ? 'bg-yellow-500' : 
                              (request.status || '').toUpperCase() === 'REJECTED' ? 'bg-red-500' : 'bg-gray-500'
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
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (request.status || '').toUpperCase() === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : (request.status || '').toUpperCase() === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : (request.status || '').toUpperCase() === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {request.status ? request.status.toUpperCase().charAt(0) + request.status.slice(1).toLowerCase() : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatAppliedDate(request.createdAt || request.appliedDate || request.submittedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column - Actions & Quick Info */}
          <div className="space-y-8">
            
            {/* HR Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">HR Actions</h2>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowLeaveModal(true)}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 flex items-center justify-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Request My Leave
                </button>
                <button 
                  onClick={() => setShowUserModal(true)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New User
                </button>
                <button 
                  onClick={() => setShowAllUsersModal(true)}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage All Users
                </button>
                <button 
                  onClick={() => setShowAllLeavesModal(true)}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View All Leaves
                </button>
                <button 
                  onClick={() => setShowStatisticsModal(true)}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Quick Statistics
                </button>
              </div>
            </div>

            {/* Department Overview - Fixed */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Department Overview</h2>
              </div>
              <div className="space-y-3">
                {departments.slice(0, 5).map((dept) => (
                  <div key={dept.id} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{dept.name}</span>
                    <span className="text-sm font-medium">{dept.userCount || 0} users</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats - Simplified */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <TrendingUp className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Quick Stats</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Users</span>
                  <span className="text-sm font-medium text-blue-600">{statistics.totalUsers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Pending Leaves</span>
                  <span className="text-sm font-medium text-orange-600">{statistics.pendingLeaves || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Departments</span>
                  <span className="text-sm font-medium text-purple-600">{departments.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Create Leave Request</h3>
              <button 
                onClick={() => setShowLeaveModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={leaveFormData.startDate}
                    onChange={(e) => setLeaveFormData({...leaveFormData, startDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaveFormData.endDate}
                    onChange={(e) => setLeaveFormData({...leaveFormData, endDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leave</label>
                <textarea
                  value={leaveFormData.reason}
                  onChange={(e) => setLeaveFormData({...leaveFormData, reason: e.target.value})}
                  placeholder="Please provide a reason for your leave request..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-20 resize-none"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleLeaveSubmit}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 text-sm font-medium"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal - Fixed with proper department selection */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Add New User</h3>
              <button 
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({...userFormData, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Enter full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Enter password"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={userFormData.role}
                      onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="hr">HR</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                      value={userFormData.departmentId}
                      onChange={(e) => setUserFormData({...userFormData, departmentId: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleUserSubmit}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Create User
                </button>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Users Management Modal - Fixed filtering and role editing */}
      {showAllUsersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-lg font-medium text-gray-900">User Management</h3>
                <p className="text-sm text-gray-500">Manage all users, roles and permissions</p>
              </div>
              <button 
                onClick={() => setShowAllUsersModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Filters */}
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center">
                  <Search className="h-4 w-4 text-gray-400 mr-2" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm w-64"
                  />
                </div>
                
                <div className="flex items-center">
                  <Filter className="h-4 w-4 text-gray-400 mr-2" />
                  <select 
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option>All Roles</option>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                  <select 
                    value={userDepartmentFilter}
                    onChange={(e) => setUserDepartmentFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option>All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {user.name.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUser === user.id ? (
                            <select
                              value={tempRole || user.role}
                              onChange={(e) => setTempRole(e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                              autoFocus
                            >
                              <option value="employee">Employee</option>
                              <option value="manager">Manager</option>
                              <option value="hr">HR</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'hr' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {editingUser === user.id ? (
                            <select
                              value={tempDepartment !== '' ? tempDepartment : (user.departmentId || '')}
                              onChange={(e) => setTempDepartment(e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                              <option value="">No Department</option>
                              {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                              ))}
                            </select>
                          ) : (
                            user.department || 'N/A'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {editingUser === user.id ? (
                              <>
                                <button
                                  onClick={() => {
                                    // Update both role and department if they have changed
                                    const roleChanged = tempRole && tempRole !== user.role;
                                    const departmentChanged = tempDepartment !== (user.departmentId || '');
                                    
                                    if (roleChanged) {
                                      handleRoleUpdate(user.id, tempRole);
                                    }
                                    if (departmentChanged) {
                                      handleDepartmentUpdate(user.id, tempDepartment);
                                    }
                                    if (!roleChanged && !departmentChanged) {
                                      alert('No changes detected');
                                    }
                                  }}
                                  className="text-green-600 hover:text-green-900 inline-flex items-center"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingUser(null);
                                    setTempRole('');
                                    setTempDepartment('');
                                  }}
                                  className="text-gray-600 hover:text-gray-900 inline-flex items-center"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingUser(user.id);
                                    setTempRole(user.role);
                                    setTempDepartment(user.departmentId || '');
                                  }}
                                  className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                                >
                                  <Edit3 className="h-4 w-4 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-600 hover:text-red-900 inline-flex items-center"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No users found matching your criteria</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All Leaves Modal - Fixed filtering and removed approval actions for self */}
      {showAllLeavesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-lg font-medium text-gray-900">All Leave Requests</h3>
                <p className="text-sm text-gray-500">View and analyze all leave requests across the organization</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 text-gray-400 mr-2" />
                  <select 
                    value={allLeavesStatusFilter}
                    onChange={(e) => setAllLeavesStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option>All Status</option>
                    <option>PENDING</option>
                    <option>APPROVED</option>
                    <option>REJECTED</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                  <select 
                    value={allLeavesDepartmentFilter}
                    onChange={(e) => setAllLeavesDepartmentFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option>All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={() => setShowAllLeavesModal(false)}
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                      {(currentUser.role === 'MANAGER' || currentUser.isApprover) && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAllLeaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {leave.user?.name ? leave.user.name.charAt(0) : 'U'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {leave.user?.name || 'Unknown User'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {leave.user?.department?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(leave.startDate)}<br />
                            <span className="text-gray-500">to {formatDate(leave.endDate)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {calculateLeaveDays(leave.startDate, leave.endDate)} days
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={leave.reason}>
                            {leave.reason}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (leave.status || '').toUpperCase() === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : (leave.status || '').toUpperCase() === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : (leave.status || '').toUpperCase() === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {leave.status ? leave.status.toUpperCase().charAt(0) + leave.status.slice(1).toLowerCase() : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatAppliedDate(leave.createdAt || leave.appliedDate || leave.submittedAt)}
                        </td>
                        {(currentUser.role === 'MANAGER' || currentUser.isApprover) && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {(leave.status || '').toUpperCase() === 'PENDING' && leave.userId !== currentUser.id && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => alert('Approve functionality - connect to backend')}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => alert('Reject functionality - connect to backend')}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredAllLeaves.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No leave requests found matching your criteria</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Modal - Simplified */}
      {showStatisticsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Quick Statistics</h3>
                <p className="text-sm text-gray-500">Overview of organizational metrics</p>
              </div>
              <button 
                onClick={() => setShowStatisticsModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* User Statistics */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div className="ml-3">
                      <h4 className="text-lg font-medium text-gray-900">User Statistics</h4>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Users</span>
                      <span className="text-sm font-medium">{statistics.totalUsers || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Employees</span>
                      <span className="text-sm font-medium">{statistics.totalEmployees || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Managers</span>
                      <span className="text-sm font-medium">{statistics.totalManagers || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">HR Staff</span>
                      <span className="text-sm font-medium">{statistics.totalHR || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Leave Statistics */}
                <div className="bg-green-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <Calendar className="h-8 w-8 text-green-500" />
                    <div className="ml-3">
                      <h4 className="text-lg font-medium text-gray-900">Leave Statistics</h4>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Requests</span>
                      <span className="text-sm font-medium">{statistics.totalLeaves || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pending</span>
                      <span className="text-sm font-medium text-yellow-600">{statistics.pendingLeaves || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Approved</span>
                      <span className="text-sm font-medium text-green-600">{statistics.approvedLeaves || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Approval Rate</span>
                      <span className="text-sm font-medium text-green-600">{statistics.approvalRate || 0}%</span>
                    </div>
                  </div>
                </div>

                {/* Department Statistics */}
                <div className="bg-purple-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <Building2 className="h-8 w-8 text-purple-500" />
                    <div className="ml-3">
                      <h4 className="text-lg font-medium text-gray-900">Departments</h4>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Departments</span>
                      <span className="text-sm font-medium">{departments.length}</span>
                    </div>
                    {departments.slice(0, 3).map((dept) => (
                      <div key={dept.id} className="flex justify-between">
                        <span className="text-sm text-gray-600 truncate">{dept.name}</span>
                        <span className="text-sm font-medium">{dept.userCount || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monthly Trends */}
                <div className="bg-orange-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <TrendingUp className="h-8 w-8 text-orange-500" />
                    <div className="ml-3">
                      <h4 className="text-lg font-medium text-gray-900">This Month</h4>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">New Leave Requests</span>
                      <span className="text-sm font-medium">{statistics.monthlyLeaves || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Active Users</span>
                      <span className="text-sm font-medium">{statistics.activeUsers || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Active Requests</span>
                      <span className="text-sm font-medium text-blue-600">{statistics.activeLeaves || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setShowStatisticsModal(false);
                    setShowAllUsersModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Manage Users
                </button>
                <button
                  onClick={() => {
                    setShowStatisticsModal(false);
                    setShowAllLeavesModal(true);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  View All Leaves
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;