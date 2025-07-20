export default function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top shadow-sm">
      <div className="container">
        {/* LOGO */}
        <a className="navbar-brand fw-bold text-warning" href="/">
          🎫 KAT-2
        </a>

        {/* TOGGLER (mobile menu button) */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarMenu"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* MENU ITEMS */}
        <div className="collapse navbar-collapse justify-content-end" id="navbarMenu">
          <ul className="navbar-nav align-items-center gap-2">
            <li className="nav-item">
              <a className="nav-link active" href="/">🏠 Trang chủ</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/buy">🎟️ Mua vé</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/checkin">✅ Check-in</a>
            </li>
            <li className="nav-item">
  <a className="nav-link" href="/service-check">🍔 Service Check</a>
</li>
            <li className="nav-item">
              <a className="btn btn-warning fw-bold ms-2" href="/admin">
                Admin Panel
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
