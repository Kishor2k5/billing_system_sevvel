import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreatePurchaseInvoice.css';
import ItemSelectionModal from '../components/ItemSelectionModal';

// Resolve API base URL
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
try {
  const currentHost = window.location.host;
  if (!API_BASE_URL || API_BASE_URL.includes(currentHost)) {
    API_BASE_URL = 'http://localhost:5000';
  }
} catch (e) {
  API_BASE_URL = API_BASE_URL || 'http://localhost:5000';
}

const CreatePurchaseInvoice = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    partyName: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    paymentTerms: '',
    items: [{ itemName: '', quantity: 1, price: 0, amount: 0 }],
  });

  const [suppliers, setSuppliers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const dropdownRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);

  // Fetch suppliers and items on component mount
  useEffect(() => {
    fetchSuppliers();

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const fetchItems = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/items`);
        const d = await res.json();
        setCatalogItems(d.items || []);
      } catch (err) {
        console.error('Error fetching catalog items:', err);
      }
    };

    fetchItems();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sellers`);
      const data = await response.json();
      if (response.ok) {
        setSuppliers(data.sellers || []);
        setFilteredSuppliers(data.sellers || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Filter suppliers when typing in partyName
    if (name === 'partyName') {
      const filtered = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuppliers(filtered);
      setShowDropdown(true);
    }
  };

  const handlePartyFocus = () => {
    setFilteredSuppliers(suppliers);
    setShowDropdown(true);
  };

  const selectSupplier = (supplier) => {
    setFormData({ ...formData, partyName: supplier.name });
    setShowDropdown(false);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];

    // Update the field first
    updatedItems[index][field] = value;

    // If user typed item name, try to auto-fill price from inventory catalog (by exact or partial match)
    if (field === 'itemName') {
      const typed = String(value || '').trim().toLowerCase();
      if (typed) {
        let match = catalogItems.find(i => String(i.name || '').toLowerCase() === typed);
        if (!match) match = catalogItems.find(i => String(i.name || '').toLowerCase().includes(typed));

        if (match) {
          updatedItems[index].price = Number(match.salePrice ?? match.sale_price ?? match.purchasePrice ?? match.salesPrice ?? 0) || 0;
        }
      }
    }

    // Recalculate amount when quantity or price (or after auto-fill) changes
    const qty = parseFloat(updatedItems[index].quantity) || 0;
    const price = parseFloat(updatedItems[index].price) || 0;
    updatedItems[index].amount = qty * price;

    setFormData({ ...formData, items: updatedItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { itemName: '', quantity: 1, price: 0, amount: 0 }],
    });
  };

  const removeItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const payload = {
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: formData.invoiceDate,
        partyName: formData.partyName,
        paymentTerms: formData.paymentTerms,
        items: formData.items,
        status: 'Unpaid',
      };

      const response = await fetch(`${API_BASE_URL}/api/purchase-invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || 'Failed to save invoice');
        return;
      }

      // Success - navigate back to list
      navigate('/purchase-invoices');
    } catch (error) {
      console.error('Error saving invoice:', error);
      setErrorMessage('Unable to reach server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/purchase-invoices');
  };

  return (
    <div className="create-purchase-page">
      <header className="page-header">
        <div className="page-title-group">
          <button className="back-btn" onClick={handleCancel}>
            ← Back
          </button>
          <h1>Create Purchase Invoice</h1>
        </div>
        <div className="page-actions">
          <button className="ghost-btn" onClick={handleCancel}>
            Cancel
          </button>
          <button className="primary-btn" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Invoice'}
          </button>
        </div>
      </header>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          {/* Party Details */}
          <section className="form-section">
            <h2>Party Details</h2>
            <div className="form-row">
              <div className="form-field" ref={dropdownRef}>
                <label htmlFor="partyName">Party Name *</label>
                <input
                  type="text"
                  id="partyName"
                  name="partyName"
                  value={formData.partyName}
                  onChange={handleInputChange}
                  onFocus={handlePartyFocus}
                  placeholder="Select or enter party name"
                  required
                  autoComplete="off"
                />
                {showDropdown && filteredSuppliers.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {filteredSuppliers.map((supplier) => (
                      <div
                        key={supplier.partyId}
                        className="dropdown-item"
                        onClick={() => selectSupplier(supplier)}
                      >
                        <div className="supplier-name">{supplier.name}</div>
                        {supplier.phone && (
                          <div className="supplier-phone">{supplier.phone}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="invoiceNumber">Invoice Number *</label>
                <input
                  type="text"
                  id="invoiceNumber"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleInputChange}
                  placeholder="Enter invoice number"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="invoiceDate">Invoice Date *</label>
                <input
                  type="date"
                  id="invoiceDate"
                  name="invoiceDate"
                  value={formData.invoiceDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="paymentTerms">Payment Terms</label>
                <select
                  id="paymentTerms"
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleInputChange}
                >
                  <option value="">Select payment terms</option>
                  <option value="immediate">Immediate</option>
                  <option value="net15">Net 15 Days</option>
                  <option value="net30">Net 30 Days</option>
                  <option value="net60">Net 60 Days</option>
                </select>
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="form-section">
            <div className="section-header">
              <h2>Items</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="add-item-btn" onClick={addItem}>
                  + Add Item
                </button>
                <button type="button" className="ghost-btn" onClick={() => setIsItemModalOpen(true)}>
                  + Add from Catalog
                </button>
              </div>
            </div>
            
            <div className="items-table">
              <div className="items-header">
                <span>Item Name</span>
                <span>Quantity</span>
                <span>Price</span>
                <span>Amount</span>
                <span>Action</span>
              </div>
              
              {formData.items.map((item, index) => (
                <div key={index} className="item-row">
                  <input
                    type="text"
                    value={item.itemName}
                    onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                    placeholder="Enter item name"
                    required
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    min="1"
                    required
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                    min="0"
                    step="0.01"
                    required
                  />
                  <span className="amount">₹ {item.amount.toFixed(2)}</span>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeItem(index)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {/* Item selection modal */}
              <ItemSelectionModal
                isOpen={isItemModalOpen}
                onClose={() => setIsItemModalOpen(false)}
                onAddItems={(newItems) => {
                  // Map modal items to invoice items: prefer rate (selling price) over purchasePrice
                  const mapped = newItems.map(it => {
                    const price = it.rate ?? it.purchasePrice ?? 0;
                    const qty = Number(it.quantity) || 1;
                    return {
                      itemName: it.name,
                      quantity: qty,
                      price: price,
                      amount: Number((qty * price).toFixed(2)),
                    };
                  });
                  setFormData({ ...formData, items: [...formData.items, ...mapped] });
                  setIsItemModalOpen(false);
                }}
              />
            </div>
          </section>

          {/* Total */}
          {errorMessage && (
            <p className="error-message" role="alert" aria-live="assertive" style={{ color: 'var(--danger, #c53030)' }}>
              {errorMessage}
            </p>
          )}

          <section className="form-section total-section">
            <div className="total-row">
              <span className="total-label">Total Amount:</span>
              <span className="total-value">₹ {calculateTotal().toFixed(2)}</span>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
};

export default CreatePurchaseInvoice;
