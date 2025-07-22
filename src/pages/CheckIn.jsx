import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

const API_BASE = "https://kat-production-e428.up.railway.app";

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
        window.location.reload(); 
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error("Manual check-in error:", err);
      alert("❌ Server error while confirming check-in!");
    }
  };

  const handleDecodedText = async (decodedText) => {
    console.log("✅ QR Scanned/Decoded:", decodedText);
    try {
      const payload = JSON.parse(decodedText);
      await validateTicket(payload);
      setScanning(false);
    } catch (err) {
      console.error("Invalid QR Data:", err);
      setValidationResult({
        success: false,
        title: "❌ Invalid QR Code",
        message: "This QR does not contain valid ticket data.",
      });
    }
  };

  // ✅ Lazy load html5-qrcode only on browser
  useEffect(() => {
    if (!scanning) return;

    let scanner;

    async function startScanner() {
      if (typeof window !== "undefined") {
        const mod = await import("html5-qrcode"); // ✅ dynamic import
        const Html5QrcodeScanner = mod.Html5QrcodeScanner;

        scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        scanner.render(
          (decodedText) => handleDecodedText(decodedText),
          () => {}
        );
      }
    }

    startScanner();

    return () => {
      if (scanner) scanner.clear().catch((err) => console.error("Clear scanner error:", err));
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

                {scanning && (
                  <div id="qr-reader" style={{ width: "100%", maxWidth: "400px", margin: "0 auto" }}></div>
                )}

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

                {validationResult?.success && !validationResult.ticketInfo?.checkedIn && (
                  <div className="mt-4">
                    <button className="btn btn-primary btn-lg" onClick={confirmCheckIn}>
                      ✅ Confirm Check-In
                    </button>
                  </div>
                )}

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
