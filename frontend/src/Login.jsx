import { useState, useEffect } from 'react';
import "./App.css";
import { Link, useNavigate } from "react-router-dom";

// remaining : check exist username, is username match with password

function Login() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const savedUsername = localStorage.getItem("WhatWeEatUsername");
        if (savedUsername) {
            setUsername(savedUsername);
            setRemember(true);
        }
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        setError("");

        if (!username) { setError("Please enter username !"); return; }
        if (!password) { setError("Please enter password !"); return; }

        // if remember
        if (remember) {
            localStorage.setItem("rememberedUsername", username);
        } else {
            localStorage.removeItem("rememberedUsername");
        }

        console.log({ username, password, remember });

        navigate("/create-room")
    };

    return (
        <>
        <div className="background">
            <h1 className="head-name">WHAT WE EAT</h1>
            <div className="box" style={{height: '400px'}}>

                <form onSubmit={handleLogin}>

                {/* username - email */}
                <label htmlFor="username" className="font-normal block mb-3">Username / Email</label>
                <input
                    type="text"
                    id="username"
                    className="n-container"
                    onChange={(e) => setUsername(e.target.value)}/>

                {/* password */}
                <label htmlFor="password" className="font-normal block mb-3">Password</label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    className="n-container"
                    onChange={(e) => setPassword(e.target.value)}/>

                {/* check box */}
                <label htmlFor="remember"
                       style={{
                       color: "#603A2B",
                       fontSize: "16px",
                       fontWeight: "normal",
                       display: "inline-flex",
                       alignItems: "center",
                       gap: "1px",
                       marginTop: "15px",
                       cursor: 'pointer',
                       }}><input type="checkbox"
                                 id="remember"
                                 onChange={(e) => setRemember(e.target.checked)}/>
                Remember me</label>

                {/* login button */}
                <button className="green small-btn shadow" 
                        style={{marginTop: '15px'}}>
                Login</button>

                {/* error text */}
                <div style={{ minHeight: "24px", marginBottom: "10px", marginTop: "-15px", color: "red", textAlign: "center" }}>
                {error && error}</div>

                </form>

                {/* register thin button */}
                <p className="font-normal" style={{ margin: "-5px auto" }}>
                Don't have an Account?{" "}
                <Link to="/register" className="thin-button">Register</Link></p>
            </div>

            {/* guest thin button */}
            <p className="font-normal" style={{color: 'white', margin: "15px auto" }}>
            Don't want to login?{" "}
            <Link to="/enter-code" className="white-thin-button">Stay as a guest</Link></p>
        </div>
        </>
    );
}

export default Login;
