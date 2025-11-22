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

function ManageReviews() {
    const navigate = useNavigate();
    const { isLoggedIn, authChecked } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ score: 5, comment: '', tags: [] });

    // Redirect if not logged in
    useEffect(() => {
        if (authChecked && !isLoggedIn) {
            navigate('/login');
        }
    }, [authChecked, isLoggedIn, navigate]);

    // Fetch user's reviews
    useEffect(() => {
        if (!authChecked || !isLoggedIn) return;

        const fetchReviews = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/me/ratings`, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch reviews: ${response.status}`);
                }

                const data = await response.json();
                setReviews(data.items || []);
            } catch (err) {
                console.error('Failed to fetch reviews:', err);
                setError('Failed to load reviews. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchReviews();
    }, [authChecked, isLoggedIn]);

    const handleEdit = (review) => {
        setEditingId(review.id);
        setEditForm({
            score: review.score,
            comment: review.comment || '',
            tags: review.tags || []
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({ score: 5, comment: '', tags: [] });
    };

    const handleSaveEdit = async (ratingId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/ratings/${ratingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    score: editForm.score,
                    comment: editForm.comment,
                    tags: editForm.tags
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update review');
            }

            // Refresh reviews
            const updatedResponse = await fetch(`${API_BASE_URL}/me/ratings`, {
                credentials: 'include'
            });
            const data = await updatedResponse.json();
            setReviews(data.items || []);
            setEditingId(null);
        } catch (err) {
            console.error('Failed to update review:', err);
            alert('Failed to update review. Please try again.');
        }
    };

    const handleDelete = async (ratingId) => {
        if (!window.confirm('Are you sure you want to delete this review?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/ratings/${ratingId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to delete review');
            }

            // Remove from local state
            setReviews(prev => prev.filter(r => r.id !== ratingId));
        } catch (err) {
            console.error('Failed to delete review:', err);
            alert('Failed to delete review. Please try again.');
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
                            My Reviews
                        </h1>
                        <button
                            onClick={() => navigate('/profile')}
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
                            ← Back to Profile
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
                                Loading your reviews...
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
                    ) : reviews.length === 0 ? (
                        <div style={{
                            background: THEME_COLORS.card,
                            borderRadius: '26px',
                            border: `2px solid ${THEME_COLORS.border}`,
                            padding: '3rem',
                            textAlign: 'center'
                        }}>
                            <h2 style={{ color: THEME_COLORS.textPrimary, marginBottom: '0.5rem' }}>
                                No reviews yet
                            </h2>
                            <p style={{ color: THEME_COLORS.textSecondary }}>
                                Start reviewing restaurants to see them here!
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5rem'
                        }}>
                            {reviews.map((review) => (
                                <div
                                    key={review.id}
                                    style={{
                                        background: THEME_COLORS.card,
                                        borderRadius: '20px',
                                        border: `2px solid ${THEME_COLORS.border}`,
                                        padding: '1.5rem',
                                        boxShadow: '0 8px 16px rgba(68,29,8,.08)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: '1rem',
                                        flexWrap: 'wrap',
                                        gap: '1rem'
                                    }}>
                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                            <h3 style={{
                                                color: THEME_COLORS.textPrimary,
                                                fontSize: '1.25rem',
                                                fontWeight: 700,
                                                margin: '0 0 0.5rem 0'
                                            }}>
                                                {review.restaurant.name}
                                            </h3>
                                            <p style={{
                                                color: THEME_COLORS.textSecondary,
                                                fontSize: '0.9rem',
                                                margin: '0 0 0.5rem 0'
                                            }}>
                                                {review.restaurant.address}
                                            </p>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                marginBottom: '0.5rem'
                                            }}>
                                                <span style={{ color: THEME_COLORS.accent, fontWeight: 600 }}>
                                                    ⭐ {review.score.toFixed(1)}
                                                </span>
                                                <span style={{
                                                    color: THEME_COLORS.textSecondary,
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {new Date(review.createdAt).toLocaleDateString()}
                                                </span>
                                                {review.status === 'approved' && (
                                                    <span style={{
                                                        background: '#4CAF50',
                                                        color: 'white',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600
                                                    }}>
                                                        ✓ Verified
                                                    </span>
                                                )}
                                                {review.status === 'pending' && (
                                                    <span style={{
                                                        background: '#FF9800',
                                                        color: 'white',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600
                                                    }}>
                                                        ⏳ Pending
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            gap: '0.5rem',
                                            flexWrap: 'wrap'
                                        }}>
                                            <button
                                                onClick={() => handleViewOnMap(review.restaurant)}
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
                                            {editingId !== review.id && (
                                                <>
                                                    <button
                                                        onClick={() => handleEdit(review)}
                                                        style={{
                                                            background: THEME_COLORS.card,
                                                            border: `2px solid ${THEME_COLORS.border}`,
                                                            borderRadius: '12px',
                                                            padding: '0.5rem 1rem',
                                                            color: THEME_COLORS.textPrimary,
                                                            fontWeight: 600,
                                                            fontSize: '0.9rem',
                                                            cursor: 'pointer',
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
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(review.id)}
                                                        style={{
                                                            background: '#dc3545',
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
                                                            e.currentTarget.style.background = '#c82333';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                            e.currentTarget.style.background = '#dc3545';
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {editingId === review.id ? (
                                        <div style={{
                                            borderTop: `2px solid ${THEME_COLORS.border}`,
                                            paddingTop: '1rem',
                                            marginTop: '1rem'
                                        }}>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{
                                                    display: 'block',
                                                    color: THEME_COLORS.textPrimary,
                                                    fontWeight: 600,
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    Rating (1-5)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    value={editForm.score}
                                                    onChange={(e) => setEditForm({ ...editForm, score: parseInt(e.target.value) || 1 })}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.5rem',
                                                        borderRadius: '8px',
                                                        border: `2px solid ${THEME_COLORS.border}`,
                                                        background: THEME_COLORS.card,
                                                        color: THEME_COLORS.textPrimary
                                                    }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{
                                                    display: 'block',
                                                    color: THEME_COLORS.textPrimary,
                                                    fontWeight: 600,
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    Comment
                                                </label>
                                                <textarea
                                                    value={editForm.comment}
                                                    onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                                                    rows={4}
                                                    maxLength={500}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.5rem',
                                                        borderRadius: '8px',
                                                        border: `2px solid ${THEME_COLORS.border}`,
                                                        background: THEME_COLORS.card,
                                                        color: THEME_COLORS.textPrimary,
                                                        resize: 'vertical'
                                                    }}
                                                />
                                                <p style={{
                                                    color: THEME_COLORS.textSecondary,
                                                    fontSize: '0.85rem',
                                                    marginTop: '0.25rem'
                                                }}>
                                                    {editForm.comment.length}/500 characters
                                                </p>
                                            </div>
                                            {review.photos && review.photos.length > 0 && (
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <label style={{
                                                        display: 'block',
                                                        color: THEME_COLORS.textPrimary,
                                                        fontWeight: 600,
                                                        marginBottom: '0.5rem'
                                                    }}>
                                                        Photos
                                                    </label>
                                                    <div style={{
                                                        display: 'flex',
                                                        gap: '0.5rem',
                                                        flexWrap: 'wrap'
                                                    }}>
                                                        {review.photos.map((photo) => (
                                                            <img
                                                                key={photo.id}
                                                                src={photo.base64Data || photo.publicUrl}
                                                                alt="Review photo"
                                                                style={{
                                                                    width: '100px',
                                                                    height: '100px',
                                                                    objectFit: 'cover',
                                                                    borderRadius: '8px',
                                                                    border: `2px solid ${THEME_COLORS.border}`
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p style={{
                                                        color: THEME_COLORS.textSecondary,
                                                        fontSize: '0.85rem',
                                                        marginTop: '0.25rem'
                                                    }}>
                                                        Note: Photos cannot be edited. Delete and recreate the review to change photos.
                                                    </p>
                                                </div>
                                            )}
                                            <div style={{
                                                display: 'flex',
                                                gap: '0.5rem',
                                                justifyContent: 'flex-end'
                                            }}>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    style={{
                                                        background: THEME_COLORS.card,
                                                        border: `2px solid ${THEME_COLORS.border}`,
                                                        borderRadius: '12px',
                                                        padding: '0.5rem 1rem',
                                                        color: THEME_COLORS.textPrimary,
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleSaveEdit(review.id)}
                                                    style={{
                                                        background: THEME_COLORS.accent,
                                                        border: 'none',
                                                        borderRadius: '12px',
                                                        padding: '0.5rem 1rem',
                                                        color: '#fff',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {review.comment && (
                                                <p style={{
                                                    color: THEME_COLORS.textPrimary,
                                                    margin: '0.5rem 0',
                                                    lineHeight: '1.6'
                                                }}>
                                                    {review.comment}
                                                </p>
                                            )}
                                            {review.photos && review.photos.length > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '0.5rem',
                                                    flexWrap: 'wrap',
                                                    marginTop: '1rem'
                                                }}>
                                                    {review.photos.map((photo) => (
                                                        <img
                                                            key={photo.id}
                                                            src={photo.base64Data || photo.publicUrl}
                                                            alt="Review photo"
                                                            style={{
                                                                width: '150px',
                                                                height: '150px',
                                                                objectFit: 'cover',
                                                                borderRadius: '8px',
                                                                border: `2px solid ${THEME_COLORS.border}`
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default ManageReviews;

