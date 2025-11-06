import { useState, useEffect } from 'react';
import "./App.css";
import { Link, useNavigate } from "react-router-dom";
import Header from './header.jsx'
import { config } from './config';


function Login() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const savedUsername = localStorage.getItem("WhatWeEatUsername");
        if (savedUsername) {
            setUsername(savedUsername);
            setRemember(true);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        if (!username) {
            alert("Please enter your username !");
            return;
        } else if (!password) {
            alert("Please enter your password !");
            return;
        }

        // if remember
        if (remember) {
            localStorage.setItem("rememberedUsername", username);
        } else {
            localStorage.removeItem("rememberedUsername");
        }

        try {
            const res = await fetch(`${config.endpoints.auth}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // receive HttpOnly session cookie
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();
            if (res.ok) {
                // Backend issues a session cookie; no token to store
                if (remember) {
                    localStorage.setItem("WhatWeEatUsername", username);
                }
                setMessage("✅ Login successfully!");
                navigate("/enter-code");
            } else {
                setMessage(`❌ ${data.error || "password or username incorrect"}`);
            }
        } catch (err) {
            setMessage("Cannot connect to server");
            }

        // console.log({ username, password, remember });
        // console.log({ message })
        // navigate("/create-room")
    }; 

    return (
        <>
        <Header/>
        <div className="background">
            <h1 className="head-name">WHAT WE EAT</h1>
            <div className="box" style={{height: '380px'}}>

                <form onSubmit={handleLogin}>

                {/* username - email */}
                <label htmlFor="username" className="font-normal block mb-3">Username / Email</label>
                <input
                    type="text"
                    id="username"
                    autoComplete="username"
                    value={username}
                    className="n-container"
                    onChange={(e) => setUsername(e.target.value)}/>

                {/* password */}
                <label htmlFor="password" className="font-normal block mb-3">Password</label>
                <input
                    type="password"
                    id="password"
                    autoComplete="current-password"
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

                </form>

                {/* register thin button */}
                <p className="font-normal" style={{ margin: "-8px auto" }}>
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
