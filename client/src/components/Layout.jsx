import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FiHome, FiShoppingCart, FiUsers, FiBarChart2,
    FiMessageSquare, FiSettings, FiLogOut, FiPlusCircle,
    FiMenu, FiX, FiTrendingUp, FiFileText, FiSearch, FiBell
} from 'react-icons/fi';

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
        <div className="min-h-screen bg-darji-light font-sans flex text-slate-800">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-darji-dark/80 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 bottom-0 lg:bottom-auto lg:sticky lg:top-0 h-full lg:h-screen z-50
                w-64 bg-slate-900 text-white shrink-0
                transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                border-r border-slate-800 flex flex-col shadow-2xl
            `}>
                {/* Logo Section */}
                <div className="h-16 flex items-center px-6 border-b border-slate-800/50">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
                        <h1 className="text-xl font-serif tracking-widest text-white uppercase flex items-center">
                            The Darji
                        </h1>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`
                                    group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                                    ${isActive
                                        ? 'bg-darji-accent text-white font-medium shadow-lg shadow-darji-accent/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }
                                `}
                            >
                                <Icon
                                    size={20}
                                    strokeWidth={isActive ? 2 : 1.5}
                                    className={`
                                        transition-all duration-300
                                        ${isActive ? 'text-white' : 'group-hover:text-white'}
                                    `}
                                />
                                <span className="text-sm tracking-wide">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-neutral-800 rounded flex items-center justify-center text-xs font-medium text-white">
                            {user?.name?.charAt(0) || 'D'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                            <p className="text-[10px] text-neutral-500 truncate uppercase tracking-wider">Manager</p>
                        </div>
                        <button
                            onClick={logout}
                            className="text-neutral-500 hover:text-white transition-colors"
                        >
                            <FiLogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-darji-light relative">
                {/* Mobile Header */}
                <div className="lg:hidden h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                            <FiMenu size={24} />
                        </button>
                        <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
                        <span className="font-serif font-bold text-darji-dark text-lg">THE DARJI</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-darji-secondary flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-orange-500/30">
                        {user?.name?.charAt(0) || 'D'}
                    </div>
                </div>

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth w-full max-w-full">
                    <div className="w-full max-w-[1600px] mx-auto px-0 md:px-8 py-4 md:py-8 lg:p-10 space-y-4 md:space-y-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
