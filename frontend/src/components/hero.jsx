import { useNavigate } from "react-router-dom";
import React from "react";
import "../App.css";
import preview from "/wwePreview.png";

function HeroSection() {
  const navigate = useNavigate();

  const textWWE =
    "fun, fast, and fair way to choose the meal with your companion!!";
  return (
    <section style={{ margin: "0px" }}>
      <div className="hero_section">
        <div className="preview-pic">
          <img
            src={preview}
            style={{ width: "510px", maxWidth: "100%", height: "auto" }}
            alt="What We Eat Preview"
          />
        </div>

        <div className="hero-content">
          <h1 id="title" className="hero-title">
            What We Eat
          </h1>
          <p className="hero-text">{textWWE}</p>
          <button
            className="button green shadow hero-button"
            onClick={() => navigate("/Login")}
          >
            {" "}
            Start Now!{" "}
          </button>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
