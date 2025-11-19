import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './header.jsx'
import Footer from './components/smallfooter.jsx'
import DrawBox from './components/drawbox.jsx'
import { config } from './config';

const star = <svg xmlns="http://www.w3.org/2000/svg" width="80%" height="80%" viewBox="0 0 24 24" fill="none">
<path d="M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z" fill="white"/>
</svg>;

const heart = <svg xmlns="http://www.w3.org/2000/svg" width="80%" height="80%" viewBox="0 0 24 24" fill="none">
<path d="M2 9.1371C2 14 6.01943 16.5914 8.96173 18.9109C10 19.7294 11 20.5 12 20.5C13 20.5 14 19.7294 15.0383 18.9109C17.9806 16.5914 22 14 22 9.1371C22 4.27416 16.4998 0.825464 12 5.50063C7.50016 0.825464 2 4.27416 2 9.1371Z" fill="white"/>
</svg>;

// API Configuration
const API_BASE_URL = config.apiUrl + '/api';

// API Functions
const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    });
    
    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `API Error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If response is not JSON, use status code
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

// Send vote to backend
const submitVote = async (roomId, restaurantId, value) => {
  return await apiRequest('/votes', {
    method: 'POST',
    body: JSON.stringify({
      roomId,
      restaurantId,
      value: value === 'accept' ? 'ACCEPT' : 'REJECT'
    }),
  });
};

// Finalize decision (host only)
const finalizeRoomDecision = async (roomId, center, tiedRestaurantIds) => {
  const body = { 
    ...(center?.lat != null && center?.lng != null ? { center } : {}),
    ...(tiedRestaurantIds && tiedRestaurantIds.length > 0 ? { tiedRestaurantIds } : {})
  };
  return await apiRequest(`/rooms/${roomId}/decide/final`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

// Check if room results are ready
const checkRoomResults = async (roomId) => {
  return await apiRequest(`/rooms/${roomId}/decide/score`);
};

// Generate restaurant image URL
const getRestaurantImageUrl = (restaurantId, index) => {
  return `/restaurant/restaurant${(index % 8) + 1}.jpg`;
};

// Room participants
const fetchRoomInfo = async (roomId) => {
  return await apiRequest(`/rooms/${roomId}`, { method: 'GET' });
};

// Fetch votes for one restaurant (with voter names)
const fetchVotesForRestaurant = async (roomId, restaurantId) => {
  return await apiRequest(`/rooms/${roomId}/votes/${restaurantId}`, { method: 'GET' });
};

function DrawPage(){
    const location = useLocation();
    const navigate = useNavigate();
    
    const { roomId, tiedRestaurants, userCenter, isHost } = location.state || {};

    const [candidate1, setCandidate1] = useState(null);
    const [candidate2, setCandidate2] = useState(null);
    const [isVoting, setIsVoting] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasVoted, setHasVoted] = useState(false);
    const [totalParticipants, setTotalParticipants] = useState(0);
    const [numVoted, setNumVoted] = useState(0);

    // Load candidates from location state
    useEffect(() => {
        if (!tiedRestaurants || tiedRestaurants.length < 2) {
            console.error('[DrawPage] Missing tied restaurants data');
            // Fallback: navigate back or show error
            navigate('/foodtinder', { state: { roomId } });
            return;
        }

        // Set candidates from tied restaurants
        const r1 = tiedRestaurants[0];
        const r2 = tiedRestaurants[1];
        
        setCandidate1({
            id: r1.restaurantId,
            name: r1.name || 'Restaurant 1',
            km: r1.location?.lat && r1.location?.lng && userCenter?.lat && userCenter?.lng
                ? calculateDistance(userCenter, r1.location).toFixed(1)
                : '0.0',
            img: getRestaurantImageUrl(r1.restaurantId, 0),
            address: r1.address,
            rating: r1.rating,
            restaurantId: r1.restaurantId
        });

        setCandidate2({
            id: r2.restaurantId,
            name: r2.name || 'Restaurant 2',
            km: r2.location?.lat && r2.location?.lng && userCenter?.lat && userCenter?.lng
                ? calculateDistance(userCenter, r2.location).toFixed(1)
                : '0.0',
            img: getRestaurantImageUrl(r2.restaurantId, 1),
            address: r2.address,
            rating: r2.rating,
            restaurantId: r2.restaurantId
        });

        setIsLoading(false);
    }, [tiedRestaurants, userCenter, navigate, roomId]);

    // Calculate distance between two points
    const calculateDistance = (from, to) => {
        if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) return 0;
        const R = 6371; // Earth's radius in km
        const dLat = ((to.lat - from.lat) * Math.PI) / 180;
        const dLng = ((to.lng - from.lng) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((from.lat * Math.PI) / 180) *
            Math.cos((to.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Poll vote progress: how many unique voters have voted among the two candidates vs total participants
    useEffect(() => {
        if (!roomId || !candidate1 || !candidate2) return;
        // Start polling
        const interval = setInterval(async () => {
            try {
                const room = await fetchRoomInfo(roomId);
                const participants = Array.isArray(room?.participants) ? room.participants : [];
                setTotalParticipants(participants.length);

                const [v1, v2] = await Promise.all([
                    fetchVotesForRestaurant(roomId, candidate1.restaurantId || candidate1.id),
                    fetchVotesForRestaurant(roomId, candidate2.restaurantId || candidate2.id),
                ]);

                const voters = new Set();
                // Use voterName as identifier (displayName/username). In practice this is unique in-room.
                (v1?.votes || []).forEach(v => voters.add(v.voterName));
                (v2?.votes || []).forEach(v => voters.add(v.voterName));
                setNumVoted(voters.size);
                
                // For non-host: if all participants have voted and host hasn't finalized yet, start polling
                if (!isHost && hasVoted && voters.size >= participants.length) {
                    // All participants have voted, check if host has finalized
                    try {
                        const finalDecision = await apiRequest(`/rooms/${roomId}/decide/final`, { method: 'GET' });
                        if (finalDecision?.winner) {
                            // Host has finalized, navigate to result
                            const scoreData = await checkRoomResults(roomId);
                            navigate('/result', {
                                state: {
                                    roomId,
                                    results: {
                                        ...scoreData,
                                        winner: finalDecision.winner,
                                        decidedAt: finalDecision.decidedAt,
                                        mapLinks: finalDecision.mapLinks
                                    },
                                    userCenter
                                }
                            });
                        }
                    } catch {
                        // Final decision not ready yet, continue polling
                    }
                }
            } catch (e) {
                console.warn('[DrawPage] Failed to poll vote progress', e);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [roomId, candidate1, candidate2, isHost, hasVoted, navigate, userCenter]);

    const handleVote = async (selectedCandidate) => {
        if (!roomId || !selectedCandidate || isSubmitting || hasVoted) return;

        try {
            setIsSubmitting(true);
            console.log('[DrawPage] Voting for:', selectedCandidate.name);
            
            // Submit vote to backend
            await submitVote(roomId, selectedCandidate.restaurantId || selectedCandidate.id, 'accept');
            // In draw mode, ensure the other candidate is explicitly rejected by this voter
            const other =
                (candidate1 && (selectedCandidate.restaurantId || selectedCandidate.id) !== (candidate1.restaurantId || candidate1.id))
                    ? candidate1
                    : candidate2;
            if (other) {
                await submitVote(roomId, other.restaurantId || other.id, 'reject');
            }
            console.log('[DrawPage] Vote submitted for restaurant:', selectedCandidate.restaurantId || selectedCandidate.id);
            
            setHasVoted(true);
            setIsVoting(false);
            
            // Wait a bit for vote to process, then check if we can finalize
            setTimeout(async () => {
        try {
                    // Check current scores
                    const roomResults = await checkRoomResults(roomId);

                    // Compare ONLY the two candidates participating in this draw
                    const byId = new Map(roomResults.scores.map(s => [s.restaurantId, s]));
                    const s1 = byId.get((candidate1?.restaurantId) || (candidate1?.id));
                    const s2 = byId.get((candidate2?.restaurantId) || (candidate2?.id));

                    if (s1 && s2) {
                        const stillTied =
                            s1.netScore === s2.netScore &&
                            s1.approval === s2.approval &&
                            s1.accept === s2.accept;

                        if (stillTied) {
                            console.log('[DrawPage] Still tied between the two candidates, waiting for more votes...');
                            // No auto-random; show waiting screen and host can press Finalize
                            // Non-host should start polling if they haven't voted yet or if they just voted
                            if (!isHost && !hasVoted) {
                                // Non-host hasn't voted yet, will poll after voting
                            } else if (!isHost) {
                                // Non-host has voted, start polling for final decision
                                pollForFinalDecision();
                            }
                        } else {
                            console.log('[DrawPage] Tie resolved between the two candidates.');
                            if (isHost) {
                                console.log('[DrawPage] Host waiting to press Finalize after all votes are in...');
                                // Host will press the Finalize button manually (button is gated by numVoted === totalParticipants)
                            } else {
                                console.log('[DrawPage] Non-host waiting for host to finalize...');
                                pollForFinalDecision();
                            }
                        }
                    } else {
                        // If we cannot find both scores, fall back to finalize to avoid getting stuck
                        console.warn('[DrawPage] Candidate scores missing from results; waiting based on role.');
                        if (!isHost) pollForFinalDecision();
            }
        } catch (error) {
                    console.error('[DrawPage] Error checking results:', error);
                    // Fallback: poll for final decision
                    pollForFinalDecision();
        } finally {
                    // Allow host to click Finalize; submitting phase is done
                    setIsSubmitting(false);
        }
            }, 2000);
        } catch (error) {
            console.error('[DrawPage] Failed to submit vote:', error);
            alert('Failed to submit vote. Please try again.');
            setIsSubmitting(false);
        }
    };

    const pollForFinalDecision = () => {
        const pollInterval = setInterval(async () => {
            try {
                const finalDecision = await apiRequest(`/rooms/${roomId}/decide/final`, { method: 'GET' });
                if (finalDecision?.winner) {
                    clearInterval(pollInterval);
                    // Navigate to result page
                    const scoreData = await checkRoomResults(roomId);
                    navigate('/result', {
                        state: {
                            roomId,
                            results: {
                                ...scoreData,
                                winner: finalDecision.winner,
                                decidedAt: finalDecision.decidedAt,
                                mapLinks: finalDecision.mapLinks
                            },
                            userCenter
                        }
                    });
                }
        } catch (error) {
                console.error('[DrawPage] Error polling final decision:', error);
            }
        }, 3000);

        // Cleanup after 60 seconds
        setTimeout(() => clearInterval(pollInterval), 60000);
    };

    // Removed auto-random countdown. Host will press finalize manually.

    const finalizeAndNavigate = async () => {
        try {
            // Get tied restaurant IDs to restrict winner selection
            const tiedIds = tiedRestaurants?.map(r => r.restaurantId).filter(Boolean);
            const finalResponse = await finalizeRoomDecision(roomId, userCenter, tiedIds);
            const scoreData = await checkRoomResults(roomId);
            
            navigate('/result', {
                state: {
                    roomId,
                    results: {
                        ...scoreData,
                        winner: finalResponse.winner,
                        decidedAt: finalResponse.decidedAt,
                        mapLinks: finalResponse.mapLinks
                    },
                    userCenter
                    }
            });
        } catch (error) {
            console.error('[DrawPage] Failed to finalize:', error);
            alert('Failed to finalize decision. Please try again.');
        }
    };

    return (
        <div>
            <Header/>
            <section 
                className="d-flex align-items-center justify-content-center position-relative overflow-hidden"
                style={{
                    minHeight: "100vh",
                    paddingTop: "80px",      // space for fixed header
                    paddingBottom: "110px",  // space for sticky footer
                    boxSizing: "border-box"
                }}
            >

                {isVoting?(<span 
                    className="position-absolute top-50 start-50 translate-middle"
                    style={{
                        fontSize: 'clamp(3rem, 10vh, 10rem)', // Responsive font size
                        fontWeight: 'bold',
                        color: 'rgba(200, 200, 200, 0.3)', // Light gray with transparency
                        whiteSpace: 'nowrap',
                        userSelect: 'none', // Makes it non-selectable
                        zIndex: 1, // Above section background but below content
                        textShadow: '2px 2px 4px rgba(0,0,0,0.1)' // Subtle shadow for visibility
                    }}
                >
                    DRAW<br/>
                    DRAW<br/>
                    DRAW<br/>
                    DRAW<br/>
                    DRAW<br/>
                    DRAW<br/>
                    DRAW<br/>
                    DRAW<br/>
                    DRAW<br/>
                    DRAW<br/>
                    

                </span>) : <div/>}

                {isLoading ? (
                    <div className="text-center">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <h3 className="mt-3">Loading restaurants...</h3>
                    </div>
                ) : isVoting && candidate1 && candidate2 ? (
                    <div className="w-100" style={{zIndex: 2}}>
                        <div className="container">
                            <div className="row justify-content-center align-items-stretch">
                                <div className="col-12">
                                    <h1 className="text-center mt-0 mb-4" style={{fontSize: "clamp(1.4rem, 2.5vw, 2.2rem)"}}>It's a draw!! Vote one!!</h1>
                            </div>
                                <div className="col-12 d-flex justify-content-center align-items-center gap-4 mt-2">
                            <DrawBox 
                                name={candidate1.name} 
                                km={candidate1.km} 
                                imgUrl={candidate1.img} 
                                icon={star} 
                                bcolor="#BB3D25" 
                                b2color="#B33821"
                                        onClick={() => handleVote(candidate1)}
                                        disabled={isSubmitting || hasVoted}
                            />
                            <DrawBox 
                                name={candidate2.name} 
                                km={candidate2.km} 
                                imgUrl={candidate2.img} 
                                icon={heart} 
                                bcolor="#517824" 
                                b2color="#4A6B23"
                                        onClick={() => handleVote(candidate2)}
                                        disabled={isSubmitting || hasVoted}
                            />
                        </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="spinner-border text-primary mb-3" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <h2>Voting Complete!</h2>
                        <p className="mb-1">Progress: {numVoted} / {totalParticipants} voted</p>
                        {isHost ? (
                            <>
                                <p className="mb-2">
                                    {numVoted < totalParticipants
                                        ? 'Waiting for all participants to vote before you can finalize...'
                                        : 'All participants have voted. Press finalize to proceed.'}
                                </p>
                        <button 
                                    className="btn btn-success"
                                    onClick={finalizeAndNavigate}
                                    disabled={isSubmitting || numVoted < totalParticipants}
                        >
                                    Finalize
                        </button>
                            </>
                        ) : (
                            <>
                                <p>Waiting for host to finalize...</p>
                                <p className="text-muted">You will be redirected automatically.</p>
                            </>
                        )}
                    </div>
                )}
            </section>
            <Footer/>
        </div>
    )
}

export default DrawPage