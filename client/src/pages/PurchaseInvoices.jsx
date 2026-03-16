import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PurchaseInvoices.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const mockInvoices = [];

const PurchaseInvoices = () => {
  const navigate = useNavigate();
  const [bannerVisible, setBannerVisible] = useState(true);
  const [dateRange, setDateRange] = useState('Last 365 Days');
  const [sortAsc, setSortAsc] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/purchase-invoices`);
        const data = await res.json();
        if (res.ok && data.invoices) {
          setInvoices(data.invoices.map((inv) => ({
            id: inv._id,
            date: new Date(inv.invoiceDate).toISOString().split('T')[0],
            number: inv.invoiceNumber,
            party: inv.partyName,
            amount: inv.totalAmount,
            status: inv.status || 'Unpaid',
            dueIn: '',
          })));
        }
      } catch (error) {
        console.error('Error fetching purchase invoices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const sortedInvoices = useMemo(() => {
    const sorted = [...invoices].sort((a, b) => {
      const aDate = new Date(a.date).getTime();
      const bDate = new Date(b.date).getTime();
      return sortAsc ? aDate - bDate : bDate - aDate;
    });
    return sorted;
  }, [invoices, sortAsc]);

  const handleSortToggle = () => setSortAsc(prev => !prev);

  return (
    <div className="purchase-page">
      {/* Header */}
      <header className="page-header">
        <div className="page-title-group">
          <h1>Purchase Invoices</h1>
        </div>
        <div className="page-actions">
          <button className="ghost-btn">Reports ▾</button>
          <button className="icon-btn" aria-label="Settings">
            <span className="icon">⚙️</span>
          </button>
          <button className="icon-btn" aria-label="Help">
            <span className="icon">❔</span>
          </button>
        </div>
      </header>

      {/* Summary cards */}
      { /* Summary: compute totals from invoices (use `amount` field) */ }
      <div className="summary-row">
        <div className="summary-card highlighted">
          <span className="label">Total Purchases</span>
          <span className="value">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(invoices.reduce((s, i) => s + (i.amount || 0), 0))}</span>
        </div>
        <div className="summary-card">
          <span className="label">Paid</span>
          <span className="value">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(invoices.reduce((s, i) => s + ((i.status === 'Paid' ? i.amount : 0) || 0), 0))}</span>
        </div>
        <div className="summary-card">
          <span className="label">Unpaid</span>
          <span className="value">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(invoices.reduce((s, i) => s + ((i.status !== 'Paid' ? i.amount : 0) || 0), 0))}</span>
        </div>
      </div>

      {/* Filters and actions */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="icon-btn" aria-label="Search" title="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <select
            className="select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
            <option>Last 180 Days</option>
            <option>Last 365 Days</option>
            <option>Custom Range</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="primary-btn" onClick={() => navigate('/purchase-invoices/create')}>
            Create Purchase Invoice
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={handleSortToggle} className="sortable">
                  Date
                  <span className="sort-caret">{sortAsc ? '▲' : '▼'}</span>
                </th>
                <th>Purchase Invoice Number</th>
                <th>Party Name</th>
                <th>Due In</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-state">Loading…</td>
                </tr>
              ) : sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    <div className="empty-wrap">
                      <div className="empty-icon">🛒</div>
                      <p>No Transactions Matching the current filter</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.date}</td>
                    <td>{inv.number}</td>
                    <td>{inv.party}</td>
                    <td>{inv.dueIn}</td>
                    <td>₹ {inv.amount}</td>
                    <td>
                      <span className={`pill ${inv.status.toLowerCase()}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseInvoices;
