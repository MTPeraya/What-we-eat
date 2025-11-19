import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from './header.jsx'
import Footer from './components/smallfooter.jsx'
import RatingModal from './components/RatingModal.jsx'
import { config } from './config';

const API_BASE_URL = config.apiUrl + '/api';

const calculateCombinedRating = (googleRating, googleCount, localRating, localCount) => {
  let totalScore = 0;
  let totalCount = 0;

  if (typeof googleRating === 'number') {
    const weight = googleCount && googleCount > 0 ? googleCount : 1;
    totalScore += googleRating * weight;
    totalCount += weight;
  }

  if (typeof localRating === 'number') {
    const weight = localCount && localCount > 0 ? localCount : 1;
    totalScore += localRating * weight;
    totalCount += weight;
  }

  return totalCount > 0 ? totalScore / totalCount : null;
};

const palette = {
  background: '#FFEFE3',
  card: '#FFF7EF',
  border: '#8A3A1A',
  textPrimary: '#4A1F0C',
  textSecondary: '#7A4B31',
  accent: '#C0471C',
  success: '#4CAF50'
};

const styles = {
  pageWrapper: {
    background: palette.background,
    minHeight: 'calc(100vh - 120px)',
    padding: '6rem 0 6rem',
    marginTop: '20px'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  topRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5rem'
  },
  featuredCard: {
    flex: '3 1 520px',
    background: palette.card,
    border: `2px solid ${palette.border}`,
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 25px 45px rgba(74,31,12,0.15)'
  },
  heroImage: {
    position: 'relative',
    width: '100%',
    height: '320px',
    overflow: 'hidden'
  },
  heroBadge: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    background: '#4CAF50',
    color: '#fff',
    padding: '8px 18px',
    borderRadius: '999px',
    fontWeight: 600,
    letterSpacing: '0.03em',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 10px 20px rgba(0,0,0,0.15)'
  },
  featureBody: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    color: palette.textPrimary
  },
  featureHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px'
  },
  ratingPill: {
    minWidth: '120px',
    padding: '12px 16px',
    borderRadius: '16px',
    border: `1px solid ${palette.border}`,
    textAlign: 'right',
    background: '#FFF',
    color: palette.textPrimary,
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.03)'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px'
  },
  statCard: {
    background: '#FFF',
    borderRadius: '14px',
    border: `1px solid rgba(138,58,26,0.2)`,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    color: palette.textPrimary
  },
  sideCard: {
    flex: '1 1 260px',
    background: palette.card,
    border: `2px solid ${palette.border}`,
    borderRadius: '24px',
    padding: '24px',
    color: palette.textPrimary,
    boxShadow: '0 20px 40px rgba(74,31,12,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  ctaButton: (variant = 'primary') => ({
    width: '100%',
    padding: '12px 18px',
    borderRadius: '14px',
    fontWeight: 600,
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    background: variant === 'primary' ? palette.accent : 'transparent',
    color: variant === 'primary' ? '#fff' : palette.textPrimary,
    borderColor: variant === 'outline' ? palette.border : 'transparent',
    borderStyle: variant === 'outline' ? 'solid' : 'none',
    borderWidth: variant === 'outline' ? '2px' : '0',
    boxShadow: variant === 'primary' ? '0 15px 25px rgba(192,71,28,0.25)' : 'none'
  }),
  actionBar: {
    background: palette.card,
    borderRadius: '20px',
    border: `2px solid ${palette.border}`,
    padding: '18px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
};

function calculateDistance(from, to) {
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
}

function sortScoresLikeBackend(scores) {
  if (!Array.isArray(scores)) return [];
  return [...scores].sort(
    (a, b) =>
      (b.netScore ?? 0) - (a.netScore ?? 0) ||
      (b.approval ?? 0) - (a.approval ?? 0) ||
      (b.accept ?? 0) - (a.accept ?? 0)
  );
}

