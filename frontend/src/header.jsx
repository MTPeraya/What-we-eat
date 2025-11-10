import React, { useState, useEffect } from "react";
import "./App.css";
import { Link, useLocation } from "react-router-dom";
import { config } from "./config";

function Profile() {
  return <div className="profile-s Margin1vh"></div>;
}

function MenuIcon({ isAdmin = false, isLoggedIn = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

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

        <div className={`menu-dropdown ${menuOpen ? "open" : ""}`} role="menu">
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

            {!isLoggedIn ? (
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
  const location = useLocation(); // Track route changes
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check auth status on every route change
    (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const res = await fetch(`${config.endpoints.auth}/me`, {
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          // Not logged in - reset states
          setIsLoggedIn(false);
          setIsAdmin(false);
          return;
        }
        
        const data = await res.json();
        if (data?.user) {
          setIsLoggedIn(true);
          setIsAdmin(data.user.role === "ADMIN");
        } else {
          // No user data - reset states
          setIsLoggedIn(false);
          setIsAdmin(false);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error verifying user:", err);
        }
        // On error, assume not logged in
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    })();
  }, [location.pathname]); // Re-check when route changes

  return (
    <div className="header">
      <MenuIcon isAdmin={isAdmin} isLoggedIn={isLoggedIn} />
      <Profile />
    </div>
  );
}

export default Header;
