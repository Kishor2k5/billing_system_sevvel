import mongoose from 'mongoose';

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is missing');
  process.exit(1);
}

await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });

const collections = await mongoose.connection.db.listCollections().toArray();
console.log('All collections:', collections.map(c => c.name));

const sellers = await mongoose.connection.db.collection('sellers').find().toArray();
console.log('\nSellers count:', sellers.length);
if (sellers.length > 0) {
  console.log('Sellers:', JSON.stringify(sellers, null, 2));
}

const buyers = await mongoose.connection.db.collection('buyers').find().toArray();
console.log('\nBuyers count:', buyers.length);

await mongoose.connection.close();
