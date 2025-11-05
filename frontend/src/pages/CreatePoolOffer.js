import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api';

const VEHICLE_OPTIONS = [
  { label: 'Mini Truck - 1000 kg', type: 'Mini Truck', capacity: 1000, rate: 10 },
  { label: 'Tempo - 2000 kg', type: 'Tempo', capacity: 2000, rate: 15 },
  { label: 'Truck - 5000 kg', type: 'Truck', capacity: 5000, rate: 25 },
  { label: 'Tractor - 8000 kg', type: 'Tractor', capacity: 8000, rate: 30 },
  { label: 'Container - 12000 kg', type: 'Container', capacity: 12000, rate: 40 },
];

export default function CreatePoolOffer() {
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    date: '',
    distance_km: '',
    vehicle_type: '',
    total_capacity: '',
    provider_load: '',
  });
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedOption = useMemo(
    () => VEHICLE_OPTIONS.find(v => v.type === selectedVehicleType),
    [selectedVehicleType]
  );

  // Keep form.vehicle_type and total_capacity in sync with selected option
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      vehicle_type: selectedOption ? selectedOption.type : '',
      total_capacity: selectedOption ? selectedOption.capacity : '',
    }));
  }, [selectedOption]);

  // Rate per km (use same mapping as backend) and derived previews
  const ratePerKm = useMemo(() => selectedOption?.rate || 0, [selectedOption]);

  const distance = useMemo(() => parseFloat(form.distance_km) || 0, [form.distance_km]);
  const totalCapacity = useMemo(() => parseFloat(form.total_capacity) || 0, [form.total_capacity]);
  const providerLoad = useMemo(() => parseFloat(form.provider_load) || 0, [form.provider_load]);
  const availableCapacityPreview = Math.max((totalCapacity || 0) - (providerLoad || 0), 0);
  const totalCostPreview = Number(((distance || 0) * (ratePerKm || 0)).toFixed(2));
  const providerSharePreview = totalCapacity > 0
    ? Number((totalCostPreview * (providerLoad / totalCapacity)).toFixed(2))
    : 0;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onVehicleChange = (e) => {
    setSelectedVehicleType(e.target.value);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setSubmitting(true);
    try {
      const payload = {
        origin: form.origin,
        destination: form.destination,
        date: form.date,
        distance_km: form.distance_km ? Number(form.distance_km) : 0,
        // no concrete vehicle id; pass selected vehicle_type
        vehicle_type: form.vehicle_type || null,
        total_capacity: form.total_capacity ? Number(form.total_capacity) : 0,
        provider_load: form.provider_load ? Number(form.provider_load) : 0,
        // backend computes available_capacity & price_per_kg
      };
      await axios.post('pool-offers/', payload);
      setMsg('Pool offer created successfully!');
      // reset
      setSelectedVehicleType('');
      setForm({ origin: '', destination: '', date: '', distance_km: '', vehicle_type: '', total_capacity: '', provider_load: '' });
    } catch (error) {
      // Debug: surface full backend error in console for quick diagnosis
      console.error('Pool offer creation failed:', error?.response ? error.response.data : error);
      alert('Failed to create pool offer. Check console for details (Press F12 > Console tab).');
      // Keep prior message behavior in UI as a fallback
      const detail = error.response?.data?.detail || error.response?.data || 'Failed to create pool offer';
      setMsg(typeof detail === 'string' ? detail : 'Failed to create pool offer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white shadow p-6 rounded">
      <h2 className="text-xl font-semibold mb-4">Create Pool Offer</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input name="origin" value={form.origin} onChange={onChange} placeholder="Origin" className="w-full border p-2 rounded" required />
        <input name="destination" value={form.destination} onChange={onChange} placeholder="Destination" className="w-full border p-2 rounded" required />
        <input type="date" name="date" value={form.date} onChange={onChange} className="w-full border p-2 rounded" required />

        <input name="distance_km" type="number" value={form.distance_km} onChange={onChange} placeholder="Distance (km)" className="w-full border p-2 rounded" required />

        <select name="vehicle_type" value={selectedVehicleType} onChange={onVehicleChange} className="w-full border p-2 rounded" required>
          <option value="">-- Select Vehicle --</option>
          {VEHICLE_OPTIONS.map(v => (
            <option key={v.type} value={v.type}>{v.label}</option>
          ))}
        </select>

        {/* Total capacity is auto from vehicle (read-only) */}
        <input
          name="total_capacity"
          type="number"
          value={form.total_capacity}
          onChange={() => {}}
          placeholder="Total capacity (kg)"
          className="w-full border p-2 rounded bg-gray-100 cursor-not-allowed"
          readOnly
          disabled
          required
        />

  {/* Provider's own load */}
  <input name="provider_load" type="number" value={form.provider_load} onChange={onChange} placeholder="Your load (kg)" className="w-full border p-2 rounded" />

        {selectedOption && (
          <div className="text-sm text-gray-700 bg-gray-50 border rounded p-3 space-y-1">
            <p><strong>Vehicle:</strong> {selectedOption.type} ({selectedOption.capacity} kg)</p>
            <p><strong>Rate per km:</strong> ₹{ratePerKm}</p>
            <p><strong>Distance:</strong> {distance} km</p>
            <p><strong>Total Cost (preview):</strong> ₹{totalCostPreview}</p>
            <p><strong>Your Load:</strong> {providerLoad || 0} kg</p>
            <p><strong>Available After Your Load:</strong> {availableCapacityPreview} kg</p>
            <p><strong>Your Share (preview):</strong> ₹{providerSharePreview}</p>
          </div>
        )}

        <button type="submit" disabled={submitting} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60">
          {submitting ? 'Creating…' : 'Create'}
        </button>
      </form>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </div>
  );
}
 
