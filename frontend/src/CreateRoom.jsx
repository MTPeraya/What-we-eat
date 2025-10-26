import React, { useState, useEffect } from 'react'
import "./App.css"
import Header from "./header"
import QRCode from 'qrcode';
import { useNavigate, useLocation } from "react-router-dom";


function CreateRoom () {

    const navigate = useNavigate();
    const location = useLocation();

    const [roomCode, setRoomCode] = useState("");
    const [qrcode, setQrcode] = useState ("");

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const roomParam = params.get("room");

        // If there are existing room code in URL, use it
        if (roomParam) {
            setRoomCode(roomParam);
        } else {
            navigate("/enter-code");
        }
    }, [location, navigate]);

    // Generate QR code from room code
    useEffect(() => {
        if (roomCode) {
            const joinUrl = `${window.location.origin}/create-room?room=${roomCode}`;

            QRCode.toDataURL(joinUrl, { width: 280, margin: 2 }, (err, url) => {
                if (!err) setQrcode(url);
            });
        }
    }, [roomCode]);

    return (
        <>
        <div style={{position: 'absolute', top: 0}}>
            <Header/>
        </div>

        <div className='room-container'>
            {/* left side */}
            <div className='left'>
                <div style={{border: '3px solid #603A2B', borderRadius: '5px'}}>
                    {/* <QRCode value={joinUrl}
                            bgColor="white"
                            fgColor="black"
                            size={280} /> */}
                    <img src={qrcode}
                        alt='QR Code'
                        width={280}
                        height={280}
                        style={{borderRadius: '3px'}}></img>
                </div>
                <div className='room-code'>{roomCode}</div>
                <div className='location-box'>📍 Your Location</div>
            </div>

            {/* right side */}
            <div className='right'>
                <div className='scroll'>
                    {/* {[...Array(7)].map((_, i) => (
                        <div key={i} className="member-box">Member</div>
                    ))} */}
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
                            style={{width: '200px'}}
                            >
                    Start</button>
                    <button className='brown small-btn shadow'
                            style={{width: '200px'}}
                            onClick={() => navigate("/enter-code")}>
                    Cancel</button>
                </div>
            </div>
        </div>
        </>
    )
}

export default CreateRoom;
