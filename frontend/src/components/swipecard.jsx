import React, {useState, useRef, useEffect, useCallback} from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, useMotionValue,  useTransform, animate} from 'framer-motion';
import Button from "./swipeButton"

const heart  = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20"><path fill="#000000" d="m10 3.22l-.61-.6a5.5 5.5 0 0 0-7.78 7.77L10 18.78l8.39-8.4a5.5 5.5 0 0 0-7.78-7.77l-.61.61z"/></svg>

const cross = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 8 8"><path fill="#000000" d="M1.41 0L0 1.41l.72.72L2.5 3.94L.72 5.72L0 6.41l1.41 1.44l.72-.72l1.81-1.81l1.78 1.81l.69.72l1.44-1.44l-.72-.69l-1.81-1.78l1.81-1.81l.72-.72L6.41 0l-.69.72L3.94 2.5L2.13.72L1.41 0z"/></svg>

const locationPin = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20"><path fill="white" d="M10 20S3 10.87 3 7a7 7 0 1 1 14 0c0 3.87-7 13-7 13zm0-11a2 2 0 1 0 0-4a2 2 0 0 0 0 4z"/></svg>

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/src/app/api';

// Get room ID from props or URL params - you'll need to implement this based on your routing
const getRoomId = () => {
  // This should be implemented based on how you pass room ID to this component
  // For now, using a placeholder
  return "123456";
};

const RoomID = getRoomId();

// API Functions
const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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

// Fetch restaurants from backend
const fetchRestaurants = async (page = 1, pageSize = 10) => {
  return await apiRequest(`/restaurants`);
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

// Transform API restaurant data to match component format
const transformRestaurantData = (apiRestaurants) => {
  return apiRestaurants.map((restaurant, index) => ({
    id: restaurant.id,
    url: `/restaurant/restaurant${(index % 8) + 1}.jpg`, // Fallback to local images
    name: restaurant.name,
    address: restaurant.address,
    rating: restaurant.rating,
    distance: calculateDistance(restaurant.lat, restaurant.lng), // You'll need to implement this
  }));
};

// Calculate distance (placeholder - implement based on user location)
const calculateDistance = (lat, lng) => {
  // This is a placeholder. Implement actual distance calculation based on user's location
  return (Math.random() * 5).toFixed(1);
};


const RoomIDContainer = () =>{
    return(<div 
        className="brown button fw-bold"
        style={{
            textAlign: 'center',
            margin: "10px",
            padding: "5px"
        }}>
        {RoomID}
    </div>)
}

const SwipeCards = () => {
    const [cards, setCards] = useState([]);
    const [isSwiping, setIsSwiping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreCards, setHasMoreCards] = useState(true);

    const topCardRef = useRef(null); // ref to call programmatic swipe

    // Fetch initial restaurant data when component mounts
    useEffect(() => {
        loadInitialCards();
    }, []);

    const loadInitialCards = async () => {
        try {
            setIsLoading(true);
            const response = await fetchRestaurants(1, 10);
            if (response.restaurants && response.restaurants.length > 0) {
                const transformedCards = transformRestaurantData(response.restaurants);
                setCards(transformedCards);
                setCurrentPage(1);
                setHasMoreCards(response.restaurants.length === 10);
            }
        } catch (error) {
            console.error('Failed to load initial cards:', error);
            // Fallback to local data if API fails
            setCards(cardData);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMoreCards = useCallback(async () => {
        if (!hasMoreCards) return;
        
        try {
            const nextPage = currentPage + 1;
            const response = await fetchRestaurants(nextPage, 10);
            if (response.restaurants && response.restaurants.length > 0) {
                const transformedCards = transformRestaurantData(response.restaurants);
                setCards(prev => [...prev, ...transformedCards]);
                setCurrentPage(nextPage);
                setHasMoreCards(response.restaurants.length === 10);
            } else {
                setHasMoreCards(false);
            }
        } catch (error) {
            console.error('Failed to load more cards:', error);
            setHasMoreCards(false);
        }
    }, [hasMoreCards, currentPage]);

    const handleVote = async (restaurantId, value) => {
        try {
            await submitVote(RoomID, restaurantId, value);
            console.log(`Vote submitted: ${value} for restaurant ${restaurantId}`);
            
            // Check if results are ready after each vote
            await checkResults();
            
        } catch (error) {
            console.error('Failed to submit vote:', error);
        }
    };

    const checkResults = async () => {
        try {
            const roomResults = await checkRoomResults(RoomID);
            
            // Check if we have enough data to show results
            // You can customize this logic based on your requirements
            if (roomResults.scores && roomResults.scores.length > 0) {
                const topScored = roomResults.scores.find(score => score.approval > 0.7); // 70% approval rate
                if (topScored) {
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

    // Show results screen if results are ready
    if (showResults && results) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{
                width: "100vw",
                flexDirection: "column",
                alignItems: "center",
                minHeight: "90vh",
                backgroundColor: "#FFE2C5"
            }}>
                <RoomIDContainer/>
                <div style={{textAlign: "center", padding: "20px"}}>
                    <h2>🎉 We found a match!</h2>
                    <p>Based on everyone's votes, here are the results:</p>
                    {results.scores.slice(0, 3).map((score, index) => (
                        <div key={score.restaurantId} style={{
                            margin: "10px 0",
                            padding: "15px",
                            backgroundColor: index === 0 ? "#4CAF50" : "#f0f0f0",
                            color: index === 0 ? "white" : "black",
                            borderRadius: "10px"
                        }}>
                            <strong>#{index + 1}</strong> - Approval: {(score.approval * 100).toFixed(1)}%
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return(
      <div className="d-flex justify-content-start align-items-center" style={{
        width: "100vw",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "90vh",
        Height: "90vh",
        backgroundColor: "#FFE2C5"
      }}>
        <RoomIDContainer/>
        <div className="" style={{display: "grid", placeItems: "center"}}>
          {cards.length > 1 && (
            <Card
              key={cards[1].id}
              id={cards[1].id}
              url={cards[1].url}
              isBack
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


const Card = React.forwardRef(({id, url, setCards, isBack, name, location="0.0"}, ref) => {
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
                // Handle accept vote - this will be called by the parent component
            }
            if (x.get() < -50){
                console.log(`No${id}`)
                // Handle reject vote - this will be called by the parent component
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
