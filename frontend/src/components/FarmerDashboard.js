import React, { useState, useEffect } from 'react';
import API from '../api';

export default function FarmerDashboard() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    API.get('requests/')
      .then(res => setRequests(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <section className="mb-6">
      <h2 className="text-xl font-medium mb-2">Transport Requests</h2>
      <div className="space-y-3">
        {requests.length === 0 && <p className="text-gray-600">No requests yet.</p>}
        {requests.map(r => (
          <div key={r.id} className="bg-white shadow p-3 rounded">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{r.produce_type}</div>
                <div className="text-sm text-gray-600">{r.quantity} kg → {r.destination}</div>
              </div>
              <div className="text-sm">{r.status}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
