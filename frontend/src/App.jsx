import { useEffect } from 'react';
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
import UserPage from "./UserPage";
import RatingPage from "./Ratings";
import DrawPage from "./DrawPage";
import WishlistPage from "./WishlistPage";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";

function AuthDebugLogger() {
  const { user, isLoggedIn, isAdmin, authChecked, loading } = useAuth();

  useEffect(() => {
    console.log('[AuthDebug] authChecked:', authChecked, '| loading:', loading, '| isLoggedIn:', isLoggedIn, '| isAdmin:', isAdmin, '| user:', user);
  }, [user, isLoggedIn, isAdmin, authChecked, loading]);

  return null;
}

function App() {

  return (
    <AuthProvider>
      <AuthDebugLogger />
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/enter-code" element={<EnterCode />} />
          <Route path="/create-room" element={<CreateRoom />} />
          <Route path="/foodtinder" element={<FoodTinder />} />
          <Route path="/draw" element={<DrawPage />} />
          <Route path="/draw/*" element={<DrawPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/admin-dashboard" element={<AdminDash />} />
          <Route path="/profile" element={<UserPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/rating/:restaurantId" element={<RatingPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
