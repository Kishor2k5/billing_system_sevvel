import React, { useState, useEffect, useRef } from 'react';
import ItemSelectionModal from '../components/ItemSelectionModal';
import './SalesInvoice.css';
import InvoicePrint from '../components/InvoicePrint';

const normalizeItemLabel = (value) => String(value || '').trim().toLowerCase();

const toStockNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const createCustomerDraft = (customer = {}) => ({
  name: customer.name || '',
  phone: customer.phone || customer.mobile || '',
  gstNumber: customer.gstNumber || '',
  addressLine: customer.addressLine || customer.billingAddress || '',
  city: customer.city || '',
  state: customer.state || '',
  postalCode: customer.postalCode || '',
  shippingName: customer.shippingName || customer.name || '',
  shippingAddress: customer.shippingAddress || customer.deliveryAddress || customer.addressLine || customer.billingAddress || '',
  shippingCity: customer.shippingCity || customer.city || '',
  shippingState: customer.shippingState || customer.state || '',
  shippingPincode: customer.shippingPincode || customer.postalCode || '',
});

const hasOwnShippingAddress = (customer = {}) => {
  const billing = createCustomerDraft(customer);
  const billingKey = [billing.addressLine, billing.city, billing.state, billing.postalCode]
    .map((value) => normalizeItemLabel(value))
    .join('|');
  const shippingKey = [billing.shippingAddress, billing.shippingCity, billing.shippingState, billing.shippingPincode]
    .map((value) => normalizeItemLabel(value))
    .join('|');

  return Boolean(shippingKey.replace(/\|/g, '')) && shippingKey !== billingKey;
};

