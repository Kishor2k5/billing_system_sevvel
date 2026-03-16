# Buyer & Seller Separation Implementation

## Overview
This document explains the implementation of separate Buyer and Seller tables in the application, replacing the single "parties" table with category-based routing.

---

## 📊 Database Schema (MongoDB)

### Buyer Schema
```javascript
{
  partyId: String (unique, auto-generated),
  name: String (required),
  phone: String,
  email: String,
  balance: Number (default: 0),
  gstNumber: String (validated GST format),
  addressLine: String,
  city: String,
  state: String,
  postalCode: String,
  openingBalance: Number (default: 0),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### Seller Schema
```javascript
{
  partyId: String (unique, auto-generated),
  name: String (required),
  phone: String,
  email: String,
  balance: Number (default: 0),
  gstNumber: String (validated GST format),
  addressLine: String,
  city: String,
  state: String,
  postalCode: String,
  openingBalance: Number (default: 0),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Note:** Both schemas are identical - separation is logical, not structural.

---

## 🔌 Backend API Endpoints

### Buyer Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/buyers` | Get all buyers |
| POST | `/api/buyers` | Create a new buyer |
| PUT | `/api/buyers/:partyId` | Update a buyer |
| DELETE | `/api/buyers/:partyId` | Delete a buyer |

### Seller Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sellers` | Get all sellers |
| POST | `/api/sellers` | Create a new seller |
| PUT | `/api/sellers/:partyId` | Update a seller |
| DELETE | `/api/sellers/:partyId` | Delete a seller |

### Legacy Party Endpoints (Backward Compatibility)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/parties` | Get all parties (buyers + sellers combined) |
| POST | `/api/parties` | Create buyer/seller based on category |
| PUT | `/api/parties/:partyId` | Update party (routes to correct model) |

---

## 🎯 Category-Based Routing Logic

### How It Works

1. **User selects category** in the form:
   - `Buyer` → Customer/Client
   - `Supplier` → Vendor/Seller

2. **Backend detects category** and routes to appropriate model:
```javascript
const Model = category === 'Buyer' ? Buyer : Seller;
await Model.create({ ...partyData });
```

3. **Data is saved** to the corresponding MongoDB collection:
   - Buyers → `buyers` collection
   - Suppliers → `sellers` collection

---

## 💻 Frontend Implementation

### Add/Edit Party Form

The `PartyDrawer` component handles both creation and editing:

```javascript
// Form state includes category
const [formData, setFormData] = useState({
  name: '',
  phone: '',
  email: '',
  category: '', // 'Buyer' or 'Supplier'
  addressLine: '',
  gstNumber: '',
  openingBalance: 0,
});

// Submit handler sends category to backend
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const response = await fetch('/api/parties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...formData,
      category: formData.category, // Required field
    }),
  });
};
```

### Category Filter

Users can filter the parties table by category:

```javascript
const [categoryFilter, setCategoryFilter] = useState(''); // '', 'Buyer', or 'Supplier'

const filteredParties = useMemo(() => {
  if (!categoryFilter) return parties; // Show all
  return parties.filter(p => p.category === categoryFilter);
}, [parties, categoryFilter]);
```

### Display

The Parties page displays:
- **All parties** by default (buyers + sellers)
- **Filter dropdown** to show only Buyers or Suppliers
- **Category badge** in each row showing if it's a Buyer or Supplier

---

## 🔒 Validation & Error Handling

### Backend Validation

1. **Required Fields:**
   - `name` - Cannot be empty
   - `category` - Must be 'Buyer' or 'Supplier'

2. **GST Number Validation:**
   ```javascript
   /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
   ```

3. **Duplicate Prevention:**
   - Unique `partyId` prevents duplicates
   - MongoDB handles with unique index

### Frontend Validation

```javascript
if (!formData.name.trim()) {
  setError('Party name is required');
  return;
}

if (!formData.category) {
  setError('Please select a category (Buyer or Supplier)');
  return;
}
```

---

## 🚀 Usage Examples

### Creating a Buyer (Customer)

```javascript
POST /api/parties
{
  "name": "ABC Corporation",
  "phone": "9876543210",
  "email": "contact@abc.com",
  "category": "Buyer",
  "addressLine": "123 Main St",
  "gstNumber": "27AABCU9603R1ZX",
  "openingBalance": 5000
}

// Response
{
  "party": {
    "partyId": "64f8c9a2b3e1d2c4a5f6g7h8",
    "name": "ABC Corporation",
    "category": "Buyer",
    "type": "Customer",
    ...
  }
}
```

### Creating a Seller (Supplier)

```javascript
POST /api/parties
{
  "name": "XYZ Suppliers",
  "phone": "9876543211",
  "email": "sales@xyz.com",
  "category": "Supplier",
  "addressLine": "456 Market Rd",
  "gstNumber": "29AABCX9603R1ZY",
  "openingBalance": 0
}

// Response
{
  "party": {
    "partyId": "64f8c9a2b3e1d2c4a5f6g7h9",
    "name": "XYZ Suppliers",
    "category": "Supplier",
    "type": "Supplier",
    ...
  }
}
```

---

## 📈 Benefits of This Implementation

1. **Logical Separation:** Buyers and Sellers are in separate collections
2. **Type Safety:** Category validation prevents wrong data in wrong tables
3. **Backward Compatible:** Old `/api/parties` still works
4. **Scalable:** Easy to add category-specific fields later
5. **Clean UI:** Users can filter by category easily
6. **Single Form:** One form handles both buyers and sellers

---

## 🔄 Migration Strategy

If you have existing data in the old `parties` table:

1. **Keep old Party model** for backward compatibility
2. **Fetch old parties** and categorize them
3. **Migrate to new tables:**
   ```javascript
   const oldParties = await Party.find();
   
   for (const party of oldParties) {
     const isBuyer = party.type === 'Customer';
     const Model = isBuyer ? Buyer : Seller;
     
     await Model.create({
       ...party.toObject(),
       category: isBuyer ? 'Buyer' : 'Supplier',
     });
   }
   ```

---

## 🛠️ Tech Stack

- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Frontend:** React + React Hooks
- **Database:** MongoDB (separate collections)
- **Validation:** Custom validators + Mongoose schema validation

---

## ✅ Testing Checklist

- [ ] Create a buyer and verify it appears in buyers table
- [ ] Create a seller and verify it appears in sellers table
- [ ] Edit a buyer and verify changes are saved
- [ ] Edit a seller and verify changes are saved
- [ ] Filter by "Buyer" category - only buyers shown
- [ ] Filter by "Supplier" category - only sellers shown
- [ ] Filter by "All" - both buyers and sellers shown
- [ ] Validate GST number format
- [ ] Test required field validation
- [ ] Test duplicate prevention

---

## 📝 Summary

This implementation provides a **clean, scalable, and production-ready** solution for managing Buyers and Sellers separately while maintaining a unified user experience. The category-based routing ensures data integrity and logical separation without code duplication.
