import React from 'react'
import '../App.css'

const Smallcard = (props) => {
    return (<div style={{ display: "flex", margin: "3vw", width: "25vw", minWidth: "220px", alignItems: "flex-start", background: "transparent" }}>

            <div 
            style={{ width: "50px", 
                    height: "50px", 
                    border: "2px solid black",
                    borderRadius:"5px",
                    flexShrink: "0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"}}>
            {props.icon}
            </div>

            <div style={{marginLeft: "2vw", marginTop: "0px"}}>
            <h1 style={{margin: "0px"}}>{props.keyword}</h1>
            <p style={{fontSize:"18px"}}>{props.explain}</p>
            </div>

        </div>)
}

const FastIcon = () => {
    return (<svg xmlns="http://www.w3.org/2000/svg" width="45px" height="45px" viewBox="0 0 24 24"><link xmlns="" type="text/css" rel="stylesheet" id="dark-mode-custom-link"/><link xmlns="" type="text/css" rel="stylesheet" id="dark-mode-general-link"/><style xmlns="" lang="en" type="text/css" id="dark-mode-custom-style"/><style xmlns="" lang="en" type="text/css" id="dark-mode-native-style"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m13 6l6 6l-6 6M5 6l6 6l-6 6"/></svg>)
}

const FunIcon = () => {
    return (<svg xmlns="http://www.w3.org/2000/svg" width="45px" height="45px" viewBox="0 0 496 512"><link xmlns="" type="text/css" rel="stylesheet" id="dark-mode-custom-link"/><link xmlns="" type="text/css" rel="stylesheet" id="dark-mode-general-link"/><style xmlns="" lang="en" type="text/css" id="dark-mode-custom-style"/><style xmlns="" lang="en" type="text/css" id="dark-mode-native-style"/><path fill="currentColor" d="M248 8C111 8 0 119 0 256s111 248 248 248s248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200s-89.7 200-200 200zm-80-216c17.7 0 32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32zm160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32zm4 72.6c-20.8 25-51.5 39.4-84 39.4s-63.2-14.3-84-39.4c-8.5-10.2-23.7-11.5-33.8-3.1c-10.2 8.5-11.5 23.6-3.1 33.8c30 36 74.1 56.6 120.9 56.6s90.9-20.6 120.9-56.6c8.5-10.2 7.1-25.3-3.1-33.8c-10.1-8.4-25.3-7.1-33.8 3.1z"/></svg>)
}

const FairIcon = () => {
    return (<svg xmlns="http://www.w3.org/2000/svg" width="45px" height="45px" viewBox="0 0 32 32"><link xmlns="" type="text/css" rel="stylesheet" id="dark-mode-custom-link"/><link xmlns="" type="text/css" rel="stylesheet" id="dark-mode-general-link"/><style xmlns="" lang="en" type="text/css" id="dark-mode-custom-style"/><style xmlns="" lang="en" type="text/css" id="dark-mode-native-style"/><path fill="currentColor" d="M20 16a5 5 0 0 0 10 0a1 1 0 0 0-.105-.447l-3.999-7.997a.891.891 0 0 0-.045-.081A1 1 0 0 0 25 7h-6.178A3.015 3.015 0 0 0 17 5.184V2h-2v3.184A3.015 3.015 0 0 0 13.178 7H7a1 1 0 0 0-.894.553l-4 8A1 1 0 0 0 2 16a5 5 0 0 0 10 0a1 1 0 0 0-.105-.447L8.617 9h4.56A3.015 3.015 0 0 0 15 10.815V28H6v2h20v-2h-9V10.816A3.015 3.015 0 0 0 18.822 9h4.56l-3.277 6.553A1 1 0 0 0 20 16ZM7 19a2.996 2.996 0 0 1-2.815-2h5.63A2.996 2.996 0 0 1 7 19Zm2.382-4H4.618L7 10.236ZM16 9a1 1 0 1 1 1-1a1 1 0 0 1-1 1Zm9 10a2.996 2.996 0 0 1-2.815-2h5.63A2.996 2.996 0 0 1 25 19Zm0-8.764L27.382 15h-4.764Z"/></svg>)
}


function Features(){
    return (
    <div 
            style={{width: "100vw", 
                    padding:"2vw",
                    display: "flex", 
                    justifyContent: "center",
                    flexWrap:"wrap",
                    backgroundColor: "#FFE2C5"}}>
        <Smallcard icon={<FastIcon/>} keyword="Fun" explain="Join the room with your friends and family and try this thing together!"/>
        <Smallcard icon={<FunIcon/>} keyword="Fast" explain="Helps You make a decision in short time."/>
        <Smallcard icon={<FairIcon/>} keyword="Fair" explain="Everyone get fair vote!"/>

    </div>)
}

export default Features