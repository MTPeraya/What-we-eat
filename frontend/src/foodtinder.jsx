import React, { useEffect, useState } from "react";
import SwipeCards from './components/swipecard.jsx'
import Header from './header.jsx'
import Footer from './components/smallfooter.jsx'
import { useLocation, useNavigate } from 'react-router-dom';

function useQueryParams() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const roomId = params.get('roomId');
  const lat = params.get('lat');
  const lng = params.get('lng');
  return { roomId, lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined };
}

function FoodTinder() {
  const { roomId, lat, lng } = useQueryParams();
  const navigate = useNavigate();
  const [isHost, setIsHost] = useState(false);
  const [meUserId, setMeUserId] = useState("");

  const API_BASE = "http://localhost:4001/api";

  // Check if current user is host
  useEffect(() => {
    (async () => {
      try {
        // Get current user
        const meRes = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (meRes.ok) {
          const meData = await meRes.json();
          const uid = meData?.user?.id;
          setMeUserId(uid);

          // Get room info
          if (roomId) {
            const roomRes = await fetch(`${API_BASE}/rooms/${roomId}`, { credentials: "include" });
            if (roomRes.ok) {
              const roomData = await roomRes.json();
              setIsHost(roomData.hostId === uid);
            }
          }
        }
      } catch (error) {
        console.error("Error checking host status:", error);
      }
    })();
  }, [roomId]);

  // Poll for "view results" trigger from host
  useEffect(() => {
    if (!roomId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/rooms/${roomId}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          // Check if room has viewingResults flag
          if (data.viewingResults) {
            // Navigate to results page
            navigate('/result', { 
              state: { 
                roomId,
                shouldFetchResults: true,
                userCenter: lat && lng ? { lat, lng } : undefined
              } 
            });
          }
        }
      } catch (error) {
        console.error("Error polling room status:", error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [roomId, navigate, lat, lng]);

  return(
    <div>
      <Header/>
      <SwipeCards 
        roomId={roomId} 
        userCenter={lat && lng ? { lat, lng } : undefined}
        isHost={isHost}
      />
      <Footer/>
    </div>
  );
}

export default FoodTinder