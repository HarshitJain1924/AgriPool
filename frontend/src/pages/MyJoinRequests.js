import React, { useEffect, useState } from 'react';
import axios from '../api';

export default function MyJoinRequests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('my-join-requests/');
      setItems(res.data);
    } catch (e) {
      setError('Failed to load your join requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-semibold mb-4">My Join Requests</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && items.length === 0 && <p>No join requests yet.</p>}
      <div className="grid gap-3">
        {items.map((it) => (
          <div key={it.id} className="border rounded p-3 bg-white shadow">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">Pool: {it.pool_info?.origin} → {it.pool_info?.destination} on {it.pool_info?.date}</p>
                <p className="text-sm text-gray-600">Quantity: {it.quantity} kg | Produce: {it.produce_type}</p>
                <p className="text-sm text-gray-600">Destination: {it.destination}</p>
              </div>
              <span className={`px-2 py-1 h-fit rounded text-sm ${it.status === 'APPROVED' ? 'bg-green-100 text-green-700' : it.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{it.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
