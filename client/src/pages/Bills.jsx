import React, { useState, useEffect } from 'react';
import InvoicePrint from '../components/InvoicePrint';
import './Bills.css';

const Bills = () => {
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState({ totalSales: 0, todaySales: 0, monthSales: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [printBillData, setPrintBillData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    try {
      const [bRes, sRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/bills`),
        fetch(`${API_BASE_URL}/api/bills/summary`)
      ]);

      if (!bRes.ok) throw new Error(`Bills fetch failed: ${bRes.status}`);
      if (!sRes.ok) throw new Error(`Summary fetch failed: ${sRes.status}`);

      const bData = await bRes.json();

      // If summary endpoint fails (404 or similar), compute summary client-side from bills
      if (!sRes.ok) {
        const billsArr = bData.bills || [];
        const total = billsArr.reduce((s, b) => s + (Number(b.grandTotal) || 0), 0);

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        let today = 0;
        let month = 0;

        billsArr.forEach((b) => {
          const d = b.invoiceDate ? new Date(b.invoiceDate) : null;
          if (d) {
            if (d >= startOfToday && d < startOfTomorrow) today += Number(b.grandTotal) || 0;
            if (d >= startOfMonth && d < startOfNextMonth) month += Number(b.grandTotal) || 0;
          }
        });

        setBills(billsArr);
        setSummary({ totalSales: total, todaySales: today, monthSales: month });
        setError(`Summary endpoint returned ${sRes.status}; showing computed totals from bills.`);
        return;
      }

      const sData = await sRes.json();

      setBills(bData.bills || []);
      setSummary(sData || { totalSales: 0, todaySales: 0, monthSales: 0 });
    } catch (err) {
      console.error('Failed to fetch bills or summary', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (v) => '₹' + (Number(v) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const handleViewPDF = async (invoiceNumber) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    try {
      // Fetch the bill details
      const response = await fetch(`${API_BASE_URL}/api/bills`);
      const data = await response.json();
      const bill = data.bills.find(b => b.invoiceNumber === invoiceNumber);

      if (!bill) {
        alert('Bill not found');
        return;
      }

      // Transform bill data for InvoicePrint component
      const invoiceData = {
        invoiceNumber: bill.invoiceNumber,
        invoiceDate: bill.invoiceDate ? new Date(bill.invoiceDate).toLocaleDateString('en-IN') : '',
        dueDate: bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-IN') : ''
      };

      const billTo = {
        name: bill.customer?.name || '',
        phone: bill.customer?.phone || '',
        gstNumber: bill.customer?.gstNumber || '',
        address: bill.customer?.addressLine || ''
      };

      const items = (bill.items || []).map(item => ({
        name: item.name,
        hsn: item.hsn || '',
        quantity: item.quantity,
        unit: item.unit || 'PCS',
        price: item.price,
        discount: item.discount || 0,
        tax: item.tax || 0,
        amount: item.amount
      }));

      const summaryData = {
        subtotal: bill.subtotal || 0,
        totalDiscount: bill.totalDiscount || 0,
        taxableAmount: bill.taxableAmount || 0,
        totalTax: bill.totalTax || 0,
        additionalCharges: bill.additionalCharges || 0,
        grandTotal: bill.grandTotal || 0
      };

      setPrintBillData({
        invoice: invoiceData,
        billTo: billTo,
        items: items,
        summary: summaryData
      });

      setShowPrintView(true);

      // Wait for render then print
      setTimeout(() => {
        window.print();
        setTimeout(() => setShowPrintView(false), 100);
      }, 100);
    } catch (err) {
      console.error('Failed to fetch bill:', err);
      alert('Failed to load bill details');
    }
  };

  return (
    <div className="bills-page">
      <div className="bills-header">
        <h2>Sales Bills</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn" onClick={fetchData} disabled={loading} style={{ padding: '8px 12px', marginRight: 8 }}>Refresh</button>
          <div className="bills-summary">
            <div className="summary-item">
              <div className="label">Total Sales</div>
              <div className="value">{formatCurrency(summary.totalSales)}</div>
            </div>
            <div className="summary-item">
              <div className="label">Today Sales</div>
              <div className="value">{formatCurrency(summary.todaySales)}</div>
            </div>
            <div className="summary-item">
              <div className="label">This Month</div>
              <div className="value">{formatCurrency(summary.monthSales)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bills-list">
        {error && <div style={{ color: 'red', padding: 12, background: '#fff6f6', borderRadius: 6 }}>{error}</div>}
        {loading ? (
          <div>Loading...</div>
        ) : bills.length === 0 ? (
          <div>No bills found</div>
        ) : (
          <table className="bills-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Customer</th>
                <th className="text-right">Amount</th>

                <th className="text-right">Paid</th>
                <th className="text-right">Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b._id}>
                  <td>{b.invoiceNumber}</td>
                  <td>{b.invoiceDate ? new Date(b.invoiceDate).toLocaleDateString() : ''}</td>
                  <td>{b.customer?.name}</td>
                  <td className="text-right">{formatCurrency(b.grandTotal)}</td>

                  <td className="text-right">{formatCurrency(b.paidAmount || 0)}</td>
                  <td className="text-right" style={{ color: b.balanceAmount > 0 ? '#ef4444' : '#1f2937' }}>
                    {formatCurrency(b.balanceAmount !== undefined ? b.balanceAmount : b.grandTotal)}
                  </td>
                  <td className="actions">
                    <button
                      onClick={() => handleViewPDF(b.invoiceNumber)}
                      className="link-button"
                      style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >
                      View PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Hidden printable invoice */}
      {showPrintView && printBillData && (
        <div className="print-section" style={{ display: 'none' }}>
          <InvoicePrint
            invoice={printBillData.invoice}
            billTo={printBillData.billTo}
            items={printBillData.items}
            summary={printBillData.summary}
          />
        </div>
      )}
    </div>
  );
};

export default Bills;