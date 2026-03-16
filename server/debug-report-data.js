
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

// Define Schemas (Simplified)
const billItemSchema = new mongoose.Schema({}, { _id: false, strict: false });
const billSchema = new mongoose.Schema({
    items: [billItemSchema]
}, { strict: false });

const purchaseItemSchema = new mongoose.Schema({}, { _id: false, strict: false });
const purchaseInvoiceSchema = new mongoose.Schema({
    items: [purchaseItemSchema]
}, { strict: false });

const Bill = mongoose.model('Bill', billSchema);
const PurchaseInvoice = mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);

async function debugData() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
        console.log('Connected.');

        console.log('\n--- SALES (BILLS) DEBUG ---');
        const bills = await Bill.find().sort({ createdAt: -1 }).limit(3).lean();
        if (bills.length === 0) console.log('No bills found.');

        bills.forEach((bill, i) => {
            console.log(`\nBill #${i + 1} (Inv: ${bill.invoiceNumber}):`);
            if (bill.items && bill.items.length > 0) {
                console.log('Item 0:', JSON.stringify(bill.items[0], null, 2));
            } else {
                console.log('No items in this bill.');
            }
        });

        console.log('\n--- PURCHASE INVOICES DEBUG ---');
        const purchases = await PurchaseInvoice.find().sort({ createdAt: -1 }).limit(3).lean();
        if (purchases.length === 0) console.log('No purchase invoices found.');

        purchases.forEach((p, i) => {
            console.log(`\nPurchase #${i + 1} (Inv: ${p.invoiceNumber}):`);
            if (p.items && p.items.length > 0) {
                console.log('Item 0:', JSON.stringify(p.items[0], null, 2));
            } else {
                console.log('No items in this purchase.');
            }
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

debugData();
