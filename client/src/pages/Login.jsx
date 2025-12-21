import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiLock, FiArrowRight, FiShield } from 'react-icons/fi';


export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Brand (Hidden on Mobile) */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-gray-900 to-gray-800 text-white flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-4 text-3xl font-black tracking-tighter">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl shadow-black/50 border border-white/10 bg-black">
                            <img
                                src={`http://${window.location.hostname}:5000/assets/logo.png`}
                                alt="The Darji"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        THE DARJI
                    </div>
                </div>
                <div className="relative z-10 max-w-lg">
                    <h1 className="text-5xl font-black leading-tight mb-6">Manage your bespoke tailoring business with elegance.</h1>
                    <p className="text-gray-400 text-lg leading-relaxed">efficiency meets craftsmanship in one powerful platform.</p>
                </div>
                <div className="relative z-10 text-sm text-gray-500 font-medium">
                    &copy; {new Date().getFullYear()} The Darji. All rights reserved.
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 bg-gray-50">
                <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-gray-200/50">
                    <div className="text-center lg:text-left mb-10">
                        <div className="lg:hidden flex justify-center mb-6">
                            <div className="w-12 h-12 bg-darji-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                                <FiShield size={28} />
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 mb-2">Welcome back</h2>
                        <p className="text-gray-500 font-medium">Please enter your details to sign in</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-900 uppercase tracking-widest ml-1">Username</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-darji-accent transition-colors"><FiUser size={20} /></div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-darji-accent/10 focus:border-darji-accent bg-gray-50 focus:bg-white font-bold text-gray-800 transition-all outline-none"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-900 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-darji-accent transition-colors"><FiLock size={20} /></div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-darji-accent/10 focus:border-darji-accent bg-gray-50 focus:bg-white font-bold text-gray-800 transition-all outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center animate-shake">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-darji-accent text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                            {!loading && <FiArrowRight className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-gray-500 font-medium">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-darji-accent font-bold hover:underline">
                                Create free account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
