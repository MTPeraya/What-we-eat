import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';

const stars = ({size, color}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 432 408"><path fill={color} d="M213 328L81 408l35-150L0 157l153-13L213 3l60 141l154 13l-117 101l35 150z"/></svg>

function ReviewCard(
    {userinfo = {
        username: "awesome name 1519",
        profileURL: "../../public/placeholderProfile.png"
    },
    reviewInfo = {
        star: 4,
        review: "omg this restaurant is so damn good",
        image: []
    },
    isMobile}
){
    const [showModal, setShowModal] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const handleImageClick = (index) => {
        setCurrentImageIndex(index);
        setShowModal(true);
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % reviewInfo.image.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + reviewInfo.image.length) % reviewInfo.image.length);
    };

    const listStars = [];
    for (let i = 0; i < reviewInfo.star; i++) {
        listStars.push(stars({size: "20px" , color: "#BB3D25"}));
    }
    for (let i = reviewInfo.star; i < 5; i++){
        listStars.push(stars({size: "20px" , color: "white"}));
    }
    return(
        <div className="d-flex flex-column border border-secondary rounded mb-2 px-2" style = {{
            width: isMobile ? "100%" : "40%", 
            height: isMobile ? "auto" : "100%",
            minHeight: isMobile ? "150px" : "200px",
            maxHeight: isMobile ? "none" : "90%"
        }}>
            <div className="d-flex flex-shrink-0">{/* header*/}
                <div> {/* profile picture*/}
                    <img src={userinfo.profileURL} height="50px" className="rounded-circle my-2"/>

                </div>
                <div className="flex-grow-1">
                    <div className="d-flex flex-column my-2 ms-2">
                        {/*name + star*/}
                        <h6 className="my-0 text-truncate">{userinfo.username}</h6>
                        <div>
                            {listStars}
                        </div>

                    </div>
                    <div className="d-flex">
                        {/*tag*/}
                    </div>
                </div>
            </div>

            <div 
                className="flex-grow-1"
                style={{
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    overflow: isMobile ? 'visible' : 'auto',
                    maxHeight: isMobile ? 'none' : '350px',
                    minHeight: isMobile ? 'none' : '100px',
                    padding: '8px 0'
                }}
            >
                {reviewInfo.review}
            </div>

            {/* Image Gallery - Facebook/Twitter Style */}
            {reviewInfo.image && reviewInfo.image.length > 0 && (
                <div className="mt-2 mb-2">
                    {reviewInfo.image.length === 1 && (
                        // Single image - full width
                        <div 
                            className="w-100 h-100"
                            style={{cursor: 'pointer', maxHeight: '150px', overflow: 'hidden'}}
                            onClick={() => handleImageClick(0)}
                        >
                            <img 
                                src={reviewInfo.image[0].src || reviewInfo.image[0]}
                                alt="Review"
                                className="w-100 h-auto rounded border"
                                style={{objectFit: 'cover', maxHeight: '300px'}}
                            />
                        </div>
                    )}

                    {reviewInfo.image.length === 2 && (
                        // Two images - side by side
                        <div className="d-flex gap-1">
                            {reviewInfo.image.map((image, index) => (
                                <div 
                                    key={index}
                                    className="flex-fill"
                                    style={{cursor: 'pointer', height: '150px'}}
                                    onClick={() => handleImageClick(index)}
                                >
                                    <img 
                                        src={image.src || image}
                                        alt={`Review ${index + 1}`}
                                        className="w-100 h-100 object-fit-cover rounded border"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {reviewInfo.image.length === 3 && (
                        // Three images - FIRST image biggest (half width), other 2 share remaining half vertically
                        <div className="d-flex gap-1" style={{height: '150px'}}>
                            {/* First image - takes 50% width, full height */}
                            <div 
                                className="flex-fill"
                                style={{cursor: 'pointer', width: '50%'}}
                                onClick={() => handleImageClick(0)}
                            >
                                <img 
                                    src={reviewInfo.image[0].src || reviewInfo.image[0]}
                                    alt="Review 1"
                                    className="w-100 h-100 object-fit-cover rounded border"
                                />
                            </div>
                            {/* Other 2 images - share remaining 50% width, stacked vertically with EQUAL heights */}
                            <div className="d-flex flex-column gap-1" style={{width: '50%'}}>
                                {reviewInfo.image.slice(1, 3).map((image, index) => (
                                    <div 
                                        key={index + 1}
                                        style={{
                                            cursor: 'pointer',
                                            height: '73px', // (150px - 1px gap) / 2 = 74.5px ≈ 73px each
                                            flex: '0 0 auto'
                                        }}
                                        onClick={() => handleImageClick(index + 1)}
                                    >
                                        <img 
                                            src={image.src || image}
                                            alt={`Review ${index + 2}`}
                                            className="w-100 h-100 object-fit-cover rounded border"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* Carousel Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                <Modal.Header closeButton style={{backgroundColor: '#f8f9fa'}}>
                    <Modal.Title>Review Photos ({currentImageIndex + 1}/{reviewInfo.image.length})</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0 position-relative" style={{backgroundColor: '#000'}}>
                    {reviewInfo.image.length > 0 && (
                        <>
                            <img 
                                src={reviewInfo.image[currentImageIndex].src || reviewInfo.image[currentImageIndex]}
                                alt={`Review ${currentImageIndex + 1}`}
                                className="w-100 h-auto d-block mx-auto"
                                style={{maxHeight: '70vh', objectFit: 'contain'}}
                            />
                            
                            {reviewInfo.image.length > 1 && (
                                <>
                                    <button 
                                        className="btn btn-light position-absolute top-50 start-0 translate-middle-y ms-3"
                                        style={{zIndex: 1050}}
                                        onClick={prevImage}
                                    >
                                        &#8249;
                                    </button>
                                    <button 
                                        className="btn btn-light position-absolute top-50 end-0 translate-middle-y me-3"
                                        style={{zIndex: 1050}}
                                        onClick={nextImage}
                                    >
                                        &#8250;
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer style={{backgroundColor: '#f8f9fa'}}>
                    <div className="d-flex gap-1 justify-content-center w-100">
                        {reviewInfo.image.map((_, index) => (
                            <button
                                key={index}
                                className={`btn btn-sm ${index === currentImageIndex ? 'btn-primary' : 'btn-outline-secondary'}`}
                                style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    padding: 0,
                                    backgroundColor: index === currentImageIndex ? '#BB3D25' : 'transparent',
                                    borderColor: '#BB3D25'
                                }}
                                onClick={() => setCurrentImageIndex(index)}
                            />
                        ))}
                    </div>
                </Modal.Footer>
            </Modal>

        </div>
    )
}


export default ReviewCard;