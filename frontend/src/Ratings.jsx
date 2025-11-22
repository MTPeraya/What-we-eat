import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import PropTypes from "prop-types";
// , {useRef, useCallback}
import ReviewCard from "./components/ReviewCard";
import Footer from "./components/smallfooter";
import { config } from "./config";
import { useParams, useLocation, useNavigate } from "react-router-dom";

// CONSTANT VARIABLE

const palette = {
  background: "#FCEEE3",
  card: "#FFF7EF",
  border: "#C47B4E",
  accent: "#BB3D25",
  textPrimary: "#4A1F0C",
  textSecondary: "#7A4B31",
};

const stars = ({ size, color }) => (
  <svg
    className="mx-2"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 432 408"
  >
    <path
      fill={color}
      d="M213 328L81 408l35-150L0 157l153-13L213 3l60 141l154 13l-117 101l35 150z"
    />
  </svg>
);

const HeartIcon = ({ filled }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={filled ? palette.accent : "none"}
        stroke={filled ? palette.accent : palette.textPrimary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
);
// Ensure proptypes are consistent if you use them elsewhere
HeartIcon.propTypes = {
    filled: PropTypes.bool.isRequired,
};


const calculateCombinedRating = (
  googleRating,
  googleCount,
  localRating,
  localCount
) => {
  let totalScore = 0;
  let totalCount = 0;

  if (typeof googleRating === "number") {
    const weight = googleCount && googleCount > 0 ? googleCount : 1;
    totalScore += googleRating * weight;
    totalCount += weight;
  }

  if (typeof localRating === "number") {
    const weight = localCount && localCount > 0 ? localCount : 1;
    totalScore += localRating * weight;
    totalCount += weight;
  }

  return totalCount > 0 ? totalScore / totalCount : null;
};

const formatRating = (value) =>
  typeof value === "number" ? value.toFixed(1) : "-";
const createEmptyDistribution = () => [0, 0, 0, 0, 0];


const styles = {
  pageWrapper: {
    background: palette.background,
    minHeight: "100vh",
    padding: "4rem 0 5rem",
  },
  content: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.8rem",
  },
  backButton: {
    alignSelf: "flex-start",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    borderRadius: "999px",
    padding: "0.65rem 1.4rem",
    border: `2px solid ${palette.border}`,
    background: "transparent",
    color: palette.textPrimary,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  heroCard: {
    background: palette.card,
    borderRadius: "26px",
    border: `2px solid ${palette.border}`,
    boxShadow: "0 25px 55px rgba(68,29,8,.12)",
    display: "flex",
    flexWrap: "wrap",
    overflow: "hidden",
  },
  heroImage: {
    flex: "1 1 360px",
    minHeight: "280px",
  },
  heroImageTag: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  heroContent: {
    flex: "1 1 360px",
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    color: palette.textPrimary,
  },
  ctaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.8rem",
    alignItems: "center",
  },
  ctaButton: {
    alignSelf: "flex-start",
    background: palette.accent,
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    padding: "0.85rem 1.6rem",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 12px 25px rgba(187,61,37,.25)",
  },
  // NEW style for wishlist button (transparent, border, heart icon)
  wishlistButton: { 
    alignSelf: "flex-start",
    background: "transparent",
    color: palette.textPrimary,
    border: `2px solid ${palette.border}`,
    borderRadius: "14px",
    padding: "0.85rem 1.6rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s ease",
  },
  reviewWrapper: {
    width: "100%",
    marginBottom: "3rem",
  },
  reviewCard: {
    background: palette.card,
    borderRadius: "26px",
    border: `2px solid ${palette.border}`,
    padding: "1.5rem",
    boxShadow: "0 20px 45px rgba(68,29,8,.1)",
    minHeight: "420px",
  },
};

stars.propTypes = {
    size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  color: PropTypes.string.isRequired,
};

