import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// import Header from './header.jsx'
// import HeroSection from './components/hero.jsx'
// import Features from './components/feature.jsx'
// import Footer from './components/bigfooter.jsx'

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css'
import HomePage from "./Homepage";
import Register from "./Register"
import Login from "./Login"
import EnterCode from "./EnterCode"
import CreateRoom from "./CreateRoom"

function App() {

  return (
    // <div>
    //   <HomePage/>
    //   {/* <Register/> */}
    //   {/* <Login/> */}
    //   {/* <EnterCode/> */}
    //   {/* <CreateRoom/> */}
    // </div>

    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/enter-code" element={<EnterCode />} />
        <Route path="/create-room" element={<CreateRoom />} />
      </Routes>
    </Router>
  );
}

export default App;
