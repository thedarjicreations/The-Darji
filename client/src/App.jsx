import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import EditOrder from './pages/EditOrder';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import Clients from './pages/Clients';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import Messages from './pages/Messages';
import MessageTemplates from './pages/MessageTemplates';
import BusinessInsights from './pages/BusinessInsights';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    return user ? children : <Navigate to="/login" />;
}

import { ToastProvider } from './context/ToastContext';

function App() {
    return (
        <ToastProvider>
            <AuthProvider>
                <Router
                    future={{
                        v7_startTransition: true,
                        v7_relativeSplatPath: true
                    }}
                >
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        <Route path="/" element={
                            <PrivateRoute>
                                <Layout />
                            </PrivateRoute>
                        }>
                            <Route index element={<Dashboard />} />
                            <Route path="dashboard" element={<Navigate to="/" replace />} />
                            <Route path="orders" element={<Orders />} />
                            <Route path="orders/:id" element={<OrderDetails />} />
                            <Route path="orders/:id/edit" element={<EditOrder />} />
                            <Route path="new-order" element={<NewOrder />} />
                            <Route path="clients" element={<Clients />} />
                            <Route path="analytics" element={<Analytics />} />
                            <Route path="messages" element={<Messages />} />
                            <Route path="message-templates" element={<MessageTemplates />} />
                            <Route path="business-insights" element={<BusinessInsights />} />
                            <Route path="settings" element={<Settings />} />
                        </Route>
                    </Routes>
                </Router>
            </AuthProvider>
        </ToastProvider>
    );
}

export default App;
