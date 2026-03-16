
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

const userSchema = new mongoose.Schema({
    email: String,
    role: String
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function checkUsers() {
    try {
        console.log('Connecting to:', MONGODB_URI.replace(/:([^:@]+)@/, ':****@'));
        await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
        console.log('Connected.');

        const users = await User.find({});
        console.log('Users found in DB:', users.length);
        console.log(JSON.stringify(users, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkUsers();
