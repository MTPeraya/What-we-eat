import React from "react";
import "../App.css";

const NavItem = (props) => {
  return (
    <li className="nav-item mb-2">
      <a href={props.href} className="nav-link p-0 white_txt">
        {props.nav}
      </a>
    </li>
  );
};

const NavSection = ({ title, items }) => {
  return (
    <div className="col mb-3">
      <h5 className="white_txt">{title}</h5>
      <ul className="nav flex-column">
        {items.map((item, idx) => (
          <NavItem key={idx} href={item.href} nav={item.label} />
        ))}
      </ul>
    </div>
  );
};

function Footer() {
  const quickLinks = [
    { href: "/", label: "Home" },
    { href: "/enter-code", label: "Join Room" },
    { href: "/create-room", label: "Create Room" },
  ];

  const account = [
    { href: "/login", label: "Sign In" },
    { href: "/register", label: "Sign Up" },
    { href: "/profile", label: "Profile" },
  ];

  const about = [
    { href: "#", label: "About Us" },
    { href: "#", label: "Contact" },
    { href: "#", label: "Privacy Policy" },
  ];

  return (
    <div
      style={{
        width: "100vw",
        backgroundColor: "#BB3D25",
        minHeight: "300px",
        color: "white",
      }}
    >
      <div className="container">
        <footer className="row row-cols-1 row-cols-sm-2 row-cols-md-5 py-5 border-top">
          <div className="col mb-3">
            <a
              href="/"
              className="d-flex align-items-center mb-3 link-body-emphasis text-decoration-none"
              aria-label="What We Eat"
            >
              <img
                src="/WWELOGO_w.PNG"
                style={{ width: "100px" }}
                alt="WWE Logo"
              />
            </a>
            <p className="white_txt">© WWE 2025</p>
          </div>
          <div className="col mb-3"></div>
          <NavSection title="Quick Links" items={quickLinks} />
          <NavSection title="Account" items={account} />
          <NavSection title="About" items={about} />
        </footer>
      </div>
    </div>
  );
}

export default Footer;
