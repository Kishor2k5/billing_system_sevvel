import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './RecycleBinPage.css';

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function RecycleBinPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [toast, setToast] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  try {
    const currentHost = window.location.host;
    if (!API_BASE_URL || API_BASE_URL.includes(currentHost)) {
      API_BASE_URL = 'http://localhost:5000';
    }
  } catch (e) {
    API_BASE_URL = 'http://localhost:5000';
  }

  // Load recycle bin items
  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/items/recycle-bin`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load recycle bin');
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load recycle bin:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Show toast
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Restore item
  const handleRestore = async (itemId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/items/${itemId}/restore`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to restore item');

      setItems((prev) => prev.filter((it) => it.itemId !== itemId));
      setSelectedIds((prev) => prev.filter((id) => id !== itemId));
      showToast('Item restored successfully', 'success');
      setRestoreConfirm(null);
    } catch (err) {
      console.error('Failed to restore item:', err);
      showToast(err.message, 'error');
    }
  };

  // Permanent delete
  const handlePermanentDelete = async (itemId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/items/${itemId}/permanent`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete item');

      setItems((prev) => prev.filter((it) => it.itemId !== itemId));
      setSelectedIds((prev) => prev.filter((id) => id !== itemId));
      showToast('Item permanently deleted', 'success');
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete item:', err);
      showToast(err.message, 'error');
    }
  };

  // Bulk restore
  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;

    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API_BASE_URL}/api/items/${id}/restore`, { method: 'POST' })
        )
      );

      setItems((prev) => prev.filter((it) => !selectedIds.includes(it.itemId)));
      setSelectedIds([]);
      showToast(`${selectedIds.length} items restored successfully`, 'success');
    } catch (err) {
      console.error('Failed to bulk restore:', err);
      showToast('Failed to restore some items', 'error');
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API_BASE_URL}/api/items/${id}/permanent`, { method: 'DELETE' })
        )
      );

      setItems((prev) => prev.filter((it) => !selectedIds.includes(it.itemId)));
      setSelectedIds([]);
      showToast(`${selectedIds.length} items permanently deleted`, 'success');
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      showToast('Failed to delete some items', 'error');
    }
  };

  // Toggle item selection
  const toggleItemSelection = (itemId) => {
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Toggle all selection
  const toggleAllSelection = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((it) => it.itemId));
    }
  };

  return (
    <div className="recycle-bin-container">
      {/* Header */}
      <header className="bin-header">
        <div>
          <h1>Recycle Bin</h1>
          <p>Manage deleted inventory items</p>
        </div>
        <button className="btn-back" onClick={() => navigate('/items')}>
          ← Back to Items
        </button>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading recycle bin...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
          <button className="btn-primary" onClick={loadItems}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <section className="bulk-actions">
              <span>{selectedIds.length} item(s) selected</span>
              <button className="btn-secondary" onClick={handleBulkRestore}>
                ✓ Restore ({selectedIds.length})
              </button>
              <button className="btn-danger" onClick={() => setDeleteConfirm({ type: 'bulk' })}>
                🗑️ Delete ({selectedIds.length})
              </button>
            </section>
          )}

          {/* Empty State */}
          {items.length === 0 ? (
            <div className="empty-state">
              <p>🗑️ Recycle bin is empty</p>
              <button className="btn-primary" onClick={() => navigate('/items')}>
                Go to Items
              </button>
            </div>
          ) : (
            /* Items Table */
            <>
              <section className="bin-table-section">
                <div className="bin-table">
                  <div className="table-header">
                    <div className="col-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === items.length && items.length > 0}
                        onChange={toggleAllSelection}
                      />
                    </div>
                    <div className="col-name">Item Name</div>
                    <div className="col-code">Item Code</div>
                    <div className="col-category">Category</div>
                    <div className="col-deleted">Deleted Date</div>
                    <div className="col-by">Deleted By</div>
                    <div className="col-actions">Actions</div>
                  </div>

                  <div className="table-body">
                    {items.map((item) => (
                      <div key={item.itemId} className="table-row">
                        <div className="col-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.itemId)}
                            onChange={() => toggleItemSelection(item.itemId)}
                          />
                        </div>
                        <div className="col-name">{item.name}</div>
                        <div className="col-code">{item.code || '-'}</div>
                        <div className="col-category">{item.category || '-'}</div>
                        <div className="col-deleted">{formatDate(item.deletedAt)}</div>
                        <div className="col-by">{item.deletedBy || 'System'}</div>
                        <div className="col-actions">
                          <button
                            className="action-btn restore"
                            title="Restore"
                            onClick={() => setRestoreConfirm(item.itemId)}
                          >
                            ✓ Restore
                          </button>
                          <button
                            className="action-btn delete"
                            title="Permanently Delete"
                            onClick={() => setDeleteConfirm({ type: 'single', itemId: item.itemId })}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Info */}
              <div className="bin-info">
                <p>
                  ℹ️ Deleted items are stored for 30 days before permanent deletion. Restore items to return them to
                  your inventory.
                </p>
              </div>
            </>
          )}
        </>
      )}

      {/* Restore Confirmation Dialog */}
      {restoreConfirm && (
        <div className="modal-overlay" onClick={() => setRestoreConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Restore</h2>
              <button className="close-btn" onClick={() => setRestoreConfirm(null)}>
                ✕
              </button>
            </div>
            <p>Restore this item to your inventory?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setRestoreConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => handleRestore(restoreConfirm)}
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Permanent Delete</h2>
              <button className="close-btn" onClick={() => setDeleteConfirm(null)}>
                ✕
              </button>
            </div>
            <p className="warning">
              ⚠️ This action cannot be undone. The item(s) will be permanently deleted from the database.
            </p>
            <p>
              {deleteConfirm.type === 'bulk'
                ? `Delete ${selectedIds.length} items permanently?`
                : 'Delete this item permanently?'}
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  if (deleteConfirm.type === 'bulk') {
                    handleBulkDelete();
                  } else {
                    handlePermanentDelete(deleteConfirm.itemId);
                  }
                }}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecycleBinPage;
