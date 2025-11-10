import React, { useState, useEffect, useRef } from 'react';
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

// Get room ID - you'll need to implement this based on your routing
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
      console.log(response.status);
      throw new Error(`API Error: ${response.status}`);
    }
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

// Fetch restaurants from backend
const fetchRestaurants = async () => {
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
const transformRestaurantData = (apiData) => {
  // Extract items array from API response { count, items }
  const restaurants = apiData.items || [];
  return restaurants.map((restaurant, index) => ({
    id: restaurant.id,
    name: restaurant.name,
    km: (restaurant.location?.lat * restaurant.location?.lng * 5).toFixed(1) || '2.5',
    img: `/restaurant/restaurant${(index % 8) + 1}.jpg`, // Fallback to local images
    address: restaurant.address,
    rating: restaurant.rating,
  }));
};

function DrawPage(){
    const [candidate1, setCandidate1] = useState({
        id: '01',
        name: 'Restaurant2',
        km: 20,
        img: '/restaurant/restaurant2.jpg'
    });

    const [candidate2, setCandidate2] = useState({
        id: '02',
        name: 'Restaurant3',
        km: 10,
        img: '/restaurant/restaurant3.jpg'
    });

    const [isVoting, setIsVoting] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const resultCheckInterval = useRef(null);

    // Load candidates from backend when component mounts
    useEffect(() => {
        loadCandidates();
    }, []);

    // Start checking for results every 5 seconds after voting
    useEffect(() => {
        if (!isVoting && !showResults) {
            resultCheckInterval.current = setInterval(() => {
                checkResults();
            }, 5000);
        } else {
            if (resultCheckInterval.current) {
                clearInterval(resultCheckInterval.current);
            }
        }

        // Cleanup interval on component unmount
        return () => {
            if (resultCheckInterval.current) {
                clearInterval(resultCheckInterval.current);
            }
        };
    }, [isVoting, showResults]);

    const loadCandidates = async () => {
        try {
            setIsLoading(true);
            console.log('Fetching restaurants from API...');
            const response = await fetchRestaurants();

            if (response.items && response.items.length >= 2) {
                const transformedCandidates = transformRestaurantData(response);
                
                // Set the first two restaurants as candidates
                setCandidate1(transformedCandidates[0]);
                setCandidate2(transformedCandidates[1]);
            }
        } catch (error) {
            console.error('Failed to load candidates:', error);
            // Keep using the default candidates if API fails
        } finally {
            setIsLoading(false);
        }
    };

    const handleVote = async (candidateName) => {
        try {
            console.log(`Voted for: ${candidateName}`);
            
            // Find which candidate was selected
            const selectedCandidate = candidateName === candidate1.name ? candidate1 : candidate2;
            
            // Submit vote to backend
            await submitVote(RoomID, selectedCandidate.id, 'accept');
            console.log(`Vote submitted for restaurant ${selectedCandidate.id}`);
            
            setIsVoting(false);
            
            // Start checking for results immediately after voting
            checkResults();
        } catch (error) {
            console.error('Failed to submit vote:', error);
            setIsVoting(false); // Still proceed to waiting state even if vote fails
        }
    };

    const checkResults = async () => {
        try {
            const roomResults = await checkRoomResults(RoomID);
            
            // Check if we have enough data to show results
            if (roomResults.scores && roomResults.scores.length > 0) {
                const topScored = roomResults.scores.find(score => score.approval > 0.7); // 70% approval rate
                if (topScored) {
                    setResults(roomResults);
                    setShowResults(true);
                    
                    // Stop checking for results
                    if (resultCheckInterval.current) {
                        clearInterval(resultCheckInterval.current);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to check results:', error);
        }
    };

    return (
        <div>
            <Header/>
            <section className="d-flex align-items-center justify-content-center position-relative overflow-hidden" style={{height: "90vh"}}>

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
                ) : showResults ? (
                    <div className="text-center">
                        <h2>🎉 We have a winner! 🎉</h2>
                        <div className="card mx-auto mt-4" style={{maxWidth: '400px'}}>
                            <div className="card-body">
                                <h5 className="card-title">{results?.scores?.[0]?.restaurant?.name}</h5>
                                <p className="card-text">{results?.scores?.[0]?.restaurant?.address}</p>
                                <p className="text-muted">Approval Rate: {(results?.scores?.[0]?.approval * 100).toFixed(1)}%</p>
                            </div>
                        </div>
                        <button 
                            className="btn btn-success mt-3"
                            onClick={() => window.location.href = '/'}
                        >
                            Back to Home
                        </button>
                    </div>
                ) : isVoting ? (
                    <div className="d-flex flex-column w-100 align-items-center justify-content-around" style={{zIndex: 2}}>
                        <div style={{height:"2vh"}}></div>
                        <div>
                            <h1 className="text-center mt-0 mb-3">It's a draw!! Vote one!!</h1>
                        </div>
                        <div className="h-75 w-75 d-flex justify-content-around align-items-center position-relative" style={{zIndex: 2}}>
                            <DrawBox 
                                name={candidate1.name} 
                                km={candidate1.km} 
                                imgUrl={candidate1.img} 
                                icon={star} 
                                bcolor="#BB3D25" 
                                b2color="#B33821"
                                onClick={() => handleVote(candidate1.name)}
                            />
                            <DrawBox 
                                name={candidate2.name} 
                                km={candidate2.km} 
                                imgUrl={candidate2.img} 
                                icon={heart} 
                                bcolor="#517824" 
                                b2color="#4A6B23"
                                onClick={() => handleVote(candidate2.name)}
                            />
                        </div>
                        <div style={{height:"3vh"}}></div>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="spinner-border text-primary mb-3" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <h2>Voting Complete!</h2>
                        <p>Checking for results every 5 seconds...</p>
                        <p className="text-muted">Waiting for other participants to vote...</p>
                        <button 
                            className="btn btn-secondary mt-3"
                            onClick={() => {
                                setIsVoting(true);
                                setShowResults(false);
                                if (resultCheckInterval.current) {
                                    clearInterval(resultCheckInterval.current);
                                }
                            }}
                        >
                            Vote Again
                        </button>
                    </div>
                )}
            </section>
            <Footer/>
        </div>
    )
}

export default DrawPage