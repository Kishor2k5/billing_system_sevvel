import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import reportsRouter from './routes/reports.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const { MONGODB_URI, MONGODB_DB_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, PORT = 5000 } = process.env;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI environment variable');
  process.exit(1);
}

if (!MONGODB_DB_NAME) {
  console.error('Missing MONGODB_DB_NAME environment variable');
  process.exit(1);
}

if (!ADMIN_EMAIL) {
  console.error('Missing ADMIN_EMAIL environment variable');
  process.exit(1);
}

if (!ADMIN_PASSWORD) {
  console.error('Missing ADMIN_PASSWORD environment variable');
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ================== BUYER & SELLER SCHEMAS ==================

// Common schema configuration for both Buyer and Seller
const partyCommonFields = {
  partyId: {
    type: String,
    required: true,
    unique: true,
    default: () => new mongoose.Types.ObjectId().toHexString(),
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/u, 'Invalid GST number'],
  },
  addressLine: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  postalCode: {
    type: String,
    trim: true,
  },
  openingBalance: {
    type: Number,
    default: 0,
  },
};

// Buyer Schema (formerly customers)
const buyerSchema = new mongoose.Schema(partyCommonFields, { timestamps: true });
const Buyer = mongoose.models.Buyer || mongoose.model('Buyer', buyerSchema);

// Seller Schema (formerly suppliers/vendors)
const sellerSchema = new mongoose.Schema(partyCommonFields, { timestamps: true });
const Seller = mongoose.models.Seller || mongoose.model('Seller', sellerSchema);

// Old Party schema removed - now using separate Buyer and Seller collections

// Staff Schema
const staffSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    salaryType: {
      type: String,
      enum: ['daily', 'monthly'],
      required: true,
    },
    salaryAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Staff = mongoose.models.Staff || mongoose.model('Staff', staffSchema);

// Attendance Record Schema
const attendanceRecordSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
    },
    attendance: {
      type: Map,
      of: {
        status: {
          type: String,
          enum: ['present', 'absent', 'halfday'],
          required: true,
        },
      },
    },
  },
  { timestamps: true }
);

const AttendanceRecord = mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', attendanceRecordSchema);

// Advance Salary Schema
const advanceSalarySchema = new mongoose.Schema(
  {
    advanceId: {
      type: String,
      required: true,
      unique: true,
    },
    staffId: {
      type: String,
      required: true,
      ref: 'Staff',
    },
    date: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      trim: true,
    },
    repaymentType: {
      type: String,
      enum: ['monthly', 'deduct'],
      default: 'monthly',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const AdvanceSalary = mongoose.models.AdvanceSalary || mongoose.model('AdvanceSalary', advanceSalarySchema);

// Salary Payment Schema
const salaryPaymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
    },
    staffId: {
      type: String,
      required: true,
      ref: 'Staff',
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    periodFrom: {
      type: Date,
      required: true,
    },
    periodTo: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const SalaryPayment = mongoose.models.SalaryPayment || mongoose.model('SalaryPayment', salaryPaymentSchema);

// ================== BILL / INVOICE SCHEMA ==================

const billItemSchema = new mongoose.Schema({
  itemId: { type: String },
  name: { type: String, required: true },
  hsn: { type: String },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'PCS' },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const billSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  invoiceDate: { type: Date, required: true },
  dueDate: { type: Date },
  customer: {
    partyId: { type: String },
    name: { type: String, required: true },
    phone: { type: String },
    gstNumber: { type: String },
    addressLine: { type: String }
  },
  items: { type: [billItemSchema], default: [] },
  status: { type: String, enum: ['Paid', 'Unpaid', 'Partially Paid'], default: 'Unpaid' },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  taxableAmount: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  additionalCharges: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  notes: { type: String },
}, { timestamps: true });

const Bill = mongoose.models.Bill || mongoose.model('Bill', billSchema);

const itemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toHexString(),
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      trim: true,
    },
    size: {
      type: String,
      trim: true,
    },
    salePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      trim: true,
      default: 'PCS',
    },
    minStock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);

const stockTransactionSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    transactionDate: { type: Date, default: Date.now },
    transactionType: { type: String, required: true },
    quantityIn: { type: Number, default: 0 },
    quantityOut: { type: Number, default: 0 },
    balance: { type: Number, required: true },
    referenceType: { type: String },
    referenceId: { type: String },
    manufacturingBatch: { type: String },
    notes: { type: String }
  },
  { timestamps: true }
);
const StockTransaction = mongoose.models.StockTransaction || mongoose.model('StockTransaction', stockTransactionSchema);

// Purchase invoice related schemas and model
const purchaseItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceDate: { type: Date, required: true },
    partyName: { type: String, required: true, trim: true },
    supplier: {
      partyId: { type: String },
      name: { type: String }
    },
    paymentTerms: { type: String, default: '' },
    items: { type: [purchaseItemSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['Paid', 'Unpaid', 'Partially Paid'], default: 'Unpaid' },
  },
  { timestamps: true }
);

const PurchaseInvoice = mongoose.models.PurchaseInvoice || mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);

// ================== DELIVERY CHALLAN SCHEMA ==================

const deliveryChallanItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  hsnCode: { type: String },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'PCS' }
}, { _id: false });

const deliveryChallanSchema = new mongoose.Schema({
  challanNumber: { type: String, required: true, unique: true },
  challanDate: { type: Date, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String },
  customerAddress: { type: String },
  deliveryAddress: { type: String },
  vehicleNumber: { type: String },
  driverName: { type: String },
  remarks: { type: String },
  items: { type: [deliveryChallanItemSchema], default: [] },
  totalQuantity: { type: Number, default: 0 }
}, { timestamps: true });

const DeliveryChallan = mongoose.models.DeliveryChallan || mongoose.model('DeliveryChallan', deliveryChallanSchema);

// ================== PAYMENT & ACCOUNT SCHEMA ==================

const paymentSchema = new mongoose.Schema({
  paymentNumber: { type: String, required: true, unique: true },
  paymentDate: { type: Date, required: true },
  customer: {
    partyId: { type: String, required: true },
    name: { type: String, required: true }
  },
  amount: { type: Number, required: true, min: 0 },
  mode: { type: String, enum: ['Cash', 'Bank', 'UPI'], required: true },
  bankDetails: {
    bankName: String,
    accountNumber: String
  },
  notes: String
}, { timestamps: true });

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

const accountSchema = new mongoose.Schema({
  accountName: { type: String, required: true, unique: true }, // 'Cash In Hand', 'Bank Account'
  balance: { type: Number, default: 0 }
}, { timestamps: true });

const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);

// Initialize Accounts if not exist
const initAccounts = async () => {
  const cash = await Account.findOne({ accountName: 'Cash In Hand' });
  if (!cash) await Account.create({ accountName: 'Cash In Hand', balance: 0 });

  const bank = await Account.findOne({ accountName: 'Bank Account' });
  if (!bank) await Account.create({ accountName: 'Bank Account', balance: 0 });
};
// initAccounts().catch(console.error); // Moved to DB connect callback

// Migration: Initialize balanceAmount for existing bills
const migrateBills = async () => {
  try {
    await Bill.updateMany(
      { balanceAmount: { $exists: false } },
      [{ $set: { balanceAmount: "$grandTotal", status: "Unpaid", paidAmount: 0 } }]
    );
    console.log("Migration: Bills balanceAmount initialized");

    // Run recalculation after migration
    await recalculateCustomerBalances();
  } catch (err) {
    console.error("Migration error:", err);
  }
};
// migrateBills(); // Checking connection first? No, just call it, but best to call inside DB connect or after.
// Since we are not waiting for DB connection explicitly at top level (mongoose buffer commands), it's fine.
// But we should defer it slightly or use .then().
// Let's just call it.
// setTimeout(migrateBills, 2000); // Moved to DB connect callback

// Helper: Recalculate customer balances from bills (Self-healing)
const recalculateCustomerBalances = async () => {
  try {
    const buyers = await Buyer.find();
    for (const buyer of buyers) {
      // Aggregate unpaid bills
      const result = await Bill.aggregate([
        {
          $match: {
            "customer.partyId": buyer.partyId,
            status: { $ne: 'Paid' }
          }
        },
        {
          $group: {
            _id: null,
            totalPending: { $sum: "$balanceAmount" }
          }
        }
      ]);


      const billBalance = result[0]?.totalPending || 0;
      const opening = buyer.openingBalance || 0;
      const newBalance = opening + billBalance;

      // Update if difference is significant (floating point tolerance)
      if (Math.abs(buyer.balance - newBalance) > 1) {
        buyer.balance = newBalance;
        await buyer.save();
        console.log(`Updated balance for ${buyer.name}: ${newBalance}`);
      }
    }
    console.log("Customer balances synchronized.");
    return true;
  } catch (err) {
    console.error("Balance calculation error:", err);
    return false;
  }
};
// recalculateCustomerBalances(); // Moved to be called by migrateBills

