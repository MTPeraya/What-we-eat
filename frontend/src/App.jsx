import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css'
import HomePage from "./Homepage";
import Register from "./Register"
import Login from "./Login"
import EnterCode from "./EnterCode"
import CreateRoom from "./CreateRoom"
import FoodTinder from "./foodtinder";
import ResultPage from "./ResultPage";
import AdminDash from "./AdminDashboard";

function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/enter-code" element={<EnterCode />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/foodtinder" element={<FoodTinder />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/admin-dashboard" element={<AdminDash />} />
      </Routes>
    </Router>
  );
}

export default App;
