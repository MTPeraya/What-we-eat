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
  const [yourUsername, setYourUsername] = useState("");
  const [meUserId, setMeUserId] = useState("");
  const [hostId, setHostId] = useState("");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null); // { lat, lng }
  const [tempCenter, setTempCenter] = useState(null); // working selection in modal

  const API_BASE = "http://localhost:4001/api/rooms";
  const AUTH_BASE = "http://localhost:4001/api/auth";
  const LEAVE_ROOM_API = `http://localhost:4001/api/rooms/${roomId}/leave`;
  const leaveRoom = async () => {
    await fetch(LEAVE_ROOM_API, { method: "POST", credentials: "include" });
  };

  // Fetch username and userId (for host check)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${AUTH_BASE}/me`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const uid = data?.user?.id;
        const uname = data?.user?.username;
        if (uid) setMeUserId(uid);
        if (uname) setYourUsername(uname);
      } catch {}
    })();
  }, []);

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
        const res = await fetch(`${API_BASE}/${roomId}?t=${Date.now()}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          console.log("[rooms GET]", res.status, "roomId=", roomId);
          return;
        }
        const data = await res.json();
        const raw = data.participants || data.members || [];
        const normalized = raw.map((m) => ({
          id: m.id ?? m.userId ?? m.uid,
          userId: m.userId ?? m.id ?? m.uid,
          displayName: m.displayName ?? m.name ?? "Anonymous",
        }));
        setParticipants(normalized);
        if (data.hostId) setHostId(data.hostId);
      } catch (err) {
        console.error("Failed to fetch participants:", err);
      }
    };
    fetchParticipants();
    const interval = setInterval(fetchParticipants, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    if (!roomCode) return;
    const url = `${window.location.origin}/enter-code?code=${roomCode}`;
    QRCode.toDataURL(url, { width: 280, margin: 2 })
      .then(setQrcode)
      .catch(console.error);
  }, [roomCode]);

  const isHost = hostId && meUserId && hostId === meUserId;

  const handleStart = () => {
    if (!isHost) return;
    const qp = new URLSearchParams({ roomId });
    if (selectedCenter?.lat && selectedCenter?.lng) {
      qp.set("lat", String(selectedCenter.lat));
      qp.set("lng", String(selectedCenter.lng));
    }
    navigate(`/foodtinder?${qp.toString()}`);
  };

  const handleCancel = async () => {
    try {
      await leaveRoom();
      navigate("/enter-code");
    } catch (e) {
      alert("Error leaving room: " + e.message);
    }
  };

  return (
    <>
      <div style={{ position: "absolute", top: 0 }}>
        <Header />
      </div>
      <div className="room-container">
        <div className="left">
          {/* Username Displayed Above QR Code */}
          <div
            style={{
              fontWeight: "bold",
              fontSize: 22,
              color: "#673D1C",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {yourUsername && <span>You are: {yourUsername}</span>}
          </div>
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
          <div
            className="location-box"
            onClick={() => setIsLocationModalOpen(true)}
            style={{ cursor: "pointer" }}
          >
            <div>
              <span className="pin">📍</span>
              <span className="label">Location </span>
            </div>
            <div>
              <span className="coord">
                {selectedCenter
                  ? `${selectedCenter.lat.toFixed(
                      5
                    )}, ${selectedCenter.lng.toFixed(5)}`
                  : "(tap to choose)"}
              </span>
            </div>
          </div>
        </div>
        <div className="right">
          {/* Member Count */}
          {JSON.stringify(participants.length)}
          <div className="scroll">
            {participants.map((p) => (
              <div key={p.id} className="member-box">
                {p.displayName}
                {p.userId === hostId ? " (host)" : ""}
              </div>
            ))}
          </div>
          <div className="room-btn">
            {isHost ? (
              <>
                <button
                  className="green small-btn shadow"
                  style={{ width: "200px" }}
                  onClick={handleStart}
                >
                  Start
                </button>
                <button
                  className="brown small-btn shadow"
                  style={{ width: "200px" }}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="brown small-btn shadow"
                style={{ width: "200px" }}
                onClick={handleCancel}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
      {isLocationModalOpen && (
        <LocationModal
          initial={selectedCenter}
          onUseMyLocation={async () => {
            if (!navigator.geolocation)
              return alert("Geolocation not supported");
            navigator.geolocation.getCurrentPosition(
              (pos) =>
                setTempCenter({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                }),
              () => alert("Cannot get current location")
            );
          }}
          onPick={(lat, lng) => setTempCenter({ lat, lng })}
          onConfirm={() => {
            if (tempCenter) setSelectedCenter(tempCenter);
            setIsLocationModalOpen(false);
          }}
          onCancel={() => {
            setTempCenter(selectedCenter);
            setIsLocationModalOpen(false);
          }}
          tempCenter={tempCenter}
        />
      )}
    </>
  );
}

// --- Modal with simple clickable map area ---
function LocationModal({
  initial,
  tempCenter,
  onUseMyLocation,
  onPick,
  onConfirm,
  onCancel,
}) {
  const modalRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const mapDivRef = React.useRef(null);
  const markerRef = React.useRef(null);

  // helper: load external CSS/JS once
  const loadOnce = (id, tag, attrs) =>
    new Promise((resolve, reject) => {
      if (document.getElementById(id)) return resolve();
      const el = document.createElement(tag);
      el.id = id;
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      el.onload = resolve;
      el.onerror = reject;
      document.head.appendChild(el);
    });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) load Leaflet CSS/JS from CDN (one-time)
      await loadOnce("leaflet-css", "link", {
        rel: "stylesheet",
        href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
      });
      await loadOnce("leaflet-js", "script", {
        src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
      });
      if (cancelled) return;

      // 2) init map
      const L = window.L;
      if (!L) return;

      // default center (Bangkok) if nothing selected yet
      const start = tempCenter || initial || { lat: 13.7563, lng: 100.5018 };

      mapRef.current = L.map(mapDivRef.current, {
        center: [start.lat, start.lng],
        zoom: 13,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapRef.current);

      // place marker if have value
      markerRef.current = L.marker([start.lat, start.lng], {
        draggable: true,
      })
        .addTo(mapRef.current)
        .on("dragend", (e) => {
          const { lat, lng } = e.target.getLatLng();
          onPick(lat, lng);
        });

      // click to move marker
      mapRef.current.on("click", (e) => {
        const { lat, lng } = e.latlng;
        markerRef.current.setLatLng([lat, lng]);
        onPick(lat, lng);
      });
    })();

    return () => {
      cancelled = true;
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch {}
    };
  }, []); // mount once

  // when tempCenter changes from parent (e.g., Use my location), move marker & pan
  useEffect(() => {
    const L = window.L;
    if (!L || !mapRef.current || !markerRef.current || !tempCenter) return;
    markerRef.current.setLatLng([tempCenter.lat, tempCenter.lng]);
    mapRef.current.setView([tempCenter.lat, tempCenter.lng], 15, {
      animate: true,
    });
  }, [tempCenter]);

  const marker = tempCenter || initial;

  return (
    <div className="modal-backdrop">
      <div className="modal-card" ref={modalRef}>
        <h3 className="modal-title">Choose Location</h3>

        <div
          ref={mapDivRef}
          className="map-box"
          title="Click the map to set location (drag marker to adjust)"
        />

        <div className="coord-line">
          {marker
            ? `Selected: ${marker.lat.toFixed(5)}, ${marker.lng.toFixed(5)}`
            : "Click the map or use my location"}
        </div>

        <div className="btn-col">
          <button
            className="green small-btn shadow"
            onClick={async () => {
              // keep your original onUseMyLocation logic + pan the real map
              if (!navigator.geolocation)
                return alert("Geolocation not supported");
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const lat = pos.coords.latitude;
                  const lng = pos.coords.longitude;
                  onPick(lat, lng); // update tempCenter in parent
                },
                () => alert("Cannot get current location"),
                { enableHighAccuracy: true }
              );
            }}
          >
            Use my location
          </button>
          <button className="brown small-btn shadow" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="green small-btn shadow"
            onClick={onConfirm}
            disabled={!marker}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateRoom;
