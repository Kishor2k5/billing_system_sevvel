import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText, Filter } from 'lucide-react';
import './Reports.css';
import { exportToExcel } from '../utils/excelExport';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const DEFAULT_REPORT_TYPES = [
  'Sales Report',
  'Purchase Report',
  'GST Summary Report',
  'HSN Summary Report',
  'Customer Ledger',
  'Supplier Ledger',
  'Inventory Report',
  'Outstanding Report',
  'Payment / Receipt Report',
];

const DEFAULT_FILTERS = {
  fromDate: '',
  toDate: '',
  customerSupplier: '',
  item: '',
  gstRate: '',
  paymentStatus: '',
};

const prettyKey = (key) =>
  String(key)
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());

const formatCellValue = (key, value) => {
  if (value === null || value === undefined || value === '') return '-';

  if (typeof value === 'number') {
    const moneyLike = /(amount|value|tax|debit|credit|balance|payable|stock)/i.test(key);
    if (moneyLike) return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  if (/date/i.test(key)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('en-IN');
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return String(value);
};

const Reports = () => {
  const [reportTypes, setReportTypes] = useState(DEFAULT_REPORT_TYPES);
  const [selectedReport, setSelectedReport] = useState(DEFAULT_REPORT_TYPES[0]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [options, setOptions] = useState({
    parties: [],
    items: [],
    gstRates: [],
    paymentStatuses: ['Paid', 'Unpaid', 'Partial'],
  });
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const columns = useMemo(() => {
    if (!records.length) return [];
    return Object.keys(records[0]);
  }, [records]);

  const loadReportOptions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/options`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load report filters');
      }

      setReportTypes(data.reportTypes?.length ? data.reportTypes : DEFAULT_REPORT_TYPES);
      setOptions({
        parties: data.parties || [],
        items: data.items || [],
        gstRates: data.gstRates || [],
        paymentStatuses: data.paymentStatuses || ['Paid', 'Unpaid', 'Partial'],
      });
    } catch (error) {
      console.error('Error loading report options', error);
    }
  }, []);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ reportName: selectedReport });

      Object.entries(filters).forEach(([key, value]) => {
        if (String(value || '').trim()) {
          params.append(key, value);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/reports/data?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch report data');
      }

      setRecords(Array.isArray(data.records) ? data.records : []);
      setSummary(data.summary || {});
      return Array.isArray(data.records) ? data.records : [];
    } catch (error) {
      console.error('Error fetching report data', error);
      setRecords([]);
      setSummary({});
      return [];
    } finally {
      setLoading(false);
    }
  }, [filters, selectedReport]);

  useEffect(() => {
    loadReportOptions();
  }, [loadReportOptions]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const latest = await fetchReportData();
      if (!latest.length) {
        alert('No filtered data to export');
        return;
      }
      exportToExcel(latest, selectedReport);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="reports-page">
      <div className="reports-container">
        <div className="reports-header">
          <div className="header-left">
            <FileText size={32} />
            <div>
              <h1>Reports</h1>
              <p>Filter and export billing, GST, ledger, inventory and outstanding reports.</p>
            </div>
          </div>

          <div className="header-actions">
            <button className="btn-icon" onClick={handleExport} disabled={exporting || loading}>
              <Download size={16} />
              <span>{exporting ? 'Exporting...' : 'Export to Excel'}</span>
            </button>
          </div>
        </div>

        <div className="filters-section">
          <div className="filters-header">
            <button className="btn-toggle-filters" onClick={() => setShowFilters((prev) => !prev)}>
              <Filter size={16} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {showFilters && (
            <div className="filters-grid">
              <div className="filter-group">
                <label>Report</label>
                <select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)}>
                  {reportTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>From Date</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>To Date</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Customer / Supplier</label>
                <select
                  value={filters.customerSupplier}
                  onChange={(e) => handleFilterChange('customerSupplier', e.target.value)}
                >
                  <option value="">All Parties</option>
                  {options.parties.map((party) => (
                    <option key={`${party.type}-${party.name}`} value={party.name}>
                      {party.name} ({party.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Item</label>
                <select value={filters.item} onChange={(e) => handleFilterChange('item', e.target.value)}>
                  <option value="">All Items</option>
                  {options.items.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>GST Rate</label>
                <select value={filters.gstRate} onChange={(e) => handleFilterChange('gstRate', e.target.value)}>
                  <option value="">All Rates</option>
                  {options.gstRates.map((rate) => (
                    <option key={rate} value={rate}>{rate}%</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Payment Status</label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                >
                  <option value="">All Status</option>
                  {options.paymentStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="filter-actions">
                <button className="btn-search" onClick={fetchReportData} disabled={loading}>
                  {loading ? 'Loading...' : 'Apply Filters'}
                </button>
                <button className="btn-reset" onClick={handleReset}>Reset</button>
              </div>
            </div>
          )}
        </div>

        <div className="summary-cards">
          {Object.entries(summary).map(([key, value]) => (
            <div key={key} className="summary-card">
              <div className="card-header">
                <h3>{prettyKey(key)}</h3>
              </div>
              <div className="card-value">{formatCellValue(key, value)}</div>
            </div>
          ))}
        </div>

        <div className="report-table-section">
          <div className="table-header">
            <h2>{selectedReport}</h2>
            <span className="record-count">{records.length} Records</span>
          </div>

          <div className="table-container">
            {loading ? (
              <div className="loading">Loading report data...</div>
            ) : records.length === 0 ? (
              <div className="no-data">No records found for the selected filters</div>
            ) : (
              <table className="report-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column}>{prettyKey(column)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, rowIndex) => (
                    <tr key={`${rowIndex}-${record.id || ''}`}>
                      {columns.map((column) => (
                        <td key={column}>{formatCellValue(column, record[column])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