// Deterministic function to get image based on restaurant ID
function getRestaurantImage(restaurantId) {
  if (!restaurantId) {
    // Fallback: use a hash of current timestamp if no ID
    return `/restaurant/restaurant${(Date.now() % 8) + 1}.jpg`;
  }
  
  // Convert ID string to a number (simple hash)
  let hash = 0;
  for (let i = 0; i < restaurantId.length; i++) {
    const char = restaurantId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use hash to deterministically pick an image (1-8)
  const imageIndex = (Math.abs(hash) % 8) + 1;
  return `/restaurant/restaurant${imageIndex}.jpg`;
}

function normalizeWinnerPayload(payload, userCenter) {
  if (!payload) return null;

  const location =
    payload.location ??
    (payload.lat != null && payload.lng != null
      ? { lat: payload.lat, lng: payload.lng }
      : null);

  const distance =
    location && userCenter ? calculateDistance(userCenter, location) : null;

  const restaurantId = payload.restaurantId ?? payload.id ?? null;
  const defaultImage = getRestaurantImage(restaurantId);

  return {
    id: restaurantId,
    placeId: payload.placeId ?? null,
    name: payload.name || "Selected Restaurant",
    address: payload.address || "",
    url: payload.url || defaultImage,
    distance,
    approval:
      typeof payload.approval === "number" ? payload.approval : payload?.approvalRatio ?? null,
    location,
    googleRating:
      typeof payload.googleRating === "number"
        ? payload.googleRating
        : typeof payload.rating === "number"
        ? payload.rating
        : null,
    googleRatingCount:
      payload.googleRatingCount ?? payload.userRatingsTotal ?? null,
  };
}

function deriveWinnerFromScores(scores, userCenter) {
  const sorted = sortScoresLikeBackend(scores);
  const topRestaurant = sorted[0];
  if (!topRestaurant) return null;
  return normalizeWinnerPayload(topRestaurant, userCenter);
}

function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const [winner, setWinner] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVotersModal, setShowVotersModal] = useState(false);
  const [voteDetails, setVoteDetails] = useState(null);
  const [restaurantRating, setRestaurantRating] = useState(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [restaurantRatingCount, setRestaurantRatingCount] = useState(0);

  useEffect(() => {
    const loadResults = async () => {
      try {
        console.log('ResultPage: location.state =', location.state);
        
        let resultsData = null;
        let userCenter = null;

        // Check if we should fetch results from API
        if (location.state?.shouldFetchResults && location.state?.roomId) {
          const { roomId } = location.state;
          userCenter = location.state?.userCenter;
          
          console.log('Fetching results for roomId:', roomId);
          
          // Fetch results from API
          const response = await fetch(
            `${API_BASE_URL}/rooms/${roomId}/decide/score`,
            { credentials: 'include' }
          );
          
          if (response.ok) {
            resultsData = await response.json();
            console.log('Fetched results:', resultsData);
          } else {
            console.error('Failed to fetch results:', response.status);
          }
        } else if (location.state?.results) {
          // Use results from navigation state
          resultsData = location.state.results;
          userCenter = location.state?.userCenter;
          console.log('Using results from state:', resultsData);
        } else {
          console.warn('No roomId or results in location.state');
        }

        let resolvedWinner = null;
        if (resultsData?.winner) {
          resolvedWinner = normalizeWinnerPayload(resultsData.winner, userCenter);
        }

        if (!resolvedWinner && resultsData?.scores?.length) {
          console.log('Processing scores:', resultsData.scores.length, 'items');
          resolvedWinner = deriveWinnerFromScores(resultsData.scores, userCenter);
        }

        if (resolvedWinner) {
          console.log('Setting winner to:', resolvedWinner);
          setWinner(resolvedWinner);
        } else if (resultsData?.scores) {
          console.warn('No winner resolved even though scores exist');
        } else {
          console.warn('No scores found or empty scores array');
        }
      } catch (error) {
        console.error('Failed to load results:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [location.state]);

  // Fetch restaurant rating when winner is set
  useEffect(() => {
    const fetchRating = async () => {
      if (!winner?.id) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/restaurants/${winner.id}/ratings`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          const reviews = data.items || [];
          
          // Calculate average rating
          if (reviews.length > 0) {
            const totalScore = reviews.reduce((sum, review) => sum + (review.score || 0), 0);
            const avgRating = totalScore / reviews.length;
            setRestaurantRating(avgRating);
            setRestaurantRatingCount(reviews.length);
          } else {
            setRestaurantRating(null);
            setRestaurantRatingCount(0);
          }
        } else {
          setRestaurantRating(null);
          setRestaurantRatingCount(0);
        }
      } catch (error) {
        console.error('[ResultPage] Error fetching rating:', error);
        setRestaurantRating(null);
        setRestaurantRatingCount(0);
      }
    };
    
    fetchRating();
  }, [winner?.id]);

  const handleReviewClick = useCallback(() => {
    if (winner) {
      setIsRatingModalOpen(true);
    }
  }, [winner]);

  const handleCloseRatingModal = useCallback(() => {
    setIsRatingModalOpen(false);
  }, []);

  const combinedRating = useMemo(() => {
    return calculateCombinedRating(
      winner?.googleRating ?? null,
      winner?.googleRatingCount ?? 0,
      restaurantRating,
      restaurantRatingCount
    );
  }, [winner?.googleRating, winner?.googleRatingCount, restaurantRating, restaurantRatingCount]);

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
        <Footer
          location="Your Location"
          review=" -"
        />
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
        <Footer
          location="Your Location"
          review=" -"
        />
      </div>
    );
  }

  const matchLabel = winner.approval !== null && winner.approval !== undefined
    ? `${(winner.approval * 100).toFixed(0)}% Match`
    : 'Chef Pick';

  const stats = [
    { label: 'Distance', value: winner.distance ? `${winner.distance} km away` : 'N/A' },
    { label: 'Google Rating', value: winner.googleRating ? `${winner.googleRating.toFixed(1)} ⭐` : 'No data' },
    { label: 'Community', value: restaurantRating ? `${restaurantRating.toFixed(1)} ⭐` : 'No reviews yet' },
    { label: 'Total Reviews', value: (winner.googleRatingCount || 0) + restaurantRatingCount }
  ];

  return(
    <div>
      <Header/>
      
      <main style={styles.pageWrapper}>
        <div style={styles.content}>
          <div style={styles.topRow}>
            <section style={styles.featuredCard}>
              <div style={styles.heroImage}>
                <img 
                  src={winner.url}
                  alt={winner.name}
                  style={{width: '100%', height: '100%', objectFit: 'cover'}}
                />
                <div style={styles.heroBadge}>
                  <span role="img" aria-label="sparkle">✨</span>
                  {matchLabel}
                </div>
              </div>
              <div style={styles.featureBody}>
                <div style={styles.featureHeader}>
                  <div>
                    <p style={{margin: 0, letterSpacing: '0.15em', fontSize: '0.85rem', color: palette.textSecondary}}>RESTAURANT FOUND</p>
                    <h2 style={{margin: '4px 0 6px', fontSize: '2rem', color: palette.textPrimary}}>{winner.name}</h2>
                    {winner.address && (
                      <p style={{margin: 0, color: palette.textSecondary}}>{winner.address}</p>
                    )}
                  </div>
                  <div style={styles.ratingPill}>
                    <div style={{fontSize: '2rem', fontWeight: 700, color: palette.accent}}>
                      {combinedRating ? combinedRating.toFixed(1) : '--'}
                    </div>
                    <div style={{fontSize: '0.85rem', color: palette.textSecondary}}>
                      {winner.googleRatingCount ? `${winner.googleRatingCount.toLocaleString()}+ Google reviews` : 'Community score'}
                    </div>
                  </div>
                </div>

                <div style={styles.statsGrid}>
                  {stats.map((stat, index) => (
                    <div key={index} style={styles.statCard}>
                      <span style={{fontSize: '0.85rem', color: palette.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em'}}>{stat.label}</span>
                      <strong style={{fontSize: '1.1rem'}}>{stat.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside style={styles.sideCard}>
              <div>
                <p style={{margin: 0, letterSpacing: '0.3em', fontSize: '0.8rem', color: palette.textSecondary}}>NEXT STEPS</p>
                <h3 style={{margin: '6px 0 4px', color: palette.textPrimary}}>Plan your meal</h3>
                <p style={{margin: 0, color: palette.textSecondary, fontSize: '0.95rem'}}>
                  Need directions, want to review the voting, or ready to wrap up? Use the quick actions below.
                </p>
              </div>
              <button style={styles.ctaButton('primary')} onClick={handleMapClick}>Open in Google Maps</button>
              <button style={styles.ctaButton('outline')} onClick={handleViewDetails}>View Voting Details</button>
              <button style={styles.ctaButton('outline')} onClick={handleReviewClick}>See Community Reviews</button>
              <button 
                style={{
                  ...styles.ctaButton('ghost'),
                  color: palette.accent,
                  fontWeight: 600,
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none'
                }}
                onClick={handleExit}
              >
                Exit Room
              </button>
            </aside>
          </div>
        </div>
      </main>

      <Footer
        location="Your Location"
        review={combinedRating ? ` ${combinedRating.toFixed(1)}` : " -"}
        onclickreview={handleReviewClick}
      />
      
      {/* Voters Modal */}
      {showVotersModal && voteDetails && (
        <VotersModal 
          voteDetails={voteDetails}
          onClose={() => setShowVotersModal(false)}
        />
      )}
      
      {/* Rating Modal */}
      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={handleCloseRatingModal}
        restaurant={winner ? {
          id: winner.id,
          name: winner.name,
          address: winner.address,
          url: winner.url,
          rating: combinedRating,
          distance: winner.distance,
          googleRating: winner.googleRating,
          googleRatingCount: winner.googleRatingCount,
          userRating: restaurantRating,
          userRatingCount: restaurantRatingCount
        } : null}
      />
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
          maxWidth: "520px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
          background: palette.card,
          borderRadius: "24px",
          border: `2px solid ${palette.border}`,
          padding: "28px",
          boxShadow: "0 35px 55px rgba(74,31,12,0.25)",
          color: palette.textPrimary
        }}
      >
        <h3 
          className="modal-title" 
          style={{
            color: palette.textPrimary,
            marginTop: 0,
            marginBottom: "1.25rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontSize: "0.95rem"
          }}
        >
          Voting Details
        </h3>
        
        {/* Statistics */}
        <div style={{
          background: "linear-gradient(135deg, rgba(192,71,28,0.12), rgba(255,212,186,0.9))",
          padding: "20px",
          borderRadius: "18px",
          marginBottom: "24px",
          textAlign: "center",
          border: `1px solid rgba(192,71,28,0.2)`
        }}>
          <div style={{fontSize: "2.4rem", fontWeight: 700, color: palette.accent}}>
            {(voteDetails.stats.approvalRate * 100).toFixed(0)}%
          </div>
          <div style={{color: palette.textSecondary, fontSize: "0.95rem", fontWeight: 500}}>
            {voteDetails.stats.acceptCount} liked / {voteDetails.stats.totalVotes} votes
          </div>
        </div>

        {/* Accept Voters */}
        <div style={{marginBottom: "20px"}}>
          <h4 style={{color: palette.success, marginBottom: "10px", fontSize: "1rem"}}>
            ✅ Liked this restaurant ({acceptVoters.length} people)
          </h4>
          <div style={{
            backgroundColor: "rgba(76,175,80,0.08)",
            padding: "14px",
            borderRadius: "14px",
            maxHeight: "200px",
            overflowY: "auto",
            border: "1px solid rgba(76,175,80,0.3)"
          }}>
            {acceptVoters.length > 0 ? (
              acceptVoters.map((v, i) => (
                <div 
                  key={v.id} 
                  style={{
                    padding: "10px",
                    borderRadius: "12px",
                    border: i < acceptVoters.length - 1 ? "1px dashed rgba(76,175,80,0.3)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                >
                  <span style={{fontWeight: 600, color: palette.textPrimary}}>👤 {v.voterName}</span>
                </div>
              ))
            ) : (
              <div style={{color: palette.textSecondary, textAlign: "center"}}>None</div>
            )}
          </div>
        </div>

        {/* Reject Voters */}
        <div style={{marginBottom: "20px"}}>
          <h4 style={{color: palette.accent, marginBottom: "10px", fontSize: "1rem"}}>
            ❌ Didn't like this restaurant ({rejectVoters.length} people)
          </h4>
          <div style={{
            backgroundColor: "rgba(192,71,28,0.08)",
            padding: "14px",
            borderRadius: "14px",
            maxHeight: "200px",
            overflowY: "auto",
            border: "1px solid rgba(192,71,28,0.3)"
          }}>
            {rejectVoters.length > 0 ? (
              rejectVoters.map((v, i) => (
                <div 
                  key={v.id} 
                  style={{
                    padding: "10px",
                    borderRadius: "12px",
                    border: i < rejectVoters.length - 1 ? "1px dashed rgba(192,71,28,0.3)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                >
                  <span style={{fontWeight: 600, color: palette.textPrimary}}>👤 {v.voterName}</span>
                </div>
              ))
            ) : (
              <div style={{color: palette.textSecondary, textAlign: "center"}}>None</div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div style={{textAlign: "center", marginTop: "20px"}}>
          <button 
            onClick={onClose}
            style={{
              width: "200px",
              padding: "12px 16px",
              borderRadius: "999px",
              border: "none",
              background: palette.accent,
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 15px 30px rgba(192,71,28,0.25)"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default Result
