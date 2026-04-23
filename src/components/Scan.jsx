import React, { useState, useRef, useEffect } from 'react';
import { Camera } from 'lucide-react';

const Scan = ({ t, setActiveTab }) => {
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [predictionResult, setPredictionResult] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const startCamera = async () => {
        setPredictionResult(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            streamRef.current = stream;
            setIsCameraOn(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Unable to access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOn(false);
    };

    const captureAndPredict = async () => {
        if (!videoRef.current) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        setPredictionResult("Analyzing...");

        canvas.toBlob(async (blob) => {
            if (!blob) {
                setPredictionResult("Error capturing image");
                return;
            }
            
            const formData = new FormData();
            formData.append('file', blob, 'capture.jpg');
            
            try {
                const res = await fetch(`/predict`, {
                    method: 'POST',
                    body: formData,
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Server error");

                if (data.error) {
                    setPredictionResult({ error: data.error });
                } else if (data.confidence < 0.0) {
                    setPredictionResult({ error: "Try clearer image" });
                } else {
                    setPredictionResult(data);
                    
                    const userId = localStorage.getItem('userId');
                    if (userId) {
                        const isLocal = import.meta.env.DEV;
                        const apiUrl = isLocal ? `http://${window.location.hostname}:5001` : '';
                        fetch(`${apiUrl}/save_scan`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId, plant: data.plant, disease: data.disease, confidence: data.confidence })
                        }).catch(err => console.error(err));
                    }
                }
            } catch(e) {
                console.error(e);
                setPredictionResult({ error: e.message || "Something went wrong" });
            }
        }, 'image/jpeg');
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPredictionResult("Analyzing...");
        setIsCameraOn(false);

        const formData = new FormData();
        formData.append('file', file, file.name);
        
        try {
            const isLocal = import.meta.env.DEV;
            const apiUrl = isLocal ? `http://${window.location.hostname}:5001` : '';
            
            const res = await fetch(`${apiUrl}/predict`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Server error");

            
            if (data.error) {
                setPredictionResult({ error: data.error });
            } else if (data.confidence < 0.0) {
                setPredictionResult({ error: "Try clearer image" });
            } else {
                setPredictionResult(data);
                
                // Automatically route telemetry to database
                const userId = localStorage.getItem('userId');
                if (userId) {
                    fetch(`${apiUrl}/save_scan`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, plant: data.plant, disease: data.disease, confidence: data.confidence })
                    }).catch(err => console.error(err));
                }
            }
        } catch(e) {
            console.error(e);
            setPredictionResult({ error: e.message || "Something went wrong" });
        }
    };

    useEffect(() => {
        if (isCameraOn && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraOn]);

    useEffect(() => {
        return () => stopCamera();
    }, []);

    return (
        <div>
            <h2 className="section-title"><Camera size={20} /> {t.scanTitle}</h2>
            <div className="camera-preview" style={{ padding: isCameraOn ? 0 : undefined, overflow: 'hidden' }}>
                {isCameraOn ? (
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline
                        muted 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} 
                    />
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <Camera size={48} style={{ opacity: 0.3 }} />
                        <p style={{ marginTop: 8, fontSize: 14 }}>{t.pointCamera}</p>
                    </div>
                )}
            </div>
            
            {isCameraOn ? (
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-primary" onClick={captureAndPredict} style={{ flex: 2 }}>
                        {t.scanCrop || "Scan Leaf"}
                    </button>
                    <button className="btn-primary" onClick={stopCamera} style={{ backgroundColor: '#ef4444', flex: 1 }}>
                        Stop
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button className="btn-primary" style={{ marginBottom: 0 }} onClick={startCamera}>
                        {t.openCamera}
                    </button>
                    <label className="btn-primary" style={{ textAlign: 'center', backgroundColor: '#555', cursor: 'pointer' }}>
                        Upload from Gallery
                        <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={handleFileUpload} 
                        />
                    </label>
                </div>
            )}

            <div className="prediction-result" style={{ marginTop: 20 }}>
                {predictionResult === "Analyzing..." ? (
                    <span style={{ fontWeight: 'bold' }}>{predictionResult}</span>
                ) : predictionResult && predictionResult.error ? (
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{predictionResult.error}</span>
                ) : predictionResult ? (
                    <div style={{ textAlign: 'left', background: 'var(--white)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                        <p><strong>Plant:</strong> {predictionResult.plant}</p>
                        <p><strong>Disease:</strong> {predictionResult.disease}</p>
                        <p><strong>Confidence:</strong> {(predictionResult.confidence * 100).toFixed(1)}%</p>

                        <button 
                            className="btn-primary" 
                            style={{ marginTop: 16, marginBottom: 0 }}
                            onClick={() => {
                                localStorage.setItem('plantData', JSON.stringify(predictionResult));
                                setActiveTab('chatbot');
                            }}
                        >
                            Ask AI for Help
                        </button>
                    </div>
                ) : (
                    <span>{t.status}</span>
                )}
            </div>
        </div>
    );
};

export default Scan;
