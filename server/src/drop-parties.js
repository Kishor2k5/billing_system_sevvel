import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

async function dropPartiesCollection() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
    });
    console.log('✅ Connected to MongoDB');

    const collections = await mongoose.connection.db.listCollections().toArray();
    const hasParties = collections.some(c => c.name === 'parties');

    if (hasParties) {
      console.log('🗑️  Dropping parties collection...');
      await mongoose.connection.db.dropCollection('parties');
      console.log('✅ Parties collection dropped successfully!');
    } else {
      console.log('ℹ️  Parties collection does not exist.');
    }

    const finalCollections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📊 Remaining collections:', finalCollections.map(c => c.name));
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

dropPartiesCollection();
