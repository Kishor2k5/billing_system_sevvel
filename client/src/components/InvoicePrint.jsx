import React from 'react';
import logo from '../image/logo.png';
import './InvoicePrint.css';

const getStoredSettings = () => {
  try {
    return JSON.parse(localStorage.getItem('appSettings') || '{}');
  } catch (e) {
    return {};
  }
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toLines = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((entry) => String(entry));
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const formatCurrency = (value) => {
  const amount = toNumber(value);
  return `Rs. ${amount.toFixed(2)}`;
};

const InvoicePrint = ({
  invoice = {},
  customer = {},
  items = [],
  bankDetails = {},
  taxDetails = {},
  company = {},
  billTo = {},
  shipTo = {},
  summary = {},
  printScale
}) => {
  const appSettings = getStoredSettings();

  const companyData = {
    name: appSettings.companyName || 'SEVVEL GARMENTS',
    address: appSettings.companyAddress || '',
    mobile: appSettings.companyPhone || '',
    gstin: appSettings.taxId || '',
    pan: appSettings.pan || '',
    ...company
  };

  const invoiceData = {
    invoiceNo: invoice.invoiceNo || invoice.invoiceNumber || '-',
    invoiceDate: invoice.invoiceDate || '-',
    dueDate: invoice.dueDate || '-',
    placeOfSupply: invoice.placeOfSupply || customer.placeOfSupply || billTo.placeOfSupply || '-'
  };

  const primaryCustomer = {
    name: customer.name || billTo.name || '-',
    address: toLines(customer.address || billTo.address || billTo.addressLine),
    gstin: customer.gstin || customer.gstNumber || billTo.gstin || billTo.gstNumber || '-',
    pan: customer.pan || billTo.pan || '-',
    placeOfSupply: customer.placeOfSupply || billTo.placeOfSupply || invoiceData.placeOfSupply || '-'
  };

  const shippingCustomer = {
    name: shipTo.name || customer.shipName || primaryCustomer.name,
    address: toLines(shipTo.address || customer.shipAddress || customer.address || billTo.address || billTo.addressLine),
    gstin: shipTo.gstin || shipTo.gstNumber || customer.shipGstin || primaryCustomer.gstin,
    pan: shipTo.pan || customer.shipPan || primaryCustomer.pan,
    placeOfSupply: shipTo.placeOfSupply || customer.shipPlaceOfSupply || primaryCustomer.placeOfSupply
  };

  const normalizedItems = (items || []).map((item) => {
    const qty = toNumber(item.qty ?? item.quantity);
    const rate = toNumber(item.rate ?? item.price);
    const taxable = toNumber(item.taxableAmount ?? qty * rate);
    const taxPercent = toNumber(item.taxPercent ?? item.tax);
    const taxAmount = toNumber(item.taxAmount ?? (taxable * taxPercent) / 100);
    const amount = toNumber(item.lineTotal ?? item.amount ?? taxable + taxAmount);

    return {
      name: item.description || item.name || '-',
      qty,
      rate,
      taxAmount,
      taxPercent,
      amount
    };
  });

  const subtotalQty = normalizedItems.reduce((sum, item) => sum + item.qty, 0);
  const subtotalAmount = normalizedItems.reduce((sum, item) => sum + item.amount, 0);

  const mergedTaxDetails = {
    taxableAmount: toNumber(
      taxDetails.taxableAmount ??
      summary.taxableAmount ??
      summary.subtotalTaxable ??
      subtotalAmount
    ),
    cgst: toNumber(taxDetails.cgst ?? summary.cgst ?? (summary.totalTax || summary.subtotalTax || 0) / 2),
    sgst: toNumber(taxDetails.sgst ?? summary.sgst ?? (summary.totalTax || summary.subtotalTax || 0) / 2),
    totalAmount: toNumber(
      taxDetails.totalAmount ??
      taxDetails.grandTotal ??
      summary.totalAmount ??
      summary.grandTotal ??
      subtotalAmount
    ),
    receivedAmount: toNumber(taxDetails.receivedAmount ?? summary.receivedAmount ?? 0),
    amountInWords:
      taxDetails.amountInWords || summary.amountInWords || 'Zero Rupees Only'
  };

  const bankData = {
    name: bankDetails.name || bankDetails.accountName || appSettings.accountHolderName || appSettings.companyName || '-',
    ifscCode: bankDetails.ifscCode || bankDetails.ifsc || appSettings.ifscCode || '-',
    accountNo: bankDetails.accountNo || bankDetails.accountNumber || appSettings.accountNumber || '-',
    bank: bankDetails.bank || bankDetails.bankName || appSettings.bankName || '-'
  };

  return (
    <div className="ip-wrapper">
      <div
        className="ip-sheet"
        style={typeof printScale === 'number' ? { transform: `scale(${printScale})`, transformOrigin: 'top left' } : undefined}
      >
        <div className="ip-header">
          <div className="ip-header-left">
            <img src={logo} alt="Logo" className="ip-logo" />
            <div className="ip-company-block">
              <div className="ip-company-name">{companyData.name}</div>
              <div className="ip-company-address">{companyData.address}</div>
              <div className="ip-company-meta">
                Mobile: {companyData.mobile} | GSTIN: {companyData.gstin} | PAN: {companyData.pan}
              </div>
            </div>
          </div>
        </div>

        <div className="ip-green-divider" />

        <div className="ip-title">TAX INVOICE</div>

        <div className="ip-meta-row">
          <div className="ip-meta-cell">
            <span className="ip-meta-label">Invoice No</span>
            <span className="ip-meta-value">{invoiceData.invoiceNo}</span>
          </div>
          <div className="ip-meta-cell">
            <span className="ip-meta-label">Invoice Date</span>
            <span className="ip-meta-value">{invoiceData.invoiceDate}</span>
          </div>
          <div className="ip-meta-cell">
            <span className="ip-meta-label">Due Date</span>
            <span className="ip-meta-value">{invoiceData.dueDate}</span>
          </div>
        </div>

        <div className="ip-party-grid">
          <div className="ip-party-card">
            <div className="ip-party-title">BILL TO</div>
            <div className="ip-party-name">{primaryCustomer.name}</div>
            {primaryCustomer.address.map((line, index) => (
              <div className="ip-party-line" key={`bill-line-${index}`}>{line}</div>
            ))}
            <div className="ip-party-line">GSTIN: {primaryCustomer.gstin}</div>
            <div className="ip-party-line">PAN: {primaryCustomer.pan}</div>
            <div className="ip-party-line">Place of Supply: {primaryCustomer.placeOfSupply}</div>
          </div>

          <div className="ip-party-card">
            <div className="ip-party-title">SHIP TO</div>
            <div className="ip-party-name">{shippingCustomer.name}</div>
            {shippingCustomer.address.map((line, index) => (
              <div className="ip-party-line" key={`ship-line-${index}`}>{line}</div>
            ))}
            <div className="ip-party-line">GSTIN: {shippingCustomer.gstin}</div>
            <div className="ip-party-line">PAN: {shippingCustomer.pan}</div>
            <div className="ip-party-line">Place of Supply: {shippingCustomer.placeOfSupply}</div>
          </div>
        </div>

        <table className="ip-items-table">
          <thead>
            <tr>
              <th className="ip-col-item">ITEMS</th>
              <th className="ip-col-qty">QTY.</th>
              <th className="ip-col-rate">RATE</th>
              <th className="ip-col-tax">TAX</th>
              <th className="ip-col-amount">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {normalizedItems.length > 0 ? (
              normalizedItems.map((item, index) => (
                <tr key={`item-${index}`}>
                  <td className="ip-cell-item">{item.name}</td>
                  <td className="ip-cell-center">{item.qty}</td>
                  <td className="ip-cell-right">{formatCurrency(item.rate)}</td>
                  <td className="ip-cell-right">
                    <div>{formatCurrency(item.taxAmount)}</div>
                    <div className="ip-tax-percent">({item.taxPercent}%)</div>
                  </td>
                  <td className="ip-cell-right">{formatCurrency(item.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="ip-empty" colSpan="5">No items added</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="ip-subtotal-row">
              <td className="ip-cell-item">Subtotal</td>
              <td className="ip-cell-center">{subtotalQty}</td>
              <td></td>
              <td></td>
              <td className="ip-cell-right">{formatCurrency(subtotalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="ip-bottom-grid">
          <div className="ip-bank-box">
            <div className="ip-section-title">BANK DETAILS</div>
            <div className="ip-bank-row"><span>Name:</span> <span>{bankData.name}</span></div>
            <div className="ip-bank-row"><span>IFSC Code:</span> <span>{bankData.ifscCode}</span></div>
            <div className="ip-bank-row"><span>Account No:</span> <span>{bankData.accountNo}</span></div>
            <div className="ip-bank-row"><span>Bank:</span> <span>{bankData.bank}</span></div>
          </div>

          <div className="ip-tax-box">
            <div className="ip-tax-row"><span>Taxable Amount</span><span>{formatCurrency(mergedTaxDetails.taxableAmount)}</span></div>
            <div className="ip-tax-row"><span>CGST</span><span>{formatCurrency(mergedTaxDetails.cgst)}</span></div>
            <div className="ip-tax-row"><span>SGST</span><span>{formatCurrency(mergedTaxDetails.sgst)}</span></div>
            <div className="ip-tax-row ip-total-row"><span>Total Amount</span><span>{formatCurrency(mergedTaxDetails.totalAmount)}</span></div>
            <div className="ip-tax-row"><span>Received Amount</span><span>{formatCurrency(mergedTaxDetails.receivedAmount)}</span></div>
            <div className="ip-words-block">
              <div className="ip-words-title">Amount in words</div>
              <div>{mergedTaxDetails.amountInWords}</div>
            </div>
          </div>
        </div>

        <div className="ip-signature-wrap">
          <div className="ip-signature-box" />
          <div className="ip-signature-text">AUTHORISED SIGNATORY FOR {companyData.name}</div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrint;
