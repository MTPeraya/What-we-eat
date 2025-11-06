import React, { useState, useEffect, useRef, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

// API function to fetch user history (limited to 3 most recent)
async function fetchUserHistory(limit = 3) {
    try {
        const qs = new URLSearchParams({ limit: String(limit) });
        const res = await fetch(`/api/me/history?${qs.toString()}`, { 
            credentials: "include" 
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        return data.items || [];
    } catch (error) {
        console.error('Error fetching user history:', error);
        return [];
    }
}


const customStyles = `
  .custom-placeholder::placeholder {
    color: rgba(255, 255, 255, 0.6) !important;
    font-style: italic;
    font-weight: 300;
    font-size: 16px;
    text-align: left !important;
  }
  .custom-placeholder:focus::placeholder {
    color: rgba(255, 255, 255, 0.4) !important;
    font-size: 16px;
    text-align: left !important;
  }
  .custom-placeholder:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.8) !important;
    font-size: 16px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
  }
  .custom-placeholder {
  font-size: 16px;
    text-align: left !important;
  }
`;

const pen = (size="50px") => {
    return (<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M15.4998 5.50067L18.3282 8.3291M13 21H21M3 21.0004L3.04745 20.6683C3.21536 19.4929 3.29932 18.9052 3.49029 18.3565C3.65975 17.8697 3.89124 17.4067 4.17906 16.979C4.50341 16.497 4.92319 16.0772 5.76274 15.2377L17.4107 3.58969C18.1918 2.80865 19.4581 2.80864 20.2392 3.58969C21.0202 4.37074 21.0202 5.63707 20.2392 6.41812L8.37744 18.2798C7.61579 19.0415 7.23497 19.4223 6.8012 19.7252C6.41618 19.994 6.00093 20.2167 5.56398 20.3887C5.07171 20.5824 4.54375 20.6889 3.48793 20.902L3 21.0004Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>)
}

const gradient = {
    height: "100vh",
    width: "100vw",
    background: 'linear-gradient(45deg, rgba(196, 112, 90, 1) 24%, rgba(225, 152, 132, 1) 75%)',
    minHeight: "100vh",
    color: "white"
};

const Header = (Onclick = () => {}) => {
    return(
        <div className="w-100 bg-transparent" style={{height:"10vh"}}>
            <button type="button" Onclick = {Onclick} className="bg-transparent">
                <svg xmlns="http://www.w3.org/2000/svg" width="50px" height="50px" viewBox="0 0 24 24" fill="none">
                <path d="M19 5L5 19M5.00001 5L19 19" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
        </button>
            
        </div>
    )
}

function WhiteBorder({ children }){
    return (<div className="border border-2 rounded-3 w-75 mb-3">
        {children}
    </div>)
}

function ChangeProfile({ placeholder = "Enter value...", value = "", name = "", onChange = () => {}, pattern=".+", noSpaces = false, max="30" }){
    const inputStyle = {
        backgroundColor: 'transparent !important',
        color: 'white !important',
        borderColor: 'rgba(255, 255, 255, 0.3) !important',
        textAlign: 'left',
        width: '500px' // Set custom width
    };

    // Prevent non-alphanumeric characters if noSpaces is true
    const handleKeyDown = (e) => {
        if (noSpaces) {
            // Allow control keys (backspace, delete, arrows, etc.)
            const controlKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab'];
            
            // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X (copy/paste operations)
            if (e.ctrlKey || e.metaKey) {
                return; // Allow all Ctrl/Cmd combinations
            }
            
            // If it's not a control key and not alphanumeric or underscore, prevent it
            if (!controlKeys.includes(e.key) && !/^[a-zA-Z0-9_]$/.test(e.key)) {
                e.preventDefault();
            }
        }
    };

    return(
        <input 
            className="mb-2 custom-placeholder form-control form-control-sm bg-transparent text-light" 
            type="text" 
            placeholder={placeholder}
            style={inputStyle}
            value={value}
            name={name}
            maxLength={max}
            pattern={pattern}
            onChange={(e) => onChange(name, e.target.value)}
            onKeyDown={handleKeyDown}
        />
    )
}

const JustButton = ({
    name = "feature",
    onClick = () => console.log("Button clicked!"),
}) => {
    return <button className={`btn btn-outline-light w-75 text-start fs-4 px-3 mb-2`} onClick={onClick}>&ensp;{name}</button>
}

// Profile Picture Cropper Modal Component
function ProfilePictureCropper({ 
    isOpen, 
    onClose, 
    onSave, 
    imageFile 
}) {
    const [cropData, setCropData] = useState({
        x: 50,
        y: 50,
        size: 200
    });
    const [imageSrc, setImageSrc] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const imageRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (imageFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImageSrc(e.target.result);
                // Reset crop position when new image loads
                setCropData({
                    x: 50,
                    y: 50,
                    size: 200
                });
            };
            reader.readAsDataURL(imageFile);
        }
    }, [imageFile]);

    const handleImageLoad = (e) => {
        const { width, height } = e.target.getBoundingClientRect();
        setImageSize({ width, height });
        
        // Set crop size to the shortest side of the image (with small margin for better UX)
        const cropSize = Math.min(width, height) * 0.95; // 95% of shortest side
        setCropData({
            x: (width - cropSize) / 2,
            y: (height - cropSize) / 2,
            size: cropSize
        });
    };

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
        const rect = containerRef.current.getBoundingClientRect();
        setDragStart({
            x: e.clientX - rect.left - cropData.x,
            y: e.clientY - rect.top - cropData.y
        });
    }, [cropData.x, cropData.y]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging || !containerRef.current) return;
        
        e.preventDefault();
        const rect = containerRef.current.getBoundingClientRect();
        const newX = Math.max(0, Math.min(
            e.clientX - rect.left - dragStart.x, 
            imageSize.width - cropData.size
        ));
        const newY = Math.max(0, Math.min(
            e.clientY - rect.top - dragStart.y, 
            imageSize.height - cropData.size
        ));
        
        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
            setCropData(prev => ({
                ...prev,
                x: newX,
                y: newY
            }));
        });
    }, [isDragging, dragStart.x, dragStart.y, imageSize, cropData.size]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add global event listeners for smooth dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const cropImage = async () => {
        if (!imageSrc || !imageRef.current) return null;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        return new Promise((resolve) => {
            img.onload = () => {
                // Set final output size
                canvas.width = 200;
                canvas.height = 200;
                
                // Calculate scale factors
                const displayedImage = imageRef.current.getBoundingClientRect();
                const scaleX = img.naturalWidth / displayedImage.width;
                const scaleY = img.naturalHeight / displayedImage.height;
                
                // Calculate crop coordinates in original image
                const cropX = cropData.x * scaleX;
                const cropY = cropData.y * scaleY;
                const cropSize = cropData.size * Math.min(scaleX, scaleY);
                
                // Draw cropped and resized image
                ctx.drawImage(
                    img,
                    cropX,
                    cropY,
                    cropSize,
                    cropSize,
                    0,
                    0,
                    200,
                    200
                );
                
                canvas.toBlob(resolve, 'image/jpeg', 0.95);
            };
            img.src = imageSrc;
        });
    };

    const handleSave = async () => {
        const croppedBlob = await cropImage();
        if (croppedBlob) {
            const croppedUrl = URL.createObjectURL(croppedBlob);
            onSave(croppedUrl, croppedBlob); // Pass both URL and blob
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content bg-dark text-light">
                    <div className="modal-header border-secondary">
                        <h5 className="modal-title">Crop Profile Picture</h5>
                        <button 
                            type="button" 
                            className="btn-close btn-close-white" 
                            onClick={onClose}
                        ></button>
                    </div>
                    <div className="modal-body text-center">
                        {imageSrc && (
                            <div 
                                ref={containerRef}
                                className="position-relative d-inline-block"
                                style={{ maxWidth: '100%', maxHeight: '500px' }}
                            >
                                <img 
                                    ref={imageRef}
                                    src={imageSrc} 
                                    alt="Crop preview" 
                                    className="img-fluid"
                                    style={{ maxHeight: '500px', userSelect: 'none' }}
                                    draggable={false}
                                    onLoad={handleImageLoad}
                                />
                                {/* Dark overlay - behind crop area */}
                                <div 
                                    className="position-absolute"
                                    style={{
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        backgroundColor: 'rgba(0,0,0,0.6)',
                                        pointerEvents: 'none'
                                    }}
                                />
                                
                                {/* Clear crop area - cuts through overlay */}
                                <div
                                    className="position-absolute border border-2 border-light"
                                    style={{
                                        left: cropData.x,
                                        top: cropData.y,
                                        width: cropData.size,
                                        height: cropData.size,
                                        cursor: isDragging ? 'grabbing' : 'grab',
                                        backgroundColor: 'transparent',
                                        boxShadow: `0 0 0 2000px rgba(0,0,0,0.6)`,
                                        borderRadius: '50%'
                                    }}
                                    onMouseDown={handleMouseDown}
                                >
                                    <div className="position-absolute top-50 start-50 translate-middle text-center text-light small fw-bold" style={{pointerEvents: 'none'}}>
                                        <div style={{
                                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                            backgroundColor: 'rgba(0,0,0,0.5)',
                                            padding: '2px 6px',
                                            borderRadius: '4px'
                                        }}>
                                            Drag to crop
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <p className="mt-3 text-muted">
                            Drag the selection box to crop your image. The final image will be 200x200 pixels.
                        </p>
                    </div>
                    <div className="modal-footer border-secondary">
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-primary" 
                            onClick={handleSave}
                        >
                            Save Profile Picture
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function UserProfile({ 
    profilePic, 
    displayName, 
    username, 
    isEditing, 
    HandleEditClick,
    tempDisplayName,
    tempUsername,
    handleInputChange,
    HandleSaveClick,
    HandleCancelClick,
    onProfilePicClick
}) {
    return (
    <div className="d-flex align-items-center mx-5 my-3">
        <div className="me-3 position-relative">
            <img
                src={profilePic}
                alt="Profile"
                className="rounded-circle"
                style={{
                    width: '200px', 
                    height: '200px', 
                    objectFit: 'cover',
                    cursor: 'pointer',
                    transition: 'filter 0.2s ease'
                }}
                onClick={onProfilePicClick}
                onMouseEnter={(e) => e.target.style.filter = 'brightness(0.8)'}
                onMouseLeave={(e) => e.target.style.filter = 'brightness(1)'}
            />
            <div 
                className="position-absolute top-50 start-50 translate-middle text-center"
                style={{
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                    pointerEvents: 'none',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                }}
                onMouseEnter={(e) => e.target.style.opacity = 1}
            >
                Click to change<br/>profile picture
            </div>
        </div>
        <div>
            <div className="d-flex flex-column">
                <div className="d-flex align-items-center">
                    <h1>{displayName}</h1>
                    {!isEditing && (
                        <button 
                            className="btn btn-link text-light p-1 ms-2" 
                            onClick={HandleEditClick}
                            style={{border: 'none'}}
                        >
                            {pen("25px")}
                        </button>
                    )}
                </div>
                <p>@{username}</p>
            </div>

            {isEditing && (
                <div>
                    <ChangeProfile 
                        placeholder="display name" 
                        value={tempDisplayName}
                        name="displayName"
                        onChange={handleInputChange}
                    />
                    <ChangeProfile 
                        placeholder="username" 
                        value={tempUsername}
                        name="username"
                        onChange={handleInputChange}
                        pattern="[a-zA-Z0-9_]+"
                        noSpaces={true}
                        max="20"
                    />
                    <div className="d-flex gap-2 mt-2">
                        <button 
                            className="btn btn-success btn-sm" 
                            onClick={HandleSaveClick}
                        >
                            Save
                        </button>
                        <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={HandleCancelClick}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>)
}

const HistoryBlock = (
    restaurant = "placeholder01",
    locationUrl = "",
    date = "xx/xx/xx",
    reviewUrl=""
    ) => {
    return(
        <div className="d-flex justify-content-between border border-2 rounded-3 justify-content-between px-5 py-1 m-2 w-100" style={{backgroundColor: "rgba(255, 255, 255, 0.2)"}}>
            <div className="d-flex flex-column">
                <h3 className="my-0">{restaurant}</h3>
                <p className="my-0">
                    <a href={locationUrl} style={{color: "white", textDecoration: "underline"}}>location</a>
                </p>
            </div>
            <div className="d-flex flex-column">
                <h3 className="my-0">
                    <a href={reviewUrl} style={{color: "white", textDecoration: "underline"}}>reviews</a>
                </h3>
                <p className="my-0">{date}</p>
            </div>

        </div>
    )
}

function History({ 
    userHistory = [], 
    NoRepeat = false, 
    handleNoRepeatToggle = () => {},
    isLoadingHistory = false
}){
    return (<div className="d-flex flex-column align-items-center">
        <div className="d-flex justify-content-between align-items-center px-3 pt-2" style={{width:"100%"}}>
            <h2>History</h2>
            <div className="form-check form-switch" title="no-repeat">
                <input 
                    className="form-check-input" 
                    type="checkbox" 
                    role="switch" 
                    id="flexSwitchCheckDefault"
                    checked={NoRepeat}
                    onChange={(e) => handleNoRepeatToggle(e.target.checked)}
                    title="the restaurant you ate recently will not be offered"
                />
                <label 
                    className="form-check-label" 
                    htmlFor="flexSwitchCheckDefault"
                    title="no-repeat"
                >
                    no-repeat
                </label>
            </div>
        </div>
                <WhiteBorder>
        <div className="d-flex flex-column" style={{width:"98%"}}>
            {isLoadingHistory ? (
                <div className="text-center p-4">
                    <div className="spinner-border text-light" role="status">
                        <span className="visually-hidden">Loading history...</span>
                    </div>
                    <p className="mt-2">Loading your history...</p>
                </div>
            ) : userHistory.length > 0 ? (
                userHistory.map((item, index) => (
                    <div key={index}>
                        {HistoryBlock(item.restaurant, item.locationUrl, item.date, item.reviewUrl)}
                    </div>
                ))
            ) : (
                <div className="text-center p-4">
                    <p>No history found. Start exploring restaurants to build your history!</p>
                </div>
            )}
        </div></WhiteBorder>
    </div>)
}


function UserPage(){

    const [displayName, setDisplayName] = useState("Default User");
    const [username, setUsername] = useState("defaultuser")
    const [profilePic, setProfilePic] = useState("/placeholderProfile.png");

    const [tempDisplayName, setTempDisplayName] = useState(displayName);
    const [tempUsername, setTempUsername] = useState(username);
    const [isEditing, setIsEditing] = useState(false);

    const [NoRepeat, setNoRepeat] = useState(false);

    // Profile picture cropper states
    const [showCropper, setShowCropper] = useState(false);
    const [selectedImageFile, setSelectedImageFile] = useState(null);

    const [userHistory, setUserHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Fetch user history on component mount
    useEffect(() => {
        const loadUserHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const history = await fetchUserHistory(3); // Fetch 3 most recent
                
                // Transform API data to match your component structure
                const transformedHistory = history.map(item => ({
                    restaurant: item.restaurant?.name || item.restaurantName || 'Unknown Restaurant',
                    locationUrl: item.restaurant?.locationUrl || item.locationUrl || '',
                    date: item.date ? new Date(item.date).toLocaleDateString() : new Date().toLocaleDateString(),
                    reviewUrl: item.restaurant?.reviewUrl || item.reviewUrl || ''
                }));
                
                setUserHistory(transformedHistory);
            } catch (error) {
                console.error('Failed to load user history:', error);
                // Fallback to empty array or default data
                setUserHistory([]);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        loadUserHistory();
    }, []); // Empty dependency array means this runs once on mount

    const HandleEditClick = () =>{
        setTempDisplayName(displayName);
        setTempUsername(username);
        setIsEditing(true);
    };

    const HandleCancelClick = () =>{
        setTempDisplayName(displayName);
        setTempUsername(username);
        setIsEditing(false);
    }

    const HandleSaveClick = () =>{

        const finalDisplayName = tempDisplayName.trim()
        ? tempDisplayName   // Use new value if not blank
        : displayName;      // Revert to old value if blank

        const finalUsername = tempUsername.trim()
        ? tempUsername      // Use new value if not blank
        : username;

        setDisplayName(finalDisplayName);
        setUsername(finalUsername);
        setIsEditing(false);
    };

    const handleInputChange = (name, value) => {
        if (name === "displayName") {
            setTempDisplayName(value);
        } else if (name === "username") {
            setTempUsername(value); // No need to remove spaces - HTML prevents them
        }
    };

    const handleNoRepeatToggle = (isChecked) => {
        setNoRepeat(isChecked);
        
        // Add your custom functionality here
        if (isChecked) {
            console.log("No-repeat is ON");

        } else {
            console.log("No-repeat is OFF");
        }
    };

    // Profile picture handlers
    const handleProfilePicClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                setSelectedImageFile(file);
                setShowCropper(true);
            }
        };
        input.click();
    };

    const handleCropperSave = (croppedImageUrl) => {
        setProfilePic(croppedImageUrl);
        setShowCropper(false);
        setSelectedImageFile(null);
    };

    const handleCropperClose = () => {
        setShowCropper(false);
        setSelectedImageFile(null);
    };

    // UserProfile is no longer defined here

    return(
        <>
            <style>{customStyles}</style>
            <section className="position-relative p-3 d-flex flex-column align-items-center" style={gradient}>
                <Header/>
                <WhiteBorder>
                    <UserProfile
                        profilePic={profilePic}
                        displayName={displayName}
                        username={username}
                        isEditing={isEditing}
                        HandleEditClick={HandleEditClick}
                        tempDisplayName={tempDisplayName}
                        tempUsername={tempUsername}
                        handleInputChange={handleInputChange}
                        HandleSaveClick={HandleSaveClick}
                        HandleCancelClick={HandleCancelClick}
                        onProfilePicClick={handleProfilePicClick}
                    />
                </WhiteBorder>
                <JustButton name="Account Management"/>
                <JustButton name="Manage Post"/>

                <WhiteBorder>
                    <History 
                        userHistory={userHistory}
                        NoRepeat={NoRepeat}
                        handleNoRepeatToggle={handleNoRepeatToggle}
                        isLoadingHistory={isLoadingHistory}
                    />
                </WhiteBorder>
            </section>

            {/* Profile Picture Cropper Modal */}
            <ProfilePictureCropper
                isOpen={showCropper}
                onClose={handleCropperClose}
                onSave={handleCropperSave}
                imageFile={selectedImageFile}
            />
        </>
    )
}

export default UserPage;