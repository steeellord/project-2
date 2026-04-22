import React from 'react';
import { Home, MessageSquare, Camera, User, Globe } from 'lucide-react';

const BottomNav = ({ activeTab, setActiveTab, t, setShowLangModal }) => (
    <nav className="nav-bar">
        <div
            className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
        >
            <Home size={24} />
            <span>{t.homeTab}</span>
        </div>
        <div
            className={`nav-item ${activeTab === 'chatbot' ? 'active' : ''}`}
            onClick={() => setActiveTab('chatbot')}
        >
            <MessageSquare size={24} />
            <span>{t.expertTab}</span>
        </div>
        <div
            className={`nav-item ${activeTab === 'scan' ? 'active' : ''}`}
            onClick={() => setActiveTab('scan')}
        >
            <Camera size={24} />
            <span>{t.scanTab}</span>
        </div>
        <div
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
        >
            <User size={24} />
            <span>{t.profileTab}</span>
        </div>
    </nav>
);

export default BottomNav;
