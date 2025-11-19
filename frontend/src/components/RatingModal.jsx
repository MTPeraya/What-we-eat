import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import ReviewCard from './ReviewCard';
import { config } from '../config';

const stars = ({size, color}) => <svg className="mx-2" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 432 408"><path fill={color} d="M213 328L81 408l35-150L0 157l153-13L213 3l60 141l154 13l-117 101l35 150z" /></svg>

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

const formatRating = (value) => (typeof value === 'number' ? value.toFixed(1) : '-');
const createEmptyDistribution = () => [0, 0, 0, 0, 0];
const emptyDistribution = createEmptyDistribution();

stars.propTypes = {
    size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    color: PropTypes.string.isRequired
};

function ReviewSection({onSwitchToAdding, responsive, reviewInformation, isLoading, stats}){ 
    const distribution = stats?.distribution && stats.distribution.length === 5
        ? stats.distribution
        : emptyDistribution;
    const totalCommunityReviews = stats?.userRatingCount ?? distribution.reduce((acc, val) => acc + val, 0);

    const starBreakdown = [5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star - 1] || 0;
        const percent = totalCommunityReviews > 0 ? (count / totalCommunityReviews) * 100 : 0;
        return { star, count, percent };
    });

    return(
    <section className="h-100 d-flex flex-column">
        <div className="d-flex justify-content-between flex-shrink-0" style={{width:"98%"}}>
            <h4 className="my-0">Reviews</h4>
            <div>
                <button 
                    type="button" 
                    className="bg-transparent btn btn-outline-dark text-dark h-75 d-flex align-items-center"
                    onClick={onSwitchToAdding}> Leave a Review </button>
            </div>
        </div>

        <div className="py-3 px-2 w-100">
            <div 
                className={`rounded-4 shadow-sm mb-3 p-3 ${responsive ? '' : 'd-flex gap-3'}`} 
                style={{
                    background: '#FFF7EF',
                    border: '2px solid #8A3A1A',
                    color: '#4A1F0C'
                }}
            >
                <div className={`${responsive ? 'mb-3 text-center' : 'text-center'}`} style={{minWidth: responsive ? 'auto' : '220px'}}>
                    <div className="text-uppercase small" style={{opacity: 0.8}}>Average rating</div>
                    <div className="display-4 fw-bold">{formatRating(stats?.combinedRating)}</div>
                    <div className="d-flex justify-content-center align-items-center gap-2">
                        {stars({size: "36px", color: "#C0471C"})}
                    </div>
                    <div className="mt-2 small">
                        Avg from Google {formatRating(stats?.googleRating)}
                        {stats?.googleRatingCount ? ` · ${stats.googleRatingCount.toLocaleString()} reviews` : ''}
                        <br/>
                        + Community {formatRating(stats?.userRating)}
                        {stats?.userRatingCount ? ` · ${stats?.userRatingCount} review${stats?.userRatingCount > 1 ? 's' : ''}` : ''}
                    </div>
                </div>
                <div className="flex-grow-1">
                    {starBreakdown.map(({ star, count, percent }) => (
                        <div key={star} className="d-flex align-items-center gap-2 mb-2">
                            <div style={{width: '35px'}} className="text-end fw-semibold">{star}</div>
                            <div className="flex-grow-1 rounded-pill" style={{height: '10px', overflow: 'hidden', backgroundColor: '#FFE6D1', border: '1px solid #C47B4E'}}>
                                <div 
                                    className="h-100 rounded-pill" 
                                    style={{
                                        width: `${percent}%`,
                                        backgroundColor: '#C0471C',
                                        transition: 'width 0.3s ease'
                                    }}
                                />
                            </div>
                            <div style={{width: '30px'}} className="text-start small">{count}</div>
                        </div>
                    ))}
                    {totalCommunityReviews === 0 && (
                        <div className="small mt-2" style={{opacity: 0.75}}>
                            Community ratings will appear after the first review.
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="flex-grow-1 overflow-auto px-2" style={{
            width:"100%",
            maxHeight: "100%",
            scrollbarWidth: 'thin',
            scrollbarColor: '#BB3D25 #f1f1f1',
            paddingBottom: '10px'
        }}>
            {isLoading ? (
                <div className="text-center p-4 w-100">
                    <div className="spinner-border text-light" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading reviews...</p>
                </div>
            ) : reviewInformation && reviewInformation.length > 0 ? (
                <div className={`row row-cols-1 ${responsive ? '' : 'row-cols-2'} g-3`}>
                    {reviewInformation.map((review, index) => (
                        <div className="col" key={index}>
                            <ReviewCard 
                                isMobile={responsive} 
                                userinfo={review.userinfo}
                                reviewInfo={review.reviewInfo}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center p-4">
                    <p>No reviews yet. Be the first to review!</p>
                </div>
            )}
        </div>
    </section>
    )
}

ReviewSection.propTypes = {
    onSwitchToAdding: PropTypes.func.isRequired,
    responsive: PropTypes.bool.isRequired,
    reviewInformation: PropTypes.array.isRequired,
    isLoading: PropTypes.bool,
    stats: PropTypes.shape({
        combinedRating: PropTypes.number,
        googleRating: PropTypes.number,
        googleRatingCount: PropTypes.number,
        userRating: PropTypes.number,
        userRatingCount: PropTypes.number,
        distribution: PropTypes.arrayOf(PropTypes.number)
    })
};

function ReviewAdding({onSwitchToReading, responsive, restaurantId, onReviewSubmitted}){
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [uploadedImages, setUploadedImages] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleStarClick = (starValue) => {
        setRating(starValue);
    };

    const handleStarHover = (starValue) => {
        setHoveredRating(starValue);
    };

    const handleStarLeave = () => {
        setHoveredRating(0);
    };

    const handleImageUpload = (event) => {
        const files = Array.from(event.target.files);
        const remainingSlots = 3 - uploadedImages.length;
        const filesToAdd = files.slice(0, remainingSlots);
        
        const newImageUrls = filesToAdd.map(file => URL.createObjectURL(file));
        setUploadedImages([...uploadedImages, ...newImageUrls]);
        setUploadedFiles([...uploadedFiles, ...filesToAdd]);
    };

    const removeImage = (indexToRemove) => {
        setUploadedImages(uploadedImages.filter((_, index) => index !== indexToRemove));
        setUploadedFiles(uploadedFiles.filter((_, index) => index !== indexToRemove));
    };

    const triggerFileInput = () => {
        document.getElementById('imageUploadModal').click();
    };

    const handleSubmitReview = async () => {
        if (rating === 0) {
            alert('Please select a rating');
            return;
        }
        if (!reviewText.trim()) {
            alert('Please write a review');
            return;
        }

        try {
            setIsSubmitting(true);
            console.log('[ReviewAdding] Submitting review:', {
                restaurantId,
                score: rating,
                comment: reviewText,
                imageCount: uploadedFiles.length
            });
            
            // Step 1: Upload photos if any
            const uploadedPhotos = [];
            if (uploadedFiles.length > 0) {
                console.log('[ReviewAdding] Uploading', uploadedFiles.length, 'photos...');
                for (const file of uploadedFiles) {
                    try {
                        // Get presigned URL (backend expects 'mime' field)
                        const presignRes = await fetch(`${config.endpoints.uploads}/presign`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                mime: file.type
                            })
                        });

                        if (!presignRes.ok) {
                            const errorText = await presignRes.text();
                            console.warn('[ReviewAdding] Failed to get presigned URL for', file.name, ':', errorText);
                            continue;
                        }

                        const presignData = await presignRes.json();
                        const { uploadUrl, key, publicUrl } = presignData;
                        console.log('[ReviewAdding] Got presigned URL:', key);

                        // Upload to storage
                        const uploadRes = await fetch(uploadUrl, {
                            method: 'PUT',
                            body: file,
                            headers: {
                                'Content-Type': file.type
                            },
                            credentials: 'include'
                        });

                        if (!uploadRes.ok) {
                            const errorText = await uploadRes.text();
                            console.warn('[ReviewAdding] Failed to upload', file.name, '- status:', uploadRes.status, errorText);
                            continue;
                        }

                        // Add to photos array
                        uploadedPhotos.push({
                            storageKey: key,
                            publicUrl: publicUrl || null,
                            mime: file.type,
                            sizeBytes: file.size
                        });
                        
                        console.log('[ReviewAdding] Photo uploaded successfully:', key);
                    } catch (err) {
                        console.error('[ReviewAdding] Error uploading photo:', err);
                    }
                }
                console.log('[ReviewAdding] Total photos uploaded:', uploadedPhotos.length);
            }

            // Step 2: Submit rating with photo info
            const requestBody = {
                restaurantId,
                score: rating,
                comment: reviewText || undefined,
                photos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined
            };

            console.log('[ReviewAdding] Sending rating request:', requestBody);

            const response = await fetch(`${config.endpoints.ratings}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                console.error('[ReviewAdding] Submit failed:', response.status, errorData);
                throw new Error(errorData?.error || `Failed to submit review: ${response.status}`);
            }

            const data = await response.json();
            console.log('[ReviewAdding] Review submitted successfully:', data);
            
            // Reset form
            setRating(0);
            setReviewText('');
            setUploadedImages([]);
            setUploadedFiles([]);
            
            alert('Review submitted successfully!');
            
            // Notify parent and switch back to reading
            if (onReviewSubmitted) {
                onReviewSubmitted();
            }
            onSwitchToReading();
        } catch (error) {
            console.error('[ReviewAdding] Error submitting review:', error);
            alert(`Failed to submit review: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayRating = hoveredRating || rating;

    return(
        <section className="h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center" style={{width:"98%"}}>
                <h4 className="my-0">Leave a Review</h4>
                <button 
                    type="button" 
                    className="bg-transparent btn btn-outline-dark text-dark"
                    onClick={onSwitchToReading}
                >
                    Cancel
                </button>
            </div>

            <div className="flex-grow-1 overflow-auto p-3" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#BB3D25 #f1f1f1'
            }}>
                <div className="mb-4">
                    <label className="form-label fw-bold">Your Rating</label>
                    <div className="d-flex gap-2 align-items-center">
                        {[1, 2, 3, 4, 5].map((starValue) => (
                            <div 
                                key={starValue}
                                onClick={() => handleStarClick(starValue)}
                                onMouseEnter={() => handleStarHover(starValue)}
                                onMouseLeave={handleStarLeave}
                                style={{ cursor: 'pointer' }}
                            >
                                {stars({
                                    size: "40px",
                                    color: starValue <= displayRating ? "#BB3D25" : "#D3D3D3"
                                })}
                            </div>
                        ))}
                        <span className="ms-2 text-muted">
                            {displayRating > 0 ? `${displayRating} star${displayRating > 1 ? 's' : ''}` : 'Select rating'}
                        </span>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="form-label fw-bold">Your Review</label>
                    <textarea
                        className="form-control"
                        rows={responsive ? 4 : 6}
                        placeholder="Share your experience..."
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        style={{
                            resize: 'vertical',
                            minHeight: '100px'
                        }}
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label fw-bold">Photos (Optional)</label>
                    {uploadedImages.length > 0 && (
                        <div className="d-flex gap-2 mb-2 flex-wrap">
                            {uploadedImages.map((imageUrl, index) => (
                                <div 
                                    key={index} 
                                    className="position-relative"
                                    style={{
                                        width: '100px',
                                        height: '100px'
                                    }}
                                >
                                    <img 
                                        src={imageUrl} 
                                        alt={`Upload ${index + 1}`}
                                        className="rounded"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 p-1"
                                        onClick={() => removeImage(index)}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            padding: '0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            lineHeight: '1'
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            {uploadedImages.length < 3 && (
                                <div 
                                    className="d-flex justify-content-center align-items-center border border-2 border-dashed border-secondary rounded"
                                    style={{
                                        width: '100px',
                                        height: '100px',
                                        backgroundColor: 'white',
                                        cursor: 'pointer'
                                    }}
                                    onClick={triggerFileInput}
                                >
                                    <div className="text-center">
                                        <div style={{fontSize: '24px', color: '#BB3D25'}}>+</div>
                                        <p className="text-secondary m-0 small">Add</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {uploadedImages.length === 0 && (
                        <div className="d-flex gap-2">
                            <div 
                                className="d-flex justify-content-center align-items-center border border-2 border-dashed border-secondary rounded"
                                style={{
                                    width: '100px',
                                    height: '100px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer'
                                }}
                                onClick={triggerFileInput}
                            >
                                <div className="text-center">
                                    <div style={{fontSize: '24px', color: '#BB3D25'}}>+</div>
                                    <p className="text-secondary m-0 small">Add</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <input
                        id="imageUploadModal"
                        type="file"
                        accept="image/*"
                        multiple
                        style={{display: 'none'}}
                        onChange={handleImageUpload}
                    />
                </div>
            </div>

            <div className="d-flex justify-content-end mt-3">
                <button 
                    className="btn btn-primary px-4 py-2"
                    style={{backgroundColor: '#BB3D25', borderColor: '#BB3D25'}}
                    onClick={handleSubmitReview}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
            </div>
        </section>
    )
}

ReviewAdding.propTypes = {
    onSwitchToReading: PropTypes.func.isRequired,
    responsive: PropTypes.bool.isRequired,
    restaurantId: PropTypes.string.isRequired,
    onReviewSubmitted: PropTypes.func
};

function RatingModal({ isOpen, onClose, restaurant }) {
    const [showReviewAdding, setShowReviewAdding] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [reviewInformation, setReviewInformation] = useState([]);
    const [isLoadingReviews, setIsLoadingReviews] = useState(false);
    const [userReviewStats, setUserReviewStats] = useState({ avg: null, count: 0, distribution: createEmptyDistribution() });

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch reviews when restaurant changes
    const fetchReviews = useCallback(async () => {
        if (!restaurant?.id) return;
        
        try {
            setIsLoadingReviews(true);
            console.log('[RatingModal] Fetching reviews for restaurant:', restaurant.id);
            
            // Correct endpoint: /api/restaurants/{id}/ratings
            const response = await fetch(`${config.endpoints.restaurants}/${restaurant.id}/ratings`, {
                credentials: 'include'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.warn('[RatingModal] Fetch reviews failed:', response.status, errorText);
                // If 404, it means no reviews yet - that's okay
                if (response.status === 404) {
                    console.log('[RatingModal] No reviews found (404) - showing empty state');
                    setReviewInformation([]);
                    return;
                }
                throw new Error(`Failed to fetch reviews: ${response.status}`);
            }

            const data = await response.json();
            // Backend returns { items: [...] }
            const reviews = data.items || [];
            console.log('[RatingModal] Reviews fetched:', reviews.length, 'reviews');
            
            // Transform API data to match component format
            const transformedReviews = reviews.map(review => {
                // Use base64Data if available (for small files), otherwise use publicUrl
                const photoUrls = (review.photos || [])
                    .map(photo => photo.base64Data || photo.publicUrl)
                    .filter(Boolean);
                
                return {
                    userinfo: {
                        username: review.user?.username || 'Anonymous',
                        profileURL: "/placeholderProfile.png",
                        isVerified: review.status === 'approved' // Verified badge
                    },
                    reviewInfo: {
                        star: review.score || 0, // Backend uses 'score' not 'rating'
                        review: review.comment || '',
                        image: photoUrls
                    }
                };
            });
            
            setReviewInformation(transformedReviews);

            if (reviews.length > 0) {
                const totalScore = reviews.reduce((sum, review) => sum + (review.score || 0), 0);
                const distribution = createEmptyDistribution();
                reviews.forEach((review) => {
                    const rawScore = typeof review.score === 'number' ? review.score : 0;
                    const clamped = Math.min(Math.max(Math.round(rawScore), 1), 5);
                    distribution[clamped - 1] += 1;
                });
                setUserReviewStats({
                    avg: totalScore / reviews.length,
                    count: reviews.length,
                    distribution
                });
            } else {
                setUserReviewStats({ avg: null, count: 0, distribution: createEmptyDistribution() });
            }
        } catch (error) {
            console.error('[RatingModal] Error fetching reviews:', error.message);
            // Don't fail the modal, just show empty reviews
            setReviewInformation([]);
            setUserReviewStats({ avg: null, count: 0, distribution: createEmptyDistribution() });
        } finally {
            setIsLoadingReviews(false);
        }
    }, [restaurant?.id]);

    useEffect(() => {
        if (isOpen && restaurant) {
            fetchReviews();
        }
    }, [isOpen, restaurant, fetchReviews]);

    // Close modal when clicking outside
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Close modal on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleReviewSubmitted = () => {
        // Refresh reviews after successful submission
        fetchReviews();
    };

    const googleRatingValue = typeof restaurant?.googleRating === 'number' ? restaurant.googleRating : null;
    const googleRatingCount = restaurant?.googleRatingCount ?? 0;
    const userRatingValue = userReviewStats.avg ?? restaurant?.userRating ?? null;
    const userRatingCount = userReviewStats.count > 0 
        ? userReviewStats.count 
        : (restaurant?.userRatingCount ?? 0);

    const overallRating = useMemo(() => {
        return calculateCombinedRating(
            googleRatingValue,
            googleRatingCount,
            userRatingValue,
            userRatingCount
        );
    }, [googleRatingValue, googleRatingCount, userRatingValue, userRatingCount]);

    const reviewSectionStats = useMemo(() => ({
        combinedRating: overallRating,
        googleRating: googleRatingValue,
        googleRatingCount,
        userRating: userRatingValue,
        userRatingCount,
        distribution: userReviewStats.distribution ?? createEmptyDistribution()
    }), [overallRating, googleRatingValue, googleRatingCount, userRatingValue, userRatingCount, userReviewStats.distribution]);

    if (!isOpen || !restaurant) return null;

    return (
        <div 
            className="modal d-block"
            style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                zIndex: 9999,
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                overflow: 'auto'
            }}
            onClick={handleBackdropClick}
        >
            <div 
                className="modal-dialog modal-dialog-centered modal-xl"
                style={{ maxWidth: '90vw', margin: '2rem auto' }}
            >
                <div 
                    className="modal-content"
                    style={{ 
                        backgroundColor: '#FFF7EF',
                        color: '#4A1F0C',
                        border: '2px solid #8A3A1A',
                        borderRadius: '18px',
                        overflow: 'hidden',
                        boxShadow: '0 25px 45px rgba(74,31,12,0.25)'
                    }}
                >
                    {/* Close Button */}
                    <button 
                        onClick={onClose}
                        className="btn-close btn-close-white position-absolute"
                        style={{
                            top: '20px',
                            right: '20px',
                            zIndex: 10000,
                            fontSize: '1.5rem',
                            opacity: 0.8
                        }}
                        aria-label="Close"
                    />

                    <div className={`d-flex ${isMobile ? 'flex-column' : ''}`} style={{ minHeight: isMobile ? '80vh' : '70vh' }}>
                        {/* Restaurant Image */}
                        <div
                            className={isMobile ? 'w-100' : ''}
                            style={{
                                flex: isMobile ? '0 0 auto' : '0 0 30%',
                                minHeight: isMobile ? '200px' : '100%',
                                backgroundColor: '#F5D5B5'
                            }}
                        >
                            <img 
                                src={restaurant.url} 
                                alt={restaurant.name} 
                                style={{ 
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />
                        </div>
                        
                        {/* Content */}
                        <div 
                            className={`d-flex flex-column ${isMobile ? "w-100" : ""} p-3`} 
                            style={{
                                backgroundColor: '#FFF7EF',
                                flex: isMobile ? '1 1 auto' : '1 1 70%'
                            }}
                        >
                            {/* Header */}
                            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                                <div>
                                    <h2 className="my-1" style={{color: '#4A1F0C'}}>{restaurant.name}</h2>
                                    {restaurant.address && (
                                        <p className="small mb-0" style={{color: '#7A4B31'}}>{restaurant.address}</p>
                                    )}
                                </div>
                                <div className="text-end">
                                    <div className="d-flex align-items-center gap-1 justify-content-end">
                                        {stars({size: "4vh", color: "#C0471C"})}
                                        <h2 className="my-0" style={{color: '#4A1F0C'}}>{formatRating(overallRating)}</h2>
                                    </div>
                                </div>
                            </div>
                            
                            <hr className="mb-2" style={{ borderColor: '#E7C2A3' }} />

                            {/* Review Section */}
                            <div className="flex-grow-1 overflow-hidden">
                                {showReviewAdding ? (
                                    <ReviewAdding 
                                        onSwitchToReading={() => setShowReviewAdding(false)} 
                                        responsive={isMobile}
                                        restaurantId={restaurant.id}
                                        onReviewSubmitted={handleReviewSubmitted}
                                    />
                                ) : (
                                    <ReviewSection 
                                        onSwitchToAdding={() => setShowReviewAdding(true)} 
                                        responsive={isMobile} 
                                        reviewInformation={reviewInformation}
                                        isLoading={isLoadingReviews}
                                        stats={reviewSectionStats}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

RatingModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    restaurant: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string,
        address: PropTypes.string,
        url: PropTypes.string,
        rating: PropTypes.number,
        distance: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        googleRating: PropTypes.number,
        googleRatingCount: PropTypes.number,
        userRating: PropTypes.number,
        userRatingCount: PropTypes.number
    })
};

export default RatingModal;
