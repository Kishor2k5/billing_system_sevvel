import React, { useState, useEffect } from 'react';
import './CashAndBank.css';

const CashAndBank = () => {
    const [balances, setBalances] = useState({ cash: 0, bank: 0 });
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

            // Fetch Accounts (Balances)
            const accRes = await fetch(`${API_BASE_URL}/api/accounts`);
            const accData = await accRes.json();

            const newBalances = { cash: 0, bank: 0 };
            if (accData.accounts) {
                accData.accounts.forEach(acc => {
                    if (acc.accountName === 'Cash In Hand') newBalances.cash = acc.balance;
                    if (acc.accountName === 'Bank Account') newBalances.bank = acc.balance;
                });
            }
            setBalances(newBalances);

            // Fetch Recent Payments (Transactions)
            const payRes = await fetch(`${API_BASE_URL}/api/payments/recent`);
            const payData = await payRes.json();
            setTransactions(payData.payments || []);

        } catch (err) {
            console.error('Failed to fetch cash & bank data', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return '₹' + (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    };

    return (
        <div className="cash-bank-page">
            <div className="cash-bank-header">
                <h2>Cash & Bank</h2>
            </div>

            <div className="cards-grid">
                <div className="balance-card">
                    <div className="card-title">
                        <span>Cash In Hand</span>
                        <div className="card-icon cash-icon">💵</div>
                    </div>
                    <div className="card-amount">{formatCurrency(balances.cash)}</div>
                </div>

                <div className="balance-card">
                    <div className="card-title">
                        <span>Bank Account</span>
                        <div className="card-icon bank-icon">🏦</div>
                    </div>
                    <div className="card-amount">{formatCurrency(balances.bank)}</div>
                </div>
            </div>

            <div className="transactions-section">
                <div className="section-header">Recent Transactions</div>
                {loading ? (
                    <div className="empty-state">Loading...</div>
                ) : transactions.length === 0 ? (
                    <div className="empty-state">No transactions found</div>
                ) : (
                    <table className="transactions-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Ref No.</th>
                                <th>Party</th>
                                <th>Mode</th>
                                <th>Notes</th>
                                <th className="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx) => (
                                <tr key={tx._id}>
                                    <td>{new Date(tx.paymentDate).toLocaleDateString()}</td>
                                    <td>{tx.paymentNumber}</td>
                                    <td>{tx.customer?.name}</td>
                                    <td>
                                        <span className={`badge ${tx.mode === 'Cash' ? 'badge-cash' : 'badge-bank'}`}>
                                            {tx.mode}
                                        </span>
                                    </td>
                                    <td>{tx.notes || '-'}</td>
                                    <td className="text-right amount-plus">+ {formatCurrency(tx.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default CashAndBank;
