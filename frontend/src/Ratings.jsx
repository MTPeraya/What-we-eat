import React, { useState, useEffect } from 'react';
// , {useRef, useCallback}
import { Button, Offcanvas, Container } from 'react-bootstrap';
import ReviewCard from './components/ReviewCard';
import Header from './header';
import Footer from './components/smallfooter';

const stars = ({size, color}) => <svg className="mx-2" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 432 408"><path fill={color} d="M213 328L81 408l35-150L0 157l153-13L213 3l60 141l154 13l-117 101l35 150z" /></svg>

function ReviewSection({onSwitchToAdding, responsive, reveiwInformation}){
    return(
    <section className="h-100">

        <div className="d-flex justify-content-between" style={{width:"98%"}}>
            <h4 className="my-0">Reviews</h4>
            <div>
                {/* to the review page */}
                <button 
                    type="button" 
                    className="bg-transparent btn btn-outline-dark text-dark h-75 d-flex align-items-center"
                    onClick={onSwitchToAdding}
                >
                    Leave a Review
                </button>
            </div>
        </div>

        <div class="container overflow-auto" style={{
            width:"95%",
            height: responsive ? "90%" : "85%",
            scrollbarWidth: 'thin',
            scrollbarColor: '#BB3D25 #f1f1f1'
        }}>
            <div class={`${responsive ? 'col' : 'row'} flex-nowrap gap-2 ${responsive? "h-25" : "h-100"}`}>
                {reveiwInformation && reveiwInformation.length > 0 ? (
                    reveiwInformation.map((review, index) => (
                        <ReviewCard 
                            key={index}
                            isMobile={responsive} 
                            userinfo={review.userinfo}
                            reviewInfo={review.reviewInfo}
                        />
                    ))
                ) : (
                    // Fallback when no reviews available
                    <div className="d-flex justify-content-center align-items-center w-100">
                        <p className="text-secondary">No reviews yet. Be the first to leave a review!</p>
                    </div>
                )}
            </div>
        </div>
    </section>)
}

