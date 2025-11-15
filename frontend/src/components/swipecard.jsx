import React, {useState, useRef, useEffect, useCallback} from 'react';
import { motion, useMotionValue,  useTransform, animate} from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Button from "./swipeButton"

const heart  = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20"><path fill="#000000" d="m10 3.22l-.61-.6a5.5 5.5 0 0 0-7.78 7.77L10 18.78l8.39-8.4a5.5 5.5 0 0 0-7.78-7.77l-.61.61z"/></svg>

const cross = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 8 8"><path fill="#000000" d="M1.41 0L0 1.41l.72.72L2.5 3.94L.72 5.72L0 6.41l1.41 1.44l.72-.72l1.81-1.81l1.78 1.81l.69.72l1.44-1.44l-.72-.69l-1.81-1.78l1.81-1.81l.72-.72L6.41 0l-.69.72L3.94 2.5L2.13.72L1.41 0z"/></svg>

import { config } from '../config';

const locationPin = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20"><path fill="white" d="M10 20S3 10.87 3 7a7 7 0 1 1 14 0c0 3.87-7 13-7 13zm0-11a2 2 0 1 0 0-4a2 2 0 0 0 0 4z"/></svg>

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
      throw new Error(`API Error: ${response.status}`);
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
      distance: restaurant.distanceM ? (restaurant.distanceM / 1000).toFixed(1) : null, // Convert meters to km
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
    const navigate = useNavigate();
    const [cards, setCards] = useState([]);
    const [isSwiping, setIsSwiping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState(null);
    const [hasMoreCards, setHasMoreCards] = useState(true);
    const [totalRestaurants, setTotalRestaurants] = useState(0); // Track total for progress
    const [allCardsCompleted, setAllCardsCompleted] = useState(false); // Track if swiped all 20
    const MAX_RESTAURANTS = 20; // Limit to 20 restaurants

    const topCardRef = useRef(null); // ref to call programmatic swipe
    const lastNotifiedCardId = useRef(null); // Track last notified card
    const hasLoadedInitialCards = useRef(false); // Prevent multiple initial loads
    
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
        // Prevent loading if already started loading
        if (hasLoadedInitialCards.current) {
            console.log('[SwipeCards] Skipping loadInitialCards - already started');
            return;
        }

        try {
            hasLoadedInitialCards.current = true;
            setIsLoading(true);
            console.log('[SwipeCards] Fetching candidates for room:', roomId, { userCenter });
            const response = await fetchRoomCandidates(roomId, userCenter);
            console.log("[SwipeCards] fetchRoomCandidates Pass - received", response.items?.length, "items");

            if (response.items && response.items.length > 0) {
                const transformedCards = transformCandidatesData(response, userCenter);
                // Sort by distance (closest first)
                const sortedCards = transformedCards.sort((a, b) => {
                    const distA = a.distance ?? Infinity;
                    const distB = b.distance ?? Infinity;
                    return distA - distB;
                });
                
                // Limit to MAX_RESTAURANTS
                const limitedCards = sortedCards.slice(0, MAX_RESTAURANTS);
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
            // Reset flag on error so it can be retried
            hasLoadedInitialCards.current = false;
            // Fallback to local data if API fails
            setCards(cardData);
            setTotalRestaurants(cardData.length);
        } finally {
            setIsLoading(false);
        }
    }, [roomId, userCenter]);

    // Reset load flag when roomId or userCenter changes
    useEffect(() => {
        console.log('[SwipeCards] Room or location changed - resetting load flag');
        hasLoadedInitialCards.current = false;
    }, [roomId, userCenter]);

    // Fetch initial restaurant data when component mounts or userCenter changes
    useEffect(() => {
        loadInitialCards();
        
        // Cleanup on unmount - allow re-loading if component mounts again
        return () => {
            console.log('[SwipeCards] Component unmounting - resetting load flag');
            hasLoadedInitialCards.current = false;
        };
    }, [loadInitialCards]);

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
            
            // Always check if results are ready (for multi-user scenario)
            await checkResults();
            
        } catch (error) {
            console.error('Failed to submit vote:', error);
        }
    };

    const checkResults = async () => {
        try {
            if (!roomId) return;
            const roomResults = await checkRoomResults(roomId);
            
            // Check if we have enough votes to show results
            // Require: มีร้านที่ถูกโหวตอย่างน้อย 30 ร้าน และมี votes รวมอย่างน้อย 40 ครั้ง
            const totalVotes = roomResults.stats?.totalVotes || 0;
            const totalRestaurants = roomResults.stats?.totalRestaurants || 0;
            
            if (totalRestaurants >= 30 && totalVotes >= 40 && roomResults.scores && roomResults.scores.length > 0) {
                // Sort by approval rate and find best match
                const sortedScores = [...roomResults.scores].sort((a, b) => b.approval - a.approval);
                const topScored = sortedScores[0];
                
                // Require at least 80% approval rate for best match
                if (topScored && topScored.approval >= 0.8) {
                    setResults(roomResults);
                    setShowResults(true);
                }
            }
        } catch (error) {
            console.error('Failed to check results:', error);
        }
    };

    const handleShowResults = async () => {
        try {
            if (!roomId) return;
            
            // Call API to mark room as "viewing results"
            const API_BASE = 'http://localhost:4001/api';
            await fetch(`${API_BASE}/rooms/${roomId}/view-results`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            
            // Fetch and show results
            const roomResults = await checkRoomResults(roomId);
            
            if (roomResults.scores && roomResults.scores.length > 0) {
                setResults(roomResults);
                setShowResults(true);
            }
        } catch (error) {
            console.error('Failed to show results:', error);
        }
    };

    // Check if we need more cards and load them
    useEffect(() => {
        if (cards.length < 2 && hasMoreCards && !isLoading) {
            loadMoreCards();
        }
    }, [cards.length, hasMoreCards, isLoading, loadMoreCards]);

    const swipeLeft = () => {
      // console.log("left")
      if (!isSwiping && cards.length > 0) {
        setIsSwiping(true);
        topCardRef.current?.swipe("left", () => {
            setIsSwiping(false);
            handleVote(cards[0].id, 'reject');
        });
      }
    };
    
    const swipeRight = () => {
      if (!isSwiping && cards.length > 0) {
        setIsSwiping(true);
        topCardRef.current?.swipe("right", () => {
            setIsSwiping(false);
            handleVote(cards[0].id, 'accept');
        });
      }
    };

    // Navigate to results page when results are ready
    useEffect(() => {
        if (showResults && results) {
            navigate('/result', { 
                state: { 
                    roomId,
                    results,
                    userCenter 
                } 
            });
        }
    }, [showResults, results, navigate, roomId, userCenter]);
    
    // Poll room status to detect when host triggers result viewing (for non-host members)
    useEffect(() => {
        if (!roomId || isHost || !allCardsCompleted) return;
        
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/decide/score`, {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    // If we get scores with votes, host has triggered results
                    if (data.scores && data.scores.length > 0 && data.stats.totalVotes > 0) {
                        console.log('Results ready, navigating to result page');
                        setResults(data);
                        setShowResults(true);
                    }
                }
            } catch (error) {
                console.error('Error polling results:', error);
            }
        }, 2000); // Poll every 2 seconds
        
        return () => clearInterval(pollInterval);
    }, [roomId, isHost, allCardsCompleted]);

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
        
        {/* <RoomIDContainer/> */}
        {isLoading && <div style={{fontSize: "1.5rem", color: "#801F08"}}>Loading restaurants...</div>}
        
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
                     style={{
                       padding: "15px 30px",
                       fontSize: "1.2rem",
                       cursor: "pointer"
                     }}
                   >
                     View Results
                   </button>
                 </div>
               ) : (
                 <div style={{fontSize: "1rem", color: "#666"}}>Waiting for host to view results...</div>
               )}
             </div>
           )}
        </div>

        <div style={{
            display: "flex",
            width: "300px",
            justifyContent: "space-between"
        }}>
        <Button id="LEFT" onClick={swipeLeft} disabled={isSwiping}>{cross}</Button>
        <Button id="RIGHT" onClick={swipeRight} disabled={isSwiping}>{heart}</Button>
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
