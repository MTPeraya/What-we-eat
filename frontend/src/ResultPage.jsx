import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from './header.jsx'
import Footer from './components/smallfooter.jsx'
import Found from './components/showResult.jsx'
import { config } from './config';

const API_BASE_URL = config.apiUrl + '/api';

function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const [winner, setWinner] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVotersModal, setShowVotersModal] = useState(false);
  const [voteDetails, setVoteDetails] = useState(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        let resultsData = null;
        let userCenter = null;

        // Check if we should fetch results from API
        if (location.state?.shouldFetchResults && location.state?.roomId) {
          const { roomId } = location.state;
          userCenter = location.state?.userCenter;
          
          // Fetch results from API
          const response = await fetch(
            `${API_BASE_URL}/rooms/${roomId}/decide/score`,
            { credentials: 'include' }
          );
          
          if (response.ok) {
            resultsData = await response.json();
          }
        } else if (location.state?.results) {
          // Use results from navigation state
          resultsData = location.state.results;
          userCenter = location.state?.userCenter;
        }

        if (resultsData?.scores && resultsData.scores.length > 0) {
          // Sort by approval rate
          const sortedScores = [...resultsData.scores].sort((a, b) => b.approval - a.approval);
          const topRestaurant = sortedScores[0];
          
          if (topRestaurant) {
            setWinner({
              id: topRestaurant.restaurantId,
              placeId: topRestaurant.placeId,
              name: topRestaurant.name || "Selected Restaurant",
              address: topRestaurant.address || "",
              url: `/restaurant/restaurant${(Math.floor(Math.random() * 8) + 1)}.jpg`,
              distance: topRestaurant.distanceKm || calculateDistance(userCenter, topRestaurant.location),
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

  const handleViewDetails = async () => {
    if (!winner || !location.state?.roomId) return;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/rooms/${location.state.roomId}/votes/${winner.id}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setVoteDetails(data);
        setShowVotersModal(true);
      }
    } catch (error) {
      console.error('Failed to load vote details:', error);
    }
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
          {winner.approval !== null && winner.approval !== undefined && (
            <div style={{
              backgroundColor: "#4CAF50",
              color: "white",
              padding: "10px 25px",
              borderRadius: "25px",
              fontSize: "1.5rem",
              fontWeight: "bold",
              margin: "15px 0",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }}>
              ✨ {(winner.approval * 100).toFixed(0)}% Match!
            </div>
          )}
        </div>
      <Found pics={winner.url} name={winner.name} distance={winner.distance}/>
      <div className="d-flex flex-column align-items-center">
        <button className="green button" onClick={handleMapClick}>Map</button>
        <div style={{height:"10px"}}/>
        <button 
          className="green s-button" 
          onClick={handleViewDetails}
          style={{backgroundColor: "#FFE2C5", color: "#801F08", border: "2px solid #801F08"}}
        >
          View Voting Details
        </button>
        <div style={{height:"10px"}}/>
        <button className="brown s-button" onClick={handleExit}>Exit</button> 
      </div>
      
      <div style={{height: "10vh"}}></div>
      </div>
      
      <Footer/>
      
      {/* Voters Modal */}
      {showVotersModal && voteDetails && (
        <VotersModal 
          voteDetails={voteDetails}
          onClose={() => setShowVotersModal(false)}
        />
      )}
    </div>
  );
}

// Voters Modal Component
function VotersModal({ voteDetails, onClose }) {
  const acceptVoters = voteDetails.votes.filter(v => v.value === 'ACCEPT');
  const rejectVoters = voteDetails.votes.filter(v => v.value === 'REJECT');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "500px",
          maxHeight: "80vh",
          overflowY: "auto"
        }}
      >
        <h3 className="modal-title" style={{color: "#801F08"}}>
          Voting Details
        </h3>
        
        {/* Statistics */}
        <div style={{
          backgroundColor: "#FFE2C5",
          padding: "15px",
          borderRadius: "10px",
          marginBottom: "20px",
          textAlign: "center"
        }}>
          <div style={{fontSize: "2rem", fontWeight: "bold", color: "#4CAF50"}}>
            {(voteDetails.stats.approvalRate * 100).toFixed(0)}%
          </div>
          <div style={{color: "#666", fontSize: "0.9rem"}}>
            {voteDetails.stats.acceptCount} liked / {voteDetails.stats.totalVotes} votes
          </div>
        </div>

        {/* Accept Voters */}
        <div style={{marginBottom: "20px"}}>
          <h4 style={{color: "#4CAF50", marginBottom: "10px"}}>
            ✅ Liked this restaurant ({acceptVoters.length} people)
          </h4>
          <div style={{
            backgroundColor: "#f0f9f0",
            padding: "10px",
            borderRadius: "8px",
            maxHeight: "200px",
            overflowY: "auto"
          }}>
            {acceptVoters.length > 0 ? (
              acceptVoters.map((v, i) => (
                <div 
                  key={v.id} 
                  style={{
                    padding: "8px",
                    borderBottom: i < acceptVoters.length - 1 ? "1px solid #ddd" : "none"
                  }}
                >
                  <span style={{fontWeight: "500"}}>👤 {v.voterName}</span>
                </div>
              ))
            ) : (
              <div style={{color: "#999", textAlign: "center"}}>None</div>
            )}
          </div>
        </div>

        {/* Reject Voters */}
        <div style={{marginBottom: "20px"}}>
          <h4 style={{color: "#f44336", marginBottom: "10px"}}>
            ❌ Didn't like this restaurant ({rejectVoters.length} people)
          </h4>
          <div style={{
            backgroundColor: "#fff0f0",
            padding: "10px",
            borderRadius: "8px",
            maxHeight: "200px",
            overflowY: "auto"
          }}>
            {rejectVoters.length > 0 ? (
              rejectVoters.map((v, i) => (
                <div 
                  key={v.id} 
                  style={{
                    padding: "8px",
                    borderBottom: i < rejectVoters.length - 1 ? "1px solid #ddd" : "none"
                  }}
                >
                  <span style={{fontWeight: "500"}}>👤 {v.voterName}</span>
                </div>
              ))
            ) : (
              <div style={{color: "#999", textAlign: "center"}}>None</div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div style={{textAlign: "center", marginTop: "20px"}}>
          <button 
            className="brown small-btn shadow" 
            onClick={onClose}
            style={{width: "200px"}}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default Result