function ReviewAdding({onSwitchToReading, responsive}){
    const [uploadedImages, setUploadedImages] = useState([]);
    const [rating, setRating] = useState(1); // Default score of 1
    const [reviewText, setReviewText] = useState(""); // Track review text for character count

    const handleImageUpload = (event) => {
        const files = Array.from(event.target.files);
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes

        files.forEach(file => {
            // Stop if we already have 3 images
            if (uploadedImages.length >= 3) {
                return;
            }

            // Check file size (5MB limit)
            if (file.size > MAX_SIZE) {
                alert(`File "${file.name}" is too large. Maximum size is 5MB.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setUploadedImages(prev => {
                    // Double-check limit before adding
                    if (prev.length >= 3) {
                        return prev;
                    }
                    return [...prev, {
                        id: Date.now() + Math.random(),
                        src: e.target.result,
                        file: file
                    }];
                });
            };
            reader.readAsDataURL(file);
        });

        // Clear the file input to allow selecting the same files again
        event.target.value = '';
    };

    const removeImage = (imageId) => {
        setUploadedImages(prev => prev.filter(img => img.id !== imageId));
    };

    const triggerFileInput = () => {
        // Prevent opening file dialog if already at limit
        if (uploadedImages.length >= 3) {
            return;
        }
        document.getElementById('imageUpload').click();
    };

    const handleSubmitReview = () => {
        if (!reviewText.trim()) {
            alert('Please write a review before submitting.');
            return;
        }

        const reviewData = {
            comment: reviewText,
            photos: uploadedImages,
            rating: rating,
            timestamp: new Date().toISOString()
        };

        console.log('Submitting review:', reviewData);
        // TODO: Send to backend API
        alert('Review submitted successfully!');
        
        // Reset form
        setReviewText('');
        setUploadedImages([]);
        setRating(1);
    };

    return(
        <section className={`h-100 mx-0 ${responsive ? 'd-flex flex-column align-items-center': ''}`}>
            <div className="d-flex justify-content-between" style={{width:"98%"}}>
            <h4 className="my-0">Reviews</h4>
            <div>
                {/* to the review page */}
                <button 
                    type="button" 
                    className="bg-transparent btn btn-outline-dark text-dark h-75 d-flex align-items-center"
                    onClick={onSwitchToReading}
                >
                    Back to Read Review
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
                            style={{cursor: 'pointer'}}
                            onClick={() => setRating(star)}
                        >
                            <path 
                                fill={star <= rating ? "#BB3D25" : "white"} 
                                stroke="#BB3D25"
                                strokeWidth="20"
                                d="M213 328L81 408l35-150L0 157l153-13L213 3l60 141l154 13l-117 101l35 150z" 
                            />
                        </svg>
                    ))}
                    {/* <span className="ms-2 text-secondary">Rating: {rating}/5</span> */}
                </div>
            </div>
            <div className={`d-flex ${responsive ? "flex-column align-items-center mb-3": ""}`} style={{height:"60%", width: responsive ? '98%': '100%'}}>
                {/* review text here */}
                <div className={`position-relative flex-grow-1 d-flex justify-content-center ${responsive ? 'mb-3 w-100': ''}`}>
                    <textarea 
                        className="form-control border border-2 border-dashed border-secondary" 
                        id="RestaurantReview"
                        placeholder="Write your review here..."
                        rows="8"
                        maxLength="500"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        style={{
                            resize: 'vertical',
                            minHeight: '120px',
                            maxHeight: '250px',
                            overflow: 'auto',
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#BB3D25 #f1f1f1'
                        }}
                    ></textarea>
                    <div className="position-absolute bottom-0 end-0 me-2 mb-2">
                        <small className={`text-${reviewText.length >= 450 ? 'danger' : reviewText.length >= 400 ? 'warning' : 'secondary'}`}>
                            {reviewText.length}/500
                        </small>
                    </div>
                </div>

                <div className={`${responsive ? 'w-100 mb-5': 'ms-3'}`} style={{width: '200px', height: responsive? '100px':'200px'}}>
                    {/* Photo counter */}
                    {uploadedImages.length > 0 && (
                        <div className="text-end mb-2">
                            <small className="text-secondary">
                                Photos: {uploadedImages.length}/3
                            </small>
                        </div>
                    )}
                    
                    {uploadedImages.length === 0 ? (
                        // Empty state - white box with plus
                        <div 
                            className="d-flex justify-content-center align-items-center border border-2 border-dashed border-secondary h-100 w-100 rounded"
                            style={{backgroundColor: 'white', cursor: 'pointer'}}
                            onClick={triggerFileInput}
                        >
                            <div className="text-center">
                                <div style={{fontSize: '48px', color: '#BB3D25'}}>+</div>
                                <p className="text-secondary m-0">Add Photos</p>
                            </div>
                        </div>
                    ) : (
                        // Grid with images + add more button
                        <div className="d-grid h-100 w-100 gap-1" style={{
                            gridTemplateColumns: responsive ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                            gridTemplateRows: responsive ? '1fr' : 'repeat(2, 1fr)'
                        }}>
                            {uploadedImages.map((image, index) => (
                                <div key={image.id} className="position-relative border rounded overflow-hidden">
                                    <img 
                                        src={image.src} 
                                        alt={`Upload ${index + 1}`}
                                        className="w-100 h-100 object-fit-cover"
                                    />
                                    <button
                                        className="position-absolute top-0 end-0 btn btn-danger btn-sm rounded-circle"
                                        style={{
                                            width: '20px', 
                                            height: '20px', 
                                            fontSize: '12px',
                                            padding: '0',
                                            lineHeight: '1',
                                            margin: '2px'
                                        }}
                                        onClick={() => removeImage(image.id)}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            
                            {/* Add more button - always show if less than 3 images */}
                            {uploadedImages.length < 3 && (
                                <div 
                                    className="d-flex justify-content-center align-items-center border border-2 border-dashed border-secondary rounded"
                                    style={{backgroundColor: 'white', cursor: 'pointer'}}
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
                    
                    {/* Hidden file input */}
                    <input
                        id="imageUpload"
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
                >
                    Submit Review
                </button>
            </div>
        </section>
    )
}

function RatingPage(){
    const [showReviewAdding, setShowReviewAdding] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const restaurant = {imgURL: "../public/restaurant/restaurant1.jpg",
                    name: "Restaurant 1"};

    // Sample review data - replace this with your actual data source
    const reveiwInformation = [
        {
            userinfo: {
                username: "awesome name 1519",
                profileURL: "../../public/placeholderProfile.png"
            },
            reviewInfo: {
                star: 3,
                review: "ashlpuIOguzulipiuro;glhzjliopiruiofglhjklOWUPrI:OdglkhzjKWOUW:IFDgulzhj,KOU:WFIDhgkzj,WKUO:FIDhzgkj,:OUEWIFdhzk,nHWK:OUEFDizh,nb<WEU:dfihx,zbne<WJkoIPUfdxh,ewaoudf;ihxkj",
                image: ["../public/restaurant/restaurant2.jpg", "../public/restaurant/restaurant2.jpg", "../public/restaurant/restaurant2.jpg"]
            }
        },
        {
            userinfo: {
                username: "john_doe_2024",
                profileURL: "../../public/placeholderProfile.png"
            },
            reviewInfo: {
                star: 5,
                review: "Excellent food and amazing service! Highly recommend this place.",
                image: []
            }
        },
        {
            userinfo: {
                username: "foodie_lover",
                profileURL: "../../public/placeholderProfile.png"
            },
            reviewInfo: {
                star: 4,
                review: "Good atmosphere and tasty dishes. Will come back again!",
                image: ["../public/restaurant/restaurant1.jpg"]
            }
        }
    ];

    return(
        <div>
            <Header/>
            <section className={`d-flex justify-content-center align-items-center ${isMobile?'flex-column' : ''}`} style={{height: isMobile ? showReviewAdding ? "90vh" : "180vh" : '80vh', backgroundColor:"603A2B", width:"100vw"}}>
                <div className={`d-flex ${isMobile?'flex-column h-100 mt-5 align-items-center' : 'h-75'} border w-75 border-secondary rounded`}>
                    <img src={restaurant.imgURL} alt={restaurant.name} className={`object-fit-cover ${isMobile ? 'w-100 h-25' : 'w-25 h-100'} rounded-start`}/>
                    <div className={`d-flex flex-column ${isMobile ? "w-100 dx-1 px-1" : "w-75"} m-2`}>
                        <div className="d-flex justify-content-between align-items-center ">
                            <div>
                                <h1 className="my-1">{restaurant.name}</h1>
                            </div>
                            <div className="d-flex mx-3 my-1 align-items-center gap-1">
                                {stars({size: "4vh" , color: "#BB3D25"})}
                                <h1 className="my-0">5.0</h1>
                            </div>
                        </div>
                        <hr className="mb-1 me-1"/>

                        {showReviewAdding ? (
                            <ReviewAdding onSwitchToReading={() => setShowReviewAdding(false)} responsive={isMobile}/>
                        ) : (
                            <ReviewSection onSwitchToAdding={() => setShowReviewAdding(true)} responsive={isMobile} reveiwInformation={reveiwInformation}/>
                        )}
                        
                    </div>
                    


                </div>
                
            </section>
            <section style={{height: '10vh'}}></section>
            <Footer/>
        </div>
    )

};

export default RatingPage;