import { useState } from "react";
import "./App.css";

function Register() {

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rePassword, setRePassword] = useState("");
    const [error, setError] = useState("");

    const handleRegister = () => {
        if (!username || !password || !rePassword) {
            setError("please enter all");
            return;
        }
    };

    return (
        <>
        <div className="background">
            <h1 className="head-name">WHAT WE EAT</h1>
            <div className="box" style={{ height: "440px" }}>

            {/* username */}
            <p className="font-normal">Username</p>
            <input className="n-container" type="text" value={username}></input>

            {/* password */}
            <p className="font-normal">Password</p>
            <input className="n-container" type="password" value={password}></input>

            {/* re-enter password */}
            <p className="font-normal">Re-Enter Password</p>
            <input className="n-container" type="password" value={rePassword}></input>

            {/* register button */}
            <button className="green small-btn shadow">Register</button>

            {/* login thin button */}
            <p className="font-normal" style={{ margin: "0px auto" }}>
                Already have an Account? <a className="thin-button">Log in</a>
            </p>
            </div>
        </div>
        </>
    );
}

export default Register;
