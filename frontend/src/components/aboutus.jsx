
import React from 'react'
import '../App.css'


const ProblemSection = () => {

    const problems = [
        "Can't decide where to eat?",
        "Group debates take too long?",
        "'Anything!' but reject every choice?"
    ]

    return (
        <section style={{
            padding: "30px",
        }}>
            <div className='d-flex flex-row justify-content-around align-items-center'>
            <div style={{
                width: "45vw",
                marginLeft: "50px",
            }}>
            <ul>
            {problems.map((item) => (
                <li style={{marginBottom: "15px"}}><h2>{item}</h2></li>
            ))}
            </ul>
            <h1 className="fw-bold"
            style={{marginLeft: "30px", fontSize: "56px", color:"#BB3D25"}}>
                Try What We Eat!
            </h1>
            </div>
            <div>
                <img src="../../public/argument.png"/>
            </div>
            </div>

        </section>
    )
}

const WhatWeOffer = () =>{


    const iconSize = 100;
    const iconColor = "#000000";

    const roomIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 32 32">
            <path fill="none" stroke={iconColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8V4m0 4a8 8 0 0 1 8 8v8H8v-8a8 8 0 0 1 8-8ZM4 28h24"/>
        </svg>
    );

    const settingIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 32 32">
            <path fill={iconColor} d="M19.9 12.66a1 1 0 0 1 0-1.32l1.28-1.44a1 1 0 0 0 .12-1.17l-2-3.46a1 1 0 0 0-1.07-.48l-1.88.38a1 1 0 0 1-1.15-.66l-.61-1.83a1 1 0 0 0-.95-.68h-4a1 1 0 0 0-1 .68l-.56 1.83a1 1 0 0 1-1.15.66L5 4.79a1 1 0 0 0-1 .48L2 8.73a1 1 0 0 0 .1 1.17l1.27 1.44a1 1 0 0 1 0 1.32L2.1 14.1a1 1 0 0 0-.1 1.17l2 3.46a1 1 0 0 0 1.07.48l1.88-.38a1 1 0 0 1 1.15.66l.61 1.83a1 1 0 0 0 1 .68h4a1 1 0 0 0 .95-.68l.61-1.83a1 1 0 0 1 1.15-.66l1.88.38a1 1 0 0 0 1.07-.48l2-3.46a1 1 0 0 0-.12-1.17ZM18.41 14l.8.9l-1.28 2.22l-1.18-.24a3 3 0 0 0-3.45 2L12.92 20h-2.56L10 18.86a3 3 0 0 0-3.45-2l-1.18.24l-1.3-2.21l.8-.9a3 3 0 0 0 0-4l-.8-.9l1.28-2.2l1.18.24a3 3 0 0 0 3.45-2L10.36 4h2.56l.38 1.14a3 3 0 0 0 3.45 2l1.18-.24l1.28 2.22l-.8.9a3 3 0 0 0 0 3.98Zm-6.77-6a4 4 0 1 0 4 4a4 4 0 0 0-4-4Zm0 6a2 2 0 1 1 2-2a2 2 0 0 1-2 2Z"/>
        </svg>
    );

    const voteIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" width={iconSize+50} height={iconSize} viewBox="0 0 32 32">
            <path fill={iconColor} d="M8 5v16h16V5H8zm2 2h12v12H10V7zm9.3 2.9L15 14.2l-2.3-2.3l-1.4 1.5l3 3l.7.7l.7-.7l5-5l-1.4-1.5zM2 19v8h2v-6h2v-2H2zm24 0v2h2v6h2v-8h-4zM6 23v2h20v-2H6z"/>
        </svg>
    );

    const fairIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" width={iconSize+50} height={iconSize} viewBox="0 0 32 32">
            <path fill={iconColor} d="M20 16a5 5 0 0 0 10 0a1 1 0 0 0-.105-.447l-3.999-7.997a.891.891 0 0 0-.045-.081A1 1 0 0 0 25 7h-6.178A3.015 3.015 0 0 0 17 5.184V2h-2v3.184A3.015 3.015 0 0 0 13.178 7H7a1 1 0 0 0-.894.553l-4 8A1 1 0 0 0 2 16a5 5 0 0 0 10 0a1 1 0 0 0-.105-.447L8.617 9h4.56A3.015 3.015 0 0 0 15 10.815V28H6v2h20v-2h-9V10.816A3.015 3.015 0 0 0 18.822 9h4.56l-3.277 6.553A1 1 0 0 0 20 16ZM7 19a2.996 2.996 0 0 1-2.815-2h5.63A2.996 2.996 0 0 1 7 19Zm2.382-4H4.618L7 10.236ZM16 9a1 1 0 1 1 1-1a1 1 0 0 1-1 1Zm9 10a2.996 2.996 0 0 1-2.815-2h5.63A2.996 2.996 0 0 1 25 19Zm0-8.764L27.382 15h-4.764Z"/>
        </svg>
    );


    const Card = ({feature, para, icon, margin=20})=> {
        return(<div className="col d-flex align-items-start"> 
                {icon}
                <div style={{marginLeft:`${margin}px`}}> 
                <h3 className="fw-bold mb-0 fs-4 text-body-emphasis" >
                    {feature}</h3> <p>{para}</p> </div> 
                </div>)
    }

    return(
        <section className="d-flex flex-row justify-content-around w-80 pb-5">
            <div>
                <img style={{width: "30vw"}}src="../../public/wweIcon.png"/>
            </div>
            <div className="" style={{ width: "40vw", margin: "0" }}>
               <h1 className="fw-bold" style={{color:"#BB3D25"}}>What We Offer</h1>
               <p>Decide where to eat, together—quickly and fairly. With in few steps</p>
               <div className="row row-cols-1 row-cols-sm-2 row-cols-md-2 row-cols-lg-2 g-4 py-2 my-0">
                    <Card icon={roomIcon} feature="Create a Room" para="One person starts, and others join with a code or QR." />
                    <Card icon={settingIcon} feature = "Set Preferences" para="Cuisine, budget, allergies, or even mood." margin="10"/>
                    <Card icon={voteIcon} feature = "Vote Together" para="Restaurants are suggested one by one. Everyone votes accept/reject."/>
                    <Card icon={fairIcon} feature = "Get a Fair Result" para="The app picks the best match—everyone's vote counts equally."/>
               </div>
            </div>

        </section>
    )
}

