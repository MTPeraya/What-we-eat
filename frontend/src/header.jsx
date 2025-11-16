import React, { useState, useEffect } from "react";
import "./App.css";
import { Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

function Profile() {
  return <div className="profile-s Margin1vh"></div>;
}

function MenuIcon({ isAdmin = false, isLoggedIn = false, authChecked = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // Debug: Log when props change
  useEffect(() => {
    console.log('[MenuIcon] Props updated - isLoggedIn:', isLoggedIn, '| isAdmin:', isAdmin, '| authChecked:', authChecked);
  }, [isLoggedIn, isAdmin, authChecked]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && menuOpen) closeMenu();
    };
    if (menuOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  return (
    <>
      <div className="menu-container">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-label="Open menu"
          className="menu-button"
        >
          <svg
            className="Margin1vh"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 6H20M4 12H20M4 18H20"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className={`menu-dropdown ${menuOpen ? "open" : ""}`} role="menu" key={`menu-${isLoggedIn}-${isAdmin}`}>
          <div className="menu-header">
            <h2>WHAT WE EAT</h2>
            <p>Choose your meal together!</p>
          </div>
          <ul className="menu-list">
            <li>
              <Link to="/" onClick={closeMenu}>
                Home
              </Link>
            </li>

            {!authChecked ? (
              <li style={{opacity: 0.5, pointerEvents: 'none'}}>
                Loading...
              </li>
            ) : !isLoggedIn ? (
              <li>
                <Link to="/login" onClick={closeMenu}>
                  Login / Sign In
                </Link>
              </li>
            ) : (
              <li>
                <Link to="/profile" onClick={closeMenu}>
                  Profile
                </Link>
              </li>
            )}

            <li>
              <Link to="/enter-code" onClick={closeMenu}>
                Enter Code
              </Link>
            </li>

            {isAdmin && (
              <>
                <li className="divider" />
                <li>
                  <Link to="/admin-dashboard" onClick={closeMenu}>
                    Manage Dashboard
                  </Link>
                </li>
              </>
            )}

            <li className="divider" />
            <li>
              <Link to="/contact" onClick={closeMenu}>
                Contact Us
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {menuOpen && <div className="drawer-overlay" onClick={closeMenu} />}
    </>
  );
}

function Header() {
  const { isLoggedIn, isAdmin, authChecked } = useAuth();

  return (
    <div className="header">
      <MenuIcon isAdmin={isAdmin} isLoggedIn={isLoggedIn} authChecked={authChecked} />
      <Profile />
    </div>
  );
}

export default Header;
