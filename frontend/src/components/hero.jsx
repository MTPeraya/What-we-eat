import { useNavigate } from "react-router-dom";
import React, { useState, useCallback } from "react";
import "../App.css";
import preview from "/wwePreview.png";
import { useAuth } from "../context/AuthContext";
import { config } from "../config";

function HeroSection() {
  const navigate = useNavigate();
  const { isLoggedIn, authChecked, user } = useAuth();
  const [isStarting, setIsStarting] = useState(false);

  const handleStartNow = useCallback(async () => {
    if (!authChecked) return;

    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    try {
      setIsStarting(true);
      const displayName = user?.displayName || user?.username || "Host";
      const res = await fetch(`${config.endpoints.rooms}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[Hero] Failed to create room:", err);
        navigate("/enter-code");
        return;
      }

      const data = await res.json();
      const roomId = data?.room?.id;
      const roomCode = data?.room?.code;

      if (roomId && roomCode) {
        navigate(`/create-room?roomId=${roomId}&code=${roomCode}`);
      } else {
        navigate("/enter-code");
      }
    } catch (error) {
      console.error("[Hero] Error starting room:", error);
      navigate("/enter-code");
    } finally {
      setIsStarting(false);
    }
  }, [authChecked, isLoggedIn, user, navigate]);

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
