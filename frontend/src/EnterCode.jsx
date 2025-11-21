import { useEffect, useState, useCallback } from "react";
import "./App.css";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "./header.jsx";
import { config } from "./config";

function EnterCode() {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("Guest");

  // Load current user to use username as displayName
  useEffect(() => {
    (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(`${config.endpoints.auth}/me`, {
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) return;
        const data = await res.json();
        const username = data?.user?.username;
        if (username) setDisplayName(username);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error fetching user:", err);
        }
      }
    })();
  }, []);

  // --- JOIN ROOM ---
  const handleJoin = useCallback(
    async (codeToJoin = null) => {
      const trimmed = codeToJoin || code.trim().toUpperCase();
      if (!trimmed) {
        if (!codeToJoin) alert("Please enter a room code!");
        return;
      }

      try {
        const res = await fetch(`${config.endpoints.rooms}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: trimmed, displayName }),
          credentials: "include", // if your API uses cookies
        });

        if (!res.ok) {
          const err = await res.json();
          if (!codeToJoin) alert(err.error || "Room not found or closed");
          return;
        }

        const data = await res.json();
        console.log("[JOIN OK] response =", data);
        // Navigate with both roomId (for API) and code (for sharing)
        navigate(`/create-room?roomId=${data.roomId}&code=${data.code}`);
      } catch (err) {
        console.error(err);
        if (!codeToJoin) alert("Error connecting to server");
      }
    },
    [code, displayName, navigate]
  );

  // Auto-read code from URL params and auto-join if provided
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeFromUrl = params.get("code");
    if (codeFromUrl) {
      setCode(codeFromUrl.trim().toUpperCase());
      // Auto-join after a short delay to allow displayName to load
      setTimeout(() => {
        handleJoin(codeFromUrl.trim().toUpperCase());
      }, 500);
    }
  }, [location, handleJoin]);

  // --- CREATE ROOM ---
  const handleCreateRoom = async () => {
    try {
      const res = await fetch(`${config.endpoints.rooms}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        return alert(err.error || "Failed to create room");
      }

      const data = await res.json();
      // Navigate with both roomId and code
      navigate(`/create-room?roomId=${data.room.id}&code=${data.room.code}`);
    } catch (err) {
      console.error(err);
      alert("Error connecting to server");
    }
  };

  // --- PASTE FROM CLIPBOARD ---
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCode(text);
    } catch {
      alert("Cannot read from clipboard");
    }
  };

  // --- MYSTERY PICK ---
  const handleMysteryPick = async () => {
    // Get user location
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    try {
      // Get user location first
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const center = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      // Call mystery pick API (auto-creates room)
      const mysteryRes = await fetch(`${config.apiUrl}/api/mystery-pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          center,
          radiusKm: 5,
          displayName,
        }),
        credentials: "include",
      });

      if (!mysteryRes.ok) {
        const err = await mysteryRes.json();
        alert(err.error || "Failed to pick mystery restaurant");
        return;
      }

      const result = await mysteryRes.json();

      // Navigate to result page with the winner
      navigate("/result", {
        state: {
          roomId: result.roomId,
          winner: result.winner,
          generatedAt: result.decidedAt,
          stats: {
            totalVotes: 0,
            acceptCount: 0,
            approvalRate: 0,
          },
          scores: [],
          isMysteryPick: true,
        },
      });
    } catch (err) {
      console.error("Mystery pick error:", err);
      if (err instanceof GeolocationPositionError) {
        alert("Failed to get your location. Please allow location access.");
      } else {
        alert("Error connecting to server");
      }
    }
  };

  return (
    <>
      <Header />
      <div className="background">
        <h1 className="head-name">WHAT WE EAT</h1>

        <input
          className="n-container"
          placeholder="ENTER CODE"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{
            backgroundColor: "#FFE2C5",
            margin: "20px",
            width: "350px",
            height: "75px",
            fontSize: "28px",
            textAlign: "center",
          }}
        />

        <a className="white-thin-button" onClick={handlePaste}>
          Paste from Clipboard
        </a>

        <button className="green small-btn shadow" onClick={() => handleJoin()}>
          Join Room
        </button>

        <button
          className="brown small-btn shadow"
          onClick={handleMysteryPick}
          style={{
            background: "linear-gradient(135deg, #9B59B6, #6A1B9A)",
            color: "#fff",
            fontWeight: 600,
            marginTop: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            {/* Crystal ball base */}
            <ellipse
              cx="12"
              cy="18"
              rx="8"
              ry="3"
              fill="rgba(255,255,255,0.15)"
              stroke="white"
              strokeWidth="1.5"
            />
            {/* Main crystal ball */}
            <circle
              cx="12"
              cy="12"
              r="9"
              fill="rgba(255,255,255,0.1)"
              stroke="white"
              strokeWidth="2"
            />
            {/* Inner glow */}
            <circle
              cx="12"
              cy="12"
              r="6"
              fill="rgba(255,255,255,0.2)"
              stroke="white"
              strokeWidth="1"
            />
            {/* Sparkle effects */}
            <circle cx="9" cy="9" r="1.5" fill="white" opacity="0.8" />
            <circle cx="15" cy="8" r="1" fill="white" opacity="0.6" />
            <circle cx="10" cy="14" r="1" fill="white" opacity="0.7" />
            <circle cx="14" cy="15" r="1.2" fill="white" opacity="0.8" />
            {/* Highlight */}
            <ellipse
              cx="10"
              cy="10"
              rx="2"
              ry="3"
              fill="rgba(255,255,255,0.3)"
            />
          </svg>
          Mystery Pick
        </button>

        <button className="brown small-btn shadow" onClick={handleCreateRoom}>
          Create Room
        </button>
      </div>
    </>
  );
}

export default EnterCode;
