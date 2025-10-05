import React from 'react'
import '../App.css'



function Found({ pics, name, distance = "xx" }) {

    return( <div>
        <div className='card ratio ratio-1x1 rounded' style={{width: "20rem", aspectRatio: "1 / 1"}}>
            <img className="ratio ratio-1x1 object-fit-cover rounded text-bg-dark card-img" src={pics} alt={name}/>
        <div className="card-img-overlay d-flex flex-column justify-content-end">
            <h2 className="card-title text-white" style={{textShadow: "2px 2px black"}}>{name}</h2>
            <p className="card-text text-white" style={{textShadow: "2px 2px black"}}>{distance} km away</p>
        </div>
        </div>
    </div>)
}

export default Found