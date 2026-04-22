import React, { useState } from 'react';
import { UserPlus, LogIn, Leaf } from 'lucide-react';

const Auth = ({ setUserId, setUserName }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', name: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const apiUrl = import.meta.env.DEV ? `http://${window.location.hostname}:5001` : '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const endpoint = isLogin ? '/login' : '/signup';
        
        try {
            const res = await fetch(`${apiUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            
            if (!res.ok) {
                setError(data.error || 'Authentication failed');
            } else {
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('userName', data.name || formData.username);
                if (data.email) localStorage.setItem('userEmail', data.email);
                setUserId(data.userId);
                setUserName(data.name || formData.username);
            }
        } catch (err) {
            setError('Server connection error. Ensure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <Leaf size={40} className="auth-icon" />
                    <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    <p>{isLogin ? 'Sign in to access your crop history' : 'Join to track your harvest health'}</p>
                </div>
                
                {error && <div className="auth-error">{error}</div>}
                
                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <input 
                            type="text" 
                            placeholder="Full Name" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                        />
                    )}
                    <input 
                        type="text" 
                        placeholder="Unique Username" 
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        required
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                    />
                    
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Processing...' : (isLogin ? <><LogIn size={18} /> Login</> : <><UserPlus size={18} /> Sign Up</>)}
                    </button>
                </form>
                
                <div className="auth-switch">
                    <p>
                        {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                        <span onClick={() => setIsLogin(!isLogin)}>{isLogin ? 'Sign up' : 'Log in'}</span>
                    </p>
                </div>
            </div>
            <style>{`
                .auth-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
                    padding: 20px;
                }
                .auth-card {
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(10px);
                    padding: 40px;
                    border-radius: 24px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                    max-width: 400px;
                    width: 100%;
                    text-align: center;
                }
                .auth-icon {
                    color: #4CAF50;
                    margin-bottom: 20px;
                }
                .auth-header h2 {
                    margin: 0 0 10px 0;
                    color: #1a1a1a;
                    font-size: 24px;
                }
                .auth-header p {
                    color: #666;
                    margin: 0 0 30px 0;
                    font-size: 14px;
                }
                .auth-form {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .auth-form input {
                    padding: 14px 16px;
                    border: 1px solid #ddd;
                    border-radius: 12px;
                    font-size: 15px;
                    transition: border-color 0.2s ease;
                }
                .auth-form input:focus {
                    outline: none;
                    border-color: #4CAF50;
                }
                .btn-primary {
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 14px;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .btn-primary:active {
                    transform: scale(0.98);
                }
                .auth-error {
                    background: #ffebee;
                    color: #c62828;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    font-size: 14px;
                }
                .auth-switch {
                    margin-top: 25px;
                    font-size: 14px;
                    color: #666;
                }
                .auth-switch span {
                    color: #4CAF50;
                    font-weight: 600;
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};

export default Auth;
