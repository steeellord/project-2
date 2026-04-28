import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, Leaf, AlertTriangle, CheckCircle, Loader, MessageSquare, BookmarkPlus, RefreshCw, Zap, X, Circle } from 'lucide-react';

const apiUrl = () => import.meta.env.DEV ? `http://${window.location.hostname}:5001` : '';

const Scan = ({ t, setActiveTab }) => {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [camError, setCamError] = useState('');
    const [facing, setFacing] = useState('environment');
    const fileRef = useRef();
    const videoRef = useRef();
    const streamRef = useRef(null);
    const canvasRef = useRef();

    const handleFile = (file) => {
        if (!file) return;
        setImage(file);
        setPreview(URL.createObjectURL(file));
        setResult(null);
        setError('');
        setSaved(false);
    };

    const handlePredict = async () => {
        if (!image) { setError('Please select an image first.'); return; }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const fd = new FormData();
            fd.append('file', image);
            const res = await fetch(`${apiUrl()}/predict`, { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Prediction failed');
            setResult(data);
        } catch (e) {
            setError(e.message || 'Could not reach server.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const userId = localStorage.getItem('userId');
        if (!userId || !result) return;
        try {
            await fetch(`${apiUrl()}/save_scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, plant: result.plant, disease: result.disease, confidence: result.confidence })
            });
            setSaved(true);
        } catch (e) { console.error(e); }
    };

    const reset = () => { setImage(null); setPreview(null); setResult(null); setError(''); setSaved(false); };

    // ── Camera helpers ────────────────────────────────────────────────
    const startCamera = useCallback(async (facingMode = facing) => {
        setCamError('');
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) {
            setCamError('Camera access denied. Please allow camera permissions and try again.');
        }
    }, [facing]);

    const openCamera = async () => {
        setShowCamera(true);
        await startCamera();
    };

    const closeCamera = () => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setShowCamera(false);
        setCamError('');
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext('2d').drawImage(video, 0, 0);
        canvas.toBlob(blob => {
            if (!blob) return;
            const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
            handleFile(file);
            closeCamera();
        }, 'image/jpeg', 0.92);
    };

    const flipCamera = async () => {
        const next = facing === 'environment' ? 'user' : 'environment';
        setFacing(next);
        await startCamera(next);
    };

    const isHealthy = result && result.disease && result.disease.toLowerCase() === 'healthy';
    const conf = result?.confidence || 0;

    return (
        <div style={{ paddingBottom: '100px', background: '#f5f7f5', minHeight: '100vh' }}>

            {/* Hero header */}
            <div style={{
                background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #43A047 100%)',
                padding: '28px 20px 40px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* decorative circles */}
                <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 8 }}>
                        <Zap size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, color: 'white', fontSize: 20, fontWeight: 700 }}>
                            {t.scanTitle || 'Crop Scanner'}
                        </h1>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                            AI-powered plant disease detection
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ padding: '0 16px', marginTop: -20 }}>

                {/* Upload card */}
                <div style={{
                    background: 'white',
                    borderRadius: 20,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                    marginBottom: 16
                }}>
                    {/* Preview / Upload zone */}
                    <div
                        onClick={() => !preview && fileRef.current.click()}
                        style={{
                            position: 'relative',
                            minHeight: preview ? 'auto' : 220,
                            background: preview ? '#000' : 'linear-gradient(145deg, #f1f8f1, #e8f5e9)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: preview ? 'default' : 'pointer',
                            overflow: 'hidden'
                        }}
                    >
                        {preview ? (
                            <>
                                <img src={preview} alt="Leaf" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s' }} />
                                {loading && (
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        gap: 12
                                    }}>
                                        <div style={{
                                            width: 64, height: 64, borderRadius: '50%',
                                            border: '3px solid rgba(76,175,80,0.3)',
                                            borderTop: '3px solid #4CAF50',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        <span style={{ color: 'white', fontWeight: 600, fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                                            Analysing leaf…
                                        </span>
                                    </div>
                                )}
                                {/* Scanner corners */}
                                {!loading && !result && (
                                    <div style={{ position: 'absolute', inset: 12 }}>
                                        {[['top:0,left:0','borderTop,borderLeft'],['top:0,right:0','borderTop,borderRight'],
                                          ['bottom:0,left:0','borderBottom,borderLeft'],['bottom:0,right:0','borderBottom,borderRight']].map(([pos, borders], idx) => {
                                            const s = {};
                                            pos.split(',').forEach(p => { const [k,v] = p.split(':'); s[k]=v; });
                                            borders.split(',').forEach(b => { s[b]='2px solid #4CAF50'; });
                                            return <div key={idx} style={{ position:'absolute', width:20, height:20, ...s }} />;
                                        })}
                                    </div>
                                )}
                                {/* Change photo button */}
                                {!loading && (
                                    <button onClick={reset} style={{
                                        position: 'absolute', top: 10, right: 10,
                                        background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                                        width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', backdropFilter: 'blur(4px)'
                                    }}>
                                        <RefreshCw size={16} color="white" />
                                    </button>
                                )}
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                                <div style={{
                                    width: 72, height: 72, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(76,175,80,0.3)'
                                }}>
                                    <Leaf size={32} color="white" />
                                </div>
                                <p style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 16, margin: '0 0 6px' }}>
                                    Upload a Leaf Photo
                                </p>
                                <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
                                    Clear, well-lit photos give the best results
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ padding: '14px 16px', display: 'flex', gap: 10 }}>
                        <button onClick={openCamera} style={{
                            flex: 1, padding: '11px 0', borderRadius: 12,
                            border: '1.5px solid #e0e0e0', background: 'white',
                            color: '#555', fontWeight: 600, fontSize: 13,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}>
                            <Camera size={17} color="#4CAF50" /> Camera
                        </button>
                        <button onClick={() => fileRef.current.click()} style={{
                            flex: 1, padding: '11px 0', borderRadius: 12,
                            border: '1.5px solid #e0e0e0', background: 'white',
                            color: '#555', fontWeight: 600, fontSize: 13,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            cursor: 'pointer'
                        }}>
                            <Upload size={17} color="#4CAF50" /> Gallery
                        </button>
                        <button onClick={handlePredict} disabled={!image || loading} style={{
                            flex: 2, padding: '11px 0', borderRadius: 12,
                            border: 'none',
                            background: image && !loading
                                ? 'linear-gradient(135deg, #4CAF50, #2E7D32)'
                                : '#e0e0e0',
                            color: image && !loading ? 'white' : '#aaa',
                            fontWeight: 700, fontSize: 14,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            cursor: image && !loading ? 'pointer' : 'not-allowed',
                            boxShadow: image && !loading ? '0 4px 12px rgba(76,175,80,0.35)' : 'none',
                            transition: 'all 0.2s'
                        }}>
                            {loading ? <Loader size={17} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={17} />}
                            {loading ? 'Scanning…' : 'Scan Now'}
                        </button>
                    </div>
                </div>

                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {error && (
                    <div style={{
                        background: '#fff3e0', borderLeft: '4px solid #FF9800',
                        borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                        fontSize: 13, color: '#E65100', display: 'flex', gap: 8, alignItems: 'flex-start'
                    }}>
                        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
                    </div>
                )}

                {/* Result card */}
                {result && (
                    <div style={{
                        background: 'white',
                        borderRadius: 20,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                        overflow: 'hidden',
                        marginBottom: 16,
                        animation: 'slideUp 0.4s ease'
                    }}>
                        {/* Result header */}
                        <div style={{
                            background: isHealthy
                                ? 'linear-gradient(135deg, #1B5E20, #2E7D32)'
                                : 'linear-gradient(135deg, #BF360C, #E64A19)',
                            padding: '20px 20px 24px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 52, height: 52, borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {isHealthy
                                        ? <CheckCircle size={28} color="white" />
                                        : <AlertTriangle size={28} color="white" />
                                    }
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                                        Plant Detected
                                    </div>
                                    <div style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{result.plant}</div>
                                    <div style={{
                                        display: 'inline-block',
                                        background: 'rgba(255,255,255,0.2)',
                                        color: 'white', fontSize: 12, fontWeight: 600,
                                        padding: '2px 10px', borderRadius: 99, marginTop: 4
                                    }}>
                                        {isHealthy ? '✅ Healthy' : `⚠️ ${result.disease}`}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Confidence bar */}
                        {conf > 0 && (
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>Model Confidence</span>
                                    <span style={{
                                        fontSize: 13, fontWeight: 700,
                                        color: conf >= 70 ? '#2E7D32' : conf >= 40 ? '#F57C00' : '#c62828'
                                    }}>{conf}%</span>
                                </div>
                                <div style={{ height: 8, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', borderRadius: 99,
                                        width: `${conf}%`,
                                        background: conf >= 70
                                            ? 'linear-gradient(90deg,#4CAF50,#81C784)'
                                            : conf >= 40
                                                ? 'linear-gradient(90deg,#FF9800,#FFB74D)'
                                                : 'linear-gradient(90deg,#F44336,#EF9A9A)',
                                        transition: 'width 1s ease'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#bbb' }}>
                                    <span>Low</span><span>Medium</span><span>High</span>
                                </div>
                            </div>
                        )}

                        {/* Advice chip */}
                        {!isHealthy && (
                            <div style={{ padding: '12px 20px', background: '#FFF8E1', borderBottom: '1px solid #f0f0f0' }}>
                                <p style={{ margin: 0, fontSize: 13, color: '#795548' }}>
                                    💡 <strong>Tip:</strong> Use the AI chat below to get detailed treatment advice for this disease.
                                </p>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ padding: '14px 16px', display: 'flex', gap: 10 }}>
                            <button onClick={handleSave} disabled={saved} style={{
                                flex: 1, padding: '11px 0', borderRadius: 12,
                                border: saved ? '1.5px solid #a5d6a7' : 'none',
                                background: saved ? '#e8f5e9' : '#4CAF50',
                                color: saved ? '#4CAF50' : 'white',
                                fontWeight: 600, fontSize: 13,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                cursor: saved ? 'default' : 'pointer',
                                transition: 'all 0.3s'
                            }}>
                                <BookmarkPlus size={16} />
                                {saved ? 'Saved!' : 'Save'}
                            </button>
                            <button onClick={() => {
                                localStorage.setItem('plantData', JSON.stringify({ plant: result.plant, disease: result.disease }));
                                setActiveTab('chatbot');
                            }} style={{
                                flex: 2, padding: '11px 0', borderRadius: 12, border: 'none',
                                background: 'linear-gradient(135deg, #1565C0, #1976D2)',
                                color: 'white', fontWeight: 600, fontSize: 13,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                cursor: 'pointer', boxShadow: '0 4px 12px rgba(21,101,192,0.3)'
                            }}>
                                <MessageSquare size={16} /> Ask AI Expert
                            </button>
                        </div>
                    </div>
                )}

                {/* Tips card (shown when no result yet) */}
                {!result && !loading && (
                    <div style={{
                        background: 'white', borderRadius: 20,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                        padding: '18px 20px'
                    }}>
                        <p style={{ fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px', fontSize: 14 }}>📸 Tips for best results</p>
                        {[
                            ['🌿', 'Focus on a single affected leaf'],
                            ['☀️', 'Use good lighting — avoid shadows'],
                            ['📐', 'Fill the frame with the leaf'],
                            ['🔍', 'Capture both healthy and diseased areas'],
                        ].map(([icon, tip]) => (
                            <div key={tip} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: 16 }}>{icon}</span>
                                <span style={{ color: '#555', fontSize: 13 }}>{tip}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Live Camera Modal ── */}
            {showCamera && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.95)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                    {/* Close */}
                    <button onClick={closeCamera} style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                        width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', backdropFilter: 'blur(4px)'
                    }}>
                        <X size={22} color="white" />
                    </button>

                    <div style={{ color: 'white', fontSize: 14, fontWeight: 600, marginBottom: 16, opacity: 0.75 }}>
                        Point camera at a leaf
                    </div>

                    {camError ? (
                        <div style={{ color: '#FF8A65', textAlign: 'center', padding: '20px 32px', fontSize: 14 }}>
                            <AlertTriangle size={32} style={{ marginBottom: 12 }} />
                            <p>{camError}</p>
                            <p style={{ opacity: 0.7, fontSize: 12 }}>Use Gallery instead to upload from your files.</p>
                        </div>
                    ) : (
                        <div style={{ position: 'relative', width: '100%', maxWidth: 500 }}>
                            {/* Viewfinder corners */}
                            {['tl','tr','bl','br'].map(c => (
                                <div key={c} style={{
                                    position: 'absolute', width: 28, height: 28, zIndex: 2,
                                    ...(c.includes('t') ? { top: 12 } : { bottom: 12 }),
                                    ...(c.includes('l') ? { left: 12 } : { right: 12 }),
                                    borderTop: c.includes('t') ? '3px solid #4CAF50' : 'none',
                                    borderBottom: c.includes('b') ? '3px solid #4CAF50' : 'none',
                                    borderLeft: c.includes('l') ? '3px solid #4CAF50' : 'none',
                                    borderRight: c.includes('r') ? '3px solid #4CAF50' : 'none',
                                }} />
                            ))}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{ width: '100%', borderRadius: 12, maxHeight: '60vh', objectFit: 'cover', display: 'block' }}
                            />
                        </div>
                    )}

                    {/* Controls */}
                    <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginTop: 28 }}>
                        <button onClick={flipCamera} style={{
                            background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
                            width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer'
                        }}>
                            <RefreshCw size={20} color="white" />
                        </button>
                        <button onClick={capturePhoto} disabled={!!camError} style={{
                            width: 72, height: 72, borderRadius: '50%', border: '4px solid white',
                            background: camError ? '#555' : 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: camError ? 'not-allowed' : 'pointer',
                            boxShadow: '0 0 0 3px rgba(255,255,255,0.3)'
                        }}>
                            <Circle size={34} color={camError ? '#888' : '#4CAF50'} fill={camError ? '#888' : '#4CAF50'} />
                        </button>
                        <div style={{ width: 48 }} />
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
            `}</style>
        </div>
    );
};

export default Scan;
