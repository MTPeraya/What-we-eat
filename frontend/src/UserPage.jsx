import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { config } from './config';
import { useAuth } from './hooks/useAuth';

// API function to fetch user history (supports cursor pagination; defaults to 20 most recent)
async function fetchUserHistory(limit = 20, cursor = null) {
    try {
        const qs = new URLSearchParams({ limit: String(limit) });
        if (cursor) qs.set('cursor', String(cursor));
        const res = await fetch(`${config.apiUrl}/api/me/history?${qs.toString()}`, { 
            credentials: "include" 
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        return {
            items: data.items || [],
            nextCursor: data.nextCursor ?? null
        };
    } catch (error) {
        console.error('Error fetching user history:', error);
        return { items: [], nextCursor: null };
    }
}


// Theme colors matching Ratings page
const THEME_COLORS = {
    background: "#FCEEE3",
    card: "#FFF7EF",
    border: "#C47B4E",
    accent: "#BB3D25",
    textPrimary: "#4A1F0C",
    textSecondary: "#7A4B31",
    accentDark: "#8A3A1A"
};

const customStyles = `
  .custom-placeholder::placeholder {
    color: ${THEME_COLORS.textSecondary} !important;
    font-style: italic;
    font-weight: 300;
    font-size: 16px;
    text-align: left !important;
    opacity: 0.7;
  }
  .custom-placeholder:focus::placeholder {
    color: ${THEME_COLORS.textSecondary} !important;
    font-size: 16px;
    text-align: left !important;
    opacity: 0.5;
  }
  .custom-placeholder:focus {
    outline: none;
    border-color: ${THEME_COLORS.border} !important;
    font-size: 16px;
    box-shadow: 0 0 0 2px rgba(196, 123, 78, 0.2);
  }
  .custom-placeholder {
    font-size: 16px;
    text-align: left !important;
    background-color: ${THEME_COLORS.card} !important;
    color: ${THEME_COLORS.textPrimary} !important;
    border-color: ${THEME_COLORS.border} !important;
  }
`;

const pen = (size="50px", color = THEME_COLORS.textPrimary) => {
    return (<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M15.4998 5.50067L18.3282 8.3291M13 21H21M3 21.0004L3.04745 20.6683C3.21536 19.4929 3.29932 18.9052 3.49029 18.3565C3.65975 17.8697 3.89124 17.4067 4.17906 16.979C4.50341 16.497 4.92319 16.0772 5.76274 15.2377L17.4107 3.58969C18.1918 2.80865 19.4581 2.80864 20.2392 3.58969C21.0202 4.37074 21.0202 5.63707 20.2392 6.41812L8.37744 18.2798C7.61579 19.0415 7.23497 19.4223 6.8012 19.7252C6.41618 19.994 6.00093 20.2167 5.56398 20.3887C5.07171 20.5824 4.54375 20.6889 3.48793 20.902L3 21.0004Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>)
}

const pageWrapper = {
    background: THEME_COLORS.background,
    minHeight: "100vh",
    padding: "4rem 0 5rem",
    width: "100vw",
    boxSizing: "border-box"
};

const ProfileHeader = ({ onBackClick }) => {
    return(
        <div className="w-100 bg-transparent d-flex justify-content-between align-items-center px-3" style={{height:"10vh"}}>
            <button 
                type="button" 
                onClick={onBackClick} 
                className="btn d-flex align-items-center gap-2"
                style={{
                    backgroundColor: 'transparent',
                    border: `2px solid ${THEME_COLORS.border}`,
                    borderRadius: '999px',
                    padding: '0.65rem 1.4rem',
                    color: THEME_COLORS.textPrimary,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = THEME_COLORS.card;
                    e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={THEME_COLORS.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                <span style={{color: THEME_COLORS.textPrimary, fontWeight: 600}}>Back</span>
            </button>
        </div>
    )
}

function WhiteBorder({ children }){
    return (
        <div 
            className="w-75 mb-3"
            style={{
                background: THEME_COLORS.card,
                borderRadius: "26px",
                border: `2px solid ${THEME_COLORS.border}`,
                boxShadow: "0 25px 55px rgba(68,29,8,.12)",
                padding: "2rem"
            }}
        >
            {children}
        </div>
    )
}

function ChangeProfile({ placeholder = "Enter value...", value = "", name = "", onChange = () => {}, pattern=".+", noSpaces = false, max="30" }){
    const inputStyle = {
        backgroundColor: THEME_COLORS.card,
        color: THEME_COLORS.textPrimary,
        borderColor: THEME_COLORS.border,
        textAlign: 'left',
        width: '500px',
        borderRadius: '14px',
        padding: '0.75rem 1rem'
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
    disabled = false,
}) => {
    return (
        <button 
            className="btn w-75 text-start fs-4 mb-2" 
            onClick={onClick}
            disabled={disabled}
            style={{
                background: THEME_COLORS.card,
                border: `2px solid ${THEME_COLORS.border}`,
                borderRadius: "18px",
                color: THEME_COLORS.textPrimary,
                fontWeight: 600,
                boxShadow: "0 12px 25px rgba(68,29,8,.08)",
                transition: "all 0.2s ease",
                padding: "1rem 1.5rem"
            }}
            onMouseEnter={(e) => {
                if (!disabled) {
                    e.currentTarget.style.backgroundColor = THEME_COLORS.background;
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = "0 15px 30px rgba(68,29,8,.15)";
                }
            }}
            onMouseLeave={(e) => {
                if (!disabled) {
                    e.currentTarget.style.backgroundColor = THEME_COLORS.card;
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = "0 12px 25px rgba(68,29,8,.08)";
                }
            }}
        >
            &ensp;{name}
        </button>
    );
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
    onProfilePicClick,
    IsMobile
}) {
    return (
    <div className={`d-flex align-items-center mx-5 my-3 flex-wrap ${IsMobile? "justify-content-center": ""}`}>
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
                    transition: 'all 0.2s ease',
                    border: `3px solid ${THEME_COLORS.border}`,
                    boxShadow: "0 12px 25px rgba(68,29,8,.15)"
                }}
                onClick={onProfilePicClick}
                onMouseEnter={(e) => {
                    e.target.style.filter = 'brightness(0.9)';
                    e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                    e.target.style.filter = 'brightness(1)';
                    e.target.style.transform = 'scale(1)';
                }}
            />
            <div 
                className="position-absolute top-50 start-50 translate-middle text-center"
                style={{
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                    pointerEvents: 'none',
                    color: THEME_COLORS.textPrimary,
                    fontSize: '14px',
                    fontWeight: 'bold',
                    backgroundColor: THEME_COLORS.card,
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: `2px solid ${THEME_COLORS.border}`,
                    boxShadow: "0 8px 16px rgba(68,29,8,.2)"
                }}
                onMouseEnter={(e) => e.target.style.opacity = 1}
            >
                Click to change<br/>profile picture
            </div>
        </div>
        <div>
            <div className="d-flex flex-column">
                <div className="d-flex align-items-center">
                    <h1 style={{color: THEME_COLORS.textPrimary, margin: 0}}>{displayName}</h1>
                    {!isEditing && (
                        <button 
                            className="btn btn-link p-1 ms-2" 
                            onClick={HandleEditClick}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                padding: '4px 8px',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = THEME_COLORS.background;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            {pen("25px", THEME_COLORS.textPrimary)}
                        </button>
                    )}
                </div>
                <p style={{color: THEME_COLORS.textSecondary, margin: '0.5rem 0'}}>@{username}</p>
            </div>

            {isEditing && (
                <div style={{marginTop: '1rem'}}>
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
                    <div className="d-flex gap-2 mt-3">
                        <button 
                            className="btn btn-sm" 
                            onClick={HandleSaveClick}
                            style={{
                                background: THEME_COLORS.accent,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '14px',
                                padding: '0.5rem 1.5rem',
                                fontWeight: 600,
                                boxShadow: "0 8px 16px rgba(187,61,37,.25)",
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.boxShadow = "0 12px 20px rgba(187,61,37,.35)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = "0 8px 16px rgba(187,61,37,.25)";
                            }}
                        >
                            Save
                        </button>
                        <button 
                            className="btn btn-sm" 
                            onClick={HandleCancelClick}
                            style={{
                                background: THEME_COLORS.card,
                                color: THEME_COLORS.textPrimary,
                                border: `2px solid ${THEME_COLORS.border}`,
                                borderRadius: '14px',
                                padding: '0.5rem 1.5rem',
                                fontWeight: 600,
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = THEME_COLORS.background;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = THEME_COLORS.card;
                            }}
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
    reviewUrl="",
    isMobile = false
    ) => {
    const linkStyle = {
        color: THEME_COLORS.accent,
        textDecoration: "none",
        fontWeight: 600,
        transition: "all 0.2s ease"
    };
    
    return(
        <div 
            className={`d-flex justify-content-between py-2 m-2 w-100 ${isMobile? "ps-2": "px-4"}`} 
            style={{
                background: THEME_COLORS.card,
                border: `2px solid ${THEME_COLORS.border}`,
                borderRadius: "18px",
                boxShadow: "0 8px 16px rgba(68,29,8,.08)",
                transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 12px 24px rgba(68,29,8,.12)";
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(68,29,8,.08)";
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            {isMobile? 
            <>
                <div className="d-flex flex-column w-100">
                   <a 
                       href={locationUrl} 
                       style={linkStyle}
                       onMouseEnter={(e) => {
                           e.target.style.color = THEME_COLORS.accentDark;
                           e.target.style.textDecoration = "underline";
                       }}
                       onMouseLeave={(e) => {
                           e.target.style.color = THEME_COLORS.accent;
                           e.target.style.textDecoration = "none";
                       }}
                   >
                       <h3 className="my-0" style={{color: THEME_COLORS.textPrimary}}>{restaurant}</h3>
                   </a>
                    <div className="d-flex justify-content-between px-1 mt-1">
                        <a 
                            href={reviewUrl} 
                            style={linkStyle}
                            onMouseEnter={(e) => {
                                e.target.style.color = THEME_COLORS.accentDark;
                                e.target.style.textDecoration = "underline";
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.color = THEME_COLORS.accent;
                                e.target.style.textDecoration = "none";
                            }}
                        >
                            reviews
                        </a>
                        <p className="my-0" style={{color: THEME_COLORS.textSecondary}}>{date}</p>
                    </div>
                   
                </div>
            </> 
            :<>
            <div className="d-flex flex-column">
                <h3 className="my-0" style={{color: THEME_COLORS.textPrimary}}>{restaurant}</h3>
                <p className="my-0 mt-1">
                    <a 
                        href={locationUrl} 
                        style={linkStyle}
                        onMouseEnter={(e) => {
                            e.target.style.color = THEME_COLORS.accentDark;
                            e.target.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.color = THEME_COLORS.accent;
                            e.target.style.textDecoration = "none";
                        }}
                    >
                        location
                    </a>
                </p>
            </div>
            <div className="d-flex flex-column">
                <h3 className="my-0">
                    <a 
                        href={reviewUrl} 
                        style={linkStyle}
                        onMouseEnter={(e) => {
                            e.target.style.color = THEME_COLORS.accentDark;
                            e.target.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.color = THEME_COLORS.accent;
                            e.target.style.textDecoration = "none";
                        }}
                    >
                        reviews
                    </a>
                </h3>
                <p className="my-0 mt-1" style={{color: THEME_COLORS.textSecondary}}>{date}</p>
            </div>
            </>}

        </div>
    )
}

function History({ 
    userHistory = [], 
    NoRepeat = false, 
    handleNoRepeatToggle = () => {},
    isLoadingHistory = false,
    isMobile = false
}){
    return (
        <div className="d-flex flex-column align-items-center" style={{width: "100%"}}>
            <div className="d-flex justify-content-between align-items-center px-3 pt-2 mb-3" style={{width:"100%"}}>
                <h2 style={{color: THEME_COLORS.textPrimary, margin: 0}}>History</h2>
                <div className="form-check form-switch d-flex align-items-center gap-2" title="no-repeat">
                    <label 
                        className="form-check-label" 
                        htmlFor="flexSwitchCheckDefault"
                        title="no-repeat"
                        style={{color: THEME_COLORS.textSecondary, fontWeight: 500, margin: 0}}
                    >
                        no-repeat
                    </label>
                    <input 
                        className="form-check-input" 
                        type="checkbox" 
                        role="switch" 
                        id="flexSwitchCheckDefault"
                        checked={NoRepeat}
                        onChange={(e) => handleNoRepeatToggle(e.target.checked)}
                        title="the restaurant you ate recently will not be offered"
                        style={{
                            width: "3rem",
                            height: "1.5rem",
                            cursor: "pointer",
                            backgroundColor: NoRepeat ? THEME_COLORS.accent : THEME_COLORS.border,
                            borderColor: THEME_COLORS.border
                        }}
                    />
                </div>
            </div>
            <div 
                className="w-100"
                style={{
                    background: THEME_COLORS.card,
                    borderRadius: "26px",
                    border: `2px solid ${THEME_COLORS.border}`,
                    boxShadow: "0 25px 55px rgba(68,29,8,.12)",
                    padding: "2rem"
                }}
            >
                <div className="d-flex flex-column" style={{width:"100%"}}>
                    {isLoadingHistory ? (
                        <div className="text-center p-4">
                            <div className="spinner-border" role="status" style={{color: THEME_COLORS.accent}}>
                                <span className="visually-hidden">Loading history...</span>
                            </div>
                            <p className="mt-2" style={{color: THEME_COLORS.textSecondary}}>Loading your history...</p>
                        </div>
                    ) : userHistory.length > 0 ? (
                        userHistory.map((item, index) => (
                            <div key={index}>
                                {HistoryBlock(
                                    item.restaurant,
                                    item.locationUrl,
                                    item.date,
                                    item.reviewUrl,
                                    isMobile
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-4">
                            <p style={{color: THEME_COLORS.textSecondary}}>No history found. Start exploring restaurants to build your history!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}


function UserPage(){
    const navigate = useNavigate();
    const { refreshAuth } = useAuth();

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
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth <= 768;
        setIsMobile(mobile);
        // console.log('isMobile ->', mobile, 'innerWidth ->', window.innerWidth);
    };
    window.addEventListener('resize', handleResize);

    // ensure state is correct on mount (and handle cases where initial render used a stale value)
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
}, []);

    // Back button handler
    const handleBackClick = () => {
        navigate('/');
    };

    // Fetch user profile on component mount
    useEffect(() => {
        const loadUserProfile = async () => {
            setIsLoadingUser(true);
            try {
                const res = await fetch(`${config.endpoints.auth}/me`, {
                    credentials: 'include'
                });
                
                if (res.ok) {
                    const data = await res.json();
                    const user = data.user;
                    
                    if (user) {
                        setUsername(user.username || 'defaultuser');
                        setDisplayName(user.displayName || user.username || 'Default User');
                        setProfilePic(user.profilePicture || '/placeholderProfile.png');
                        
                        // Set temp values too
                        setTempUsername(user.username || 'defaultuser');
                        setTempDisplayName(user.displayName || user.username || 'Default User');
                    }
                }
            } catch (error) {
                console.error('Failed to load user profile:', error);
            } finally {
                setIsLoadingUser(false);
            }
        };

        loadUserProfile();
    }, []);

    // Fetch user history on component mount
    useEffect(() => {
        const loadUserHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const { items } = await fetchUserHistory(20); // Fetch up to 20 most recent
                
                // Transform API data to match your component structure
                const transformedHistory = items.map(item => {
                    const restaurant = item.restaurant;
                    
                    // Create Google Maps URL
                    const locationUrl = restaurant?.lat && restaurant?.lng
                        ? `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`
                        : '';
                    
                    // Create review URL (navigate to rating page)
                    const reviewUrl = restaurant?.id 
                        ? `/rating/${restaurant.id}`
                        : '';
                    
                    return {
                        id: item.id,
                        restaurantId: restaurant?.id ?? null,
                        restaurant: restaurant?.name || 'Unknown Restaurant',
                        locationUrl,
                        date: item.decidedAt ? new Date(item.decidedAt).toLocaleDateString() : new Date().toLocaleDateString(),
                        reviewUrl
                    };
                });
                
                setUserHistory(transformedHistory);
                // We keep nextCursor unused as we cap at 20 on first load
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

    const handleLoadMoreHistory = () => {
        setShowAllHistory(true);
    };

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

    const HandleSaveClick = async () => {
        const finalDisplayName = tempDisplayName.trim() || displayName;
        const finalUsername = tempUsername.trim() || username;

        try {
            const response = await fetch(`${config.endpoints.auth}/profile`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: finalUsername !== username ? finalUsername : undefined,
                    displayName: finalDisplayName !== displayName ? finalDisplayName : undefined
                })
            });

            if (!response.ok) {
                const error = await response.json();
                if (error.error === 'USERNAME_TAKEN') {
                    alert('Username is already taken. Please choose another one.');
                } else {
                    alert(`Failed to update profile: ${error.error || 'Unknown error'}`);
                }
                return;
            }

            const data = await response.json();
            console.log('Profile updated successfully:', data);

            // Update local state with saved values
            setDisplayName(finalDisplayName);
            setUsername(finalUsername);
            setIsEditing(false);
            
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        }
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

    const handleCropperSave = async (croppedImageUrl, croppedBlob) => {
        try {
            console.log('[UserPage] Uploading profile picture...');
            
            // Step 1: Get presigned URL
            const presignRes = await fetch(`${config.endpoints.uploads}/presign`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mime: 'image/jpeg'
                })
            });

            if (!presignRes.ok) {
                throw new Error('Failed to get presigned URL');
            }

            const presignData = await presignRes.json();
            const { uploadUrl, key, publicUrl } = presignData;

            // Step 2: Upload to storage
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: croppedBlob,
                headers: {
                    'Content-Type': 'image/jpeg'
                },
                credentials: 'include'
            });

            if (!uploadRes.ok) {
                throw new Error('Failed to upload image');
            }

            const uploadData = await uploadRes.json();
            // For small files (< 500KB), base64Data is returned for direct database storage
            // For larger files, only URL is returned
            const profilePictureValue = uploadData.base64Data || publicUrl;

            console.log('[UserPage] Image uploaded:', key, uploadData.base64Data ? '(with base64)' : '(URL only)');

            // Step 3: Update user profile with base64Data (if available) or URL
            const updateRes = await fetch(`${config.endpoints.auth}/profile`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profilePicture: profilePictureValue
                })
            });

            if (!updateRes.ok) {
                throw new Error('Failed to update profile picture');
            }

            console.log('[UserPage] Profile picture updated successfully');
            
            // Update local state (use base64Data if available, otherwise use URL)
            setProfilePic(profilePictureValue);
            setShowCropper(false);
            setSelectedImageFile(null);
            
            alert('Profile picture updated successfully!');
        } catch (error) {
            console.error('[UserPage] Error uploading profile picture:', error);
            alert('Failed to upload profile picture. Please try again.');
            
            // Still close cropper but don't update picture
            setShowCropper(false);
            setSelectedImageFile(null);
        }
    };

    const handleCropperClose = () => {
        setShowCropper(false);
        setSelectedImageFile(null);
    };

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            const res = await fetch(`${config.endpoints.auth}/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!res.ok) {
                throw new Error('Failed to logout');
            }
            if (typeof refreshAuth === 'function') {
                await refreshAuth();
            }
            navigate('/login');
        } catch (error) {
            console.error('[UserPage] Failed to logout:', error);
            alert('Failed to logout. Please try again.');
        } finally {
            setIsLoggingOut(false);
        }
    };

    // UserProfile is no longer defined here

    return(
        <>
            <style>{customStyles}</style>
            <section className="position-relative d-flex flex-column align-items-center" style={pageWrapper}>
                <div style={{maxWidth: "1200px", width: "100%", padding: "0 1.5rem"}}>
                    <ProfileHeader onBackClick={handleBackClick} />
                    {isLoadingUser ? (
                        <div 
                            className="w-100"
                            style={{
                                background: THEME_COLORS.card,
                                borderRadius: "26px",
                                border: `2px solid ${THEME_COLORS.border}`,
                                boxShadow: "0 25px 55px rgba(68,29,8,.12)",
                                padding: "3rem"
                            }}
                        >
                            <div className="text-center p-5">
                                <div className="spinner-border" role="status" style={{color: THEME_COLORS.accent}}>
                                    <span className="visually-hidden">Loading profile...</span>
                                </div>
                                <p className="mt-3" style={{color: THEME_COLORS.textSecondary}}>Loading your profile...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div 
                                className="w-100 mb-4"
                                style={{
                                    background: THEME_COLORS.card,
                                    borderRadius: "26px",
                                    border: `2px solid ${THEME_COLORS.border}`,
                                    boxShadow: "0 25px 55px rgba(68,29,8,.12)",
                                    padding: "2rem"
                                }}
                            >
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
                                    IsMobile={isMobile}
                                />
                            </div>
                            <div className="d-flex flex-column align-items-center mb-4" style={{width: "100%"}}>
                                <JustButton name="Account Management" onClick={HandleEditClick}/>
                                <JustButton name="Manage Post"/>
                                <JustButton 
                                    name={isLoggingOut ? "Logging out..." : "Logout"} 
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                />
                            </div>

                            <History 
                                userHistory={(function getDisplayHistory() {
                                    // Apply no-repeat first
                                    const baseList = (function filterNoRepeat(list) {
                                        if (!NoRepeat) return list;
                                        const seen = new Set();
                                        const out = [];
                                        for (const item of list) {
                                            const key = item.restaurantId ?? `name:${item.restaurant}`;
                                            if (seen.has(key)) continue;
                                            seen.add(key);
                                            out.push(item);
                                        }
                                        return out;
                                    })(userHistory);

                                    // Then limit initial view to 5 until "Load more"
                                    return showAllHistory ? baseList : baseList.slice(0, 5);
                                })()}
                                NoRepeat={NoRepeat}
                                handleNoRepeatToggle={handleNoRepeatToggle}
                                isLoadingHistory={isLoadingHistory}
                                isMobile = {isMobile}
                            />
                            {!showAllHistory && (function hasMore() {
                                const base = (function filterNoRepeat(list){
                                    if (!NoRepeat) return list;
                                    const s = new Set(); const out = [];
                                    for (const i of list) { const k = i.restaurantId ?? `name:${i.restaurant}`; if (s.has(k)) continue; s.add(k); out.push(i); }
                                    return out;
                                })(userHistory);
                                return base.length > 5;
                            })() && (
                                <div className="text-center mb-3 mt-3">
                                    <button 
                                        className="btn"
                                        onClick={handleLoadMoreHistory}
                                        style={{
                                            background: THEME_COLORS.accent,
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '999px',
                                            padding: '0.65rem 1.4rem',
                                            fontWeight: 600,
                                            boxShadow: "0 12px 25px rgba(187,61,37,.25)",
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                            e.currentTarget.style.boxShadow = "0 15px 30px rgba(187,61,37,.35)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                            e.currentTarget.style.boxShadow = "0 12px 25px rgba(187,61,37,.25)";
                                        }}
                                    >
                                        Show all
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
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