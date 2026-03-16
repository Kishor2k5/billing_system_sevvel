async function testGetSellers() {
  try {
    const response = await fetch('http://localhost:5000/api/sellers');
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Sellers:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGetSellers();
