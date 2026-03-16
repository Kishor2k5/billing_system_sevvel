import React, { useEffect, useState } from 'react';
import './CustomerHistoryDrawer.css';

export default function CustomerHistoryDrawer({ isOpen, customerData, onClose }){
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL && !import.meta.env.VITE_API_BASE_URL.includes(window.location.host)
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:5000';

  useEffect(()=>{
    if (!isOpen) return;
    const id = customerData?._id ?? customerData?.id ?? customerData?.partyId;
    const fetchInvoices = async ()=>{
      setLoading(true);
      try{
        const q = new URLSearchParams();
        if (fromDate) q.set('from', fromDate);
        if (toDate) q.set('to', toDate);
        const res = await fetch(`${API_BASE_URL}/api/parties/${id}/invoices?${q.toString()}`);
        const contentType = res.headers.get('content-type')||'';
        const data = contentType.includes('application/json') ? await res.json() : { __rawText: await res.text() };
        if (!res.ok) throw new Error((data && data.message) || data.__rawText || res.statusText);
        setInvoices(Array.isArray(data.invoices)?data.invoices:data);
      }catch(err){ console.error(err); setInvoices([]);}finally{setLoading(false)}
    };
    fetchInvoices();
  },[isOpen, customerData, fromDate, toDate]);

  if (!isOpen) return null;

  const totalCount = invoices.length;
  const totalValue = invoices.reduce((s,i)=>s + (Number(i.total) || Number(i.amount) || 0),0);

  // Aggregate products from all invoices
  const productStats = {};
  invoices.forEach(inv => {
    if (inv.items && Array.isArray(inv.items)) {
      inv.items.forEach(item => {
        const name = item.name || item.itemName || 'Unknown Item';
        if (!productStats[name]) {
          productStats[name] = { quantity: 0, amount: 0 };
        }
        productStats[name].quantity += Number(item.quantity) || 0;
        productStats[name].amount += Number(item.amount) || 0;
      });
    }
  });

  // Convert to array and sort by amount
  const topProducts = Object.entries(productStats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10); // Top 10 products

  const maxAmount = topProducts.length > 0 ? topProducts[0].amount : 1;

  return (
    <div className="drawer-overlay history" onMouseDown={onClose}>
      <aside className="drawer history-drawer" onMouseDown={(e)=>e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h3>Purchase History</h3>
            <div className="sub">{customerData?.name} {customerData?.phone ? `— ${customerData.phone}` : ''}</div>
          </div>
          <button className="close" onClick={onClose}>✕</button>
        </div>

        <div className="history-controls">
          <label>
            <span>From</span>
            <input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} />
          </label>
        </div>

        <div className="history-summary-cards">
          <div className="summary-card-small">
            <div className="label">Total Invoices</div>
            <div className="value">{totalCount}</div>
          </div>
          <div className="summary-card-small">
            <div className="label">Total Purchases</div>
            <div className="value">₹ {totalValue.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="history-list">
          {loading && <div className="empty">Loading…</div>}
          {!loading && !invoices.length && <div className="empty">No invoices found for this customer.</div>}
          {!loading && invoices.length > 0 && (
            <>
              <div className="history-table-header">
                <span>Invoice</span>
                <span>Date</span>
                <span>Items</span>
                <span>Amount</span>
                <span>Action</span>
              </div>
              {invoices.map((inv)=> (
                <div className="history-row" key={inv.invoiceNumber||inv._id||inv.id}>
                  <div className="col number">{inv.invoiceNumber || inv.number || '-'}</div>
                  <div className="col date">{inv.date || inv.invoiceDate || '-'}</div>
                  <div className="col items">{inv.items?.length ?? inv.itemCount ?? '-'} items</div>
                  <div className="col amount">₹ {Number(inv.total || inv.amount || 0).toLocaleString('en-IN')}</div>
                  <div className="col action">
                    <a 
                      href={`${API_BASE_URL}/api/bills/${encodeURIComponent(inv.invoiceNumber)}/pdf`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="view-bill-btn"
                    >
                      View Bill
                    </a>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Product Purchase Chart */}
        {!loading && topProducts.length > 0 && (
          <div className="product-chart-section">
            <h4 className="chart-title">Products Purchased</h4>
            <div className="product-chart">
              {topProducts.map((product, idx) => (
                <div className="product-bar-item" key={idx}>
                  <div className="product-info">
                    <span className="product-name">{product.name}</span>
                    <span className="product-qty">{product.quantity} qty</span>
                  </div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ width: `${(product.amount / maxAmount) * 100}%` }}
                    />
                  </div>
                  <span className="product-amount">₹ {product.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
