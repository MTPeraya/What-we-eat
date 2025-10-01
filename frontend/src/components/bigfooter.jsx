import React from 'react'
import '../App.css'



const NavItem = (props) => {
    return (<li className="nav-item mb-2" ><a href={props.href} className="nav-link p-0 white_txt">{props.nav}</a></li>)
}

const NavSection = ()=> {
    return (<div className="col mb-3">
          <h5>Section</h5>
          <ul className="nav flex-column">
            <NavItem href = "#" nav = "Home"/>
            <NavItem href = "#" nav = "Join Room"/>
            <NavItem href = "#" nav = "Create Room"/>
            <NavItem href = "#" nav = "Sign In"/>
          </ul>
        </div>
        )
}


function Footer(){

    return(
    <div style={{width: "100vw", backgroundColor: "#BB3D25", height:"300px", color:"white"}}>
    <div className="container">
      <footer className="row row-cols-1 row-cols-sm-2 row-cols-md-5 py-5 border-top">
        <div className="col mb-3">
          <a href="/" className="d-flex align-items-center mb-3 link-body-emphasis text-decoration-none" aria-label="What We Eat">
            <img src="../../public/WWELOGO_w.PNG" style={{width:"100px"}}/>
          </a>
          <p className="white_txt">© WWE 2025</p>
        </div>
        <div className="col mb-3"></div>
        <NavSection/>
        <NavSection/>
        <NavSection/>
      </footer>
    </div>
    </div>)
}

export default Footer

