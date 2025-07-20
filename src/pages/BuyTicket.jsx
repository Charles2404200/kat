import { useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function BuyTicket() {
  const [email, setEmail] = useState("");
  const [ticketType, setTicketType] = useState("standard");
  const [quantity, setQuantity] = useState(1);

  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [ticketId, setTicketId] = useState(null);
  const [paymentQR, setPaymentQR] = useState(null);
  const [paymentLink, setPaymentLink] = useState(null);
  const [loading, setLoading] = useState(false);

  const [notification, setNotification] = useState(null); // ✅ Show messages in card

  const prices = {
    standard: 500000,
    vip: 1000000,
    vvip: 2500000,
  };

  const totalPrice = prices[ticketType] * quantity;

  // ✅ Step 1: Create pending ticket & get payment QR
  const handleBuy = async (e) => {
    e.preventDefault();

    if (!email) {
      setNotification({
        type: "danger",
        title: "❌ Missing Email",
        message: "Please enter your email before proceeding.",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerEmail: email,
          ticketType,
          quantity,
          paymentMethod,
        }),
      });

      const data = await res.json();
      setLoading(false);

      // ✅ Already PAID → BLOCK
      if (res.status === 403) {
        setNotification({
          type: "danger",
          title: "❌ Ticket Already Purchased",
          message: `You already bought a ticket!\nType: ${data.ticketType?.toUpperCase()} x${data.quantity}\nPurchased on: ${new Date(
            data.createdAt
          ).toLocaleString()}`,
        });
        return;
      }

      // ✅ Pending → return same QR
      if (res.status === 409) {
        setNotification({
          type: "warning",
          title: "⚠️ Pending Ticket",
          message: `You already have a pending ticket. Please complete payment before buying another.`,
        });
        setTicketId(data.ticketId);
        setPaymentQR(data.paymentQRUrl);
        setPaymentLink(data.paymentLink);
        return;
      }

      // ✅ Normal success → create new pending ticket
      if (data.success) {
        setNotification({
          type: "success",
          title: "✅ Ticket Created",
          message: `Scan the QR below using ${paymentMethod.toUpperCase()} to complete payment.`,
        });
        setTicketId(data.ticketId);
        setPaymentQR(data.paymentQRUrl);
        setPaymentLink(data.paymentLink);
      } else {
        setNotification({
          type: "danger",
          title: "❌ Failed",
          message: data.error || "Could not create ticket. Please try again.",
        });
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setNotification({
        type: "danger",
        title: "❌ Server Error",
        message: "Something went wrong. Please try again later!",
      });
    }
  };

  return (
    <>
      <Navbar />

      <div className="container" style={{ paddingTop: "100px", paddingBottom: "50px" }}>
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow-lg">
              <div className="card-body p-4">
                <h2 className="fw-bold text-center mb-4">🎟 Get Your Ticket</h2>

                {/* ✅ Notification Card (dynamic style) */}
                {notification && (
                  <div className={`card border-${notification.type} mb-3`}>
                    <div
                      className={`card-header fw-bold ${
                        notification.type === "danger"
                          ? "bg-danger text-white"
                          : notification.type === "warning"
                          ? "bg-warning text-dark"
                          : "bg-success text-white"
                      }`}
                    >
                      {notification.title}
                    </div>
                    <div className="card-body">
                      {notification.message.split("\n").map((line, idx) => (
                        <p className="card-text mb-1" key={idx}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 1: Show ticket form if no QR yet */}
                {!paymentQR && (
                  <form onSubmit={handleBuy}>
                    {/* Email */}
                    <div className="mb-3">
                      <label className="form-label fw-bold">Your Email</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    {/* Ticket Type */}
                    <div className="mb-3">
                      <label className="form-label fw-bold">Choose Ticket Type</label>
                      <select
                        className="form-select"
                        value={ticketType}
                        onChange={(e) => setTicketType(e.target.value)}
                      >
                        <option value="standard">🎟 Standard - 500.000đ</option>
                        <option value="vip">⭐ VIP - 1.000.000đ</option>
                        <option value="vvip">👑 VVIP - 2.500.000đ</option>
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="mb-3">
                      <label className="form-label fw-bold">Number of Tickets</label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        required
                      />
                    </div>

                    {/* ✅ Payment Method */}
                    <div className="mb-3">
                      <label className="form-label fw-bold">Select Payment Method</label>
                      <select
                        className="form-select"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="momo">💜 Momo</option>
                        <option value="vnpay">💙 VNPAY</option>
                      </select>
                    </div>

                    {/* Total */}
                    <div className="mb-4 text-center">
                      <h4 className="fw-bold">
                        Total:{" "}
                        <span className="text-warning">
                          {totalPrice.toLocaleString()}đ
                        </span>
                      </h4>
                    </div>

                    {/* Confirm & Pay */}
                    <button type="submit" className="btn btn-warning w-100 fw-bold" disabled={loading}>
                      {loading ? "Processing..." : "✅ Confirm & Show Payment QR"}
                    </button>
                  </form>
                )}

                {/* STEP 2: Show QR + Fallback Link */}
                {paymentQR && (
                  <div className="text-center">
                    <h4 className="fw-bold mb-3">
                      💳 Scan QR with{" "}
                      <span className="text-primary">{paymentMethod.toUpperCase()}</span> to Pay
                    </h4>
                    <img
                      src={paymentQR}
                      alt="Payment QR"
                      style={{ width: "250px", border: "4px solid #ddd", borderRadius: "8px" }}
                    />
                    <p className="text-muted mt-3">
                      Scan this QR using your <strong>{paymentMethod.toUpperCase()}</strong> app.
                    </p>

                    {/* fallback link for desktop */}
                    {paymentLink && (
                      <div className="mt-3">
                        <a href={paymentLink} className="btn btn-primary">
                          🔗 Open Payment Page
                        </a>
                      </div>
                    )}

                    {/* Cancel payment & go back */}
                    <div className="mt-4">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setTicketId(null);
                          setPaymentQR(null);
                          setPaymentLink(null);
                          setNotification(null);
                        }}
                      >
                        ❌ Cancel & Back
                      </button>
                    </div>
                  </div>
                )}

                {/* Back to home */}
                <div className="text-center mt-3">
                  <a href="/" className="text-muted">
                    ← Back to Home
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
