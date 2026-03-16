import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

const sellerSchema = new mongoose.Schema({
  partyId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  phone: String,
  email: String,
  gstNumber: String,
  balance: { type: Number, default: 0 }
});

const purchaseItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const purchaseInvoiceSchema = new mongoose.Schema({
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
  status: { type: String, enum: ['Paid', 'Unpaid', 'Partially Paid'], default: 'Unpaid' }
}, { timestamps: true });

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
    console.log('✓ Connected to MongoDB');

    const Seller = mongoose.model('Seller', sellerSchema);
    const PurchaseInvoice = mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);

    console.log('Starting migration...');

    const invoices = await PurchaseInvoice.find({});
    console.log(`Found ${invoices.length} purchase invoices`);

    let migratedCount = 0;

    for (const invoice of invoices) {
      let updated = false;

      // Add supplier partyId if missing
      if (!invoice.supplier || !invoice.supplier.partyId) {
        const seller = await Seller.findOne({ name: invoice.partyName });
        if (seller) {
          invoice.supplier = {
            partyId: seller.partyId,
            name: invoice.partyName
          };
          updated = true;
        }
      }

      // Set balanceAmount if missing
      if (!invoice.balanceAmount) {
        invoice.balanceAmount = invoice.totalAmount - (invoice.paidAmount || 0);
        updated = true;
      }

      // Update status
      if (invoice.balanceAmount <= 0.01) {
        invoice.status = 'Paid';
      } else if (invoice.paidAmount > 0) {
        invoice.status = 'Partially Paid';
      } else {
        invoice.status = 'Unpaid';
      }

      if (updated) {
        await invoice.save();
        migratedCount++;
      }
    }

    console.log(`✓ Migration completed. Updated: ${migratedCount} invoices`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
