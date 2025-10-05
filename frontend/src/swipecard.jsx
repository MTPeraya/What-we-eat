import React, {useState, useRef, useEffect, useCallback} from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, useMotionValue,  useTransform, animate} from 'framer-motion';
import Button from "./components/swipeButton"

const heart  = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20"><path fill="#000000" d="m10 3.22l-.61-.6a5.5 5.5 0 0 0-7.78 7.77L10 18.78l8.39-8.4a5.5 5.5 0 0 0-7.78-7.77l-.61.61z"/></svg>

const cross = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 8 8"><path fill="#000000" d="M1.41 0L0 1.41l.72.72L2.5 3.94L.72 5.72L0 6.41l1.41 1.44l.72-.72l1.81-1.81l1.78 1.81l.69.72l1.44-1.44l-.72-.69l-1.81-1.78l1.81-1.81l.72-.72L6.41 0l-.69.72L3.94 2.5L2.13.72L1.41 0z"/></svg>

const locationPin = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20"><path fill="white" d="M10 20S3 10.87 3 7a7 7 0 1 1 14 0c0 3.87-7 13-7 13zm0-11a2 2 0 1 0 0-4a2 2 0 0 0 0 4z"/></svg>

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';
const RoomID = "123456" // This should come from props or routing

// API Functions
const fetchRestaurantsFromAPI = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/restaurants`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch restaurants:', error);
    throw error;
  }
};

const submitVote = async (roomId, restaurantId, value) => {
  try {
    const response = await fetch(`${API_BASE_URL}/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
        restaurantId,
        value: value === 'accept' ? 'ACCEPT' : 'REJECT'
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Vote submission failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to submit vote:', error);
    throw error;
  }
};

const checkRoomResults = async (roomId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/decide/score`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Results check failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to check results:', error);
    throw error;
  }
};

// Transform API data to match component format
const transformRestaurantData = (apiData) => {
  // Extract items array from API response
  const restaurants = apiData.items || [];
  return restaurants.map((restaurant, index) => ({
    id: restaurant.id,
    url: `/restaurant/restaurant${(index % 8) + 1}.jpg`, // Fallback to local images
    name: restaurant.name,
    address: restaurant.address,
    rating: restaurant.rating,
    price: restaurant.price,
    lat: restaurant.location?.lat,
    lng: restaurant.location?.lng,
    userRatingsTotal: restaurant.userRatingsTotal,
  }));
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

    const topCardRef = useRef(null); // ref to call programmatic swipe

    // Load restaurants from API
    const loadRestaurants = useCallback(async () => {
        try {
            setIsLoading(true);
            console.log('Fetching restaurants from:', API_BASE_URL + '/restaurants');
            const apiData = await fetchRestaurantsFromAPI();
            console.log('API Response:', apiData);
            const transformedCards = transformRestaurantData(apiData);
            console.log('Transformed cards:', transformedCards);
            setCards(prev => [...prev, ...transformedCards]);
        } catch (error) {
            console.error('Failed to load restaurants:', error);
            // Fallback to local data
            console.log('Using fallback data');
            setCards(prev => [...prev, ...cardData]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch initial data when component mounts
    useEffect(() => {
        loadRestaurants();
    }, [loadRestaurants]);

    // Check if we need more cards (when less than 2)
    useEffect(() => {
        if (cards.length < 2 && !isLoading) {
            loadRestaurants();
        }
    }, [cards.length, isLoading, loadRestaurants]);

    // Handle vote submission and result checking
    const handleVote = async (restaurantId, voteValue) => {
        try {
            // Submit vote to backend
            await submitVote(RoomID, restaurantId, voteValue);
            console.log(`Vote submitted: ${voteValue} for restaurant ${restaurantId}`);
            
            // Check if results are ready
            const roomResults = await checkRoomResults(RoomID);
            if (roomResults.scores && roomResults.scores.length > 0) {
                // Check if we have a clear winner (you can customize this logic)
                const hasWinner = roomResults.scores.some(score => score.approval && score.approval > 0.7);
                if (hasWinner) {
                    setResults(roomResults);
                    setShowResults(true);
                    return;
                }
            }
        } catch (error) {
            console.error('Failed to handle vote:', error);
        }
    };

    const swipeLeft = () => {
      if (!isSwiping && cards.length > 0) {
        setIsSwiping(true);
        const currentCard = cards[0];
        topCardRef.current?.swipe("left", () => {
            setIsSwiping(false);
            handleVote(currentCard.id, 'reject');
        });
      }
    };

    const swipeRight = () => {
      if (!isSwiping && cards.length > 0) {
        setIsSwiping(true);
        const currentCard = cards[0];
        topCardRef.current?.swipe("right", () => {
            setIsSwiping(false);
            handleVote(currentCard.id, 'accept');
        });
      }
    };

    // Show results page if results are ready
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
                    <h2>🎉 Results are ready!</h2>
                    <p>Based on everyone's votes:</p>
                    {results.scores.slice(0, 3).map((score, index) => (
                        <div key={score.restaurantId} style={{
                            margin: "10px 0",
                            padding: "15px",
                            backgroundColor: index === 0 ? "#4CAF50" : "#f0f0f0",
                            color: index === 0 ? "white" : "black",
                            borderRadius: "10px"
                        }}>
                            <strong>#{index + 1}</strong> Restaurant ID: {score.restaurantId}
                            {score.approval && ` - ${(score.approval * 100).toFixed(1)}% approval`}
                        </div>
                    ))}
                    <button 
                        onClick={() => setShowResults(false)} 
                        style={{
                            marginTop: "20px",
                            padding: "10px 20px",
                            backgroundColor: "#801F08",
                            color: "white",
                            border: "none",
                            borderRadius: "5px"
                        }}
                    >
                        Continue Swiping
                    </button>
                </div>
            </div>
        );
    }

    // Show loading state
    if (isLoading && cards.length === 0) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{
                width: "100vw",
                flexDirection: "column",
                alignItems: "center",
                minHeight: "90vh",
                backgroundColor: "#FFE2C5"
            }}>
                <RoomIDContainer/>
                <div style={{fontSize: "2rem", color: "#888"}}>Loading restaurants...</div>
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
                onVote && onVote(id, 'accept');
            }
            if (x.get() < -50){
                console.log(`No${id}`)
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
        // future: handle right swipe
      } else {
        console.log(`No${id}`);
        // future: handle left swipe
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
