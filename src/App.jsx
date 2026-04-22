import React, { useState } from 'react';
import Home from './components/Home';
import Chatbot from './components/Chatbot';
import Scan from './components/Scan';
import Profile from './components/Profile';
import BottomNav from './components/BottomNav';
import Auth from './components/Auth';
import { Check } from 'lucide-react';

const translations = {
    en: {
        appName: "Crop Identifier", subtitle: "Smart solutions for modern farming",
        bannerTitle: "Healthy Farms, High Yield", bannerSub: "Detect diseases instantly using our AI-powered scanner.",
        scanned: "Crops Scanned", alerts: "Health Alerts",
        quickActions: "Quick Actions", scanCrop: "Scan Crop", expert: "AI Expert", healthCheck: "Health Check", guideMain: "Farming Guide",
        advice: "Farming Guide & Advice",
        guide1Title: "Mustard Aphid Control", guide1Desc: "Preventive measures for mustard crops during winter.",
        guide2Title: "Soil Health Optimization", guide2Desc: "Balancing nitrogen and pH levels for maximum maize yield.",
        guide3Title: "Organic Pest Management", guide3Desc: "Natural remedies to protect your tomatoes from aphids.",
        expertTitle: "Agriculture Expert", chatPlaceholder: "Ask about your crops...",
        scanTitle: "Crop Scanner", pointCamera: "Point at a plant leaf", openCamera: "Open Camera", status: "Status: Waiting for input...",
        profileName: "Abhishek", profileEmail: "abhishek.primary@farm.com",
        points: "Points", expertLbl: "Expert", badges: "Badges",
        history: "Scan History", saved: "Saved Solutions", lang: "Language", settings: "Account Settings", help: "Help & Support", logout: "Logout",
        homeTab: "Home", expertTab: "Expert", scanTab: "Scan", profileTab: "Profile"
    },
    hi: {
        appName: "फसल पहचान", subtitle: "आधुनिक खेती के स्मार्ट समाधान",
        bannerTitle: "स्वस्थ खेत, उच्च उपज", bannerSub: "हमारे AI स्कैनर से तुरंत बीमारियों का पता लगाएं।",
        scanned: "फसलें स्कैन की गईं", alerts: "स्वास्थ्य अलर्ट",
        quickActions: "त्वरित कार्य", scanCrop: "फसल स्कैन", expert: "AI विशेषज्ञ", healthCheck: "स्वास्थ्य जांच", guideMain: "खेती गाइड",
        advice: "खेती गाइड और सलाह",
        guide1Title: "सरसों में माहू नियंत्रण", guide1Desc: "सर्दियों के दौरान सरसों की फसल के लिए निवारक उपाय।",
        guide2Title: "मिट्टी स्वास्थ्य अनुकूलन", guide2Desc: "मक्के की अधिकतम उपज के लिए नाइट्रोजन और pH संतुलन।",
        guide3Title: "जैविक कीट प्रबंधन", guide3Desc: "टमाटरों को एफिड्स से बचाने के प्राकृतिक उपाय।",
        expertTitle: "कृषि विशेषज्ञ", chatPlaceholder: "अपनी फसलों के बारे में पूछें...",
        scanTitle: "फसल स्कैनर", pointCamera: "पौधे की पत्ती पर पॉइंट करें", openCamera: "कैमरा खोलें", status: "स्थिति: इनपुट की प्रतीक्षा...",
        profileName: "अभिषेक", profileEmail: "abhishek.primary@farm.com",
        points: "अंक", expertLbl: "विशेषज्ञ", badges: "बैज",
        history: "स्कैन इतिहास", saved: "सहेजे गए समाधान", lang: "भाषा", settings: "खाता सेटिंग", help: "मदद और सहायता", logout: "लॉग आउट",
        homeTab: "होम", expertTab: "विशेषज्ञ", scanTab: "स्कैन", profileTab: "प्रोफ़ाइल"
    },
    ta: {
        appName: "பயிர் அடையாளம்", subtitle: "நவீன விவசாயத்திற்கான தீர்வுகள்",
        bannerTitle: "ஆரோக்கியமான பண்ணை, அதிக விளைச்சல்", bannerSub: "AI ஸ்கேனர் மூலம் நோய்களை கண்டறியவும்.",
        scanned: "பயிர்கள்", alerts: "எச்சரிக்கைகள்",
        quickActions: "விரைவான செயல்கள்", scanCrop: "பயிர் ஸ்கேன்", expert: "AI நிபுணர்", healthCheck: "சுகாதார சோதனை", guideMain: "விவசாய வழிகாட்டி",
        advice: "விவசாய வழிகாட்டி", guide1Title: "கடுகு அசுவினி கட்டுப்பாடு", guide1Desc: "குளிர்காலத்தில் கடுகு பயிர்களுக்கான தடுப்பு நடவடிக்கைகள்.",
        guide2Title: "மண் ஆரோக்கியம்", guide2Desc: "அதிக விளைச்சலுக்கு நைட்ரஜன் சமநிலை.",
        guide3Title: "இயற்கை பூச்சி மேலாண்மை", guide3Desc: "தக்காளியை பாதுகாக்க இயற்கை வைத்தியம்.",
        expertTitle: "விவசாய நிபுணர்", chatPlaceholder: "கேள்விகளை கேட்கவும்...",
        scanTitle: "ஸ்கேனர்", pointCamera: "இலையை காட்டவும்", openCamera: "கேமரா திற", status: "காத்திருக்கிறது...",
        profileName: "அபிஷேக்", profileEmail: "abhishek.primary@farm.com",
        points: "புள்ளிகள்", expertLbl: "நிபுணர்", badges: "பதக்கங்கள்",
        history: "வரலாறு", saved: "சேமிக்கப்பட்டவை", lang: "மொழி", settings: "அமைப்புகள்", help: "உதவி", logout: "வெளியேறு",
        homeTab: "முகப்பு", expertTab: "நிபுணர்", scanTab: "ஸ்கேன்", profileTab: "சுயவிவரம்"
    }
};

