import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";

// ✅ Lấy API_BASE từ biến môi trường
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function CheckIn() {
  const [validationResult, setValidationResult] = useState(null);
  const [scanning, setScanning] = useState(true);
  const qrRegionRef = useRef(null);

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
    } catch (err) {
      console.error("Validation Error:", err);
      setValidationResult({
        success: false,
        title: "❌ Validation Failed",
        message: "Could not validate the ticket. Please try again.",
      });
    }
  };

  // ✅ Handle scanned text (camera or image upload)
  const handleDecodedText = async (decodedText) => {
    console.log("✅ QR Scanned/Decoded:", decodedText);

    try {
      const payload = JSON.parse(decodedText);
      await validateTicket(payload);

      // Stop scanning after success
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

  // ✅ Initialize Camera Scanner
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
        // console.warn("QR Scan Error", error);
      }
    );

    return () => {
      scanner.clear().catch((err) => console.error("Clear scanner error:", err));
    };
  }, [scanning]);

  // ✅ Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("qr-reader-temp"); // temp invisible div
    try {
      const result = await html5QrCode.scanFile(file, true);
      await handleDecodedText(result);
    } catch (err) {
      console.error("File scan error:", err);
      setValidationResult({
        success: false,
        title: "❌ Failed to Decode",
        message: "This image does not contain a valid QR code.",
      });
    } finally {
      html5QrCode.clear();
    }
  };

  return (
    <>
      <Navbar />

      <div className="container" style={{ paddingTop: "100px", paddingBottom: "50px" }}>
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow-lg">
              <div className="card-body text-center">
                <h2 className="fw-bold mb-4">✅ Ticket Check-In</h2>
                <p className="text-muted">
                  Scan the QR code on the ticket to validate entry
                </p>

                {/* ✅ QR Scanner (Camera) */}
                {scanning && (
                  <div
                    id="qr-reader"
                    ref={qrRegionRef}
                    style={{ width: "100%", maxWidth: "400px", margin: "0 auto" }}
                  ></div>
                )}

                {/* ✅ OR Upload QR Image */}
                {scanning && (
                  <div className="mt-3">
                    <p className="text-muted">📂 Or upload a QR code image</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="form-control"
                    />
                    <div id="qr-reader-temp" style={{ display: "none" }}></div>
                  </div>
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
                      <p className="card-text">{validationResult.message}</p>
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
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ✅ Buttons after scan */}
                {!scanning && (
                  <div className="mt-4 d-flex justify-content-center gap-3">
                    <button className="btn btn-primary" onClick={() => window.location.reload()}>
                      🔄 Scan Another
                    </button>
                    <a href="/" className="btn btn-secondary">
                      ← Back to Home
                    </a>
                  </div>
                )}

                {/* ✅ Cancel while scanning */}
                {scanning && (
                  <div className="mt-3">
                    <a href="/" className="btn btn-outline-secondary">
                      ❌ Cancel
                    </a>
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
