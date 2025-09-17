import React, {useState, useRef} from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, useMotionValue,  useTransform, animate} from 'framer-motion';
import Button from "./components/swipeButton"

const heart  = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20"><path fill="#000000" d="m10 3.22l-.61-.6a5.5 5.5 0 0 0-7.78 7.77L10 18.78l8.39-8.4a5.5 5.5 0 0 0-7.78-7.77l-.61.61z"/></svg>

const cross = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 8 8"><path fill="#000000" d="M1.41 0L0 1.41l.72.72L2.5 3.94L.72 5.72L0 6.41l1.41 1.44l.72-.72l1.81-1.81l1.78 1.81l.69.72l1.44-1.44l-.72-.69l-1.81-1.78l1.81-1.81l.72-.72L6.41 0l-.69.72L3.94 2.5L2.13.72L1.41 0z"/></svg>

const locationPin = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20"><path fill="white" d="M10 20S3 10.87 3 7a7 7 0 1 1 14 0c0 3.87-7 13-7 13zm0-11a2 2 0 1 0 0-4a2 2 0 0 0 0 4z"/></svg>

const RoomID = "123456"


const RoomIDContainer = () =>{
    return(<div 
        className="brown button fw-bold"
        style={{
            textAlign: 'center',
            margin: "10px",
            padding: "5px"
        }}>
        {RoomID}
    </div>)
}

const SwipeCards = () => {
    const [cards, setCards] = useState(cardData);
    const [isSwiping, setIsSwiping] = useState(false);

    const topCardRef = useRef(null); // ref to call programmatic swipe

    const swipeLeft = () => {
      if (!isSwiping) {
        setIsSwiping(true);
        topCardRef.current?.swipe("left", () => setIsSwiping(false));
      }
    };
    const swipeRight = () => {
      if (!isSwiping) {
        setIsSwiping(true);
        topCardRef.current?.swipe("right", () => setIsSwiping(false));
      }
    };

    return(
      <div className="d-flex justify-content-start align-items-center" style={{
        width: "100vw",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "90vh",
        Height: "90vh",
        backgroundColor: "#FFE2C5"
      }}>
        <RoomIDContainer/>
        <div className="" style={{display: "grid", placeItems: "center"}}>
          {cards.length > 1 && (
            <Card
              key={cards[1].id}
              id={cards[1].id}
              url={cards[1].url}
              isBack
            />
          )}
          {cards.length > 0 && (
            <Card
              key={cards[0].id}
              id={cards[0].id}
              url={cards[0].url}
              setCards={setCards}
              ref={topCardRef}
              name={cards[0].name}
            />
          )}
          {cards.length === 0 && (
            <div style={{fontSize: "2rem", color: "#888", maxHeight: "520px",height: "60vh", }}>No more cards</div>
          )}
        </div>

        <div style={{
            display: "flex",
            width: "300px",
            justifyContent: "space-between"
        }}>
        <Button id="LEFT" onClick={swipeLeft} disabled={isSwiping} children={cross}/>
        <Button id="RIGHT" onClick={swipeRight} disabled={isSwiping} children={heart}/>
        </div>
      </div>
    )
}


const Card = React.forwardRef(({id, url, setCards, isBack, name, location="0.0"}, ref) => {
    const x = useMotionValue(0);

    const opacity = useTransform(x, [-150, 0 , 150], [0, 1, 0])
    const rotate = useTransform(x, [-150, 150], [-18, 18])

  const removeCard = () => {
    setCards && setCards(prev => prev.slice(1));
  }

    const handleDragEnd = () => {
        if (Math.abs(x.get()) > 50){
            if (x.get() > 50){
                console.log(`Yes${id}`);
            }
            if (x.get() < -50){
                console.log(`No${id}`)
            }
            removeCard();
        }
    }

  React.useImperativeHandle(ref, () => ({
    swipe(direction, onDone) {
      const to = direction === "right" ? 300 : -300;
      if (direction === "right") {
        console.log(`Yes${id}`);
        // future: handle right swipe
      } else {
        console.log(`No${id}`);
        // future: handle left swipe
      }
      animate(x, to, {
        type: "tween",
        stiffness: 200,
        onComplete: () => {
          removeCard();
          if (onDone) onDone();
        },
        duration: 0.3
      });
    },
  }));

    return (
        <motion.div
            // src={url}
            alt={id}
            className="rounded-lg"
            style={{
                backgroundImage: `url(${url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center', 
                backgroundRepeat: 'no-repeat',
                width: "80vw",
                height: "60vh",
                maxWidth: "300px",
                maxHeight: "520px",
                objectFit: "cover",
                borderRadius: "10px",
                gridRow: 1,
                gridColumn: 1,
                cursor: "grab",

                display: "flex",
                alignItems: "flex-end",
                x,
                opacity,
                rotate,
            }}

            drag={!isBack ? 'x' : false}
            dragConstraints={{
                left: 0,
                right: 0
            }}
            onDragEnd={!isBack ? handleDragEnd : undefined}
        >
            <div style={{paddingLeft: "10px",textShadow: "2px 2px black"}}>
                <h4 style={{color:"white", margin: "0"}}>{locationPin} {location} Km away</h4>
                <h1 style={{color: "white"}}>{name}</h1>
                <div style={{height:"20px"}}></div>
                </div>
        </motion.div>
    )
});


export default SwipeCards
// change data later
const cardData = [
  {
    id: 1,
    url: "/restaurant/restaurant1.jpg", // use public as home
    name: "R1",
  },
  {
    id: 2,
    url: "/restaurant/restaurant2.jpg",
    name: "R2",
  },
  {
    id: 3,
    url: "/restaurant/restaurant3.jpg",
    name: "R3",
  },
  {
    id: 4,
    url: "/restaurant/restaurant4.jpg",
    name: "R4",
  },
  {
    id: 5,
    url: "/restaurant/restaurant5.jpg",
    name: "R5",
  },
  {
    id: 6,
    url: "/restaurant/restaurant6.jpg",
    name: "R6",
  },
  {
    id: 7,
    url: "/restaurant/restaurant7.jpg",
    name: "R7",
  },
  {
    id: 8,
    url: "/restaurant/restaurant8.jpg",
    name: "R8",
  },
];
