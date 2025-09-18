import { useState } from 'react';
import "./App.css";


function Login() {

    const [password, setPassword] = useState("");

    return (
        <>
        <div className="background">
            <h1 className="head-name">WHAT WE EAT</h1>
            <div className="box" style={{height: '370px'}}>
                {/* username - email */}
                <p className="font-normal">Username / Email</p>
                <input className="n-container"></input>

                {/* password */}
                <p className="font-normal">Password</p>
                <input className="n-container"></input>

                {/* check box */}
                <label style={{
                       color: "#603A2B",
                       fontSize: "16px",
                       fontWeight: "normal",
                       display: "inline-flex",
                       alignItems: "center",
                       gap: "1px",
                       marginTop: "15px",
                       cursor: 'pointer',
                       }}><input type="checkbox" />Remember me</label>

                {/* login button */}
                <button className="green small-btn shadow" 
                        style={{marginTop: '15px'}}>
                Login</button>

                {/* register thin button */}
                <p className="font-normal" style={{ margin: "-5px auto" }}>
                Don't have an Account?{" "}
                <a className="thin-button">Register</a></p>
            </div>

            {/* guest thin button */}
            <p className="font-normal" style={{color: 'white', margin: "15px auto" }}>
            Don't want to login?{" "}
            <a className="white-thin-button">
            Stay as a guest</a></p>

            {/* forget password */}
            <p className="font-normal" style={{margin: "0px auto" }}>
            <a className="white-thin-button">
            Forget Password?</a></p>
        </div>
        </>
    );
}

export default Login;
