import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './ItemReportPage.css';

const formatCurrency = (value) => {
  const amount = Number.isFinite(value) ? value : 0;
  return (
    '₹ ' +
    amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function ItemReportPage() {
  const navigate = useNavigate();
  const { itemId } = useParams();

  const [item, setItem] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [transactionType, setTransactionType] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  try {
    const currentHost = window.location.host;
    if (!API_BASE_URL || API_BASE_URL.includes(currentHost)) {
      API_BASE_URL = 'http://localhost:5000';
    }
  } catch (e) {
    API_BASE_URL = 'http://localhost:5000';
  }

  // Load item report
  const loadReport = useCallback(async () => {
    if (!itemId) {
      setError('Item ID missing');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (transactionType && transactionType !== 'All') params.append('transactionType', transactionType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`${API_BASE_URL}/api/items/${itemId}/report?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to load report');

      setItem(data.item);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to load report:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [itemId, transactionType, startDate, endDate, API_BASE_URL]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Get unique transaction types
  const transactionTypes = useMemo(() => {
    const types = new Set(transactions.map((t) => t.transactionType).filter(Boolean));
    return ['All', ...Array.from(types).sort()];
  }, [transactions]);

  // Export to CSV
  const handleExport = () => {
    const csv = [
      ['Item Report: ' + (item?.name || 'Unknown')],
      ['Generated: ' + new Date().toLocaleDateString('en-IN')],
      [''],
      ['Item Details'],
      ['Code', item?.code || '-'],
      ['Category', item?.category || '-'],
      ['HSN/SAC', item?.hsnSac || '-'],
      ['Current Stock', item?.stock || 0],
      ['Unit', item?.unit || 'PCS'],
      ['Manufacturing Cost', formatCurrency(item?.purchasePrice || 0)],
      ['Selling Price', formatCurrency(item?.salePrice || 0)],
      ['Min Stock Level', item?.minStock || 0],
      [''],
      ['Stock Movement History'],
      ['Date', 'Transaction Type', 'Qty In', 'Qty Out', 'Balance'],
      ...transactions.map((tx) => [
        formatDate(tx.transactionDate),
        tx.transactionType,
        tx.quantityIn || 0,
        tx.quantityOut || 0,
        tx.balance || 0,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `item-report-${item?.code || 'unknown'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="report-loading">
        <div className="spinner"></div>
        <p>Loading report...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="report-error">
        <p>{error || 'Item not found'}</p>
        <button className="btn-back" onClick={() => navigate('/items')}>
          ← Back to Items
        </button>
      </div>
    );
  }

  return (
    <div className="report-container">
      {/* Header */}
      <div className="report-header">
        <div>
          <h1>Item Report</h1>
          <p>Detailed inventory analysis and stock movement history</p>
        </div>
        <div className="report-actions">
          <button className="btn-secondary" onClick={handlePrint}>
            🖨️ Print
          </button>
          <button className="btn-secondary" onClick={handleExport}>
            💾 Export
          </button>
          <button className="btn-secondary" onClick={() => navigate('/items')}>
            ← Back
          </button>
        </div>
      </div>

      {/* Item Details Card */}
      <div className="report-card">
        <h2>Item Details</h2>
        <div className="item-details-grid">
          <div className="detail-row">
            <span className="detail-label">Item Name</span>
            <span className="detail-value">{item.name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Item Code</span>
            <span className="detail-value">{item.code || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Category</span>
            <span className="detail-value">{item.category || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">HSN/SAC</span>
            <span className="detail-value">{item.hsnSac || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Current Stock</span>
            <span className="detail-value">
              {item.stock || 0} {item.unit || 'PCS'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Min Stock Level</span>
            <span className="detail-value">{item.minStock || 0}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Manufacturing Cost</span>
            <span className="detail-value">{formatCurrency(item.purchasePrice || 0)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Selling Price</span>
            <span className="detail-value">{formatCurrency(item.salePrice || 0)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Stock Value</span>
            <span className="detail-value">
              {formatCurrency((item.stock || 0) * (item.purchasePrice || 0))}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className={`status-badge status-${item.status?.toLowerCase().replace(' ', '-')}`}>
              {item.status || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="report-card">
        <h2>Filters</h2>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Transaction Type</label>
            <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)}>
              {transactionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>From Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>To Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Stock Movement History */}
      <div className="report-card">
        <h2>Stock Movement History</h2>
        {transactions.length === 0 ? (
          <div className="empty-history">
            <p>No transactions found</p>
          </div>
        ) : (
          <div className="history-table">
            <div className="table-header">
              <div className="col-date">Date</div>
              <div className="col-type">Type</div>
              <div className="col-qty">Qty In</div>
              <div className="col-qty">Qty Out</div>
              <div className="col-balance">Balance</div>
              <div className="col-reference">Reference</div>
              <div className="col-batch">Batch</div>
            </div>
            <div className="table-body">
              {transactions.map((tx, idx) => (
                <div key={tx.id || idx} className="table-row">
                  <div className="col-date">{formatDate(tx.transactionDate)}</div>
                  <div className="col-type">{tx.transactionType}</div>
                  <div className="col-qty">{tx.quantityIn > 0 ? '+' + tx.quantityIn : '-'}</div>
                  <div className="col-qty">{tx.quantityOut > 0 ? '-' + tx.quantityOut : '-'}</div>
                  <div className="col-balance">{tx.balance}</div>
                  <div className="col-reference">{tx.referenceType || '-'}</div>
                  <div className="col-batch">{tx.manufacturingBatch || '-'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ItemReportPage;
