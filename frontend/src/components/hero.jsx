import { useNavigate } from 'react-router-dom';
import React from 'react'
import '../App.css'
import preview from "../../public/wwePreview.png"


function HeroSection(){

    const navigate = useNavigate();

    const textWWE = "fun, fast, and fair way to choose the meal with your companion!!";
    return (
    <section style={{margin: "0px"}}>
    <div className="hero_section">
        <div 
        style={{display: "flex", 
                flexDirection: "column", 
                width: "40vw", height: "300px",
                alignItems: "left", 
                marginTop: "100px"}}>
            <h1 style={{fontSize:"60px", height:"80px", margin: "10px"}}>What We Eat</h1>
            <p style={{fontSize:"24px"}}>{textWWE}</p>
            <button className='button green shadow'> Start Now! </button>
        </div>
        <img src={preview} style={{width:"510px"}}/>
    </div>
    </section>

    )
}

export default HeroSection 