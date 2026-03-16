import { useState, useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import './DeliveryChallan.css';
import DeliveryChallanPrint from '../components/DeliveryChallanPrint';
import ItemSelectionModal from '../components/ItemSelectionModal';

const normalizeItemLabel = (value) => String(value || '').trim().toLowerCase();

const toStockNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const DeliveryChallan = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  const [challanNumber, setChallanNumber] = useState('');
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [activeItemDropdownId, setActiveItemDropdownId] = useState(null);
  const [highlightedItemOptionIndex, setHighlightedItemOptionIndex] = useState(0);
  const [itemDropdownPosition, setItemDropdownPosition] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [remarks, setRemarks] = useState('');
  const itemInputRefs = useRef({});
  const itemOptionRefs = useRef({});

  useEffect(() => {
    generateChallanNumber();
    fetchCustomers();
    fetchItems();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/parties`);
      const data = await response.json();
      setCustomers(data.parties || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/items`);
      const data = await response.json();
      setItemsCatalog(data.items || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      setItemsCatalog([]);
    }
  };

  const generateChallanNumber = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery-challans`);
      const challans = await response.json();
      
      if (challans.length === 0) {
        setChallanNumber('DC0001');
      } else {
        const lastChallan = challans[challans.length - 1];
        const lastNumber = parseInt(lastChallan.challanNumber.replace('DC', ''));
        const newNumber = (lastNumber + 1).toString().padStart(4, '0');
        setChallanNumber(`DC${newNumber}`);
      }
    } catch (error) {
      console.error('Error generating challan number:', error);
      setChallanNumber('DC0001');
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const availableItems = itemsCatalog.reduce((accumulator, currentItem) => {
    const normalizedName = normalizeItemLabel(currentItem.name);
    if (!normalizedName) return accumulator;

    const exists = accumulator.some((item) => normalizeItemLabel(item.name) === normalizedName);
    if (!exists) {
      accumulator.push(currentItem);
    }

    return accumulator;
  }, []);

  const getFilteredItemOptions = (currentName) => {
    const query = normalizeItemLabel(currentName);
    if (!query) return availableItems;

    return availableItems.filter((catalogItem) => {
      const name = normalizeItemLabel(catalogItem.name);
      const code = normalizeItemLabel(catalogItem.code);
      const words = name.split(/\s+/).filter(Boolean);
      return (
        name.startsWith(query) ||
        words.some((word) => word.startsWith(query)) ||
        code.startsWith(query)
      );
    });
  };

  const applyCatalogItemToRow = (rowId, catalogItem, fallbackName = '') => {
    setSelectedItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== rowId) return item;

        return {
          ...item,
          itemName: catalogItem?.name || fallbackName || item.itemName,
          hsnCode: catalogItem?.code || item.hsnCode || '',
          unit: catalogItem?.unit || item.unit || 'PCS',
          stock: toStockNumber(catalogItem?.stock),
        };
      })
    );
  };

  const updateItemDropdownPosition = (rowId = activeItemDropdownId) => {
    if (rowId == null) {
      setItemDropdownPosition(null);
      return;
    }

    const input = itemInputRefs.current[`${rowId}-itemName`];
    if (!input) {
      setItemDropdownPosition(null);
      return;
    }

    const rect = input.getBoundingClientRect();
    const viewportPadding = 12;
    const maxWidth = Math.max(220, window.innerWidth - rect.left - viewportPadding);

    setItemDropdownPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.min(rect.width, maxWidth),
    });
  };

  const openItemDropdown = (rowId) => {
    setActiveItemDropdownId(rowId);
    setHighlightedItemOptionIndex(0);
    window.requestAnimationFrame(() => updateItemDropdownPosition(rowId));
  };

  const selectItemOption = (rowId, catalogItem, fallbackName = '') => {
    applyCatalogItemToRow(rowId, catalogItem, fallbackName);
    setActiveItemDropdownId(null);
    setHighlightedItemOptionIndex(0);
    setItemDropdownPosition(null);
  };

  const handleAddItemsFromModal = (items) => {
    const newItems = items.map((item) => ({
      id: Date.now() + Math.random(),
      itemName: item.name,
      hsnCode: item.code || item.hsn || item.hsnCode || '',
      quantity: item.quantity || 1,
      unit: item.unit || 'PCS',
      stock: toStockNumber(item.stock),
    }));

    setSelectedItems([...selectedItems, ...newItems]);
  };

  const handleAddEmptyItem = () => {
    const newItem = {
      id: Date.now() + Math.random(),
      itemName: '',
      hsnCode: '',
      quantity: 1,
      unit: 'PCS',
      stock: null,
    };

    setSelectedItems((prev) => [...prev, newItem]);

    setTimeout(() => {
      const nextInput = itemInputRefs.current[`${newItem.id}-itemName`];
      if (nextInput) nextInput.focus();
    }, 0);
  };

  const handleRemoveItem = (id) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== id));
    if (activeItemDropdownId === id) {
      setActiveItemDropdownId(null);
      setItemDropdownPosition(null);
      setHighlightedItemOptionIndex(0);
    }
  };

  const handleItemChange = (id, field, value) => {
    setSelectedItems(selectedItems.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const getRemainingStock = (item) => {
    const currentStock = toStockNumber(item.stock);
    if (currentStock === null) {
      return { currentStock: null, remainingStock: null };
    }

    const enteredQty = Number(item.quantity) || 0;
    return {
      currentStock,
      remainingStock: currentStock - enteredQty,
    };
  };

  const handleItemKeyDown = (e, rowIndex, field) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const fields = ['itemName', 'hsnCode', 'quantity', 'unit'];
    const currentFieldIndex = fields.indexOf(field);
    const currentItem = selectedItems[rowIndex];

    if (!currentItem) return;

    if (currentFieldIndex < fields.length - 1) {
      const nextField = fields[currentFieldIndex + 1];
      const nextInput = itemInputRefs.current[`${currentItem.id}-${nextField}`];
      if (nextInput) nextInput.focus();
      return;
    }

    const nextRow = selectedItems[rowIndex + 1];
    if (nextRow) {
      const nextInput = itemInputRefs.current[`${nextRow.id}-itemName`];
      if (nextInput) nextInput.focus();
      return;
    }

    handleAddEmptyItem();
  };

  useEffect(() => {
    if (activeItemDropdownId == null) {
      setItemDropdownPosition(null);
      return undefined;
    }

    const syncDropdownPosition = () => updateItemDropdownPosition(activeItemDropdownId);

    syncDropdownPosition();
    window.addEventListener('resize', syncDropdownPosition);
    window.addEventListener('scroll', syncDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', syncDropdownPosition);
      window.removeEventListener('scroll', syncDropdownPosition, true);
    };
  }, [activeItemDropdownId]);

  useEffect(() => {
    if (activeItemDropdownId == null) {
      return;
    }

    updateItemDropdownPosition(activeItemDropdownId);
  }, [selectedItems, activeItemDropdownId]);

  useEffect(() => {
    if (activeItemDropdownId == null) {
      return;
    }

    const activeOption = itemOptionRefs.current[`${activeItemDropdownId}-${highlightedItemOptionIndex}`];
    if (activeOption) {
      activeOption.scrollIntoView({ block: 'nearest' });
    }
  }, [activeItemDropdownId, highlightedItemOptionIndex]);

  const handlePrint = () => {
    if (!selectedCustomer) {
      alert('Please select a customer before printing');
      return;
    }
    if (validChallanItems.length === 0) {
      alert('Add at least one item before printing');
      return;
    }
    if (hasIncompleteItemRows) {
      alert('Complete all item rows before printing');
      return;
    }

    setShowPrintView(true);
    // Give the component more time to render before triggering print
    setTimeout(() => {
      // Wait for React to render the component
      setTimeout(() => {
        window.print();
        // Hide print view after a longer delay to ensure print dialog is fully loaded
        setTimeout(() => {
          setShowPrintView(false);
        }, 500);
      }, 300);
    }, 100);
  };

  const handleSave = async (options = {}) => {
    const { resetAfterSave = true } = options;

    if (!selectedCustomer) {
      alert('Please select a customer');
      return false;
    }
    if (validChallanItems.length === 0) {
      alert('Add at least one item before saving');
      return false;
    }
    if (hasIncompleteItemRows) {
      alert('Complete or remove the unfinished item rows before saving');
      return false;
    }

    const challanData = {
      challanNumber,
      challanDate,
      customerName: selectedCustomer?.name || '',
      customerPhone: selectedCustomer?.phone || '',
      customerAddress: selectedCustomer?.addressLine || '',
      deliveryAddress,
      vehicleNumber,
      driverName,
      remarks,
      items: validChallanItems,
      totalQuantity: validChallanItems.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0)
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery-challans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(challanData)
      });

      if (response.ok) {
        alert('Delivery challan saved successfully!');
        if (resetAfterSave) {
          resetForm();
        }
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server error:', errorData);
        alert(`Failed to save: ${errorData.message || `Error ${response.status}`}`);
        return false;
      }
    } catch (error) {
      console.error('Error saving challan:', error);
      alert('Failed to save delivery challan: ' + error.message);
      return false;
    }
  };

  const handleSaveAndPrint = async () => {
    // Try to save, but print anyway regardless of save result
    try {
      await handleSave({ resetAfterSave: false });
    } catch (error) {
      console.warn('Save failed, but proceeding to print:', error);
    }
    // Always print, even if save fails
    handlePrint();
  };

  const resetForm = () => {
    generateChallanNumber();
    setChallanDate(new Date().toISOString().split('T')[0]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setDeliveryAddress('');
    setVehicleNumber('');
    setDriverName('');
    setRemarks('');
    setSelectedItems([]);
  };

  const validChallanItems = selectedItems.filter((item) => String(item.itemName || '').trim());
  const hasIncompleteItemRows = selectedItems.some((item) => !String(item.itemName || '').trim());
  const totalQuantity = validChallanItems.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);
  const activeItem = selectedItems.find((entry) => entry.id === activeItemDropdownId) || null;
  const activeItemOptions = activeItem ? getFilteredItemOptions(activeItem.itemName) : [];

  return (
    <div className="delivery-challan-page">
      <div className={`challan-content ${showPrintView ? 'printing' : ''}`}>
        <div className="challan-header">
          <h1>Delivery Challan</h1>
          <div className="header-actions">
            <button className="btn-secondary" onClick={resetForm}>New Challan</button>
            <button className="btn-secondary" onClick={handleSave}>Save</button>
            <button className="btn-primary" onClick={handleSaveAndPrint}>Save & Print</button>
          </div>
        </div>

        <div className="challan-form">
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Challan Number</label>
                <input
                  type="text"
                  value={challanNumber}
                  readOnly
                  className="readonly-input"
                />
              </div>
              <div className="form-group">
                <label>Challan Date</label>
                <input
                  type="date"
                  value={challanDate}
                  onChange={(e) => setChallanDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Customer Details</h3>
            <label>Select Customer</label>
            {!selectedCustomer ? (
              <div className="customer-search">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search customer..."
                />
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="customer-dropdown">
                    {filteredCustomers.map(customer => (
                      <div
                        key={customer.partyId}
                        className="customer-item"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setDeliveryAddress(customer.addressLine || '');
                          setShowCustomerDropdown(false);
                          setCustomerSearch('');
                        }}
                      >
                        <strong>{customer.name}</strong>
                        {customer.phone && <span>{customer.phone}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="selected-customer">
                <div className="customer-details">
                  <strong>{selectedCustomer.name}</strong>
                  <span>{selectedCustomer.phone}</span>
                  {selectedCustomer.gstNumber && <span className="gst">GST: {selectedCustomer.gstNumber}</span>}
                  {selectedCustomer.addressLine && <span>{selectedCustomer.addressLine}</span>}
                </div>
                <button
                  className="btn-change"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                    setDeliveryAddress('');
                  }}
                >
                  Change
                </button>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>Items</h3>
            <div className="dc-item-actions">
              <button className="btn-add-item" onClick={handleAddEmptyItem}>
                <Plus size={16} />
                Add Item
              </button>
              <button className="btn-secondary" onClick={() => setIsItemModalOpen(true)}>
                Add from Catalog
              </button>
            </div>
            
            <div className="items-table">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>#</th>
                    <th style={{ width: '35%' }}>Item Name</th>
                    <th style={{ width: '15%' }}>HSN Code</th>
                    <th style={{ width: '15%' }}>Quantity</th>
                    <th style={{ width: '15%' }}>Unit</th>
                    <th style={{ width: '10%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-items">No items added. Click "+ Add Item" to get started.</td>
                    </tr>
                  ) : (
                    selectedItems.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="dc-item-search">
                            <input
                              ref={(el) => {
                                itemInputRefs.current[`${item.id}-itemName`] = el;
                              }}
                              type="text"
                              value={item.itemName}
                              onChange={(e) => {
                                handleItemChange(item.id, 'itemName', e.target.value);
                                openItemDropdown(item.id);
                              }}
                              onFocus={() => openItemDropdown(item.id)}
                              onBlur={() => {
                                window.setTimeout(() => {
                                  setActiveItemDropdownId((currentId) => {
                                    if (currentId === item.id) {
                                      setItemDropdownPosition(null);
                                      setHighlightedItemOptionIndex(0);
                                      return null;
                                    }
                                    return currentId;
                                  });
                                }, 150);
                              }}
                              onKeyDown={(e) => {
                                const options = getFilteredItemOptions(item.itemName);

                                if (e.key === 'ArrowDown' && options.length > 0) {
                                  e.preventDefault();
                                  if (activeItemDropdownId !== item.id) {
                                    openItemDropdown(item.id);
                                    return;
                                  }

                                  setHighlightedItemOptionIndex((currentIndex) =>
                                    Math.min(currentIndex + 1, options.length - 1)
                                  );
                                  return;
                                }

                                if (e.key === 'ArrowUp' && options.length > 0) {
                                  e.preventDefault();
                                  setHighlightedItemOptionIndex((currentIndex) => Math.max(currentIndex - 1, 0));
                                  return;
                                }

                                if (e.key === 'Escape') {
                                  setActiveItemDropdownId(null);
                                  setItemDropdownPosition(null);
                                  setHighlightedItemOptionIndex(0);
                                  return;
                                }

                                if (
                                  e.key === 'Enter' &&
                                  activeItemDropdownId === item.id &&
                                  options.length > 0
                                ) {
                                  e.preventDefault();
                                  selectItemOption(item.id, options[highlightedItemOptionIndex], item.itemName);
                                  return;
                                }

                                handleItemKeyDown(e, index, 'itemName');
                              }}
                              placeholder="Enter item name"
                              autoComplete="off"
                            />
                          </div>
                        </td>
                        <td>
                          <input
                            ref={(el) => {
                              itemInputRefs.current[`${item.id}-hsnCode`] = el;
                            }}
                            type="text"
                            value={item.hsnCode}
                            onChange={(e) => handleItemChange(item.id, 'hsnCode', e.target.value)}
                            onKeyDown={(e) => handleItemKeyDown(e, index, 'hsnCode')}
                            placeholder="HSN"
                          />
                        </td>
                        <td>
                          {(() => {
                            const { currentStock, remainingStock } = getRemainingStock(item);

                            return (
                              <>
                          <input
                            ref={(el) => {
                              itemInputRefs.current[`${item.id}-quantity`] = el;
                            }}
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                            onKeyDown={(e) => handleItemKeyDown(e, index, 'quantity')}
                            min="1"
                          />
                                {currentStock !== null && (
                                  <div className={`dc-stock-info ${remainingStock < 0 ? 'dc-stock-info-low' : ''}`}>
                                    Stock: {currentStock} | Remaining: {remainingStock}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        <td>
                          <select
                            ref={(el) => {
                              itemInputRefs.current[`${item.id}-unit`] = el;
                            }}
                            value={item.unit}
                            onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                            onKeyDown={(e) => handleItemKeyDown(e, index, 'unit')}
                          >
                            <option value="PCS">PCS</option>
                            <option value="BOX">BOX</option>
                            <option value="KG">KG</option>
                            <option value="MTR">MTR</option>
                          </select>
                        </td>
                        <td>
                          <button
                            className="btn-remove"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="total-summary">
              <strong>Total Quantity: {totalQuantity}</strong>
            </div>
          </div>
        </div>
      </div>

      {activeItemDropdownId !== null && activeItemOptions.length > 0 && itemDropdownPosition && (
        <div
          className="dc-item-dropdown dc-item-dropdown-floating"
          style={{
            top: itemDropdownPosition.top,
            left: itemDropdownPosition.left,
            width: itemDropdownPosition.width,
          }}
        >
          {activeItemOptions.map((catalogItem, optionIndex) => (
            <div
              key={catalogItem.id || `${catalogItem.name}-${catalogItem.code || 'item'}`}
              ref={(el) => {
                itemOptionRefs.current[`${activeItemDropdownId}-${optionIndex}`] = el;
              }}
              className={`dc-item-option ${optionIndex === highlightedItemOptionIndex ? 'dc-item-option-active' : ''}`}
              onMouseEnter={() => setHighlightedItemOptionIndex(optionIndex)}
              onMouseDown={() => {
                if (activeItem) {
                  selectItemOption(activeItem.id, catalogItem, activeItem.itemName);
                }
              }}
            >
              <strong>{catalogItem.name}</strong>
              <span>{catalogItem.code || 'NA'} | {catalogItem.unit || 'PCS'} | Stock: {Number(catalogItem.stock ?? 0)}</span>
            </div>
          ))}
        </div>
      )}

      {showPrintView && (
        <div className="print-section">
          <DeliveryChallanPrint
            challan={{
              challanNumber,
              challanDate,
              vehicleNumber,
              driverName
            }}
            customer={{
              name: selectedCustomer?.name || '',
              phone: selectedCustomer?.phone || '',
              billingAddress: selectedCustomer?.addressLine || '',
              deliveryAddress
            }}
            items={validChallanItems}
            totalQuantity={totalQuantity}
            remarks={remarks}
          />
        </div>
      )}

      <ItemSelectionModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onAddItems={handleAddItemsFromModal}
      />
    </div>
  );
};

export default DeliveryChallan;
