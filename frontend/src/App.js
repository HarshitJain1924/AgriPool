import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { Toaster } from 'react-hot-toast';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Signup from './pages/Signup';
import Login from './pages/Login';
import AdminRoute from './components/AdminRoute';
import AvailablePools from './pages/AvailablePools';
import CreatePoolOffer from './pages/CreatePoolOffer';
import MyJoinRequests from './pages/MyJoinRequests';
import AdminJoinRequests from './pages/AdminJoinRequests';
import AdminDashboard from './pages/AdminDashboard';
import AdminPoolOffers from './pages/AdminPoolOffers';
import Profile from './pages/Profile';
import MyPools from './pages/MyPools';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard.js';
import FertilizerAdvisor from './pages/FertilizerAdvisor';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Toaster position="top-right" />
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto p-4">
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          {/* Legacy routes removed: /dashboard, /create-pool, /admin */}
          <Route path="/pools" element={<ProtectedRoute><AvailablePools /></ProtectedRoute>} />
          <Route path="/create-pool-offer" element={<ProtectedRoute><CreatePoolOffer /></ProtectedRoute>} />
          <Route path="/my-pools" element={<ProtectedRoute><MyPools /></ProtectedRoute>} />
          <Route path="/my-join-requests" element={<ProtectedRoute><MyJoinRequests /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/fertilizer-advisor" element={<ProtectedRoute><FertilizerAdvisor /></ProtectedRoute>} />
          <Route path="/admin/join-requests" element={<AdminRoute><AdminJoinRequests /></AdminRoute>} />
          <Route path="/admin/pool-offers" element={<AdminRoute><AdminPoolOffers /></AdminRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          {/* Optional additional route: /signup maps to Signup */}
          <Route path="/signup" element={<Signup />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
