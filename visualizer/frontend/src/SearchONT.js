import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function App() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedONT, setSelectedONT] = useState(null);
    const [profileDetails, setProfileDetails] = useState(null);

    const getSignalColor = (signalLevel) => {
        if (signalLevel >= -17) return 'green';
        if (signalLevel >= -20) return 'blue';
        if (signalLevel >= -25) return 'orange';
        return 'red';
    };

    const searchONT = async (q) => {
        setQuery(q);
        if (q.length < 2) return setResults([]);
        const { data } = await axios.get(`http://192.168.250.155:5000/search?q=${q}`);
        setResults(data);
    };

    const fetchONTDetails = async (id) => {
        const { data } = await axios.get(`http://192.168.250.155:5000/ont/${id}`);
        setSelectedONT(data);
        setQuery('');
        setResults([]);
        setProfileDetails(null);
    };

    const fetchProfileDetails = async (profileId) => {
        const { data } = await axios.get(`http://192.168.250.155:5000/profile/${profileId}`);
        setProfileDetails(data);
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h1 style={{ margin: 0 }}>Поиск ONT</h1>
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

            <input
                type="text"
                placeholder="Введите описание ONT..."
                value={query}
                onChange={(e) => searchONT(e.target.value)}
                style={{ width: "350px", padding: 8, fontSize: 16 }}
            />
            <ul style={{ listStyle: "none", padding: 0 }}>
                {results.map((ont) => (
                    <li
                        key={ont.id}
                        onClick={() => fetchONTDetails(ont.id)}
                        style={{ width: "350px", cursor: "pointer", padding: 8, borderBottom: "1px solid #ccc" }}
                    >
                        {ont.desc}
                    </li>
                ))}
            </ul>

            <div style={{ display: "flex", gap: "20px", marginTop: 20 }}>
                {selectedONT && (
                    <div
                        style={{
                            padding: 15,
                            borderRadius: 10,
                            border: "1px solid #ddd",
                            backgroundColor: "#f9f9f9",
                            boxShadow: "2px 2px 10px rgba(0,0,0,0.1)",
                            minWidth: "300px"
                        }}
                    >
                        <h2>{selectedONT.desc}</h2>
                        {selectedONT.signalLevel !== undefined && (
                            <p>
                                <strong>Сигнал:</strong>{' '}
                                {selectedONT.signalLevel > 0 ? (
                                    <span style={{ color: 'gray', fontWeight: 'bold' }}>offline</span>
                                ) : (
                                    <span style={{ color: getSignalColor(selectedONT.signalLevel), fontWeight: 'bold' }}>
                                        {selectedONT.signalLevel} dBm
                                    </span>
                                )}
                            </p>
                        )}
                        <p><strong>Серийный номер:</strong> {selectedONT.sn}</p>
                        <p><strong>Интерфейс:</strong> gpon 0/{selectedONT.interface}</p>
                        <p><strong>Дерево:</strong> {selectedONT.tree}</p>
                        <p><strong>Номер ONT:</strong> {selectedONT.ont_id}</p>
                        <p>
                            <strong>Линейный профиль:</strong>
                            <button
                                onClick={() => fetchProfileDetails(selectedONT.lineprofile)}
                                style={{
                                    marginLeft: 10,
                                    padding: '5px 10px',
                                    cursor: 'pointer',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px'
                                }}
                            >
                                {selectedONT.lineprofile}
                            </button>
                        </p>

                        {selectedONT.vlans && selectedONT.vlans.length > 0 && (
                            <div style={{ marginTop: 20, paddingTop: 10, borderTop: "1px solid #ccc" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>Порт</th>
                                            <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>VLAN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedONT.vlans.map((port) => (
                                            <tr key={port.eth}>
                                                <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>{port.eth}</td>
                                                <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>{port.vlan}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {selectedONT.servicePorts && selectedONT.servicePorts.length > 0 && (
                            <div style={{ marginTop: 20, paddingTop: 10, borderTop: "1px solid #ccc" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>Service Port ID</th>
                                            <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>GEM Port</th>
                                            <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>VLAN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedONT.servicePorts.map((port) => (
                                            <tr key={port.service_port_id}>
                                                <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>{port.service_port_id}</td>
                                                <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>{port.gemport}</td>
                                                <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>{port.vlan}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {profileDetails && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            padding: 15,
                            borderRadius: 10,
                            border: "1px solid #ddd",
                            backgroundColor: "#f9f9f9",
                            boxShadow: "2px 2px 10px rgba(0,0,0,0.1)",
                            minWidth: "250px",
                            height: "auto"
                        }}
                    >
                        <h2>{profileDetails.name}</h2>
                        <div style={{ flex: 1 }}>
                            {profileDetails.gems && (
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>Номер GEM</th>
                                            <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>VLAN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {profileDetails.gems.map((gem) => (
                                            <tr key={gem.gemport}>
                                                <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>{gem.gem_id}</td>
                                                <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>{gem.vlan}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            <button
                                onClick={() => setProfileDetails(null)}
                                style={{
                                    display: "block",
                                    margin: "10px auto 0",
                                    padding: "8px 12px",
                                    cursor: "pointer",
                                    backgroundColor: "#ff4d4d",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "5px"
                                }}
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;