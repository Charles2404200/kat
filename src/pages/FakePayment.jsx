import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

// ✅ Lấy API_BASE từ biến môi trường
const API_BASE = "https://kat-j9ym.onrender.com";


export default function FakePayment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ticketId = searchParams.get("ticketId");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [eventQR, setEventQR] = useState(null);

  // ✅ Simulate fetching ticket info (optional)
  useEffect(() => {
    if (!ticketId) {
      console.warn("No ticketId found in URL");
    }
  }, [ticketId]);

  // ✅ Confirm payment → backend marks ticket as paid
  const handleConfirmPayment = async () => {
    if (!ticketId) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/tickets/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setDone(true);
        setEventQR(data.eventQRUrl || null); // Backend also returns final QR
      } else {
        alert(data.error || "❌ Payment failed!");
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("❌ Server error. Try again later!");
    }
  };

  if (!ticketId) {
    return (
      <div className="container text-center" style={{ marginTop: "100px" }}>
        <h2 className="text-danger">❌ Invalid Payment QR</h2>
        <p>Ticket ID is missing or invalid.</p>
        <a href="/" className="btn btn-secondary mt-3">
          ← Back to Home
        </a>
      </div>
    );
  }

  return (
    <div className="container text-center" style={{ marginTop: "80px" }}>
      {!done ? (
        <>
          <h1 className="fw-bold mb-4">💳 Fake Payment Gateway</h1>
          <p className="lead">
            You are paying for <strong>Ticket ID: {ticketId}</strong>
          </p>
          <p className="text-muted">
            This simulates Momo/VNPAY QR Payment. Click below to confirm.
          </p>

          <button
            className="btn btn-success btn-lg mt-4"
            onClick={handleConfirmPayment}
            disabled={loading}
          >
            {loading ? "Processing..." : "✅ Confirm Payment"}
          </button>

          <div className="mt-4">
            <a href="/" className="btn btn-outline-secondary">
              ❌ Cancel Payment
            </a>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-success fw-bold mb-3">✅ Payment Successful!</h2>
          <p className="lead">
            Your ticket has been paid. Check your email for the QR Ticket.
          </p>

          {eventQR && (
            <div className="mt-4">
              <h4 className="fw-bold">🎟 Event QR Ticket</h4>
              <img
                src={eventQR}
                alt="Event QR Ticket"
                style={{
                  width: "250px",
                  border: "4px solid #ddd",
                  borderRadius: "8px",
                }}
              />
              <p className="text-muted mt-2">
                You can also screenshot this QR to check-in at the event.
              </p>
            </div>
          )}

          <div className="mt-4">
            <button className="btn btn-primary" onClick={() => navigate("/")}>
              ← Back to Home
            </button>
          </div>
        </>
      )}
    </div>
  );
}
