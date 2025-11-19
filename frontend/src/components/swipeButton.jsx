import React from "react";

const palette = {
  background: '#FFEFE3',
  card: '#FFF7EF',
  border: '#8A3A1A',
  textPrimary: '#4A1F0C',
  textSecondary: '#7A4B31',
  accent: '#C0471C',
  success: '#4CAF50'
};

const buttonStyles = {
  padding: "20px",
  cursor: "pointer",
  border: `3px solid ${palette.border}`,
  borderRadius: "50%",
  backgroundColor: palette.card,
  width: "80px",
  height: "80px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 8px 16px rgba(74,31,12,0.15)",
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
}

const Button = ({ children, onClick, disabled }) => {
  const handleMouseEnter = (e) => {
    if (!disabled) {
      e.currentTarget.style.transform = "scale(1.1)";
      e.currentTarget.style.boxShadow = "0 12px 24px rgba(74,31,12,0.25)";
    }
  };
  
  const handleMouseLeave = (e) => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = "0 8px 16px rgba(74,31,12,0.15)";
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ 
        ...buttonStyles,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1
      }}
    >
      {children}
    </button>
  );
};

export default Button;