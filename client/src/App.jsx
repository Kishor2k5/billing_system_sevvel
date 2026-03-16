import { Route, Routes } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import SalesInvoice from './pages/SalesInvoice.jsx';
import Items from './pages/Items.jsx';
import AddItem from './pages/AddItem.jsx';
import ItemReportPage from './pages/ItemReportPage.jsx';
import RecycleBinPage from './pages/RecycleBinPage.jsx';
import Parties from './pages/Parties.jsx';
import StaffAttendance from './pages/StaffAttendance.jsx';
import PurchaseInvoices from './pages/PurchaseInvoices.jsx';
import CreatePurchaseInvoice from './pages/CreatePurchaseInvoice.jsx';
import Bills from './pages/Bills.jsx';
import DeliveryChallan from './pages/DeliveryChallan.jsx';
import Reports from './pages/Reports.jsx';
import PaymentIn from './pages/PaymentIn.jsx';
import PaymentOut from './pages/PaymentOut.jsx';
import CashAndBank from './pages/CashAndBank.jsx';
import Settings from './pages/Settings.jsx';
import Layout from './components/Layout';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/sales-invoice" element={<SalesInvoice />} />
        <Route path="/delivery-challan" element={<DeliveryChallan />} />
        <Route path="/purchase-invoices" element={<PurchaseInvoices />} />
        <Route path="/purchase-invoices/create" element={<CreatePurchaseInvoice />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/staff-attendance" element={<StaffAttendance />} />
        <Route path="/items" element={<Items />} />
        <Route path="/items/add" element={<AddItem />} />
        <Route path="/items/report/:itemId" element={<ItemReportPage />} />
        <Route path="/items/recycle-bin" element={<RecycleBinPage />} />
        <Route path="/parties" element={<Parties />} />
        <Route path="/payment-in" element={<PaymentIn />} />
        <Route path="/payment-out" element={<PaymentOut />} />
        <Route path="/cash-and-bank" element={<CashAndBank />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
