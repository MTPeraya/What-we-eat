import { useState } from "react";
import "./App.css";
import { Link, useNavigate} from "react-router-dom";

// remaining : connect with backend


function Register() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rePassword, setRePassword] = useState("");
    const [error, setError] = useState("");

    const handleRegister = (e) => {
        e.preventDefault()
        setError("");

        if (!username) { setError("Please enter username !"); return; }
        if (!password) { setError("Please enter password !"); return; }
        if (!rePassword) { setError("Please re-enter password !"); return; }
        if (password.length < 4) { setError("Password must be at least 4 characters !"); return; }
        if (password !== rePassword) { setError("Passwords do not match !"); return; }

        const payload = { username, password, rePassword };
        console.log("Payload:", payload);

        navigate("/create-room");
    };

    return (
        <>
        <div className="background">
            <h1 className="head-name">WHAT WE EAT</h1>
            <div className="box" style={{ height: "460px" }}>
            <form className="form" onSubmit={handleRegister}>

            {/* username */}
            <label htmlFor="username" className="font-normal block mb-3">Username</label>
            <input type="text"
                   className="n-container"
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}/>

            {/* password */}
            <label htmlFor="password" className="font-normal block mb-3">Password</label>
            <input type="password"
                   id="password"
                   value={password}
                   className="n-container"
                   onChange={(e) => setPassword(e.target.value)}/>

            {/* re-enter password */}
            <label htmlFor="repassword" className="font-normal block mb-3">Re-Enter Password</label>
            <input type="password"
                   id="repassword"
                   className="n-container"
                   value={rePassword}
                   onChange={(e) => setRePassword(e.target.value)}/>

            {/* error text */}
            <div style={{ minHeight: "20px", marginBottom: "-25px", marginTop: "2px", color: "red", textAlign: "center" }}>
            {error && error}</div>

            {/* register button */}
            <button className="green small-btn shadow"
                    type="submit">Register</button>
            </form>

            {/* login thin button */}
            <p className="font-normal" style={{ margin: "-5px auto" }}>
                Already have an Account?<Link to="/login" className="thin-button">Login</Link>
            </p>
            </div>
        </div>
        </>
    );
}

export default Register;
