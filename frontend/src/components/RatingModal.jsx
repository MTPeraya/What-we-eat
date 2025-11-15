import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import ReviewCard from './ReviewCard';
import { config } from '../config';

const stars = ({size, color}) => <svg className="mx-2" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 432 408"><path fill={color} d="M213 328L81 408l35-150L0 157l153-13L213 3l60 141l154 13l-117 101l35 150z" /></svg>

stars.propTypes = {
    size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    color: PropTypes.string.isRequired
};

function ReviewSection({onSwitchToAdding, responsive, reviewInformation, isLoading}){
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

        <div className="container overflow-auto flex-grow-1" style={{
            width:"95%",
            maxHeight: "100%",
            scrollbarWidth: 'thin',
            scrollbarColor: '#BB3D25 #f1f1f1',
            paddingBottom: '10px'
        }}>
            <div className={`${responsive ? 'col' : 'row'} flex-nowrap gap-2 ${responsive? "" : ""}`} style={{
                display: 'flex',
                flexWrap: 'nowrap',
                overflowX: responsive ? 'hidden' : 'auto'
            }}>
                {isLoading ? (
                    <div className="text-center p-4 w-100">
                        <div className="spinner-border text-light" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading reviews...</p>
                    </div>
                ) : reviewInformation && reviewInformation.length > 0 ? (
                    reviewInformation.map((review, index) => (
                        <ReviewCard 
                            key={index}
                            isMobile={responsive} 
                            userinfo={review.userinfo}
                            reviewInfo={review.reviewInfo}
                        />
                    ))
                ) : (
                    <div className="text-center p-4">
                        <p>No reviews yet. Be the first to review!</p>
                    </div>
                )}
            </div>
        </div>
    </section>
    )
}

ReviewSection.propTypes = {
    onSwitchToAdding: PropTypes.func.isRequired,
    responsive: PropTypes.bool.isRequired,
    reviewInformation: PropTypes.array.isRequired,
    isLoading: PropTypes.bool
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
                // Extract photo URLs from photos array
                const photoUrls = (review.photos || [])
                    .map(photo => photo.publicUrl)
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
        } catch (error) {
            console.error('[RatingModal] Error fetching reviews:', error.message);
            // Don't fail the modal, just show empty reviews
            setReviewInformation([]);
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
                        backgroundColor: '#603A2B',
                        color: 'white',
                        border: 'none',
                        borderRadius: '15px',
                        overflow: 'hidden'
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
                        <img 
                            src={restaurant.url} 
                            alt={restaurant.name} 
                            className={`object-fit-cover ${isMobile ? 'w-100' : 'w-25'}`}
                            style={{ 
                                height: isMobile ? '200px' : 'auto',
                                borderRadius: isMobile ? '0' : '0'
                            }}
                        />
                        
                        {/* Content */}
                        <div className={`d-flex flex-column ${isMobile ? "w-100" : "w-75"} p-3`}>
                            {/* Header */}
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <div>
                                    <h2 className="my-1">{restaurant.name}</h2>
                                    {restaurant.address && (
                                        <p className="text-light small mb-0">{restaurant.address}</p>
                                    )}
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                    {stars({size: "4vh", color: "#BB3D25"})}
                                    <h2 className="my-0">{restaurant.rating ? restaurant.rating.toFixed(1) : "-"}</h2>
                                </div>
                            </div>
                            
                            <hr className="mb-2" style={{ borderColor: 'rgba(255,255,255,0.3)' }} />

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
    restaurant: PropTypes.object
};

export default RatingModal;
