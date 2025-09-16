import React from 'react'
import Header from './header.jsx'
// import Preferences from './preferences.jsx'
// import SwipeCards from './foodtinder.jsx'
// // import SwipeCards from './swipecard.jsx'
import HeroSection from './components/hero.jsx'
import Features from './components/feature.jsx'
import Footer from './components/bigfooter.jsx'
import './App.css'


function HomePage() {

  return (
    <>
      <Header/>
      {/* <Preferences/> */}
      <HeroSection/>
      <Features/>
      {/* <SwipeCards/> */}
      <Footer/>
    </>
  )
}

export default HomePage