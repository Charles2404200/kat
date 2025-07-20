import { useEffect, useState } from "react";
import Navbar from "../components/Navbar"; // ✅ Import Navbar component

export default function Home() {
  const eventDate = new Date("2025-09-02T00:00:00").getTime();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = eventDate - now;

      if (distance <= 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* ✅ Navbar từ components/Navbar.jsx */}
      <Navbar />

      {/* ✅ HERO SECTION */}
      <header
        className="vh-100 d-flex flex-column justify-content-center text-center text-white"
        style={{
          paddingTop: "80px", // tránh navbar che hero
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1600&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="container">
          <h2 className="text-warning fw-semibold">MEGA EVENT 2025</h2>
          <h1 className="display-2 fw-bold mb-3">KAT-2 FESTIVAL</h1>
          <p className="lead">📍 MY DINH NATIONAL STADIUM</p>
          <p className="fs-5 mb-4">
            📅 02 - 03 September 2025 | 7:30PM - 11:30PM
          </p>

          {/* ✅ COUNTDOWN */}
          <div className="row justify-content-center g-3 mb-4">
            <div className="col-3 bg-dark rounded p-3">
              <h2 className="fw-bold text-warning">{timeLeft.days}</h2>
              <p className="mb-0">Days</p>
            </div>
            <div className="col-3 bg-dark rounded p-3">
              <h2 className="fw-bold text-warning">{timeLeft.hours}</h2>
              <p className="mb-0">Hours</p>
            </div>
            <div className="col-3 bg-dark rounded p-3">
              <h2 className="fw-bold text-warning">{timeLeft.minutes}</h2>
              <p className="mb-0">Minutes</p>
            </div>
            <div className="col-3 bg-dark rounded p-3">
              <h2 className="fw-bold text-warning">{timeLeft.seconds}</h2>
              <p className="mb-0">Seconds</p>
            </div>
          </div>

          {/* ✅ CTA BUTTONS */}
          <div className="d-flex justify-content-center gap-3">
            <a href="/buy" className="btn btn-warning btn-lg fw-bold">
              🎟️ Get Ticket
            </a>
            <a href="#why" className="btn btn-outline-light btn-lg">
              Learn More
            </a>
          </div>
        </div>
      </header>

      {/* ✅ WHY JOIN SECTION */}
      <section id="why" className="py-5 bg-light text-center">
        <div className="container">
          <h3 className="fw-bold display-6 mb-4 text-dark">🔥 Why You Can’t Miss This Event?</h3>
          <p className="lead text-muted mb-5">
            A festival of <strong>music, lights, and unforgettable experiences</strong> with smart ticketing & seamless QR check-in.
          </p>

          <div className="row g-4">
            <div className="col-md-4">
              <div className="card h-100 shadow">
                <div className="card-body">
                  <h4 className="card-title text-warning">🎫 Online Tickets</h4>
                  <p className="card-text">
                    Buy tickets in seconds and receive a <strong>QR code instantly</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 shadow">
                <div className="card-body">
                  <h4 className="card-title text-success">✅ Fast Check-in</h4>
                  <p className="card-text">
                    Scan your QR code at entry – <strong>no long lines, no hassle</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 shadow">
                <div className="card-body">
                  <h4 className="card-title text-primary">🎉 Amazing Experience</h4>
                  <p className="card-text">
                    Live music, incredible performances, and <strong>premium services</strong> for all guests.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ FOOTER */}
      <footer className="bg-dark text-center text-white py-4">
        Powered by <strong>KAT-2 Ticketing</strong> © 2025
      </footer>
    </>
  );
}
