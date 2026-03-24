import React, { useEffect, useMemo, useState, useCallback } from 'react';
import EditItemModal from '../components/EditItemModal';
import { useNavigate, useLocation } from 'react-router-dom';
import editIcon from '../image/icons/edit.svg';
import historyIcon from '../image/icons/history-log.svg';
import deleteIcon from '../image/icons/delete-bin.svg';
import valueIcon from '../image/icons/value-rupee.svg';
import stockBoxIcon from '../image/icons/stock-box.svg';
import lowStockIcon from '../image/icons/low-stock.svg';
import outOfStockIcon from '../image/icons/out-of-stock.svg';
import './Items_ERP.css';
import API, { API_ROOT } from '../api';

// Utility functions
const formatCurrency = (value) => {
  const amount = Number.isFinite(value) ? value : 0;
  return (
    '₹ ' +
    amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStockStatus = (stock, minStock = 0) => {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= minStock) return 'Low Stock';
  return 'In Stock';
};

const getItemUnitCost = (item) => {
  const purchase = Number(item?.purchasePrice);
  if (Number.isFinite(purchase) && purchase > 0) return purchase;

  const manufacturing = Number(item?.manufacturingCost);
  if (Number.isFinite(manufacturing) && manufacturing > 0) return manufacturing;

  const sale = Number(item?.salePrice);
  if (Number.isFinite(sale) && sale > 0) return sale;

  return 0;
};

// Stock History Modal Component
const StockHistoryModal = ({ open, item, onClose }) => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && item) {
      loadHistory();
    }
  }, [open, item]);

  const loadHistory = async () => {
    if (!item) return;
    setIsLoading(true);
    try {
      const itemId = item.itemId ?? item.productId ?? item.id ?? item._id;
      const { data } = await API.get(`/items/${itemId}/stock-transactions`);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to load stock history:', err);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadHistoryExcel = () => {
    if (!transactions.length) return;
    const csvHeader = ['Date', 'Type', 'Qty In', 'Qty Out', 'Balance', 'Reference', 'Batch'].join(',');
    const csvBody = transactions.map(tx => {
      return [
        `"${formatDate(tx.transactionDate)}"`,
        `"${tx.transactionType}"`,
        tx.quantityIn > 0 ? '+' + tx.quantityIn : '0',
        tx.quantityOut > 0 ? '-' + tx.quantityOut : '0',
        tx.balance,
        `"${tx.referenceType || '-'}"`,
        `"${tx.manufacturingBatch || '-'}"`
      ].join(',');
    }).join('\n');

    const csvContent = `${csvHeader}\n${csvBody}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Stock_History_${item?.name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Stock History - {item?.name}</h2>
          <button className="close-btn" onClick={onClose}>X</button>
        </div>

        <div style={{ padding: '1rem 1.5rem 0', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={downloadHistoryExcel} disabled={isLoading || transactions.length === 0}>
            Download Excel
          </button>
        </div>

        <div className="stock-history-table">
          <div className="history-header">
            <div className="cell">Date</div>
            <div className="cell">Type</div>
            <div className="cell" style={{ textAlign: 'right' }}>Qty In</div>
            <div className="cell" style={{ textAlign: 'right' }}>Qty Out</div>
            <div className="cell" style={{ textAlign: 'right' }}>Balance</div>
            <div className="cell">Reference</div>
            <div className="cell">Batch</div>
          </div>

          <div className="history-body">
            {isLoading && <div className="table-loading">Loading...</div>}
            {!isLoading && transactions.length === 0 && <div className="table-empty">No transactions found</div>}
            {!isLoading && transactions.map((tx) => (
              <div key={tx.id} className="history-row">
                <div className="cell">{formatDate(tx.transactionDate)}</div>
                <div className="cell">{tx.transactionType}</div>
                <div className="cell" style={{ textAlign: 'right', color: '#38a169', fontWeight: 'bold' }}>{tx.quantityIn > 0 ? '+' + tx.quantityIn : '-'}</div>
                <div className="cell" style={{ textAlign: 'right', color: '#e53e3e', fontWeight: 'bold' }}>{tx.quantityOut > 0 ? '-' + tx.quantityOut : '-'}</div>
                <div className="cell" style={{ textAlign: 'right', fontWeight: 'bold' }}>{tx.balance}</div>
                <div className="cell">{tx.referenceType || '-'}</div>
                <div className="cell">{tx.manufacturingBatch || '-'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

function Items() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [historyItem, setHistoryItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch items from backend
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const { data } = await API.get('/items');
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error('Failed to load items', error);
      setLoadError('Unable to load items. Please try again later.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Edit item
  const handleEditItem = (item) => {
    setEditingItem(item);
    setEditModalOpen(true);
  };

  // Save item from modal
  const handleSaveFromModal = async (updatedFields) => {
    if (!editingItem) return;
    const id = editingItem.itemId ?? editingItem.id ?? editingItem._id;
    setUpdatingItemId(id);
    try {
      const { data } = await API.patch(`/items/${id}`, updatedFields);
      const updatedItem = data.item || { ...editingItem, ...updatedFields };
      setItems((prev) => prev.map((it) => (it.itemId ?? it.id ?? it._id) === id ? updatedItem : it));
      showToast('Product updated successfully', 'success');
      setEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update item', err);
      showToast(err.message, 'error');
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Delete item (soft delete)
  const handleDeleteItem = async (itemId) => {
    if (!itemId) return;
    try {
      const { data } = await API.delete(`/items/${itemId}`);
      setItems((prev) => prev.filter((it) => (it.itemId ?? it.id ?? it._id) !== itemId));
      showToast('Item deleted successfully', 'success');
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete item', err);
      showToast(err.message, 'error');
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { data } = await API.post('/items/bulk-delete', { itemIds: selectedIds });
      setItems((prev) => prev.filter((it) => !selectedIds.includes(it.itemId ?? it.id ?? it._id)));
      setSelectedIds([]);
      showToast(`${selectedIds.length} items deleted successfully`, 'success');
    } catch (err) {
      console.error('Failed to bulk delete items', err);
      showToast(err.message, 'error');
    }
  };

  // Bulk export
  const handleBulkExport = () => {
    const itemsToExport = selectedIds.length > 0
      ? filteredItems.filter((it) => selectedIds.includes(it.itemId ?? it.id ?? it._id))
      : filteredItems;

    const csv = [
      ['Item Name', 'Item Code', 'Category', 'Stock Qty', 'Unit', 'Selling Price', 'Manufacturing Cost', 'Stock Value', 'Status', 'Min Stock'].join(','),
      ...itemsToExport.map((it) => [
        `"${it.name}"`,
        it.code || '',
        it.category || '',
        it.stock || 0,
        it.unit || 'PCS',
        it.salePrice || 0,
        getItemUnitCost(it),
        (it.stock || 0) * getItemUnitCost(it),
        it.status || '',
        it.minStock || 0,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('Inventory exported successfully', 'success');
  };

  // Show toast
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load items on mount
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Handle newly created items
  useEffect(() => {
    if (location && location.state && location.state.createdItem) {
      const created = location.state.createdItem;
      setItems((prev) => {
        if (prev.some((it) => it.itemId === created.itemId)) return prev;
        return [created, ...prev];
      });
      try {
        navigate(location.pathname, { replace: true, state: null });
      } catch (e) {
        // ignore
      }
      setTimeout(() => fetchItems(), 500);
    }
  }, [location, navigate]);

  // Get unique categories
  const categories = useMemo(() => {
    const unique = new Set(items.map((item) => item.category).filter(Boolean));
    return ['all', ...Array.from(unique).sort()];
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = items.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        !searchTerm ||
        [item.name, item.code, item.hsnSac]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(searchTerm.toLowerCase()));
      const status = getStockStatus(item.stock, item.minStock);
      const matchesStatus = stockStatusFilter === 'all' || status === stockStatusFilter;
      return matchesCategory && matchesSearch && matchesStatus;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'stock-asc':
          return (a.stock || 0) - (b.stock || 0);
        case 'stock-desc':
          return (b.stock || 0) - (a.stock || 0);
        case 'price-asc':
          return (a.salePrice || 0) - (b.salePrice || 0);
        case 'price-desc':
          return (b.salePrice || 0) - (a.salePrice || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [items, searchTerm, selectedCategory, stockStatusFilter, sortBy]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalStockValue = items.reduce((sum, item) => {
      const qty = Math.max(item.stock || 0, 0);
      const cost = getItemUnitCost(item);
      return sum + qty * cost;
    }, 0);

    const outOfStockCount = items.filter((it) => (it.stock || 0) <= 0).length;
    const lowStockCount = items.filter((it) => (it.stock || 0) > 0 && (it.stock || 0) <= (it.minStock || 0)).length;

    return {
      totalValue: totalStockValue,
      totalItems: items.length,
      lowStockCount,
      outOfStockCount,
    };
  }, [items]);



  // Toggle item selection
  const toggleItemSelection = (itemId) => {
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Toggle all selection
  const toggleAllSelection = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((it) => it.itemId ?? it.id ?? it._id));
    }
  };

  return (
    <div className="items-container">
      {/* Header */}
      <header className="items-header">
        <h1>Items</h1>
        <p>Manage and review your inventory catalogue</p>

      </header>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Summary Cards */}
      <section className="summary-cards">
        <div className="summary-card">
          <div className="card-content">
            <p className="card-label">Total Stock Value</p>
            <h3 className="card-value">{formatCurrency(summaryStats.totalValue)}</h3>
          </div>
          <img src={valueIcon} alt="Total stock value" className="card-icon-img" />
        </div>

        <div className="summary-card">
          <div className="card-content">
            <p className="card-label">Total Items</p>
            <h3 className="card-value">{summaryStats.totalItems}</h3>
          </div>
          <img src={stockBoxIcon} alt="Total items" className="card-icon-img" />
        </div>

        <div className="summary-card">
          <div className="card-content">
            <p className="card-label">Low Stock Items</p>
            <h3 className="card-value">{summaryStats.lowStockCount}</h3>
          </div>
          <img src={lowStockIcon} alt="Low stock items" className="card-icon-img" />
        </div>

        <div className="summary-card">
          <div className="card-content">
            <p className="card-label">Out of Stock</p>
            <h3 className="card-value">{summaryStats.outOfStockCount}</h3>
          </div>
          <img src={outOfStockIcon} alt="Out of stock items" className="card-icon-img" />
        </div>
      </section>

      {/* Filters Section */}
      <section className="filters-section">
        <div className="filter-group">
          <label htmlFor="search">Search Item</label>
          <input
            id="search"
            type="text"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
            }}
            className="filter-select"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status">Stock Status</label>
          <select
            id="status"
            value={stockStatusFilter}
            onChange={(e) => {
              setStockStatusFilter(e.target.value);
            }}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort">Sort By</label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="name">Name</option>
            <option value="stock-asc">Stock (Low to High)</option>
            <option value="stock-desc">Stock (High to Low)</option>
            <option value="price-asc">Price (Low to High)</option>
            <option value="price-desc">Price (High to Low)</option>
          </select>
        </div>

        <button
          type="button"
          className="btn-primary btn-create"
          onClick={() => navigate('/items/add')}
        >
          + Create Item
        </button>
      </section>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <section className="bulk-actions">
          <span>{selectedIds.length} item(s) selected</span>
          <button className="btn-secondary" onClick={handleBulkExport}>
            Export ({selectedIds.length})
          </button>
          <button className="btn-danger" onClick={() => setDeleteConfirm({ type: 'bulk' })}>
            Delete ({selectedIds.length})
          </button>
        </section>
      )}

      {/* Items Table */}
      <section className="items-table-section">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading items...</p>
          </div>
        ) : loadError ? (
          <div className="error-state">
            <p>{loadError}</p>
            <button className="btn-primary" onClick={fetchItems}>Retry</button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>No items found</p>
            <button className="btn-primary" onClick={() => navigate('/items/add')}>Create First Item</button>
          </div>
        ) : (
          <>
            <div className="items-table">
              <div className="table-header">
                <div className="col-check"><input type="checkbox" checked={selectedIds.length === filteredItems.length && filteredItems.length > 0} onChange={toggleAllSelection} /></div>
                <div className="col-name">Item Name</div>
                <div className="col-code">Item Code</div>
                <div className="col-category">Category</div>
                <div className="col-unit">Unit</div>
                <div className="col-stock">Stock Qty</div>
                <div className="col-selling">Selling Price</div>
                <div className="col-value">Stock Value</div>
                <div className="col-status">Status</div>
                <div className="col-action">Actions</div>
              </div>

              <div className="table-body">
                {filteredItems.map((item) => {
                  const itemId = item.itemId ?? item.id ?? item._id;
                  const isSelected = selectedIds.includes(itemId);
                  const stockValue = (item.stock || 0) * getItemUnitCost(item);
                  const status = getStockStatus(item.stock, item.minStock);

                  return (
                    <div key={itemId} className={`table-row ${status === 'Out of Stock' ? 'out-of-stock' : status === 'Low Stock' ? 'low-stock' : 'in-stock'}`}>
                      <div className="col-check"><input type="checkbox" checked={isSelected} onChange={() => toggleItemSelection(itemId)} /></div>
                      <div className="col-name">{item.name}</div>
                      <div className="col-code">{item.code || '-'}</div>
                      <div className="col-category">{item.category || '-'}</div>
                      <div className="col-unit">{item.unit || 'PCS'}</div>
                      <div className="col-stock">{Math.max(0, item.stock || 0)}</div>
                      <div className="col-selling">{formatCurrency(item.salePrice || 0)}</div>
                      <div className="col-value">{formatCurrency(stockValue)}</div>
                      <div className="col-status"><span className={`badge badge-${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span></div>
                      <div className="col-action">
                        <button className="action-btn" title="Edit" onClick={() => handleEditItem(item)} disabled={updatingItemId === itemId}>
                          <img src={editIcon} alt="Edit" className="action-icon-img" />
                        </button>
                        <button className="action-btn" title="History" onClick={() => setHistoryItem(item)}>
                          <img src={historyIcon} alt="History" className="action-icon-img" />
                        </button>
                        <button className="action-btn danger" title="Delete" onClick={() => setDeleteConfirm({ type: 'single', itemId })}>
                          <img src={deleteIcon} alt="Delete" className="action-icon-img" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>


          </>
        )}
      </section>

      {/* Modals */}
      <StockHistoryModal
        open={!!historyItem}
        item={historyItem}
        onClose={() => setHistoryItem(null)}
      />

      <EditItemModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        onSave={handleSaveFromModal}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="close-btn" onClick={() => setDeleteConfirm(null)}>X</button>
            </div>
            <p>
              {deleteConfirm.type === 'bulk'
                ? `Delete ${selectedIds.length} items permanently?`
                : 'Delete this item permanently?'}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  if (deleteConfirm.type === 'bulk') {
                    handleBulkDelete();
                  } else {
                    handleDeleteItem(deleteConfirm.itemId);
                  }
                  setDeleteConfirm(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Items;
