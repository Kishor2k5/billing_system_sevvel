import React, { useState } from 'react';
import './PartyDrawer.css';
import API from '../api';

const historySample = [
  { invoice: 'INV-1001', date: '12 Dec 2025', items: 4, amount: '₹ 12,500' },
  { invoice: 'INV-1002', date: '09 Dec 2025', items: 2, amount: '₹ 5,200' },
  { invoice: 'INV-1003', date: '01 Dec 2025', items: 6, amount: '₹ 22,000' },
];

export default function PartyDrawer({ mode, party, onClose, onSave }) {
  const isHistory = mode === 'history';
  const isEdit = mode === 'edit';

  const [formData, setFormData] = useState({
    name: party?.name || '',
    phone: party?.phone || party?.mobile || '',
    email: party?.email || '',
    category: party?.category || '',
    addressLine: party?.addressLine || party?.address || '',
    gstNumber: party?.gstNumber || party?.gstin || '',
    openingBalance: party?.openingBalance || 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Party name is required');
      return;
    }

    if (!formData.category) {
      setError('Please select a category (Buyer or Supplier)');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        category: formData.category,
      };

      const { data } = isEdit
        ? await API.put(`/parties/${party.partyId}`, payload)
        : await API.post('/parties', payload);

      if (onSave) {
        onSave(data.party);
      }

      onClose();
    } catch (err) {
      console.error('Save party error:', err);
      const message = err?.response?.data?.message || err.message || 'Failed to save party';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="party-drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>{isHistory ? 'View Party Details' : isEdit ? 'Edit Party' : 'Create Party'}</h3>
          <button className="close" onClick={onClose}>✕</button>
        </header>

        {isHistory ? (
          <section className="history-view">
            <div className="party-info">
              <p>{party?.name || '—'}</p>
              <p>{party?.phone || party?.mobile || '—'}</p>
              <p>{party?.category ? `${party.category}` : 'Customer'}</p>
            </div>
            <div className="history-summary">
              <div>
                <p>Total invoices</p>
                <strong>{historySample.length}</strong>
              </div>
              <div>
                <p>Total purchases</p>
                <strong>₹ 40,000</strong>
              </div>
            </div>
            <div className="history-table">
              <div className="history-row header">
                <span>Invoice</span>
                <span>Date</span>
                <span>Items</span>
                <span>Amount</span>
              </div>
              {historySample.map((row) => (
                <div className="history-row" key={row.invoice}>
                  <span>{row.invoice}</span>
                  <span>{row.date}</span>
                  <span>{row.items}</span>
                  <span>{row.amount}</span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <form className="party-form" onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}

            <label>Party Name *</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <label>Mobile Number</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              type="tel"
              maxLength={10}
            />

            <label>Email</label>
            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              required
            />

            <label>Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select Category</option>
              <option value="Buyer">Buyer</option>
              <option value="Supplier">Supplier</option>
            </select>

            <label>Address</label>
            <textarea
              name="addressLine"
              value={formData.addressLine}
              onChange={handleChange}
              rows={3}
            />

            <label>GSTIN (optional)</label>
            <input
              name="gstNumber"
              value={formData.gstNumber}
              onChange={handleChange}
            />


            <label>Opening Balance</label>
            <input
              name="openingBalance"
              value={formData.openingBalance}
              onChange={handleChange}
              type="number"
              step="0.01"
            />

            <div className="form-actions">
              <button type="button" className="ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (isEdit ? 'Update' : 'Save')}
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}
