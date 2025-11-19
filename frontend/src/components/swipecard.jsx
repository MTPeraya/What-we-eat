import React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';
import { motion, useMotionValue,  useTransform, animate} from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Button from "./swipeButton"

const heart  = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20"><path fill="#000000" d="m10 3.22l-.61-.6a5.5 5.5 0 0 0-7.78 7.77L10 18.78l8.39-8.4a5.5 5.5 0 0 0-7.78-7.77l-.61.61z"/></svg>

const cross = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 8 8"><path fill="#000000" d="M1.41 0L0 1.41l.72.72L2.5 3.94L.72 5.72L0 6.41l1.41 1.44l.72-.72l1.81-1.81l1.78 1.81l.69.72l1.44-1.44l-.72-.69l-1.81-1.78l1.81-1.81l.72-.72L6.41 0l-.69.72L3.94 2.5L2.13.72L1.41 0z"/></svg>

import { config } from '../config';

const locationPin = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20"><path fill="white" d="M10 20S3 10.87 3 7a7 7 0 1 1 14 0c0 3.87-7 13-7 13zm0-11a2 2 0 1 0 0-4a2 2 0 0 0 0 4z"/></svg>

// API Configuration
const API_BASE_URL = config.apiUrl + '/api';
const MAX_RESTAURANTS_PER_SESSION = 20;

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
    return await response.json();
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

