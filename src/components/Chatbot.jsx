import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, Loader, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

const apiUrl = () => import.meta.env.DEV ? `http://${window.location.hostname}:5001` : '';

// ── Speech helpers ────────────────────────────────────────────────────────────
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = window.speechSynthesis;

const Chatbot = ({ t, lang }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [plantContext, setPlantContext] = useState(null);

    // STT state
    const [listening, setListening] = useState(false);
    const [sttSupported] = useState(!!SpeechRec);
    const recognitionRef = useRef(null);

    // TTS state
    const [speakingId, setSpeakingId] = useState(null); // index of msg being spoken
    const [ttsSupported] = useState(!!synth);

    const bottomRef = useRef();

    // ── lang map ──────────────────────────────────────────────────────────────
    const langMap = { hi: 'hi-IN', ta: 'ta-IN', en: 'en-US' };
    const bcp47 = langMap[lang] || 'en-US';

    // ── Init ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        const stored = localStorage.getItem('plantData');
        if (stored) {
            try {
                const pd = JSON.parse(stored);
                setPlantContext(pd);
                localStorage.removeItem('plantData');
                sendMessage(`Tell me about ${pd.plant} affected by ${pd.disease}. What should I do?`, pd);
            } catch (e) { /* ignore */ }
        } else {
            setMessages([{
                role: 'bot',
                text: t.expertTitle
                    ? `Hello! I'm your ${t.expertTitle}. Ask me anything about crops, diseases, or farming.`
                    : "Hello! I'm your Agriculture Expert. Ask me about crops, diseases, or farming."
            }]);
        }
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // stop TTS when component unmounts
    useEffect(() => () => { synth?.cancel(); }, []);

    // ── Send message ──────────────────────────────────────────────────────────
    const sendMessage = async (text, ctx = plantContext) => {
        if (!text.trim()) return;
        setMessages(prev => [...prev, { role: 'user', text }]);
        setInput('');
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl()}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, plant: ctx?.plant || '', disease: ctx?.disease || '', language: lang || 'en' })
            });
            const data = await res.json();
            const reply = data.reply || 'Sorry, no response.';
            setMessages(prev => [...prev, { role: 'bot', text: reply }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'bot', text: 'Connection error. Check the backend is running.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };

    // ── STT ───────────────────────────────────────────────────────────────────
    const toggleListening = useCallback(() => {
        if (!sttSupported) return;

        if (listening) {
            recognitionRef.current?.stop();
            setListening(false);
            return;
        }

        const rec = new SpeechRec();
        rec.lang = bcp47;
        rec.continuous = false;
        rec.interimResults = true;

        rec.onresult = (e) => {
            let transcript = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                transcript += e.results[i][0].transcript;
            }
            setInput(transcript);
        };

        rec.onend = () => setListening(false);
        rec.onerror = () => setListening(false);

        recognitionRef.current = rec;
        rec.start();
        setListening(true);
    }, [listening, sttSupported, bcp47]);

    // ── TTS ───────────────────────────────────────────────────────────────────
    const speak = useCallback((text, idx) => {
        if (!ttsSupported) return;

        if (speakingId === idx) {
            synth.cancel();
            setSpeakingId(null);
            return;
        }

        synth.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = bcp47;
        utt.rate = 1.0;
        utt.pitch = 1.0;

        // Pick a voice matching the language if possible
        const voices = synth.getVoices();
        const match = voices.find(v => v.lang.startsWith(bcp47.slice(0, 2)));
        if (match) utt.voice = match;

        utt.onend = () => setSpeakingId(null);
        utt.onerror = () => setSpeakingId(null);

        setSpeakingId(idx);
        synth.speak(utt);
    }, [speakingId, ttsSupported, bcp47]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>

            {/* Header */}
            <div style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
                color: 'white',
                borderRadius: '0 0 16px 16px',
                marginBottom: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Bot size={24} />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '16px' }}>{t.expertTitle || 'Agriculture Expert'}</div>
                        <div style={{ fontSize: '12px', opacity: 0.85 }}>● Online</div>
                    </div>
                    {/* TTS / STT availability badges */}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                        {sttSupported && (
                            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '3px 8px', fontSize: 11 }}>
                                🎤 Voice
                            </div>
                        )}
                        {ttsSupported && (
                            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '3px 8px', fontSize: 11 }}>
                                🔊 TTS
                            </div>
                        )}
                    </div>
                </div>
                {plantContext && (
                    <div style={{ marginTop: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px' }}>
                        🌿 Context: {plantContext.plant} — {plantContext.disease}
                    </div>
                )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                        alignItems: 'flex-end',
                        gap: '8px'
                    }}>
                        {/* Avatar */}
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                            background: msg.role === 'user' ? '#4CAF50' : '#e8f5e9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {msg.role === 'user' ? <User size={16} color="white" /> : <Bot size={16} color="#4CAF50" />}
                        </div>

                        {/* Bubble */}
                        <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                background: msg.role === 'user' ? '#4CAF50' : 'white',
                                color: msg.role === 'user' ? 'white' : '#1a1a1a',
                                fontSize: '14px', lineHeight: '1.5',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {msg.text}
                            </div>

                            {/* TTS button for bot messages */}
                            {msg.role === 'bot' && ttsSupported && (
                                <button
                                    onClick={() => speak(msg.text, i)}
                                    title={speakingId === i ? 'Stop speaking' : 'Read aloud'}
                                    style={{
                                        marginTop: 4, background: 'none', border: 'none',
                                        cursor: 'pointer', padding: '2px 4px',
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        color: speakingId === i ? '#4CAF50' : '#aaa',
                                        fontSize: 11, fontWeight: 500
                                    }}
                                >
                                    {speakingId === i
                                        ? <><VolumeX size={13} /> Stop</>
                                        : <><Volume2 size={13} /> Listen</>
                                    }
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Bot size={16} color="#4CAF50" />
                        </div>
                        <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <Loader size={16} color="#4CAF50" style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Quick suggestions */}
            {messages.length <= 1 && (
                <div style={{ padding: '8px 16px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
                    {['Best fertilizer for tomatoes?', 'How to prevent blight?', 'Organic pest control tips'].map(q => (
                        <button key={q} onClick={() => sendMessage(q)} style={{
                            whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: '99px',
                            border: '1px solid #c8e6c9', background: 'white', color: '#4CAF50',
                            fontSize: '12px', cursor: 'pointer', fontWeight: 500
                        }}>{q}</button>
                    ))}
                </div>
            )}

            {/* Input bar */}
            <form onSubmit={handleSubmit} style={{
                padding: '12px 16px',
                display: 'flex', gap: '8px', alignItems: 'center',
                background: 'white', borderTop: '1px solid #f0f0f0'
            }}>
                {/* STT mic button */}
                {sttSupported && (
                    <button
                        type="button"
                        onClick={toggleListening}
                        title={listening ? 'Stop listening' : 'Speak your question'}
                        style={{
                            width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0,
                            background: listening
                                ? 'linear-gradient(135deg, #F44336, #c62828)'
                                : '#f0f0f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: listening ? '0 0 0 4px rgba(244,67,54,0.2)' : 'none',
                            animation: listening ? 'pulse 1.5s infinite' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        {listening
                            ? <MicOff size={17} color="white" />
                            : <Mic size={17} color="#666" />
                        }
                    </button>
                )}

                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={listening ? '🎤 Listening...' : (t.chatPlaceholder || 'Ask about your crops...')}
                    disabled={loading}
                    style={{
                        flex: 1, padding: '11px 16px', borderRadius: '99px',
                        border: listening ? '1.5px solid #F44336' : '1.5px solid #e0e0e0',
                        fontSize: '14px', outline: 'none', background: '#fafafa',
                        transition: 'border-color 0.2s'
                    }}
                />

                <button type="submit" disabled={!input.trim() || loading} style={{
                    width: '44px', height: '44px', borderRadius: '50%', border: 'none',
                    background: input.trim() && !loading ? '#4CAF50' : '#ccc',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', flexShrink: 0,
                    transition: 'background 0.2s'
                }}>
                    <Send size={18} />
                </button>
            </form>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100% { box-shadow: 0 0 0 4px rgba(244,67,54,0.2); } 50% { box-shadow: 0 0 0 8px rgba(244,67,54,0.1); } }
            `}</style>
        </div>
    );
};

export default Chatbot;
