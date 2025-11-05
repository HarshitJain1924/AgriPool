import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access'));
  const [notes, setNotes] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = useMemo(() => !!user?.is_admin, [user]);
  const isFarmer = useMemo(() => !!user?.is_farmer, [user]);

  // Watch for login/logout changes
  useEffect(() => {
    const syncAuth = () => {
      const newToken = localStorage.getItem('access');
      const newUser = (() => {
        try {
          return JSON.parse(localStorage.getItem('user'));
        } catch {
          return null;
        }
      })();

      setToken(newToken);
      setUser(newUser);
    };

    // Run once
    syncAuth();

  // Listen for storage changes (e.g. login/logout in other tabs)
    window.addEventListener('storage', syncAuth);

    // Also re-check when route changes (useful after login redirect)
    const interval = setInterval(syncAuth, 500);

    return () => {
      window.removeEventListener('storage', syncAuth);
      clearInterval(interval);
    };
  }, []);

  // Poll notifications when logged in
  useEffect(() => {
    if (!token) return;
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.get('notifications/', { params: { unread: 'true', limit: 10 } });
        if (!mounted) return;
        setNotes(res.data || []);
        setUnread((res.data || []).filter(n => !n.is_read).length);
      } catch (_) {}
    };
    load();
    const intv = setInterval(load, 30000); // every 30s
    return () => { mounted = false; clearInterval(intv); };
  }, [token]);

  const markAllRead = async () => {
    try {
      await api.post('notifications/mark_read/', { ids: notes.map(n => n.id) });
      setNotes(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch (_) {}
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  };

  return (
    <nav className="bg-gradient-to-r from-green-700 to-emerald-600 text-white px-4 py-3 shadow">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <a
          href={user?.is_admin ? '/' : user?.is_farmer ? '/' : '/'}
          className="font-bold text-lg tracking-wide"
        >
          🌾 AgriPool
        </a>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-4 text-sm items-center relative">
          {!token && (
            <>
              <a href="/signup" className="hover:underline">Signup</a>
              <a href="/login" className="hover:underline">Login</a>
            </>
          )}

          {token && isFarmer && (
            <>
              <a href="/dashboard" className="hover:underline">Dashboard</a>
              <a href="/pools" className="hover:underline">Browse Pools</a>
              <a href="/create-pool-offer" className="hover:underline">Create Offer</a>
              <a href="/my-pools" className="hover:underline">My Pools</a>
              <a href="/my-join-requests" className="hover:underline">My Joins</a>
              <a href="/fertilizer-advisor" className="hover:underline">Fertilizer Advisor</a>
              <a href="/profile" className="hover:underline">Profile</a>
            </>
          )}

          {token && isAdmin && (
            <>
              <a href="/admin" className="hover:underline">Admin Dashboard</a>
              <a href="/admin/join-requests" className="hover:underline">Join Requests</a>
              <a href="/admin/pool-offers" className="hover:underline">Pool Offers</a>
            </>
          )}

          {token && (
            <div className="relative inline-block">
              <button
                className="relative mr-2"
                onClick={() => setOpen(o => !o)}
                title="Notifications"
              >
                <span className="material-icons"
                >🔔</span>
                {unread > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] px-1 rounded-full">
                    {unread}
                  </span>
                )}
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-80 bg-white text-gray-800 rounded shadow-lg z-20">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <span className="font-semibold">Notifications</span>
                    <button onClick={markAllRead} className="text-xs text-green-700 hover:underline">Mark all as read</button>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {(notes || []).length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-500">No new notifications</div>
                    ) : (
                      notes.map(n => (
                        <a key={n.id} href={n.link || '#'} className={`block px-3 py-2 text-sm ${n.is_read ? 'bg-white' : 'bg-green-50'}`}>
                          {n.message}
                          <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                        </a>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {token && (
            <button
              onClick={logout}
              className="bg-white text-green-700 px-3 py-1 rounded font-medium hover:bg-green-100 transition"
            >
              Logout
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-green-600/30 focus:outline-none focus:ring-2 focus:ring-white/50"
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Toggle navigation"
        >
          <span className="text-2xl">☰</span>
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {mobileOpen && (
        <div className="md:hidden border-t border-green-500/40">
          <div className="max-w-6xl mx-auto py-3 space-y-2">
            {!token && (
              <div className="flex gap-3">
                <a href="/signup" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Signup</a>
                <a href="/login" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Login</a>
              </div>
            )}
            {token && isFarmer && (
              <div className="flex flex-wrap gap-2">
                <a href="/dashboard" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Dashboard</a>
                <a href="/pools" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Browse Pools</a>
                <a href="/create-pool-offer" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Create Offer</a>
                <a href="/my-pools" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">My Pools</a>
                <a href="/my-join-requests" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">My Joins</a>
                <a href="/fertilizer-advisor" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Fertilizer Advisor</a>
                <a href="/profile" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Profile</a>
              </div>
            )}
            {token && isAdmin && (
              <div className="flex flex-wrap gap-2">
                <a href="/admin" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Admin Dashboard</a>
                <a href="/admin/join-requests" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Join Requests</a>
                <a href="/admin/pool-offers" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Pool Offers</a>
              </div>
            )}
            {token && (
              <div>
                <button onClick={logout} className="w-full bg-white text-green-700 px-4 py-2 rounded font-medium">Logout</button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
