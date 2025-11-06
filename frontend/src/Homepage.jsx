import React from 'react'
import Header from './header.jsx'
import HeroSection from './components/hero.jsx'
import Features from './components/feature.jsx'
import AboutUsSection from './components/aboutus.jsx'
import Footer from './components/bigfooter.jsx'
import './App.css'


function HomePage() {

  return (
    <>
      <Header/>
      <HeroSection/>
      <Features/>
      <div className="b-divider"></div>
      <AboutUsSection/>
      <Footer/>
    </>
  )
}

export default HomePage