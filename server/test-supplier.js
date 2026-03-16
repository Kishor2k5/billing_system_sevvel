async function testCreateSupplier() {
  try {
    const response = await fetch('http://localhost:5000/api/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Supplier Company',
        phone: '9876543210',
        email: 'supplier@test.com',
        category: 'Supplier',
        addressLine: 'Test Address',
        gstNumber: '',
        openingBalance: 0,
      }),
    });

    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Supplier created successfully!');
      console.log('Party ID:', data.party.partyId);
    } else {
      console.log('\n❌ Failed to create supplier');
      console.log('Error:', data.message);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testCreateSupplier();
