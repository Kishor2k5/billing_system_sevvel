import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generate(output = 'invoice.pdf') {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const filePath = path.join(__dirname, '..', 'client', 'print-invoice', 'invoice-template.html');
  await page.goto('file://' + filePath, { waitUntil: 'networkidle0' });

  // Ensure background graphics and fine A4 settings
  await page.pdf({ path: output, format: 'A4', printBackground: true, margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' } });

  await browser.close();
  console.log('PDF generated:', output);
}

// Run if invoked directly
if (process.argv[1].endsWith('generate_invoice_pdf.js')) {
  const out = process.argv[2] || 'sevvel-invoice.pdf';
  generate(out).catch((err) => { console.error(err); process.exit(1); });
}

export default generate;