const MoreOver= () => {

        const localIcon =<svg xmlns="http://www.w3.org/2000/svg" width="80px" height="80px" viewBox="0 0 48 48" fill="#BB3D25"><g fill="none" stroke="#BB3D25" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M9.858 32.757C6.238 33.843 4 35.343 4 37c0 3.314 8.954 6 20 6s20-2.686 20-6c0-1.657-2.239-3.157-5.858-4.243"/><path d="M24 35s13-8.496 13-18.318C37 9.678 31.18 4 24 4S11 9.678 11 16.682C11 26.504 24 35 24 35Z"/><path d="M24 22a5 5 0 1 0 0-10a5 5 0 0 0 0 10Z"/></g></svg>

        const timeIcon = <svg xmlns="http://www.w3.org/2000/svg" width="80px" height="80px" viewBox="0 0 16 16"><path fill="none" stroke="#BB3D25" d="M3 1.5h10m-10 13h10M4.5 2v4l2 2m5 6v-4l-2-2m2-6v4l-3 3m-4 5v-4l3-3M6 11.5h4m-3-6h2"/></svg>

        const shareIcon = <svg xmlns="http://www.w3.org/2000/svg" width="80px" height="80px" viewBox="0 0 16 16"><path fill="#BB3D25" d="M3 6.81v6.38c0 .493.448.9.992.9h7.016c.543 0 .992-.406.992-.9V6.81c0-.493-.448-.9-.992-.9H3.992c-.543 0-.992.406-.992.9M6 5v.91h3V5h2.008C12.108 5 13 5.818 13 6.81v6.38c0 1-.9 1.81-1.992 1.81H3.992C2.892 15 2 14.182 2 13.19V6.81C2 5.81 2.9 5 3.992 5zm1.997-3.552A.506.506 0 0 1 8 1.5v8a.5.5 0 0 1-1 0v-8a.51.51 0 0 1 0-.017L5.18 3.394a.52.52 0 0 1-.77 0a.617.617 0 0 1 0-.829L6.36.515a1.552 1.552 0 0 1 2.31 0l1.95 2.05a.617.617 0 0 1 0 .83a.52.52 0 0 1-.77 0z"/></svg>

        const starIcon = <svg xmlns="http://www.w3.org/2000/svg" width="80px" height="80px" viewBox="0 0 24 24"><path fill="#BB3D25" d="M22 9.67a1 1 0 0 0-.86-.67l-5.69-.83L12.9 3a1 1 0 0 0-1.8 0L8.55 8.16L2.86 9a1 1 0 0 0-.81.68a1 1 0 0 0 .25 1l4.13 4l-1 5.68a1 1 0 0 0 .4 1a1 1 0 0 0 1.05.07L12 18.76l5.1 2.68a.93.93 0 0 0 .46.12a1 1 0 0 0 .59-.19a1 1 0 0 0 .4-1l-1-5.68l4.13-4A1 1 0 0 0 22 9.67Zm-6.15 4a1 1 0 0 0-.29.89l.72 4.19l-3.76-2a1 1 0 0 0-.94 0l-3.76 2l.72-4.19a1 1 0 0 0-.29-.89l-3-3l4.21-.61a1 1 0 0 0 .76-.55L12 5.7l1.88 3.82a1 1 0 0 0 .76.55l4.21.61Z"/></svg>

        

        const CardWithCircle = ({ icon, title, circleSize = 120, bgColor = '#ffffff69', borderColor = '#BB3D25' }) => (
            <div
                className="d-flex flex-column align-items-center"
                style={{
                    border: `2px solid ${borderColor}`,
                    borderRadius: 20,
                    padding: 24,
                    background: '#ffffff25',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    width: "18vw",
                }}
            >
                <div
                    style={{
                        width: circleSize,
                        height: circleSize,
                        borderRadius: '50%',
                        background: bgColor,
                        border: `4px solid ${borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                    }}
                >
                    {icon}
                </div>
                <h1 className="fw-bold"
                style={{ fontSize: 24, color: borderColor, textAlign: 'center', margin: 0 }}>
                    {title}
                </h1>
            </div>
        );
    return (
        <section className="pb-5">
            <div className="text-center">
                <h1 className = "fw-bold" style={{color:"#BB3D25"}}>More Over</h1>
                <p style={{color:"#603A2B"}}>Beyond decision-making, What We Eat also helps you:</p>
            </div>
            <div className="d-flex flex-column align-items-center">
            <div className="d-flex flex-row justify-content-between mx-5" style={{width:"80vw"}}>
                <CardWithCircle title="Discover local restaurants nearby." icon={localIcon}/>
                <CardWithCircle title="Avoid repeating the same places." icon={timeIcon}/>
                <CardWithCircle title="Share your choice directly with your friends" icon={shareIcon}/>
                <CardWithCircle title="Rate and upload food photos to improve future suggestions." icon={starIcon}/>
            </div></div>
            

        </section>
    )
}

function AboutUsSection(){


    return (
        <div>
            <ProblemSection/>
            <WhatWeOffer/>
            <MoreOver/>

        </div>
    )
}

export default AboutUsSection