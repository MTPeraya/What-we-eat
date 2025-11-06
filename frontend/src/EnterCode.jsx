import { useEffect, useState, useCallback } from "react";
import "./App.css";
import { useNavigate, useLocation } from "react-router-dom";

function EnterCode() {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("Guest");

  const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/rooms`;
  const AUTH_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/auth`;

  // Load current user to use username as displayName
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${AUTH_BASE}/me`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const username = data?.user?.username;
        if (username) setDisplayName(username);
      } catch {}
    })();
  }, []);

  // --- JOIN ROOM ---
  const handleJoin = useCallback(async (codeToJoin = null) => {
    const trimmed = codeToJoin || code.trim().toUpperCase();
    if (!trimmed) {
      if (!codeToJoin) alert("Please enter a room code!");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/join`, {
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
  }, [code, displayName, navigate]);

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
      const res = await fetch(`${API_BASE}`, {
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

  return (
    <>
    <Header/>
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

      <button className="green small-btn shadow" onClick={handleJoin}>
        Join Room
      </button>

      <button className="brown small-btn shadow" onClick={handleCreateRoom}>
        Create Room
      </button>
    </div>
    </>
  );
}

export default EnterCode;