// Fetch restaurants for a specific room (everyone in room gets same restaurants)
const fetchRoomCandidates = async (roomId, center) => {
  const body = center?.lat && center?.lng 
    ? { center: { lat: center.lat, lng: center.lng }, limit: 20 }
    : { limit: 20 };
  
  return await apiRequest(`/rooms/${roomId}/candidates`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
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

// Check if room results are ready
const checkRoomResults = async (roomId) => {
  return await apiRequest(`/rooms/${roomId}/decide/score`);
};

// Finalize decision (host only)
const finalizeRoomDecision = async (roomId, center) => {
  const body =
    center?.lat != null && center?.lng != null ? { center } : {};

  return await apiRequest(`/rooms/${roomId}/decide/final`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

// Fetch latest finalized decision (non-host polling)
const fetchFinalDecision = async (roomId) => {
  return await apiRequest(`/rooms/${roomId}/decide/final`, {
    method: 'GET',
  });
};

// Fetch room info (participants)
const fetchRoomInfo = async (roomId) => {
  return await apiRequest(`/rooms/${roomId}`, { method: 'GET' });
};

// Start room (host only)
const startRoom = async (roomId, center) => {
  const body = center?.lat && center?.lng 
    ? { center: { lat: center.lat, lng: center.lng } }
    : {};
  
  return await apiRequest(`/rooms/${roomId}/start`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

// Mark that host is viewing results
const markHostViewing = async (roomId) => {
  return await apiRequest(`/rooms/${roomId}/decide/view`, { method: 'POST' });
};

// Check if host is viewing results
const checkHostViewing = async (roomId) => {
  return await apiRequest(`/rooms/${roomId}/decide/view`, { method: 'GET' });
};

// Generate restaurant image URL
const getRestaurantImageUrl = (restaurantId, index) => {
  // Use local fallback images (reliable, no API calls)
  return `/restaurant/restaurant${(index % 8) + 1}.jpg`;
  
  // Option: Use Unsplash Source API (free, beautiful food photos)
  // Uncomment below to use Unsplash instead:
  // const seed = restaurantId || index;
  // return `https://source.unsplash.com/300x520/?food,restaurant&sig=${seed}`;
};

// Transform room candidates data to match component format
const transformCandidatesData = (apiData) => {
  // Extract items array from API response { roomId, count, items }
  const restaurants = apiData.items || [];
  
  const transformed = restaurants.map((restaurant, index) => {
    // Convert distance from meters to km, keep as number for filtering/sorting
    const distanceKm = restaurant.distanceM ? restaurant.distanceM / 1000 : null;
    
    const card = {
      id: restaurant.restaurantId, // candidates API uses restaurantId instead of id
      url: getRestaurantImageUrl(restaurant.restaurantId, index),
      name: restaurant.name,
      address: restaurant.address,
      rating: restaurant.rating,
      price: restaurant.priceLevel,
      lat: restaurant.lat,
      lng: restaurant.lng,
      userRatingsTotal: restaurant.userRatingsTotal,
      distance: distanceKm, // Keep as number for sorting, format later for display
    };
    
    return card;
  });
  
  return transformed;
};

// Safe format distance for display
const formatDistance = (distance) => {
  if (distance === null || distance === undefined) return "0.0";
  const num = typeof distance === 'string' ? parseFloat(distance) : distance;
  if (isNaN(num)) return "0.0";
  return num.toFixed(1);
};


const SwipeCards = ({ roomId, userCenter, isHost, onCurrentCardChange }) => {
    const center = useMemo(() => {
        if (userCenter?.lat == null || userCenter?.lng == null) return undefined;
        return { lat: userCenter.lat, lng: userCenter.lng };
    }, [userCenter?.lat, userCenter?.lng]);
    const centerKey = center ? `${center.lat}:${center.lng}` : 'none';
    const normalizedCenter = useMemo(() => {
        if (!center) return null;
        return { lat: Number(center.lat), lng: Number(center.lng) };
    }, [centerKey]);
    const navigate = useNavigate();
    const [cards, setCards] = useState([]);
    const [isSwiping, setIsSwiping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState(null);
    const [hasMoreCards, setHasMoreCards] = useState(true);
    const [totalRestaurants, setTotalRestaurants] = useState(0); // Track total for progress
    const [allCardsCompleted, setAllCardsCompleted] = useState(false); // Track if swiped all 20
    const [canFinalize, setCanFinalize] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [totalParticipants, setTotalParticipants] = useState(0);
    const [finalizeRequirements, setFinalizeRequirements] = useState({
        restaurantsNeeded: MAX_RESTAURANTS_PER_SESSION,
        votesNeeded: MAX_RESTAURANTS_PER_SESSION,
    });
    const MAX_RESTAURANTS = 20; // Limit to 20 restaurants

    const topCardRef = useRef(null); // ref to call programmatic swipe
    const lastNotifiedCardId = useRef(null); // Track last notified card
    const hasLoadedInitialCards = useRef(false); // Prevent multiple initial loads
    const loadedKeyRef = useRef(null); // Track what roomId+centerKey combination we've loaded
    const loadInitialCardsRef = useRef(null); // Ref to latest loadInitialCards function
    
    // Notify parent about current card changes (only when card actually changes)
    useEffect(() => {
        if (onCurrentCardChange && cards.length > 0) {
            const currentCard = cards[0];
            // Only notify if card actually changed (different ID)
            if (currentCard.id !== lastNotifiedCardId.current) {
                lastNotifiedCardId.current = currentCard.id;
                onCurrentCardChange(currentCard);
            }
        }
    }, [cards, onCurrentCardChange]);

    const loadInitialCards = useCallback(async () => {
        // Create a unique key for this load request
        const currentKey = `${roomId}:${centerKey}`;
        
        // Prevent loading if already loaded or loading for this exact combination
        if (hasLoadedInitialCards.current && loadedKeyRef.current === currentKey) {
            console.log('[SwipeCards] Skipping loadInitialCards - already loaded for', currentKey);
            return;
        }

        if (!roomId) {
            console.warn('[SwipeCards] No roomId provided');
            return;
        }

        try {
            hasLoadedInitialCards.current = true;
            loadedKeyRef.current = currentKey;
            setIsLoading(true);
            
            // First, check room status
            console.log('[SwipeCards] Checking room status for room:', roomId);
            const roomInfo = await fetchRoomInfo(roomId);
            console.log('[SwipeCards] Room status:', roomInfo.status);
            
            // If room is not STARTED, try to start it (if host) or wait
            if (roomInfo.status !== 'STARTED') {
                if (isHost && center) {
                    console.log('[SwipeCards] Room not started, host will start it now');
                    try {
                        await startRoom(roomId, center);
                        console.log('[SwipeCards] Room started successfully');
                        // Wait a bit for the status to update
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (startError) {
                        console.error('[SwipeCards] Failed to start room:', startError);
                        // Reset flag so it can be retried
                        hasLoadedInitialCards.current = false;
                        loadedKeyRef.current = null;
                        setIsLoading(false);
                        return;
                    }
                } else {
                    console.log('[SwipeCards] Room not started yet, waiting for host...');
                    // Reset flag so it can be retried
                    hasLoadedInitialCards.current = false;
                    loadedKeyRef.current = null;
                    setIsLoading(false);
                    return;
                }
            }
            
            console.log('[SwipeCards] Fetching candidates for room:', roomId, { center: normalizedCenter });
            const response = await fetchRoomCandidates(roomId, normalizedCenter);
            console.log("[SwipeCards] fetchRoomCandidates Pass - received", response.items?.length, "items");

            if (response.items && response.items.length > 0) {
                const transformedCards = transformCandidatesData(response);

                // Filter restaurants within 5km (previous behavior)
                const MAX_DISTANCE_KM = 5;
                const filteredCards = transformedCards.filter((card) => {
                    if (card.distance == null) return false;
                    return card.distance <= MAX_DISTANCE_KM;
                });
                
                if (filteredCards.length === 0) {
                    console.warn('[SwipeCards] No restaurants within 5km of user');
                    setCards([]);
                    setTotalRestaurants(0);
                    setHasMoreCards(false);
                    return;
                }

                // Sort by distance (closest first)
                const sortedCards = filteredCards.sort((a, b) => {
                    const distA = a.distance ?? Infinity;
                    const distB = b.distance ?? Infinity;
                    return distA - distB;
                });
                
                // Limit to MAX_RESTAURANTS
                const limitedCards = sortedCards.slice(0, MAX_RESTAURANTS_PER_SESSION);
                console.log('[SwipeCards] Total received:', transformedCards.length, 'restaurants');
                console.log('[SwipeCards] Filtered to', filteredCards.length, 'restaurants within 5km');
                console.log('[SwipeCards] Setting', limitedCards.length, 'cards');
                setCards(limitedCards);
                setTotalRestaurants(limitedCards.length);
                // Don't load more if we've limited to max
                setHasMoreCards(false);
            } else {
                console.warn('[SwipeCards] No restaurants found');
                setCards([]);
                setTotalRestaurants(0);
            }
        } catch (error) {
            console.error('[SwipeCards] Failed to load initial cards:', error);
            // Check if error is ROOM_NOT_STARTED or 400 status
            if (error.message && (error.message.includes('ROOM_NOT_STARTED') || error.message.includes('400'))) {
                console.log('[SwipeCards] Room not started, will retry...');
                // Reset flag so it can be retried
                hasLoadedInitialCards.current = false;
                loadedKeyRef.current = null;
                // If not host, show message
                if (!isHost) {
                    console.log('[SwipeCards] Waiting for host to start the room...');
                }
            } else {
                // Reset flag on error so it can be retried
                hasLoadedInitialCards.current = false;
                loadedKeyRef.current = null;
                // Don't fallback to mockup - show empty state instead
                setCards([]);
                setTotalRestaurants(0);
            }
        } finally {
            setIsLoading(false);
        }
    }, [roomId, centerKey, normalizedCenter, isHost, center]);
    
    // Keep ref up to date with latest loadInitialCards function
    useEffect(() => {
        loadInitialCardsRef.current = loadInitialCards;
    }, [loadInitialCards]);

    // Fetch room info to get participant count
    useEffect(() => {
        if (!roomId) return;
        
        const loadRoomInfo = async () => {
            try {
                const roomInfo = await fetchRoomInfo(roomId);
                const participants = Array.isArray(roomInfo?.participants) ? roomInfo.participants : [];
                setTotalParticipants(participants.length);
            } catch (error) {
                console.error('[SwipeCards] Failed to load room info:', error);
            }
        };
        
        loadRoomInfo();
        
        // Poll for participant count updates
        const interval = setInterval(loadRoomInfo, 5000);
        return () => clearInterval(interval);
    }, [roomId]);

    // Retry loading cards if room was not started (for non-hosts)
    useEffect(() => {
        if (!roomId || isHost) return;
        
        const currentKey = `${roomId}:${centerKey}`;
        // Only retry if we haven't successfully loaded for this key
        if (hasLoadedInitialCards.current && loadedKeyRef.current === currentKey) {
            return;
        }
        
        const retryInterval = setInterval(async () => {
            try {
                const roomInfo = await fetchRoomInfo(roomId);
                if (roomInfo.status === 'STARTED') {
                    console.log('[SwipeCards] Room is now started, loading cards...');
                    // Don't reset flag here - let loadInitialCards handle it
                    if (loadInitialCardsRef.current) {
                        loadInitialCardsRef.current();
                    }
                    clearInterval(retryInterval);
                }
            } catch (error) {
                console.error('[SwipeCards] Error checking room status for retry:', error);
            }
        }, 2000); // Check every 2 seconds
        
        return () => clearInterval(retryInterval);
    }, [roomId, isHost, centerKey]); // Removed loadInitialCards from dependencies - using ref instead

    // Fetch initial restaurant data when component mounts or roomId/location changes
    useEffect(() => {
        if (!roomId) return;
        
        const currentKey = `${roomId}:${centerKey}`;
        // Only load if we haven't loaded for this exact combination
        if (hasLoadedInitialCards.current && loadedKeyRef.current === currentKey) {
            console.log('[SwipeCards] Already loaded for', currentKey, '- skipping');
            return;
        }
        
        console.log('[SwipeCards] Room or location changed - loading cards');
        // Call loadInitialCards via ref to avoid dependency issues
        if (loadInitialCardsRef.current) {
            loadInitialCardsRef.current();
        }
    }, [roomId, centerKey]); // Removed loadInitialCards from dependencies - using ref instead

    // Reset flag when component unmounts
    useEffect(() => {
        return () => {
            console.log('[SwipeCards] Component unmounting - resetting load flag');
            hasLoadedInitialCards.current = false;
            loadedKeyRef.current = null;
        };
    }, []);

    const loadMoreCards = useCallback(async () => {
        if (!hasMoreCards) return;
        
        try {
            // Note: This function is currently not used as we limit to 20 restaurants
            // If you need pagination in the future, implement fetchRestaurants and transformRestaurantData
            console.warn('loadMoreCards called but pagination is disabled');
            setHasMoreCards(false);
        } catch (error) {
            console.error('Failed to load more cards:', error);
            setHasMoreCards(false);
        }
    }, [hasMoreCards]);

    const handleVote = async (restaurantId, value) => {
        try {
            await submitVote(roomId, restaurantId, value);
            console.log(`Vote submitted: ${value} for restaurant ${restaurantId}`);
            
            // Check if this was the last card (swiped all 20)
            if (cards.length === 1) {
                // Mark as completed - this will show button for host
                setAllCardsCompleted(true);
            }
            
            // Check readiness to finalize after each vote (both host and non-host)
            await checkResults();
            
        } catch (error) {
            console.error('Failed to submit vote:', error);
        }
    };

    const isReadyForFinal = useCallback((roomResults) => {
        const totalVotes = roomResults.stats?.totalVotes || 0;
        const totalRestaurantsVoted = roomResults.stats?.totalRestaurants || 0;

        const restaurantsNeeded = totalRestaurants || MAX_RESTAURANTS_PER_SESSION;
        // Calculate expected votes: each participant should vote on all restaurants
        const expectedVotes = totalParticipants * restaurantsNeeded;
        const votesNeeded = expectedVotes;

        setFinalizeRequirements({ restaurantsNeeded, votesNeeded });

        // Ready when:
        // 1. All restaurants have been voted on
        // 2. All participants have voted on all restaurants (totalVotes >= expectedVotes)
        // 3. We have scores to work with
        const ready =
            totalRestaurantsVoted >= restaurantsNeeded &&
            totalVotes >= votesNeeded &&
            totalParticipants > 0 && // Must have participants
            Array.isArray(roomResults.scores) &&
            roomResults.scores.length > 0;

        setCanFinalize(ready);
        return ready;
    }, [totalRestaurants, totalParticipants]);

    const checkResults = useCallback(async () => {
        try {
            if (!roomId) return;
            const roomResults = await checkRoomResults(roomId);
            isReadyForFinal(roomResults);
        } catch (error) {
            console.error('Failed to check results:', error);
        }
    }, [roomId, isReadyForFinal]);

    const buildFinalResultsPayload = useCallback(
        (finalResponse, scoreData) => {
            if (!scoreData) return finalResponse;

            const winnerFromFinal = finalResponse?.winner;
            const winnerFromScores = winnerFromFinal
                ? scoreData.scores?.find(
                      (s) => s.restaurantId === winnerFromFinal.restaurantId
                  )
                : null;

            const mergedWinner = winnerFromFinal
                ? {
                      ...winnerFromScores,
                      ...winnerFromFinal,
                      restaurantId: winnerFromFinal.restaurantId,
                  }
                : winnerFromScores ?? null;

            return {
                ...scoreData,
                winner: mergedWinner,
                decidedAt: finalResponse?.decidedAt ?? scoreData.generatedAt,
                reason: finalResponse?.reason ?? null,
                mapLinks: finalResponse?.mapLinks ?? null,
            };
        },
        []
    );

    // Check if there are tied restaurants (same netScore)
    const checkForTiedScores = useCallback((roomResults) => {
        if (!roomResults?.scores || roomResults.scores.length < 2) return null;

        // Sort with the same rules as backend (netScore → approval → accept)
        const sorted = [...roomResults.scores].sort(
            (a, b) =>
                b.netScore - a.netScore ||
                b.approval - a.approval ||
                (b.accept ?? 0) - (a.accept ?? 0)
        );

        const a = sorted[0];
        const b = sorted[1];
        if (!a || !b) return null;

        const isTie =
            a.netScore === b.netScore &&
            a.approval === b.approval &&
            (a.accept ?? 0) === (b.accept ?? 0);

        return isTie ? [a, b] : null;
    }, []);

    const handleShowResults = async () => {
        if (!roomId || isFinalizing) return;

        try {
            setIsFinalizing(true);
            const roomResults = await checkRoomResults(roomId);
            const ready = isReadyForFinal(roomResults);

            if (!ready) {
                alert('Need more votes before finalizing the meal.');
                setIsFinalizing(false);
                return;
            }

            // Mark that host is viewing results (so non-hosts know to follow)
            if (isHost) {
                try {
                    await markHostViewing(roomId);
                } catch (error) {
                    console.warn('[SwipeCards] Failed to mark host viewing:', error);
                    // Continue anyway
                }
            }

            // Check for tied scores
            const tiedRestaurants = checkForTiedScores(roomResults);
            
            if (tiedRestaurants && tiedRestaurants.length >= 2) {
                // Navigate to DrawPage with tied restaurants
                console.log('[SwipeCards] Found tied restaurants, navigating to DrawPage');
                navigate('/draw', {
                    state: {
                        roomId,
                        isHost,
                        tiedRestaurants: tiedRestaurants.map(score => ({
                            restaurantId: score.restaurantId,
                            name: score.name,
                            address: score.address,
                            netScore: score.netScore,
                            approval: score.approval,
                            location: score.location,
                            rating: score.rating,
                            userRatingsTotal: score.userRatingsTotal,
                            placeId: score.placeId
                        })),
                        center
                    }
                });
                return;
            }

            // No tie, proceed with finalization
            const finalResponse = await finalizeRoomDecision(roomId, center);
            const combinedResults = buildFinalResultsPayload(finalResponse, roomResults);

            setResults(combinedResults);
                setShowResults(true);
        } catch (error) {
            console.error('Failed to finalize results:', error);
            alert('Failed to finalize results. Please try again.');
        } finally {
            setIsFinalizing(false);
        }
    };

    // Check if we need more cards and load them
    useEffect(() => {
        if (cards.length < 2 && hasMoreCards && !isLoading) {
            loadMoreCards();
        }
    }, [cards.length, hasMoreCards, isLoading, loadMoreCards]);

    const swipeLeft = () => {
      if (isLoading || isSwiping || cards.length === 0) {
        return;
      }
      const currentCardId = cards[0].id;
      setIsSwiping(true);
      topCardRef.current?.swipe("left", () => {
          setIsSwiping(false);
          handleVote(currentCardId, 'reject');
      });
    };
    
    const swipeRight = () => {
      if (isLoading || isSwiping || cards.length === 0) {
        return;
      }
      const currentCardId = cards[0].id;
      setIsSwiping(true);
      topCardRef.current?.swipe("right", () => {
          setIsSwiping(false);
          handleVote(currentCardId, 'accept');
      });
    };

    // Navigate to results page when results are ready
    useEffect(() => {
        if (showResults && results) {
            navigate('/result', { 
                state: { 
                    roomId,
                    results,
                    center 
                } 
            });
        }
    }, [showResults, results, navigate, roomId, center]);
    
    // Poll room status to detect when host triggers result viewing (for non-host members)
    useEffect(() => {
        if (!roomId || isHost || !allCardsCompleted) return;
        
        const pollInterval = setInterval(async () => {
            try {
                // Check if all participants have voted
                const roomResults = await checkRoomResults(roomId);
                const ready = isReadyForFinal(roomResults);
                
                if (!ready) {
                    // Not all participants have voted yet, keep waiting
                    return;
                }
                
                // All participants have voted, check if host has clicked "View Results"
                const hostViewing = await checkHostViewing(roomId);
                if (!hostViewing?.isViewing) {
                    // Host hasn't clicked "View Results" yet, keep waiting
                    return;
                }
                
                // Host has clicked "View Results", now check where they went
                // First check if there's a final decision (host finalized and went to result)
                const finalDecision = await fetchFinalDecision(roomId);
                if (finalDecision?.winner) {
                    const combinedResults = buildFinalResultsPayload(
                        finalDecision,
                        roomResults
                    );
                    setResults(combinedResults);
                        setShowResults(true);
                    clearInterval(pollInterval);
                    return;
                }
                
                // Check if there are tied scores (host navigated to draw page)
                const tiedRestaurants = checkForTiedScores(roomResults);
                if (tiedRestaurants && tiedRestaurants.length >= 2) {
                    // Host has navigated to draw page, follow them
                    console.log('[SwipeCards] Non-host following host to DrawPage');
                    navigate('/draw', {
                        state: {
                            roomId,
                            isHost: false,
                            tiedRestaurants: tiedRestaurants.map(score => ({
                                restaurantId: score.restaurantId,
                                name: score.name,
                                address: score.address,
                                netScore: score.netScore,
                                approval: score.approval,
                                location: score.location,
                                rating: score.rating,
                                userRatingsTotal: score.userRatingsTotal,
                                placeId: score.placeId
                            })),
                            center
                        }
                    });
                    clearInterval(pollInterval);
                    return;
                }
                
                // Host clicked "View Results" but no tie and no final decision yet
                // This shouldn't happen, but keep polling just in case
            } catch (error) {
                console.error('Error polling results:', error);
            }
        }, 2000); // Poll more frequently for better synchronization
        return () => clearInterval(pollInterval);
    }, [roomId, isHost, allCardsCompleted, buildFinalResultsPayload, isReadyForFinal, checkForTiedScores, navigate, center]);

    // Calculate current card number (total - remaining + 1)
    const currentCardNumber = totalRestaurants - cards.length + 1;

    return(
      <div className="d-flex justify-content-start align-items-center" style={{
        width: "100vw",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "90vh",
        height: "90vh",
        backgroundColor: "#FFE2C5",
        paddingTop: "10vh"
      }}>
        {isLoading ? (
          <div style={{fontSize: "1.5rem", color: "#801F08", marginTop: "40px"}}>Loading restaurants...</div>
        ) : (
          <>
            {/* Progress indicator */}
            {totalRestaurants > 0 && cards.length > 0 && (
              <div style={{
                marginTop: "20px",
                marginBottom: "10px",
                fontSize: "1.2rem",
                fontWeight: "bold",
                color: "#801F08"
              }}>
                {currentCardNumber} / {totalRestaurants}
              </div>
            )}
            
            {!isLoading && cards.length === 0 && !allCardsCompleted && (
              <div style={{fontSize: "1.5rem", color: "#801F08"}}>No restaurants found</div>
            )}
            
            <div className="" style={{display: "grid", placeItems: "center"}}>
              {cards.length > 1 && (
                <Card
                  key={cards[1].id}
                  id={cards[1].id}
                  url={cards[1].url}
                  isBack
                  name={cards[1].name}
                  location={formatDistance(cards[1].distance)}
                />
              )}
              {cards.length > 0 && (
                <Card
                  key={cards[0].id}
                  id={cards[0].id}
                  url={cards[0].url}
                  setCards={setCards}
                  ref={topCardRef}
                  name={cards[0].name}
                  location={formatDistance(cards[0].distance)}
                  onVote={handleVote}
                />
              )}
               {cards.length === 0 && allCardsCompleted && (
                 <div style={{
                   fontSize: "1.5rem", 
                   color: "#801F08", 
                   maxHeight: "520px",
                   height: "60vh",
                   display: "flex",
                   flexDirection: "column",
                   alignItems: "center",
                   justifyContent: "center",
                   textAlign: "center",
                   padding: "20px"
                 }}>
                   <div style={{marginBottom: "20px"}}>🎉</div>
                   <div style={{fontWeight: "bold", marginBottom: "10px"}}>All Done!</div>
                   {isHost ? (
                     <div style={{marginTop: "20px"}}>
                       <button 
                         className="green button"
                         onClick={handleShowResults}
                         disabled={!canFinalize || isFinalizing}
                         style={{
                           padding: "15px 30px",
                           fontSize: "1.2rem",
                           cursor: canFinalize && !isFinalizing ? "pointer" : "not-allowed",
                           opacity: canFinalize ? 1 : 0.7
                         }}
                       >
                         {isFinalizing ? 'Finalizing...' : 'View Results'}
                       </button>
                       {!canFinalize && (
                         <div style={{marginTop: "10px", fontSize: "0.9rem", color: "#555"}}>
                           {totalParticipants > 0 ? (
                             <>Waiting for all {totalParticipants} participants to vote on all {finalizeRequirements.restaurantsNeeded} restaurants...</>
                           ) : (
                             <>Need at least {finalizeRequirements.restaurantsNeeded} restaurants and {finalizeRequirements.votesNeeded} total votes.</>
                           )}
                         </div>
                       )}
                     </div>
                   ) : (
                     <div style={{fontSize: "1rem", color: "#666"}}>Waiting for host to view results...</div>
                   )}
                 </div>
               )}
            </div>
          </>
        )}

        <div style={{
            display: "flex",
            width: "300px",
            justifyContent: "space-between"
        }}>
        <Button id="LEFT" onClick={swipeLeft} disabled={isLoading || isSwiping || cards.length === 0}>{cross}</Button>
        <Button id="RIGHT" onClick={swipeRight} disabled={isLoading || isSwiping || cards.length === 0}>{heart}</Button>
        </div>
      </div>
    )
}


const Card = React.forwardRef(({id, url, setCards, isBack, name, location="0.0", onVote}, ref) => {
    const x = useMotionValue(0);

    const opacity = useTransform(x, [-150, 0 , 150], [0, 1, 0])
    const rotate = useTransform(x, [-150, 150], [-18, 18])

  const removeCard = () => {
    setCards && setCards(prev => prev.slice(1));
  }

    const handleDragEnd = () => {
        if (Math.abs(x.get()) > 50){
            if (x.get() > 50){
                console.log(`Yes${id}`);
                // Send accept vote to API
                onVote && onVote(id, 'accept');
            }
            if (x.get() < -50){
                console.log(`No${id}`)
                // Send reject vote to API
                onVote && onVote(id, 'reject');
            }
            removeCard();
        }
    }

  React.useImperativeHandle(ref, () => ({
    swipe(direction, onDone) {
      const to = direction === "right" ? 300 : -300;
      if (direction === "right") {
        console.log(`Yes${id}`);
        // Vote handled by parent component through onDone callback
      } else {
        console.log(`No${id}`);
        // Vote handled by parent component through onDone callback
      }
      animate(x, to, {
        type: "tween",
        stiffness: 200,
        onComplete: () => {
          removeCard();
          if (onDone) onDone();
        },
        duration: 0.3
      });
    },
  }));

    return (
        <motion.div
            // src={url}
            alt={id}
            className="rounded-lg"
            style={{
                backgroundImage: `url(${url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center', 
                backgroundRepeat: 'no-repeat',
                width: "80vw",
                height: "60vh",
                maxWidth: "300px",
                maxHeight: "520px",
                objectFit: "cover",
                borderRadius: "10px",
                gridRow: 1,
                gridColumn: 1,
                cursor: "grab",

                display: "flex",
                alignItems: "flex-end",
                x,
                opacity,
                rotate,
            }}

            drag={!isBack ? 'x' : false}
            dragConstraints={{
                left: 0,
                right: 0
            }}
            onDragEnd={!isBack ? handleDragEnd : undefined}
        >
            <div style={{paddingLeft: "10px",textShadow: "2px 2px black"}}>
                <h4 style={{color:"white", margin: "0"}}>{locationPin} {location} Km away</h4>
                <h1 style={{color: "white"}}>{name}</h1>
                <div style={{height:"20px"}}></div>
                </div>
        </motion.div>
    )
});

Card.displayName = 'Card';

export default SwipeCards
// change data later
const cardData = [
  {
    id: 1,
    url: "/restaurant/restaurant1.jpg", // use public as home
    name: "R1",
  },
  {
    id: 2,
    url: "/restaurant/restaurant2.jpg",
    name: "R2",
  },
  {
    id: 3,
    url: "/restaurant/restaurant3.jpg",
    name: "R3",
  },
  {
    id: 4,
    url: "/restaurant/restaurant4.jpg",
    name: "R4",
  },
  {
    id: 5,
    url: "/restaurant/restaurant5.jpg",
    name: "R5",
  },
  {
    id: 6,
    url: "/restaurant/restaurant6.jpg",
    name: "R6",
  },
  {
    id: 7,
    url: "/restaurant/restaurant7.jpg",
    name: "R7",
  },
  {
    id: 8,
    url: "/restaurant/restaurant8.jpg",
    name: "R8",
  },
];
