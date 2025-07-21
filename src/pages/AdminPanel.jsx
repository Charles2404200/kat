import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [activeTab, setActiveTab] = useState("dashboard");
  const [tickets, setTickets] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [serviceUsage, setServiceUsage] = useState([]);

  // ✅ Login admin
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (data.success) {
        setIsLoggedIn(true);
        setToken(data.token);

        // ✅ load toàn bộ data sau khi login
        fetchDashboard(data.token);
        fetchTickets(data.token);
        fetchServiceUsage(data.token);
      } else {
        alert("❌ Wrong username or password!");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("❌ Server error while login!");
    }
  };

  // ✅ Dashboard stats
  const fetchDashboard = async (authToken = token) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
        headers: { token: authToken },
      });
      const data = await res.json();
      if (data.success) setDashboardStats(data.stats);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  };

  // ✅ Ticket list
  const fetchTickets = async (authToken = token) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/tickets`, {
        headers: { token: authToken },
      });
      const data = await res.json();
      if (data.success) setTickets(data.tickets);
    } catch (err) {
      console.error("Fetch tickets error:", err);
    }
  };

  // ✅ Service usage list
  const fetchServiceUsage = async (authToken = token) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/service-usage`, {
        headers: { token: authToken },
      });
      const data = await res.json();
      if (data.success) setServiceUsage(data.tickets);
    } catch (err) {
      console.error("Service usage fetch error:", err);
    }
  };

  // ✅ Delete ticket
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this ticket?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/ticket/${id}`, {
        method: "DELETE",
        headers: { token },
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Deleted!");
        fetchTickets();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // ✅ Export CSV
  const downloadExport = (type) => {
    const url =
      type === "all"
        ? `${API_BASE}/api/admin/export`
        : `${API_BASE}/api/admin/export-services`;
    window.open(url, "_blank");
  };

  // ✅ LOGIN FORM
  if (!isLoggedIn) {
    return (
      <div className="container" style={{ marginTop: "100px" }}>
        <h2 className="text-center mb-4">🔒 Admin Login</h2>
        <form
          className="card p-4 shadow"
          style={{ maxWidth: "400px", margin: "0 auto" }}
          onSubmit={handleLogin}
        >
          <div className="mb-3">
            <label className="form-label fw-bold">Username</label>
            <input
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-bold">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-dark w-100 fw-bold">Login</button>
        </form>
      </div>
    );
  }

  // ✅ Dashboard view
  const DashboardView = () => (
    <div className="mt-4">
      <h3>📊 Realtime Dashboard</h3>
      {!dashboardStats ? (
        <p className="text-muted">Loading...</p>
      ) : (
        <div className="row text-center">
          <div className="col-md-3">
            <div className="card shadow-sm p-3">
              <h6>Total Tickets</h6>
              <h2>{dashboardStats.totalTickets}</h2>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm p-3">
              <h6>✅ Checked-In</h6>
              <h2 className="text-success">{dashboardStats.checkedInTickets}</h2>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm p-3">
              <h6>⏳ Not Checked-In</h6>
              <h2 className="text-warning">{dashboardStats.notCheckedInTickets}</h2>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm p-3">
              <h6>🍔 Services Used</h6>
              <p>Food: {dashboardStats.serviceStats.food}</p>
              <p>Drink: {dashboardStats.serviceStats.drink}</p>
              <p>Store: {dashboardStats.serviceStats.store}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ✅ Ticket list view
  const TicketView = () => (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>🎟 Ticket Management</h3>
        <div>
          <button className="btn btn-success me-2" onClick={() => downloadExport("all")}>
            ⬇ Export All
          </button>
          <button className="btn btn-secondary" onClick={() => fetchTickets()}>
            🔄 Refresh
          </button>
        </div>
      </div>
      {tickets.length === 0 ? (
        <p className="text-muted text-center">No tickets found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered text-center">
            <thead className="table-dark">
              <tr>
                <th>Email</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Total</th>
                <th>QR</th>
                <th>Services Used</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t._id}>
                  <td>{t.buyerEmail}</td>
                  <td>{t.ticketType.toUpperCase()}</td>
                  <td>{t.quantity}</td>
                  <td>
                    {t.status === "paid" ? (
                      <span className="badge bg-success">PAID</span>
                    ) : (
                      <span className="badge bg-warning">PENDING</span>
                    )}
                  </td>
                  <td>{t.totalPrice?.toLocaleString()}đ</td>
                  <td>
                    {t.qrCodeUrl ? <img src={t.qrCodeUrl} width="40" /> : "-"}
                  </td>
                  <td>
                    {t.servicesUsed?.food && "🍔 "}
                    {t.servicesUsed?.drink && "🥤 "}
                    {t.servicesUsed?.store && "🛍 "}
                  </td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(t._id)}
                    >
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  // ✅ Service usage view
  const ServiceUsageView = () => (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>🍔 Service Usage</h3>
        <div>
          <button className="btn btn-success me-2" onClick={() => downloadExport("services")}>
            ⬇ Export Service Usage
          </button>
          <button className="btn btn-secondary" onClick={() => fetchServiceUsage()}>
            🔄 Refresh
          </button>
        </div>
      </div>
      {serviceUsage.length === 0 ? (
        <p className="text-muted text-center">No users redeemed any service yet.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered text-center">
            <thead className="table-dark">
              <tr>
                <th>Email</th>
                <th>Ticket</th>
                <th>Checked-In</th>
                <th>Food</th>
                <th>Drink</th>
                <th>Store</th>
              </tr>
            </thead>
            <tbody>
              {serviceUsage.map((t) => (
                <tr key={t._id}>
                  <td>{t.buyerEmail}</td>
                  <td>{t.ticketType.toUpperCase()}</td>
                  <td>{t.checkedIn ? "✅" : "❌"}</td>
                  <td>{t.servicesUsed?.food ? "✅" : "-"}</td>
                  <td>{t.servicesUsed?.drink ? "✅" : "-"}</td>
                  <td>{t.servicesUsed?.store ? "✅" : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  return (
    <div className="container" style={{ marginTop: "80px" }}>
      <div className="btn-group mb-4">
        <button
          className={`btn ${activeTab === "dashboard" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => {
            setActiveTab("dashboard");
            fetchDashboard();
          }}
        >
          📊 Dashboard
        </button>
        <button
          className={`btn ${activeTab === "tickets" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => {
            setActiveTab("tickets");
            fetchTickets();
          }}
        >
          🎟 Tickets
        </button>
        <button
          className={`btn ${activeTab === "services" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => {
            setActiveTab("services");
            fetchServiceUsage();
          }}
        >
          🍔 Service Usage
        </button>
      </div>

      {activeTab === "dashboard" && <DashboardView />}
      {activeTab === "tickets" && <TicketView />}
      {activeTab === "services" && <ServiceUsageView />}
    </div>
  );
}
