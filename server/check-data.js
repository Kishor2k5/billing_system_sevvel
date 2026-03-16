import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Connection error:', err));

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
    grandTotal: { type: Number, required: true },
}, { timestamps: true });

const Bill = mongoose.model('Bill', billSchema);

const buyerSchema = new mongoose.Schema({
    partyId: String,
    name: String,
    balance: Number
}, { timestamps: true });

const Buyer = mongoose.model('Buyer', buyerSchema);

async function checkData() {
    try {
        const bills = await Bill.find({});
        console.log(`Total Bills: ${bills.length}`);

        const unpaidBills = bills.filter(b => b.status !== 'Paid');
        console.log(`Unpaid/Partial Bills: ${unpaidBills.length}`);

        unpaidBills.forEach(b => {
            console.log(`Bill ${b.invoiceNumber}: Status=${b.status}, Balance=${b.balanceAmount}, PartyId=${b.customer.partyId}, CustomerName=${b.customer.name}`);
        });

        const customers = await Buyer.find({});
        console.log(`Total Buyers: ${customers.length}`);
        customers.forEach(c => {
            console.log(`Buyer ${c.name} (${c.partyId}): Balance=${c.balance}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
}

checkData();
