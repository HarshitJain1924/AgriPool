import React, { useState } from 'react';
import axiosInstance from '../api';

export default function Signup() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [msg, setMsg] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
  await axiosInstance.post('signup/', form);
      setMsg('Signup successful! You can now log in.');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Signup failed';
      setMsg(errMsg);
    }
  };

  return (
    <div className="container mx-auto max-w-md bg-white shadow p-6 rounded">
      <h2 className="text-xl font-semibold mb-4">Signup</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="username" placeholder="Username" className="w-full border p-2 rounded" onChange={handleChange} />
        <input name="password" type="password" placeholder="Password" className="w-full border p-2 rounded" onChange={handleChange} />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Signup</button>
      </form>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </div>
  );
}
