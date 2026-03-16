
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

// Define Schemas (Simplified) - strict: false
const billSchema = new mongoose.Schema({}, { strict: false });
const purchaseInvoiceSchema = new mongoose.Schema({}, { strict: false });

const Bill = mongoose.model('Bill', billSchema);
delete mongoose.models.PurchaseInvoice;
const PurchaseInvoice = mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);

async function debugValues() {
    try {
        await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
        console.log('Connected to DB.');

        const bills = await Bill.find().sort({ createdAt: -1 }).limit(5).lean();
        console.log(`\nFound ${bills.length} bills.`);

        bills.forEach((bill, idx) => {
            console.log(`\nBill #${idx + 1} [${bill.invoiceNumber}]:`);
            if (bill.items && bill.items.length > 0) {
                const item = bill.items[0];
                console.log(`  Item[0]:`);
                console.log(`    quantity: ${item.quantity} (type: ${typeof item.quantity})`);
                console.log(`    qty: ${item.qty} (type: ${typeof item.qty})`);
                console.log(`    price: ${item.price} (type: ${typeof item.price})`);
                console.log(`    rate: ${item.rate} (type: ${typeof item.rate})`);
                console.log(`    salePrice: ${item.salePrice} (type: ${typeof item.salePrice})`);
                console.log(`    tax: ${item.tax} (type: ${typeof item.tax})`);
                console.log(`    gst: ${item.gst} (type: ${typeof item.gst})`);
                console.log(`    amount: ${item.amount} (type: ${typeof item.amount})`);

                // Simulate calculation
                const q = Number(item.quantity) || Number(item.qty) || 0;
                const r = Number(item.price) || Number(item.rate) || 0;
                console.log(`    Calculated -> q: ${q}, r: ${r}, total: ${q * r}`);
            } else {
                console.log('  No items.');
            }
        });

        const purchases = await PurchaseInvoice.find().sort({ createdAt: -1 }).limit(5).lean();
        console.log(`\nFound ${purchases.length} purchases.`);
        purchases.forEach((p, idx) => {
            console.log(`\nPurchase #${idx + 1} [${p.invoiceNumber}]:`);
            if (p.items && p.items.length > 0) {
                const item = p.items[0];
                console.log(`  Item[0]:`);
                console.log(`    quantity: ${item.quantity}`);
                console.log(`    qty: ${item.qty}`);
                console.log(`    price: ${item.price}`);
                console.log(`    rate: ${item.rate}`);
                console.log(`    amount: ${item.amount}`);
                // Simulate calculation
                const q = Number(item.quantity) || Number(item.qty) || 0;
                const r = Number(item.price) || Number(item.rate) || 0;
                console.log(`    Calculated -> q: ${q}, r: ${r}, total: ${q * r}`);
            } else {
                console.log('  No items.');
            }
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

debugValues();
