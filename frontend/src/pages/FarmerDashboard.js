import React, { useEffect, useState } from 'react';
import axiosInstance from '../api';

export default function FarmerDashboard() {
  const [pools, setPools] = useState([]);

  const load = async () => {
    try {
      const res = await axiosInstance.get('pools/');
      setPools(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { load(); }, []);

  const logout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="container mx-auto max-w-2xl bg-white shadow p-6 rounded">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">My Pools</h2>
        <div className="space-x-2">
          <a href="/create-pool" className="bg-blue-600 text-white px-3 py-1 rounded">Create Pool</a>
          <button onClick={logout} className="bg-gray-600 text-white px-3 py-1 rounded">Logout</button>
        </div>
      </div>
      {pools.length === 0 && <p className="text-gray-600">No pools yet.</p>}
      <ul className="space-y-3">
        {pools.map(p => (
          <li key={p.id} className="bg-gray-50 border rounded p-3 flex justify-between">
            <div>
              <div className="font-medium">{p.produce_type}</div>
              <div className="text-sm text-gray-600">{p.quantity} kg → {p.destination} (on {p.date})</div>
            </div>
            <div className="text-sm font-medium">{p.status}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
