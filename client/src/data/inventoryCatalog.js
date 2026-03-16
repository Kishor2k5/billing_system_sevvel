export const inventoryCatalog = [
  { id: 'inv-1', name: 'CLG Selling', code: 'CLG-001', category: 'General', salePrice: 0, purchasePrice: 0, stock: 0, unit: 'PCS' },
  { id: 'inv-2', name: 'E Way Bill', code: 'EWB-104', category: 'Services', salePrice: 53.1, purchasePrice: 21, stock: 45, unit: 'PCS' },
  { id: 'inv-3', name: 'Ellastic', code: 'EL-301', category: 'Textiles', salePrice: 0, purchasePrice: 1500, stock: 5, unit: 'MTR' },
  { id: 'inv-4', name: 'Kids Sleeveless L Size', code: 'KS-L', category: 'Garments', salePrice: 28, purchasePrice: 20, stock: 1100, unit: 'PCS' },
  { id: 'inv-5', name: 'Kids Sleeveless S Size', code: 'KS-S', category: 'Garments', salePrice: 23.1, purchasePrice: 18, stock: 0, unit: 'PCS' },
  { id: 'inv-6', name: 'Plain Fabrics', code: 'PF-12', category: 'Textiles', salePrice: 0, purchasePrice: 350, stock: 0, unit: 'KGS' },
  { id: 'inv-7', name: 'Pyjama 3/4', code: 'PJ-34', category: 'Garments', salePrice: 73.5, purchasePrice: 63, stock: 19999, unit: 'PCS' },
  { id: 'inv-8', name: 'Samsung Charger', code: 'SC-01', category: 'Electronics', salePrice: 1399, purchasePrice: 1050, stock: -1, unit: 'PCS' },
  { id: 'inv-9', name: 'Shorts Size', code: 'SH-10', category: 'Garments', salePrice: 10.5, purchasePrice: 8, stock: 8038, unit: 'PCS' },
  { id: 'inv-10', name: 'Sleeveless L Size', code: 'SL-L', category: 'Garments', salePrice: 31.5, purchasePrice: 24, stock: 0, unit: 'PCS' },
  { id: 'inv-11', name: 'Sleeveless S Size', code: 'SL-S', category: 'Garments', salePrice: 16.05, purchasePrice: 12, stock: -14000, unit: 'PCS' },
];

export const calculateStockValue = (items) =>
  items.reduce((accumulator, item) => accumulator + (item.purchasePrice || 0) * Math.max(item.stock, 0), 0);
