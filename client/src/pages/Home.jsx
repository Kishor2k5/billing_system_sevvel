import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './Home.css';

function Home() {
  // State for dashboard metrics
  const [toPay, setToPay] = React.useState(0);
  const [toCollect, setToCollect] = React.useState(0);
  const [cashBankBalance, setCashBankBalance] = React.useState(0);
  const [lastUpdate, setLastUpdate] = React.useState(new Date());
  const [transactions, setTransactions] = React.useState([]);
  const [salesData, setSalesData] = React.useState([]);

  // Static checklist data - REMOVED
  /* 
  const checklist = [
    { title: 'Send payment reminder', detail: 'Invoice INV-205 due tomorrow' },
    { title: 'Follow up on demo', detail: 'Call scheduled client at 03:00 PM' },
  ]; 
  */

  React.useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    const fetchDashboardData = async () => {
      try {
        // Fetch metrics
        const purchaseRes = await fetch(`${API_BASE_URL}/api/purchase-invoices/summary`);
        if (purchaseRes.ok) {
          const d = await purchaseRes.json();
          setToPay(Number(d.unpaidTotal || 0));
        }

        const pendingRes = await fetch(`${API_BASE_URL}/api/customers/pending`);
        if (pendingRes.ok) {
          const d = await pendingRes.json();
          const totalPending = (d.customers || []).reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
          setToCollect(totalPending);
        }

        const accountsRes = await fetch(`${API_BASE_URL}/api/accounts`);
        if (accountsRes.ok) {
          const d = await accountsRes.json();
          const totalCashBank = (d.accounts || []).reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
          setCashBankBalance(totalCashBank);
          setLastUpdate(new Date());
        }

        // Fetch Transactions (Bills, Payments, Challans)
        const [billsRes, paymentsRes, challansRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/bills`),
          fetch(`${API_BASE_URL}/api/payments/recent`),
          fetch(`${API_BASE_URL}/api/delivery-challans`)
        ]);

        let allTxns = [];

        if (billsRes.ok) {
          const d = await billsRes.json();
          const bills = (d.bills || []);

          // Process bills for transactions list
          const billTxns = bills.map(b => ({
            date: new Date(b.invoiceDate),
            type: 'Sales Invoice',
            txnNo: b.invoiceNumber,
            party: b.customer?.name || 'Unknown',
            amount: b.grandTotal
          }));
          allTxns = [...allTxns, ...billTxns];

          // Process bills for Sales Chart (Group by Date)
          const salesMap = {};
          bills.forEach(b => {
            const dateStr = new Date(b.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); // DD MMM
            salesMap[dateStr] = (salesMap[dateStr] || 0) + b.grandTotal;
          });

          // Convert to array and sort (simple sort by date string might fail if not careful, but for now we assume recent)
          // Better to sort inputs first or sort using original date objects.
          // Let's take last 7 distinct dates or just showing all sorted by date.

          const sortedBills = [...bills].sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate));
          const salesMapSorted = {};
          sortedBills.forEach(b => {
            const dateStr = new Date(b.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            salesMapSorted[dateStr] = (salesMapSorted[dateStr] || 0) + b.grandTotal;
          });

          const chartData = Object.keys(salesMapSorted).map(date => ({
            name: date,
            sales: salesMapSorted[date]
          }));

          // Keep only last 7 days if too many?
          setSalesData(chartData.slice(-7));
        }

        if (paymentsRes.ok) {
          const d = await paymentsRes.json();
          const payments = (d.payments || []).map(p => ({
            date: new Date(p.paymentDate),
            type: 'Payment In',
            txnNo: p.paymentNumber,
            party: p.customer?.name || 'Unknown',
            amount: p.amount
          }));
          allTxns = [...allTxns, ...payments];
        }

        if (challansRes.ok) {
          const challans = await challansRes.json();
          const formattedChallans = (Array.isArray(challans) ? challans : []).map(c => ({
            date: new Date(c.challanDate),
            type: 'Delivery Challan',
            txnNo: c.challanNumber,
            party: c.customerName || 'Unknown',
            amount: 0
          }));
          allTxns = [...allTxns, ...formattedChallans];
        }

        // Sort by date DESC
        allTxns.sort((a, b) => b.date - a.date);

        // Take top 5
        setTransactions(allTxns.slice(0, 5));

      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <>
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your business performance</p>
        </div>
      </header>

      <section className="overview-grid">
        <article className="overview-card success">
          <p className="label">To Collect</p>
          <p className="value">₹ {toCollect.toLocaleString('en-IN')}</p>
        </article>
        <article className="overview-card warning">
          <p className="label">To Pay</p>
          <p className="value">{`₹ ${toPay.toLocaleString('en-IN')}`}</p>
        </article>
        <article className="overview-card neutral">
          <div className="overview-header">
            <p className="label">Total Cash + Bank Balance</p>
            <p className="timestamp">Last update: {lastUpdate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} | {lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <p className="value">₹ {cashBankBalance.toLocaleString('en-IN')}</p>
        </article>
      </section>

      <section className="detail-grid">
        <article className="transactions-card">
          <header>
            <h2>Latest Transactions</h2>
            <button type="button">See All Transactions</button>
          </header>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Txn No</th>
                  <th>Party Name</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => (
                  <tr key={`${row.txnNo}`}>
                    <td>{row.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>{row.type}</td>
                    <td>{row.txnNo}</td>
                    <td>{row.party}</td>
                    <td>{row.amount > 0 ? `₹${row.amount.toLocaleString('en-IN')}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="sales-chart-card" style={{ background: '#fff', borderRadius: '1.25rem', padding: '1.5rem', border: '1px solid rgba(148, 163, 184, 0.18)', boxShadow: '0 24px 45px -28px rgba(15, 23, 42, 0.35)' }}>
          <header style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Total Sales</h2>
          </header>
          <div style={{ width: '100%', height: 300 }}>
            {salesData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#F1F5F9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="sales" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                No sales data available
              </div>
            )}
          </div>
        </article>
      </section>
    </>
  );
}

export default Home;
