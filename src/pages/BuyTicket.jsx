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
  const [expiresAt, setExpiresAt] = useState(null); // ✅ thêm thời gian hết hạn
  const [countdown, setCountdown] = useState("");   // ✅ hiển thị đếm ngược

  const [loading, setLoading] = useState(false);

  const [notification, setNotification] = useState(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const prices = {
    standard: 500000,
    vip: 1000000,
    vvip: 2500000,
  };

  const totalPrice = prices[ticketType] * quantity;

  // ✅ Poll ticket status (paid/expired)
  useEffect(() => {
    if (!ticketId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/tickets/status/${ticketId}`);
        if (res.status === 404) {
          // Vé bị xóa -> báo expired
          clearInterval(interval);
          setNotification({
            type: "danger",
            title: "⏳ Ticket Expired & Deleted",
            message: "Your pending ticket expired and was deleted. Please create a new ticket.",
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
            message:
              "Your payment has been confirmed. The unique ticket QR has been sent to your email. Thank you!",
          });

          setTimeout(() => {
            window.location.href = "/";
          }, 3000);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000); // check mỗi 5s

    return () => clearInterval(interval);
  }, [ticketId]);

  // ✅ Countdown cho expiresAt
  useEffect(() => {
    if (!expiresAt) return;

    const endTime = new Date(expiresAt).getTime();
    const countdownInterval = setInterval(() => {
      const now = new Date().getTime();
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

  // ✅ Create pending ticket & get payment QR
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

      if (res.status === 409) {
        setNotification({
          type: "warning",
          title: "⚠️ Pending Ticket",
          message: `You already have a pending ticket. Please complete payment before buying another.`,
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
          message: `Scan the QR below using ${paymentMethod.toUpperCase()} to complete payment.`,
        });
        setTicketId(data.ticketId);
        setPaymentQR(data.paymentQRUrl);
        setExpiresAt(data.expiresAt); // ✅ nhận expiresAt để FE hiển thị countdown
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

  // ✅ Reset form nếu vé expired/xóa
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

                {/* ✅ Nếu thanh toán xong */}
                {paymentCompleted && (
                  <div className="text-center my-4">
                    <h4>🎉 Payment confirmed!</h4>
                    <p className="text-muted">
                      Redirecting you to the home page in a few seconds...
                    </p>
                  </div>
                )}

                {/* ✅ Hiển thị form khi chưa tạo vé */}
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
                        onChange={(e) => setTicketType(e.target.value)}
                      >
                        <option value="standard">🎟 Standard - 500.000đ</option>
                        <option value="vip">⭐ VIP - 1.000.000đ</option>
                        <option value="vvip">👑 VVIP - 2.500.000đ</option>
                      </select>
                    </div>

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

                    <button type="submit" className="btn btn-warning w-100 fw-bold" disabled={loading}>
                      {loading ? "Processing..." : "✅ Confirm & Show Payment QR"}
                    </button>
                  </form>
                )}

                {/* ✅ Hiển thị QR + countdown */}
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
