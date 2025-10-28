import React, { useEffect, useState } from "react";
import "./App.css";
import Header from "./header";
import QRCode from "qrcode";
import { useNavigate, useLocation } from "react-router-dom";

function CreateRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const [roomId, setRoomId] = useState(""); // internal ID for API
  const [roomCode, setRoomCode] = useState(""); // user-friendly code
  const [participants, setParticipants] = useState([]);
  const [qrcode, setQrcode] = useState("");

  const API_BASE = "http://localhost:4001/api/rooms";

  // Get roomId and roomCode from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("roomId");
    const code = params.get("code");

    if (!id || !code) return navigate("/enter-code");

    setRoomId(id);
    setRoomCode(code);
  }, [location, navigate]);

  // Fetch participants every 3 seconds using roomId
  useEffect(() => {
    if (!roomId) return;

    const fetchParticipants = async () => {
      try {
        const res = await fetch(`${API_BASE}/${roomId}`);
        if (!res.ok) return;
        const data = await res.json();
        setParticipants(data.participants || []);
      } catch (err) {
        console.error("Failed to fetch participants:", err);
      }
    };

    fetchParticipants();
    const interval = setInterval(fetchParticipants, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

  // Generate QR code for sharing the room code
  useEffect(() => {
    if (!roomCode) return;

    const url = `${window.location.origin}/enter-code?code=${roomCode}`;
    QRCode.toDataURL(url, { width: 280, margin: 2 })
      .then(setQrcode)
      .catch(console.error);
  }, [roomCode]);

  return (
    <>
      <div style={{ position: "absolute", top: 0 }}>
        <Header />
      </div>

      <div className="room-container">
        <div className="left">
          <div style={{ border: "3px solid #603A2B", borderRadius: "5px" }}>
            {qrcode ? (
              <img src={qrcode} alt="QR" width={280} height={280} />
            ) : (
              <div
                style={{
                  width: 280,
                  height: 280,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Generating QR...
              </div>
            )}
          </div>
          <div className="room-code">{roomCode}</div>
          <div className="location-box">📍 Your Location</div>
        </div>

        <div className="right">
          <div className="scroll">
            {participants.map((p) => (
              <div key={p.id} className="member-box">
                {p.displayName} ({p.role})
              </div>
            ))}
          </div>
          <div className="room-btn">
            <button
              className="green small-btn shadow"
              style={{ width: "200px" }}
            >
              Start
            </button>
            <button
              className="brown small-btn shadow"
              style={{ width: "200px" }}
              onClick={() => navigate("/enter-code")}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default CreateRoom;
