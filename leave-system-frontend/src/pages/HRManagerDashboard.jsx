import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  LogOut,
  Plus,
  BarChart3,
  Filter,
  X,
  Users,
  UserPlus,
  Search,
  Building2,
  MessageSquare,
  Check,
  XCircle,
  Clock,
  PieChart,
  TrendingUp,
  Eye,
} from 'lucide-react';
import API from '../api/api';

// -------- Utils (copied & aligned with existing dashboards) --------
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    let date;
    if (typeof dateStr === 'string') {
      if (dateStr.includes('T')) date = new Date(dateStr);
      else if (dateStr.includes('-')) date = new Date(dateStr + 'T00:00:00');
      else date = new Date(dateStr);
    } else if (dateStr instanceof Date) date = dateStr;
    else if (typeof dateStr === 'number') date = new Date(dateStr);
    else return 'N/A';

    if (isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return 'N/A';
  }
}

function calculateLeaveDays(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const timeDiff = endDate - startDate;
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
}

function calculateYearsOfService(startDate) {
  try {
    if (!startDate) return 'N/A';
    const now = new Date();
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return 'N/A';
    const yearDiff = now.getFullYear() - start.getFullYear();
    const monthDiff = now.getMonth() - start.getMonth();
    const dayDiff = now.getDate() - start.getDate();
    let years = yearDiff;
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years--;
    let dec = 0;
    if (monthDiff >= 0) {
      dec = monthDiff / 12 + (dayDiff >= 0 ? dayDiff / 365.25 : 0);
    } else {
      dec = (12 + monthDiff) / 12 + (dayDiff >= 0 ? dayDiff / 365.25 : 0);
    }
    const result = (years + dec).toFixed(1);
    return isNaN(result) ? 'N/A' : result;
  } catch {
    return 'N/A';
  }
}

