import { useState } from "react";
import "./App.css";
import { useNavigate } from "react-router-dom";
import Header from './header.jsx'

function EnterCode() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [displayName] = useState("Guest"); // replace with actual user display name

  const API_BASE = "http://localhost:4001/api/rooms";

  // --- JOIN ROOM ---
  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return alert("Please enter a room code!");

    try {
      const res = await fetch(`${API_BASE}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, displayName }),
        credentials: "include", // if your API uses cookies
      });

      if (!res.ok) {
        const err = await res.json();
        return alert(err.error || "Room not found or closed");
      }

      const data = await res.json();
      // Navigate with both roomId (for API) and code (for sharing)
      navigate(`/create-room?roomId=${data.roomId}&code=${data.code}`);
    } catch (err) {
      console.error(err);
      alert("Error connecting to server");
    }
  };

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
