import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import BuyTicket from "./pages/BuyTicket";
import FakePayment from "./pages/FakePayment";
import AdminPanel from "./pages/AdminPanel";
import CheckIn from "./pages/CheckIn";  // ✅ make sure this exists
import ServiceCheck from "./pages/ServiceCheck";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/buy" element={<BuyTicket />} />
        <Route path="/fake-payment" element={<FakePayment />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/service-check" element={<ServiceCheck />} />
      </Routes>
    </Router>
  );
}

export default App;
