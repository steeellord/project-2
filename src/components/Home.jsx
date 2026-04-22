import React, { useState, useEffect } from 'react';
import { Camera, MessageSquare, ShieldCheck, Bookmark, TrendingUp, Activity, Leaf, ChevronRight, Droplets, Sun, Bug } from 'lucide-react';

const Home = ({ t, setActiveTab }) => {
    const [scansCount, setScansCount] = useState(0);
    const [alertsCount, setAlertsCount] = useState(0);

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
                    setScansCount(data.scans.length);
                    const diseases = data.scans.filter(s => s.disease && s.disease.toLowerCase() !== 'healthy' && s.disease !== 'Unknown').length;
                    setAlertsCount(diseases);
                }
            })
            .catch(console.error);
        }
    }, []);

    return (
        <div>
        <header className="home-header">
            <h1 className="home-title">{t.appName}</h1>
            <p className="home-subtitle">{t.subtitle}</p>
        </header>

        <div className="banner">
            <h2>{t.bannerTitle}</h2>
            <p>{t.bannerSub}</p>
        </div>

        <div className="stats-grid">
            <div className="stat-card">
                <span className="stat-value">{scansCount}</span>
                <p className="stat-label">{t.scanned}</p>
            </div>
            <div className="stat-card">
                <span className="stat-value" style={{ color: '#F44336' }}>{alertsCount}</span>
                <p className="stat-label">{t.alerts}</p>
            </div>
        </div>

        <h3 className="section-title"><TrendingUp size={18} /> {t.quickActions}</h3>
        <div className="quick-actions">
            <div className="action-card" onClick={() => setActiveTab('scan')}>
                <div className="action-icon"><Camera size={24} /></div>
                <span className="action-text">{t.scanCrop}</span>
            </div>
            <div className="action-card" onClick={() => setActiveTab('chatbot')}>
                <div className="action-icon"><MessageSquare size={24} /></div>
                <span className="action-text">{t.expert}</span>
            </div>
        </div>

        <h3 className="section-title"><Bookmark size={18} /> {t.advice}</h3>
        <div className="list-section">
            <div className="guide-card">
                <div className="guide-icon-wrapper">
                    <Droplets size={24} className="guide-svg-icon" />
                </div>
                <div className="guide-content">
                    <div className="guide-title">{t.guide1Title}</div>
                    <div className="guide-desc">{t.guide1Desc}</div>
                </div>
            </div>
            <div className="guide-card">
                <div className="guide-icon-wrapper">
                    <Sun size={24} className="guide-svg-icon" />
                </div>
                <div className="guide-content">
                    <div className="guide-title">{t.guide2Title}</div>
                    <div className="guide-desc">{t.guide2Desc}</div>
                </div>
            </div>
            <div className="guide-card">
                <div className="guide-icon-wrapper">
                    <Bug size={24} className="guide-svg-icon" />
                </div>
                <div className="guide-content">
                    <div className="guide-title">{t.guide3Title}</div>
                    <div className="guide-desc">{t.guide3Desc}</div>
                </div>
            </div>
        </div>
    </div>
    );
};

export default Home;
