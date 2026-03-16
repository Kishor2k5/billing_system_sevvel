import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

// Simplified schemas matching the main app
const billSchema = new mongoose.Schema({
    invoiceNumber: String,
    customer: {
        partyId: String,
        name: String
    },
    status: String,
    balanceAmount: Number,
    grandTotal: Number
}, { timestamps: true });

const buyerSchema = new mongoose.Schema({
    partyId: String,
    name: String,
    balance: { type: Number, default: 0 }
}, { timestamps: true });

// Register models
const Bill = mongoose.model('Bill', billSchema);
// Try to register 'Buyer' only if not already registed (check-data might run standalone but let's be safe)
const Buyer = mongoose.models.Buyer || mongoose.model('Buyer', buyerSchema);

async function checkData() {
    try {
        await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
        console.log('Connected to MongoDB');

        const bills = await Bill.find({});
        console.log(`Total Bills: ${bills.length}`);

        // Check for bills with missing partyId
        const missingPartyId = bills.filter(b => !b.customer || !b.customer.partyId);
        console.log(`Bills with missing customer/partyId: ${missingPartyId.length}`);

        if (missingPartyId.length > 0) {
            console.log('Sample bill with missing partyId:', JSON.stringify(missingPartyId[0], null, 2));
        }

        // Check balances
        const buyers = await Buyer.find({});
        console.log(`Total Buyers: ${buyers.length}`);

        for (const buyer of buyers) {
            console.log(`Buyer: ${buyer.name}, ID: ${buyer.partyId}, Balance: ${buyer.balance}`);

            // Manually calc pending
            const pendingBills = bills.filter(b =>
                b.customer && b.customer.partyId === buyer.partyId && b.status !== 'Paid'
            );

            const totalPending = pendingBills.reduce((sum, b) => sum + (b.balanceAmount || b.grandTotal || 0), 0);
            console.log(`  -> Calculated Pending from Bills: ${totalPending}`);

            if (Math.abs(buyer.balance - totalPending) > 1) {
                console.warn(`  MISMATCH! stored=${buyer.balance}, calc=${totalPending}`);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkData();
