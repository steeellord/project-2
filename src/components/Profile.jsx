import React, { useState, useEffect } from 'react';
import { History, Settings, LogOut, ChevronRight, Globe, Check, MessageSquare } from 'lucide-react';
import profileImg from '../assets/profile.jpg';

const Profile = ({ t, userName, setUserName, setShowLangModal, setActiveTab }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(userName);
    const [tempEmail, setTempEmail] = useState(localStorage.getItem('userEmail') || t.profileEmail);
    const [currentEmail, setCurrentEmail] = useState(localStorage.getItem('userEmail') || t.profileEmail);
    const [scanHistory, setScanHistory] = useState([]);

    useEffect(() => {
        const userId = localStorage.getItem('userId');
        if (userId) {
            const apiUrl = import.meta.env.DEV ? `http://${window.location.hostname}:5001` : '';
            fetch(`${apiUrl}/get_scans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.scans) {
                    setScanHistory(data.scans);
                }
            })
            .catch(console.error);
        }
    }, []);

    const handleSaveProfile = async () => {
        setUserName(tempName);
        setCurrentEmail(tempEmail);
        localStorage.setItem('userName', tempName);
        localStorage.setItem('userEmail', tempEmail);
        setIsEditing(false);
        const userId = localStorage.getItem('userId');
        try {
            const apiUrl = import.meta.env.DEV ? `http://${window.location.hostname}:5001` : '';
            await fetch(`${apiUrl}/update_profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, name: tempName, email: tempEmail })
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        window.location.reload();
    };

    const handleFollowUp = (scan) => {
        localStorage.setItem('plantData', JSON.stringify({ plant: scan.plant, disease: scan.disease }));
        setActiveTab('chatbot');
    };

    return (
        <div style={{ paddingBottom: '100px' }}>
            <div className="profile-header">
                <img src={profileImg} alt="Profile" className="profile-avatar" />
                {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', marginTop: 8, justifyContent: 'center' }}>
                        <input 
                            type="text" 
                            value={tempName} 
                            onChange={e => setTempName(e.target.value)} 
                            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 16, width: '180px' }}
                            autoFocus
                            placeholder="Full Name"
                        />
                        <input 
                            type="email" 
                            value={tempEmail} 
                            onChange={e => setTempEmail(e.target.value)} 
                            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 16, width: '180px' }}
                            placeholder="Email Address"
                        />
                        <button onClick={handleSaveProfile} style={{ padding: '8px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', width: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <Check size={18} /> Save Settings
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="user-name">{userName}</h2>
                        <p className="user-email">{currentEmail}</p>
                    </>
                )}
            </div>

            <div className="profile-menu">
                <div className="menu-item" onClick={() => setShowLangModal(true)}>
                    <div className="menu-item-icon">
                        <Globe size={20} />
                    </div>
                    <span className="menu-item-text">{t.lang}</span>
                    <ChevronRight className="menu-item-arrow" size={18} />
                </div>
                <div className="menu-item" onClick={() => setIsEditing(true)}>
                    <div className="menu-item-icon">
                        <Settings size={20} />
                    </div>
                    <span className="menu-item-text">{t.settings}</span>
                    <ChevronRight className="menu-item-arrow" size={18} />
                </div>
            </div>

            <div style={{ marginTop: '25px', padding: '0 20px' }}>
                <h3 style={{ marginBottom: '15px', color: '#1a1a1a', fontSize: '18px' }}><History size={18} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }}/> {t.history}</h3>
                <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 2px 15px rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                                <th style={{ padding: '12px 10px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Date</th>
                                <th style={{ padding: '12px 10px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Crop</th>
                                <th style={{ padding: '12px 10px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Diagnoses</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', color: '#666', fontWeight: 600 }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scanHistory.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '24px 10px', textAlign: 'center', color: '#999' }}>No scans recorded yet.</td>
                                </tr>
                            ) : scanHistory.map(scan => (
                                <tr key={scan.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '14px 10px', color: '#555' }}>
                                        {new Date(scan.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </td>
                                    <td style={{ padding: '14px 10px', fontWeight: '500', color: '#333' }}>
                                        {scan.plant.split('_').join(' ')}
                                    </td>
                                    <td style={{ padding: '14px 10px' }}>
                                        <span style={{
                                            background: (!scan.disease || scan.disease.toLowerCase() === 'healthy') ? '#E8F5E9' : '#FFEBEE',
                                            color: (!scan.disease || scan.disease.toLowerCase() === 'healthy') ? '#2E7D32' : '#c62828',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 600
                                        }}>
                                            {(!scan.disease || scan.disease.toLowerCase() === 'healthy') ? 'Healthy' : scan.disease.split('_').join(' ')}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                                        <button 
                                            onClick={() => handleFollowUp(scan)}
                                            style={{ background: '#E8F5E9', color: '#4CAF50', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s' }}
                                        >
                                            <MessageSquare size={14} /> AI
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <button className="btn-logout" onClick={handleLogout} style={{ marginTop: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <LogOut size={18} /> {t.logout}
                </div>
            </button>
        </div>
    );
};

export default Profile;
