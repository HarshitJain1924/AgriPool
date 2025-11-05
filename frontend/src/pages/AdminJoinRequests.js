import React, { useEffect, useState } from 'react';
import axios from '../api';

export default function AdminJoinRequests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.get('admin/join-requests/');
      setItems(res.data);
    } catch (e) {
      setError('Failed to load join requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    setMessage('');
    try {
      const url = action === 'approve' ? `admin/join-requests/${id}/approve/` : `admin/join-requests/${id}/reject/`;
      await axios.put(url);
      setMessage(`Request ${action}d.`);
      load();
    } catch (e) {
      setMessage(e.response?.data?.detail || `Failed to ${action}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h2 className="text-xl font-semibold mb-4">Admin: Join Requests</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {message && <p className="text-sm">{message}</p>}
      <div className="grid gap-3">
        {items.map((it) => (
          <div key={it.id} className="border rounded p-3 bg-white shadow">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">{it.requester_username} → Pool #{it.pool} ({it.pool_info?.origin} → {it.pool_info?.destination} on {it.pool_info?.date})</p>
                <p className="text-sm text-gray-600">Qty: {it.quantity} kg | Produce: {it.produce_type}</p>
                <p className="text-sm text-gray-600">Destination: {it.destination}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-sm ${it.status === 'APPROVED' ? 'bg-green-100 text-green-700' : it.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{it.status}</span>
                {it.status === 'PENDING' && (
                  <>
                    <button onClick={() => act(it.id, 'approve')} className="bg-green-600 text-white px-3 py-1 rounded">Approve</button>
                    <button onClick={() => act(it.id, 'reject')} className="bg-red-600 text-white px-3 py-1 rounded">Reject</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
