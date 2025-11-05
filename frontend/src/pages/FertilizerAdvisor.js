import React, { useState } from 'react';
import api from '../api';

export default function FertilizerAdvisor() {
  const [form, setForm] = useState({ crop: '', soil: '', area: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('fertilizer/advice/', form);
      setResult(res.data);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Failed to fetch recommendation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-green-700">Fertilizer Advisor 🌾</h2>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white shadow-md p-4 rounded-lg">
        <div>
          <label className="block font-semibold mb-1">Crop Type</label>
          <select name="crop" value={form.crop} onChange={handleChange} required className="border rounded p-2 w-full">
            <option value="">Select crop</option>
            <option>Wheat</option>
            <option>Rice</option>
            <option>Cotton</option>
            <option>Maize</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-1">Soil Type</label>
          <select name="soil" value={form.soil} onChange={handleChange} required className="border rounded p-2 w-full">
            <option value="">Select soil</option>
            <option>Loamy</option>
            <option>Clay</option>
            <option>Sandy</option>
            <option>Alluvial</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-1">Area (in hectares)</label>
          <input type="number" name="area" value={form.area} onChange={handleChange} required className="border rounded p-2 w-full" />
        </div>

        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? 'Calculating...' : 'Get Recommendation'}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-4 border rounded bg-green-50">
          <h3 className="text-lg font-semibold mb-2">Result:</h3>
          <p><strong>Crop:</strong> {result.crop}</p>
          <p><strong>Soil:</strong> {result.soil}</p>
          <p><strong>Area:</strong> {result.area} ha</p>
          <h4 className="font-semibold mt-3">Fertilizer Recommendation:</h4>
          <ul className="list-disc ml-6">
            <li>Nitrogen (N): {result.fertilizer?.N}</li>
            <li>Phosphorus (P): {result.fertilizer?.P}</li>
            <li>Potassium (K): {result.fertilizer?.K}</li>
          </ul>
          <p className="mt-3 italic text-gray-700">{result.advice}</p>
        </div>
      )}
    </div>
  );
}
