import { useState } from "react";
import "./App.css";
import { Link, useNavigate} from "react-router-dom";
import { config } from './config';


function Register() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rePassword, setRePassword] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();

        if (!username) {
            alert("Please enter your username !");
        } else if (!password) {
            alert("Please enter your password !");
        } else if (password.length < 6) {
            alert("Password must be at least 6 characters !");
        } else if (!rePassword) {
            alert("Please re-enter your password !");
        } else if (password !== rePassword) {
            alert("Passwords do not match !");
        }

        // const payload = { username, password, rePassword };

        try {
            const res = await fetch(`${config.endpoints.auth}/register`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();
            console.log("data", data);

            if (res.ok) {
                // Backend uses HttpOnly cookie session; no token to store
                navigate("/create-room");
            } else {
                // Show friendlier validation/duplicate messages
                if (data?.error === 'VALIDATION_ERROR') {
                    const fieldErr = data?.details?.fieldErrors || {};
                    const firstField = Object.keys(fieldErr)[0];
                    const firstMsg = firstField && Array.isArray(fieldErr[firstField]) ? fieldErr[firstField][0] : 'Validation failed';
                    alert(`❌ ${firstMsg}`);
                } else if (data?.error === 'USERNAME_TAKEN') {
                    alert('❌ Username is already taken');
                } else {
                    alert(`❌ ${data?.error || "Registration failed"}`);
                }
            }
        } catch (err) {
            console.log("err", err);
            alert("Cannot connect to server");
        }

    // navigate("/create-room");
    // console.log(username, password, rePassword);
    };

    return (
        <>
        <div className="background">
            <h1 className="head-name">WHAT WE EAT</h1>
            <div className="box" style={{ height: "440px" }}>
            <form className="form" onSubmit={handleRegister}>

            {/* username */}
            <label htmlFor="username" className="font-normal block mb-3">Username</label>
            <input type="text"
                   id="username"
                   autoComplete="username"
                   value={username}
                   className="n-container"
                   onChange={(e) => setUsername(e.target.value)}/>

            {/* password */}
            <label htmlFor="password" className="font-normal block mb-3">Password</label>
            <input type="password"
                   id="password"
                   autoComplete="new-password"
                   value={password}
                   className="n-container"
                   onChange={(e) => setPassword(e.target.value)}/>

            {/* re-enter password */}
            <label htmlFor="repassword" className="font-normal block mb-3">Re-Enter Password</label>
            <input type="password"
                   id="repassword"
                   autoComplete="new-password"
                   value={rePassword}
                   className="n-container"
                   onChange={(e) => setRePassword(e.target.value)}/>

            {/* register button */}
            <button className="green small-btn shadow"
                    type="submit">Register</button>
            </form>

            {/* login thin button */}
            <p className="font-normal" style={{ margin: "-8px auto" }}>
                Already have an Account?<Link to="/login" className="thin-button">Login</Link>
            </p>
            </div>
        </div>
        </>
    );
}

export default Register;
