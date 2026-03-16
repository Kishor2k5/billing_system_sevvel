import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'src', '.env') });
// fallback if .env is in root of server
dotenv.config({ path: path.join(__dirname, '.env') });

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

const buyerSchema = new mongoose.Schema({
    partyId: String,
    name: String,
    balance: { type: Number, default: 0 }
}, { timestamps: true });

const billSchema = new mongoose.Schema({
    invoiceNumber: String,
    customer: {
        partyId: String,
        name: String
    },
    status: String,
    grandTotal: Number,
    balanceAmount: Number,
    paidAmount: Number
}, { timestamps: true });

const Buyer = mongoose.models.Buyer || mongoose.model('Buyer', buyerSchema);
const Bill = mongoose.models.Bill || mongoose.model('Bill', billSchema);

async function run() {
    try {
        if (!MONGODB_URI) throw new Error('MONGODB_URI is missing');

        await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
        console.log('Connected.');

        const buyers = await Buyer.find({});
        console.log(`Found ${buyers.length} buyers.`);

        const bills = await Bill.find({});
        console.log(`Found ${bills.length} bills.`);

        for (const buyer of buyers) {
            const buyerBills = bills.filter(b => b.customer && b.customer.partyId === buyer.partyId);
            const unpaidBills = buyerBills.filter(b => b.status !== 'Paid');

            const actualPending = unpaidBills.reduce((sum, b) => sum + (b.balanceAmount || b.grandTotal || 0), 0);

            console.log(`Buyer: ${buyer.name} | Stored Balance: ${buyer.balance} | Calc Pending: ${actualPending} | Unpaid Bills: ${unpaidBills.length}`);

            if (Math.abs(buyer.balance - actualPending) > 1) {
                console.log(`--> FIXING BALANCE for ${buyer.name}...`);
                buyer.balance = actualPending;
                await buyer.save();
                console.log('--> Fixed.');
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