function ReviewSection({
  onSwitchToAdding,
  responsive,
  reviewInformation,
  isLoading,
  stats,
}) {
  const distribution =
    stats?.distribution && stats.distribution.length === 5
      ? stats.distribution
      : createEmptyDistribution();
  const totalCommunityReviews =
    stats?.userRatingCount ?? distribution.reduce((acc, val) => acc + val, 0);

  const starBreakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = distribution[star - 1] || 0;
    const percent =
      totalCommunityReviews > 0 ? (count / totalCommunityReviews) * 100 : 0;
    return { star, count, percent };
  });

  return (
    <section className="h-100 d-flex flex-column">
      <div
        className="d-flex justify-content-between flex-shrink-0"
        style={{ width: "98%" }}
      >
            <h4 className="my-0">Reviews</h4>
            <div>
                <button 
                    type="button" 
                    className="bg-transparent btn btn-outline-dark text-dark h-75 d-flex align-items-center"
            onClick={onSwitchToAdding}
          >
            {" "}
            Leave a Review{" "}
          </button>
        </div>
      </div>

      <div className="py-3 px-2 w-100">
        <div
          className={`rounded-4 shadow-sm mb-3 p-3 ${
            responsive ? "" : "d-flex gap-3"
          }`}
          style={{
            background: "#FFF7EF",
            border: "2px solid #8A3A1A",
            color: "#4A1F0C",
          }}
        >
          <div
            className={`${responsive ? "mb-3 text-center" : "text-center"}`}
            style={{ minWidth: responsive ? "auto" : "220px" }}
          >
            <div className="text-uppercase small" style={{ opacity: 0.8 }}>
              Average rating
            </div>
            <div className="display-4 fw-bold">
              {formatRating(stats?.combinedRating)}
            </div>
            <div className="d-flex justify-content-center align-items-center gap-2">
              {stars({ size: "36px", color: "#C0471C" })}
            </div>
            <div className="mt-2 small">
              Avg from Google {formatRating(stats?.googleRating)}
              {stats?.googleRatingCount
                ? ` · ${stats.googleRatingCount.toLocaleString()} reviews`
                : ""}
              <br />+ Community {formatRating(stats?.userRating)}
              {stats?.userRatingCount
                ? ` · ${stats?.userRatingCount} review${
                    stats?.userRatingCount > 1 ? "s" : ""
                  }`
                : ""}
            </div>
          </div>
          <div className="flex-grow-1">
            {starBreakdown.map(({ star, count, percent }) => (
              <div key={star} className="d-flex align-items-center gap-2 mb-2">
                <div style={{ width: "35px" }} className="text-end fw-semibold">
                  {star}
                </div>
                <div
                  className="flex-grow-1 rounded-pill"
                  style={{
                    height: "10px",
                    overflow: "hidden",
                    backgroundColor: "#FFE6D1",
                    border: "1px solid #C47B4E",
                  }}
                >
                  <div
                    className="h-100 rounded-pill"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: "#C0471C",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div style={{ width: "30px" }} className="text-start small">
                  {count}
                </div>
              </div>
            ))}
            {totalCommunityReviews === 0 && (
              <div className="small mt-2" style={{ opacity: 0.75 }}>
                Community ratings will appear after the first review.
              </div>
            )}
          </div>
            </div>
        </div>

      <div
        className="flex-grow-1 overflow-auto px-2"
        style={{
          width: "100%",
          maxHeight: "100%",
          scrollbarWidth: "thin",
          scrollbarColor: "#BB3D25 #f1f1f1",
          paddingBottom: "10px",
        }}
      >
        {isLoading ? (
          <div className="text-center p-4 w-100">
            <div className="spinner-border text-light" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading reviews...</p>
          </div>
        ) : reviewInformation && reviewInformation.length > 0 ? (
          <div
            className={`row row-cols-1 ${responsive ? "" : "row-cols-2"} g-3`}
          >
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
  );
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
    distribution: PropTypes.arrayOf(PropTypes.number),
  }),
};

