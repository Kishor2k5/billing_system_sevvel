import React, { useEffect, useState } from 'react';
import './EditItemModal.css';

const DEFAULT_CATEGORIES = [
  'General',
  'Textiles',
  'Garments',
  'Electronics',
  'Services',
  'Raw Materials',
  'Finished Goods',
  'Other'
];

export default function EditItemModal({ open, onClose, item, onSave }) {
  const [form, setForm] = useState({
    name: '',
    code: '',
    category: '',
    unit: '',
    purchasePrice: 0,
    sellingPrice: 0,
    currentStock: 0,
    addStock: 0,
    minStock: 0,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [customCategories, setCustomCategories] = useState([]);
  const [fetchedItems, setFetchedItems] = useState([]);

  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    fetch(`${API_BASE_URL}/api/items`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFetchedItems(data);
        }
      })
      .catch((err) => console.error('Failed to fetch items:', err));
  }, []);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        code: item.code || '',
        category: item.category || '',
        unit: item.unit || '',
        purchasePrice: item.purchasePrice ?? item.purchase_price ?? 0,
        sellingPrice: item.salePrice ?? item.sellingPrice ?? item.sale_price ?? 0,
        currentStock: Number(item.stock ?? 0) || 0,
        addStock: 0,
        minStock: item.minStock ?? item.minimumStock ?? 0,
      });
      setErrors({});
    }
  }, [item, open]);

  const allCategories = React.useMemo(() => {
    const fromFetched = fetchedItems
      .map((it) => it.category)
      .filter(Boolean);
    const combined = [...DEFAULT_CATEGORIES, ...fromFetched, ...customCategories];
    return [...new Set(combined)].sort();
  }, [fetchedItems, customCategories]);

  if (!open) return null;

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name || !form.name.trim()) e.name = 'Item Name is required';
    if (form.purchasePrice === '' || isNaN(Number(form.purchasePrice)) || Number(form.purchasePrice) < 0) e.purchasePrice = 'Purchase price must be ≥ 0';
    if (form.sellingPrice === '' || isNaN(Number(form.sellingPrice)) || Number(form.sellingPrice) < 0) e.sellingPrice = 'Selling price must be ≥ 0';
    if (form.addStock === '' || isNaN(Number(form.addStock))) e.addStock = 'Add stock must be a valid number';
    if (form.minStock === '' || isNaN(Number(form.minStock)) || Number(form.minStock) < 0) e.minStock = 'Minimum stock must be ≥ 0';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const currentStock = Number(form.currentStock) || 0;
    const addStock = Number(form.addStock) || 0;
    const finalStock = currentStock + addStock;

    if (finalStock < 0) {
      setErrors((prev) => ({ ...prev, addStock: 'Final stock cannot be less than 0' }));
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      category: form.category.trim(),
      unit: form.unit.trim(),
      purchasePrice: Number(form.purchasePrice),
      salePrice: Number(form.sellingPrice),
      sellingPrice: Number(form.sellingPrice),
      stock: finalStock,
      minStock: Number(form.minStock),
    };

    try {
      // Delegate actual network update to parent via onSave; parent will PATCH and update UI.
      await onSave(payload);
      // Close modal on success
      onClose && onClose();
    } catch (err) {
      // Parent handles toast and error state; keep modal open on error.
      console.error('Update error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !allCategories.includes(newCategory.trim())) {
      setCustomCategories(prev => [...prev, newCategory.trim()]);
      setForm(f => ({ ...f, category: newCategory.trim() }));
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

  const stop = (e) => e.stopPropagation();

  return (
    <div className="eim-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <div className="eim-modal" role="dialog" aria-modal="true" aria-label="Edit item" onMouseDown={stop}>
        <button className="eim-close" onClick={onClose} aria-label="Close">✕</button>
        <form className="eim-form" onSubmit={handleSubmit}>
          <h2>Edit Item</h2>
          <div className="eim-grid">
            <div className="eim-field">
              <label>Item Name</label>
              <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
              {errors.name && <div className="eim-error">{errors.name}</div>}
            </div>

            <div className="eim-field">
              <label>Item Code</label>
              <input value={form.code} onChange={(e) => handleChange('code', e.target.value)} />
            </div>

            <div className="eim-field">
              <label>Category</label>
              <div className="category-wrapper">
                <select 
                  value={form.category} 
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setShowAddCategory(true);
                    } else {
                      handleChange('category', e.target.value);
                    }
                  }}
                >
                  <option value="">Select Category</option>
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__add_new__">+ Add New Category</option>
                </select>
                {showAddCategory && (
                  <div className="add-category-inline">
                    <input 
                      type="text" 
                      placeholder="New category name"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCategory();
                        }
                      }}
                    />
                    <button type="button" className="btn-add-cat" onClick={handleAddCategory}>Add</button>
                    <button type="button" className="btn-cancel-cat" onClick={() => {
                      setShowAddCategory(false);
                      setNewCategory('');
                    }}>×</button>
                  </div>
                )}
              </div>
            </div>

            <div className="eim-field">
              <label>Unit</label>
              <input value={form.unit} onChange={(e) => handleChange('unit', e.target.value)} />
            </div>

            <div className="eim-field">
              <label>Purchase Price</label>
              <input type="number" step="0.01" value={form.purchasePrice} onChange={(e) => handleChange('purchasePrice', e.target.value)} />
              {errors.purchasePrice && <div className="eim-error">{errors.purchasePrice}</div>}
            </div>

            <div className="eim-field">
              <label>Selling Price</label>
              <input type="number" step="0.01" value={form.sellingPrice} onChange={(e) => handleChange('sellingPrice', e.target.value)} />
              {errors.sellingPrice && <div className="eim-error">{errors.sellingPrice}</div>}
            </div>

            <div className="eim-field">
              <label>Current Stock</label>
              <input type="number" step="1" value={form.currentStock} readOnly />
            </div>

            <div className="eim-field">
              <label>Add Stock</label>
              <input type="number" step="1" value={form.addStock} onChange={(e) => handleChange('addStock', e.target.value)} />
              {errors.addStock && <div className="eim-error">{errors.addStock}</div>}
            </div>

            <div className="eim-field">
              <label>Updated Stock</label>
              <input type="number" step="1" value={(Number(form.currentStock) || 0) + (Number(form.addStock) || 0)} readOnly />
            </div>

            <div className="eim-field">
              <label>Minimum Stock</label>
              <input type="number" step="1" value={form.minStock} onChange={(e) => handleChange('minStock', e.target.value)} />
              {errors.minStock && <div className="eim-error">{errors.minStock}</div>}
            </div>
          </div>

          <div className="eim-actions">
            <button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="primary" disabled={saving}>{saving ? 'Updating...' : 'Update'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
