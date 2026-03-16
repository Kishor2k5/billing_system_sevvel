
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

// Define Schemas (Simplified) - using strict: false to capture all fields
const billSchema = new mongoose.Schema({}, { strict: false });
const purchaseInvoiceSchema = new mongoose.Schema({}, { strict: false });

const Bill = mongoose.model('Bill', billSchema);
// Clean up model registration if it conflicts
delete mongoose.models.PurchaseInvoice;
const PurchaseInvoice = mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);

async function debugData() {
    try {
        await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
        console.log('Connected.');

        console.log('\n--- SALES (BILLS) KEYS ---');
        const bills = await Bill.find().sort({ createdAt: -1 }).limit(1).lean();
        if (bills.length > 0) {
            const item = bills[0].items[0];
            console.log('Bill Item Keys:', Object.keys(item));
            console.log('Bill Item Full:', JSON.stringify(item, null, 2));
        }

        console.log('\n--- PURCHASE KEYS ---');
        const purchases = await PurchaseInvoice.find().sort({ createdAt: -1 }).limit(1).lean();
        if (purchases.length > 0) {
            const item = purchases[0].items[0];
            console.log('Purchase Item Keys:', Object.keys(item));
            console.log('Purchase Item Full:', JSON.stringify(item, null, 2));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

debugData();
