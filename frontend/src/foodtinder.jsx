import React from "react";
import SwipeCards from './components/swipecard.jsx'
import Header from './header.jsx'
import Footer from './components/smallfooter.jsx'


function FoodTinder() {
  return(
    <div>
      <Header/>
      <SwipeCards/>
      <Footer/>
    </div>
  );
}

export default FoodTinder