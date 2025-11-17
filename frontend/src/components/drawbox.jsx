import React, { useState } from 'react';


const txtcolor = "#603A2B"

const locationPin = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20"><path fill={txtcolor} d="M10 20S3 10.87 3 7a7 7 0 1 1 14 0c0 3.87-7 13-7 13zm0-11a2 2 0 1 0 0-4a2 2 0 0 0 0 4z"/></svg>

function DrawBox({
    icon,
    bcolor = "red",
    b2color = "red",
    imgUrl = "/restaurant/restaurant1.jpg",
    km = 0,
    name = "R1",
    onClick,
    disabled = false,
    horizontal = false,
    smallIcon = null,
    smallColor = "#BB3D25",
    smallColor2 = "#B33821",
    onSmallClick
}){

    const [isHovered, setIsHovered] = useState(false);
    const [isSmallHovered, setIsSmallHovered] = useState(false);

    const imageBox = (
        <div className={horizontal ? 'ratio ratio-1x1 rounded shadow-sm' : 'card ratio ratio-1x1 rounded shadow-sm w-100'} 
            style={{
                width: horizontal ? "clamp(120px, 28vw, 160px)" : undefined,
                maxWidth: horizontal ? undefined : "320px",
                aspectRatio: "1 / 1",
                alignSelf: horizontal ? undefined : "center"
            }}>
            <img className="ratio ratio-1x1 object-fit-cover rounded text-bg-dark card-img" src={imgUrl} alt={name}/>
        </div>
    );

    const textBox = (
        <div className={horizontal ? "px-3 flex-grow-1" : "px-2"} style={{color: txtcolor}}>
            <h5 style={{margin: 0, fontSize: "clamp(0.9rem, 1.6vw, 1.1rem)"}}>{locationPin} {km} Km away</h5>
            <h1 style={{fontSize: "clamp(1.25rem, 2.4vw, 1.75rem)", lineHeight: 1.2}}>{name}</h1>
        </div>
    );

    return(
        <div className={horizontal ? "d-flex align-items-center w-100" : "d-flex flex-column h-100"} style={{maxWidth: horizontal ? "720px" : "340px", width: "100%"}}>
            {horizontal ? (
                <>
                    {imageBox}
                    {textBox}
                    {smallIcon && (
                        <button
                            onMouseEnter={() => setIsSmallHovered(true)}
                            onMouseLeave={() => setIsSmallHovered(false)}
                            onClick={onSmallClick}
                            type="button"
                            className="btn btn-primary rounded-circle shadow"
                            style={{
                                height: "clamp(44px, 10vw, 64px)",
                                aspectRatio: "1 / 1",
                                backgroundColor: isSmallHovered ? smallColor2 : smallColor,
                                borderColor: isSmallHovered ? smallColor2 : smallColor
                            }}
                        >
                            {smallIcon}
                        </button>
                    )}
                </>
            ) : (
                <>
                    {imageBox}
                    {textBox}
                    <div className="mt-auto d-flex justify-content-center w-100">
                        <button
                            onMouseEnter={() => !disabled && setIsHovered(true)} 
                            onMouseLeave={() => setIsHovered(false)}
                            onClick={disabled ? undefined : onClick}
                            disabled={disabled}
                            type="button" 
                            className="btn btn-primary rounded-circle shadow" 
                            style={{
                                height:"clamp(72px, 18vw, 110px)", 
                                aspectRatio: "1 / 1", 
                                backgroundColor: disabled ? '#ccc' : (isHovered ? b2color : bcolor), 
                                borderColor: disabled ? '#ccc' : (isHovered ? b2color : bcolor),
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                opacity: disabled ? 0.6 : 1
                            }}>
                            {icon}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

export default DrawBox