// -------- Component --------
export default function HRManagerDashboard() {
  // View tabs
  const [activeTab, setActiveTab] = useState('overview'); // overview | hr | manager

  // Current user
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // HR data
  const [allUsers, setAllUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [statistics, setStatistics] = useState({});

  // Manager + personal leave data
  const [myLeaves, setMyLeaves] = useState([]);
  const [totalLeaveDays, setTotalLeaveDays] = useState(0);
  const [usedDays, setUsedDays] = useState(0);
  const [remainingDays, setRemainingDays] = useState(0);
  const [teamRequests, setTeamRequests] = useState([]);

  // Filters & UI state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All Roles');
  const [userDeptFilter, setUserDeptFilter] = useState('All Departments');
  const [allLeavesStatusFilter, setAllLeavesStatusFilter] = useState('All Status');
  const [showCreateLeave, setShowCreateLeave] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showAllLeavesModal, setShowAllLeavesModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);

  // Forms
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [commentData, setCommentData] = useState({ comment: '', action: '' }); // approve | reject

  // --- Init current user from localStorage (role & department) ---
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedRole = localStorage.getItem('role');
      const storedUserId = localStorage.getItem('userId');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const role = storedRole ? storedRole.toLowerCase() : 'employee';
      const department = user?.department || user?.Department || user?.departmentName || '';
      const isHRManager = role === 'manager' && (department?.toLowerCase?.() === 'hr' || department?.toLowerCase?.() === 'human resources');

      setCurrentUser({
        id: storedUserId ? parseInt(storedUserId) : undefined,
        name: user?.name || 'User',
        role: role.toUpperCase(),
        department: department || '—',
        isHRManager,
      });
      setLoading(false);
    } catch (e) {
      console.error('User init error', e);
      setCurrentUser({ id: undefined, name: 'User', role: 'MANAGER', department: 'HR', isHRManager: true });
      setLoading(false);
    }
  }, []);

  // --- Fetch combined data ---
  useEffect(() => {
    if (!currentUser) return;
    const fetchAll = async () => {
      try {
        // Personal leaves & balances
        const my = await API.get('/leave/mine');
        setMyLeaves(my.data?.leaves || []);
        setUsedDays(my.data?.usedDays || 0);
        setRemainingDays(my.data?.remainingDays || 0);
        setTotalLeaveDays(my.data?.totalLeaveDays || 0);

        // Team requests (manager scope)
        const team = await API.get('/manager/leaves');
        setTeamRequests(team.data?.leaves || []);

        // HR scopes
        const usersRes = await API.get('/hr/all-users');
        setAllUsers(usersRes.data?.users || []);

        const deptRes = await API.get('/hr/departments');
        setDepartments(deptRes.data?.departments || []);

        const leavesRes = await API.get('/hr/all-leaves');
        setAllLeaves(leavesRes.data?.leaves || []);

        const statsRes = await API.get('/hr/statistics');
        setStatistics(statsRes.data || {});
      } catch (err) {
        console.error('Fetch error', err);
      }
    };
    fetchAll();
  }, [currentUser]);

  // --- Derived lists ---
  const filteredUsers = useMemo(() => {
    return (allUsers || [])
      .filter(u => (userRoleFilter === 'All Roles' ? true : (u.role?.toLowerCase() === userRoleFilter)))
      .filter(u => (userDeptFilter === 'All Departments' ? true : (u.department === userDeptFilter)))
      .filter(u => (userSearch ? ((u.name || '').toLowerCase().includes(userSearch.toLowerCase()) || (u.email || '').toLowerCase().includes(userSearch.toLowerCase())) : true));
  }, [allUsers, userRoleFilter, userDeptFilter, userSearch]);

  const filteredAllLeaves = useMemo(() => {
    return (allLeaves || []).filter(l => allLeavesStatusFilter === 'All Status' ? true : l.status === allLeavesStatusFilter);
  }, [allLeaves, allLeavesStatusFilter]);

  // --- Actions ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = '/login';
  };

  const createLeave = async () => {
    try {
      if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) return;
      const payload = {
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        duration: calculateLeaveDays(leaveForm.startDate, leaveForm.endDate),
        reason: leaveForm.reason,
        status: 'Pending',
        appliedDate: new Date().toISOString().split('T')[0],
        userId: localStorage.getItem('userId'),
      };
      const res = await API.post('/leave/create', payload);
      setMyLeaves(prev => [...prev, res.data?.leave]);
      setShowCreateLeave(false);
      setLeaveForm({ startDate: '', endDate: '', reason: '' });
      alert('Leave request created.');
    } catch (err) {
      console.error(err);
      alert('Leave request could not be submitted.');
    }
  };

  const openDecisionModal = (request, action) => {
    setSelectedRequest(request);
    setCommentData({ comment: '', action });
    setShowCommentModal(true);
  };

  const decideTeamRequest = async () => {
    if (!selectedRequest || !commentData.action) return;
    try {
      if (commentData.action === 'approve') {
        await API.post(`/manager/approve/${selectedRequest.id}`, {});
      } else {
        await API.post(`/manager/reject/${selectedRequest.id}`, { comment: commentData.comment });
      }
      setTeamRequests(prev => prev.map(r => r.id === selectedRequest.id ? { ...r, status: commentData.action === 'approve' ? 'APPROVED' : 'REJECTED', comment: commentData.comment } : r));
      setShowCommentModal(false);
      setCommentData({ comment: '', action: '' });
      setSelectedRequest(null);
      alert(`Request ${commentData.action === 'approve' ? 'approved' : 'rejected'}.`);
    } catch (err) {
      console.error(err);
      alert('Could not update request.');
    }
  };

  const manualLeaveDaysUpdate = async () => {
    try {
      const res = await API.post('/hr/update-leave-days');
      alert(`Leave days updated. ${res.data?.updatedCount || 0} employees affected.`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to update leave days.');
    }
  };

  // -------- Renderers --------
  const StatCard = ({ icon: Icon, title, value, subtitle }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-3">
        <Icon className="h-5 w-5 text-gray-400 mr-2" />
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );

  if (loading) return <div className="p-6">Yükleniyor…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">HR + Manager Dashboard</h1>
            <p className="text-sm text-gray-500">{currentUser?.name} • {currentUser?.department} • {currentUser?.role}</p>
          </div>
          <button onClick={handleLogout} className="inline-flex items-center text-gray-600 hover:text-gray-900">
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="inline-flex rounded-xl overflow-hidden border bg-white">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'hr', label: 'HR Tools' },
            { key: 'manager', label: 'Manager Tools' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm ${activeTab === t.key ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <BarChart3 className="h-5 w-5 text-gray-400 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">My Leave Overview</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard icon={Calendar} title="Total Allowance" value={`${totalLeaveDays} days`} />
                  <StatCard icon={PieChart} title="Used" value={`${usedDays} days`} />
                  <StatCard icon={TrendingUp} title="Remaining" value={`${remainingDays} days`} />
                </div>
                <div className="mt-4 flex items-center space-x-3">
                  <button onClick={() => setShowCreateLeave(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-flex items-center hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" /> Request Leave
                  </button>
                  <button onClick={() => setShowTeamModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg inline-flex items-center hover:bg-green-700">
                    <Users className="h-4 w-4 mr-2" /> Team Requests
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <Eye className="h-5 w-5 text-gray-400 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">My Recent Leave Requests</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Dates</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Days</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Reason</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Applied</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {myLeaves.slice().reverse().slice(0, 8).map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{formatDate(r.startDate)} – {formatDate(r.endDate)}</td>
                          <td className="px-4 py-3">{calculateLeaveDays(r.startDate, r.endDate)}</td>
                          <td className="px-4 py-3">{r.reason}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'APPROVED' ? 'bg-green-100 text-green-700' : r.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-3">{formatDate(r.createdAt || r.appliedDate || new Date())}</td>
                        </tr>
                      ))}
                      {myLeaves.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No leave requests yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* HR quick stats */}
            <div className="space-y-6">
              <StatCard icon={Users} title="Total Users" value={statistics.totalUsers || allUsers.length || 0} />
              <StatCard icon={Calendar} title="Monthly Leaves" value={statistics.monthlyLeaves || 0} />
              <StatCard icon={Clock} title="Active Requests" value={statistics.activeLeaves || 0} />
              <button onClick={() => setShowStatsModal(true)} className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-black">Open HR Statistics</button>
              <button onClick={() => setShowAllLeavesModal(true)} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">View All Leaves</button>
            </div>
          </div>
        )}

        {/* HR TOOLS */}
        {activeTab === 'hr' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-gray-400 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">User Management</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <Search className="h-4 w-4 text-gray-400 mr-2" />
                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or email" className="border rounded-md px-3 py-1 text-sm" />
                  </div>
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-2" />
                    <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)} className="border rounded-md px-3 py-1 text-sm">
                      <option>All Roles</option>
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="hr">HR</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                    <select value={userDeptFilter} onChange={e => setUserDeptFilter(e.target.value)} className="border rounded-md px-3 py-1 text-sm">
                      <option>All Departments</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Role</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{u.name}</td>
                        <td className="px-4 py-3">{u.email}</td>
                        <td className="px-4 py-3 capitalize">{u.role}</td>
                        <td className="px-4 py-3">{u.department || '—'}</td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 text-gray-400 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">HR Statistics</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={manualLeaveDaysUpdate} className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm">Update Leave Days</button>
                  <button onClick={() => setShowAllLeavesModal(true)} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm">View All Leaves</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} title="Total Users" value={statistics.totalUsers || allUsers.length || 0} />
                <StatCard icon={PieChart} title="Active Users" value={statistics.activeUsers || 0} />
                <StatCard icon={Clock} title="Active Requests" value={statistics.activeLeaves || 0} />
                <StatCard icon={Calendar} title="Monthly Leaves" value={statistics.monthlyLeaves || 0} />
              </div>
            </div>
          </div>
        )}

        {/* MANAGER TOOLS */}
        {activeTab === 'manager' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-gray-400 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Team Leave Requests</h2>
                </div>
                <div className="flex items-center">
                  <Filter className="h-4 w-4 text-gray-400 mr-2" />
                  <select value={allLeavesStatusFilter} onChange={e => setAllLeavesStatusFilter(e.target.value)} className="border rounded-md px-3 py-1 text-sm">
                    <option>All Status</option>
                    <option>PENDING</option>
                    <option>APPROVED</option>
                    <option>REJECTED</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Employee</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Dates</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Days</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(allLeavesStatusFilter === 'All Status' ? teamRequests : teamRequests.filter(r => r.status === allLeavesStatusFilter)).map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{r?.user?.name || '—'}</td>
                        <td className="px-4 py-3">{formatDate(r.startDate)} – {formatDate(r.endDate)}</td>
                        <td className="px-4 py-3">{calculateLeaveDays(r.startDate, r.endDate)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'APPROVED' ? 'bg-green-100 text-green-700' : r.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {r.status === 'PENDING' && (
                              <>
                                <button onClick={() => openDecisionModal(r, 'approve')} className="text-green-600 hover:text-green-800 inline-flex items-center">
                                  <Check className="h-4 w-4 mr-1" /> Approve
                                </button>
                                <button onClick={() => openDecisionModal(r, 'reject')} className="text-red-600 hover:text-red-800 inline-flex items-center">
                                  <XCircle className="h-4 w-4 mr-1" /> Reject
                                </button>
                              </>
                            )}
                            <button onClick={() => { setSelectedRequest(r); setCommentData({ comment: r.comment || '', action: '' }); setShowCommentModal(true); }} className="text-blue-600 hover:text-blue-800 inline-flex items-center">
                              <MessageSquare className="h-4 w-4 mr-1" /> {r.comment ? 'View Comment' : 'Add Comment'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {teamRequests.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          <Clock className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                          No team leave requests found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <BarChart3 className="h-5 w-5 text-gray-400 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Team Summary</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Pending Team Requests</span><span className="font-medium text-orange-600">{teamRequests.filter(r => r.status === 'PENDING').length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total Team Requests</span><span className="font-medium">{teamRequests.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">This Month</span><span className="font-medium">{teamRequests.filter(req => { const d = new Date(req.createdAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length}</span></div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Request Annual Leave</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                    <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Date</label>
                    <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Reason</label>
                    <input value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="e.g. Annual leave" className="w-full border rounded-md px-3 py-2" />
                  </div>
                </div>
                <button onClick={createLeave} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 inline-flex items-center justify-center"><Plus className="h-4 w-4 mr-2" />Submit</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showCreateLeave && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium">Create Annual Leave</h3>
              <button onClick={() => setShowCreateLeave(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                  <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className="w-full border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">End Date</label>
                  <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className="w-full border rounded-md px-3 py-2" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Reason</label>
                  <input value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="e.g. Annual leave" className="w-full border rounded-md px-3 py-2" />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowCreateLeave(false)} className="px-3 py-2 rounded-lg border">Cancel</button>
                <button onClick={createLeave} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-medium">Team Leave Requests</h3>
                <p className="text-sm text-gray-500">Review and manage leave requests from your team</p>
              </div>
              <button onClick={() => setShowTeamModal(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Employee</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Dates</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Days</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {teamRequests.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{r?.user?.name || '—'}</td>
                        <td className="px-4 py-3">{formatDate(r.startDate)} – {formatDate(r.endDate)}</td>
                        <td className="px-4 py-3">{calculateLeaveDays(r.startDate, r.endDate)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'APPROVED' ? 'bg-green-100 text-green-700' : r.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {r.status === 'PENDING' && (
                              <>
                                <button onClick={() => openDecisionModal(r, 'approve')} className="text-green-600 hover:text-green-800 inline-flex items-center">
                                  <Check className="h-4 w-4 mr-1" /> Approve
                                </button>
                                <button onClick={() => openDecisionModal(r, 'reject')} className="text-red-600 hover:text-red-800 inline-flex items-center">
                                  <XCircle className="h-4 w-4 mr-1" /> Reject
                                </button>
                              </>
                            )}
                            <button onClick={() => { setSelectedRequest(r); setCommentData({ comment: r.comment || '', action: '' }); setShowCommentModal(true); }} className="text-blue-600 hover:text-blue-800 inline-flex items-center">
                              <MessageSquare className="h-4 w-4 mr-1" /> {r.comment ? 'View Comment' : 'Add Comment'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {teamRequests.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          <Clock className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                          No team leave requests found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Leaves (HR) */}
      {showAllLeavesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-medium">All Leaves</h3>
                <p className="text-sm text-gray-500">Company-wide leave requests</p>
              </div>
              <button onClick={() => setShowAllLeavesModal(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Filter className="h-4 w-4 text-gray-400 mr-2" />
                <select value={allLeavesStatusFilter} onChange={e => setAllLeavesStatusFilter(e.target.value)} className="border rounded-md px-3 py-1 text-sm">
                  <option>All Status</option>
                  <option>PENDING</option>
                  <option>APPROVED</option>
                  <option>REJECTED</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Employee</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Dates</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Days</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Applied</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(allLeavesStatusFilter === 'All Status' ? allLeaves : allLeaves.filter(l => l.status === allLeavesStatusFilter)).map(l => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{l?.user?.name || '—'}</td>
                        <td className="px-4 py-3">{formatDate(l.startDate)} – {formatDate(l.endDate)}</td>
                        <td className="px-4 py-3">{calculateLeaveDays(l.startDate, l.endDate)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.status === 'APPROVED' ? 'bg-green-100 text-green-700' : l.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{l.status}</span>
                        </td>
                        <td className="px-4 py-3">{formatDate(l.createdAt || l.appliedDate || new Date())}</td>
                      </tr>
                    ))}
                    {allLeaves.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No leave data.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve/Reject modal */}
      {showCommentModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium">{commentData.action === 'approve' ? 'Approve' : commentData.action === 'reject' ? 'Reject' : 'Add Comment'}</h3>
              <button onClick={() => { setShowCommentModal(false); setCommentData({ comment: '', action: '' }); setSelectedRequest(null); }} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              <div className="mb-4 bg-gray-50 rounded-lg p-3 text-sm">
                <p><span className="font-medium">Employee:</span> {selectedRequest?.user?.name || '—'}</p>
                <p><span className="font-medium">Duration:</span> {formatDate(selectedRequest?.startDate)} – {formatDate(selectedRequest?.endDate)}</p>
                <p><span className="font-medium">Days:</span> {calculateLeaveDays(selectedRequest?.startDate, selectedRequest?.endDate)} days</p>
                <p><span className="font-medium">Reason:</span> {selectedRequest?.reason}</p>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{commentData.action === 'reject' ? 'Comment (required for rejection):' : 'Comment (optional):'}</label>
              <textarea value={commentData.comment} onChange={e => setCommentData({ ...commentData, comment: e.target.value })} className="w-full border rounded-md px-3 py-2" rows={4} />
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => { setShowCommentModal(false); setCommentData({ comment: '', action: '' }); setSelectedRequest(null); }} className="px-3 py-2 rounded-lg border">Cancel</button>
                <button onClick={decideTeamRequest} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats modal (extra details placeholder) */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium">HR Statistics</h3>
              <button onClick={() => setShowStatsModal(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard icon={Users} title="Total Users" value={statistics.totalUsers || allUsers.length || 0} />
              <StatCard icon={PieChart} title="Active Users" value={statistics.activeUsers || 0} />
              <StatCard icon={Clock} title="Active Requests" value={statistics.activeLeaves || 0} />
              <StatCard icon={Calendar} title="Monthly Leaves" value={statistics.monthlyLeaves || 0} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

