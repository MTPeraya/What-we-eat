import React from 'react'
import './App.css'
import { Link, useNavigate} from "react-router-dom";

function Profile(){

    return <div className='profile-s Margin1vh'></div>
}

function MenuIcon(){
  return(
  <svg className="Margin1vh" width="8vh" height="8vh" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 6H20M4 12H20M4 18H20" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  )
}

function Header() {

  // const navigate = useNavigate();s

  return (
    <div className='header'>
        <a><MenuIcon /></a>
        <a><Profile/></a>
    </div>
  )
}


export default Header
