import React from "react";
import SwipeCards from './components/swipecard.jsx'
import Header from './header.jsx'
import Footer from './components/smallfooter.jsx'
import { useLocation } from 'react-router-dom';

function useQueryParams() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const roomId = params.get('roomId');
  const lat = params.get('lat');
  const lng = params.get('lng');
  return { roomId, lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined };
}

function FoodTinder() {
  const { roomId, lat, lng } = useQueryParams();
  return(
    <div>
      <Header/>
      <SwipeCards roomId={roomId} userCenter={lat && lng ? { lat, lng } : undefined}/>
      <Footer/>
    </div>
  );
}

export default FoodTinder