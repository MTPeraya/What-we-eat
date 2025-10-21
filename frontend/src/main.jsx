import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import FoodTinder from './foodtinder.jsx'
import Result from './ResultPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* <App /> */}
    {/* <Result/> */}
    <FoodTinder/>
  </StrictMode>,
)