function ReviewAdding({
  onSwitchToReading,
  responsive,
  restaurantId,
  onReviewSubmitted,
}) {
    const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

    const handleImageUpload = (event) => {
        const files = Array.from(event.target.files);
    const remainingSlots = 3 - uploadedImages.length;
    const filesToAdd = files.slice(0, remainingSlots);

    const newImageUrls = filesToAdd.map((file) => URL.createObjectURL(file));
    setUploadedImages([...uploadedImages, ...newImageUrls]);
    setUploadedFiles([...uploadedFiles, ...filesToAdd]);
    };

  const removeImage = (indexToRemove) => {
    setUploadedImages(
      uploadedImages.filter((_, index) => index !== indexToRemove)
    );
    setUploadedFiles(
      uploadedFiles.filter((_, index) => index !== indexToRemove)
    );
    };

    const triggerFileInput = () => {
    if (uploadedImages.length >= 3) return;
    fileInputRef.current?.click();
  };

  const handleSubmitReview = async () => {
    if (!restaurantId) {
      console.error("[ReviewAdding] restaurantId is missing!");
      alert("Error: Restaurant ID is missing. Please try again.");
      return;
    }
    
    if (rating === 0) {
      alert("Please select a rating");
            return;
        }
        if (!reviewText.trim()) {
      alert("Please write a review");
            return;
        }

    try {
      setIsSubmitting(true);
      const uploadedPhotos = [];
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          try {
            const presignRes = await fetch(
              `${config.endpoints.uploads}/presign`,
              {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mime: file.type }),
              }
            );

            if (!presignRes.ok) {
              const errorText = await presignRes.text();
              console.warn("[ReviewAdding] Failed presign:", errorText);
              continue;
            }

            const presignData = await presignRes.json();
            const { uploadUrl, key, publicUrl } = presignData;

            const uploadRes = await fetch(uploadUrl, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": file.type },
              credentials: "include",
            });

            if (!uploadRes.ok) {
              const errorText = await uploadRes.text();
              console.warn("[ReviewAdding] Upload failed:", errorText);
              continue;
            }

            // Get upload response which may include base64Data for small files
            const uploadData = await uploadRes.json();
            
            uploadedPhotos.push({
              storageKey: key,
              publicUrl: publicUrl || null,
              base64Data: uploadData.base64Data || null, // Include base64Data if available (for files < 500KB)
              mime: file.type,
              sizeBytes: file.size,
            });
          } catch (error) {
            console.error("[ReviewAdding] Error uploading photo:", error);
          }
        }
      }

      const requestBody = {
        restaurantId,
        score: rating,
        comment: reviewText || undefined,
        photos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
      };
      
      console.log("[ReviewAdding] Submitting review with data:", {
        restaurantId,
        score: rating,
        hasComment: !!reviewText,
        commentLength: reviewText?.length || 0,
        photosCount: uploadedPhotos.length,
      });

      const response = await fetch(`${config.endpoints.ratings}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("[ReviewAdding] Error response:", errorData);
        throw new Error(errorData?.error || "Failed to submit review");
      }

      alert("Review submitted successfully!");
      setRating(0);
      setHoveredRating(0);
      setReviewText("");
        setUploadedImages([]);
      setUploadedFiles([]);

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
      onSwitchToReading();
    } catch (error) {
      console.error("[ReviewAdding] Submit error:", error);
      alert(`Failed to submit review: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <section
      className={`h-100 mx-0 ${
        responsive ? "d-flex flex-column align-items-center" : ""
      }`}
    >
      <div className="d-flex justify-content-between" style={{ width: "98%" }}>
        <h4 className="my-0">Leave a Review</h4>
            <div>
                <button 
                    type="button" 
                    className="bg-transparent btn btn-outline-dark text-dark h-75 d-flex align-items-center"
                    onClick={onSwitchToReading}
                >
            Back to reviews
                </button>
            </div>
            </div>
            <div className="mb-2">
                <div className="d-flex align-items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <svg 
                            key={star}
                            className="mx-1" 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="40" 
                            height="40" 
                            viewBox="0 0 432 408"
              style={{ cursor: "pointer" }}
                            onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
                        >
                            <path 
                fill={star <= displayRating ? "#BB3D25" : "white"}
                                stroke="#BB3D25"
                                strokeWidth="20"
                                d="M213 328L81 408l35-150L0 157l153-13L213 3l60 141l154 13l-117 101l35 150z" 
                            />
                        </svg>
                    ))}
          <span className="ms-2 text-secondary">
            {displayRating > 0
              ? `${displayRating} star${displayRating > 1 ? "s" : ""}`
              : "Select rating"}
          </span>
                </div>
            </div>
      <div
        className={`d-flex ${
          responsive ? "flex-column align-items-center mb-3" : ""
        }`}
        style={{ height: "60%", width: responsive ? "98%" : "100%" }}
      >
        <div
          className={`position-relative flex-grow-1 d-flex justify-content-center ${
            responsive ? "mb-3 w-100" : ""
          }`}
        >
                    <textarea 
                        className="form-control border border-2 border-dashed border-secondary" 
                        id="RestaurantReview"
                        placeholder="Write your review here..."
                        rows="8"
                        maxLength="500"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        style={{
              resize: "vertical",
              minHeight: "120px",
              maxHeight: "250px",
              overflow: "auto",
              scrollbarWidth: "thin",
              scrollbarColor: "#BB3D25 #f1f1f1",
                        }}
                    ></textarea>
                    <div className="position-absolute bottom-0 end-0 me-2 mb-2">
            <small
              className={`text-${
                reviewText.length >= 450
                  ? "danger"
                  : reviewText.length >= 400
                  ? "warning"
                  : "secondary"
              }`}
            >
                            {reviewText.length}/500
                        </small>
                    </div>
                </div>

        <div
          className={`${responsive ? "w-100 mb-5" : "ms-3"}`}
          style={{ width: "200px", height: responsive ? "100px" : "200px" }}
        >
                    {uploadedImages.length > 0 && (
                        <div className="text-end mb-2">
                            <small className="text-secondary">
                                Photos: {uploadedImages.length}/3
                            </small>
                        </div>
                    )}
                    
                    {uploadedImages.length === 0 ? (
                        <div 
                            className="d-flex justify-content-center align-items-center border border-2 border-dashed border-secondary h-100 w-100 rounded"
              style={{ backgroundColor: "white", cursor: "pointer" }}
                            onClick={triggerFileInput}
                        >
                            <div className="text-center">
                <div style={{ fontSize: "48px", color: "#BB3D25" }}>+</div>
                                <p className="text-secondary m-0">Add Photos</p>
                            </div>
                        </div>
                    ) : (
            <div
              className="d-grid h-100 w-100 gap-1"
              style={{
                gridTemplateColumns: responsive
                  ? "repeat(3, 1fr)"
                  : "repeat(2, 1fr)",
                gridTemplateRows: responsive ? "1fr" : "repeat(2, 1fr)",
              }}
            >
                            {uploadedImages.map((image, index) => (
                <div
                  key={index}
                  className="position-relative border rounded overflow-hidden"
                >
                                    <img 
                    src={image}
                                        alt={`Upload ${index + 1}`}
                                        className="w-100 h-100 object-fit-cover"
                                    />
                                    <button
                                        className="position-absolute top-0 end-0 btn btn-danger btn-sm rounded-circle"
                                        style={{
                      width: "20px",
                      height: "20px",
                      fontSize: "12px",
                      padding: "0",
                      lineHeight: "1",
                      margin: "2px",
                                        }}
                    onClick={() => removeImage(index)}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            
                            {uploadedImages.length < 3 && (
                                <div 
                                    className="d-flex justify-content-center align-items-center border border-2 border-dashed border-secondary rounded"
                  style={{ backgroundColor: "white", cursor: "pointer" }}
                                    onClick={triggerFileInput}
                                >
                                    <div className="text-center">
                    <div style={{ fontSize: "24px", color: "#BB3D25" }}>+</div>
                                        <p className="text-secondary m-0 small">Add</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <input
            ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
            style={{ display: "none" }}
                        onChange={handleImageUpload}
                    />
                </div>
            </div>

            <div className="d-flex justify-content-end mt-3">
                <button 
                    className="btn btn-primary px-4 py-2"
          style={{ backgroundColor: "#BB3D25", borderColor: "#BB3D25" }}
                    onClick={handleSubmitReview}
          disabled={isSubmitting}
                >
          {isSubmitting ? "Submitting..." : "Submit Review"}
                </button>
            </div>
        </section>
  );
}

ReviewAdding.propTypes = {
    onSwitchToReading: PropTypes.func.isRequired,
  responsive: PropTypes.bool.isRequired,
  restaurantId: PropTypes.string.isRequired,
  onReviewSubmitted: PropTypes.func,
};

function RatingPage() {
    // Main Page
    const { restaurantId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [showReviewAdding, setShowReviewAdding] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [reviewInformation, setReviewInformation] = useState([]);
    const [isLoadingReviews, setIsLoadingReviews] = useState(false);
    const [userReviewStats, setUserReviewStats] = useState({
        avg: null,
        count: 0,
        distribution: createEmptyDistribution(),
    });

    // --- NEW WISHLIST STATE ---
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [isWishlistUpdating, setIsWishlistUpdating] = useState(false);
    // -------------------------


    // --- MODIFIED RESTAURANT DATA HANDLING ---

    const restaurantFromState = location.state?.restaurant;
    const resolvedRestaurantId = restaurantFromState?.id || restaurantId;

    // A consistent structure for placeholder/fallback data
    const initialRestaurantData = useMemo(() => ({
        imgURL: "/restaurant/restaurant1.jpg",
        name: "Loading...",
        rating: null,
        address: "",
        id: resolvedRestaurantId,
        googleRatingCount: null,
    }), [resolvedRestaurantId]);
    
    // State to hold the definitive restaurant data
    const [restaurantDetails, setRestaurantDetails] = useState(
        restaurantFromState || initialRestaurantData
    );

    // Update state if navigation state changes
    useEffect(() => {
        if (restaurantFromState) {
            setRestaurantDetails(restaurantFromState);
        }
    }, [restaurantFromState]);

    // Function to fetch restaurant details from the backend
    const fetchRestaurantDetails = useCallback(async () => {
        if (!resolvedRestaurantId || restaurantFromState) return;

        try {
            const url = `${config.endpoints.restaurants}/${resolvedRestaurantId}`;
            console.log(`[RatingPage] Fetching restaurant from: ${url}`);
            
            const response = await fetch(url, {
                credentials: "include",
                headers: {
                    'Content-Type': 'application/json',
                }
            }).catch((fetchError) => {
                // Handle network errors (CORS, connection refused, etc.)
                console.error(`[RatingPage] Network error fetching restaurant:`, fetchError);
                throw new Error(`Network error: ${fetchError.message}`);
            });

            // Handle empty responses (server down, CORS blocking, etc.)
            if (!response.ok && response.status === 0) {
                console.error(`[RatingPage] Empty response - backend may be unavailable`);
                setRestaurantDetails({
                    ...initialRestaurantData,
                    name: "Error Loading Restaurant",
                });
                return;
            }

            if (!response.ok) {
                let errorData = null;
                try {
                    const text = await response.text();
                    if (text) {
                        errorData = JSON.parse(text);
                    }
                } catch {
                    // Ignore parse errors
                }

                if (response.status === 404) {
                    console.error(`[RatingPage] Restaurant not found: ${resolvedRestaurantId}`, errorData);
                    setRestaurantDetails({
                        ...initialRestaurantData,
                        name: "Restaurant Not Found",
                    });
                } else {
                    console.error(`[RatingPage] Failed to fetch restaurant details: ${response.status}`, errorData);
                    setRestaurantDetails({
                        ...initialRestaurantData,
                        name: "Error Loading Restaurant",
                    });
                }
                return;
            }

            const details = await response.json();
            console.log(`[RatingPage] Successfully loaded restaurant:`, details.name);

            setRestaurantDetails({
                imgURL: details.url || initialRestaurantData.imgURL,
                name: details.name || "Unknown Restaurant",
                // Ensure rating and count are numbers or null
                rating: typeof details.rating === 'number' ? details.rating : null, 
                googleRatingCount: details.googleRatingCount ?? null,
                address: details.address || "",
                id: resolvedRestaurantId,
            });
        } catch (error) {
            console.error("[RatingPage] Error fetching restaurant details:", error);
            setRestaurantDetails({
                ...initialRestaurantData,
                name: "Error Loading Restaurant",
            });
        }
    }, [resolvedRestaurantId, restaurantFromState, initialRestaurantData]);


    useEffect(() => {
        // Fetch details if we don't have them (e.g., page refresh)
        if (!restaurantFromState && resolvedRestaurantId) {
            fetchRestaurantDetails();
        }
    }, [restaurantFromState, resolvedRestaurantId, fetchRestaurantDetails]);
    
    // Use the state for the final rendering object
    const restaurant = restaurantDetails; 
    
    // --- END MODIFIED RESTAURANT DATA HANDLING ---

    // --- FIXED WISHLIST LOGIC ---
    // The backend uses a GET request to the base path to fetch all favorites.
    // We must fetch the entire list and check the status locally.

    const fetchWishlistStatus = useCallback(async () => {
        if (!resolvedRestaurantId) return;
        try {
            // Use the base endpoint to fetch all favorites
            const response = await fetch(config.endpoints.wishlist, {
                credentials: "include",
            });
            
            // Check for success or specific non-error status (e.g., 401 unauthenticated)
            if (response.ok) {
                const data = await response.json();
                const favorites = data.favorites || [];

                // Check if the current restaurantId is present in the list
                const isFavorite = favorites.some(
                    (f) => f.restaurantId === resolvedRestaurantId
                );
                
                setIsWishlisted(isFavorite);
            } else if (response.status === 401) {
                 // UNAUTHENTICATED: Treat as not wishlisted (user must log in)
                setIsWishlisted(false);
            } else {
                // Log other warnings but default to not wishlisted
                console.warn("Failed to fetch wishlist status:", response.status);
                setIsWishlisted(false); 
            }
        } catch (error) {
            console.error("Error fetching wishlist status:", error);
            setIsWishlisted(false);
        }
    }, [resolvedRestaurantId]);


    const toggleWishlist = useCallback(async () => {
        if (!resolvedRestaurantId || isWishlistUpdating) return;

        setIsWishlistUpdating(true);
        // Backend uses POST to add, DELETE to remove. Both use the base path.
        const method = isWishlisted ? 'DELETE' : 'POST';
        const endpoint = config.endpoints.wishlist;

        try {
            // Request must send restaurantId in the JSON body
            const response = await fetch(endpoint, {
                method: method,
                credentials: "include",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId: resolvedRestaurantId }),
            });

            if (response.ok) {
                // Success: toggle the local state
                setIsWishlisted(prev => !prev);
            } else {
                const errorData = await response.json().catch(() => null);
                console.error("Failed to toggle wishlist:", errorData);
                alert(`Failed to ${isWishlisted ? 'remove from' : 'add to'} wishlist. Please try again.`);
            }
        } catch (error) {
            console.error("Error toggling wishlist:", error);
            alert("An unexpected error occurred while updating the wishlist.");
        } finally {
            setIsWishlistUpdating(false);
        }
    }, [resolvedRestaurantId, isWishlisted, isWishlistUpdating]);

    // --- END FIXED WISHLIST LOGIC ---


    const handleGoBack = () => {
        navigate(-1); // Go back to previous page
    };

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    }, []);

    const fetchReviews = useCallback(async () => {
    if (!resolvedRestaurantId) return;
    try {
      setIsLoadingReviews(true);
      const response = await fetch(
        `${config.endpoints.restaurants}/${resolvedRestaurantId}/ratings`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setReviewInformation([]);
          setUserReviewStats({
            avg: null,
            count: 0,
            distribution: createEmptyDistribution(),
          });
          return;
        }
        throw new Error(`Failed to fetch reviews: ${response.status}`);
      }

      const data = await response.json();
      const reviews = data.items || [];

      const transformedReviews = reviews.map((review) => {
        // Use base64Data if available (for small files), otherwise use publicUrl
        const photoUrls = (review.photos || [])
          .map((photo) => photo.base64Data || photo.publicUrl)
          .filter(Boolean);

        return {
            userinfo: {
            username: review.user?.username || "Anonymous",
            profileURL: "/placeholderProfile.png",
            isVerified: review.status === "approved",
            },
            reviewInfo: {
            star: review.score || 0,
            review: review.comment || "",
            image: photoUrls,
          },
        };
      });

      setReviewInformation(transformedReviews);

      if (reviews.length > 0) {
        const totalScore = reviews.reduce(
          (sum, review) => sum + (review.score || 0),
          0
        );
        const distribution = createEmptyDistribution();
        reviews.forEach((review) => {
          const rawScore = typeof review.score === "number" ? review.score : 0;
          const clamped = Math.min(Math.max(Math.round(rawScore), 1), 5);
          distribution[clamped - 1] += 1;
        });
        setUserReviewStats({
          avg: totalScore / reviews.length,
          count: reviews.length,
          distribution,
        });
      } else {
        setUserReviewStats({
          avg: null,
          count: 0,
          distribution: createEmptyDistribution(),
        });
      }
    } catch (error) {
      console.error("[RatingPage] Failed to fetch reviews:", error);
      setReviewInformation([]);
      setUserReviewStats({
        avg: null,
        count: 0,
        distribution: createEmptyDistribution(),
      });
    } finally {
      setIsLoadingReviews(false);
    }
  }, [resolvedRestaurantId]);

  useEffect(() => {
    if (resolvedRestaurantId) {
      fetchReviews();
      // Fetch wishlist status when component mounts
      fetchWishlistStatus(); 
    }
  }, [resolvedRestaurantId, fetchReviews, fetchWishlistStatus]);

  const handleReviewSubmitted = useCallback(() => {
    fetchReviews();
    // After submitting a review, also refetch details in case the backend updates 
    // the aggregated stats on the restaurant object itself (optional, but robust)
    if (!restaurantFromState) {
        fetchRestaurantDetails();
    }
  }, [fetchReviews, restaurantFromState, fetchRestaurantDetails]);

  const googleRatingValue =
    typeof restaurant.rating === "number" ? restaurant.rating : null;
  const googleRatingCount = restaurant.googleRatingCount ?? 0;
  const userRatingValue = userReviewStats.avg;
  const userRatingCount = userReviewStats.count;

  const overallRating = useMemo(() => {
    return calculateCombinedRating(
      googleRatingValue,
      googleRatingCount,
      userRatingValue,
      userRatingCount
    );
  }, [googleRatingValue, googleRatingCount, userRatingValue, userRatingCount]);

  const reviewSectionStats = useMemo(
    () => ({
      combinedRating: overallRating,
      googleRating: googleRatingValue,
      googleRatingCount,
      userRating: userRatingValue,
      userRatingCount,
      distribution: userReviewStats.distribution ?? createEmptyDistribution(),
    }),
    [
      overallRating,
      googleRatingValue,
      googleRatingCount,
      userRatingValue,
      userRatingCount,
      userReviewStats.distribution,
    ]
  );

  return (
        <div>
      <section style={styles.pageWrapper}>
        <div style={styles.content}>
          <button style={styles.backButton} onClick={handleGoBack}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={palette.textPrimary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>

          <div style={styles.heroCard}>
            <div style={styles.heroImage}>
              <img
                src={restaurant.imgURL}
                alt={restaurant.name}
                style={styles.heroImageTag}
              />
            </div>
            <div style={styles.heroContent}>
              <div>
                <p
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    fontSize: "0.8rem",
                    color: palette.textSecondary,
                    marginBottom: "0.3rem",
                  }}
                >
                  Restaurant
                </p>
                <h1 style={{ margin: 0 }}>{restaurant.name}</h1>
                <p
                  style={{ marginTop: "0.3rem", color: palette.textSecondary }}
                >
                  {restaurant.address ||
                    "Add an address to help friends find it faster"}
                </p>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}
              >
                {/* Display placeholder star if overallRating is null/0 */}
                {overallRating !== null && overallRating !== 0 ? (
                  stars({ size: "46px", color: palette.accent })
                ) : (
                  stars({ size: "46px", color: palette.textSecondary })
                )}
                            <div>
                  <div style={{ fontSize: "2.5rem", fontWeight: 700 }}>
                    {formatRating(overallRating)}
                  </div>
                  <small style={{ color: palette.textSecondary }}>
                    {googleRatingCount > 0
                      ? `${googleRatingCount.toLocaleString()} Google reviews • `
                      : ""}
                    {userRatingCount} community reviews
                  </small>
                </div>
              </div>
              <div style={styles.ctaRow}>
                <button
                  style={styles.ctaButton}
                  onClick={() => setShowReviewAdding(true)}
                >
                  Leave a Review
                </button>
                
                {/* --- WISHLIST BUTTON ADDED HERE --- */}
                <button
                    style={{
                        ...styles.wishlistButton,
                        background: isWishlisted ? palette.accent : 'transparent',
                        color: isWishlisted ? '#fff' : palette.textPrimary,
                        border: `2px solid ${isWishlisted ? palette.accent : palette.border}`,
                        opacity: isWishlistUpdating ? 0.7 : 1,
                        pointerEvents: isWishlistUpdating ? 'none' : 'auto',
                    }}
                    onClick={toggleWishlist}
                    disabled={isWishlistUpdating}
                >
                    <HeartIcon filled={isWishlisted} />
                    {isWishlistUpdating 
                        ? (isWishlisted ? "Removing..." : "Adding...")
                        : isWishlisted ? "Wishlisted" : "Add to Wishlist"}
                </button>
                {/* ---------------------------------- */}
                
                {!showReviewAdding && (
                  <span style={{ color: palette.textSecondary }}>
                    Have photos? Share them with the community.
                  </span>
                )}
                            </div>
                            </div>
                        </div>

          <div style={styles.reviewWrapper}>
            <div style={styles.reviewCard}>
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
            </section>
      <Footer
        location="Your Location"
        review={overallRating ? ` ${overallRating.toFixed(1)}` : " -"}
      />
        </div>
  );
}

export default RatingPage;