import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiShoppingCart, FiUsers, FiBarChart2, FiMessageSquare, FiSettings, FiLogOut, FiPlusCircle, FiMenu, FiX, FiShield, FiUser, FiFileText, FiTrendingUp } from 'react-icons/fi';

export default function Layout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', path: '/', icon: FiHome },
        { name: 'New Order', path: '/new-order', icon: FiPlusCircle },
        { name: 'Orders', path: '/orders', icon: FiShoppingCart },
        { name: 'Clients', path: '/clients', icon: FiUsers },
        { name: 'Analytics', path: '/analytics', icon: FiBarChart2 },
        { name: 'Business Insights', path: '/business-insights', icon: FiTrendingUp },
        { name: 'Messages', path: '/messages', icon: FiMessageSquare },
        { name: 'Message Templates', path: '/message-templates', icon: FiFileText },
        { name: 'Settings', path: '/settings', icon: FiSettings },
    ];

    return (
        <div className="min-h-screen bg-gray-50/50 flex font-sans">
            {/* Mobile menu button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`lg:hidden fixed top-4 right-4 z-50 p-3 rounded-xl shadow-lg transition-all duration-300 ${sidebarOpen ? 'bg-white text-gray-800' : 'bg-darji-accent text-white'}`}
            >
                {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-in fade-in"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-40
                w-72 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white flex flex-col shrink-0
                transform transition-transform duration-300 ease-in-out shadow-2xl
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Brand Logo */}
                <div className="p-8 pb-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-black/50 bg-black">
                        <img
                            src={`http://${window.location.hostname}:5000/assets/logo.png`}
                            alt="The Darji"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter leading-none text-darji-accent">THE DARJI</h1>
                        <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase mt-1">Bespoke Studio</p>
                    </div>
                </div>

                {/* User Profile Summary (Desktop) */}
                <div className="mx-6 mb-6 p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center text-gray-300">
                        <FiUser />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-gray-100 truncate">{user?.name || 'Admin User'}</p>
                        <p className="text-xs text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Online</p>
                    </div>
                </div>

                <div className="px-6 mb-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">Menu</p>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative ${isActive
                                    ? 'bg-darji-accent text-white shadow-lg shadow-blue-900/50 font-bold'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white font-medium'
                                    }`}
                            >
                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>}
                                <Icon size={20} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                <span className="tracking-wide">{item.name}</span>
                                {item.name === 'Orders' && (
                                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">NEW</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 mt-auto">
                    <button
                        onClick={logout}
                        className="flex items-center justify-center gap-2 w-full py-4 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all font-bold text-sm"
                    >
                        <FiLogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                    <p className="text-center text-[10px] text-gray-600 mt-4 font-medium">v2.0 Hyper-Premium Build</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto bg-gray-50/50">
                <div className="max-w-7xl mx-auto p-4 lg:p-8 pt-20 lg:pt-8 min-h-screen">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
