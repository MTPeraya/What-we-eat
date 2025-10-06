import React, { useState } from 'react'
import "./App.css"
import Header from "./header"
import { Link, useNavigate} from "react-router-dom";
// import {ScrollShadow} from "@heroui/react";


function CreateRoom () {

    const navigate = useNavigate();
    const [qrCodeImage, setQrCodeImage] = useState(null);

    return (
        <>
        <div style={{position: 'absolute', top: 0}}>
            <Header/>
        </div>

        <div className='room-container'>
            {/* left side */}
            <div className='left'>
                <div style={{border: '3px solid #603A2B', borderRadius: '5px'}}>
                    <img src={qrCodeImage}
                        alt='QR Code'
                        width={280}
                        height={280}
                        style={{borderRadius: '5px'}}></img>
                </div>
                <div className='room-code'>12345</div>
                <div className='location-box'>📍 Your Location</div>
            </div>

            {/* right side */}
            <div className='right'>
                <div className='scroll'>
                    <div className="member-box">Member</div>
                    <div className="member-box">Member</div>
                    <div className="member-box">Member</div>
                    <div className="member-box">Member</div>
                    <div className="member-box">Member</div>
                    <div className="member-box">Member</div>
                    <div className="member-box">Member</div>
                </div>
                <div className='room-btn'>
                    <button className='green small-btn shadow'
                            style={{width: '200px'}}>
                    Start</button>
                    <button className='brown small-btn shadow'
                            style={{width: '200px'}}
                            onClick={() => navigate("/enter-code")}>
                    Cancel</button>
                </div>
                {/* <button className='green small-btn shadow'>Start</button>
                <button className='brown small-btn shadow'>Cancel</button> */}
            </div>
        </div>
        </>
    )
}

export default CreateRoom;
