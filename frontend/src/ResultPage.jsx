import React from "react";
import Header from './header.jsx'
import Footer from './components/smallfooter.jsx'
import Found from './components/showResult.jsx'


function Result() {
  return(
    <div>
      <Header/>
      
      <div className='container d-flex flex-column justify-content-around align-items-center'
      style={{height: '90vh'}}>
        <div className="d-flex flex-column align-items-center" style={{color:"#801F08"}}>
          <h4 className="mb-0">Restaurant</h4>
          <h1>FOUND</h1>
        </div>
      <Found/>
      <div className="d-flex flex-column align-items-center">
        <button className="green button">Map</button>
        <div style={{height:"10px"}}/>
        <button className="brown s-button">exit</button> 
      </div>
      
      <div style={{height: "10vh"}}></div>
      </div>
      
      <Footer/>
    </div>
  );
}

export default Result
