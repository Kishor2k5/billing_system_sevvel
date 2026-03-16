import React, { useState, useEffect } from 'react';
import './PaymentIn.css';

const PaymentOut = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const res = await fetch(`${API_BASE_URL}/api/sellers-with-unpaid`);
            const data = await res.json();
            setSuppliers(data.sellers || []);
        } catch (err) {
            console.error('Failed to fetch suppliers:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSupplierClick = (supplier) => {
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
    };

    const handlePaymentSuccess = () => {
        setIsModalOpen(false);
        fetchSuppliers(); // Refresh list
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone.includes(searchTerm)
    );

    return (
        <div className="payment-in-page">
            <div className="payment-in-header">
                <h2>Payment Out</h2>
                <p style={{ color: '#6b7280', marginTop: 8 }}>Select a supplier to make payment from outstanding purchase invoices.</p>
            </div>

            <div style={{ marginBottom: 20 }}>
                <input
                    type="text"
                    placeholder="Search supplier by name or phone..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px 15px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontSize: '14px',
                        fontFamily: 'inherit'
                    }}
                />
            </div>

            {loading ? (
                <div className="loading-state">Loading suppliers with pending payments...</div>
            ) : filteredSuppliers.length === 0 ? (
                <div className="empty-state">
                    {suppliers.length === 0 
                        ? 'No suppliers with pending payments found!' 
                        : 'No suppliers match your search.'}
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {filteredSuppliers.map((supplier) => (
                        <div
                            key={supplier.partyId}
                            onClick={() => handleSupplierClick(supplier)}
                            style={{
                                padding: '16px',
                                background: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                display: 'grid',
                                gridTemplateColumns: '1fr 200px 150px',
                                alignItems: 'center',
                                gap: '16px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                                e.currentTarget.style.borderColor = '#3b82f6';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                e.currentTarget.style.borderColor = '#e5e7eb';
                            }}
                        >
                            {/* Supplier Info */}
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                                    {supplier.name}
                                </div>
                                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                                    📞 {supplier.phone || 'N/A'}
                                </div>
                                {supplier.lastInvoiceDate && (
                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        Last Invoice: {new Date(supplier.lastInvoiceDate).toLocaleDateString()} ({supplier.lastInvoiceNumber})
                                    </div>
                                )}
                            </div>

                            {/* Unpaid Invoices Count */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    background: '#fef3c7',
                                    color: '#92400e',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                }}>
                                    {supplier.unpaidCount} Invoice{supplier.unpaidCount !== 1 ? 's' : ''}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                    pending
                                </div>
                            </div>

                            {/* Amount Due */}
                            <div style={{ textAlign: 'right' }}>
                                <div style={{
                                    fontSize: '18px',
                                    fontWeight: '700',
                                    color: '#dc2626',
                                    marginBottom: '4px'
                                }}>
                                    ₹{(Number(supplier.balance) || 0).toLocaleString('en-IN')}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    Amount Due
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && selectedSupplier && (
                <PaymentModal
                    supplier={selectedSupplier}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
};

const PaymentModal = ({ supplier, onClose, onSuccess }) => {
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
    }, [supplier.partyId]);

    const fetchUnpaidInvoices = async () => {
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const res = await fetch(`${API_BASE_URL}/api/suppliers/${supplier.partyId}/unpaid-bills`);
            const data = await res.json();
            setInvoices(data.bills || []);
        } catch (err) {
            console.error('Failed to fetch invoices:', err);
        } finally {
            setLoadingInvoices(false);
        }
    };

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
    const currentPending = Number(supplier.balance) || 0;
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
                supplierId: supplier.partyId,
                amount: payAmount,
                mode,
                date,
                notes,
                bankDetails: mode === 'Bank' ? { bankName, accountNumber } : undefined,
                selectedInvoices: selectedInvoiceList
            };

            const res = await fetch(`${API_BASE_URL}/api/payments/out`, {
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
                    <h3>Payment Out - {supplier.name}</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="payment-form-grid">
                        <div className="left-col">
                            <div className="form-group">
                                <label>Supplier Name</label>
                                <input type="text" className="form-input" value={supplier.name} readOnly disabled style={{ background: '#f3f4f6' }} />
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
                                    <div className="form-group">
                                        <label>Account Number</label>
                                        <input type="text" className="form-input" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="e.g. 1234567890" />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="right-col">
                            <div className="form-group" style={{ background: '#eff6ff', padding: 15, borderRadius: 8 }}>
                                <label>Total Outstanding</label>
                                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#dc2626' }}>
                                    ₹{currentPending.toLocaleString('en-IN')}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Amount to Pay (₹)</label>
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
                                <label>Remaining Balance</label>
                                <div style={{ fontSize: 18, fontWeight: 600, color: newBalance > 0 ? '#ef4444' : '#10b981' }}>
                                    ₹{newBalance.toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Payment Notes</label>
                        <textarea className="form-textarea" rows="2" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Enter payment notes..."></textarea>
                    </div>

                    <div className="invoices-section">
                        <div className="invoices-header">
                            Unpaid Purchase Invoices ({invoices.length})
                        </div>
                        <div className="invoices-list">
                            {loadingInvoices ? (
                                <div style={{ padding: 20, textAlign: 'center' }}>Loading invoices...</div>
                            ) : invoices.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No unpaid invoices found</div>
                            ) : (
                                invoices.map(bill => (
                                    <div key={bill.invoiceNumber} className="invoice-item" style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'auto 1fr 100px',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        borderBottom: '1px solid #e5e7eb'
                                    }}>
                                        <input
                                            type="checkbox"
                                            className="invoice-checkbox"
                                            checked={!!selectedInvoices[bill.invoiceNumber]}
                                            onChange={() => handleInvoiceCheckboxChange(bill)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                                                {bill.invoiceNumber}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                {new Date(bill.invoiceDate).toLocaleDateString()} • Total: ₹{(Number(bill.grandTotal) || 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>
                                            ₹{(Number(bill.balanceAmount) || 0).toLocaleString('en-IN')}
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
                        {isSubmitting ? 'Processing...' : 'Record Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentOut;