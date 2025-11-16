import { useNavigate } from "react-router-dom";
import React, { useState, useCallback } from "react";
import "../App.css";
import preview from "/wwePreview.png";
import { useAuth } from "../hooks/useAuth";

function HeroSection() {
  const navigate = useNavigate();
  const { isLoggedIn, authChecked } = useAuth();
  const [isStarting, setIsStarting] = useState(false);

  const handleStartNow = useCallback(async () => {
    if (!authChecked) return;

    if (!isLoggedIn) {
      // Not logged in → go to login first
      navigate("/login");
      return;
    }

    // Logged in → go to enter-code screen to choose Create / Join
    setIsStarting(true);
    navigate("/enter-code");
    // Small delay to show button feedback before re-enable
    setTimeout(() => setIsStarting(false), 300);
  }, [authChecked, isLoggedIn, navigate]);

  const textWWE =
    "fun, fast, and fair way to choose the meal with your companion!!";
  return (
    <section style={{ margin: "0px" }}>
      <div className="hero_section">
        <div className="preview-pic">
          <img
            src={preview}
            style={{ width: "510px", maxWidth: "100%", height: "auto" }}
            alt="What We Eat Preview"
          />
        </div>

        <div className="hero-content">
          <h1 id="title" className="hero-title">
            What We Eat
          </h1>
          <p className="hero-text">{textWWE}</p>
          <button
            className="button green shadow hero-button"
            onClick={handleStartNow}
            disabled={isStarting}
          >
            {isStarting ? "Starting..." : "Start Now!"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
