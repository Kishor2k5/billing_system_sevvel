import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

// Define schemas
const partyCommonFields = {
  partyId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true,
  },
  addressLine: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  postalCode: {
    type: String,
    trim: true,
  },
  openingBalance: {
    type: Number,
    default: 0,
  },
};

const buyerSchema = new mongoose.Schema(partyCommonFields, { timestamps: true });
const sellerSchema = new mongoose.Schema(partyCommonFields, { timestamps: true });
const partySchema = new mongoose.Schema(partyCommonFields, { timestamps: true });

const Buyer = mongoose.model('Buyer', buyerSchema);
const Seller = mongoose.model('Seller', sellerSchema);
const Party = mongoose.model('Party', partySchema);

async function migrateData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
    });
    console.log('✅ Connected to MongoDB');

    // Check existing collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('\n📊 Existing collections:', collectionNames);

    // Check if parties collection exists
    const hasParties = collectionNames.includes('parties');
    const hasBuyers = collectionNames.includes('buyers');
    const hasSellers = collectionNames.includes('sellers');

    console.log('\n📋 Collection Status:');
    console.log(`  - parties: ${hasParties ? '✓ exists' : '✗ not found'}`);
    console.log(`  - buyers: ${hasBuyers ? '✓ exists' : '✗ not found'}`);
    console.log(`  - sellers: ${hasSellers ? '✓ exists' : '✗ not found'}`);

    if (hasParties) {
      const partiesCount = await Party.countDocuments();
      console.log(`\n📦 Found ${partiesCount} records in parties collection`);

      if (partiesCount > 0) {
        console.log('\n🔄 Migrating data from parties to buyers and sellers...');

        const parties = await Party.find();
        let buyersCount = 0;
        let sellersCount = 0;

        for (const party of parties) {
          const partyData = party.toObject();
          delete partyData._id; // Remove MongoDB ID to let it auto-generate

          // Determine if it's a buyer or seller (default to buyer for existing data)
          const category = partyData.category || partyData.type;
          const isBuyer = !category || category === 'Buyer' || category === 'Customer';

          if (isBuyer) {
            // Check if already exists in buyers
            const existingBuyer = await Buyer.findOne({ partyId: partyData.partyId });
            if (!existingBuyer) {
              await Buyer.create(partyData);
              buyersCount++;
            }
          } else {
            // Check if already exists in sellers
            const existingSeller = await Seller.findOne({ partyId: partyData.partyId });
            if (!existingSeller) {
              await Seller.create(partyData);
              sellersCount++;
            }
          }
        }

        console.log(`✅ Migrated ${buyersCount} buyers`);
        console.log(`✅ Migrated ${sellersCount} sellers`);

        // Ask to keep or drop old collection
        console.log('\n⚠️  Old parties collection still exists.');
        console.log('   You can manually drop it using: db.parties.drop()');
        console.log('   Or keep it for backup.');
      }
    } else {
      console.log('\n✨ No parties collection found. Creating fresh buyers and sellers collections...');
      
      // Create sample data to initialize collections
      const sampleBuyer = await Buyer.create({
        partyId: new mongoose.Types.ObjectId().toHexString(),
        name: 'Sample Buyer',
        phone: '1234567890',
        email: 'buyer@example.com',
        openingBalance: 0,
      });
      console.log('✅ Created sample buyer:', sampleBuyer.name);

      const sampleSeller = await Seller.create({
        partyId: new mongoose.Types.ObjectId().toHexString(),
        name: 'Sample Supplier',
        phone: '0987654321',
        email: 'supplier@example.com',
        openingBalance: 0,
      });
      console.log('✅ Created sample seller:', sampleSeller.name);
    }

    // Show final collection status
    const finalCollections = await mongoose.connection.db.listCollections().toArray();
    const finalCollectionNames = finalCollections.map(c => c.name);
    
    console.log('\n📊 Final collections:', finalCollectionNames);
    
    const buyersCount = await Buyer.countDocuments();
    const sellersCount = await Seller.countDocuments();
    
    console.log(`\n📈 Summary:`);
    console.log(`   Buyers: ${buyersCount}`);
    console.log(`   Sellers: ${sellersCount}`);

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration
migrateData();
