import React from 'react';
// , {useState, useEffect, useRef, useCallback}
import { Button, Offcanvas, Container } from 'react-bootstrap';
import ReviewCard from './components/ReviewCard';
import Header from './header';
import Footer from './components/smallfooter';

const stars = ({size, color}) => <svg className="mx-2" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 432 408"><path fill={color} d="M213 328L81 408l35-150L0 157l153-13L213 3l60 141l154 13l-117 101l35 150z" /></svg>

function RatingPage(
    ){

    const restaurant = {imgURL: "../public/restaurant/restaurant1.jpg",
                    name: "Restaurant 1"}

    return(
        <div>
            <Header/>
            <section className="d-flex justify-content-center align-items-center" style={{height: '80vh', color:"603A2B"}}>
                <div className="d-flex border h-75 w-75 border-secondary rounded">
                    <img src={restaurant.imgURL} alt={restaurant.name} className="object-fit-cover h-100 w-25 rounded-start"/>
                    <div className="d-flex flex-column w-75 m-2">
                        <div className="d-flex justify-content-between align-items-center ">
                            <div>
                                <h1 className="my-1">{restaurant.name}</h1>
                            </div>
                            <div className="d-flex mx-3 my-1 align-items-center gap-1">
                                {stars({size: "4vh" , color: "#BB3D25"})}
                                <h1 className="my-0">5.0</h1>
                            </div>
                        </div>
                        <hr className="mb-1 me-1"/>

                        <div className="w-100">
                            <h4 className="my-0">Reviews</h4>
                        </div>

                        <div class="container overflow-auto h-75" style={{
        width:"95%",
        scrollbarWidth: 'thin',
        scrollbarColor: '#BB3D25 #f1f1f1'
    }}>
                            <div class="row flex-nowrap gap-2 h-100">
                                <ReviewCard/>
                                <ReviewCard/>
                                <ReviewCard/>
                                <ReviewCard/>
                                <ReviewCard/>
                                <ReviewCard/>
                            </div>
                        </div>
                    </div>


                </div>
                
                
            </section>
            <section style={{height: '10vh'}}></section>
            <Footer/>
        </div>
    )

};

export default RatingPage;