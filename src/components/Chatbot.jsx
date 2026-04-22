import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Volume2, Mic } from 'lucide-react';

const Chatbot = ({ t, lang = 'en' }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [speakingText, setSpeakingText] = useState(null);

    useEffect(() => {
        const data = localStorage.getItem('plantData');
        if (data) {
            const parsed = JSON.parse(data);
            localStorage.removeItem('plantData');
            autoAskAI(parsed);
        }
    }, []);

    const autoAskAI = async (data) => {
        setMessages([{ sender: "user", text: `I found ${data.disease} on my ${data.plant}. What should I do?` }]);
        setLoading(true);
        try {
            const isLocal = import.meta.env.DEV;
            const apiUrl = isLocal ? `http://${window.location.hostname}:5001/chat` : '/chat';

            const res = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, lang })
            });
            const json = await res.json();
            if (json.response) {
                setMessages(prev => [...prev, { sender: "ai", text: json.response }]);
            } else {
                setMessages(prev => [...prev, { sender: "ai", text: "Something went wrong" }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { sender: "ai", text: "Something went wrong" }]);
        }
        setLoading(false);
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input.trim();
        setMessages(prev => [...prev, { sender: "user", text: userMsg }]);
        setInput("");
        setLoading(true);

        try {
            const isLocal = import.meta.env.DEV;
            const apiUrl = isLocal ? `http://${window.location.hostname}:5001/chat` : '/chat';

            const res = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: userMsg, lang })
            });
            const json = await res.json();
            if (json.response) {
                setMessages(prev => [...prev, { sender: "ai", text: json.response }]);
            } else {
                setMessages(prev => [...prev, { sender: "ai", text: "Something went wrong." }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { sender: "ai", text: "Connection error." }]);
        }
        setLoading(false);
    };

    const toggleVoice = (text) => {
        const synth = window.speechSynthesis;
        
        if (speakingText === text && synth.speaking) {
            synth.cancel();
            setSpeakingText(null);
            return;
        }

        synth.cancel(); 
        setSpeakingText(text);
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        let targetVoices = synth.getVoices();
        
        if (lang === 'en') {
            const highQualityVoice = targetVoices.find(v => v.lang === 'en-US' && (v.name.includes('Samantha') || v.name.includes('Google'))) || targetVoices.find(v => v.lang === 'en-US');
            if (highQualityVoice) utterance.voice = highQualityVoice;
            utterance.rate = 0.9;
        } else {
            utterance.lang = lang === 'hi' ? 'hi-IN' : 'ta-IN';
            utterance.rate = 0.9;
        }
        
        utterance.onend = () => setSpeakingText(null);
        synth.speak(utterance);
    };

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Your browser does not support Speech Recognition. Please try Chrome or Safari!");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-US';
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            setInput(transcript);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 className="section-title"><MessageSquare size={20} /> {t.expertTitle}</h2>
            
            <div className="chat-area" style={{ flex: 1, overflowY: 'auto', paddingBottom: 20, justifyContent: 'flex-start', alignItems: 'stretch' }}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: 40 }}>
                        <MessageSquare size={48} strokeWidth={1} style={{ opacity: 0.3, margin: '0 auto' }} />
                        <p style={{ marginTop: 12, fontSize: 14 }}>{t.chatPlaceholder}</p>
                    </div>
                ) : (
                    messages.map((m, i) => (
                        <div key={i} style={{ 
                            background: m.sender === 'user' ? 'var(--primary)' : 'var(--white)', 
                            color: m.sender === 'user' ? 'white' : 'var(--text)', 
                            padding: 12, 
                            borderRadius: 12, 
                            marginBottom: 8,
                            alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            border: m.sender === 'user' ? 'none' : '1px solid var(--border)'
                        }}>
                            <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{m.text}</div>
                            {m.sender === 'ai' && (
                                <button onClick={() => toggleVoice(m.text)} style={{ cursor: 'pointer', background: 'none', border: 'none', marginTop: 10, color: speakingText === m.text ? '#F44336' : 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, backgroundColor: speakingText === m.text ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)', transition: '0.2s all' }}>
                                    <Volume2 size={16} /> <span style={{ fontSize: 13, fontWeight: 500 }}>{speakingText === m.text ? 'Stop Listening' : 'Listen Native'}</span>
                                </button>
                            )}
                        </div>
                    ))
                )}
                {loading && <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Thinking...</div>}
            </div>

            <div className="chat-input-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mic 
                    className="mic-btn" 
                    size={20} 
                    onClick={startListening} 
                    style={{ 
                        color: isListening ? '#F44336' : 'var(--primary)', 
                        cursor: 'pointer',
                        padding: '10px',
                        background: 'rgba(76, 175, 80, 0.1)',
                        borderRadius: '12px',
                        minWidth: '40px',
                        height: '40px'
                    }} 
                />
                <input 
                    type="text" 
                    className="chat-input" 
                    placeholder={isListening ? "Listening..." : t.chatPlaceholder} 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSend()}
                    style={{ flex: 1 }}
                />
                <Send className="send-btn" size={20} onClick={handleSend} />
            </div>
        </div>
    );
};

export default Chatbot;
