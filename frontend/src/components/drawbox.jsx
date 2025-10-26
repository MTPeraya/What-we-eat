import React, { useState } from 'react';


const txtcolor = "#603A2B"

const locationPin = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20"><path fill={txtcolor} d="M10 20S3 10.87 3 7a7 7 0 1 1 14 0c0 3.87-7 13-7 13zm0-11a2 2 0 1 0 0-4a2 2 0 0 0 0 4z"/></svg>

function DrawBox({icon, bcolor="red", b2color="red", imgUrl = "/restaurant/restaurant1.jpg", km = 0, name = "R1", onClick}){

    const [isHovered, setIsHovered] = useState(false);

    return(
        <div className="d-flex flex-column">
            {/* image */}
            <div className='card ratio ratio-1x1 rounded shadow-sm' 
            style={{width: "min(30vw, 300px)", aspectRatio: "1 / 1"}}>
            <img className="ratio ratio-1x1 object-fit-cover rounded text-bg-dark card-img" src={imgUrl} alt={name}/>
            </div>

            {/* text */}
            <div style={{paddingLeft: "10px", color: txtcolor}}>
                <h5 style={{margin: "0"}}>{locationPin} {km} Km away</h5>
                <h1>{name}</h1>
                <div style={{height:"20px"}}></div>
            </div>

            <div className="d-flex justify-content-center w-100">
                <button
                onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
                onClick={onClick}
                type="button" className="btn btn-primary rounded-circle shadow" style={{height:"min(100px, 20vw)", aspectRatio: "1 / 1", backgroundColor:isHovered ? b2color : bcolor, borderColor:isHovered ? b2color : bcolor}}>
                {icon}
                </button>
            </div>
            
        </div>
    )
}

export default DrawBox