import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

const API_BASE = "https://kat-production-e428.up.railway.app";

export default function BuyTicket() {
  const [email, setEmail] = useState("");
  const [ticketType, setTicketType] = useState("standard");
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("momo");

  const [ticketId, setTicketId] = useState(null);
  const [paymentQR, setPaymentQR] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [countdown, setCountdown] = useState("");
  const [loading, setLoading] = useState(false);

  const [notification, setNotification] = useState(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const [stockData, setStockData] = useState({});

  // ✅ Lấy stock từ BE khi mở trang
  useEffect(() => {
    async function fetchStock() {
      try {
        const res = await fetch(`${API_BASE}/api/tickets/available-stock`);
        const data = await res.json();
        if (data.success) {
          const stockMap = {};
          data.summary.forEach((item) => {
            stockMap[item.ticketType] = {
              price: item.price,
              remaining: item.remaining
            };
          });
          setStockData(stockMap);
        }
      } catch (err) {
        console.error("Stock fetch error:", err);
      }
    }
    fetchStock();
  }, []);

  const totalPrice = stockData[ticketType]?.price
    ? stockData[ticketType].price * quantity
    : 0;

  // ✅ Polling status
  useEffect(() => {
    if (!ticketId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/tickets/status/${ticketId}`);
        if (res.status === 404) {
          clearInterval(interval);
          setNotification({
            type: "danger",
            title: "⏳ Ticket Expired & Deleted",
            message: "Your pending ticket expired. Please create a new one.",
          });
          resetForm();
          return;
        }

        const data = await res.json();
        if (data.success && data.status === "paid") {
          clearInterval(interval);
          setPaymentCompleted(true);
          setNotification({
            type: "success",
            title: "✅ Payment Completed!",
            message: "Unique ticket QR has been sent to your email.",
          });
          setTimeout(() => (window.location.href = "/"), 3000);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [ticketId]);

  // ✅ Countdown
  useEffect(() => {
    if (!expiresAt) return;

    const endTime = new Date(expiresAt).getTime();
    const countdownInterval = setInterval(() => {
      const now = Date.now();
      const diff = endTime - now;
      if (diff <= 0) {
        setCountdown("Expired");
        clearInterval(countdownInterval);
      } else {
        const min = Math.floor(diff / 60000);
        const sec = Math.floor((diff % 60000) / 1000);
        setCountdown(`${min}m ${sec}s`);
      }
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [expiresAt]);

  // ✅ Handle buy
  const handleBuy = async (e) => {
    e.preventDefault();

    if (!email) {
      setNotification({
        type: "danger",
        title: "❌ Missing Email",
        message: "Please enter your email.",
      });
      return;
    }

    const remaining = stockData[ticketType]?.remaining || 0;
    if (quantity > remaining) {
      setNotification({
        type: "danger",
        title: "❌ Not enough tickets",
        message: `Only ${remaining} tickets remaining for ${ticketType.toUpperCase()}!`,
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

      if (res.status === 400 || res.status === 403) {
        setNotification({
          type: "danger",
          title: "❌ Error",
          message: data.error,
        });
        return;
      }

      if (res.status === 409) {
        setNotification({
          type: "warning",
          title: "⚠️ Pending Ticket",
          message: `You already have a pending ticket. Complete payment first.`,
        });
        setTicketId(data.ticketId);
        setPaymentQR(data.paymentQRUrl);
        setExpiresAt(data.expiresAt);
        return;
      }

      if (data.success) {
        setNotification({
          type: "success",
          title: "✅ Ticket Created",
          message: `Scan the QR below using ${paymentMethod.toUpperCase()} to pay.`,
        });
        setTicketId(data.ticketId);
        setPaymentQR(data.paymentQRUrl);
        setExpiresAt(data.expiresAt);
      } else {
        setNotification({
          type: "danger",
          title: "❌ Failed",
          message: data.error || "Could not create ticket. Try again.",
        });
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setNotification({
        type: "danger",
        title: "❌ Server Error",
        message: "Something went wrong. Try later.",
      });
    }
  };

  const resetForm = () => {
    setTicketId(null);
    setPaymentQR(null);
    setExpiresAt(null);
    setCountdown("");
    setPaymentCompleted(false);
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

                {/* Nếu đã thanh toán */}
                {paymentCompleted && (
                  <div className="text-center my-4">
                    <h4>🎉 Payment confirmed!</h4>
                    <p className="text-muted">Redirecting you to the home page...</p>
                  </div>
                )}

                {/* Form mua vé */}
                {!paymentQR && !paymentCompleted && (
                  <form onSubmit={handleBuy}>
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

                    <div className="mb-3">
                      <label className="form-label fw-bold">Choose Ticket Type</label>
                      <select
                        className="form-select"
                        value={ticketType}
                        onChange={(e) => {
                          setTicketType(e.target.value);
                          setQuantity(1);
                        }}
                      >
                        {Object.keys(stockData).length === 0 ? (
                          <option>Loading...</option>
                        ) : (
                          Object.keys(stockData).map((type) => (
                            <option key={type} value={type}>
                              {type.toUpperCase()} -{" "}
                              {stockData[type].price.toLocaleString()}đ (
                              {stockData[type].remaining} left)
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">Number of Tickets</label>
                      <input
  type="number"
  className="form-control"
  min="1"
  placeholder="Enter ticket quantity"
  value={quantity}
  onChange={(e) => setQuantity(e.target.value)}
  required
/>

                      <small className="text-muted">
                        Remaining: {stockData[ticketType]?.remaining ?? "Loading..."}
                      </small>
                    </div>

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

                    <div className="mb-4 text-center">
                      <h4 className="fw-bold">
                        Total:{" "}
                        <span className="text-warning">
                          {totalPrice.toLocaleString()}đ
                        </span>
                      </h4>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-warning w-100 fw-bold"
                      disabled={loading}
                    >
                      {loading ? "Processing..." : "✅ Confirm & Show Payment QR"}
                    </button>
                  </form>
                )}

                {/* QR thanh toán */}
                {paymentQR && !paymentCompleted && (
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

                    {countdown && (
                      <p className="text-danger fw-bold mt-3">⏳ Expires in: {countdown}</p>
                    )}

                    <div className="mt-4">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={resetForm}
                      >
                        ❌ Cancel & Back
                      </button>
                    </div>
                  </div>
                )}

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
