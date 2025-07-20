import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function ServiceCheck() {
  const [serviceType, setServiceType] = useState("food");
  const [validationResult, setValidationResult] = useState(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  const validateService = async (payload) => {
    try {
      const res = await fetch(`${API_URL}/api/checkin/service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: payload.ticketId, hash: payload.hash, serviceType }),
      });

      const data = await res.json();
      setValidationResult({
        success: data.success,
        title: data.success ? `✅ ${serviceType.toUpperCase()} Redeemed` : "❌ Failed",
        message: data.message,
        ticketInfo: data.ticketInfo || null,
      });
    } catch (err) {
      console.error("Service Validation Error:", err);
      setValidationResult({
        success: false,
        title: "❌ Server Error",
        message: "Could not validate the service. Try again.",
      });
    }
  };

  const handleDecodedText = async (decodedText) => {
    try {
      const payload = JSON.parse(decodedText);
      await validateService(payload);
    } catch (err) {
      console.error("Invalid QR:", err);
      setValidationResult({
        success: false,
        title: "❌ Invalid QR",
        message: "Not a valid ticket QR.",
      });
    }
  };

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader-service",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(handleDecodedText, () => {});
    return () => {
      scanner.clear().catch(() => {});
    };
  }, [serviceType]); // restart scanner if service changes

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: "100px", paddingBottom: "50px" }}>
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow-lg">
              <div className="card-body text-center">
                <h2 className="fw-bold mb-3">🍔 Service Redeem</h2>
                <p className="text-muted">Select service area then scan QR to redeem</p>

                <div className="mb-3">
                  <select
                    className="form-select"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                  >
                    <option value="food">🍔 Food</option>
                    <option value="drink">🥤 Drink</option>
                    <option value="store">🛍 Store</option>
                  </select>
                </div>

                {/* ✅ QR Scanner Auto-start */}
                <div id="qr-reader-service" style={{ width: "100%", maxWidth: "400px", margin: "0 auto" }}></div>

                {validationResult && (
                  <div
                    className={`card mt-4 border-${validationResult.success ? "success" : "danger"}`}
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
                            {validationResult.ticketInfo.ticketType.toUpperCase()}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-3">
                  <a href="/" className="btn btn-outline-secondary">
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
