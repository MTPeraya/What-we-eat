const footerStyle = {
    backgroundColor: "#BB3D25",
  width: "100vw",
  height: "10vh",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  top: "90vh",
  position: "fixed",
  padding: "10px 20px",
  color: "white",
  zIndex: '2'
}

const buttonStyle = {
    background: 'transparent',
    height: "7vh",
    borderRadius: "10px",
    color: " white",
    borderColor: "white"
}


const locationPin = <svg xmlns="http://www.w3.org/2000/svg" width="4vh" height="4vh" viewBox="0 0 20 20"><path fill="white" d="M10 20S3 10.87 3 7a7 7 0 1 1 14 0c0 3.87-7 13-7 13zm0-11a2 2 0 1 0 0-4a2 2 0 0 0 0 4z"/></svg>

const stars = <svg xmlns="http://www.w3.org/2000/svg" width="4vh" height="4vh" viewBox="0 0 432 408"><path fill="#ffffff" d="M213 328L81 408l35-150L0 157l153-13L213 3l60 141l154 13l-117 101l35 150z"/></svg>

const Footer = ({location = "Your Location", review = " x.xx", onclickreview}) => {
    return (<section style={footerStyle}>
        {/* location */}
        <div>
            {locationPin}
            {location}
        </div>
        {/* review */}
        <button style={buttonStyle} onClick={onclickreview}>
            {stars}
            {review}
        </button>
    </section>)
}

export default Footer