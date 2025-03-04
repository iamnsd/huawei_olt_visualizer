import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import SearchONT from "./SearchONT";
import OntTreeView from "./OntTreeView";

const Home = () => {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh", // Устанавливаем высоту на 100% экрана
                padding: 20,
                textAlign: "center",
            }}
        >
            <div style={{ padding: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "15px" }}>
                    <Link to="/search" style={{ textDecoration: "none" }}>
                        <button
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "10px",
                                width: "250px",
                                height: "60px",
                                padding: "12px",
                                fontSize: "18px",
                                fontWeight: "bold",
                                backgroundColor: "#007bff",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                cursor: "pointer",
                                transition: "background 0.3s"
                            }}
                            onMouseOver={(e) => (e.target.style.backgroundColor = "#0056b3")}
                            onMouseOut={(e) => (e.target.style.backgroundColor = "#007bff")}
                        >
                            🔍 Поиск ONT
                        </button>
                    </Link>

                    <Link to="/tree" style={{ textDecoration: "none" }}>
                        <button
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "10px",
                                width: "250px",
                                height: "60px",
                                padding: "12px",
                                fontSize: "18px",
                                fontWeight: "bold",
                                backgroundColor: "#28a745",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                cursor: "pointer",
                                transition: "background 0.3s"
                            }}
                            onMouseOver={(e) => (e.target.style.backgroundColor = "#1e7e34")}
                            onMouseOut={(e) => (e.target.style.backgroundColor = "#28a745")}
                        >
                            🌳 Просмотр дерева
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<SearchONT />} />
                <Route path="/tree" element={<OntTreeView />} />
            </Routes>
        </Router>
    );
}

export default App;