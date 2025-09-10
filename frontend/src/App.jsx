import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    // Call backend API
    fetch("http://localhost:4001/api/hello") 
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => {
        console.error("Error fetching backend:", err);
        setMessage("Error: could not connect to backend");
      });
  }, []);

  return (
    <div style={{ fontFamily: "Arial", textAlign: "center", marginTop: "50px" }}>
      <h1>Frontend is running ✅</h1>
      <p>Backend says: <strong>{message}</strong></p>
    </div>
  );
}

export default App;
