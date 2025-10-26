import { useState, useEffect } from "react";
import "./App.css";
import { Link, useNavigate} from "react-router-dom";

function EnterCode() {

    const navigate = useNavigate();
    const [code, setCode] = useState("");

    // -- for join button --
    const handleJoin = () => {
    if (code.trim() === "") {
      alert("Please enter a room code!");
      return;
    }
    navigate(`/create-room?room=${code.trim()}`);
    };

    // -- for create room button --
    const handleCreateRoom = () => {
      // generate 6 digit random number for room code
      const newRoomCode = Math.floor(100000 + Math.random() * 900000).toString();

      navigate(`/create-room?room=${newRoomCode}`);
    };

    // -- for paste from clipboard --
    const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCode(text);
    } catch (err) {
      alert("Cannot read from clipboard.");
    }
    };

    return (
        <>
            <div className="background">
                <h1 className="head-name">WHAT WE EAT</h1>
                <input  className="n-container"
                        style={{
                            backgroundColor: "#FFE2C5",
                            margin: "20px",
                            width: "350px",
                            height: "75px",
                            fontSize: "28px",
                            textAlign: "center",
                    }}
                placeholder="ENTER CODE"
                value={code}
                onChange={(e) => setCode(e.target.value)}/>

                {/* clipboard */}
                <a className="white-thin-button"
                   style={{marginTop: "-5px"}}
                   onClick={handlePaste}>
                Paste from Clipboard</a>

                {/* join room */}
                <button className="green small-btn shadow"
                        style={{ marginTop: "25px" }}
                        onClick={handleJoin}>
                Join Room</button>

                {/* create room */}
                <button className="brown small-btn shadow"
                        style={{ marginTop: "-10px" }}
                        onClick={handleCreateRoom}>
                Create Room</button>
            </div>
        </>
    );
}

export default EnterCode;
