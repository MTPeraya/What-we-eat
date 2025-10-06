import { useState } from "react";
import "./App.css";
import { Link, useNavigate} from "react-router-dom";

function EnterCode() {

    const navigate = useNavigate();
    const [code, setCode] = useState("");

    return (
        <>
            <div className="background">
                <h1 className="head-name">WHAT WE EAT</h1>
                <input
                className="n-container"
                style={{
                    backgroundColor: "#FFE2C5",
                    margin: "20px",
                    width: "350px",
                    height: "75px",
                    fontSize: "28px",
                    textAlign: "center",
                }}
                placeholder="ENTER CODE"></input>

                {/* clipboard */}
                <a className="white-thin-button"
                   style={{marginTop: "-5px"}}>
                Paste from Clipboard</a>

                {/* join room */}
                <button className="green small-btn shadow"
                        style={{ marginTop: "25px" }}>
                Join Room</button>

                {/* create room */}
                <button className="brown small-btn shadow"
                        style={{ marginTop: "-10px" }}
                        onClick={() => navigate("/create-room")}>
                Create Room</button>
            </div>
        </>
    );
}

export default EnterCode;
