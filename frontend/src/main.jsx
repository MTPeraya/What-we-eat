import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import FoodTinder from './foodtinder.jsx'
import Result from './ResultPage.jsx'
import UserPage from './UserPage.jsx'
import CreateRoom from './CreateRoom.jsx'
import RatingPage from './Ratings.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
