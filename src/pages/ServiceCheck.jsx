import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Html5QrcodeScanner } from "html5-qrcode";

const API_BASE = "https://kat-production-e428.up.railway.app";


export default function ServiceCheck() {
  const [serviceType, setServiceType] = useState("food"); // selected service
  const [validationResult, setValidationResult] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [ticketId, setTicketId] = useState(null);

  //  Step 1: Validate QR only (no redeem)
  const validateTicketForService = async (payload) => {
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
      console.log("Validation result:", data);

      setValidationResult({
        success: data.success,
        title: data.success ? "✅ Ticket Valid!" : "❌ Invalid Ticket",
        message: data.message,
        ticketInfo: data.ticketInfo || null,
      });

      // save ticketId for confirm later
      if (data.success && data.ticketInfo?.id) {
        setTicketId(data.ticketInfo.id);
      }

      setScanning(false); // stop scanner
    } catch (err) {
      console.error("Validation error:", err);
      setValidationResult({
        success: false,
        title: "❌ QR Invalid",
        message: "Could not validate ticket. Try again.",
      });
    }
  };

  //  Step 2: Confirm redeem
  const confirmRedeemService = async () => {
  if (!ticketId) return;
  try {
    const res = await fetch(`${API_BASE}/api/service-redeem/manual-service`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, serviceType }),
    });

    const data = await res.json();
    if (data.success) {
      alert(`✅ ${serviceType.toUpperCase()} redeemed successfully!`);
      window.location.reload();
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error("Confirm redeem error:", err);
    alert("❌ Server error while redeeming service!");
  }
};

  //  Scan handler
  const handleDecodedText = async (decodedText) => {
    console.log("QR scanned:", decodedText);
    try {
      const payload = JSON.parse(decodedText);
      await validateTicketForService(payload);
    } catch (err) {
      console.error("Invalid QR:", err);
      setValidationResult({
        success: false,
        title: "❌ Invalid QR",
        message: "Not a valid ticket QR.",
      });
    }
  };

  //  Init scanner
  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader-service",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => handleDecodedText(decodedText),
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [serviceType, scanning]);

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: "100px", paddingBottom: "50px" }}>
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow-lg">
              <div className="card-body text-center">
                <h2 className="fw-bold mb-3">🍔 Service Redeem</h2>
                <p className="text-muted">Select service → scan QR → confirm redeem</p>

                {/* Select which service location */}
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

                {/* QR scanner */}
                {scanning && (
                  <div id="qr-reader-service" style={{ width: "100%", maxWidth: "400px", margin: "0 auto" }}></div>
                )}

                {/* Show validation result */}
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
                      <p>{validationResult.message}</p>
                      {validationResult.ticketInfo && (
                        <>
                          <p><strong>Email:</strong> {validationResult.ticketInfo.buyerEmail}</p>
                          <p><strong>Ticket:</strong> {validationResult.ticketInfo.ticketType.toUpperCase()}</p>
                          <p><strong>Checked-In:</strong> {validationResult.ticketInfo.checkedIn ? "✅ Yes" : "❌ No"}</p>
                          <p>
                            <strong>Already Used:</strong>{" "}
                            {validationResult.ticketInfo.servicesUsed?.[serviceType] ? "✅ Yes" : "❌ No"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Show Confirm button if valid + NOT redeemed yet */}
                {validationResult?.success &&
                  validationResult.ticketInfo?.checkedIn &&
                  !validationResult.ticketInfo?.servicesUsed?.[serviceType] && (
                    <div className="mt-4">
                      <button className="btn btn-primary btn-lg" onClick={confirmRedeemService}>
                        ✅ Confirm {serviceType.toUpperCase()} Redeem
                      </button>
                    </div>
                )}

                {/* After scan, allow reset */}
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
