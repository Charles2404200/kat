import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Html5QrcodeScanner } from "html5-qrcode";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function CheckIn() {
  const [validationResult, setValidationResult] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [ticketId, setTicketId] = useState(null);

  // ✅ Validate QR payload with backend
  const validateTicket = async (payload) => {
    try {
      const res = await fetch(`${API_BASE}/api/checkin/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: payload.ticketId,
          hash: payload.hash,
        }),
      });

      const data = await res.json();
      console.log("Backend response:", data);

      setValidationResult({
        success: data.success,
        title: data.success ? "✅ Ticket Valid!" : "❌ Ticket Invalid",
        message: data.message,
        ticketInfo: data.ticketInfo || null,
      });

      // ✅ Save ticketId for manual confirm later
      if (data.success && data.ticketInfo?.id) {
        setTicketId(data.ticketInfo.id);
      }
    } catch (err) {
      console.error("Validation Error:", err);
      setValidationResult({
        success: false,
        title: "❌ Validation Failed",
        message: "Could not validate the ticket. Please try again.",
      });
    }
  };

  // ✅ Confirm Check-In after scan
  const confirmCheckIn = async () => {
    if (!ticketId) return;
    try {
      const res = await fetch(`${API_BASE}/api/checkin/manual-gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Ticket Checked-In Successfully!");
        window.location.reload(); // reset for next scan
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error("Manual check-in error:", err);
      alert("❌ Server error while confirming check-in!");
    }
  };

  // ✅ Handle scanned QR
  const handleDecodedText = async (decodedText) => {
    console.log("✅ QR Scanned/Decoded:", decodedText);
    try {
      const payload = JSON.parse(decodedText);
      await validateTicket(payload);
      setScanning(false); // stop scanning once QR is validated
    } catch (err) {
      console.error("Invalid QR Data:", err);
      setValidationResult({
        success: false,
        title: "❌ Invalid QR Code",
        message: "This QR does not contain valid ticket data.",
      });
    }
  };

  // ✅ Initialize QR scanner
  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => handleDecodedText(decodedText),
      (error) => {
        // ignore scan errors
      }
    );

    return () => {
      scanner.clear().catch((err) => console.error("Clear scanner error:", err));
    };
  }, [scanning]);

  return (
    <>
      <Navbar />

      <div className="container" style={{ paddingTop: "100px", paddingBottom: "50px" }}>
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow-lg">
              <div className="card-body text-center">
                <h2 className="fw-bold mb-4">🚪 Gate Check-In</h2>
                <p className="text-muted">Scan the QR code on the ticket</p>

                {/* ✅ QR Scanner */}
                {scanning && (
                  <div id="qr-reader" style={{ width: "100%", maxWidth: "400px", margin: "0 auto" }}></div>
                )}

                {/* ✅ Show validation result */}
                {validationResult && (
                  <div
                    className={`card mt-4 border-${
                      validationResult.success ? "success" : "danger"
                    }`}
                  >
                    <div
                      className={`card-header fw-bold ${
                        validationResult.success ? "bg-success text-white" : "bg-danger text-white"
                      }`}
                    >
                      {validationResult.title}
                    </div>
                    <div className="card-body">
                      <p>{validationResult.message}</p>
                      {validationResult.ticketInfo && (
                        <>
                          <p>
                            <strong>Email:</strong> {validationResult.ticketInfo.buyerEmail}
                          </p>
                          <p>
                            <strong>Ticket:</strong>{" "}
                            {validationResult.ticketInfo.ticketType.toUpperCase()} x
                            {validationResult.ticketInfo.quantity}
                          </p>
                          <p>
                            <strong>Checked-In:</strong>{" "}
                            {validationResult.ticketInfo.checkedIn ? "✅ Yes" : "❌ No"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ✅ Show Confirm Button if valid & NOT already checked-in */}
                {validationResult?.success && !validationResult.ticketInfo?.checkedIn && (
                  <div className="mt-4">
                    <button className="btn btn-primary btn-lg" onClick={confirmCheckIn}>
                      ✅ Confirm Check-In
                    </button>
                  </div>
                )}

                {/* ✅ Buttons after scan */}
                {!scanning && (
                  <div className="mt-4">
                    <button className="btn btn-secondary" onClick={() => window.location.reload()}>
                      🔄 Scan Another Ticket
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
