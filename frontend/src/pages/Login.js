import React, { useState } from 'react';
import axiosInstance from '../api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
  const res = await axiosInstance.post('token/', form);
      localStorage.setItem('access', res.data.access);
      localStorage.setItem('refresh', res.data.refresh);

      // get role info
  const me = await axiosInstance.get('me/');
      localStorage.setItem('user', JSON.stringify(me.data));

  if (me.data.is_admin) navigate('/admin/pool-offers');
  else if (me.data.is_farmer) navigate('/pools');
      else setMsg('No role assigned.');
    } catch (err) {
      setMsg('Invalid credentials');
    }
  };

  return (
    <div className="container mx-auto max-w-md bg-white shadow p-6 rounded">
      <h2 className="text-xl font-semibold mb-4">Login</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="username" placeholder="Username" className="w-full border p-2 rounded" onChange={handleChange} />
        <input name="password" type="password" placeholder="Password" className="w-full border p-2 rounded" onChange={handleChange} />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Login</button>
      </form>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </div>
  );
}
