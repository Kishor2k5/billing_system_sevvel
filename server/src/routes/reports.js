import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

const REPORT_TYPES = [
  'Sales Report',
  'Purchase Report',
  'GST Summary Report',
  'HSN Summary Report',
  'Customer Ledger',
  'Supplier Ledger',
  'Inventory Report',
  'Outstanding Report',
  'Payment / Receipt Report',
];

const PAYMENT_STATUS_VALUES = ['Paid', 'Unpaid', 'Partial'];

const toStartOfDay = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const toEndOfDay = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
};

const inDateRange = (value, fromDate, toDate) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
};

const normalize = (value) => String(value ?? '').trim().toLowerCase();

const matchesText = (value, query) => {
  if (!query) return true;
  return normalize(value).includes(normalize(query));
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (value) => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

const deriveBillPaymentStatus = (bill) => {
  const total = toNumber(bill.grandTotal);
  const paid = toNumber(bill.paidAmount);
  const balance = bill.balanceAmount !== undefined ? toNumber(bill.balanceAmount) : Math.max(0, total - paid);
  if (balance <= 0) return 'Paid';
  if (paid > 0) return 'Partial';
  return 'Unpaid';
};

const buildBillRow = (bill) => {
  const total = toNumber(bill.grandTotal);
  const paid = toNumber(bill.paidAmount);
  const balance = bill.balanceAmount !== undefined ? toNumber(bill.balanceAmount) : Math.max(0, total - paid);
  const paymentStatus = deriveBillPaymentStatus(bill);

  return {
    id: bill._id?.toString() || bill.invoiceNumber,
    date: bill.invoiceDate,
    invoiceNumber: bill.invoiceNumber,
    partyName: bill.customer?.name || 'Cash Customer',
    partyType: 'Customer',
    itemNames: (bill.items || []).map((item) => item.name).filter(Boolean),
    gstRates: (bill.items || []).map((item) => toNumber(item.tax)).filter((rate) => rate > 0),
    taxableValue: toNumber(bill.taxableAmount),
    totalTax: toNumber(bill.totalTax),
    totalAmount: total,
    paidAmount: paid,
    balanceAmount: balance,
    paymentStatus,
    source: 'Sales',
  };
};

const buildPurchaseRow = (invoice) => {
  const total = toNumber(invoice.totalAmount);
  const status = ['Paid', 'Unpaid', 'Partial'].includes(invoice.status) ? invoice.status : 'Unpaid';

  return {
    id: invoice._id?.toString() || invoice.invoiceNumber,
    date: invoice.invoiceDate,
    invoiceNumber: invoice.invoiceNumber,
    partyName: invoice.partyName,
    partyType: 'Supplier',
    itemNames: (invoice.items || []).map((item) => item.itemName).filter(Boolean),
    gstRates: (invoice.items || [])
      .map((item) => toNumber(item.tax ?? item.gstRate))
      .filter((rate) => rate > 0),
    taxableValue: total,
    totalTax: toNumber(invoice.totalTax),
    totalAmount: total,
    paidAmount: status === 'Paid' ? total : 0,
    balanceAmount: status === 'Paid' ? 0 : total,
    paymentStatus: status,
    source: 'Purchase',
  };
};

const applyCommonFilters = (rows, filters) => {
  const {
    fromDate,
    toDate,
    customerSupplier,
    item,
    gstRate,
    paymentStatus,
  } = filters;

  return rows.filter((row) => {
    if (!inDateRange(row.date, fromDate, toDate)) return false;
    if (customerSupplier && !matchesText(row.partyName, customerSupplier)) return false;

    if (item) {
      const hasItem = (row.itemNames || []).some((name) => matchesText(name, item));
      if (!hasItem) return false;
    }

    if (gstRate) {
      const rateValue = toNumber(gstRate);
      const hasRate = (row.gstRates || []).some((rate) => toNumber(rate) === rateValue);
      if (!hasRate) return false;
    }

    if (paymentStatus) {
      if (normalize(row.paymentStatus) !== normalize(paymentStatus)) return false;
    }

    return true;
  });
};

const buildSalesReport = (salesRows) => {
  const records = salesRows.map((row) => ({
    date: row.date,
    invoiceNumber: row.invoiceNumber,
    customer: row.partyName,
    items: row.itemNames.join(', '),
    taxableValue: round2(row.taxableValue),
    gstAmount: round2(row.totalTax),
    totalAmount: round2(row.totalAmount),
    paidAmount: round2(row.paidAmount),
    balanceAmount: round2(row.balanceAmount),
    paymentStatus: row.paymentStatus,
  }));

  const summary = {
    totalInvoices: records.length,
    totalAmount: round2(records.reduce((sum, r) => sum + r.totalAmount, 0)),
    totalPaid: round2(records.reduce((sum, r) => sum + r.paidAmount, 0)),
    totalOutstanding: round2(records.reduce((sum, r) => sum + r.balanceAmount, 0)),
  };

  return { records, summary };
};

const buildPurchaseReport = (purchaseRows) => {
  const records = purchaseRows.map((row) => ({
    date: row.date,
    invoiceNumber: row.invoiceNumber,
    supplier: row.partyName,
    items: row.itemNames.join(', '),
    taxableValue: round2(row.taxableValue),
    gstAmount: round2(row.totalTax),
    totalAmount: round2(row.totalAmount),
    paymentStatus: row.paymentStatus,
  }));

  const summary = {
    totalInvoices: records.length,
    totalAmount: round2(records.reduce((sum, r) => sum + r.totalAmount, 0)),
    paidAmount: round2(
      purchaseRows.filter((r) => r.paymentStatus === 'Paid').reduce((sum, r) => sum + r.totalAmount, 0)
    ),
    unpaidAmount: round2(
      purchaseRows.filter((r) => r.paymentStatus !== 'Paid').reduce((sum, r) => sum + r.totalAmount, 0)
    ),
  };

  return { records, summary };
};

const buildGstSummary = (salesRows, purchaseRows) => {
  const map = new Map();

  const pushRow = (row, bucket) => {
    const rates = row.gstRates && row.gstRates.length > 0 ? row.gstRates : [0];
    rates.forEach((rate) => {
      const key = String(rate);
      if (!map.has(key)) {
        map.set(key, {
          gstRate: rate,
          taxableSales: 0,
          gstOnSales: 0,
          taxablePurchases: 0,
          gstOnPurchases: 0,
        });
      }

      const entry = map.get(key);
      if (bucket === 'sales') {
        entry.taxableSales += toNumber(row.taxableValue);
        entry.gstOnSales += toNumber(row.totalTax);
      } else {
        entry.taxablePurchases += toNumber(row.taxableValue);
        entry.gstOnPurchases += toNumber(row.totalTax);
      }
    });
  };

  salesRows.forEach((row) => pushRow(row, 'sales'));
  purchaseRows.forEach((row) => pushRow(row, 'purchase'));

  const records = Array.from(map.values())
    .map((entry) => ({
      gstRate: entry.gstRate,
      taxableSales: round2(entry.taxableSales),
      gstOnSales: round2(entry.gstOnSales),
      taxablePurchases: round2(entry.taxablePurchases),
      gstOnPurchases: round2(entry.gstOnPurchases),
      netGstPayable: round2(entry.gstOnSales - entry.gstOnPurchases),
    }))
    .sort((a, b) => a.gstRate - b.gstRate);

  const summary = {
    outputGst: round2(records.reduce((sum, row) => sum + row.gstOnSales, 0)),
    inputGst: round2(records.reduce((sum, row) => sum + row.gstOnPurchases, 0)),
    netPayable: round2(records.reduce((sum, row) => sum + row.netGstPayable, 0)),
  };

  return { records, summary };
};

const buildHsnSummary = (bills, purchases, filters) => {
  const { fromDate, toDate, customerSupplier, item, gstRate, paymentStatus } = filters;
  const hsnMap = new Map();

  bills.forEach((bill) => {
    const row = buildBillRow(bill);
    if (!inDateRange(row.date, fromDate, toDate)) return;
    if (customerSupplier && !matchesText(row.partyName, customerSupplier)) return;
    if (paymentStatus && normalize(row.paymentStatus) !== normalize(paymentStatus)) return;

    (bill.items || []).forEach((line) => {
      if (item && !matchesText(line.name, item)) return;
      const rate = toNumber(line.tax);
      if (gstRate && rate !== toNumber(gstRate)) return;

      const hsn = String(line.hsn || 'N/A').trim() || 'N/A';
      const taxableValue = toNumber(line.amount || (toNumber(line.quantity) * toNumber(line.price)));
      const gstAmount = round2((taxableValue * rate) / 100);

      if (!hsnMap.has(hsn)) {
        hsnMap.set(hsn, {
          hsn,
          totalQuantity: 0,
          taxableValue: 0,
          gstAmount: 0,
          source: 'Sales + Purchase',
        });
      }

      const entry = hsnMap.get(hsn);
      entry.totalQuantity += toNumber(line.quantity);
      entry.taxableValue += taxableValue;
      entry.gstAmount += gstAmount;
    });
  });

  purchases.forEach((invoice) => {
    const row = buildPurchaseRow(invoice);
    if (!inDateRange(row.date, fromDate, toDate)) return;
    if (customerSupplier && !matchesText(row.partyName, customerSupplier)) return;
    if (paymentStatus && normalize(row.paymentStatus) !== normalize(paymentStatus)) return;

    (invoice.items || []).forEach((line) => {
      if (item && !matchesText(line.itemName, item)) return;
      const rate = toNumber(line.tax ?? line.gstRate);
      if (gstRate && rate !== toNumber(gstRate)) return;

      const hsn = String(line.hsnCode || line.hsn || 'N/A').trim() || 'N/A';
      const taxableValue = toNumber(line.amount || (toNumber(line.quantity) * toNumber(line.price)));
      const gstAmount = round2((taxableValue * rate) / 100);

      if (!hsnMap.has(hsn)) {
        hsnMap.set(hsn, {
          hsn,
          totalQuantity: 0,
          taxableValue: 0,
          gstAmount: 0,
          source: 'Sales + Purchase',
        });
      }

      const entry = hsnMap.get(hsn);
      entry.totalQuantity += toNumber(line.quantity);
      entry.taxableValue += taxableValue;
      entry.gstAmount += gstAmount;
    });
  });

  const records = Array.from(hsnMap.values())
    .map((entry) => ({
      hsn: entry.hsn,
      totalQuantity: round2(entry.totalQuantity),
      taxableValue: round2(entry.taxableValue),
      gstAmount: round2(entry.gstAmount),
      source: entry.source,
    }))
    .sort((a, b) => String(a.hsn).localeCompare(String(b.hsn)));

  const summary = {
    totalHsnCodes: records.length,
    taxableValue: round2(records.reduce((sum, row) => sum + row.taxableValue, 0)),
    gstAmount: round2(records.reduce((sum, row) => sum + row.gstAmount, 0)),
  };

  return { records, summary };
};

const buildCustomerLedger = (salesRows) => {
  const records = salesRows.map((row) => ({
    date: row.date,
    customer: row.partyName,
    reference: row.invoiceNumber,
    debit: round2(row.totalAmount),
    credit: round2(row.paidAmount),
    balance: round2(row.balanceAmount),
    paymentStatus: row.paymentStatus,
  }));

  const summary = {
    totalEntries: records.length,
    totalDebit: round2(records.reduce((sum, row) => sum + row.debit, 0)),
    totalCredit: round2(records.reduce((sum, row) => sum + row.credit, 0)),
    closingBalance: round2(records.reduce((sum, row) => sum + row.balance, 0)),
  };

  return { records, summary };
};

const buildSupplierLedger = (purchaseRows) => {
  const records = purchaseRows.map((row) => ({
    date: row.date,
    supplier: row.partyName,
    reference: row.invoiceNumber,
    debit: round2(row.totalAmount),
    credit: round2(row.paidAmount),
    balance: round2(row.balanceAmount),
    paymentStatus: row.paymentStatus,
  }));

  const summary = {
    totalEntries: records.length,
    totalDebit: round2(records.reduce((sum, row) => sum + row.debit, 0)),
    totalCredit: round2(records.reduce((sum, row) => sum + row.credit, 0)),
    closingBalance: round2(records.reduce((sum, row) => sum + row.balance, 0)),
  };

  return { records, summary };
};

const buildInventoryReport = (items, filters) => {
  const { fromDate, toDate, item } = filters;

  const records = items
    .filter((entry) => {
      const date = entry.updatedAt || entry.createdAt;
      if (fromDate || toDate) {
        if (!inDateRange(date, fromDate, toDate)) return false;
      }
      if (item && !matchesText(entry.name, item)) return false;
      return true;
    })
    .map((entry) => ({
      itemName: entry.name,
      itemCode: entry.code || '',
      hsn: entry.hsnSac || '',
      category: entry.category || '',
      stockQty: toNumber(entry.stock),
      purchasePrice: round2(entry.purchasePrice),
      salePrice: round2(entry.salePrice),
      stockValue: round2(toNumber(entry.stock) * toNumber(entry.purchasePrice)),
      lastUpdated: entry.updatedAt || entry.createdAt,
    }));

  const summary = {
    totalItems: records.length,
    totalStockQty: round2(records.reduce((sum, row) => sum + row.stockQty, 0)),
    totalStockValue: round2(records.reduce((sum, row) => sum + row.stockValue, 0)),
  };

  return { records, summary };
};

const buildOutstandingReport = (buyers, sellers, filters) => {
  const { customerSupplier, paymentStatus } = filters;

  const buyerRows = buyers.map((buyer) => ({
    partyName: buyer.name,
    partyType: 'Customer',
    openingBalance: round2(buyer.openingBalance),
    outstandingAmount: round2(buyer.balance),
    paymentStatus: toNumber(buyer.balance) > 0 ? 'Unpaid' : 'Paid',
  }));

  const sellerRows = sellers.map((seller) => ({
    partyName: seller.name,
    partyType: 'Supplier',
    openingBalance: round2(seller.openingBalance),
    outstandingAmount: round2(seller.balance),
    paymentStatus: toNumber(seller.balance) > 0 ? 'Unpaid' : 'Paid',
  }));

  const records = [...buyerRows, ...sellerRows].filter((row) => {
    if (customerSupplier && !matchesText(row.partyName, customerSupplier)) return false;
    if (paymentStatus && normalize(row.paymentStatus) !== normalize(paymentStatus)) return false;
    return true;
  });

  const summary = {
    totalParties: records.length,
    customerOutstanding: round2(
      records
        .filter((row) => row.partyType === 'Customer')
        .reduce((sum, row) => sum + toNumber(row.outstandingAmount), 0)
    ),
    supplierOutstanding: round2(
      records
        .filter((row) => row.partyType === 'Supplier')
        .reduce((sum, row) => sum + toNumber(row.outstandingAmount), 0)
    ),
  };

  return { records, summary };
};

const buildPaymentReceiptReport = (salesRows, purchaseRows, filters) => {
  const { fromDate, toDate, customerSupplier, paymentStatus } = filters;

  const receiptRows = salesRows
    .filter((row) => toNumber(row.paidAmount) > 0)
    .map((row) => ({
      date: row.date,
      transactionType: 'Receipt',
      partyName: row.partyName,
      reference: row.invoiceNumber,
      amount: round2(row.paidAmount),
      paymentStatus: row.paymentStatus,
    }));

  const paymentRows = purchaseRows
    .filter((row) => row.paymentStatus === 'Paid' || row.paymentStatus === 'Partial')
    .map((row) => ({
      date: row.date,
      transactionType: 'Payment',
      partyName: row.partyName,
      reference: row.invoiceNumber,
      amount: round2(row.paidAmount || row.totalAmount),
      paymentStatus: row.paymentStatus,
    }));

  const records = [...receiptRows, ...paymentRows]
    .filter((row) => {
      if (!inDateRange(row.date, fromDate, toDate)) return false;
      if (customerSupplier && !matchesText(row.partyName, customerSupplier)) return false;
      if (paymentStatus && normalize(row.paymentStatus) !== normalize(paymentStatus)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const summary = {
    totalTransactions: records.length,
    totalReceipts: round2(
      records.filter((row) => row.transactionType === 'Receipt').reduce((sum, row) => sum + row.amount, 0)
    ),
    totalPayments: round2(
      records.filter((row) => row.transactionType === 'Payment').reduce((sum, row) => sum + row.amount, 0)
    ),
  };

  return { records, summary };
};

const loadSourceData = async () => {
  const Bill = mongoose.model('Bill');
  const PurchaseInvoice = mongoose.model('PurchaseInvoice');
  const Buyer = mongoose.model('Buyer');
  const Seller = mongoose.model('Seller');
  const Item = mongoose.model('Item');

  const [bills, purchases, buyers, sellers, items] = await Promise.all([
    Bill.find().lean(),
    PurchaseInvoice.find().lean(),
    Buyer.find().lean(),
    Seller.find().lean(),
    Item.find({ isDeleted: { $ne: true } }).lean(),
  ]);

  return { bills, purchases, buyers, sellers, items };
};

router.get('/options', async (_req, res) => {
  try {
    const { bills, purchases, buyers, sellers, items } = await loadSourceData();

    const parties = [
      ...buyers.map((buyer) => ({ name: buyer.name, type: 'Customer' })),
      ...sellers.map((seller) => ({ name: seller.name, type: 'Supplier' })),
    ]
      .filter((entry) => entry.name)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    const itemSet = new Set(items.map((entry) => entry.name).filter(Boolean));
    bills.forEach((bill) => {
      (bill.items || []).forEach((line) => {
        if (line.name) itemSet.add(line.name);
      });
    });
    purchases.forEach((invoice) => {
      (invoice.items || []).forEach((line) => {
        if (line.itemName) itemSet.add(line.itemName);
      });
    });

    const gstRateSet = new Set();
    bills.forEach((bill) => {
      (bill.items || []).forEach((line) => {
        const rate = toNumber(line.tax);
        if (rate > 0) gstRateSet.add(rate);
      });
    });
    purchases.forEach((invoice) => {
      (invoice.items || []).forEach((line) => {
        const rate = toNumber(line.tax ?? line.gstRate);
        if (rate > 0) gstRateSet.add(rate);
      });
    });

    return res.json({
      success: true,
      reportTypes: REPORT_TYPES,
      paymentStatuses: PAYMENT_STATUS_VALUES,
      parties,
      items: Array.from(itemSet).sort((a, b) => String(a).localeCompare(String(b))),
      gstRates: Array.from(gstRateSet).sort((a, b) => a - b),
    });
  } catch (error) {
    console.error('Error loading report filter options', error);
    return res.status(500).json({ success: false, message: 'Unable to load report options' });
  }
});

router.get('/data', async (req, res) => {
  try {
    const {
      reportName = 'Sales Report',
      fromDate,
      toDate,
      customerSupplier,
      item,
      gstRate,
      paymentStatus,
    } = req.query;

    if (!REPORT_TYPES.includes(reportName)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reportName',
        allowed: REPORT_TYPES,
      });
    }

    const parsedFilters = {
      fromDate: toStartOfDay(fromDate),
      toDate: toEndOfDay(toDate),
      customerSupplier: customerSupplier || '',
      item: item || '',
      gstRate: gstRate || '',
      paymentStatus: paymentStatus || '',
    };

    const { bills, purchases, buyers, sellers, items } = await loadSourceData();

    const salesRows = applyCommonFilters(bills.map(buildBillRow), parsedFilters);
    const purchaseRows = applyCommonFilters(purchases.map(buildPurchaseRow), parsedFilters);

    let report = { records: [], summary: {} };

    switch (reportName) {
      case 'Sales Report':
        report = buildSalesReport(salesRows);
        break;
      case 'Purchase Report':
        report = buildPurchaseReport(purchaseRows);
        break;
      case 'GST Summary Report':
        report = buildGstSummary(salesRows, purchaseRows);
        break;
      case 'HSN Summary Report':
        report = buildHsnSummary(bills, purchases, parsedFilters);
        break;
      case 'Customer Ledger':
        report = buildCustomerLedger(salesRows);
        break;
      case 'Supplier Ledger':
        report = buildSupplierLedger(purchaseRows);
        break;
      case 'Inventory Report':
        report = buildInventoryReport(items, parsedFilters);
        break;
      case 'Outstanding Report':
        report = buildOutstandingReport(buyers, sellers, parsedFilters);
        break;
      case 'Payment / Receipt Report':
        report = buildPaymentReceiptReport(salesRows, purchaseRows, parsedFilters);
        break;
      default:
        report = { records: [], summary: {} };
    }

    return res.json({
      success: true,
      reportName,
      filters: {
        fromDate: fromDate || '',
        toDate: toDate || '',
        customerSupplier: customerSupplier || '',
        item: item || '',
        gstRate: gstRate || '',
        paymentStatus: paymentStatus || '',
      },
      ...report,
    });
  } catch (error) {
    console.error('Error generating report data', error);
    return res.status(500).json({ success: false, message: 'Error generating report data', error: error.message });
  }
});

// Backward-compatible endpoint used by the older UI.
router.get('/gst', async (req, res) => {
  try {
    const parsedFilters = {
      fromDate: toStartOfDay(req.query.fromDate),
      toDate: toEndOfDay(req.query.toDate),
      customerSupplier: req.query.partyName || '',
      item: req.query.item || '',
      gstRate: req.query.gstRate || '',
      paymentStatus: req.query.paymentStatus || '',
    };

    const { bills, purchases } = await loadSourceData();
    const salesRows = applyCommonFilters(bills.map(buildBillRow), parsedFilters);
    const purchaseRows = applyCommonFilters(purchases.map(buildPurchaseRow), parsedFilters);
    const gstSummary = buildGstSummary(salesRows, purchaseRows);

    const records = (gstSummary.records || []).map((row) => ({
      date: new Date(),
      invoiceNumber: '-',
      partyName: '-',
      gstin: '-',
      hsn: '-',
      taxableValue: row.taxableSales || 0,
      gstRate: row.gstRate,
      cgst: 0,
      sgst: 0,
      igst: row.gstOnSales || 0,
      totalGST: row.netGstPayable || 0,
      source: 'Summary',
      itcEligible: false,
      supplyType: 'Summary',
    }));

    return res.json({
      success: true,
      reportType: req.query.reportType || 'Combined',
      records,
      summary: {
        totalTaxableSales: gstSummary.summary?.outputGst || 0,
        totalGSTOnSales: gstSummary.summary?.outputGst || 0,
        totalTaxablePurchases: gstSummary.summary?.inputGst || 0,
        itcAvailable: gstSummary.summary?.inputGst || 0,
        itcUtilized: gstSummary.summary?.inputGst || 0,
        netGSTPayable: gstSummary.summary?.netPayable || 0,
      },
    });
  } catch (error) {
    console.error('Error generating legacy GST report:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating GST report',
      error: error.message,
    });
  }
});

export default router;
