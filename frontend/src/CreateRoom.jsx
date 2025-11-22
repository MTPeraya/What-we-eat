import React, { useEffect, useState } from "react";
import "./App.css";
import Header from "./header";
import QRCode from "qrcode";
import { useNavigate, useLocation } from "react-router-dom";
import { config } from "./config";

function CreateRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const [roomId, setRoomId] = useState(""); // internal ID for API
  const [roomCode, setRoomCode] = useState(""); // user-friendly code
  const [participants, setParticipants] = useState([]);
  const [qrcode, setQrcode] = useState("");
  const [yourUsername, setYourUsername] = useState("");
  const [yourDisplayName, setYourDisplayName] = useState("");
  const [meUserId, setMeUserId] = useState("");
  const [hostId, setHostId] = useState("");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null); // { lat, lng }
  const [tempCenter, setTempCenter] = useState(null); // working selection in modal

  // Initialize tempCenter when modal opens
  useEffect(() => {
    if (isLocationModalOpen) {
      setTempCenter(selectedCenter);
    }
  }, [isLocationModalOpen, selectedCenter]);

  const leaveRoom = async () => {
    await fetch(`${config.endpoints.rooms}/${roomId}/leave`, {
      method: "POST",
      credentials: "include",
    });
  };

  // Fetch username and userId (for host check)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${config.endpoints.auth}/me`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const uid = data?.user?.id;
        const uname = data?.user?.username;
        const displayName = data?.user?.displayName;
        if (uid) setMeUserId(uid);
        if (uname) setYourUsername(uname);
        if (displayName) setYourDisplayName(displayName);
      } catch {
        console.log("Error");
      }
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
    let isActive = true; // Prevent race conditions
    let currentController = null;

    const fetchParticipants = async () => {
      // Abort previous request if still running
      if (currentController) {
        currentController.abort();
      }

      try {
        currentController = new AbortController();
        const timeoutId = setTimeout(() => currentController.abort(), 5000); // 5s timeout

        const res = await fetch(
          `${config.endpoints.rooms}/${roomId}?t=${Date.now()}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: currentController.signal,
          }
        );

        clearTimeout(timeoutId);
        if (!res.ok) {
          console.log("[rooms GET]", res.status, "roomId=", roomId);
          return;
        }

        if (!isActive) return; // Component unmounted, ignore response

        const data = await res.json();
        const raw = data.participants || data.members || [];
        const normalized = raw.map((m) => ({
          id: m.id ?? m.userId ?? m.uid,
          userId: m.userId ?? m.id ?? m.uid,
          displayName: m.displayName ?? m.name ?? "Anonymous",
          profilePicture: m.profilePicture || null,
        }));
        setParticipants(normalized);
        if (data.hostId) setHostId(data.hostId);

        // Check if room is viewing results (host clicked START)
        const currentIsHost =
          data.hostId && meUserId && data.hostId === meUserId;

        // If not host and room is viewing results, navigate to game
        if (!currentIsHost && data.viewingResults) {
          // Room was started by host, navigate members to game
          const qp = new URLSearchParams({ roomId });

          // Use center from room data (set by host)
          const roomCenter = data.center;
          if (roomCenter?.lat && roomCenter?.lng) {
            qp.set("lat", String(roomCenter.lat));
            qp.set("lng", String(roomCenter.lng));
            console.log("Member using room center:", roomCenter);
          } else {
            // Fallback to default location
            qp.set("lat", "13.7563");
            qp.set("lng", "100.5018");
            console.warn("No room center, using default");
          }
          navigate(`/foodtinder?${qp.toString()}`);
        }
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("[rooms GET] Request timeout");
        } else {
          console.error("Failed to fetch participants:", err);
        }
      }
    };
    fetchParticipants();
    const interval = setInterval(fetchParticipants, 3000);
    return () => {
      isActive = false; // Stop processing responses
      if (currentController) currentController.abort(); // Abort pending request
      clearInterval(interval);
    };
  }, [roomId, meUserId, selectedCenter, navigate]);

  useEffect(() => {
    if (!roomCode) return;
    
    // Use IP address instead of localhost for QR code
    // So other devices can scan the QR code and access the app
    const getFrontendUrl = () => {
      const hostname = window.location.hostname;
      const port = window.location.port || '5173';
      
      // If using localhost → use IP address accessible from network
      // For multi-device testing, if accessing via network IP,
      // window.location.hostname will already be the IP address
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // If still localhost → accessing through localhost
        // In this case, QR code may not work from other devices
        // But if accessing via network IP → hostname will already be the IP
        console.warn('[QR Code] Using localhost - QR code may not work from other devices. Access via network IP instead.');
        return window.location.origin;
      }
      
      // If using network IP → use that IP
      return `http://${hostname}:${port}`;
    };
    
    const url = `${getFrontendUrl()}/enter-code?code=${roomCode}`;
    QRCode.toDataURL(url, { width: 280, margin: 2 })
      .then(setQrcode)
      .catch(console.error);
  }, [roomCode]);

  const isHost = hostId && meUserId && hostId === meUserId;

  const handleStart = async () => {
    if (!isHost || !selectedCenter) return;

    try {
      // Call start API to mark room as started and save center
      const startRes = await fetch(
        `${config.endpoints.rooms}/${roomId}/start`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            center: selectedCenter,
          }),
        }
      );

      if (!startRes.ok) {
        console.error("Failed to start room:", await startRes.text());
        // Still navigate even if API call fails
      }

      // Navigate host to game
      const qp = new URLSearchParams({ roomId });
      if (selectedCenter?.lat && selectedCenter?.lng) {
        qp.set("lat", String(selectedCenter.lat));
        qp.set("lng", String(selectedCenter.lng));
      }
      const url = `/foodtinder?${qp.toString()}`;
      navigate(url);
    } catch (err) {
      console.error("Error starting room:", err);
      // Still navigate even on error
      const qp = new URLSearchParams({ roomId });
      if (selectedCenter?.lat && selectedCenter?.lng) {
        qp.set("lat", String(selectedCenter.lat));
        qp.set("lng", String(selectedCenter.lng));
      }
      navigate(`/foodtinder?${qp.toString()}`);
    }
  };

  const handleCancel = async () => {
    try {
      await leaveRoom();
      navigate("/enter-code");
    } catch (e) {
      alert("Error leaving room: " + e.message);
    }
  };

  // Theme colors matching Ratings page
  const palette = {
    background: "#FCEEE3",
    card: "#FFF7EF",
    border: "#C47B4E",
    accent: "#BB3D25",
    textPrimary: "#4A1F0C",
    textSecondary: "#7A4B31",
  };

  return (
    <>
      <Header />
      <div style={{
        background: palette.background,
        minHeight: "100vh",
        paddingTop: "1vh",
        paddingBottom: "5rem",
      }}>
        <div className="room-container" style={{
          background: "transparent",
        }}>
          <div className="left">
            <div
              style={{
                background: palette.card,
                borderRadius: "26px",
                border: `2px solid ${palette.border}`,
                padding: "1.5rem",
                boxShadow: "0 25px 55px rgba(68,29,8,.12)",
                marginBottom: "1.5rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "22px",
                  color: palette.textPrimary,
                  marginBottom: "8px",
                }}
              >
                {(yourDisplayName || yourUsername) && (
                  <span>You are: {yourDisplayName || yourUsername}</span>
                )}
              </div>
            </div>
            
            <div style={{
              background: palette.card,
              border: `3px solid ${palette.border}`,
              borderRadius: "20px",
              padding: "12px",
              boxShadow: "0 20px 45px rgba(68,29,8,.1)",
            }}>
              {qrcode ? (
                <img src={qrcode} alt="QR" width={280} height={280} style={{ borderRadius: "12px" }} />
              ) : (
                <div
                  style={{
                    width: 280,
                    height: 280,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: palette.textSecondary,
                  }}
                >
                  Generating QR...
                </div>
              )}
            </div>
            
            <div className="room-code" style={{
              background: palette.accent,
              color: "#fff",
              borderRadius: "16px",
              padding: "16px",
              fontSize: "24px",
              fontWeight: 700,
              boxShadow: "0 12px 25px rgba(187,61,37,.25)",
            }}>
              {roomCode}
            </div>
            
            <div
              className="location-box"
              onClick={() => isHost && setIsLocationModalOpen(true)}
              style={{
                cursor: isHost ? "pointer" : "not-allowed",
                opacity: isHost ? 1 : 0.7,
                background: palette.card,
                border: `2px solid ${palette.border}`,
                borderRadius: "20px",
                padding: "16px",
                boxShadow: "0 8px 16px rgba(68,29,8,.08)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (isHost) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 12px 24px rgba(68,29,8,.12)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(68,29,8,.08)";
              }}
            >
              <div style={{
                color: palette.textPrimary,
                fontWeight: 600,
                fontSize: "18px",
                marginBottom: "8px",
              }}>
                📍 Location
              </div>
              <div style={{
                color: palette.textSecondary,
                fontSize: "14px",
              }}>
                {selectedCenter
                  ? `${selectedCenter.lat.toFixed(5)}, ${selectedCenter.lng.toFixed(5)}`
                  : "(tap to choose)"}
              </div>
            </div>
          </div>
          <div className="right">
          <div
            style={{
              fontWeight: "bold",
              fontSize: "24px",
              color: "#4A1F0C",
              marginBottom: "24px",
              textAlign: "center",
            }}
          >
            Participants ({participants.length})
          </div>
          <div className="scroll" style={{
            background: "#FCEEE3",
            borderRadius: "26px",
            border: "2px solid #C47B4E",
            padding: "1.5rem",
            boxShadow: "0 20px 45px rgba(68,29,8,.1)",
          }}>
            {participants.length === 0 ? (
              <div style={{
                textAlign: "center",
                color: "#7A4B31",
                padding: "2rem",
              }}>
                No participants yet
              </div>
            ) : (
              participants.map((p) => {
                const isHost = p.userId === hostId;
                const isCurrentUser = p.userId === meUserId;
                // Use displayName if available, fallback to username for current user, otherwise use participant's displayName
                const displayNameToShow = isCurrentUser 
                  ? (yourDisplayName || yourUsername || p.displayName || "Anonymous")
                  : (p.displayName || "Anonymous");
                const profilePic = p.profilePicture || "/placeholderProfile.png";
                
                return (
                  <div
                    key={p.id}
                    style={{
                      background: "#FFF7EF",
                      border: "2px solid #C47B4E",
                      borderRadius: "20px",
                      padding: "16px 20px",
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      boxShadow: "0 8px 16px rgba(68,29,8,.08)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 12px 24px rgba(68,29,8,.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 8px 16px rgba(68,29,8,.08)";
                    }}
                  >
                    {/* Profile Picture */}
                    <img
                      src={profilePic}
                      alt={displayNameToShow}
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: `3px solid ${isHost ? "#BB3D25" : "#C47B4E"}`,
                        flexShrink: 0,
                        boxShadow: "0 4px 8px rgba(68,29,8,.15)",
                      }}
                    />
                    
                    {/* Name */}
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          color: "#4A1F0C",
                          fontWeight: 700,
                          fontSize: "20px",
                          textDecoration: "underline",
                          textUnderlineOffset: "4px",
                          textDecorationThickness: "2px",
                        }}
                      >
                        {displayNameToShow}
                      </span>
                      
                      {/* Crown Icon for Host */}
                      {isHost && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="#BB3D25"
                          style={{ flexShrink: 0 }}
                        >
                          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="room-btn" style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center",
            marginTop: "24px",
          }}>
            {isHost ? (
              <>
                <button
                  onClick={handleStart}
                  disabled={!selectedCenter}
                  style={{
                    background: palette.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: "14px",
                    padding: "0.85rem 2rem",
                    fontWeight: 600,
                    fontSize: "18px",
                    cursor: selectedCenter ? "pointer" : "not-allowed",
                    boxShadow: "0 12px 25px rgba(187,61,37,.25)",
                    transition: "all 0.2s ease",
                    opacity: selectedCenter ? 1 : 0.6,
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCenter) {
                      e.currentTarget.style.transform = "scale(1.05)";
                      e.currentTarget.style.boxShadow = "0 15px 30px rgba(187,61,37,.35)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 12px 25px rgba(187,61,37,.25)";
                  }}
                >
                  Start
                </button>
                <button
                  onClick={handleCancel}
                  style={{
                    background: palette.card,
                    color: palette.textPrimary,
                    border: `2px solid ${palette.border}`,
                    borderRadius: "14px",
                    padding: "0.85rem 2rem",
                    fontWeight: 600,
                    fontSize: "18px",
                    cursor: "pointer",
                    boxShadow: "0 8px 16px rgba(68,29,8,.08)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = palette.background;
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = palette.card;
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleCancel}
                style={{
                  background: palette.card,
                  color: palette.textPrimary,
                  border: `2px solid ${palette.border}`,
                  borderRadius: "14px",
                  padding: "0.85rem 2rem",
                  fontWeight: 600,
                  fontSize: "18px",
                  cursor: "pointer",
                  boxShadow: "0 8px 16px rgba(68,29,8,.08)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = palette.background;
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = palette.card;
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                Cancel
              </button>
            )}
          </div>
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
              (pos) => {
                const newCenter = {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                };
                setTempCenter(newCenter);
                console.log("Got location:", newCenter);
              },
              (error) => {
                console.error("Geolocation error:", error);
                alert("Cannot get current location: " + error.message);
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              }
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
  // onUseMyLocation,
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

      // Check if map div is available
      if (!mapDivRef.current) return;

      // Clean up existing map if any
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
          markerRef.current = null;
        } catch (e) {
          console.error("Error cleaning up existing map:", e);
        }
      }

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
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          onPick(lat, lng);
        }
      });
    })();

    return () => {
      cancelled = true;
      try {
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
        if (mapRef.current) {
          mapRef.current.off();
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch (e) {
        console.error("Error during map cleanup:", e);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once - empty dependency array ensures this runs only once

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
