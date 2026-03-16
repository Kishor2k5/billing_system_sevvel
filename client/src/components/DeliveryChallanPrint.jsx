import { useMemo } from 'react';
import './DeliveryChallanPrint.css';
import logo from '../image/logo.png';

const DeliveryChallanPrint = ({ challan, customer, items, totalQuantity, remarks }) => {
  const companySettings = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('appSettings') || '{}');
      return {
        companyName: stored.companyName || 'SEVVEL GARMENTS',
        companyAddress: stored.companyAddress || '',
        companyPhone: stored.companyPhone || '',
        companyEmail: stored.companyEmail || '',
        taxId: stored.taxId || '',
      };
    } catch (e) {
      return {
        companyName: 'SEVVEL GARMENTS',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        taxId: '',
      };
    }
  }, []);

  return (
    <div className="dc-print-wrapper">
      <div className="dc-print-container">
        {/* Header */}
        <div className="dc-header">
          <div className="dc-header-left">
            <img src={logo} alt="Company Logo" className="dc-logo" />
          </div>
          <div className="dc-header-right">
            <h1 className="dc-company-name">{companySettings.companyName}</h1>
            {companySettings.companyAddress && <p className="dc-company-info">{companySettings.companyAddress}</p>}
            {companySettings.companyPhone && <p className="dc-company-info">Phone: {companySettings.companyPhone}</p>}
            {companySettings.companyEmail && <p className="dc-company-info">Email: {companySettings.companyEmail}</p>}
            {companySettings.taxId && <p className="dc-company-info">GSTIN: {companySettings.taxId}</p>}
          </div>
        </div>

        {/* Document Title */}
        <div className="dc-title-section">
          <h2>DELIVERY CHALLAN</h2>
        </div>

        {/* Challan Details */}
        <div className="dc-info-grid">
          <div className="dc-info-item">
            <span className="dc-label">Challan No:</span>
            <span className="dc-value">{challan.challanNumber}</span>
          </div>
          <div className="dc-info-item">
            <span className="dc-label">Date:</span>
            <span className="dc-value">{new Date(challan.challanDate).toLocaleDateString('en-IN')}</span>
          </div>
          {challan.vehicleNumber && (
            <div className="dc-info-item">
              <span className="dc-label">Vehicle No:</span>
              <span className="dc-value">{challan.vehicleNumber}</span>
            </div>
          )}
          {challan.driverName && (
            <div className="dc-info-item">
              <span className="dc-label">Driver Name:</span>
              <span className="dc-value">{challan.driverName}</span>
            </div>
          )}
        </div>

        {/* Customer Details */}
        <div className="dc-customer-section">
          <div className="dc-customer-box">
            <h3>Customer Details</h3>
            <p className="dc-customer-name">{customer.name}</p>
            {customer.phone && <p>Phone: {customer.phone}</p>}
            {customer.billingAddress && (
              <p className="dc-address">{customer.billingAddress}</p>
            )}
          </div>
          {customer.deliveryAddress && customer.deliveryAddress !== customer.billingAddress && (
            <div className="dc-customer-box">
              <h3>Delivery Address</h3>
              <p className="dc-address">{customer.deliveryAddress}</p>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="dc-items-section">
          <table className="dc-items-table">
            <thead>
              <tr>
                <th style={{ width: '8%' }}>S.No</th>
                <th style={{ width: '42%' }}>Item Description</th>
                <th style={{ width: '20%' }}>HSN Code</th>
                <th style={{ width: '15%' }}>Quantity</th>
                <th style={{ width: '15%' }}>Unit</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="dc-center">{index + 1}</td>
                  <td>{item.itemName}</td>
                  <td className="dc-center">{item.hsnCode}</td>
                  <td className="dc-right">{item.quantity}</td>
                  <td className="dc-center">{item.unit}</td>
                </tr>
              ))}
              {/* Empty rows for spacing */}
              {items.length < 10 && Array.from({ length: 10 - items.length }).map((_, index) => (
                <tr key={`empty-${index}`} className="dc-empty-row">
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="dc-total-row">
                <td colSpan="3" className="dc-right"><strong>Total Quantity:</strong></td>
                <td className="dc-right"><strong>{totalQuantity}</strong></td>
                <td>&nbsp;</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Remarks */}
        {remarks && (
          <div className="dc-remarks-section">
            <h4>Remarks:</h4>
            <p>{remarks}</p>
          </div>
        )}

        {/* Terms */}
        <div className="dc-terms-section">
          <h4>Terms & Conditions:</h4>
          <ol>
            <li>Goods once delivered are not returnable.</li>
            <li>Please check the goods at the time of delivery.</li>
            <li>Any discrepancy should be reported within 24 hours.</li>
            <li>This is a computer-generated delivery challan.</li>
          </ol>
        </div>

        {/* Signature Section */}
        <div className="dc-signature-section">
          <div className="dc-signature-box">
            <p className="dc-signature-label">Received By</p>
            <div className="dc-signature-line"></div>
            <p className="dc-signature-text">Customer Signature</p>
          </div>
          <div className="dc-signature-box">
            <p className="dc-signature-label">Delivered By</p>
            <div className="dc-signature-line"></div>
            <p className="dc-signature-text">Authorized Signatory</p>
          </div>
        </div>

        {/* Footer */}
        <div className="dc-footer">
          <p>Thank you for your business!</p>
          <p className="dc-footer-note">This is a system-generated delivery challan and does not require a signature.</p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryChallanPrint;
