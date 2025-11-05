import React, { useEffect, useState } from 'react';
import axios from '../api';

export default function MyPools() {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiners, setJoiners] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  
  const handleComplete = async (id) => {
    if (!window.confirm('Mark this pool as completed? This will stop new join requests.')) return;
    try {
      await axios.patch(`pool-offers/${id}/complete/`);
      alert('Pool marked as completed.');
      loadMyPools();
    } catch (e) {
      console.error('❌ Complete failed:', e.response?.data || e.message || e);
      alert(e.response?.data?.detail || 'Failed to mark pool as completed.');
    }
  };

  const loadMyPools = async () => {
    setLoading(true);
    try {
      const res = await axios.get('pool-offers/', { params: { mine: 'true' } });
      console.log('✅ My pools loaded:', res.data);
      setPools(res.data || []);
    } catch (err) {
      console.error('❌ Failed to load your pools:', err);
      alert('Could not load your pools — check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pool offer?')) return;
    try {
      await axios.delete(`pool-offers/${id}/`);
      alert('Pool offer deleted.');
      loadMyPools();
    } catch (e) {
      console.error('❌ Delete failed:', e.response?.data || e.message || e);
      alert(e.response?.data?.detail || 'Failed to delete pool offer.');
    }
  };

  const openJoiners = async (poolId) => {
    try {
      const res = await axios.get(`pool-offers/${poolId}/joiners/`);
      setJoiners(res.data || []);
      setSelectedPool(poolId);
      setShowModal(true);
    } catch (e) {
      console.error('❌ Failed to fetch joiners:', e.response?.data || e.message || e);
      alert(e.response?.data?.detail || 'Failed to fetch joiners');
    }
  };

  useEffect(() => {
    loadMyPools();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading your pools...</p>;

  return (
    <div className="max-w-5xl mx-auto bg-white shadow p-6 rounded mt-6">
      <h2 className="text-2xl font-semibold mb-4">My Pool Offers</h2>

      {pools.length === 0 ? (
        <p className="text-gray-600">You haven’t created any pool offers yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-green-600 text-white text-left">
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Vehicle</th>
                <th className="px-3 py-2">Provider Load (kg)</th>
                <th className="px-3 py-2">Available (kg)</th>
                <th className="px-3 py-2">Rate/km</th>
                <th className="px-3 py-2">Total Cost</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Completed</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.origin} → {p.destination}</td>
                  <td className="px-3 py-2">{p.date}</td>
                  <td className="px-3 py-2">{p.vehicle_display || (p.vehicle_type ? `${p.vehicle_type} (${p.total_capacity}kg)` : '—')}</td>
                  <td className="px-3 py-2">{p.provider_load ?? 0}</td>
                  <td className="px-3 py-2">{p.available_capacity ?? 0}</td>
                  <td className="px-3 py-2">₹{p.rate_per_km ?? 0}</td>
                  <td className="px-3 py-2">₹{p.total_cost ?? 0}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        p.status === 'APPROVED'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : p.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : p.status === 'FULL'
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {p.is_completed ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">Yes</span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openJoiners(p.id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        View Joiners
                      </button>
                      {!p.is_completed && (
                        <button
                          onClick={() => handleComplete(p.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                        >
                          Mark as Completed
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                        disabled={p.status !== 'REJECTED'}
                        title={p.status !== 'REJECTED' ? 'Delete available after rejecting' : ''}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Joiners Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-4 w-[28rem] max-w-full shadow-lg">
            <h3 className="font-bold mb-3 text-lg">Join Requests (Pool #{selectedPool})</h3>
            {joiners.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="px-2 py-1">User</th>
                      <th className="px-2 py-1">Produce</th>
                      <th className="px-2 py-1">Qty</th>
                      <th className="px-2 py-1">Status</th>
                      <th className="px-2 py-1">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {joiners.map((j) => (
                      <tr key={j.id} className="border-t">
                        <td className="px-2 py-1">{j.requester_username}</td>
                        <td className="px-2 py-1">{j.produce_type}</td>
                        <td className="px-2 py-1">{j.quantity}</td>
                        <td className="px-2 py-1">{j.status}</td>
                        <td className="px-2 py-1">
  {new Date(j.date_created).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })}
</td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm">No join requests yet.</p>
            )}
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
