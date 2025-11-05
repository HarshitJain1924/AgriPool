import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children }) {
  const token = localStorage.getItem('access');
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {
    user = null;
  }
  if (!token) return <Navigate to="/login" />;
  if (!user?.is_admin) return <Navigate to="/pools" />;
  return children;
}
