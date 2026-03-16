import React, { useState, useEffect } from 'react';
import './PaymentIn.css';

const PaymentIn = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const res = await fetch(`${API_BASE_URL}/api/buyers`);
            const data = await res.json();
            setCustomers(data.buyers || []);
        } catch (err) {
            console.error('Failed to fetch customers:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCustomerClick = (customer) => {
        setSelectedCustomer(customer);
        setIsModalOpen(true);
    };

    const handlePaymentSuccess = () => {
        setIsModalOpen(false);
        fetchCustomers(); // Refresh list
    };

    return (
        <div className="payment-in-page">
            <div className="payment-in-header">
                <h2>Payment In</h2>
                <p style={{ color: '#6b7280', marginTop: 8 }}>Select a customer to receive payment from.</p>
            </div>

            {loading ? (
                <div className="loading-state">Loading pending payments...</div>
            ) : customers.length === 0 ? (
                <div className="empty-state">No customers with pending payments found!</div>
            ) : (
                <div className="customer-list-grid">
                    {customers.map((customer) => (
                        <div
                            key={customer.partyId}
                            className="customer-card"
                            onClick={() => handleCustomerClick(customer)}
                        >
                            <div className="customer-card-header">
                                <div>
                                    <div className="customer-name">{customer.name}</div>
                                    <div className="customer-phone">{customer.phone}</div>
                                </div>
                            </div>
                            <div className="customer-balance">
                                <div className="balance-label">Pending Amount</div>
                                <div className="balance-amount">₹{(Number(customer.balance) || 0).toLocaleString('en-IN')}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && selectedCustomer && (
                <PaymentModal
                    customer={selectedCustomer}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
};

const PaymentModal = ({ customer, onClose, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState('Cash');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');

    const [invoices, setInvoices] = useState([]);
    const [selectedInvoices, setSelectedInvoices] = useState({});
    const [loadingInvoices, setLoadingInvoices] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchUnpaidInvoices();
    }, [customer.partyId]);

    const fetchUnpaidInvoices = async () => {
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const res = await fetch(`${API_BASE_URL}/api/customers/${customer.partyId}/unpaid-bills`);
            const data = await res.json();
            setInvoices(data.bills || []);
        } catch (err) {
            console.error('Failed to fetch invoices:', err);
        } finally {
            setLoadingInvoices(false);
        }
    };

    const handleInvoiceSelect = (invoiceNumber, isSelected) => {
        setSelectedInvoices(prev => ({
            ...prev,
            [invoiceNumber]: isSelected
        }));
    };

    // Auto-calculate amount if invoices selected?
    // User Requirement: "Invoice number (selectable if multiple unpaid invoices)"
    // Usually if user selects invoices, the Total Amount should update to sum of selected.
    // OR if user enters Amount, we might just apply it.
    // Let's make it bidirectional:
    // 1. If user selects invoices, sum their balances -> Amount.
    // 2. If user enters Amount, checking boxes doesn't change amount but indicates which to pay.
    // Let's stick to: Selecting invoices updates the Amount field to the sum of selected balances.

    const handleInvoiceCheckboxChange = (bill) => {
        const isSelected = !selectedInvoices[bill.invoiceNumber];
        const newSelected = { ...selectedInvoices, [bill.invoiceNumber]: isSelected };
        setSelectedInvoices(newSelected);

        // Calculate sum of selected
        const totalSelected = invoices.reduce((sum, inv) => {
            if (newSelected[inv.invoiceNumber]) {
                return sum + (Number(inv.balanceAmount) || 0);
            }
            return sum;
        }, 0);

        if (totalSelected > 0) {
            setAmount(totalSelected);
        }
    };

    // Balance calculation
    const currentPending = Number(customer.balance) || 0; // Or sum of invoices
    // Let's use the sum of fetched invoices as 'Pending for these bills' to be more precise, 
    // but customer balance is the true ledger balance.
    const payAmount = Number(amount) || 0;
    const newBalance = currentPending - payAmount;

    const handleSubmit = async () => {
        if (payAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setIsSubmitting(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

            const selectedInvoiceList = Object.keys(selectedInvoices)
                .filter(k => selectedInvoices[k])
                .map(k => ({ invoiceNumber: k }));

            const payload = {
                customerId: customer.partyId,
                amount: payAmount,
                mode,
                date,
                notes,
                bankDetails: mode === 'Bank' ? { bankName, accountNumber } : undefined,
                selectedInvoices: selectedInvoiceList
            };

            const res = await fetch(`${API_BASE_URL}/api/payments/in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Payment failed');

            alert('Payment recorded successfully!');
            onSuccess();
        } catch (err) {
            console.error('Payment error', err);
            alert('Failed to record payment');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="payment-modal">
                <div className="modal-header">
                    <h3>Receive Payment</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="payment-form-grid">
                        <div className="left-col">
                            <div className="form-group">
                                <label>Customer Name</label>
                                <input type="text" className="form-input" value={customer.name} readOnly disabled style={{ background: '#f3f4f6' }} />
                            </div>

                            <div className="form-group">
                                <label>Date</label>
                                <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Payment Mode</label>
                                <select className="form-select" value={mode} onChange={e => setMode(e.target.value)}>
                                    <option value="Cash">Cash</option>
                                    <option value="Bank">Bank Transfer / UPI</option>
                                </select>
                            </div>

                            {mode === 'Bank' && (
                                <>
                                    <div className="form-group">
                                        <label>Bank Name</label>
                                        <input type="text" className="form-input" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. HDFC Bank" />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="right-col">
                            <div className="form-group" style={{ background: '#eff6ff', padding: 15, borderRadius: 8 }}>
                                <label>Current Balance</label>
                                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937' }}>
                                    ₹{currentPending.toLocaleString('en-IN')}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Amount Received (₹)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    style={{ fontSize: 18, fontWeight: 600 }}
                                />
                            </div>

                            <div className="form-group">
                                <label>New Balance</label>
                                <div style={{ fontSize: 18, fontWeight: 600, color: newBalance < 0 ? '#10b981' : '#ef4444' }}>
                                    ₹{newBalance.toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Notes</label>
                        <textarea className="form-textarea" rows="2" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Enter payment notes..."></textarea>
                    </div>

                    <div className="invoices-section">
                        <div className="invoices-header">Unpaid Invoices</div>
                        <div className="invoices-list">
                            {loadingInvoices ? (
                                <div style={{ padding: 20, textAlign: 'center' }}>Loading invoices...</div>
                            ) : invoices.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No unpaid invoices found</div>
                            ) : (
                                invoices.map(bill => (
                                    <div key={bill.invoiceNumber} className="invoice-item">
                                        <input
                                            type="checkbox"
                                            className="invoice-checkbox"
                                            checked={!!selectedInvoices[bill.invoiceNumber]}
                                            onChange={() => handleInvoiceCheckboxChange(bill)}
                                        />
                                        <div className="invoice-details">
                                            <div className="inv-number">{bill.invoiceNumber}</div>
                                            <div className="inv-date">{new Date(bill.invoiceDate).toLocaleDateString()}</div>
                                            <div className="inv-amount">Total: ₹{bill.grandTotal}</div>
                                            <div className="inv-balance">Due: ₹{bill.balanceAmount}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="btn-save" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentIn;
