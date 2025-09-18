import { useEffect, useState } from "react";

// import Header from './header.jsx'
// import HeroSection from './components/hero.jsx'
// import Features from './components/feature.jsx'
// import Footer from './components/bigfooter.jsx'

import FoodTinder from './foodtinder'

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css'
import HomePage from "./Homepage";

function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    // Call backend API
    fetch("http://localhost:4001/api/hello") 
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => {
        console.error("Error fetching backend:", err);
        setMessage("Error: could not connect to backend");
      });
  }, []);

  return (
    
    <div>
      <HomePage/>
      <div style={{ fontFamily: "Arial", textAlign: "center", marginTop: "50px" }}>
      <h1>Frontend is running ✅</h1>
      <p>Backend says: <strong>{message}</strong></p>
    </div>
    {/* <FoodTinder/> */}
    </div>

    
  );
}

export default App;
