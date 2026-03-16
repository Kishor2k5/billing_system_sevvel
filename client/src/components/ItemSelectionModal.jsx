import React, { useState, useMemo, useCallback, useEffect } from 'react';
import './ItemSelectionModal.css';

let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
try {
  const currentHost = window.location.host;
  if (!API_BASE_URL || API_BASE_URL.includes(currentHost)) {
    API_BASE_URL = 'http://localhost:5000';
  }
} catch (e) {
  API_BASE_URL = 'http://localhost:5000';
}

const ItemSelectionModal = ({ isOpen, onClose, onAddItems, existingItems = [] }) => {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [quantities, setQuantities] = useState({});
  const [units, setUnits] = useState({});

  // Fetch items from API
  useEffect(() => {
    if (!isOpen) return;

    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/items`);
        if (!response.ok) {
          throw new Error('Failed to fetch items');
        }
        const data = await response.json();
        // Transform API response to match component expectations
        const transformedItems = data.items.map(item => {
          const id = String(item.itemId ?? item.id ?? item.code);
          return {
            id,
            itemId: id,
            name: item.name,
            code: item.code,
            salesPrice: item.salePrice,
            salePrice: item.salePrice,
            purchasePrice: item.purchasePrice,
            stock: item.stock,
            unit: item.unit || 'PCS'
          };
        });
        setAllItems(transformedItems);
      } catch (err) {
        console.error('Error fetching items:', err);
        setError('Failed to load items');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [isOpen]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    return allItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allItems]);

  // Calculate total amount
  const totalAmount = useMemo(() => {
    return Object.keys(selectedItems).reduce((sum, itemId) => {
      const item = allItems.find(i => String(i.id) === String(itemId));
      if (!item) return sum;
      const qty = quantities[itemId] || 1;
      // Prefer sales price for purchases; fall back to purchase price
      const rate = item.salesPrice ?? item.salePrice ?? item.purchasePrice ?? 0;
      return sum + (rate * qty);
    }, 0);
  }, [selectedItems, quantities, allItems]);

  // Handle adding item
  const handleAddItem = useCallback((itemId) => {
    const key = String(itemId);
    setSelectedItems(prev => ({
      ...prev,
      [key]: true
    }));
    setQuantities(prev => ({
      ...prev,
      [key]: 1
    }));
    const item = allItems.find(i => String(i.id) === key);
    setUnits(prev => ({
      ...prev,
      [key]: item?.unit || 'PCS'
    }));
  }, [allItems]);

  // Handle removing item
  const handleRemoveItem = useCallback((itemId) => {
    const key = String(itemId);
    setSelectedItems(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
    setQuantities(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
    setUnits(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  }, []);

  // Handle quantity change
  const handleQuantityChange = useCallback((itemId, value) => {
    const key = String(itemId);
    const numValue = parseInt(value) || 1;
    const finalValue = Math.max(numValue, 1);
    setQuantities(prev => ({
      ...prev,
      [key]: finalValue
    }));
  }, []);

  // Handle increment quantity
  const handleIncrement = useCallback((itemId) => {
    const key = String(itemId);
    const currentQty = quantities[itemId] || 1;
    setQuantities(prev => ({
      ...prev,
      [key]: currentQty + 1
    }));
  }, [quantities]);

  // Handle decrement quantity
  const handleDecrement = useCallback((itemId) => {
    const key = String(itemId);
    const currentQty = quantities[key] || 1;
    if (currentQty > 1) {
      setQuantities(prev => ({
        ...prev,
        [key]: currentQty - 1
      }));
    }
  }, [quantities]);

  // Handle unit change
  const handleUnitChange = useCallback((itemId, newUnit) => {
    const key = String(itemId);
    setUnits(prev => ({
      ...prev,
      [key]: newUnit
    }));
  }, []);

  // Handle Done button
  const handleDone = () => {
    const itemsToAdd = Object.keys(selectedItems).map(itemId => {
      const item = allItems.find(i => String(i.id) === String(itemId));
      if (!item) return null;
      // Include purchasePrice but prefer sales price for the returned rate
      const purchasePrice = item.purchasePrice ?? item.purchase_price ?? undefined;
      const rate = item.salesPrice ?? item.salePrice ?? (purchasePrice ?? 0);
      return {
        id: item.id,
        name: item.name,
        hsn: item.code,
        quantity: quantities[itemId] || 1,
        unit: units[itemId] || item.unit,
        purchasePrice,
        rate,
        discount: 0,
        tax: 18
      };
    });
    const validItems = itemsToAdd.filter(Boolean);
    onAddItems(validItems);
    handleCancel();
  };

  // Handle Cancel button
  const handleCancel = () => {
    setSearchTerm('');
    setSelectedItems({});
    setQuantities({});
    setUnits({});
    onClose();
  };

  if (!isOpen) return null;

  const selectedCount = Object.keys(selectedItems).length;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2>Add Items</h2>
          <button className="modal-close" onClick={handleCancel}>✕</button>
        </div>

        {/* Search Bar with Create Button */}
        <div className="modal-search">
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Search Items"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>
          <button className="btn-create-new">
            + Create New Item
          </button>
        </div>

        {/* Items Table */}
        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <p>Loading items...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>⚠️ {error}</p>
            </div>
          ) : (
            <div className="items-table-container">
              <table className="modal-items-table">
                <thead className="sticky-header">
                  <tr>
                    <th className="col-name">Item Name</th>
                    <th className="col-code">Item Code</th>
                    <th className="col-sales">Sales Price</th>
                    <th className="col-stock">Current Stock</th>
                    <th className="col-quantity">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                      <tr
                        key={item.id}
                        className={`
                          ${selectedItems[item.id] ? 'row-selected' : ''}
                          ${selectedItems[item.id] && quantities[item.id] > item.stock ? 'row-warning' : ''}
                        `}
                      >
                        <td className="col-name">{item.name}</td>
                        <td className="col-code">{item.code}</td>
                        <td className="col-sales">₹{item.salesPrice}</td>
                        <td className="col-stock">
                          <div className="stock-info">
                            <span className={`stock-value ${item.stock < 0 ? 'stock-negative' : item.stock === 0 ? 'stock-zero' : item.stock < 10 ? 'stock-low' : ''}`}>
                              {item.stock} {item.unit}
                            </span>
                            {selectedItems[item.id] && quantities[item.id] > item.stock && (
                              <span className="stock-warning">Insufficient Stock</span>
                            )}
                          </div>
                        </td>
                        <td className="col-quantity">
                          {!selectedItems[item.id] ? (
                            <button
                              className="btn-add"
                              onClick={() => handleAddItem(item.id)}
                              title="Add item"
                            >
                              + Add
                            </button>
                          ) : (
                            <div className="quantity-selector">
                              <button
                                className="qty-btn qty-minus"
                                onClick={() => handleDecrement(item.id)}
                                title="Decrease quantity"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                className="qty-input"
                                value={quantities[item.id] || 1}
                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                min="1"
                                title="Enter item quantity"
                              />
                              <button
                                className="qty-btn qty-plus"
                                onClick={() => handleIncrement(item.id)}
                                title="Increase quantity"
                              >
                                +
                              </button>
                              <span className="qty-unit">{units[item.id] || item.unit}</span>
                              <button
                                className="btn-remove"
                                onClick={() => handleRemoveItem(item.id)}
                                title="Remove item"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="no-results">
                      <td colSpan="6">No items found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="footer-info">
            {selectedCount > 0 ? (
              <>
                <span className="selected-link">Show {selectedCount} Item{selectedCount !== 1 ? 's' : ''} Selected</span>
                <span className="total-amount">Total Amount: <strong>₹{totalAmount.toFixed(2)}</strong></span>
              </>
            ) : (
              <span className="empty-msg">Select items to add to invoice</span>
            )}
          </div>
          <div className="footer-actions">
            <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
            <button className="btn-done" onClick={handleDone} disabled={selectedCount === 0}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemSelectionModal;
