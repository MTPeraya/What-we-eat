import React from "react";

const buttonStyles = {
  padding: "24px 24px",
  background: "whitesmoke",
  cursor: "pointer",
  border: "none",
  borderRadius: "50%",
  backgroundColor: "#FFF7D7"
}



const Button = ({ children, onClick }) => (
    
  <button className="shadow" onClick={onClick} style={{ ...buttonStyles }}>
    {children}
  </button>
);

export default Button;