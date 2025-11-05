import React, { useEffect, useState } from 'react';
import api from '../api';

export default function AdminDashboard() {
  const [summary, setSummary] = useState({ total_offers: 0, pending_offers: 0, approved_offers: 0, total_vehicles: 0 });
  const [pendingOffers, setPendingOffers] = useState([]);
  const [pendingJoins, setPendingJoins] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [recentCompleted, setRecentCompleted] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sumRes, offersRes, joinsRes, approvedRes] = await Promise.all([
        api.get('admin/summary/'),
        api.get('admin/pool-offers/', { params: { status: 'PENDING' } }),
        api.get('admin/join-requests/'),
        api.get('admin/pool-offers/', { params: { status: 'APPROVED' } }),
      ]);
      setSummary(sumRes.data || {});
      setPendingOffers((offersRes.data || []).slice(0, 5));
      setPendingJoins((joinsRes.data || []).filter(j => (j.status || '').toUpperCase() === 'PENDING').slice(0, 5));
      const approved = (approvedRes.data || []);
      const completed = approved.filter(o => !!o.is_completed);
      setCompletedCount(completed.length);
      const sorted = [...completed].sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));
      setRecentCompleted(sorted.slice(0, 5));
    } catch (e) {
      // No-op; lightweight dashboard
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
        <div className="flex gap-2 text-sm">
          <a href="/admin/pool-offers" className="bg-green-600 text-white px-3 py-1 rounded">Manage Offers</a>
          <a href="/admin/join-requests" className="bg-blue-600 text-white px-3 py-1 rounded">Join Requests</a>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border rounded p-4 shadow">
          <div className="text-xs text-gray-500">Total Offers</div>
          <div className="text-2xl font-semibold">{summary.total_offers ?? 0}</div>
        </div>
        <div className="bg-white border rounded p-4 shadow">
          <div className="text-xs text-gray-500">Pending</div>
          <div className="text-2xl font-semibold">{summary.pending_offers ?? 0}</div>
        </div>
        <div className="bg-white border rounded p-4 shadow">
          <div className="text-xs text-gray-500">Approved</div>
          <div className="text-2xl font-semibold">{summary.approved_offers ?? 0}</div>
        </div>
        <div className="bg-white border rounded p-4 shadow">
          <div className="text-xs text-gray-500">Vehicles</div>
          <div className="text-2xl font-semibold">{summary.total_vehicles ?? 0}</div>
        </div>
        <div className="bg-white border rounded p-4 shadow">
          <div className="text-xs text-gray-500">Completed</div>
          <div className="text-2xl font-semibold">{completedCount}</div>
        </div>
      </div>

      {/* Pending offers preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border rounded p-4 shadow">
          <h3 className="font-semibold mb-2">Pending Pool Offers</h3>
          {loading ? (
            <p>Loading…</p>
          ) : pendingOffers.length === 0 ? (
            <p className="text-gray-500">No pending offers.</p>
          ) : (
            <ul className="space-y-2">
              {pendingOffers.map(o => (
                <li key={o.id} className="text-sm flex justify-between">
                  <span>{o.provider_username} • {o.origin} → {o.destination} on {o.date}</span>
                  <a href="/admin/pool-offers" className="text-green-700 hover:underline">Review</a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending join requests preview */}
        <div className="bg-white border rounded p-4 shadow">
          <h3 className="font-semibold mb-2">Pending Join Requests</h3>
          {loading ? (
            <p>Loading…</p>
          ) : pendingJoins.length === 0 ? (
            <p className="text-gray-500">No pending join requests.</p>
          ) : (
            <ul className="space-y-2">
              {pendingJoins.map(j => (
                <li key={j.id} className="text-sm flex justify-between">
                  <span>{j.requester_username} • Pool #{j.pool} ({j.pool_info?.origin} → {j.pool_info?.destination})</span>
                  <a href="/admin/join-requests" className="text-blue-700 hover:underline">Review</a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recently completed offers */}
        <div className="bg-white border rounded p-4 shadow">
          <h3 className="font-semibold mb-2">Recently Completed</h3>
          {loading ? (
            <p>Loading…</p>
          ) : recentCompleted.length === 0 ? (
            <p className="text-gray-500">No completed offers yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentCompleted.map(o => (
                <li key={o.id} className="text-sm flex justify-between">
                  <span>{o.provider_username} • {o.origin} → {o.destination}</span>
                  <span className="text-gray-500">{o.completed_at ? new Date(o.completed_at).toLocaleDateString() : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
