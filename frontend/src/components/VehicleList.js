import React, { useState, useEffect } from 'react';
import API from '../api';

export default function VehicleList() {
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    API.get('vehicles/')
      .then(res => setVehicles(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <section>
      <h2 className="text-xl font-medium mb-2">Available Vehicles</h2>
      <div className="space-y-3">
        {vehicles.length === 0 && <p className="text-gray-600">No vehicles listed yet.</p>}
        {vehicles.map(v => (
          <div key={v.id} className="bg-white shadow p-3 rounded">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{v.vehicle_type}</div>
                <div className="text-sm text-gray-600">Capacity: {v.capacity} kg — Route: {v.route}</div>
              </div>
              <div className="text-sm">Owner: {v.owner?.username || 'N/A'}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
