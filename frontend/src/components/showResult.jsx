import React from 'react'
import '../App.css'

const resultPics = "/restaurant/restaurant4.jpg"
const resultName = "R4"


const Found = () => {

    return( <div>
        <div className='card ratio ratio-1x1 rounded' style={{width: "20rem", aspectRatio: "1 / 1"}}>
            <img className="ratio ratio-1x1 object-fit-cover rounded text-bg-dark card-img" src={resultPics} alt={resultName}/>
        <div className="card-img-overlay d-flex flex-column justify-content-end">
            <h2 className="card-title text-white" style={{textShadow: "2px 2px black"}}>{resultName}</h2>
            <p className="card-text text-white" style={{textShadow: "2px 2px black"}}>xx km away</p>
        </div>
        </div>
    </div>)
}

export default Found