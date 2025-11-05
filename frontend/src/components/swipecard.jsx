import React, {useState, useRef, useEffect, useCallback} from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, useMotionValue,  useTransform, animate} from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Button from "./swipeButton"

const heart  = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20"><path fill="#000000" d="m10 3.22l-.61-.6a5.5 5.5 0 0 0-7.78 7.77L10 18.78l8.39-8.4a5.5 5.5 0 0 0-7.78-7.77l-.61.61z"/></svg>

const cross = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 8 8"><path fill="#000000" d="M1.41 0L0 1.41l.72.72L2.5 3.94L.72 5.72L0 6.41l1.41 1.44l.72-.72l1.81-1.81l1.78 1.81l.69.72l1.44-1.44l-.72-.69l-1.81-1.78l1.81-1.81l.72-.72L6.41 0l-.69.72L3.94 2.5L2.13.72L1.41 0z"/></svg>

const locationPin = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20"><path fill="white" d="M10 20S3 10.87 3 7a7 7 0 1 1 14 0c0 3.87-7 13-7 13zm0-11a2 2 0 1 0 0-4a2 2 0 0 0 0 4z"/></svg>

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

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

// Fetch restaurants from backend (using Nearby Search API)
const fetchRestaurants = async (center) => {
  const qs = center?.lat && center?.lng 
    ? `?lat=${encodeURIComponent(center.lat)}&lng=${encodeURIComponent(center.lng)}&radius=5000` 
    : '?radius=5000';
  return await apiRequest(`/restaurants${qs}`);
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

// Transform API restaurant data to match component format
const transformRestaurantData = (apiData, center) => {
  // Extract items array from API response { count, items }
  const restaurants = apiData.items || [];
  return restaurants.map((restaurant, index) => ({
    id: restaurant.id,
    url: getRestaurantImageUrl(restaurant.id, index),
    name: restaurant.name,
    address: restaurant.address,
    rating: restaurant.rating,
    price: restaurant.price,
    lat: restaurant.location?.lat,
    lng: restaurant.location?.lng,
    userRatingsTotal: restaurant.userRatingsTotal,
    distance: calculateDistance(center, { lat: restaurant.location?.lat, lng: restaurant.location?.lng }),
  }));
};

// Calculate distance (placeholder - implement based on user location)
const calculateDistance = (from, to) => {
  if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) return null;
  const R = 6371; // km
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


const SwipeCards = ({ roomId, userCenter }) => {
    const navigate = useNavigate();
    const [cards, setCards] = useState([]);
    const [isSwiping, setIsSwiping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreCards, setHasMoreCards] = useState(true);
    const [totalRestaurants, setTotalRestaurants] = useState(0); // Track total for progress
    const MAX_RESTAURANTS = 20; // Limit to 20 restaurants

    const topCardRef = useRef(null); // ref to call programmatic swipe

    const loadInitialCards = useCallback(async () => {
        try {
            setIsLoading(true);
            console.log('Fetching restaurants from API...', { userCenter });
            const response = await fetchRestaurants(userCenter);
            console.log("fetchRestaurants Pass", response);

            if (response.items && response.items.length > 0) {
                const transformedCards = transformRestaurantData(response, userCenter);
                // Sort by distance (closest first)
                const sortedCards = transformedCards.sort((a, b) => {
                    const distA = a.distance ?? Infinity;
                    const distB = b.distance ?? Infinity;
                    return distA - distB;
                });
                
                // Limit to MAX_RESTAURANTS
                const limitedCards = sortedCards.slice(0, MAX_RESTAURANTS);
                console.log('Transformed and sorted cards:', limitedCards);
                setCards(limitedCards);
                setTotalRestaurants(limitedCards.length);
                setCurrentPage(1);
                // Don't load more if we've limited to max
                setHasMoreCards(false);
            } else {
                console.warn('No restaurants found');
                setCards([]);
                setTotalRestaurants(0);
            }
        } catch (error) {
            console.error('Failed to load initial cards:', error);
            // Fallback to local data if API fails
            setCards(cardData);
        } finally {
            setIsLoading(false);
        }
    }, [userCenter]);

    // Fetch initial restaurant data when component mounts or userCenter changes
    useEffect(() => {
        loadInitialCards();
    }, [loadInitialCards]);

    const loadMoreCards = useCallback(async () => {
        if (!hasMoreCards) return;
        
        try {
            const nextPage = currentPage + 1;
            const response = await fetchRestaurants(userCenter);
            if (response.items && response.items.length > 0) {
                const transformedCards = transformRestaurantData(response, userCenter);
                // Sort by distance (closest first)
                const sortedCards = transformedCards.sort((a, b) => {
                    const distA = a.distance ?? Infinity;
                    const distB = b.distance ?? Infinity;
                    return distA - distB;
                });
                setCards(prev => [...prev, ...sortedCards]);
                setCurrentPage(nextPage);
                // Nearby Search returns up to 20 results per request
                setHasMoreCards(response.items.length >= 20);
            } else {
                setHasMoreCards(false);
            }
        } catch (error) {
            console.error('Failed to load more cards:', error);
            setHasMoreCards(false);
        }
    }, [hasMoreCards, currentPage, userCenter]);

    const handleVote = async (restaurantId, value) => {
        try {
            await submitVote(roomId, restaurantId, value);
            console.log(`Vote submitted: ${value} for restaurant ${restaurantId}`);
            
            // Check if results are ready after each vote
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

    // Calculate current card number (total - remaining + 1)
    const currentCardNumber = totalRestaurants - cards.length + 1;

    return(
      <div className="d-flex justify-content-start align-items-center" style={{
        width: "100vw",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "90vh",
        Height: "90vh",
        backgroundColor: "#FFE2C5"
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
        <div className="" style={{display: "grid", placeItems: "center"}}>
          {cards.length > 1 && (
            <Card
              key={cards[1].id}
              id={cards[1].id}
              url={cards[1].url}
              isBack
              name={cards[1].name}
              location={cards[1].distance !== null && cards[1].distance !== undefined ? cards[1].distance.toFixed(1) : "0.0"}
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
              location={cards[0].distance !== null && cards[0].distance !== undefined ? cards[0].distance.toFixed(1) : "0.0"}
              onVote={handleVote}
            />
          )}
          {cards.length === 0 && (
            <div style={{fontSize: "2rem", color: "#888", maxHeight: "520px",height: "60vh", }}>No more cards</div>
          )}
        </div>

        <div style={{
            display: "flex",
            width: "300px",
            justifyContent: "space-between"
        }}>
        <Button id="LEFT" onClick={swipeLeft} disabled={isSwiping} children={cross}/>
        <Button id="RIGHT" onClick={swipeRight} disabled={isSwiping} children={heart}/>
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