const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ta', name: 'தமிழ்' }
];

const App = () => {
    const [activeTab, setActiveTab] = useState('home');
    const [lang, setLang] = useState('en');
    const [showLangModal, setShowLangModal] = useState(false);

    const [userId, setUserId] = useState(localStorage.getItem('userId') || null);
    const [userName, setUserName] = useState(localStorage.getItem('userName') || "Abhishek");

    const t = translations[lang];

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <Home t={t} setActiveTab={setActiveTab} />;
            case 'chatbot': return <Chatbot t={t} lang={lang} />;
            case 'scan': return <Scan t={t} setActiveTab={setActiveTab} />;
            case 'profile': return <Profile t={t} userName={userName} setUserName={setUserName} setShowLangModal={setShowLangModal} setActiveTab={setActiveTab} />;
            default: return <Home t={t} setActiveTab={setActiveTab} />;
        }
    };

    if (!userId) {
        return <Auth setUserId={setUserId} setUserName={setUserName} />;
    }

    return (
        <div className="app-container">
            <div className="content">
                {renderContent()}
            </div>
            <BottomNav
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                t={t}
                setShowLangModal={setShowLangModal}
            />
            {showLangModal && (
                <div className="modal-overlay" onClick={() => setShowLangModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">Select Language</h3>
                        {languages.map(l => (
                            <div
                                key={l.code}
                                className={`lang-option ${lang === l.code ? 'selected' : ''}`}
                                onClick={() => {
                                    setLang(l.code);
                                    setShowLangModal(false);
                                }}
                            >
                                {l.name}
                                {lang === l.code && <Check size={20} color="var(--primary)" />}
                            </div>
                        ))}
                        <button className="modal-close" onClick={() => setShowLangModal(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
