import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddItem.css';

const UNIT_OPTIONS = ['PCS', 'MTR', 'KGS', 'BOX', 'LTR', 'SET'];
const DEFAULT_TAX = 18;

const SIZE_OPTIONS = [
  'None',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'Free Size',
  '28', '30', '32', '34', '36', '38', '40', '42', '44',
];

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

function AddItem() {
  const navigate = useNavigate();
  const [fetchedItems, setFetchedItems] = useState([]);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [autoCode, setAutoCode] = useState(true);
  const [category, setCategory] = useState('General');
  const [unit, setUnit] = useState('PCS');
  const [size, setSize] = useState('None');
  const [showAddSize, setShowAddSize] = useState(false);
  const [newSize, setNewSize] = useState('');
  const [customSizes, setCustomSizes] = useState([]);
  const [openingStock, setOpeningStock] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [tax, setTax] = useState(DEFAULT_TAX);
  const [hsn, setHsn] = useState('');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');
  const [existsWarning, setExistsWarning] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [customCategories, setCustomCategories] = useState([]);

  // Fetch items from API to get latest categories
  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    fetch(`${API_BASE_URL}/api/items`)
      .then(res => res.json())
      .then(data => {
        if (data.items) {
          setFetchedItems(data.items);
        }
      })
      .catch(err => console.error('Failed to fetch items:', err));
  }, []);

  // categories taken from existing catalog merged with defaults and fetched items
  const allCategories = useMemo(() => {
    const fetchedCats = new Set(fetchedItems.map((i) => i.category).filter(Boolean));
    const merged = [...DEFAULT_CATEGORIES, ...Array.from(fetchedCats), ...customCategories];
    return [...new Set(merged)].sort();
  }, [customCategories, fetchedItems]);

  // generate next item code on demand
  const suggestedCode = useMemo(() => {
    const prefix = 'ITM-';
    const nums = fetchedItems
      .map((i) => (i.code || '').replace(/[^0-9]/g, ''))
      .map((n) => parseInt(n || '0', 10))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    const next = (nums.length ? nums[nums.length - 1] + 1 : fetchedItems.length + 1);
    return `${prefix}${String(next).padStart(3, '0')}`;
  }, [fetchedItems]);

  // duplicate check
  const checkDuplicate = (value) => {
    const v = (value || '').trim().toLowerCase();
    if (!v) return false;
    return fetchedItems.some((it) => (it.name || '').toLowerCase() === v);
  };

  // update code when autoCode enabled
  React.useEffect(() => {
    if (autoCode) setCode(suggestedCode);
  }, [autoCode, suggestedCode]);

  React.useEffect(() => {
    if (checkDuplicate(name)) {
      setExistsWarning('Item Already Exists');
    } else {
      setExistsWarning('');
    }
  }, [name]);

  const estimatedStockValue = openingStock * purchasePrice || 0;
  const sellingValue = openingStock * sellingPrice || 0;

  const handleAddCategory = () => {
    if (newCategory.trim() && !allCategories.includes(newCategory.trim())) {
      setCustomCategories(prev => [...prev, newCategory.trim()]);
      setCategory(newCategory.trim());
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

  const allSizes = useMemo(() => {
    return [...SIZE_OPTIONS, ...customSizes];
  }, [customSizes]);

  const handleAddSize = () => {
    if (newSize.trim() && !allSizes.includes(newSize.trim())) {
      setCustomSizes(prev => [...prev, newSize.trim()]);
      setSize(newSize.trim());
      setNewSize('');
      setShowAddSize(false);
    }
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) {
      setError('Please enter Item Name');
      return;
    }
    if (checkDuplicate(name)) {
      setError('Item Already Exists');
      return;
    }

    const payload = {
      name: name.trim(),
      code: code || suggestedCode,
      category,
      unit,
      size: size !== 'None' ? size : '',
      stock: Number(openingStock) || 0,
      minStock: Number(minStock) || 0,
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      tax: Number(tax) || 0,
      hsn: hsn || '',
      notes: notes || ''
    };

    // Attempt to save via API and navigate only on success
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // send flat payload (server accepts both flat and { item: ... })
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.message || 'Failed to save item';
        setError(msg);
        return;
      }

      // success — navigate to items list and pass created item in location state
      const created = data?.item ?? null;
      if (created) {
        navigate('/items', { state: { createdItem: created } });
      } else {
        navigate('/items');
      }
    } catch (err) {
      console.error('Save request failed', err);
      setError('Unable to save item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <header className="add-item-header">
        <div>
          <h1>Add Item</h1>
          <p>Create and manage inventory items — clean, fast and responsive.</p>
        </div>
      </header>

      <div className="form-wrapper">
          <section className="form-card">
            <div className="form-grid">
              <div className="field">
                <label>Item Name<span className="required">*</span></label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter item name" />
                {existsWarning && <p className="warning">{existsWarning}</p>}
              </div>

              <div className="field">
                <label>Item Code</label>
                <div className="code-row">
                  <input value={code} onChange={(e) => { setCode(e.target.value); setAutoCode(false); }} placeholder="ITM-001" />
                  <label className="auto-gen">
                    <input type="checkbox" checked={autoCode} onChange={(e) => setAutoCode(e.target.checked)} /> Auto-generate
                  </label>
                </div>
              </div>

              <div className="field">
                <label>Category</label>
                <div className="category-wrapper">
                  <select 
                    value={category} 
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowAddCategory(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                  >
                    {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
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

              <div className="field">
                <label>Unit</label>
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Opening Stock</label>
                <input type="number" min="0" value={openingStock} onChange={(e) => setOpeningStock(Number(e.target.value) || 0)} />
              </div>

              <div className="field">
                <label>Minimum Stock Alert</label>
                <input type="number" min="0" value={minStock} onChange={(e) => setMinStock(Number(e.target.value) || 0)} />
              </div>

              <div className="field">
                <label>Purchase Price</label>
                <input type="number" min="0" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(Number(e.target.value) || 0)} />
              </div>

              <div className="field">
                <label>Selling Price</label>
                <input type="number" min="0" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value) || 0)} />
              </div>

              <div className="field">
                <label>Tax % (GST)</label>
                <input type="number" min="0" value={tax} onChange={(e) => setTax(Number(e.target.value) || 0)} />
              </div>

              <div className="field">
                <label>HSN Code</label>
                <input value={hsn} onChange={(e) => setHsn(e.target.value)} />
              </div>

              <div className="field field-full">
                <label>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes about this item" />
              </div>
            </div>

            <div className="form-footer">
              {error && <div className="error">{error}</div>}
              <div className="actions">
                <button className="btn-cancel" onClick={() => navigate('/items')} disabled={isSaving}>Cancel</button>
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={isSaving}
                  aria-busy={isSaving}
                >
                  {isSaving ? 'Saving…' : 'Save Item'}
                </button>
              </div>
            </div>
          </section>

          <aside className="summary-card">
            <div className="card-inner">
              <h3>Summary</h3>
              <div className="summary-line">
                <span>Estimated Stock Value</span>
                <strong>₹ {estimatedStockValue.toFixed(2)}</strong>
              </div>
              <div className="summary-line">
                <span>Selling Value</span>
                <strong>₹ {sellingValue.toFixed(2)}</strong>
              </div>
              <div className="summary-divider" />
              <div className="summary-meta">
                <div><small>Unit</small><div>{unit}</div></div>
                <div><small>Tax</small><div>{tax}%</div></div>
              </div>
            </div>
          </aside>
        </div>
    </>
  );
}

export default AddItem;
