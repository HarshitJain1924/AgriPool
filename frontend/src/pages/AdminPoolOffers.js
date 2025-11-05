import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

export default function AdminPoolOffers() {
  const [offers, setOffers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [completedOnly, setCompletedOnly] = useState(false);
  const [selected, setSelected] = useState({}); // {id: true}
  const [loadingList, setLoadingList] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [summary, setSummary] = useState({ total_offers: 0, pending_offers: 0, approved_offers: 0, total_vehicles: 0 });

  const loadOffers = async () => {
    setLoadingList(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await api.get('admin/pool-offers/', { params });
      setOffers(res.data);
    } catch (e) {
      toast.error('Failed to load pool offers');
    } finally {
      setLoadingList(false);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await api.get('admin/summary/');
      setSummary(res.data || {});
    } catch (e) {
      toast.error('Failed to load summary');
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadOffers();
  }, [statusFilter]);

  const approve = async (id) => {
    setActionBusy(true);
    try {
      await api.put(`admin/pool-offers/${id}/approve/`, { status: 'APPROVED' });
      toast.success('Offer approved');
      await Promise.all([loadOffers(), loadSummary()]);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to approve');
    } finally {
      setActionBusy(false);
    }
  };

  const rejectOffer = async (id) => {
    setActionBusy(true);
    try {
      await api.put(`admin/pool-offers/${id}/approve/`, { status: 'REJECTED' });
      toast.success('Offer rejected');
      await Promise.all([loadOffers(), loadSummary()]);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to reject');
    } finally {
      setActionBusy(false);
    }
  };

  const deleteOffer = async (id) => {
    if (!window.confirm('Delete this pool offer? This cannot be undone.')) return;
    setActionBusy(true);
    try {
      await api.delete(`pool-offers/${id}/`);
      toast.success('Offer deleted');
      await Promise.all([loadOffers(), loadSummary()]);
    } catch (e) {
      const msg = e.response?.data?.detail || e.response?.data?.error || 'Failed to delete';
      toast.error(msg);
    } finally {
      setActionBusy(false);
    }
  };

  const filtered = offers.filter((o) => {
    const q = query.trim().toLowerCase();
    const okQuery = !q || `${o.origin} ${o.destination} ${o.provider_username}`.toLowerCase().includes(q);
    const okDate = !dateFilter || o.date === dateFilter;
    const okCompleted = !completedOnly || !!o.is_completed;
    return okQuery && okDate && okCompleted;
  });

  const toggleSelect = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const clearSelection = () => setSelected({});

  const bulkApprove = async () => {
    const ids = Object.keys(selected).filter((k) => selected[k]).map(Number);
    const target = filtered.filter((o) => ids.includes(o.id) && o.status === 'PENDING').map((o) => o.id);
    if (target.length === 0) return toast.error('Select pending offers to approve.');
    setActionBusy(true);
    try {
      await Promise.all(target.map((id) => api.put(`admin/pool-offers/${id}/approve/`, { status: 'APPROVED' })));
      toast.success(`Approved ${target.length} offer(s)`);
      clearSelection();
      await Promise.all([loadOffers(), loadSummary()]);
    } catch (e) {
      toast.error('Bulk approve failed');
    } finally { setActionBusy(false); }
  };

  const bulkReject = async () => {
    const ids = Object.keys(selected).filter((k) => selected[k]).map(Number);
    const target = filtered.filter((o) => ids.includes(o.id) && o.status === 'PENDING').map((o) => o.id);
    if (target.length === 0) return toast.error('Select pending offers to reject.');
    if (!window.confirm(`Reject ${target.length} pending offer(s)?`)) return;
    setActionBusy(true);
    try {
      await Promise.all(target.map((id) => api.put(`admin/pool-offers/${id}/approve/`, { status: 'REJECTED' })));
      toast.success(`Rejected ${target.length} offer(s)`);
      clearSelection();
      await Promise.all([loadOffers(), loadSummary()]);
    } catch (e) {
      toast.error('Bulk reject failed');
    } finally { setActionBusy(false); }
  };

  const bulkDelete = async () => {
    const ids = Object.keys(selected).filter((k) => selected[k]).map(Number);
    const target = filtered.filter((o) => ids.includes(o.id) && o.status === 'REJECTED').map((o) => o.id);
    if (target.length === 0) return toast.error('Select rejected offers to delete.');
    if (!window.confirm(`Delete ${target.length} rejected offer(s)?`)) return;
    setActionBusy(true);
    try {
      await Promise.all(target.map((id) => api.delete(`pool-offers/${id}/`)));
      toast.success(`Deleted ${target.length} offer(s)`);
      clearSelection();
      await Promise.all([loadOffers(), loadSummary()]);
    } catch (e) {
      toast.error('Bulk delete failed');
    } finally { setActionBusy(false); }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold mb-3">Admin: Manage Pool Offers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="bg-white border rounded p-3 shadow">
            <div className="text-xs text-gray-500">Total Offers</div>
            <div className="text-xl font-semibold">{summary.total_offers ?? 0}</div>
          </div>
          <div className="bg-white border rounded p-3 shadow">
            <div className="text-xs text-gray-500">Pending</div>
            <div className="text-xl font-semibold">{summary.pending_offers ?? 0}</div>
          </div>
          <div className="bg-white border rounded p-3 shadow">
            <div className="text-xs text-gray-500">Approved</div>
            <div className="text-xl font-semibold">{summary.approved_offers ?? 0}</div>
          </div>
          {/* Vehicles card removed since assignment is disabled */}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">Status</label>
          <select
            className="border rounded px-2 py-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <input
            className="border rounded px-2 py-1"
            placeholder="Search origin/destination/provider"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />

          <label className="flex items-center gap-1 ml-2 text-sm">
            <input type="checkbox" checked={completedOnly} onChange={(e) => setCompletedOnly(e.target.checked)} />
            <span>Show completed only</span>
          </label>

          <div className="ml-auto flex gap-2">
            <button disabled={actionBusy} onClick={bulkApprove} className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50">Bulk Approve</button>
            <button disabled={actionBusy} onClick={bulkReject} className="bg-yellow-600 text-white px-3 py-1 rounded disabled:opacity-50">Bulk Reject</button>
            <button disabled={actionBusy} onClick={bulkDelete} className="bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50">Bulk Delete</button>
          </div>
        </div>
      </div>

      {loadingList ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <p>No pool offers found.</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((o) => (
            <div key={o.id} className="border rounded p-4 bg-white shadow">
              <div className="flex justify-between">
                <div className="flex items-start gap-2">
                  <input type="checkbox" checked={!!selected[o.id]} onChange={() => toggleSelect(o.id)} />
                  <div>
                  <p className="font-medium">Provider: {o.provider_username}</p>
                  <p className="text-sm text-gray-600">{o.origin} → {o.destination} on {o.date}</p>
                  <p className="text-sm text-gray-600">Capacity: {o.available_capacity} / {o.total_capacity}</p>
                  <p className="text-sm text-gray-600">Vehicle: {o.vehicle_display || '—'}</p>
                  </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-1 h-fit rounded text-sm ${o.status === 'APPROVED' ? 'bg-green-100 text-green-700' : o.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{o.status}</span>
                  {o.is_completed && (
                    <span className="px-2 py-0.5 rounded text-xs bg-sky-100 text-sky-800">COMPLETED{o.completed_at ? ` · ${o.completed_at}` : ''}</span>
                  )}
                </div>
              </div>
              {/* Close justify-between wrapper */}
              </div>
              <div className="mt-3 flex gap-3 items-center">
                {o.status === 'PENDING' && (
                  <>
                    <button disabled={actionBusy} onClick={() => approve(o.id)} className="bg-green-600 text-white px-3 py-1 rounded">{actionBusy ? 'Working...' : 'Approve'}</button>
                    <button disabled={actionBusy} onClick={() => rejectOffer(o.id)} className="bg-yellow-600 text-white px-3 py-1 rounded">{actionBusy ? 'Working...' : 'Reject'}</button>
                  </>
                )}
                {o.status === 'REJECTED' && (
                  <button
                    disabled={actionBusy}
                    onClick={() => deleteOffer(o.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    {actionBusy ? 'Working...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
