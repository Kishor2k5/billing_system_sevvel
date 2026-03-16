import React, { useState, useEffect, useMemo } from 'react';
import './StaffAttendance.css';
import staffIcon from '../image/icons/staff.svg';
import cashIcon from '../image/icons/cash.svg';

const StaffAttendance = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAttendanceDetailModal, setShowAttendanceDetailModal] = useState(false);
  const [attendanceDetailType, setAttendanceDetailType] = useState('');
  const [dashboardDate, setDashboardDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Staff Master State
  const [staffList, setStaffList] = useState([
    {
      id: 'STF001',
      name: 'Rajesh Kumar',
      mobile: '9876543210',
      designation: 'Cutting Master',
      salaryType: 'daily',
      salaryAmount: 800,
      joiningDate: '2024-01-15',
      isActive: true
    },
    {
      id: 'STF002',
      name: 'Priya Sharma',
      mobile: '9876543211',
      designation: 'Tailor',
      salaryType: 'daily',
      salaryAmount: 600,
      joiningDate: '2024-02-01',
      isActive: true
    },
    {
      id: 'STF003',
      name: 'Amit Patel',
      mobile: '9876543212',
      designation: 'Helper',
      salaryType: 'monthly',
      salaryAmount: 15000,
      joiningDate: '2024-01-10',
      isActive: true
    }
  ]);
  
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [newStaff, setNewStaff] = useState({
    name: '',
    mobile: '',
    designation: '',
    salaryType: 'daily',
    salaryAmount: 0,
    joiningDate: new Date().toISOString().split('T')[0],
    isActive: true
  });

  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [dailyAttendance, setDailyAttendance] = useState({});

  // Advance Salary State
  const [advanceList, setAdvanceList] = useState([]);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [newAdvance, setNewAdvance] = useState({
    staffId: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    reason: '',
    repaymentType: 'monthly'
  });

  // Salary Payment State
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    staffId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    periodFrom: '',
    periodTo: '',
    paymentMode: 'cash',
    notes: ''
  });

  // Report State
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('all');

  // Initialize daily attendance when date changes
  useEffect(() => {
    const existingRecord = attendanceRecords.find(r => r.date === attendanceDate);
    if (existingRecord) {
      setDailyAttendance(existingRecord.attendance);
    } else {
      const newAttendance = {};
      staffList.forEach(staff => {
        if (staff.isActive) {
          newAttendance[staff.id] = {
            status: 'absent',
            overtime: 0,
            remarks: ''
          };
        }
      });
      setDailyAttendance(newAttendance);
    }
  }, [attendanceDate, staffList]);

  // Generate Staff ID
  const generateStaffId = () => {
    const lastId = staffList.length > 0 
      ? Math.max(...staffList.map(s => parseInt(s.id.replace('STF', '')))) 
      : 0;
    return `STF${String(lastId + 1).padStart(3, '0')}`;
  };

  // Add/Edit Staff
  const handleSaveStaff = () => {
    if (!newStaff.name || !newStaff.mobile || !newStaff.salaryAmount) {
      alert('Please fill all required fields');
      return;
    }

    if (editingStaff) {
      setStaffList(staffList.map(s => 
        s.id === editingStaff.id ? { ...newStaff, id: editingStaff.id } : s
      ));
    } else {
      setStaffList([...staffList, { ...newStaff, id: generateStaffId() }]);
    }

    setShowAddStaffModal(false);
    setEditingStaff(null);
    setNewStaff({
      name: '',
      mobile: '',
      designation: '',
      salaryType: 'daily',
      salaryAmount: 0,
      joiningDate: new Date().toISOString().split('T')[0],
      isActive: true
    });
  };

  // Handle Attendance Change
  const handleAttendanceChange = (staffId, field, value) => {
    setDailyAttendance(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value
      }
    }));
  };

  // Save Attendance
  const handleSaveAttendance = () => {
    const existingIndex = attendanceRecords.findIndex(r => r.date === attendanceDate);
    const record = {
      date: attendanceDate,
      attendance: dailyAttendance
    };

    if (existingIndex >= 0) {
      const updated = [...attendanceRecords];
      updated[existingIndex] = record;
      setAttendanceRecords(updated);
    } else {
      setAttendanceRecords([...attendanceRecords, record]);
    }

    alert('Attendance saved successfully!');
  };

  // Add Advance
  const handleSaveAdvance = () => {
    if (!newAdvance.staffId || !newAdvance.amount) {
      alert('Please fill all required fields');
      return;
    }

    setAdvanceList([...advanceList, { 
      ...newAdvance, 
      id: `ADV${Date.now()}`,
      isPaid: false 
    }]);
    setShowAdvanceModal(false);
    setNewAdvance({
      staffId: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      reason: '',
      repaymentType: 'monthly'
    });
  };

  // Add Salary Payment
  const handleSavePayment = () => {
    if (!newPayment.staffId || !newPayment.amount) {
      alert('Please fill all required fields');
      return;
    }

    setSalaryPayments([...salaryPayments, {
      ...newPayment,
      id: `PAY${Date.now()}`,
      timestamp: new Date().toISOString()
    }]);
    setShowPaymentModal(false);
    setNewPayment({
      staffId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      amount: 0,
      periodFrom: '',
      periodTo: '',
      paymentMode: 'cash',
      notes: ''
    });
    alert('Salary payment recorded successfully!');
  };

  // Calculate Salary
  const calculateStaffSalary = (staffId, fromDate, toDate) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return null;

    const relevantRecords = attendanceRecords.filter(r => 
      r.date >= fromDate && r.date <= toDate
    );

    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let totalOvertime = 0;

    relevantRecords.forEach(record => {
      const att = record.attendance[staffId];
      if (att) {
        if (att.status === 'present') presentDays++;
        else if (att.status === 'halfday') halfDays++;
        else absentDays++;
        totalOvertime += parseFloat(att.overtime || 0);
      }
    });

    let grossSalary = 0;
    if (staff.salaryType === 'daily') {
      grossSalary = (presentDays * staff.salaryAmount) + (halfDays * staff.salaryAmount * 0.5);
    } else {
      const totalDays = relevantRecords.length;
      const workingDays = presentDays + (halfDays * 0.5);
      grossSalary = (workingDays / totalDays) * staff.salaryAmount;
    }

    const overtimePay = totalOvertime * 50; // ₹50 per hour overtime

    const advanceTaken = advanceList
      .filter(a => a.staffId === staffId && !a.isPaid)
      .reduce((sum, a) => sum + parseFloat(a.amount), 0);

    const paidSalary = salaryPayments
      .filter(p => p.staffId === staffId)
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const netSalary = grossSalary + overtimePay - advanceTaken;
    const balancePayable = netSalary - paidSalary;

    return {
      staff,
      presentDays,
      halfDays,
      absentDays,
      totalOvertime,
      grossSalary,
      overtimePay,
      advanceTaken,
      netSalary,
      paidSalary,
      balancePayable
    };
  };

  // Dashboard Stats
  const dashboardStats = useMemo(() => {
    const totalStaff = staffList.filter(s => s.isActive).length;
    const selectedRecord = attendanceRecords.find(r => r.date === dashboardDate);
    
    let todayPresent = 0;
    let todayAbsent = 0;
    const presentStaff = [];
    const absentStaff = [];
    
    if (selectedRecord) {
      Object.entries(selectedRecord.attendance).forEach(([staffId, att]) => {
        const staff = staffList.find(s => s.id === staffId);
        if (staff) {
          if (att.status === 'present' || att.status === 'halfday') {
            todayPresent++;
            presentStaff.push(staff.name);
          } else {
            todayAbsent++;
            absentStaff.push(staff.name);
          }
        }
      });
    }

    const totalAdvance = advanceList
      .filter(a => !a.isPaid)
      .reduce((sum, a) => sum + parseFloat(a.amount), 0);

    // Calculate total salary payable till now
    const today = new Date().toISOString().split('T')[0];
    let totalSalaryPayable = 0;

    staffList.filter(s => s.isActive).forEach(staff => {
      const joiningDate = staff.joiningDate;
      const salaryData = calculateStaffSalary(staff.id, joiningDate, today);
      if (salaryData) {
        totalSalaryPayable += salaryData.balancePayable;
      }
    });

    return {
      totalStaff,
      todayPresent,
      todayAbsent,
      presentStaff,
      absentStaff,
      totalAdvance,
      totalSalaryPayable
    };
  }, [staffList, attendanceRecords, advanceList, dashboardDate, salaryPayments]);

  // Format Currency
  const formatCurrency = (value) => {
    return '₹' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Report Data
  const reportData = useMemo(() => {
    if (!reportFromDate || !reportToDate) return [];

    const filteredStaff = selectedStaffFilter === 'all' 
      ? staffList.filter(s => s.isActive)
      : staffList.filter(s => s.id === selectedStaffFilter);

    return filteredStaff.map(staff => 
      calculateStaffSalary(staff.id, reportFromDate, reportToDate)
    ).filter(Boolean);
  }, [reportFromDate, reportToDate, selectedStaffFilter, staffList, attendanceRecords, advanceList, salaryPayments]);

  return (
    <div className="staff-attendance-page">
      <div className="page-header">
        <h1>Staff Attendance Management</h1>
        <div className="header-actions">
          <button 
            className="btn-primary"
            onClick={() => {
              setEditingStaff(null);
              setNewStaff({
                name: '',
                mobile: '',
                designation: '',
                salaryType: 'daily',
                salaryAmount: 0,
                joiningDate: new Date().toISOString().split('T')[0],
                isActive: true
              });
              setShowAddStaffModal(true);
            }}
          >
            + Add Staff
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          Staff Master
        </button>
        <button 
          className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          Daily Attendance
        </button>
        <button 
          className={`tab-btn ${activeTab === 'advance' ? 'active' : ''}`}
          onClick={() => setActiveTab('advance')}
        >
          Advance Salary
        </button>
        <button 
          className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          Salary Payments
        </button>
        <button 
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="dashboard-content">
          <div className="dashboard-date-selector">
            <button 
              className="date-nav-btn"
              onClick={() => {
                const prevDate = new Date(dashboardDate);
                prevDate.setDate(prevDate.getDate() - 1);
                setDashboardDate(prevDate.toISOString().split('T')[0]);
              }}
            >
              ← Previous Day
            </button>
            <input 
              type="date"
              value={dashboardDate}
              onChange={(e) => setDashboardDate(e.target.value)}
              className="dashboard-date-input"
            />
            <button 
              className="date-nav-btn"
              onClick={() => {
                const nextDate = new Date(dashboardDate);
                nextDate.setDate(nextDate.getDate() + 1);
                const today = new Date().toISOString().split('T')[0];
                if (nextDate.toISOString().split('T')[0] <= today) {
                  setDashboardDate(nextDate.toISOString().split('T')[0]);
                }
              }}
              disabled={dashboardDate === new Date().toISOString().split('T')[0]}
            >
              Next Day →
            </button>
            <button 
              className="btn-today"
              onClick={() => setDashboardDate(new Date().toISOString().split('T')[0])}
            >
              Today
            </button>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <img src={staffIcon} alt="Total Staff" />
              </div>
              <div className="stat-info">
                <h3>{dashboardStats.totalStaff}</h3>
                <p>Total Staff</p>
              </div>
            </div>
            <div 
              className="stat-card clickable" 
              onClick={() => {
                setAttendanceDetailType('present');
                setShowAttendanceDetailModal(true);
              }}
            >
              <div className="stat-icon green">
                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{dashboardStats.todayPresent}</h3>
                <p>Today Present</p>
                {dashboardStats.presentStaff.length > 0 && (
                  <div className="staff-names">
                    {dashboardStats.presentStaff.join(', ')}
                  </div>
                )}
              </div>
            </div>
            <div 
              className="stat-card clickable" 
              onClick={() => {
                setAttendanceDetailType('absent');
                setShowAttendanceDetailModal(true);
              }}
            >
              <div className="stat-icon red">
                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{dashboardStats.todayAbsent}</h3>
                <p>Today Absent</p>
                {dashboardStats.absentStaff.length > 0 && (
                  <div className="staff-names">
                    {dashboardStats.absentStaff.join(', ')}
                  </div>
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <img src={cashIcon} alt="Advance Outstanding" />
              </div>
              <div className="stat-info">
                <h3>{formatCurrency(dashboardStats.totalAdvance)}</h3>
                <p>Advance Outstanding</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon salary">
                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{formatCurrency(dashboardStats.totalSalaryPayable)}</h3>
                <p>Total Salary Payable</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Master Tab */}
      {activeTab === 'staff' && (
        <div className="staff-master-content">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Designation</th>
                  <th>Salary Type</th>
                  <th>Salary Amount</th>
                  <th>Joining Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(staff => (
                  <tr key={staff.id}>
                    <td>{staff.id}</td>
                    <td>{staff.name}</td>
                    <td>{staff.mobile}</td>
                    <td>{staff.designation}</td>
                    <td className="capitalize">{staff.salaryType}</td>
                    <td>{formatCurrency(staff.salaryAmount)}</td>
                    <td>{staff.joiningDate}</td>
                    <td>
                      <span className={`status-badge ${staff.isActive ? 'active' : 'inactive'}`}>
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-icon edit"
                          onClick={() => {
                            setEditingStaff(staff);
                            setNewStaff(staff);
                            setShowAddStaffModal(true);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                          </svg>
                        </button>
                        <button 
                          className="btn-icon delete"
                          onClick={() => {
                            if (confirm('Disable this staff member?')) {
                              setStaffList(staffList.map(s => 
                                s.id === staff.id ? { ...s, isActive: false } : s
                              ));
                            }
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="attendance-content">
          <div className="attendance-header">
            <div className="date-selector">
              <label>Attendance Date:</label>
              <input 
                type="date" 
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="date-input"
              />
            </div>
            <button className="btn-success" onClick={handleSaveAttendance}>
              Save Attendance
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Designation</th>
                  <th>Status</th>
                  <th>Overtime (hrs)</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {staffList.filter(s => s.isActive).map(staff => (
                  <tr key={staff.id}>
                    <td>{staff.name}</td>
                    <td>{staff.designation}</td>
                    <td>
                      <select 
                        value={dailyAttendance[staff.id]?.status || 'absent'}
                        onChange={(e) => handleAttendanceChange(staff.id, 'status', e.target.value)}
                        className="status-select"
                      >
                        <option value="present">Present</option>
                        <option value="halfday">Half Day</option>
                        <option value="absent">Absent</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="number"
                        value={dailyAttendance[staff.id]?.overtime || 0}
                        onChange={(e) => handleAttendanceChange(staff.id, 'overtime', e.target.value)}
                        className="overtime-input"
                        min="0"
                        step="0.5"
                      />
                    </td>
                    <td>
                      <input 
                        type="text"
                        value={dailyAttendance[staff.id]?.remarks || ''}
                        onChange={(e) => handleAttendanceChange(staff.id, 'remarks', e.target.value)}
                        className="remarks-input"
                        placeholder="Add remarks..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Advance Salary Tab */}
      {activeTab === 'advance' && (
        <div className="advance-content">
          <div className="advance-header">
            <button className="btn-primary" onClick={() => setShowAdvanceModal(true)}>
              + Add Advance
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Staff Name</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Repayment Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {advanceList.map(advance => {
                  const staff = staffList.find(s => s.id === advance.staffId);
                  return (
                    <tr key={advance.id}>
                      <td>{advance.date}</td>
                      <td>{staff?.name || 'Unknown'}</td>
                      <td>{formatCurrency(advance.amount)}</td>
                      <td>{advance.reason}</td>
                      <td className="capitalize">{advance.repaymentType}</td>
                      <td>
                        <span className={`status-badge ${advance.isPaid ? 'paid' : 'pending'}`}>
                          {advance.isPaid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Salary Payments Tab */}
      {activeTab === 'payments' && (
        <div className="payments-content">
          <div className="payments-header">
            <button className="btn-primary" onClick={() => setShowPaymentModal(true)}>
              + Record Payment
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment Date</th>
                  <th>Staff Name</th>
                  <th>Amount Paid</th>
                  <th>Period</th>
                  <th>Payment Mode</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {salaryPayments.map(payment => {
                  const staff = staffList.find(s => s.id === payment.staffId);
                  return (
                    <tr key={payment.id}>
                      <td>{payment.paymentDate}</td>
                      <td>{staff?.name || 'Unknown'}</td>
                      <td className="text-green font-bold">{formatCurrency(payment.amount)}</td>
                      <td>
                        {payment.periodFrom && payment.periodTo 
                          ? `${payment.periodFrom} to ${payment.periodTo}`
                          : 'N/A'
                        }
                      </td>
                      <td className="capitalize">{payment.paymentMode}</td>
                      <td>{payment.notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="reports-content">
          <div className="report-filters">
            <div className="filter-group">
              <label>From Date:</label>
              <input 
                type="date"
                value={reportFromDate}
                onChange={(e) => setReportFromDate(e.target.value)}
                className="date-input"
              />
            </div>
            <div className="filter-group">
              <label>To Date:</label>
              <input 
                type="date"
                value={reportToDate}
                onChange={(e) => setReportToDate(e.target.value)}
                className="date-input"
              />
            </div>
            <div className="filter-group">
              <label>Staff:</label>
              <select 
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
                className="staff-select"
              >
                <option value="all">All Staff</option>
                {staffList.filter(s => s.isActive).map(staff => (
                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                ))}
              </select>
            </div>
            <button className="btn-primary">Export PDF</button>
          </div>

          {reportData.length > 0 && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Present Days</th>
                    <th>Half Days</th>
                    <th>Absent Days</th>
                    <th>Overtime (hrs)</th>
                    <th>Gross Salary</th>
                    <th>Advance Taken</th>
                  <th>Net Salary</th>
                  <th>Paid Amount</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(data => (
                  <tr key={data.staff.id}>
                    <td>{data.staff.name}</td>
                    <td>{data.presentDays}</td>
                    <td>{data.halfDays}</td>
                    <td>{data.absentDays}</td>
                    <td>{data.totalOvertime}</td>
                    <td>{formatCurrency(data.grossSalary)}</td>
                    <td className="text-red">{formatCurrency(data.advanceTaken)}</td>
                    <td>{formatCurrency(data.netSalary)}</td>
                    <td className="text-blue">{formatCurrency(data.paidSalary)}</td>
                    <td className="text-green font-bold">{formatCurrency(data.balancePayable)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="7" className="text-right font-bold">Total:</td>
                    <td className="font-bold text-green">
                      {formatCurrency(reportData.reduce((sum, d) => sum + d.netSalary, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      {showAddStaffModal && (
        <div className="modal-overlay" onClick={() => setShowAddStaffModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingStaff ? 'Edit Staff' : 'Add New Staff'}</h2>
              <button className="close-btn" onClick={() => setShowAddStaffModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Staff Name *</label>
                  <input 
                    type="text"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                    placeholder="Enter staff name"
                  />
                </div>
                <div className="form-group">
                  <label>Mobile Number *</label>
                  <input 
                    type="text"
                    value={newStaff.mobile}
                    onChange={(e) => setNewStaff({...newStaff, mobile: e.target.value})}
                    placeholder="Enter mobile number"
                  />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input 
                    type="text"
                    value={newStaff.designation}
                    onChange={(e) => setNewStaff({...newStaff, designation: e.target.value})}
                    placeholder="e.g., Tailor, Helper"
                  />
                </div>
                <div className="form-group">
                  <label>Salary Type *</label>
                  <select 
                    value={newStaff.salaryType}
                    onChange={(e) => setNewStaff({...newStaff, salaryType: e.target.value})}
                  >
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Salary Amount *</label>
                  <input 
                    type="number"
                    value={newStaff.salaryAmount}
                    onChange={(e) => setNewStaff({...newStaff, salaryAmount: parseFloat(e.target.value) || 0})}
                    placeholder="Enter salary amount"
                  />
                </div>
                <div className="form-group">
                  <label>Joining Date</label>
                  <input 
                    type="date"
                    value={newStaff.joiningDate}
                    onChange={(e) => setNewStaff({...newStaff, joiningDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddStaffModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveStaff}>
                {editingStaff ? 'Update Staff' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Advance Modal */}
      {showAdvanceModal && (
        <div className="modal-overlay" onClick={() => setShowAdvanceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Advance Salary</h2>
              <button className="close-btn" onClick={() => setShowAdvanceModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Select Staff *</label>
                  <select 
                    value={newAdvance.staffId}
                    onChange={(e) => setNewAdvance({...newAdvance, staffId: e.target.value})}
                  >
                    <option value="">Select Staff</option>
                    {staffList.filter(s => s.isActive).map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input 
                    type="date"
                    value={newAdvance.date}
                    onChange={(e) => setNewAdvance({...newAdvance, date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Advance Amount *</label>
                  <input 
                    type="number"
                    value={newAdvance.amount}
                    onChange={(e) => setNewAdvance({...newAdvance, amount: parseFloat(e.target.value) || 0})}
                    placeholder="Enter amount"
                  />
                </div>
                <div className="form-group">
                  <label>Repayment Type</label>
                  <select 
                    value={newAdvance.repaymentType}
                    onChange={(e) => setNewAdvance({...newAdvance, repaymentType: e.target.value})}
                  >
                    <option value="monthly">Monthly Deduction</option>
                    <option value="onetime">One-time Deduction</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Reason / Notes</label>
                  <textarea 
                    value={newAdvance.reason}
                    onChange={(e) => setNewAdvance({...newAdvance, reason: e.target.value})}
                    placeholder="Enter reason for advance..."
                    rows="3"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAdvanceModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveAdvance}>
                Add Advance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Salary Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Salary Payment</h2>
              <button className="close-btn" onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Select Staff *</label>
                  <select 
                    value={newPayment.staffId}
                    onChange={(e) => setNewPayment({...newPayment, staffId: e.target.value})}
                  >
                    <option value="">Select Staff</option>
                    {staffList.filter(s => s.isActive).map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Date *</label>
                  <input 
                    type="date"
                    value={newPayment.paymentDate}
                    onChange={(e) => setNewPayment({...newPayment, paymentDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Amount Paid *</label>
                  <input 
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})}
                    placeholder="Enter amount"
                  />
                </div>
                <div className="form-group">
                  <label>Payment Mode *</label>
                  <select 
                    value={newPayment.paymentMode}
                    onChange={(e) => setNewPayment({...newPayment, paymentMode: e.target.value})}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Period From</label>
                  <input 
                    type="date"
                    value={newPayment.periodFrom}
                    onChange={(e) => setNewPayment({...newPayment, periodFrom: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Period To</label>
                  <input 
                    type="date"
                    value={newPayment.periodTo}
                    onChange={(e) => setNewPayment({...newPayment, periodTo: e.target.value})}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea 
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
                    placeholder="Add payment notes..."
                    rows="3"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSavePayment}>
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Detail Modal */}
      {showAttendanceDetailModal && (
        <div className="modal-overlay" onClick={() => setShowAttendanceDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {attendanceDetailType === 'present' ? `Present Staff - ${new Date(dashboardDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : `Absent Staff - ${new Date(dashboardDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
              </h2>
              <button className="close-btn" onClick={() => setShowAttendanceDetailModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {attendanceDetailType === 'present' ? (
                dashboardStats.presentStaff.length > 0 ? (
                  <div className="attendance-detail-list">
                    {dashboardStats.presentStaff.map((name, index) => {
                      const staff = staffList.find(s => s.name === name);
                      const selectedRecord = attendanceRecords.find(r => r.date === dashboardDate);
                      const attendance = selectedRecord?.attendance[staff?.id];
                      
                      return (
                        <div key={index} className="attendance-detail-item">
                          <div className="staff-detail">
                            <div className="staff-name-designation">
                              <h4>{name}</h4>
                              <p>{staff?.designation || 'N/A'}</p>
                            </div>
                            <div className="staff-contact">
                              <span>{staff?.mobile || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="attendance-status">
                            <span className={`status-badge ${attendance?.status}`}>
                              {attendance?.status === 'halfday' ? 'Half Day' : 'Present'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No staff present on this date</p>
                  </div>
                )
              ) : (
                dashboardStats.absentStaff.length > 0 ? (
                  <div className="attendance-detail-list">
                    {dashboardStats.absentStaff.map((name, index) => {
                      const staff = staffList.find(s => s.name === name);
                      
                      return (
                        <div key={index} className="attendance-detail-item">
                          <div className="staff-detail">
                            <div className="staff-name-designation">
                              <h4>{name}</h4>
                              <p>{staff?.designation || 'N/A'}</p>
                            </div>
                            <div className="staff-contact">
                              <span>{staff?.mobile || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="attendance-status">
                            <span className="status-badge absent">Absent</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No staff absent on this date</p>
                  </div>
                )
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAttendanceDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffAttendance;
