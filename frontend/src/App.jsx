import { useEffect, useState } from "react";

// import Header from './header.jsx'
// import HeroSection from './components/hero.jsx'
// import Features from './components/feature.jsx'
// import Footer from './components/bigfooter.jsx'

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css'
import HomePage from "./Homepage";

function App() {
  // const [message, setMessage] = useState("Loading...");

  // useEffect(() => {
  //   // Call backend API
  //   fetch("http://localhost:4001/api/hello") 
  //     .then((res) => res.json())
  //     .then((data) => setMessage(data.message))
  //     .catch((err) => {
  //       console.error("Error fetching backend:", err);
  //       setMessage("Error: could not connect to backend");
  //     });
  // }, []);

  return (
<<<<<<< Updated upstream
    // <div style={{ fontFamily: "Arial", textAlign: "center", marginTop: "50px" }}>
    //   <h1>Frontend is running ✅</h1>
    //   <p>Backend says: <strong>{message}</strong></p>
    // </div>
    <div>
      <HomePage/>
    </div>
=======
    // <div>
    //   <HomePage/>
    //   {/* <Register/> */}
    //   {/* <Login/> */}
    //   {/* <EnterCode/> */}
      // <CreateRoom/>
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
>>>>>>> Stashed changes
  );
}

export default App;
