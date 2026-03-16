async function testGetAllParties() {
  try {
    const response = await fetch('http://localhost:5000/api/parties');
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Total parties:', data.parties?.length || 0);
    console.log('\nParties by category:');
    
    const buyers = data.parties?.filter(p => p.category === 'Buyer') || [];
    const suppliers = data.parties?.filter(p => p.category === 'Supplier') || [];
    
    console.log('Buyers:', buyers.length);
    console.log('Suppliers:', suppliers.length);
    
    console.log('\nSuppliers:');
    suppliers.forEach(s => console.log(`  - ${s.name} (${s.phone})`));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGetAllParties();
