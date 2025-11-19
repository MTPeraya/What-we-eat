import React, { useEffect, useState, useCallback, useMemo } from "react";
import SwipeCards from './components/swipecard.jsx'
import Header from './header.jsx'
import Footer from './components/smallfooter.jsx'
import RatingModal from './components/RatingModal.jsx'
import { useLocation } from 'react-router-dom';
import { config } from './config';

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
  const [currentRestaurant, setCurrentRestaurant] = useState(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  const API_BASE = `${config.apiUrl}/api`;

  // Memoize userCenter to prevent unnecessary re-renders
  const userCenter = useMemo(() => {
    return lat && lng ? { lat, lng } : undefined;
  }, [lat, lng]);

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
  }, [roomId, API_BASE]);

  // Note: Removed auto-navigate to results page when room starts
  // Host will manually navigate after all members finish voting
  // This prevents showing "No results found" before any votes are cast

  const handleCurrentCardChange = useCallback((restaurant) => {
    setCurrentRestaurant(restaurant);
  }, []);

  const handleReviewClick = useCallback(() => {
    if (currentRestaurant) {
      setIsRatingModalOpen(true);
    }
  }, [currentRestaurant]);

  const handleCloseModal = useCallback(() => {
    setIsRatingModalOpen(false);
  }, []);

  return(
    <div>
      <Header/>
      <div>
      <SwipeCards 
        roomId={roomId} 
        userCenter={userCenter}
        isHost={isHost}
        onCurrentCardChange={handleCurrentCardChange}
      />
      </div>
      <Footer
        location="Your Location"
        review={currentRestaurant?.rating ? ` ${currentRestaurant.rating.toFixed(1)}` : " -"}
        onclickreview={handleReviewClick}
      />
      
      {/* Rating Modal */}
      <RatingModal 
        isOpen={isRatingModalOpen}
        onClose={handleCloseModal}
        restaurant={currentRestaurant}
      />
    </div>
  );
}

export default FoodTinder