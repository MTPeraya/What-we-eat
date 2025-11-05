import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from './header.jsx'
import Footer from './components/smallfooter.jsx'
import Found from './components/showResult.jsx'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const [winner, setWinner] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      try {
        // Check if we have results from navigation state
        if (location.state?.results) {
          const { results, userCenter } = location.state;
          const topRestaurant = results.scores[0];
          
          if (topRestaurant) {
            // Use the restaurant ID directly from the score
            // The restaurantId in scores is already the internal database ID
            setWinner({
              id: topRestaurant.restaurantId,
              placeId: topRestaurant.placeId,
              name: topRestaurant.name || "Selected Restaurant",
              address: topRestaurant.address || "",
              url: `/restaurant/restaurant${(Math.floor(Math.random() * 8) + 1)}.jpg`,
              distance: topRestaurant.distanceKm || null,
              approval: topRestaurant.approval,
              location: topRestaurant.location
            });
          }
        }
      } catch (error) {
        console.error('Failed to load results:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [location.state]);

  const calculateDistance = (from, to) => {
    if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) return null;
    const R = 6371;
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from.lat * Math.PI) / 180) *
        Math.cos((to.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(1);
  };

  const handleMapClick = () => {
    if (!winner) return;
    
    let googleMapsUrl;
    
    // Best: Use Google Place ID if available
    if (winner.placeId) {
      googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${winner.placeId}`;
    }
    // Good: Use restaurant name + address
    else if (winner.name) {
      const searchQuery = winner.address 
        ? `${winner.name}, ${winner.address}`
        : winner.name;
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
    }
    // Fallback: Use coordinates only
    else if (winner.location) {
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${winner.location.lat},${winner.location.lng}`;
    }
    
    if (googleMapsUrl) {
      window.open(googleMapsUrl, '_blank');
    }
  };

  const handleExit = () => {
    navigate('/enter-code');
  };

  if (isLoading) {
    return (
      <div>
        <Header/>
        <div className='container d-flex justify-content-center align-items-center' style={{height: '90vh'}}>
          <h2>Loading results...</h2>
        </div>
        <Footer/>
      </div>
    );
  }

  if (!winner) {
    return (
      <div>
        <Header/>
        <div className='container d-flex justify-content-center align-items-center' style={{height: '90vh'}}>
          <h2>No results found</h2>
        </div>
        <Footer/>
      </div>
    );
  }

  return(
    <div>
      <Header/>
      
      <div className='container d-flex flex-column justify-content-around align-items-center'
      style={{height: '90vh'}}>
        <div className="d-flex flex-column align-items-center" style={{color:"#801F08"}}>
          <h4 className="mb-0">Restaurant</h4>
          <h1>FOUND</h1>
          {winner.approval && (
            <p style={{fontSize: "1.2rem", margin: "10px 0"}}>
              ✨ {(winner.approval * 100).toFixed(0)}% Match!
            </p>
          )}
        </div>
      <Found pics={winner.url} name={winner.name} distance={winner.distance}/>
      <div className="d-flex flex-column align-items-center">
        <button className="green button" onClick={handleMapClick}>Map</button>
        <div style={{height:"10px"}}/>
        <button className="brown s-button" onClick={handleExit}>Exit</button> 
      </div>
      
      <div style={{height: "10vh"}}></div>
      </div>
      
      <Footer/>
    </div>
  );
}

export default Result