// Endpoint to force sync
app.get('/api/debug/sync-balances', async (req, res) => {
  try {
    await recalculateCustomerBalances();
    return res.json({ message: 'Balances synchronized' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================== EMAIL SERVICE ==================
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendPaymentReceiptEmail = async (payment, customer) => {
  if (!customer.email || !process.env.EMAIL_USER) return;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customer.email,
    subject: `Payment Receipt - ${payment.paymentNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">Payment Received</h2>
        <p>Dear ${customer.name},</p>
        <p>We have received a payment from you. Here are the details:</p>
        
        <table style="width: 100%; max-width: 500px; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Payment No:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${payment.paymentNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(payment.paymentDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Mode:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${payment.mode}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 1.2em;"><strong>Amount:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 1.2em; color: #166534;"><strong>₹${(payment.amount || 0).toLocaleString('en-IN')}</strong></td>
          </tr>
        </table>

        <p>Your current balance is: <strong>₹${(customer.balance).toLocaleString('en-IN')}</strong></p>
        <p>Thank you for your business!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.8em; color: #666;">Sevvel Garments</p>
      </div>
    `
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`Payment receipt email sent to ${customer.email}`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

const sendInvoiceEmail = async (bill, customer) => {
  if (!customer.email || !process.env.EMAIL_USER) return;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customer.email,
    subject: `Invoice Generated - ${bill.invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">New Invoice Generated</h2>
        <p>Dear ${customer.name},</p>
        <p>A new invoice has been generated for your account. Here are the details:</p>
        
        <table style="width: 100%; max-width: 500px; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Invoice No:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${bill.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(bill.invoiceDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Due Date:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 1.2em;"><strong>Total Amount:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 1.2em; color: #2563eb;"><strong>₹${(bill.grandTotal || 0).toLocaleString('en-IN')}</strong></td>
          </tr>
        </table>

        <p>Your current outstanding balance is: <strong>₹${(customer.balance).toLocaleString('en-IN')}</strong></p>
        <p>Please ensure timely payment.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.8em; color: #666;">Sevvel Garments</p>
      </div>
    `
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`Invoice email sent to ${customer.email}`);
  } catch (error) {
    console.error('Failed to send invoice email:', error);
  }
};

// ================== PURCHASE INVOICE ROUTES ==================

// Create a purchase invoice
app.post('/api/purchase-invoices', async (req, res) => {
  try {
    const payload = req.body;

    if (!payload.invoiceNumber || !payload.partyName || !payload.invoiceDate || !Array.isArray(payload.items) || payload.items.length === 0) {
      return res.status(400).json({ message: 'Invalid invoice payload' });
    }

    const items = payload.items.map((i) => ({
      itemName: i.itemName || '',
      quantity: Number(i.quantity) || 0,
      price: Number(i.price) || 0,
      amount: Number(i.amount) || 0,
    }));

    const totalAmount = items.reduce((s, it) => s + (it.amount || 0), 0);

    // Find supplier by name to get partyId
    const supplier = await Seller.findOne({ name: payload.partyName });
    const supplierId = supplier ? supplier.partyId : null;

    const invoice = await PurchaseInvoice.create({
      invoiceNumber: payload.invoiceNumber,
      invoiceDate: new Date(payload.invoiceDate),
      partyName: payload.partyName,
      supplier: {
        partyId: supplierId,
        name: payload.partyName
      },
      paymentTerms: payload.paymentTerms || '',
      items,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      status: 'Unpaid',
    });

    // Update supplier balance
    if (supplierId) {
      await Seller.findOneAndUpdate(
        { partyId: supplierId },
        { $inc: { balance: totalAmount } }
      );
    }

    return res.status(201).json({ message: 'Invoice saved', invoice });
  } catch (error) {
    console.error('Save purchase invoice error', error);
    if (error.code === 11000) return res.status(409).json({ message: 'Invoice number already exists' });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// List purchase invoices
app.get('/api/purchase-invoices', async (req, res) => {
  try {
    const invoices = await PurchaseInvoice.find().sort({ invoiceDate: -1 });
    return res.json({ invoices });
  } catch (error) {
    console.error('List purchase invoices error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Migrate existing purchase invoices - add supplier partyId and balanceAmount
app.post('/api/purchase-invoices/migrate', async (req, res) => {
  try {
    const invoices = await PurchaseInvoice.find({});
    
    for (const invoice of invoices) {
      // Find supplier by name and add partyId if missing
      if (!invoice.supplier || !invoice.supplier.partyId) {
        const supplier = await Seller.findOne({ name: invoice.partyName });
        if (supplier) {
          invoice.supplier = {
            partyId: supplier.partyId,
            name: invoice.partyName
          };
        }
      }
      
      // Set balanceAmount if missing
      if (!invoice.balanceAmount) {
        invoice.balanceAmount = invoice.totalAmount - (invoice.paidAmount || 0);
      }
      
      // Update status
      if (!invoice.status || invoice.status === 'Unpaid') {
        if (invoice.balanceAmount <= 0.01) {
          invoice.status = 'Paid';
        } else if (invoice.paidAmount > 0) {
          invoice.status = 'Partially Paid';
        } else {
          invoice.status = 'Unpaid';
        }
      }
      
      await invoice.save();
    }

    res.json({ message: 'Migration completed', count: invoices.length });
  } catch (error) {
    console.error('Migration error', error);
    return res.status(500).json({ message: 'Migration failed' });
  }
});

// Create and save a bill (used for printing/saving final invoices)
app.post('/api/bills', async (req, res) => {
  try {
    const payload = req.body;

    if (!payload.invoiceNumber || !payload.invoiceDate || !payload.customer || !payload.customer.name || !Array.isArray(payload.items) || payload.items.length === 0) {
      return res.status(400).json({ message: 'Invalid bill payload' });
    }

    const items = payload.items.map((i) => ({
      itemId: i.itemId || i.id || '',
      name: i.name || '',
      hsn: i.hsn || '',
      quantity: Number(i.quantity || i.qty) || 0,
      unit: i.unit || 'PCS',
      price: Number(i.price ?? i.rate) || 0,
      discount: Number(i.discount) || 0,
      tax: Number(i.tax) || 0,
      amount: Number(i.amount) || 0,
    }));

    const bill = await Bill.create({
      invoiceNumber: payload.invoiceNumber,
      invoiceDate: new Date(payload.invoiceDate),
      dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
      customer: {
        partyId: payload.customer.partyId || '',
        name: payload.customer.name,
        phone: payload.customer.phone || '',
        gstNumber: payload.customer.gstNumber || '',
        addressLine: payload.customer.addressLine || '',
      },
      items,
      subtotal: Number(payload.subtotal) || items.reduce((s, it) => s + (it.amount || 0), 0),
      totalDiscount: Number(payload.totalDiscount) || 0,
      taxableAmount: Number(payload.taxableAmount) || 0,
      totalTax: Number(payload.totalTax) || 0,
      additionalCharges: Number(payload.additionalCharges) || 0,
      grandTotal: Number(payload.grandTotal) || 0,
      balanceAmount: Number(payload.grandTotal) || 0, // Initial balance is full amount, will be adjusted if payment is made
      notes: payload.notes || '',
      status: payload.status || 'Unpaid',
      paidAmount: 0 // Will be updated below if payment exists
    });

    // 1. Update Customer Balance (Increase by Bill Amount)
    if (payload.customer && payload.customer.partyId) {
      await Buyer.findOneAndUpdate(
        { partyId: payload.customer.partyId },
        { $inc: { balance: Number(payload.grandTotal) || 0 } }
      );
    }

    // 2. Handle Payment if provided
    const paidAmount = Number(payload.paidAmount) || 0;
    const paymentMode = payload.paymentMode;

    if (paidAmount > 0 && (payload.status === 'Paid' || payload.status === 'Partially Paid')) {
      // Create Payment Record automatically
      await Payment.create({
        paymentNumber: `PAY-INV-${Date.now()}`,
        paymentDate: new Date(payload.invoiceDate),
        customer: {
          partyId: payload.customer.partyId,
          name: payload.customer.name
        },
        amount: paidAmount,
        mode: paymentMode || 'Cash',
        notes: `Payment for Invoice ${payload.invoiceNumber}`
      });

      // Update Cash/Bank Account
      const targetAccountName = (paymentMode === 'Bank' || paymentMode === 'UPI') ? 'Bank Account' : 'Cash In Hand';
      await Account.findOneAndUpdate(
        { accountName: targetAccountName },
        { $inc: { balance: paidAmount } },
        { upsert: true }
      );

      // Decrease Customer Balance by Paid Amount
      if (payload.customer && payload.customer.partyId) {
        await Buyer.findOneAndUpdate(
          { partyId: payload.customer.partyId },
          { $inc: { balance: -paidAmount } }
        );
      }

      // Update Bill Status & Balances
      bill.paidAmount = paidAmount;
      bill.balanceAmount = (bill.grandTotal - paidAmount);
      // Ensure small float precision issues don't keep it 'Unpaid' or 'Partially Paid' if basically 0
      if (bill.balanceAmount < 0.5) bill.balanceAmount = 0; // Tolerance

      if (bill.balanceAmount === 0) {
        bill.status = 'Paid';
      } else {
        bill.status = 'Partially Paid';
      }

      await bill.save();
    }

    // Decrement stock for each sold item (if matching Item exists)
    try {
      await Promise.all(items.map(async (it) => {
        const qty = Number(it.quantity) || 0;
        if (qty <= 0) return;
        let updated = null;
        if (it.itemId) {
          updated = await Item.findOneAndUpdate({ itemId: it.itemId }, { $inc: { stock: -qty } }, { new: true });
        }
        if (!updated && it.name) {
          updated = await Item.findOneAndUpdate({ name: it.name }, { $inc: { stock: -qty } }, { new: true });
        }
        if (!updated) {
          console.warn('Could not update stock for sold item:', it.name || it.itemId);
        }
      }));
    } catch (err) {
      console.error('Error updating item stock after bill save', err);
    }

    // --- EMAIL NOTIFICATIONS for Bill and Payment ---
    if (payload.customer && payload.customer.partyId) {
      const updatedCustomer = await Buyer.findOne({ partyId: payload.customer.partyId });

      if (updatedCustomer && updatedCustomer.email) {
        // 1. Send Invoice Email
        sendInvoiceEmail(bill, updatedCustomer).catch(console.error);

        // 2. If Payment was also added, send Receipt Email
        if (paidAmount > 0 && (bill.status === 'Paid' || bill.status === 'Partially Paid')) {
          const paymentData = {
            paymentNumber: `PAY-INV-${Date.now()}`, // Reconstruct or find actual record? Reconstructing for email display mainly
            paymentDate: new Date(payload.invoiceDate),
            mode: paymentMode || 'Cash',
            amount: paidAmount
          };
          // Just reuse simple object for email function or find the real created payment
          // Finding the real one is better but async timing... keep it simple
          sendPaymentReceiptEmail(paymentData, updatedCustomer).catch(console.error);
        }
      }
    }

    return res.status(201).json({ message: 'Bill saved', bill });
  } catch (error) {
    console.error('Save bill error', error);
    if (error.code === 11000) return res.status(409).json({ message: 'Invoice number already exists' });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// List saved bills
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ invoiceDate: -1 });
    return res.json({ bills });
  } catch (error) {
    console.error('List bills error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Summary: total sales, today's sales, this month's sales
app.get('/api/bills/summary', async (req, res) => {
  try {
    const now = new Date();

    // start of today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const totalAgg = await Bill.aggregate([
      { $group: { _id: null, total: { $sum: { $ifNull: ["$grandTotal", 0] } } } }
    ]);

    const todayAgg = await Bill.aggregate([
      { $match: { invoiceDate: { $gte: startOfToday, $lt: startOfTomorrow } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$grandTotal", 0] } } } }
    ]);

    const monthAgg = await Bill.aggregate([
      { $match: { invoiceDate: { $gte: startOfMonth, $lt: startOfNextMonth } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$grandTotal", 0] } } } }
    ]);

    const total = (totalAgg[0] && totalAgg[0].total) || 0;
    const today = (todayAgg[0] && todayAgg[0].total) || 0;
    const month = (monthAgg[0] && monthAgg[0].total) || 0;

    return res.json({ totalSales: total, todaySales: today, monthSales: month });
  } catch (error) {
    console.error('Bills summary error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ================== DELIVERY CHALLAN ROUTES ==================

// Create and save delivery challan
app.post('/api/delivery-challans', async (req, res) => {
  try {
    const payload = req.body;

    if (!payload.challanNumber || !payload.challanDate || !payload.customerName || !Array.isArray(payload.items) || payload.items.length === 0) {
      return res.status(400).json({ message: 'Invalid delivery challan payload' });
    }

    const items = payload.items.map((i) => ({
      itemName: i.itemName || '',
      hsnCode: i.hsnCode || '',
      quantity: Number(i.quantity) || 0,
      unit: i.unit || 'PCS',
    }));

    const challan = await DeliveryChallan.create({
      challanNumber: payload.challanNumber,
      challanDate: new Date(payload.challanDate),
      customerName: payload.customerName,
      customerPhone: payload.customerPhone || '',
      customerAddress: payload.customerAddress || '',
      deliveryAddress: payload.deliveryAddress || '',
      vehicleNumber: payload.vehicleNumber || '',
      driverName: payload.driverName || '',
      remarks: payload.remarks || '',
      items,
      totalQuantity: Number(payload.totalQuantity) || 0,
    });

    return res.status(201).json({ message: 'Delivery challan saved', challan });
  } catch (error) {
    console.error('Save delivery challan error', error);
    if (error.code === 11000) return res.status(409).json({ message: 'Challan number already exists' });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ================== PAYMENT Routes ==================

// Get customers with pending balance (using Buyer balance field)
app.get('/api/customers/pending', async (req, res) => {
  try {
    // We can also double check against bills, but relying on Buyer balance is faster if maintained correctly.
    // However, to be safe, let's aggregate from bills if buyer balance isn't trusted. 
    // For now, let's rely on Buyer balance as we are updating it.
    const customers = await Buyer.find({ balance: { $gt: 0 } }).select('partyId name phone balance');

    // Also fetch their unpaid bills count or details if needed?
    // Let's just return customers for the list.
    return res.json({ customers });
  } catch (error) {
    console.error('Get pending customers error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get unpaid bills for a specific customer
app.get('/api/customers/:partyId/unpaid-bills', async (req, res) => {
  try {
    const { partyId } = req.params;
    const bills = await Bill.find({
      "customer.partyId": partyId,
      status: { $ne: 'Paid' },
      balanceAmount: { $gt: 0 }
    }).sort({ invoiceDate: 1 }); // FIFO
    return res.json({ bills });
  } catch (error) {
    console.error('Get unpaid bills error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/suppliers/:partyId/unpaid-bills', async (req, res) => {
  try {
    const { partyId } = req.params;
    
    // Get supplier name for fallback
    const supplier = await Seller.findOne({ partyId });
    const supplierName = supplier ? supplier.name : null;
    
    const bills = await PurchaseInvoice.find({
      $or: [
        { "supplier.partyId": partyId },
        { partyName: supplierName } // Fallback for existing records
      ],
      status: { $ne: 'Paid' },
      $expr: { $gt: ['$balanceAmount', 0] }
    }).sort({ invoiceDate: 1 }); // FIFO
    
    return res.json({ bills });
  } catch (error) {
    console.error('Get unpaid purchase invoices error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create Payment In
app.post('/api/payments/in', async (req, res) => {
  try {
    const { customerId, amount, mode, date, bankDetails, notes, selectedInvoices } = req.body;

    // Validate
    if (!customerId || !amount || !mode || !date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const paymentAmount = Number(amount);
    if (paymentAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // 1. Create Payment Record
    const payment = await Payment.create({
      paymentNumber: `PAY-${Date.now()}`,
      paymentDate: new Date(date),
      customer: {
        partyId: customerId,
        name: (await Buyer.findOne({ partyId: customerId }))?.name || 'Unknown'
      },
      amount: paymentAmount,
      mode,
      bankDetails: mode === 'Bank' ? bankDetails : undefined,
      notes
    });

    // 2. Update Cash/Bank Balance
    const accountName = mode === 'Cash' ? 'Cash In Hand' : 'Bank Account'; // Group UPI with Bank or separate? Let's say Bank for UPI for now or map accordingly.
    // Actually, usually UPI goes to Bank.
    const targetAccountName = mode === 'Cash' ? 'Cash In Hand' : 'Bank Account';
    await Account.findOneAndUpdate(
      { accountName: targetAccountName },
      { $inc: { balance: paymentAmount } },
      { upsert: true }
    );

    // 3. Update Customer Balance
    await Buyer.findOneAndUpdate(
      { partyId: customerId },
      { $inc: { balance: -paymentAmount } }
    );

    // 4. Distribute Payment to Invoices
    // If selectedInvoices matches provided list
    let remainingAmount = paymentAmount;

    if (selectedInvoices && selectedInvoices.length > 0) {
      // Pay specific invoices
      for (const inv of selectedInvoices) {
        if (remainingAmount <= 0) break;

        const bill = await Bill.findOne({ invoiceNumber: inv.invoiceNumber });
        if (bill) {
          const pay = Math.min(remainingAmount, bill.balanceAmount);
          bill.paidAmount += pay;
          bill.balanceAmount -= pay;
          bill.status = bill.balanceAmount <= 0.1 ? 'Paid' : 'Partially Paid'; // use epsilon for float ref comparison
          await bill.save();
          remainingAmount -= pay;
        }
      }
    } else {
      // FIFO: Auto-distribute to oldest unpaid bills
      const unpaidBills = await Bill.find({
        "customer.partyId": customerId,
        status: { $ne: 'Paid' },
        balanceAmount: { $gt: 0 }
      }).sort({ invoiceDate: 1 });

      for (const bill of unpaidBills) {
        if (remainingAmount <= 0) break;

        const pay = Math.min(remainingAmount, bill.balanceAmount);
        bill.paidAmount += pay;
        bill.balanceAmount -= pay;
        bill.status = bill.balanceAmount <= 0.1 ? 'Paid' : 'Partially Paid';
        await bill.save();
        remainingAmount -= pay;
      }
    }

    // 5. Send Email Notification
    // Fetch updated customer to get latest balance/email
    const updatedCustomer = await Buyer.findOne({ partyId: customerId });
    if (updatedCustomer && updatedCustomer.email) {
      sendPaymentReceiptEmail(payment, updatedCustomer).catch(console.error);
    }

    return res.status(201).json({ message: 'Payment recorded successfully', payment });
  } catch (error) {
    console.error('Payment In error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/payments/out', async (req, res) => {
  try {
    const { supplierId, amount, mode, date, bankDetails, notes, selectedInvoices } = req.body;

    // Validate
    if (!supplierId || !amount || !mode || !date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const paymentAmount = Number(amount);
    if (paymentAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // 1. Create Payment Record
    const payment = await Payment.create({
      paymentNumber: `PAY-${Date.now()}`,
      paymentDate: new Date(date),
      customer: {
        partyId: supplierId,
        name: (await Seller.findOne({ partyId: supplierId }))?.name || 'Unknown'
      },
      amount: paymentAmount,
      mode,
      bankDetails: mode === 'Bank' ? bankDetails : undefined,
      notes
    });

    // 2. Update Cash/Bank Balance (decrease for payment out)
    const targetAccountName = mode === 'Cash' ? 'Cash In Hand' : 'Bank Account';
    await Account.findOneAndUpdate(
      { accountName: targetAccountName },
      { $inc: { balance: -paymentAmount } },
      { upsert: true }
    );

    // 3. Update Supplier Balance
    await Seller.findOneAndUpdate(
      { partyId: supplierId },
      { $inc: { balance: -paymentAmount } }
    );

    // 4. Distribute Payment to Invoices
    let remainingAmount = paymentAmount;

    if (selectedInvoices && selectedInvoices.length > 0) {
      // Pay specific invoices
      for (const inv of selectedInvoices) {
        if (remainingAmount <= 0) break;

        const purchaseInvoice = await PurchaseInvoice.findOne({ invoiceNumber: inv.invoiceNumber });
        if (purchaseInvoice) {
          const pay = Math.min(remainingAmount, purchaseInvoice.balanceAmount);
          purchaseInvoice.paidAmount += pay;
          purchaseInvoice.balanceAmount -= pay;
          purchaseInvoice.status = purchaseInvoice.balanceAmount <= 0.1 ? 'Paid' : 'Partially Paid';
          await purchaseInvoice.save();
          remainingAmount -= pay;
        }
      }
    } else {
      // FIFO: Auto-distribute to oldest unpaid purchase invoices
      const supplier = await Seller.findOne({ partyId: supplierId });
      const supplierName = supplier ? supplier.name : null;
      
      const unpaidInvoices = await PurchaseInvoice.find({
        $or: [
          { "supplier.partyId": supplierId },
          { partyName: supplierName }
        ],
        status: { $ne: 'Paid' },
        $expr: { $gt: ['$balanceAmount', 0] }
      }).sort({ invoiceDate: 1 });

      for (const invoice of unpaidInvoices) {
        if (remainingAmount <= 0) break;

        const pay = Math.min(remainingAmount, invoice.balanceAmount);
        invoice.paidAmount += pay;
        invoice.balanceAmount -= pay;
        invoice.status = invoice.balanceAmount <= 0.1 ? 'Paid' : 'Partially Paid';
        await invoice.save();
        remainingAmount -= pay;
      }
    }

    // 5. Send Email Notification (optional for payment out)
    // const updatedSupplier = await Seller.findOne({ partyId: supplierId });
    // if (updatedSupplier && updatedSupplier.email) {
    //   // sendPaymentReceiptEmail(payment, updatedSupplier).catch(console.error);
    // }

    return res.status(201).json({ message: 'Payment recorded successfully', payment });
  } catch (error) {
    console.error('Payment Out error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// List delivery challans
app.get('/api/delivery-challans', async (req, res) => {
  try {
    const challans = await DeliveryChallan.find().sort({ challanDate: -1 });
    return res.json(challans);
  } catch (error) {
    console.error('List delivery challans error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ================== ACCOUNT Reports Routes ==================

// Get Account Balances
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await Account.find();
    return res.json({ accounts });
  } catch (error) {
    console.error('Get accounts error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get Recent Payments
app.get('/api/payments/recent', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ paymentDate: -1 }).limit(50);
    return res.json({ payments });
  } catch (error) {
    console.error('Get recent payments error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Purchase summary: unpaid total
app.get('/api/purchase-invoices/summary', async (req, res) => {
  try {
    const invoices = await PurchaseInvoice.find();
    
    const totalPurchases = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalUnpaid = invoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);

    return res.json({ 
      totalPurchases,
      totalPaid,
      unpaidTotal: totalUnpaid,
      invoiceCount: invoices.length
    });
  } catch (error) {
    console.error('Purchase summary error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

import fs from 'fs/promises';
import path from 'path';
// Note: Puppeteer is optionally required inside the route to allow the server to start
// even when puppeteer isn't installed (reduces dev friction on systems without Chromium).

// Generate PDF for an invoice by invoiceNumber
app.get('/api/bills/:invoiceNumber/pdf', async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const bill = await Bill.findOne({ invoiceNumber });

    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    // DEBUG: Log bill items to see stored data
    console.log('PDF Generation - Bill:', invoiceNumber);
    console.log('PDF Generation - Items:', JSON.stringify(bill.items, null, 2));
    console.log('PDF Generation - GrandTotal:', bill.grandTotal);

    // Read HTML template
    const templatePath = path.join(__dirname, '..', '..', 'client', 'print-invoice', 'invoice-template.html');
    let html = await fs.readFile(templatePath, 'utf8');

    // Company details
    html = html.replace(/%%COMPANY_NAME%%/g, 'SEVVEL GARMENTS');
    html = html.replace(/%%COMPANY_ADDRESS%%/g, '8/A Suppanur Papampalayam Post, Tiruppur, Tamil Nadu - 638752');
    html = html.replace(/%%COMPANY_MOBILE%%/g, '9600818418');
    html = html.replace(/%%COMPANY_GST%%/g, '33GNIPK9601N1ZJ');
    html = html.replace(/%%COMPANY_PAN%%/g, 'GNIPK9601N');

    // Invoice metadata
    html = html.replace(/%%INVOICE_NUMBER%%/g, bill.invoiceNumber || '');
    html = html.replace(/%%INVOICE_DATE%%/g, bill.invoiceDate ? new Date(bill.invoiceDate).toLocaleDateString('en-IN') : '');
    html = html.replace(/%%DUE_DATE%%/g, bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-IN') : '-');

    // Place of Supply (extract from customer address or default to Tamil Nadu)
    const placeOfSupply = bill.customer?.addressLine ? 'Tamil Nadu' : 'Tamil Nadu';
    html = html.replace(/%%PLACE_OF_SUPPLY%%/g, placeOfSupply);

    // Customer details (BILL TO)
    const customer = bill.customer || {};
    html = html.replace(/%%CUSTOMER_NAME%%/g, escapeHtml(customer.name || ''));
    html = html.replace(/%%CUSTOMER_ADDRESS%%/g, escapeHtml(customer.addressLine || ''));
    html = html.replace(/%%CUSTOMER_CITY_STATE%%/g, '');
    html = html.replace(/%%CUSTOMER_GSTIN%%/g, customer.gstNumber || '-');

    // Shipping details (SHIP TO - same as billing)
    html = html.replace(/%%SHIP_NAME%%/g, escapeHtml(customer.name || ''));
    html = html.replace(/%%SHIP_ADDRESS%%/g, escapeHtml(customer.addressLine || ''));
    html = html.replace(/%%SHIP_CITY_STATE%%/g, '');

    // Calculate tax amounts
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let taxableAmount = 0;

    // Generate items HTML with all columns
    const itemsHtml = (bill.items || []).map((it, idx) => {
      const qty = Number(it.quantity || 0);
      const rate = Number(it.price || 0);
      const discount = Number(it.discount || 0);
      const taxRate = Number(it.tax || 0);

      const itemSubtotal = qty * rate;
      const discountAmount = (itemSubtotal * discount) / 100;
      const taxableAmt = itemSubtotal - discountAmount;
      const taxAmount = (taxableAmt * taxRate) / 100;
      const amount = taxableAmt + taxAmount;

      // Accumulate tax amounts (assuming intra-state, split into CGST/SGST)
      const cgst = taxAmount / 2;
      const sgst = taxAmount / 2;
      totalCGST += cgst;
      totalSGST += sgst;
      taxableAmount += taxableAmt;

      const taxDisplay = taxRate > 0 ? `${formatNumber(taxAmount)}<br>(${taxRate}%)` : '-';

      return `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td>${escapeHtml(it.name || '')}</td>
              <td class="text-center">${escapeHtml(it.hsn || '-')}</td>
              <td class="text-center">${qty}</td>
              <td class="text-center">${escapeHtml(it.unit || 'PCS')}</td>
              <td class="text-right">${formatNumber(rate)}</td>
              <td class="text-right">${formatNumber(taxableAmt)}</td>
              <td class="text-right">${taxDisplay}</td>
              <td class="text-right">${formatNumber(amount)}</td>
            </tr>`;
    }).join('');

    html = html.replace(/<!-- ITEMS_PLACEHOLDER -->/g, itemsHtml);

    // Summary amounts
    html = html.replace(/%%TAXABLE_AMOUNT%%/g, formatNumber(taxableAmount || bill.taxableAmount || bill.subtotal || 0));
    html = html.replace(/%%CGST_AMOUNT%%/g, formatNumber(totalCGST));
    html = html.replace(/%%SGST_AMOUNT%%/g, formatNumber(totalSGST));
    html = html.replace(/%%IGST_AMOUNT%%/g, formatNumber(totalIGST));
    html = html.replace(/%%TOTAL_AMOUNT%%/g, formatNumber(bill.grandTotal || 0));

    // Amount in words
    const amountWords = toIndianCurrencyWords(bill.grandTotal || 0);
    html = html.replace(/%%AMOUNT_IN_WORDS%%/g, amountWords);

    // Bank details
    html = html.replace(/%%BANK_ACCOUNT_NAME%%/g, 'Account Holder Name');
    html = html.replace(/%%BANK_ACCOUNT_NUMBER%%/g, '123456789');
    html = html.replace(/%%BANK_IFSC%%/g, 'IFSC CODE');
    html = html.replace(/%%BANK_NAME%%/g, 'Bank Name');
    html = html.replace(/%%BANK_BRANCH%%/g, 'Branch Name');

    // Lazily import puppeteer
    let puppeteerModule;
    try {
      puppeteerModule = (await import('puppeteer')).default || (await import('puppeteer'));
    } catch (err) {
      console.error('Puppeteer import failed - PDF generation not available', err);
      return res.status(503).json({ message: 'PDF generation is unavailable on the server. Install puppeteer to enable this feature.' });
    }

    // Launch puppeteer to render PDF
    const browser = await puppeteerModule.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' }
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${bill.invoiceNumber || 'invoice'}.pdf"`);
    return res.end(pdfBuffer, 'binary');
  } catch (error) {
    console.error('Generate PDF error', error);
    return res.status(500).json({ message: 'Failed to generate PDF' });
  }
});

// Generate and save PDF to database
app.post('/api/bills/:invoiceNumber/generate-pdf', async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const bill = await Bill.findOne({ invoiceNumber });

    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    // Read HTML template
    const templatePath = path.join(__dirname, '..', '..', 'client', 'print-invoice', 'invoice-template.html');
    let html = await fs.readFile(templatePath, 'utf8');

    // Replace company placeholders
    html = html.replace(/%%COMPANY_NAME%%/g, 'SEVVEL GARMENTS');
    html = html.replace(/%%COMPANY_ADDRESS%%/g, '8/A Suppanur Papampalayam Post, Tiruppur, Tamil Nadu - 638752');
    html = html.replace(/%%COMPANY_MOBILE%%/g, '9600818418');
    html = html.replace(/%%COMPANY_GST%%/g, '33GNIPK9601N1ZJ');
    html = html.replace(/%%COMPANY_PAN%%/g, 'GNIPK9601N');

    // Replace invoice meta
    html = html.replace(/%%INVOICE_NUMBER%%/g, bill.invoiceNumber || '');
    html = html.replace(/%%INVOICE_DATE%%/g, bill.invoiceDate ? new Date(bill.invoiceDate).toLocaleDateString() : '');
    html = html.replace(/%%DUE_DATE%%/g, bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : '');

    // BILL TO / SHIP TO
    const billTo = bill.customer || {};
    const billToAddr = (billTo.addressLine || '') + (billTo.city ? ', ' + billTo.city : '');
    html = html.replace(/J U GARMENTS/g, (billTo.name || ''));
    html = html.replace(/NO.6, MURUGANATHAPURAM EAST OPP, VIKAS VIDHYALAYA SCHOOL, M.S NAGAR TIRUPUR/g, billToAddr || '');
    html = html.replace(/GSTIN: 33AENPA9557M1Z0/g, billTo.gstNumber || '');

    // Items
    const itemsHtml = (bill.items || []).map((it, idx) => {
      const qty = Number(it.quantity || it.qty || 0);
      const rate = Number(it.price || it.rate || 0);
      const amount = Number(it.amount || 0) || qty * rate;
      return `\n            <tr>\n              <td class="sno">${idx + 1}</td>\n              <td>${escapeHtml(it.name || it.description || '')}</td>\n              <td class="qty number">${qty}</td>\n              <td class="rate number">${rate.toFixed(2)}</td>\n              <td class="amount number">${amount.toFixed(2)}</td>\n            </tr>`;
    }).join('');

    html = html.replace(/<!-- ITEMS_PLACEHOLDER -->/g, itemsHtml);

    // Totals
    html = html.replace(/₹ 6,350.00/g, `₹ ${formatNumber(bill.subtotal || 0)}`);
    html = html.replace(/₹ 7,493.00/g, `₹ ${formatNumber(bill.grandTotal || 0)}`);

    const amountWords = toIndianCurrencyWords(bill.grandTotal || 0);
    html = html.replace(/%%AMOUNT_IN_WORDS%%/g, amountWords);

    // Lazily import puppeteer
    let puppeteerModule;
    try {
      puppeteerModule = (await import('puppeteer')).default || (await import('puppeteer'));
    } catch (err) {
      console.error('Puppeteer import failed - PDF generation not available', err);
      return res.status(503).json({ message: 'PDF generation is unavailable on the server. Install puppeteer to enable this feature.' });
    }

    // Launch puppeteer to render PDF
    const browser = await puppeteerModule.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' }
    });
    await browser.close();

    // Save PDF buffer to the bill document
    bill.pdfBuffer = pdfBuffer;
    await bill.save();

    return res.json({ message: 'PDF generated and saved successfully', size: pdfBuffer.length });
  } catch (error) {
    console.error('Generate and save PDF error', error);
    return res.status(500).json({ message: 'Failed to generate and save PDF' });
  }
});

// Get saved PDF from database
app.get('/api/bills/:invoiceNumber/saved-pdf', async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const bill = await Bill.findOne({ invoiceNumber });

    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    if (!bill.pdfBuffer) {
      return res.status(404).json({ message: 'PDF not found for this bill. Generate it first.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', bill.pdfBuffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${bill.invoiceNumber || 'invoice'}.pdf"`);
    return res.send(bill.pdfBuffer);
  } catch (error) {
    console.error('Get saved PDF error', error);
    return res.status(500).json({ message: 'Failed to retrieve saved PDF' });
  }
});

function formatNumber(n) {
  return (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Convert number to Indian rupee words (simple implementation)
function toIndianCurrencyWords(amount) {
  const a = Math.floor(amount);
  if (a === 0) return 'Zero Rupees Only';
  // Very simple conversion for common use; for full coverage use a library
  const words = numberToWords(a);
  return `${words} Rupees Only`;
}

function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
}

async function ensureAdminUser() {
  const admin = await User.findOne({ email: ADMIN_EMAIL });

  if (!admin) {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await User.create({ email: ADMIN_EMAIL, password: hashedPassword, role: 'admin' });
    console.log('Default admin user created');
    return;
  }

  const passwordMatches = await bcrypt.compare(ADMIN_PASSWORD, admin.password);

  if (!passwordMatches) {
    admin.password = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await admin.save();
    console.log('Default admin password updated');
  }
}

async function ensureDefaultParty() {
  // Check if "Cash Sale" buyer exists in buyers collection
  const existingBuyer = await Buyer.findOne({ name: 'Cash Sale' });

  if (!existingBuyer) {
    await Buyer.create({ name: 'Cash Sale', phone: '', balance: 0 });
    console.log('Default buyer "Cash Sale" created');
  }
}

mongoose
  .connect(MONGODB_URI, {
    dbName: MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    bufferCommands: false,
  })
  .then(async () => {
    console.log(`Connected to MongoDB database: ${mongoose.connection.name}`);
    await ensureAdminUser();
    await ensureDefaultParty();

    // Initialize accounts
    await initAccounts();

    // Run migrations and syncs
    await migrateBills();

    // Update all customers email as requested
    try {
      const updateResult = await Buyer.updateMany({}, { $set: { email: 'kishor19082005@gmail.com' } });
      console.log(`Updated email for ${updateResult.modifiedCount} customers.`);
    } catch (err) {
      console.error('Failed to update customer emails:', err);
    }

    // Start server only after DB is ready
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error', error);
    process.exit(1);
  });

// Reports Routes
app.use('/api/reports', reportsRouter);

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.json({
      message: 'Login successful',
      user: {
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find().sort({ name: 1 });
    return res.json({
      items: items.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        code: item.code ?? '',
        category: item.category ?? '',
        salePrice: Number.isFinite(item.salePrice) ? item.salePrice : 0,
        purchasePrice: Number.isFinite(item.purchasePrice) ? item.purchasePrice : 0,
        stock: Number.isFinite(item.stock) ? item.stock : 0,
        unit: item.unit ?? '',
      })),
    });
  } catch (error) {
    console.error('List items error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    // Support both `{ item: { ... } }` payloads and direct body payloads
    const payload = (req.body && req.body.item) ? req.body.item : req.body || {};

    const name = payload.name;
    const code = payload.code;
    const category = payload.category;
    // frontend may send `sellingPrice`; accept that as fallback for `salePrice`
    const salePrice = payload.salePrice ?? payload.sellingPrice ?? 0;
    const purchasePrice = payload.purchasePrice ?? 0;
    const stock = payload.stock ?? 0;
    const unit = payload.unit ?? 'PCS';

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Item name is required' });
    }

    const item = await Item.create({
      name: name.trim(),
      code: code?.trim()?.toUpperCase(),
      category: category?.trim(),
      salePrice: Number(salePrice) || 0,
      purchasePrice: Number(purchasePrice) || 0,
      stock: Number(stock) || 0,
      unit: unit?.trim() || 'PCS',
    });

    if (item.stock > 0) {
      await StockTransaction.create({
        itemId: item.itemId,
        transactionType: 'Opening Stock',
        quantityIn: item.stock,
        quantityOut: 0,
        balance: item.stock,
        referenceType: 'Opening Stock'
      });
    }

    return res.status(201).json({
      item: {
        itemId: item.itemId,
        name: item.name,
        code: item.code ?? '',
        category: item.category ?? '',
        salePrice: Number.isFinite(item.salePrice) ? item.salePrice : 0,
        purchasePrice: Number.isFinite(item.purchasePrice) ? item.purchasePrice : 0,
        stock: Number.isFinite(item.stock) ? item.stock : 0,
        unit: item.unit ?? '',
      },
    });
  } catch (error) {
    console.error('Create item error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch('/api/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const payload = req.body || {};

    const update = {};

    // Update all fields that are provided
    if (payload.name !== undefined) update.name = String(payload.name).trim();
    if (payload.code !== undefined) update.code = String(payload.code).trim().toUpperCase();
    if (payload.category !== undefined) update.category = String(payload.category).trim();
    if (payload.size !== undefined) update.size = String(payload.size).trim();
    if (payload.unit !== undefined) update.unit = String(payload.unit).trim();
    if (payload.stock !== undefined) update.stock = Number(payload.stock) || 0;

    // accept both `salePrice` and legacy `sellingPrice`
    if (payload.salePrice !== undefined) update.salePrice = Number(payload.salePrice) || 0;
    else if (payload.sellingPrice !== undefined) update.salePrice = Number(payload.sellingPrice) || 0;

    if (payload.purchasePrice !== undefined) update.purchasePrice = Number(payload.purchasePrice) || 0;
    if (payload.minStock !== undefined) update.minStock = Number(payload.minStock) || 0;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No updatable fields provided' });
    }

    const oldItem = await Item.findOne({ itemId });
    if (!oldItem) return res.status(404).json({ message: 'Item not found' });

    const item = await Item.findOneAndUpdate({ itemId }, update, { new: true });

    if (payload.stock !== undefined) {
      const oldStock = Number(oldItem.stock) || 0;
      const newStock = Number(item.stock) || 0;
      if (oldStock !== newStock) {
        const difference = newStock - oldStock;
        await StockTransaction.create({
          itemId: item.itemId,
          transactionType: 'Manual Adjustment',
          quantityIn: difference > 0 ? difference : 0,
          quantityOut: difference < 0 ? Math.abs(difference) : 0,
          balance: newStock,
          referenceType: 'Adjustment',
          notes: 'Updated via edit form'
        });
      }
    }

    return res.json({
      item: {
        itemId: item.itemId,
        name: item.name,
        code: item.code ?? '',
        category: item.category ?? '',
        size: item.size ?? '',
        salePrice: Number.isFinite(item.salePrice) ? item.salePrice : 0,
        purchasePrice: Number.isFinite(item.purchasePrice) ? item.purchasePrice : 0,
        stock: Number.isFinite(item.stock) ? item.stock : 0,
        unit: item.unit ?? '',
        minStock: Number.isFinite(item.minStock) ? item.minStock : 0,
      },
    });
  } catch (error) {
    console.error('Update item error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/items/:itemId/stock-transactions', async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // Check if item exists
    const item = await Item.findOne({ itemId });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const transactions = await StockTransaction.find({ itemId })
      .sort({ transactionDate: -1, createdAt: -1 });

    return res.json({ transactions });
  } catch (error) {
    console.error('Fetch stock transactions error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await Item.findOneAndDelete({ itemId });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    return res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/items/bulk-delete', async (req, res) => {
  try {
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: 'Item IDs array is required' });
    }
    
    await Item.deleteMany({ itemId: { $in: itemIds } });
    return res.json({ message: 'Items deleted successfully' });
  } catch (error) {
    console.error('Bulk delete items error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ================== UNIFIED PARTIES API ROUTES (Buyers + Sellers) ==================

// Get all parties (buyers + sellers)
app.get('/api/parties', async (req, res) => {
  try {
    const [buyers, sellers] = await Promise.all([
      Buyer.find().sort({ name: 1 }),
      Seller.find().sort({ name: 1 })
    ]);

    const buyerList = buyers.map((b) => ({
      partyId: b.partyId,
      name: b.name,
      phone: b.phone ?? '',
      email: b.email ?? '',
      balance: b.balance ?? 0,
      gstNumber: b.gstNumber ?? '',
      addressLine: b.addressLine ?? '',
      city: b.city ?? '',
      state: b.state ?? '',
      postalCode: b.postalCode ?? '',
      openingBalance: b.openingBalance ?? 0,
      category: 'Buyer',
      type: 'Customer',
    }));

    const sellerList = sellers.map((s) => ({
      partyId: s.partyId,
      name: s.name,
      phone: s.phone ?? '',
      email: s.email ?? '',
      balance: s.balance ?? 0,
      gstNumber: s.gstNumber ?? '',
      addressLine: s.addressLine ?? '',
      city: s.city ?? '',
      state: s.state ?? '',
      postalCode: s.postalCode ?? '',
      openingBalance: s.openingBalance ?? 0,
      category: 'Supplier',
      type: 'Vendor',
    }));

    return res.json({ parties: [...buyerList, ...sellerList] });
  } catch (error) {
    console.error('List parties error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create party (Buyer or Seller)
app.post('/api/parties', async (req, res) => {
  try {
    const { category, ...payload } = req.body;

    if (!payload.name || !payload.name.trim()) {
      return res.status(400).json({ message: 'Party name is required' });
    }

    if (category === 'Buyer') {
      // Delegate to Buyer creation logic (extracted or direct call)
      // For simplicity, replicating Buyer creation logic here or 307 Redirect? 
      // Replicating is safer for internal consistency.
      const buyer = await Buyer.create({
        ...payload,
        name: payload.name.trim(),
        balance: payload.openingBalance ?? 0
      });
      return res.status(201).json({ party: { ...buyer.toObject(), category: 'Buyer' } });
    } else if (category === 'Supplier') {
      const seller = await Seller.create({
        ...payload,
        name: payload.name.trim(),
        balance: payload.openingBalance ?? 0
      });
      return res.status(201).json({ party: { ...seller.toObject(), category: 'Supplier' } });
    } else {
      return res.status(400).json({ message: 'Invalid category. Must be Buyer or Supplier' });
    }
  } catch (error) {
    console.error('Create party error', error);
    if (error.code === 11000) return res.status(409).json({ message: 'Party already exists' });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update party
app.put('/api/parties/:partyId', async (req, res) => {
  try {
    const { partyId } = req.params;
    const { category, ...payload } = req.body;

    // determine type by searching both? Or use category if provided.
    // If we rely on category:
    if (category === 'Buyer') {
      const buyer = await Buyer.findOneAndUpdate({ partyId }, payload, { new: true });
      if (!buyer) return res.status(404).json({ message: 'Buyer not found' });
      return res.json({ party: { ...buyer.toObject(), category: 'Buyer' } });
    } else if (category === 'Supplier') {
      const seller = await Seller.findOneAndUpdate({ partyId }, payload, { new: true });
      if (!seller) return res.status(404).json({ message: 'Supplier not found' });
      return res.json({ party: { ...seller.toObject(), category: 'Supplier' } });
    } else {
      // Try both
      let buyer = await Buyer.findOneAndUpdate({ partyId }, payload, { new: true });
      if (buyer) return res.json({ party: { ...buyer.toObject(), category: 'Buyer' } });

    }
  } catch (error) {
    console.error('Update party error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete party
app.delete('/api/parties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let deleted = await Buyer.findOneAndDelete({ partyId: id });
    if (!deleted) {
      deleted = await Seller.findOneAndDelete({ partyId: id });
    }
    
    if (!deleted) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    return res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete party error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ================== BUYER API ROUTES ==================

// Get all buyers
app.get('/api/buyers', async (req, res) => {
  try {
    const buyers = await Buyer.find().sort({ name: 1 });
    return res.json({
      buyers: buyers.map((buyer) => ({
        partyId: buyer.partyId,
        name: buyer.name,
        phone: buyer.phone ?? '',
        email: buyer.email ?? '',
        balance: buyer.balance ?? 0,
        gstNumber: buyer.gstNumber ?? '',
        addressLine: buyer.addressLine ?? '',
        city: buyer.city ?? '',
        state: buyer.state ?? '',
        postalCode: buyer.postalCode ?? '',
        openingBalance: buyer.openingBalance ?? 0,
        category: 'Buyer',
        type: 'Customer',
      })),
    });
  } catch (error) {
    console.error('List buyers error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create buyer
app.post('/api/buyers', async (req, res) => {
  try {
    const { name, phone, email, gstNumber, addressLine, city, state, postalCode, openingBalance } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Buyer name is required' });
    }

    const trimmedName = name.trim();
    const trimmedGst = gstNumber?.trim().toUpperCase() ?? '';

    if (trimmedGst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/u.test(trimmedGst)) {
      return res.status(400).json({ message: 'Invalid GST number format' });
    }

    const buyer = await Buyer.create({
      name: trimmedName,
      phone: phone?.trim(),
      email: email?.trim(),
      gstNumber: trimmedGst,
      addressLine: addressLine?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      postalCode: postalCode?.trim(),
      openingBalance: openingBalance ?? 0,
      balance: openingBalance ?? 0,
    });

    return res.status(201).json({
      buyer: {
        partyId: buyer.partyId,
        name: buyer.name,
        phone: buyer.phone ?? '',
        email: buyer.email ?? '',
        balance: buyer.balance ?? 0,
        gstNumber: buyer.gstNumber ?? '',
        addressLine: buyer.addressLine ?? '',
        city: buyer.city ?? '',
        state: buyer.state ?? '',
        postalCode: buyer.postalCode ?? '',
        openingBalance: buyer.openingBalance ?? 0,
        category: 'Buyer',
        type: 'Customer',
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Buyer already exists' });
    }

    console.error('Create buyer error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update buyer
app.put('/api/buyers/:partyId', async (req, res) => {
  try {
    const { partyId } = req.params;
    const { name, phone, email, gstNumber, addressLine, city, state, postalCode, openingBalance } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Buyer name is required' });
    }

    const trimmedGst = gstNumber?.trim().toUpperCase() ?? '';
    if (trimmedGst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/u.test(trimmedGst)) {
      return res.status(400).json({ message: 'Invalid GST number format' });
    }

    const buyer = await Buyer.findOneAndUpdate(
      { partyId },
      {
        name: name.trim(),
        phone: phone?.trim(),
        email: email?.trim(),
        gstNumber: trimmedGst,
        addressLine: addressLine?.trim(),
        city: city?.trim(),
        state: state?.trim(),
        postalCode: postalCode?.trim(),
        openingBalance: openingBalance ?? 0,
      },
      { new: true }
    );

    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    return res.json({
      buyer: {
        partyId: buyer.partyId,
        name: buyer.name,
        phone: buyer.phone ?? '',
        email: buyer.email ?? '',
        balance: buyer.balance ?? 0,
        gstNumber: buyer.gstNumber ?? '',
        addressLine: buyer.addressLine ?? '',
        city: buyer.city ?? '',
        state: buyer.state ?? '',
        postalCode: buyer.postalCode ?? '',
        openingBalance: buyer.openingBalance ?? 0,
        category: 'Buyer',
        type: 'Customer',
      },
    });
  } catch (error) {
    console.error('Update buyer error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete buyer
app.delete('/api/buyers/:partyId', async (req, res) => {
  try {
    const { partyId } = req.params;
    const buyer = await Buyer.findOneAndDelete({ partyId });

    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    return res.json({ message: 'Buyer deleted successfully' });
  } catch (error) {
    console.error('Delete buyer error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ================== SELLER API ROUTES ==================

// Get all sellers with unpaid purchase invoice amounts
app.get('/api/sellers-with-unpaid', async (req, res) => {
  try {
    // First, run migration if needed
    const invoiceCount = await PurchaseInvoice.countDocuments({ 'supplier.partyId': { $exists: false } });
    if (invoiceCount > 0) {
      // Migrate existing invoices
      const invoices = await PurchaseInvoice.find({ 'supplier.partyId': { $exists: false } });
      for (const invoice of invoices) {
        const supplier = await Seller.findOne({ name: invoice.partyName });
        if (supplier) {
          invoice.supplier = {
            partyId: supplier.partyId,
            name: invoice.partyName
          };
          if (!invoice.balanceAmount) {
            invoice.balanceAmount = invoice.totalAmount - (invoice.paidAmount || 0);
          }
        }
        await invoice.save();
      }
    }

    const sellers = await Seller.find().sort({ name: 1 });
    
    const sellersWithUnpaid = await Promise.all(
      sellers.map(async (seller) => {
        const unpaidInvoices = await PurchaseInvoice.find({
          $or: [
            { 'supplier.partyId': seller.partyId },
            { partyName: seller.name } // Fallback for migration
          ],
          status: { $ne: 'Paid' },
          $expr: { $gt: ['$balanceAmount', 0] }
        });

        const totalUnpaid = unpaidInvoices.reduce(
          (sum, inv) => sum + (Number(inv.balanceAmount) || 0),
          0
        );

        const latestInvoice = unpaidInvoices.sort(
          (a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate)
        )[0];

        return {
          partyId: seller.partyId,
          name: seller.name,
          phone: seller.phone || '',
          email: seller.email || '',
          gstNumber: seller.gstNumber || '',
          balance: totalUnpaid,
          unpaidCount: unpaidInvoices.length,
          lastInvoiceDate: latestInvoice ? latestInvoice.invoiceDate : null,
          lastInvoiceNumber: latestInvoice ? latestInvoice.invoiceNumber : null
        };
      })
    );

    // Filter to show only sellers with unpaid amounts
    const activeSellers = sellersWithUnpaid.filter(s => s.balance > 0);

    return res.json({ sellers: activeSellers });
  } catch (error) {
    console.error('Get sellers with unpaid error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all sellers
app.get('/api/sellers', async (req, res) => {
  try {
    const sellers = await Seller.find().sort({ name: 1 });
    return res.json({
      sellers: sellers.map((seller) => ({
        partyId: seller.partyId,
        name: seller.name,
        phone: seller.phone ?? '',
        email: seller.email ?? '',
        balance: seller.balance ?? 0,
        gstNumber: seller.gstNumber ?? '',
        addressLine: seller.addressLine ?? '',
        city: seller.city ?? '',
        state: seller.state ?? '',
        postalCode: seller.postalCode ?? '',
        openingBalance: seller.openingBalance ?? 0,
        category: 'Supplier',
        type: 'Supplier',
      })),
    });
  } catch (error) {
    console.error('List sellers error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create seller
app.post('/api/sellers', async (req, res) => {
  try {
    const { name, phone, email, gstNumber, addressLine, city, state, postalCode, openingBalance } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Seller name is required' });
    }

    const trimmedName = name.trim();
    const trimmedGst = gstNumber?.trim().toUpperCase() ?? '';

    if (trimmedGst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/u.test(trimmedGst)) {
      return res.status(400).json({ message: 'Invalid GST number format' });
    }

    const seller = await Seller.create({
      name: trimmedName,
      phone: phone?.trim(),
      email: email?.trim(),
      gstNumber: trimmedGst,
      addressLine: addressLine?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      postalCode: postalCode?.trim(),
      openingBalance: openingBalance ?? 0,
      balance: openingBalance ?? 0,
    });

    return res.status(201).json({
      seller: {
        partyId: seller.partyId,
        name: seller.name,
        phone: seller.phone ?? '',
        email: seller.email ?? '',
        balance: seller.balance ?? 0,
        gstNumber: seller.gstNumber ?? '',
        addressLine: seller.addressLine ?? '',
        city: seller.city ?? '',
        state: seller.state ?? '',
        postalCode: seller.postalCode ?? '',
        openingBalance: seller.openingBalance ?? 0,
        category: 'Supplier',
        type: 'Supplier',
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Seller already exists' });
    }

    console.error('Create seller error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update seller
app.put('/api/sellers/:partyId', async (req, res) => {
  try {
    const { partyId } = req.params;
    const { name, phone, email, gstNumber, addressLine, city, state, postalCode, openingBalance } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Seller name is required' });
    }

    const trimmedGst = gstNumber?.trim().toUpperCase() ?? '';
    if (trimmedGst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/u.test(trimmedGst)) {
      return res.status(400).json({ message: 'Invalid GST number format' });
    }

    const seller = await Seller.findOneAndUpdate(
      { partyId },
      {
        name: name.trim(),
        phone: phone?.trim(),
        email: email?.trim(),
        gstNumber: trimmedGst,
        addressLine: addressLine?.trim(),
        city: city?.trim(),
        state: state?.trim(),
        postalCode: postalCode?.trim(),
        openingBalance: openingBalance ?? 0,
      },
      { new: true }
    );

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    return res.json({
      seller: {
        partyId: seller.partyId,
        name: seller.name,
        phone: seller.phone ?? '',
        email: seller.email ?? '',
        balance: seller.balance ?? 0,
        gstNumber: seller.gstNumber ?? '',
        addressLine: seller.addressLine ?? '',
        city: seller.city ?? '',
        state: seller.state ?? '',
        postalCode: seller.postalCode ?? '',
        openingBalance: seller.openingBalance ?? 0,
        category: 'Supplier',
        type: 'Supplier',
      },
    });
  } catch (error) {
    console.error('Update seller error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete seller
app.delete('/api/sellers/:partyId', async (req, res) => {
  try {
    const { partyId } = req.params;
    const seller = await Seller.findOneAndDelete({ partyId });

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    return res.json({ message: 'Seller deleted successfully' });
  } catch (error) {
    console.error('Delete seller error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ================== LEGACY PARTY API ROUTES (Backward Compatibility) ==================

app.get('/api/parties', async (req, res) => {
  try {
    // Fetch both buyers and sellers for backward compatibility
    const buyers = await Buyer.find().sort({ name: 1 });
    const sellers = await Seller.find().sort({ name: 1 });

    const parties = [
      ...buyers.map(b => ({
        partyId: b.partyId,
        name: b.name,
        phone: b.phone ?? '',
        email: b.email ?? '',
        balance: b.balance ?? 0,
        gstNumber: b.gstNumber ?? '',
        addressLine: b.addressLine ?? '',
        city: b.city ?? '',
        state: b.state ?? '',
        postalCode: b.postalCode ?? '',
        openingBalance: b.openingBalance ?? 0,
        category: 'Buyer',
        type: 'Customer',
      })),
      ...sellers.map(s => ({
        partyId: s.partyId,
        name: s.name,
        phone: s.phone ?? '',
        email: s.email ?? '',
        balance: s.balance ?? 0,
        gstNumber: s.gstNumber ?? '',
        addressLine: s.addressLine ?? '',
        city: s.city ?? '',
        state: s.state ?? '',
        postalCode: s.postalCode ?? '',
        openingBalance: s.openingBalance ?? 0,
        category: 'Supplier',
        type: 'Supplier',
      })),
    ];

    return res.json({ parties });
  } catch (error) {
    console.error('List parties error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/parties', async (req, res) => {
  try {
    const { name, phone, email, gstNumber, addressLine, city, state, postalCode, openingBalance, category } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Party name is required' });
    }

    if (!category || !['Buyer', 'Supplier'].includes(category)) {
      return res.status(400).json({ message: 'Valid category (Buyer/Supplier) is required' });
    }

    const trimmedName = name.trim();
    const trimmedGst = gstNumber?.trim().toUpperCase() ?? '';

    if (trimmedGst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/u.test(trimmedGst)) {
      return res.status(400).json({ message: 'Invalid GST number format' });
    }

    const Model = category === 'Buyer' ? Buyer : Seller;

    const party = await Model.create({
      name: trimmedName,
      phone: phone?.trim(),
      email: email?.trim(),
      gstNumber: trimmedGst,
      addressLine: addressLine?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      postalCode: postalCode?.trim(),
      openingBalance: openingBalance ?? 0,
      balance: openingBalance ?? 0,
    });

    return res.status(201).json({
      party: {
        partyId: party.partyId,
        name: party.name,
        phone: party.phone ?? '',
        email: party.email ?? '',
        balance: party.balance ?? 0,
        gstNumber: party.gstNumber ?? '',
        addressLine: party.addressLine ?? '',
        city: party.city ?? '',
        state: party.state ?? '',
        postalCode: party.postalCode ?? '',
        openingBalance: party.openingBalance ?? 0,
        category: category,
        type: category === 'Buyer' ? 'Customer' : 'Supplier',
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Party already exists' });
    }

    console.error('Create party error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update party (routes to correct model based on category)
app.put('/api/parties/:partyId', async (req, res) => {
  try {
    const { partyId } = req.params;
    const { name, phone, email, gstNumber, addressLine, city, state, postalCode, openingBalance, category } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Party name is required' });
    }

    if (!category || !['Buyer', 'Supplier'].includes(category)) {
      return res.status(400).json({ message: 'Valid category (Buyer/Supplier) is required' });
    }

    const trimmedGst = gstNumber?.trim().toUpperCase() ?? '';
    if (trimmedGst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/u.test(trimmedGst)) {
      return res.status(400).json({ message: 'Invalid GST number format' });
    }

    const Model = category === 'Buyer' ? Buyer : Seller;

    const party = await Model.findOneAndUpdate(
      { partyId },
      {
        name: name.trim(),
        phone: phone?.trim(),
        email: email?.trim(),
        gstNumber: trimmedGst,
        addressLine: addressLine?.trim(),
        city: city?.trim(),
        state: state?.trim(),
        postalCode: postalCode?.trim(),
        openingBalance: openingBalance ?? 0,
      },
      { new: true }
    );

    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }

    return res.json({
      party: {
        partyId: party.partyId,
        name: party.name,
        phone: party.phone ?? '',
        email: party.email ?? '',
        balance: party.balance ?? 0,
        gstNumber: party.gstNumber ?? '',
        addressLine: party.addressLine ?? '',
        city: party.city ?? '',
        state: party.state ?? '',
        postalCode: party.postalCode ?? '',
        openingBalance: party.openingBalance ?? 0,
        category: category,
        type: category === 'Buyer' ? 'Customer' : 'Supplier',
      },
    });
  } catch (error) {
    console.error('Update party error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get invoices/bills for a specific party
app.get('/api/parties/:partyId/invoices', async (req, res) => {
  try {
    const { partyId } = req.params;
    const { from, to } = req.query;

    // Build query to match customer.partyId
    const query = { 'customer.partyId': partyId };

    // Add date range filter if provided
    if (from || to) {
      query.invoiceDate = {};
      if (from) query.invoiceDate.$gte = new Date(from);
      if (to) query.invoiceDate.$lte = new Date(to);
    }

    // Fetch bills for this party
    const bills = await Bill.find(query).sort({ invoiceDate: -1 });

    // Format response to match what CustomerHistoryDrawer expects
    const invoices = bills.map(b => ({
      invoiceNumber: b.invoiceNumber,
      date: b.invoiceDate ? new Date(b.invoiceDate).toLocaleDateString('en-IN') : '-',
      invoiceDate: b.invoiceDate,
      items: b.items || [],
      itemCount: b.items?.length || 0,
      total: b.grandTotal || 0,
      amount: b.grandTotal || 0,
    }));

    return res.json({ invoices });
  } catch (error) {
    console.error('Get party invoices error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ================== STAFF API ROUTES ==================

// Get all staff
app.get('/api/staff', async (req, res) => {
  try {
    const staff = await Staff.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: staff.map(s => ({
        id: s.staffId,
        staffId: s.staffId,
        name: s.name,
        mobile: s.mobile,
        designation: s.designation,
        salaryType: s.salaryType,
        salaryAmount: s.salaryAmount,
        joiningDate: s.joiningDate,
        isActive: s.isActive,
      })),
    });
  } catch (error) {
    console.error('List staff error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create staff
app.post('/api/staff', async (req, res) => {
  try {
    const { staffId, name, mobile, designation, salaryType, salaryAmount, joiningDate, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Staff name is required' });
    }

    if (!mobile || !mobile.trim()) {
      return res.status(400).json({ message: 'Mobile number is required' });
    }

    if (!designation || !designation.trim()) {
      return res.status(400).json({ message: 'Designation is required' });
    }

    if (!salaryType || !['daily', 'monthly'].includes(salaryType)) {
      return res.status(400).json({ message: 'Valid salary type is required' });
    }

    if (!salaryAmount || salaryAmount <= 0) {
      return res.status(400).json({ message: 'Valid salary amount is required' });
    }

    const staff = await Staff.create({
      staffId: staffId || `STF${Date.now()}`,
      name: name.trim(),
      mobile: mobile.trim(),
      designation: designation.trim(),
      salaryType,
      salaryAmount: Number(salaryAmount),
      joiningDate: joiningDate || new Date(),
      isActive: isActive !== false,
    });

    res.status(201).json({
      success: true,
      data: {
        id: staff.staffId,
        staffId: staff.staffId,
        name: staff.name,
        mobile: staff.mobile,
        designation: staff.designation,
        salaryType: staff.salaryType,
        salaryAmount: staff.salaryAmount,
        joiningDate: staff.joiningDate,
        isActive: staff.isActive,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Staff ID already exists' });
    }
    console.error('Create staff error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update staff
app.put('/api/staff/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { name, mobile, designation, salaryType, salaryAmount, joiningDate, isActive } = req.body;

    const staff = await Staff.findOne({ staffId });

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    if (name) staff.name = name.trim();
    if (mobile) staff.mobile = mobile.trim();
    if (designation) staff.designation = designation.trim();
    if (salaryType) staff.salaryType = salaryType;
    if (salaryAmount) staff.salaryAmount = Number(salaryAmount);
    if (joiningDate) staff.joiningDate = joiningDate;
    if (isActive !== undefined) staff.isActive = isActive;

    await staff.save();

    res.json({
      success: true,
      data: {
        id: staff.staffId,
        staffId: staff.staffId,
        name: staff.name,
        mobile: staff.mobile,
        designation: staff.designation,
        salaryType: staff.salaryType,
        salaryAmount: staff.salaryAmount,
        joiningDate: staff.joiningDate,
        isActive: staff.isActive,
      },
    });
  } catch (error) {
    console.error('Update staff error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete staff
app.delete('/api/staff/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await Staff.findOneAndDelete({ staffId });

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    res.json({
      success: true,
      message: 'Staff deleted successfully',
    });
  } catch (error) {
    console.error('Delete staff error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ================== ATTENDANCE API ROUTES ==================

// Get all attendance records
app.get('/api/attendance', async (req, res) => {
  try {
    const records = await AttendanceRecord.find().sort({ date: -1 });
    res.json({
      success: true,
      data: records.map(r => ({
        date: r.date,
        attendance: Object.fromEntries(r.attendance),
      })),
    });
  } catch (error) {
    console.error('List attendance error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Save attendance for a date
app.post('/api/attendance', async (req, res) => {
  try {
    const { date, attendance } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    if (!attendance || typeof attendance !== 'object') {
      return res.status(400).json({ message: 'Valid attendance data is required' });
    }

    const existingRecord = await AttendanceRecord.findOne({ date });

    if (existingRecord) {
      existingRecord.attendance = new Map(Object.entries(attendance));
      await existingRecord.save();

      return res.json({
        success: true,
        data: {
          date: existingRecord.date,
          attendance: Object.fromEntries(existingRecord.attendance),
        },
      });
    }

    const record = await AttendanceRecord.create({
      date,
      attendance: new Map(Object.entries(attendance)),
    });

    res.status(201).json({
      success: true,
      data: {
        date: record.date,
        attendance: Object.fromEntries(record.attendance),
      },
    });
  } catch (error) {
    console.error('Save attendance error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ================== ADVANCE SALARY API ROUTES ==================

// Get all advance salaries
app.get('/api/advances', async (req, res) => {
  try {
    const advances = await AdvanceSalary.find().sort({ date: -1 });
    res.json({
      success: true,
      data: advances.map(a => ({
        id: a.advanceId,
        advanceId: a.advanceId,
        staffId: a.staffId,
        date: a.date,
        amount: a.amount,
        reason: a.reason,
        repaymentType: a.repaymentType,
        isPaid: a.isPaid,
      })),
    });
  } catch (error) {
    console.error('List advances error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create advance salary
app.post('/api/advances', async (req, res) => {
  try {
    const { advanceId, staffId, date, amount, reason, repaymentType } = req.body;

    if (!staffId) {
      return res.status(400).json({ message: 'Staff ID is required' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const advance = await AdvanceSalary.create({
      advanceId: advanceId || `ADV${Date.now()}`,
      staffId,
      date: date || new Date(),
      amount: Number(amount),
      reason: reason || '',
      repaymentType: repaymentType || 'monthly',
      isPaid: false,
    });

    res.status(201).json({
      success: true,
      data: {
        id: advance.advanceId,
        advanceId: advance.advanceId,
        staffId: advance.staffId,
        date: advance.date,
        amount: advance.amount,
        reason: advance.reason,
        repaymentType: advance.repaymentType,
        isPaid: advance.isPaid,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Advance ID already exists' });
    }
    console.error('Create advance error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update advance salary (mark as paid)
app.put('/api/advances/:advanceId', async (req, res) => {
  try {
    const { advanceId } = req.params;
    const { isPaid } = req.body;

    const advance = await AdvanceSalary.findOne({ advanceId });

    if (!advance) {
      return res.status(404).json({ message: 'Advance not found' });
    }

    if (isPaid !== undefined) advance.isPaid = isPaid;

    await advance.save();

    res.json({
      success: true,
      data: {
        id: advance.advanceId,
        advanceId: advance.advanceId,
        staffId: advance.staffId,
        date: advance.date,
        amount: advance.amount,
        reason: advance.reason,
        repaymentType: advance.repaymentType,
        isPaid: advance.isPaid,
      },
    });
  } catch (error) {
    console.error('Update advance error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete advance salary
app.delete('/api/advances/:advanceId', async (req, res) => {
  try {
    const { advanceId } = req.params;

    const advance = await AdvanceSalary.findOneAndDelete({ advanceId });

    if (!advance) {
      return res.status(404).json({ message: 'Advance not found' });
    }

    res.json({
      success: true,
      message: 'Advance deleted successfully',
    });
  } catch (error) {
    console.error('Delete advance error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ================== SALARY PAYMENT API ROUTES ==================

// Get all salary payments
app.get('/api/salary-payments', async (req, res) => {
  try {
    const payments = await SalaryPayment.find().sort({ paymentDate: -1 });
    res.json({
      success: true,
      data: payments.map(p => ({
        id: p.paymentId,
        paymentId: p.paymentId,
        staffId: p.staffId,
        paymentDate: p.paymentDate,
        amount: p.amount,
        periodFrom: p.periodFrom,
        periodTo: p.periodTo,
        notes: p.notes,
      })),
    });
  } catch (error) {
    console.error('List salary payments error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create salary payment
app.post('/api/salary-payments', async (req, res) => {
  try {
    const { paymentId, staffId, paymentDate, amount, periodFrom, periodTo, notes } = req.body;

    if (!staffId) {
      return res.status(400).json({ message: 'Staff ID is required' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    if (!periodFrom || !periodTo) {
      return res.status(400).json({ message: 'Period dates are required' });
    }

    const payment = await SalaryPayment.create({
      paymentId: paymentId || `PAY${Date.now()}`,
      staffId,
      paymentDate: paymentDate || new Date(),
      amount: Number(amount),
      periodFrom: new Date(periodFrom),
      periodTo: new Date(periodTo),
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      data: {
        id: payment.paymentId,
        paymentId: payment.paymentId,
        staffId: payment.staffId,
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        periodFrom: payment.periodFrom,
        periodTo: payment.periodTo,
        notes: payment.notes,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Payment ID already exists' });
    }
    console.error('Create salary payment error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete salary payment
app.delete('/api/salary-payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await SalaryPayment.findOneAndDelete({ paymentId });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json({
      success: true,
      message: 'Payment deleted successfully',
    });
  } catch (error) {
    console.error('Delete salary payment error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Friendly root route so visiting the server root (or a public tunnel URL)
// shows a useful message instead of Express's default "Cannot GET /".
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Billing System API</title></head>
      <body style="font-family:system-ui,Segoe UI,Arial,sans-serif;padding:2rem;color:#0f172a;">
        <h2>Billing System API</h2>
        <p>Server is running. Try the <a href="/api/health">/api/health</a> endpoint.</p>
      </body>
    </html>
  `);
});


