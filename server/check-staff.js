import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

async function checkStaff() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
    console.log('Connected to MongoDB\n');

    // Check staffs collection
    const staffsCount = await mongoose.connection.db.collection('staffs').countDocuments();
    console.log(`Staffs collection count: ${staffsCount}`);

    if (staffsCount > 0) {
      const staffs = await mongoose.connection.db.collection('staffs').find().toArray();
      console.log('\nStaff Members in Database:');
      staffs.forEach(s => {
        console.log(`  ${s.staffId} - ${s.name} (${s.designation}) - ${s.salaryType} ₹${s.salaryAmount}`);
      });
    } else {
      console.log('\n⚠ No staff records found in database.');
      console.log('The staffs collection exists but is empty.');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkStaff();
