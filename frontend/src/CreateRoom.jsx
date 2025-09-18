import React, { useState } from 'react'
import "./App.css"
import Header from "./header"


function CreateRoom () {

    const [qrCodeImage, setQrCodeImage] = useState(null);

    return (
        <>
        <div style={{position: 'absolute', top: 0}}>
            <Header/>
        </div>

        <div className='room-container'>
            {/* left side */}
            <div className='left'>
                <img src={{qrCodeImage}} 
                     alt='QR Code' 
                     width="280" 
                     height="280"></img>
                <div className='room-code'>12345</div>
                <div className='location-box'>📍 Your Location</div>
            </div>

            {/* right side */}
            <div className='right'>
                <div>scoll bar</div>
                <div className='room-btn'>
                    <button className='green small-btn shadow'
                            style={{width: '200px'}}>
                    Start</button>
                    <button className='brown small-btn shadow'
                            style={{width: '200px'}}>
                    Cancel</button>
                </div>
                <button className='green small-btn shadow'>Start</button>
                <button className='brown small-btn shadow'>Cancel</button>
            </div>
        </div>
        </>
    )
}

export default CreateRoom;