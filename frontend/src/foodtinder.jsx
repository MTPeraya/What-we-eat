import React, { useEffect, useState } from "react";
import SwipeCards from './components/swipecard.jsx'
import Header from './header.jsx'
import Footer from './components/smallfooter.jsx'
import { useLocation } from 'react-router-dom';

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
  const [isHost, setIsHost] = useState(false);

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

  // Note: Removed auto-navigate to results page when room starts
  // Host will manually navigate after all members finish voting
  // This prevents showing "No results found" before any votes are cast

  return(
    <div>
      <Header/>
      <div>
      <SwipeCards 
        roomId={roomId} 
        userCenter={lat && lng ? { lat, lng } : undefined}
        isHost={isHost}
      />
      </div>
      <Footer/>
    </div>
  );
}

export default FoodTinder