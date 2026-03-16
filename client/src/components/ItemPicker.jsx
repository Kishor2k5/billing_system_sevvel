import { useEffect, useMemo, useState } from 'react';
import '../pages/SalesInvoice.css';

export default function ItemPicker({ open, onClose, onSelect }) {
  const [itemSearch, setItemSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!open) return;

    let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    try {
      const currentHost = window.location.host;
      if (!API_BASE_URL || API_BASE_URL.includes(currentHost)) {
        API_BASE_URL = 'http://localhost:5000';
      }
    } catch (e) {
      API_BASE_URL = 'http://localhost:5000';
    }

    const loadItems = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/items`);
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        console.error('Failed to fetch items:', error);
        setItems([]);
      }
    };

    loadItems();
  }, [open]);

  const categories = useMemo(() => {
    const unique = new Set(items.map((i) => i.category));
    return ['all', ...Array.from(unique)];
  }, [items]);

  const filtered = useMemo(() => {
    const term = itemSearch.trim().toLowerCase();
    return items.filter((inv) => {
      const matchesCategory = selectedCategory === 'all' || inv.category === selectedCategory;
      if (!term) return matchesCategory;
      return matchesCategory && [inv.name, inv.code].some((f) => f?.toLowerCase().includes(term));
    });
  }, [itemSearch, selectedCategory, items]);

  if (!open) return null;

  return (
    <div className="item-modal__backdrop" role="dialog" aria-modal="true">
      <div className="item-modal">
        <header className="item-modal__header">
          <h2>Add Items</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close" />
        </header>
        <div className="item-modal__filters">
          <div className="filter-group">
            <label htmlFor="item-search">Search Items</label>
            <input id="item-search" type="search" placeholder="Search by name or code" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
          </div>
          <div className="filter-group">
            <label htmlFor="item-category">Select Category</label>
            <select id="item-category" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>
          <button type="button" className="ghost create-item-btn">+ Create New Item</button>
        </div>

        <div className="item-modal__table">
          <div className="item-modal__row item-modal__header-row">
            <span>Item Name</span>
            <span>Item Code</span>
            <span>Sales Price</span>
            <span>Purchase Price</span>
            <span>Current Stock</span>
            <span>Quantity</span>
          </div>
          <div className="item-modal__body">
            {filtered.map((inv) => (
              <div key={inv.id} className="item-modal__row">
                <span>{inv.name}</span>
                <span>{inv.code || '-'}</span>
                <span>₹ {inv.salePrice?.toLocaleString() ?? '0.00'}</span>
                <span>₹ {inv.purchasePrice?.toLocaleString() ?? '0.00'}</span>
                <span>{inv.stock} {inv.unit}</span>
                <button type="button" className="add-inventory-btn" onClick={() => { onSelect?.(inv); onClose?.(); }}>
                  + Add
                </button>
              </div>
            ))}
            {!filtered.length && <p className="item-modal__empty">No items found.</p>}
          </div>
        </div>

        <footer className="item-modal__footer">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="primary" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
}