const SalesInvoice = () => {
  // Invoice state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isManualInvoiceNumber, setIsManualInvoiceNumber] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');

  // Customer state
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [customerDraft, setCustomerDraft] = useState(null);
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false);

  // Items state
  const [items, setItems] = useState([]);
  // Catalog items fetched from server for auto-fill (newly created items will appear here)
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [activeItemDropdownId, setActiveItemDropdownId] = useState(null);
  const [highlightedItemOptionIndex, setHighlightedItemOptionIndex] = useState(0);
  const [itemDropdownPosition, setItemDropdownPosition] = useState(null);

  // Additional state
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [notes, setNotes] = useState('');

  // Payment Status State
  const [paymentStatus, setPaymentStatus] = useState('Unpaid'); // Unpaid, Paid, Partially Paid
  const [paymentMode, setPaymentMode] = useState('Cash'); // Cash, Bank, UPI
  const [receivedAmount, setReceivedAmount] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [savedBill, setSavedBill] = useState(null);
  const [showPrintView, setShowPrintView] = useState(false);

  // Modal state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const itemInputRefs = useRef({});
  const itemOptionRefs = useRef({});

  const generateInvoiceNumber = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(`${API_BASE_URL}/api/bills`);
      const data = await response.json();

      let nextNumber = 1;

      if (data.bills && data.bills.length > 0) {
        const invoiceNumbers = data.bills
          .map((bill) => bill.invoiceNumber)
          .filter((num) => num && num.startsWith('INV'))
          .map((num) => {
            const match = num.match(/INV(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((num) => !isNaN(num));

        if (invoiceNumbers.length > 0) {
          const maxNumber = Math.max(...invoiceNumbers);
          nextNumber = maxNumber + 1;
        }
      }

      const formattedNumber = `INV${String(nextNumber).padStart(4, '0')}`;
      setInvoiceNumber(formattedNumber);
    } catch (err) {
      console.error('Failed to generate invoice number:', err);
      setInvoiceNumber('INV0001');
    }
  };

  // Auto-generate invoice number on mount
  useEffect(() => {
    generateInvoiceNumber();
  }, []);

  // Fetch customers and items (for auto-fill)
  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    const fetchCustomers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/parties`);
        const data = await response.json();
        setCustomers(data.parties || []);
      } catch (err) {
        console.error('Failed to fetch customers:', err);
      }
    };

    const fetchItems = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/items`);
        const d = await res.json();
        setItemsCatalog(d.items || []);
      } catch (err) {
        console.error('Failed to fetch items for auto-fill:', err);
      }
    };

    fetchCustomers();
    fetchItems();
  }, []);

  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerDraft(null);
      setShippingSameAsBilling(true);
      return;
    }

    setCustomerDraft(createCustomerDraft(selectedCustomer));
    setShippingSameAsBilling(!hasOwnShippingAddress(selectedCustomer));
  }, [selectedCustomer]);

  const itemSource = itemsCatalog;

  const availableItems = itemSource.reduce((accumulator, currentItem) => {
    const normalizedName = normalizeItemLabel(currentItem.name);
    if (!normalizedName) return accumulator;

    const exists = accumulator.some((item) => normalizeItemLabel(item.name) === normalizedName);
    if (!exists) {
      accumulator.push(currentItem);
    }

    return accumulator;
  }, []);

  const findCatalogMatch = (value) => {
    const typed = normalizeItemLabel(value);
    if (!typed) return null;

    let match = availableItems.find((item) => normalizeItemLabel(item.name) === typed);
    if (!match) {
      match = availableItems.find((item) => normalizeItemLabel(item.name).includes(typed));
    }

    return match || null;
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDropdown(false);
    setCustomerSearch('');
    setSuccessMessage('');

    if (!placeOfSupply) {
      setPlaceOfSupply(customer.state || customer.shippingState || customer.city || '');
    }
  };

  const handleCustomerDraftChange = (field, value) => {
    setCustomerDraft((currentDraft) => {
      if (!currentDraft) return currentDraft;
      return {
        ...currentDraft,
        [field]: value,
      };
    });
  };

  const handleSaveCustomerDetails = async () => {
    if (!selectedCustomer?.partyId || !customerDraft) {
      return;
    }

    if (!customerDraft.name.trim()) {
      alert('Customer name is required');
      return;
    }

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const shippingPayload = shippingSameAsBilling
      ? {
          shippingName: customerDraft.name,
          shippingAddress: customerDraft.addressLine,
          shippingCity: customerDraft.city,
          shippingState: customerDraft.state,
          shippingPincode: customerDraft.postalCode,
        }
      : {
          shippingName: customerDraft.shippingName,
          shippingAddress: customerDraft.shippingAddress,
          shippingCity: customerDraft.shippingCity,
          shippingState: customerDraft.shippingState,
          shippingPincode: customerDraft.shippingPincode,
        };

    setIsUpdatingCustomer(true);
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/parties/${encodeURIComponent(selectedCustomer.partyId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerDraft.name,
          phone: customerDraft.phone,
          email: selectedCustomer.email || '',
          gstNumber: customerDraft.gstNumber,
          addressLine: customerDraft.addressLine,
          city: customerDraft.city,
          state: customerDraft.state,
          postalCode: customerDraft.postalCode,
          openingBalance: selectedCustomer.openingBalance ?? 0,
          category: selectedCustomer.category || 'Buyer',
          ...shippingPayload,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data.message || 'Failed to update customer');
        return;
      }

      const updatedParty = data.party || {};
      setSelectedCustomer(updatedParty);
      setCustomers((currentCustomers) =>
        currentCustomers.map((customer) =>
          customer.partyId === updatedParty.partyId ? updatedParty : customer
        )
      );
      setSuccessMessage('Party details updated');

      if (!placeOfSupply) {
        setPlaceOfSupply(updatedParty.state || updatedParty.shippingState || updatedParty.city || '');
      }
    } catch (error) {
      console.error('Failed to update customer details:', error);
      alert('Failed to update customer');
    } finally {
      setIsUpdatingCustomer(false);
    }
  };

  const applyCatalogItemToRow = (rowId, catalogItem, fallbackName = '') => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== rowId) return item;

        const updatedItem = {
          ...item,
          name: catalogItem?.name || fallbackName || item.name,
          hsn: catalogItem?.code || item.hsn || '',
          unit: catalogItem?.unit || item.unit || 'PCS',
          price: Number(catalogItem?.salePrice ?? catalogItem?.salesPrice ?? catalogItem?.purchasePrice ?? item.price ?? 0) || 0,
          stock: toStockNumber(catalogItem?.stock)
        };

        updatedItem.amount = calculateAmount(updatedItem);
        return updatedItem;
      })
    );
  };

  // Calculate item amount
  const calculateAmount = (item) => {
    const subtotal = item.qty * item.price;
    const discountAmount = (subtotal * item.discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * item.tax) / 100;
    return taxableAmount + taxAmount;
  };

  // Update item
  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };

        updatedItem.amount = calculateAmount(updatedItem);
        return updatedItem;
      }
      return item;
    }));
  };

  // Add new item
  const handleAddItem = () => {
    setIsItemModalOpen(true);
  };

  // Handle adding items from modal
  const handleAddItemsFromModal = (newItems) => {
    const maxId = items.length > 0 ? Math.max(...items.map(i => i.id)) : 0;
    const itemsToAdd = newItems.map((item, index) => ({
      id: maxId + index + 1,
      name: item.name,
      hsn: item.code || '',
      qty: item.quantity || 1,
      unit: item.unit || 'PCS',
      // Prefer modal-provided rate (selling price), fall back to known fields
      price: item.rate ?? item.salePrice ?? item.salesPrice ?? item.purchasePrice ?? 0,
      stock: toStockNumber(item.stock),
      discount: 0,
      tax: 18,
      amount: 0
    }));

    // Calculate amounts for new items
    const updatedItems = itemsToAdd.map(item => ({
      ...item,
      amount: calculateAmount(item)
    }));

    setItems([...items, ...updatedItems]);
  };

  const handleAddEmptyItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map((it) => Number(it.id) || 0)) + 1 : 1;
    const newItem = {
      id: newId,
      name: '',
      hsn: '',
      qty: 1,
      unit: 'PCS',
      price: 0,
      stock: null,
      discount: 0,
      tax: 18,
      amount: 0
    };

    setItems((prev) => [...prev, { ...newItem, amount: calculateAmount(newItem) }]);

    setTimeout(() => {
      const nextInput = itemInputRefs.current[`${newId}-name`];
      if (nextInput) nextInput.focus();
    }, 0);
  };

  // Remove item
  const handleRemoveItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
    if (activeItemDropdownId === id) {
      setActiveItemDropdownId(null);
    }
  };

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

  const handleItemKeyDown = (e, rowIndex, field) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const fields = ['name', 'hsn', 'qty', 'unit', 'price', 'discount', 'tax'];
    const currentFieldIndex = fields.indexOf(field);
    const currentItem = items[rowIndex];

    if (!currentItem) return;

    if (currentFieldIndex < fields.length - 1) {
      const nextField = fields[currentFieldIndex + 1];
      const nextInput = itemInputRefs.current[`${currentItem.id}-${nextField}`];
      if (nextInput) nextInput.focus();
      return;
    }

    const nextRow = items[rowIndex + 1];
    if (nextRow) {
      const nextInput = itemInputRefs.current[`${nextRow.id}-name`];
      if (nextInput) nextInput.focus();
      return;
    }

    handleAddEmptyItem();
  };

  const updateItemDropdownPosition = (rowId = activeItemDropdownId) => {
    if (rowId == null) {
      setItemDropdownPosition(null);
      return;
    }

    const input = itemInputRefs.current[`${rowId}-name`];
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
  }, [items, activeItemDropdownId]);

  useEffect(() => {
    if (activeItemDropdownId == null) {
      return;
    }

    const activeOption = itemOptionRefs.current[`${activeItemDropdownId}-${highlightedItemOptionIndex}`];
    if (activeOption) {
      activeOption.scrollIntoView({ block: 'nearest' });
    }
  }, [activeItemDropdownId, highlightedItemOptionIndex]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const totalDiscount = items.reduce((sum, item) => sum + ((item.qty * item.price * item.discount) / 100), 0);
  const taxableAmount = subtotal - totalDiscount;
  const totalTax = items.reduce((sum, item) => {
    const itemSubtotal = item.qty * item.price;
    const itemDiscount = (itemSubtotal * item.discount) / 100;
    const itemTaxable = itemSubtotal - itemDiscount;
    return sum + ((itemTaxable * item.tax) / 100);
  }, 0);
  const cgst = totalTax / 2;
  const sgst = totalTax / 2;
  const grandTotal = taxableAmount + totalTax + additionalCharges;

  // Filter customers
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const isDefaultEmptyItem = (item) => {
    const normalizedName = String(item.name || '').trim();
    const normalizedHsn = String(item.hsn || '').trim();
    const normalizedUnit = String(item.unit || 'PCS').trim().toUpperCase();

    return (
      !normalizedName &&
      !normalizedHsn &&
      (Number(item.qty) || 0) === 1 &&
      normalizedUnit === 'PCS' &&
      (Number(item.price) || 0) === 0 &&
      (Number(item.discount) || 0) === 0 &&
      (Number(item.tax) || 0) === 18
    );
  };

  const validInvoiceItems = items.filter((item) => String(item.name || '').trim());
  const hasIncompleteItemRows = items.some((item) => !String(item.name || '').trim() && !isDefaultEmptyItem(item));

  const activeItem = items.find((entry) => entry.id === activeItemDropdownId) || null;
  const activeItemOptions = activeItem ? getFilteredItemOptions(activeItem.name) : [];

  const getRemainingStock = (item) => {
    const currentStock = toStockNumber(item.stock);
    if (currentStock === null) {
      return { currentStock: null, remainingStock: null };
    }

    const enteredQty = Number(item.qty) || 0;
    return {
      currentStock,
      remainingStock: currentStock - enteredQty,
    };
  };

  // Prepare print data
  const printItems = validInvoiceItems.map((i) => {
    const qty = Number(i.qty) || 0;
    const rate = Number(i.price) || 0;
    const subtotal = qty * rate;
    const discountAmount = (subtotal * (Number(i.discount) || 0)) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * (Number(i.tax) || 0)) / 100;
    const lineTotal = taxableAmount + taxAmount;

    return {
      description: i.name || '',
      name: i.name || '',
      hsn: i.hsn || i.code || '',
      quantity: qty,
      unit: i.unit || 'PCS',
      rate: rate,
      taxableAmount: taxableAmount,
      taxAmount: taxAmount,
      taxPercent: Number(i.tax) || 0,
      lineTotal: lineTotal
    };
  });

  const printSummary = {
    subtotalQty: validInvoiceItems.reduce((s, it) => s + (Number(it.qty) || 0), 0),
    subtotalTaxable: Number(taxableAmount) || 0,
    subtotalTax: Number(totalTax) || 0,
    totalAmount: Number(grandTotal) || 0,
    amountInWords: ''
  };

  const printInvoiceMeta = {
    invoiceNumber,
    invoiceDate,
    dueDate,
    placeOfSupply: placeOfSupply || ''
  };

  const printBillTo = selectedCustomer ? {
    name: selectedCustomer.name,
    address: selectedCustomer.addressLine ? [selectedCustomer.addressLine] : [],
    city: selectedCustomer.city || '',
    district: selectedCustomer.city || '',
    state: selectedCustomer.state || '',
    pincode: selectedCustomer.postalCode || '',
    gstin: selectedCustomer.gstNumber || ''
  } : {};

  // Compute print scale: shrink slightly when there are many items so it fits on one page
  const computePrintScale = () => {
    const count = validInvoiceItems.length || 0;
    if (count <= 8) return 1;
    const extra = count - 8;
    // reduce by ~3.5% per extra row, clamp at 0.72 (minimum scale)
    const scale = Math.max(0.72, 1 - extra * 0.035);
    return scale;
  };

  const printScale = computePrintScale();


  // Format currency
  const formatCurrency = (value) => {
    return '₹' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Save invoice to server and return success
  const handleSave = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer');
      return false;
    }
    if (validInvoiceItems.length === 0) {
      alert('Add at least one item before saving');
      return false;
    }
    if (hasIncompleteItemRows) {
      alert('Complete or remove the unfinished item rows before saving');
      return false;
    }

    setIsSaving(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const payload = {
        invoiceNumber,
        invoiceDate,
        dueDate,
        customer: {
          partyId: selectedCustomer.partyId || '',
          name: selectedCustomer.name,
          phone: selectedCustomer.phone || '',
          gstNumber: selectedCustomer.gstNumber || '',
          addressLine: selectedCustomer.addressLine || ''
        },
        items: validInvoiceItems.map(i => ({
          itemId: i.id || i.itemId || '',
          name: String(i.name || '').trim(),
          hsn: i.hsn || '',
          quantity: Number(i.qty) || 0,
          unit: i.unit || 'PCS',
          price: Number(i.price) || Number(i.rate) || 0,
          discount: Number(i.discount) || 0,
          tax: Number(i.tax) || 0,
          amount: Number(i.amount) || 0
        })),

        subtotal,
        totalDiscount,
        taxableAmount,
        totalTax,
        additionalCharges,
        grandTotal,
        notes,
        status: paymentStatus,
        paidAmount: paymentStatus === 'Paid' ? grandTotal : (paymentStatus === 'Unpaid' ? 0 : receivedAmount),
        paymentMode: paymentStatus !== 'Unpaid' ? paymentMode : null
      };

      const res = await fetch(`${API_BASE_URL}/api/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Failed to save invoice');
        setIsSaving(false);
        return false;
      }

      const d = await res.json();
      setSavedBill(d.bill || null);
      setIsSaving(false);
      alert('Invoice saved successfully!');
      return true;
    } catch (err) {
      console.error('Save error', err);
      alert('Failed to save invoice');
      setIsSaving(false);
      return false;
    }
  };

  // Save and print the invoice
  const handlePrint = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }
    if (validInvoiceItems.length === 0) {
      alert('Add at least one item before printing');
      return;
    }
    if (hasIncompleteItemRows) {
      alert('Complete or remove the unfinished item rows before printing');
      return;
    }

    // Show print view
    setShowPrintView(true);

    // Wait for the component to render, then trigger print dialog
    setTimeout(() => {
      // Additional delay to ensure React has finished rendering
      setTimeout(() => {
        window.print();
        // Hide print view after a longer delay to ensure print dialog is fully loaded
        setTimeout(() => setShowPrintView(false), 500);
      }, 300);
    }, 100);
  };

  const handleViewPDF = async (invoiceNumber) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const pdfUrl = `${API_BASE_URL}/api/bills/${encodeURIComponent(invoiceNumber)}/pdf`;

    // Open PDF in new tab
    const newWindow = window.open(pdfUrl, '_blank');

    if (!newWindow) {
      alert('Please allow pop-ups to view the PDF');
    }
  };

  const handleClearInvoice = async () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setCustomerDraft(null);
    setShippingSameAsBilling(true);
    setSuccessMessage('');
    setItems([]);
    setAdditionalCharges(0);
    setNotes('');
    setPaymentStatus('Unpaid');
    setPaymentMode('Cash');
    setReceivedAmount(0);
    setSavedBill(null);
    setShowPrintView(false);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setPlaceOfSupply('');
    setIsManualInvoiceNumber(false);
    await generateInvoiceNumber();
  };

  const activeCustomer = customerDraft || createCustomerDraft(selectedCustomer || {});
  const selectedCustomerPhone = activeCustomer.phone || '-';
  const selectedCustomerBillingAddress = activeCustomer.addressLine || '-';
  const selectedCustomerShippingName = shippingSameAsBilling
    ? activeCustomer.name || '-'
    : activeCustomer.shippingName || activeCustomer.name || '-';
  const selectedCustomerShippingAddress = shippingSameAsBilling
    ? activeCustomer.addressLine || '-'
    : activeCustomer.shippingAddress || '-';
  const selectedCustomerShippingCity = shippingSameAsBilling
    ? activeCustomer.city || '-'
    : activeCustomer.shippingCity || '-';
  const selectedCustomerShippingState = shippingSameAsBilling
    ? activeCustomer.state || '-'
    : activeCustomer.shippingState || '-';
  const selectedCustomerShippingPincode = shippingSameAsBilling
    ? activeCustomer.postalCode || '-'
    : activeCustomer.shippingPincode || '-';
  const selectedCustomerBalance = Number(selectedCustomer?.balance ?? selectedCustomer?.openingBalance ?? 0);
  const selectedCustomerBalanceClass = selectedCustomerBalance > 0 ? 'si-customer-balance-due' : 'si-customer-balance-clear';
  const selectedCustomerGst = activeCustomer.gstNumber || '-';

  return (
    <div className="sales-invoice-page">
      <div className="si-shell">
        <div className="si-header">
          <h1 className="si-title">Sales Invoice</h1>
        </div>

        {savedBill && (
          <div className="si-saved-banner">
            <div className="si-saved-text">Invoice saved: <strong>{savedBill.invoiceNumber}</strong></div>
            <div className="si-saved-actions">
              <button onClick={() => handleViewPDF(savedBill.invoiceNumber)} className="si-btn si-btn-primary">View PDF</button>
              <a href="/bills" className="si-btn si-btn-success">View All</a>
            </div>
          </div>
        )}

        <div className="si-section-card si-meta-grid">
          <div className="si-field-group">
            <label>Invoice Number</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-0001"
                readOnly={!isManualInvoiceNumber}
                style={{ flex: 1 }}
              />
              <button
                onClick={() => {
                  if (isManualInvoiceNumber) {
                    setIsManualInvoiceNumber(false);
                    generateInvoiceNumber();
                  } else {
                    setIsManualInvoiceNumber(true);
                  }
                }}
                className={`si-btn ${isManualInvoiceNumber ? 'si-btn-primary' : 'si-btn-outline'}`}
                style={{ whiteSpace: 'nowrap' }}
                title={isManualInvoiceNumber ? 'Switch to auto-generate' : 'Switch to manual entry'}
              >
                {isManualInvoiceNumber ? '🔒 Auto' : '✎ Manual'}
              </button>
            </div>
          </div>
          <div className="si-field-group">
            <label>Invoice Date</label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <div className="si-field-group">
            <label>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="si-field-group">
            <label>Place of Supply</label>
            <input
              type="text"
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              placeholder="Tamil Nadu"
            />
          </div>
        </div>

        <div className="si-section-card si-customer-section">
          <div className="si-section-label">Customer Selection</div>
          {!selectedCustomer ? (
            <div className="si-customer-search">
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
                <div className="si-customer-dropdown">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.partyId}
                      className="si-customer-item"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setShowCustomerDropdown(false);
                        setCustomerSearch('');
                        if (!placeOfSupply) {
                          setPlaceOfSupply(customer.state || customer.city || '');
                        }
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
            <div className="si-customer-card">
              <div className="si-customer-card-header">
                <div className="si-customer-card-title">Selected Party</div>
                <button
                  className="si-btn si-btn-outline"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                  }}
                >
                  Change Customer
                </button>
              </div>

              <div className="si-customer-panels">
                <div className="si-customer-panel">
                  <div className="si-customer-panel-title">Billing Address</div>
                  <div className="si-customer-name">{selectedCustomer.name || '-'}</div>
                  <div className="si-customer-panel-meta">
                    <span>Mobile: {selectedCustomerPhone}</span>
                    <span>GST: {selectedCustomer.gstNumber || '-'}</span>
                    <span className={`si-customer-balance ${selectedCustomerBalanceClass}`}>
                      Balance: {formatCurrency(selectedCustomerBalance)}
                    </span>
                  </div>
                  <div className="si-customer-panel-body">
                    <div className="si-customer-detail-item si-customer-detail-item-full">
                      <span className="si-customer-detail-label">Billing Address</span>
                      <span className="si-customer-detail-value">{selectedCustomerBillingAddress}</span>
                    </div>
                  </div>
                </div>

                <div className="si-customer-panel">
                  <div className="si-customer-panel-title">Shipping Address</div>
                  <div className="si-customer-name">{selectedCustomerShippingName}</div>
                  <div className="si-customer-panel-body si-customer-panel-body-grid">
                    <div className="si-customer-detail-item si-customer-detail-item-full">
                      <span className="si-customer-detail-label">Shipping Address</span>
                      <span className="si-customer-detail-value">{selectedCustomerShippingAddress}</span>
                    </div>
                    <div className="si-customer-detail-item">
                      <span className="si-customer-detail-label">City</span>
                      <span className="si-customer-detail-value">{selectedCustomerShippingCity}</span>
                    </div>
                    <div className="si-customer-detail-item">
                      <span className="si-customer-detail-label">State</span>
                      <span className="si-customer-detail-value">{selectedCustomerShippingState}</span>
                    </div>
                    <div className="si-customer-detail-item si-customer-detail-item-full">
                      <span className="si-customer-detail-label">Pincode</span>
                      <span className="si-customer-detail-value">{selectedCustomerShippingPincode}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="si-section-card si-items-section">
          <div className="si-items-head">
            <h3>Items Entry</h3>
          </div>
          <div className="si-table-wrap">
            <table className="si-items-table">
            <thead>
              <tr>
                <th className="col-no">No</th>
                <th className="col-item">Item Name</th>
                <th className="col-hsn">HSN/SAC</th>
                <th className="col-qty">Quantity</th>
                <th className="col-unit">Unit</th>
                <th className="col-price">Price</th>
                <th className="col-disc">Discount %</th>
                <th className="col-tax">Tax %</th>
                <th className="col-amt">Amount</th>
                <th className="col-del"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="10" className="si-empty-row">
                    No items added. Click "+ Add Item" or "Add from Catalog" to begin.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="text-center">{index + 1}</td>
                    <td>
                      <div className="si-item-search">
                        <input
                          ref={(el) => {
                            itemInputRefs.current[`${item.id}-name`] = el;
                          }}
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            handleItemChange(item.id, 'name', e.target.value);
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
                            const options = getFilteredItemOptions(item.name);

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
                              options.length > 0 &&
                              highlightedItemOptionIndex >= 0
                            ) {
                              e.preventDefault();
                              selectItemOption(item.id, options[highlightedItemOptionIndex], item.name);
                              return;
                            }

                            handleItemKeyDown(e, index, 'name');
                          }}
                          placeholder="Enter item name"
                          autoComplete="off"
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        ref={(el) => {
                          itemInputRefs.current[`${item.id}-hsn`] = el;
                        }}
                        type="text"
                        value={item.hsn}
                        onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)}
                        onKeyDown={(e) => handleItemKeyDown(e, index, 'hsn')}
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
                          itemInputRefs.current[`${item.id}-qty`] = el;
                        }}
                        className="num-input"
                        type="number"
                        value={item.qty}
                        onChange={(e) => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => handleItemKeyDown(e, index, 'qty')}
                        min="0"
                      />
                            {currentStock !== null && (
                              <div className={`si-stock-info ${remainingStock < 0 ? 'si-stock-info-low' : ''}`}>
                                Stock: {currentStock} | Remaining: {remainingStock}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td>
                      <input
                        ref={(el) => {
                          itemInputRefs.current[`${item.id}-unit`] = el;
                        }}
                        type="text"
                        value={item.unit || 'PCS'}
                        onChange={(e) => handleItemChange(item.id, 'unit', e.target.value.toUpperCase())}
                        onKeyDown={(e) => handleItemKeyDown(e, index, 'unit')}
                        placeholder="PCS"
                      />
                    </td>
                    <td>
                      <input
                        ref={(el) => {
                          itemInputRefs.current[`${item.id}-price`] = el;
                        }}
                        className="num-input"
                        type="number"
                        value={item.price}
                        onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => handleItemKeyDown(e, index, 'price')}
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <input
                        ref={(el) => {
                          itemInputRefs.current[`${item.id}-discount`] = el;
                        }}
                        className="num-input"
                        type="number"
                        value={item.discount}
                        onChange={(e) => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => handleItemKeyDown(e, index, 'discount')}
                        min="0"
                        max="100"
                      />
                    </td>
                    <td>
                      <input
                        ref={(el) => {
                          itemInputRefs.current[`${item.id}-tax`] = el;
                        }}
                        className="num-input"
                        type="number"
                        value={item.tax}
                        onChange={(e) => handleItemChange(item.id, 'tax', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => handleItemKeyDown(e, index, 'tax')}
                        min="0"
                      />
                    </td>
                    <td className="text-right">
                      <strong className="si-amount-cell">{formatCurrency(item.amount)}</strong>
                    </td>
                    <td className="text-center">
                      <button
                        className="si-btn-delete"
                        onClick={() => handleRemoveItem(item.id)}
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          <div className="si-items-actions">
            <button className="si-btn si-btn-primary" onClick={handleAddEmptyItem}>+ Add Item</button>
            <button className="si-btn si-btn-outline" onClick={handleAddItem}>Add from Catalog</button>
          </div>
        </div>

        <div className="si-summary-grid">
          <div className="si-section-card si-notes-area">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes for customer..."
              rows="6"
            />
          </div>

          <div className="si-section-card si-totals-area">
            <div className="si-total-row">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="si-total-row">
              <span>Discount:</span>
              <span>-{formatCurrency(totalDiscount)}</span>
            </div>
            <div className="si-total-row">
              <span>Taxable Amount:</span>
              <span>{formatCurrency(taxableAmount)}</span>
            </div>
            <div className="si-total-row">
              <span>CGST:</span>
              <span>{formatCurrency(cgst)}</span>
            </div>
            <div className="si-total-row">
              <span>SGST:</span>
              <span>{formatCurrency(sgst)}</span>
            </div>
            <div className="si-total-row">
              <span>Tax:</span>
              <span>{formatCurrency(totalTax)}</span>
            </div>
            <div className="si-total-row">
              <span>Additional Charges:</span>
              <input
                type="number"
                value={additionalCharges}
                onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="si-charges-input"
              />
            </div>

            <div className="si-payment-wrap">
              <div className="si-total-row">
                <span>Payment Status:</span>
                <select
                  value={paymentStatus}
                  onChange={(e) => {
                    const status = e.target.value;
                    setPaymentStatus(status);
                    if (status === 'Paid') setReceivedAmount(grandTotal);
                    else if (status === 'Unpaid') setReceivedAmount(0);
                  }}
                  className="si-form-select"
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                  <option value="Partially Paid">Partially Paid</option>
                </select>
              </div>

              {(paymentStatus === 'Paid' || paymentStatus === 'Partially Paid') && (
                <>
                  <div className="si-total-row">
                    <span>Payment Mode:</span>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="si-form-select"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>

                  {paymentStatus === 'Partially Paid' && (
                    <div className="si-total-row">
                      <span>Received Amount:</span>
                      <input
                        type="number"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
                        min="0"
                        max={grandTotal}
                        className="si-charges-input"
                      />
                    </div>
                  )}

                  <div className="si-total-row si-balance-row">
                    <span>Balance Due:</span>
                    <span className="si-balance-value">
                      {formatCurrency(Math.max(0, grandTotal - (paymentStatus === 'Paid' ? grandTotal : receivedAmount)))}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="si-total-row si-grand-total">
              <span>Grand Total:</span>
              <strong>{formatCurrency(grandTotal)}</strong>
            </div>

            <div className="si-totals-actions">
              <div className="si-header-actions">
                <button className="si-btn si-btn-primary" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
                <button className="si-btn si-btn-success" onClick={handlePrint} disabled={isSaving}>{isSaving ? 'Processing...' : 'Save & Print'}</button>
                <button className="si-btn si-btn-neutral" onClick={handleClearInvoice} disabled={isSaving}>Clear Invoice</button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Hidden printable invoice (print-only) */}
      {showPrintView && (
        <div className="print-section" style={{ display: 'none' }}>
          <InvoicePrint
            invoice={printInvoiceMeta}
            billTo={printBillTo}
            items={printItems}
            summary={printSummary}
            printScale={printScale}
          />
        </div>
      )}

      {activeItemDropdownId !== null && activeItemOptions.length > 0 && itemDropdownPosition && (
        <div
          className="si-item-dropdown si-item-dropdown-floating"
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
              className={`si-item-option ${optionIndex === highlightedItemOptionIndex ? 'si-item-option-active' : ''}`}
              onMouseEnter={() => setHighlightedItemOptionIndex(optionIndex)}
              onMouseDown={() => {
                if (activeItem) {
                  selectItemOption(activeItem.id, catalogItem, activeItem.name);
                }
              }}
            >
              <strong>{catalogItem.name}</strong>
              <span>
                {catalogItem.code || 'NA'} | {catalogItem.unit || 'PCS'} | ₹{Number(catalogItem.salePrice ?? catalogItem.salesPrice ?? catalogItem.purchasePrice ?? 0).toFixed(2)} | Stock: {Number(catalogItem.stock ?? 0)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Item Selection Modal */}
      <ItemSelectionModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onAddItems={handleAddItemsFromModal}
      />
    </div>
  );
};

export default SalesInvoice;
