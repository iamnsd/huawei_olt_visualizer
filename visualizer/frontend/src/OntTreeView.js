import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const OntTreeView = () => {
    const navigate = useNavigate();
    const [interfaces, setInterfaces] = useState([]);
    const [trees, setTrees] = useState([]);
    const [selectedInterface, setSelectedInterface] = useState("");
    const [selectedTree, setSelectedTree] = useState("");
    const [onts, setOnts] = useState([]);
    const [signals, setSignals] = useState({});

    useEffect(() => {
        fetch("http://192.168.250.155:5000/api/interfaces")
            .then((res) => res.json())
            .then((data) => setInterfaces(data));
    }, []);

    useEffect(() => {
        if (selectedInterface) {
            fetch(`http://192.168.250.155:5000/api/trees?interface=${selectedInterface}`)
                .then((res) => res.json())
                .then((data) => setTrees(data));
        } else {
            setTrees([]);
        }
    }, [selectedInterface]);

    const handleShow = () => {
        if (window.signalController) {
            window.signalController.abort();
        }

        window.signalController = new AbortController();
        const { signal } = window.signalController;

        fetch(`http://192.168.250.155:5000/api/onts?interface=${selectedInterface}&tree=${selectedTree}`)
            .then((res) => res.json())
            .then((data) => {
                setOnts(data);
                setSignals({});

                data.forEach((ont) => {
                    fetch(`http://192.168.250.155:5000/signal?oid=${ont.oid}`, { signal })
                        .then((res) => res.json())
                        .then((signalData) => {
                            setSignals((prevSignals) => ({
                                ...prevSignals,
                                [ont.sn]: signalData.signal,
                            }));
                        })
                        .catch((err) => {
                            if (err.name !== "AbortError") {
                                console.error("Ошибка получения сигнала:", err);
                            }
                        });
                });
            });
    };

    const getSignalColor = (signal) => {
        if (signal === undefined) return "#ccc";
        if (signal > 0) return '#ccc';
        if (signal >= -17) return 'green';
        if (signal >= -20) return 'blue';
        if (signal >= -25) return 'orange';
        return "red";
    };

    return (
        <div style={{ padding: 20, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h1 style={{ fontSize: "24px", margin: 0 }}>Просмотр дерева ONT</h1>
                <button
                    onClick={() => navigate("/")}
                    style={{
                        padding: "10px 20px",
                        fontSize: "16px",
                        backgroundColor: "#6c757d",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                    }}
                >
                    На главную
                </button>
            </div>

            <select
                value={selectedInterface}
                onChange={(e) => setSelectedInterface(e.target.value)}
                style={{ padding: "10px", marginRight: "10px", fontSize: "16px" }}
            >
                <option value="">Выберите интерфейс</option>
                {interfaces.map((intf) => (
                    <option key={intf} value={intf}>{intf}</option>
                ))}
            </select>

            <select
                value={selectedTree}
                onChange={(e) => setSelectedTree(e.target.value)}
                style={{ padding: "10px", marginRight: "10px", fontSize: "16px" }}
                disabled={!selectedInterface}
            >
                <option value="">Выберите дерево</option>
                {trees.map((tree) => (
                    <option key={tree} value={tree}>{tree}</option>
                ))}
            </select>

            <button
                onClick={handleShow}
                style={{
                    padding: "10px 20px",
                    fontSize: "16px",
                    backgroundColor: !selectedInterface || !selectedTree ? "#cccccc" : "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: !selectedInterface || !selectedTree ? "not-allowed" : "pointer",
                }}
                disabled={!selectedInterface || !selectedTree}
            >
                Показать
            </button>

            <div style={{ display: "flex", flexWrap: "wrap", marginTop: "20px", gap: "10px", justifyContent: "center" }}>
                {onts.map((ont) => (
                    <div
                        key={ont.sn}
                        style={{
                            width: "180px",
                            padding: "5px",
                            border: "1px solid #ccc",
                            borderRadius: "10px",
                            textAlign: "center",
                            boxShadow: "2px 2px 10px rgba(0, 0, 0, 0.1)",
                            backgroundColor: "#f9f9f9",
                        }}
                    >
                        <h3 style={{ fontSize: "16px", marginBottom: "5px" }}>{ont.desc}</h3>
                        <p style={{ fontSize: "12px", color: "#555" }}>{ont.sn}</p>
                        <span style={{ color: getSignalColor(signals[ont.sn]), fontWeight: 'bold' }}>
                            {signals[ont.sn] !== undefined ? (
                                signals[ont.sn] > 0 ? (
                                    "offline"
                                ) : (
                                    `${signals[ont.sn]} dBm`
                                )
                            ) : (
                                <span className="loader"></span>
                            )}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OntTreeView;