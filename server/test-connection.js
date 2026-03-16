
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { MONGODB_URI } = process.env;

console.log('Testing connection to:', MONGODB_URI.replace(/:([^:@]+)@/, ':****@')); // Hide password in logs

async function testConnection() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Successfully connected to MongoDB Atlas!');
        await mongoose.connection.close();
    } catch (err) {
        console.error('Connection failed:', err.message);
        if (err.codeName === 'AtlasError') {
            console.error('Error Code:', err.code);
            console.error('Code Name:', err.codeName);
            console.error('Full Error:', JSON.stringify(err, null, 2));
        }
        process.exit(1);
    }
}

testConnection();
