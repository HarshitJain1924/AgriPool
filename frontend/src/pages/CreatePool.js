import React, { useState } from 'react';
import axiosInstance from '../api';

export default function CreatePool() {
  const [form, setForm] = useState({
    produce_type: '',
    quantity: '',
    destination: '',
    date: '',
  });
  const [msg, setMsg] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
  await axiosInstance.post('pools/', form);
      setMsg('Pool created successfully!');
    } catch (err) {
      setMsg('Error creating pool');
    }
  };

  return (
    <div className="container mx-auto max-w-md bg-white shadow p-6 rounded">
      <h2 className="text-xl font-semibold mb-4">Create Pool</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="produce_type" placeholder="Produce Type" className="w-full border p-2 rounded" onChange={handleChange} />
        <input name="quantity" type="number" placeholder="Quantity (kg)" className="w-full border p-2 rounded" onChange={handleChange} />
        <input name="destination" placeholder="Destination" className="w-full border p-2 rounded" onChange={handleChange} />
        <input name="date" type="date" className="w-full border p-2 rounded" onChange={handleChange} />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Create</button>
      </form>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </div>
  );
}
