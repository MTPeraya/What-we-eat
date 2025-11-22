import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { config } from './config';
import Header from './header';
import './App.css';

const THEME_COLORS = {
    background: "#FCEEE3",
    card: "#FFF7EF",
    border: "#C47B4E",
    accent: "#BB3D25",
    textPrimary: "#4A1F0C",
    textSecondary: "#7A4B31",
    accentDark: "#8A3A1A"
};

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

const getRestaurantImageUrl = (restaurantId, imageUrl) => {
    if (imageUrl) return imageUrl;
    // Fallback to local images
    const index = restaurantId ? parseInt(restaurantId.slice(-1), 16) % 8 : 0;
    return `/restaurant/restaurant${index + 1}.jpg`;
};

function WishlistPage() {
    const navigate = useNavigate();
    const { isLoggedIn, authChecked } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Redirect if not logged in
    useEffect(() => {
        if (authChecked && !isLoggedIn) {
            navigate('/login');
        }
    }, [authChecked, isLoggedIn, navigate]);

    // Fetch favorites
    useEffect(() => {
        if (!authChecked || !isLoggedIn) return;

        const fetchFavorites = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await apiRequest('/favorites', { method: 'GET' });
                setFavorites(data.favorites || []);
            } catch (err) {
                console.error('Failed to fetch favorites:', err);
                setError('Failed to load favorites. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchFavorites();
    }, [authChecked, isLoggedIn]);

    const handleRemoveFavorite = async (restaurantId) => {
        try {
            await apiRequest('/favorites', {
                method: 'DELETE',
                body: JSON.stringify({ restaurantId }),
            });
            // Remove from local state
            setFavorites(prev => prev.filter(f => f.restaurantId !== restaurantId));
        } catch (err) {
            console.error('Failed to remove favorite:', err);
            alert('Failed to remove favorite. Please try again.');
        }
    };

    const handleViewOnMap = (restaurant) => {
        let googleMapsUrl;
        
        // Best: Use Google Place ID if available
        if (restaurant.placeId) {
            googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${restaurant.placeId}`;
        }
        // Good: Use restaurant name + address
        else if (restaurant.name) {
            const searchQuery = restaurant.address 
                ? `${restaurant.name}, ${restaurant.address}`
                : restaurant.name;
            googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
        }
        // Fallback: Use coordinates only
        else if (restaurant.lat && restaurant.lng) {
            googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`;
        }
        
        if (googleMapsUrl) {
            window.open(googleMapsUrl, '_blank');
        }
    };

    if (!authChecked) {
        return (
            <div style={{ minHeight: '100vh', background: THEME_COLORS.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner-border" role="status" style={{ color: THEME_COLORS.accent }}>
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <Header />
            <div style={{
                minHeight: '100vh',
                background: THEME_COLORS.background,
                paddingTop: '10vh',
                paddingBottom: '5rem',
                paddingLeft: '1rem',
                paddingRight: '1rem'
            }}>
                <div style={{ maxWidth: '1200px', margin: '2rem auto' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '2rem',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <h1 style={{
                            color: THEME_COLORS.textPrimary,
                            fontSize: '2.5rem',
                            fontWeight: 700,
                            margin: 0
                        }}>
                            My Wishlist
                        </h1>
                        <button
                            onClick={() => navigate('/')}
                            className="btn"
                            style={{
                                background: THEME_COLORS.card,
                                border: `2px solid ${THEME_COLORS.border}`,
                                borderRadius: '999px',
                                padding: '0.65rem 1.4rem',
                                color: THEME_COLORS.textPrimary,
                                fontWeight: 600,
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = THEME_COLORS.background;
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = THEME_COLORS.card;
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            ← Back to Home
                        </button>
                    </div>

                    {isLoading ? (
                        <div style={{
                            background: THEME_COLORS.card,
                            borderRadius: '26px',
                            border: `2px solid ${THEME_COLORS.border}`,
                            padding: '3rem',
                            textAlign: 'center'
                        }}>
                            <div className="spinner-border" role="status" style={{ color: THEME_COLORS.accent }}>
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p style={{ color: THEME_COLORS.textSecondary, marginTop: '1rem' }}>
                                Loading your favorites...
                            </p>
                        </div>
                    ) : error ? (
                        <div style={{
                            background: THEME_COLORS.card,
                            borderRadius: '26px',
                            border: `2px solid ${THEME_COLORS.border}`,
                            padding: '3rem',
                            textAlign: 'center'
                        }}>
                            <p style={{ color: THEME_COLORS.accent, fontSize: '1.1rem' }}>{error}</p>
                        </div>
                    ) : favorites.length === 0 ? (
                        <div style={{
                            background: THEME_COLORS.card,
                            borderRadius: '26px',
                            border: `2px solid ${THEME_COLORS.border}`,
                            padding: '3rem',
                            textAlign: 'center'
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 20 20" fill="none" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                                <path d="m10 3.22l-.61-.6a5.5 5.5 0 0 0-7.78 7.77L10 18.78l8.39-8.4a5.5 5.5 0 0 0-7.78-7.77l-.61.61z" fill={THEME_COLORS.textSecondary} />
                            </svg>
                            <h2 style={{ color: THEME_COLORS.textPrimary, marginBottom: '0.5rem' }}>
                                No favorites yet
                            </h2>
                            <p style={{ color: THEME_COLORS.textSecondary }}>
                                Start swiping to add restaurants to your wishlist!
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            {favorites.map((favorite) => (
                                <div
                                    key={favorite.id}
                                    style={{
                                        background: THEME_COLORS.card,
                                        borderRadius: '20px',
                                        border: `2px solid ${THEME_COLORS.border}`,
                                        overflow: 'hidden',
                                        boxShadow: '0 8px 16px rgba(68,29,8,.08)',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(68,29,8,.12)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(68,29,8,.08)';
                                    }}
                                >
                                    <div style={{
                                        width: '100%',
                                        aspectRatio: '1 / 1',
                                        backgroundImage: `url(${getRestaurantImageUrl(favorite.restaurantId, favorite.restaurant.imageUrl)})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        position: 'relative'
                                    }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveFavorite(favorite.restaurantId);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '12px',
                                                right: '12px',
                                                background: 'rgba(255, 255, 255, 0.95)',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '40px',
                                                height: '40px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                                padding: 0,        // remove padding
                                                margin: 0,         // remove margin
                                                overflow: 'visible' // allow SVG to fill
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                                                e.currentTarget.style.transform = 'scale(1.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                                                e.currentTarget.style.transform = 'scale(1)';
                                            }}
                                            aria-label="Remove from favorites"
                                            >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                width="35px"
                                                height="35px"
                                                fill={THEME_COLORS.accent}
                                                style={{ display: 'block' }} // prevent extra space from inline SVG
                                            >
                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 
                                                        4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 
                                                        16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 
                                                        11.54L12 21.35z" />
                                            </svg>
                                            </button>

                                    </div>
                                    <div style={{ padding: '1.25rem' }}>
                                        <h3 style={{
                                            color: THEME_COLORS.textPrimary,
                                            fontSize: '1.25rem',
                                            fontWeight: 700,
                                            margin: '0 0 0.5rem 0',
                                            lineHeight: '1.3'
                                        }}>
                                            {favorite.restaurant.name}
                                        </h3>
                                        <p style={{
                                            color: THEME_COLORS.textSecondary,
                                            fontSize: '0.9rem',
                                            margin: '0 0 0.75rem 0',
                                            lineHeight: '1.4'
                                        }}>
                                            {favorite.restaurant.address}
                                        </p>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginTop: '1rem'
                                        }}>
                                            {favorite.restaurant.rating && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem'
                                                }}>
                                                    <span style={{ color: THEME_COLORS.accent, fontWeight: 600 }}>
                                                        ⭐ {favorite.restaurant.rating.toFixed(1)}
                                                    </span>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleViewOnMap(favorite.restaurant)}
                                                style={{
                                                    background: THEME_COLORS.accent,
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    padding: '0.5rem 1rem',
                                                    color: '#fff',
                                                    fontWeight: 600,
                                                    fontSize: '0.9rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1.05)';
                                                    e.currentTarget.style.background = THEME_COLORS.accentDark;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.background = THEME_COLORS.accent;
                                                }}
                                            >
                                                View Map
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default WishlistPage;

