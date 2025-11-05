import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import api from "../api";

export default function Dashboard() {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myPools, setMyPools] = useState([]); // pools created by farmer (mine=true)
  const [myJoins, setMyJoins] = useState([]); // join requests made by this farmer
  const [summary, setSummary] = useState(null); // server-provided summary if available

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      setError("");
      try {
        // Try optimized summary endpoint first
        try {
          const s = await api.get("dashboard/summary/");
          if (mounted) setSummary(s.data);
        } catch (_) {
          // Fallback to client-side aggregation
          const [poolsRes, joinsRes] = await Promise.all([
            api.get("pool-offers/", { params: { mine: "true" } }),
            api.get("my-join-requests/"),
          ]);
          if (!mounted) return;
          setMyPools(poolsRes.data || []);
          setMyJoins(joinsRes.data || []);
        }
      } catch (e) {
        if (!mounted) return;
        setError(e.response?.data?.detail || "Failed to load dashboard data");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      mounted = false;
    };
  }, []);

  // Derived metrics
  const requestsOverview = useMemo(() => {
    // Prefer requests received on your pools to match provider view
    if (summary?.requests_received) return summary.requests_received;
    const counts = { APPROVED: 0, PENDING: 0, REJECTED: 0 };
    for (const j of myJoins) {
      const s = (j.status || "").toUpperCase();
      if (counts[s] !== undefined) counts[s] += 1;
    }
    return counts;
  }, [myJoins, summary]);

  const totalEarnings = useMemo(() => {
    if (typeof summary?.total_earnings === "number") return summary.total_earnings;
    // Use provider_share if present, else fallback to total_cost estimate
    return (myPools || []).reduce((sum, p) => sum + (Number(p.provider_share) || Number(p.total_cost) || 0), 0);
  }, [myPools, summary]);

  const actualRevenue = useMemo(() => {
    if (typeof summary?.actual_revenue === "number") return summary.actual_revenue;
    return (myPools || [])
      .filter((p) => p.is_completed)
      .reduce((sum, p) => sum + (Number(p.provider_share) || 0), 0);
  }, [myPools, summary]);

  const chartData = useMemo(() => {
    if (Array.isArray(summary?.monthly_earnings)) return summary.monthly_earnings;
    // Group earnings by month (YYYY-MM)
    const map = new Map();
    for (const p of myPools || []) {
      if (!p.date) continue;
      const d = new Date(p.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const val = Number(p.provider_share) || Number(p.total_cost) || 0;
      map.set(key, (map.get(key) || 0) + val);
    }
    // Sort by month key
    const rows = Array.from(map.entries()).sort(([a], [b]) => (a > b ? 1 : -1));
    // Convert to recharts format
    return rows.map(([month, earnings]) => ({ month, earnings }));
  }, [myPools, summary]);

  const projectionData = useMemo(() => {
    if (Array.isArray(summary?.monthly_projection)) return summary.monthly_projection;
    // Basic fallback: map existing chartData to projected vs actual = same numbers
    return chartData.map((d) => ({ month: d.month, projected: d.earnings, actual: d.earnings }));
  }, [summary, chartData]);

  const pieData = useMemo(() => {
    if (Array.isArray(summary?.produce_breakdown)) {
      return summary.produce_breakdown.map((r) => ({ name: r.produce_type, value: r.total_qty }));
    }
    return [];
  }, [summary]);

  const pieColors = ["#16a34a", "#22c55e", "#65a30d", "#4ade80", "#86efac", "#166534", "#84cc16"]; 

  const activeProduce = useMemo(() => {
    if (Array.isArray(summary?.active_pools)) return summary.active_pools;
    // Take recent approved pools as active
    return (myPools || []).filter((p) => (p.status || "").toUpperCase() === "APPROVED").slice(0, 5);
  }, [myPools, summary]);

  return (
    <div className="min-h-screen bg-green-50 p-6 md:p-10">
      <h1 className="text-3xl font-bold text-green-800 mb-2">🌾 Farmer Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome{user?.username ? `, ${user.username}` : ""}. Here's a quick overview of your recent activity.</p>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Earnings */}
        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition">
          <h2 className="text-lg font-semibold text-green-700 mb-2">Total Earnings</h2>
          <p className="text-3xl font-bold text-green-900">₹{totalEarnings.toLocaleString("en-IN")}</p>
          <p className="text-gray-500 text-sm mt-2">Projected based on your pool offers</p>
          <p className="text-gray-600 text-sm mt-2">Actual Revenue: <b>₹{actualRevenue.toLocaleString("en-IN")}</b></p>
        </div>

        {/* Requests Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition">
          <h2 className="text-lg font-semibold text-green-700 mb-2">Join Requests to Your Pools</h2>
          <p className="text-gray-600">✅ Approved: <b>{requestsOverview.APPROVED}</b></p>
          <p className="text-gray-600">🕓 Pending: <b>{requestsOverview.PENDING}</b></p>
          <p className="text-gray-600">❌ Rejected: <b>{requestsOverview.REJECTED}</b></p>
          {typeof summary?.completed_pools === 'number' && (
            <p className="text-gray-600 mt-2">✔️ Completed Pools: <b>{summary.completed_pools}</b></p>
          )}
        </div>

        {/* Recent Joiners */}
        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition">
          <h2 className="text-lg font-semibold text-green-700 mb-2">Recent Joiners</h2>
          {!summary?.recent_joiners?.length ? (
            <p className="text-gray-500">No joiners yet.</p>
          ) : (
            <ul className="space-y-1 text-gray-700">
              {summary.recent_joiners.map((j) => (
                <li key={j.id}>
                  👤 {j.requester_username} — {j.quantity}kg {j.produce_type} • {j.pool.origin} → {j.pool.destination} ({j.status})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition mb-8">
        <h2 className="text-lg font-semibold text-green-700 mb-4">Earnings Over Time</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="earnings" stroke="#16a34a" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Pie: Produce breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition">
          <h2 className="text-lg font-semibold text-green-700 mb-2">Produce Breakdown</h2>
          {pieData.length === 0 ? (
            <p className="text-gray-500">No join activity yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar: Projected vs Actual */}
        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition">
          <h2 className="text-lg font-semibold text-green-700 mb-2">Projected vs Actual (Monthly)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="projected" fill="#84cc16" />
                <Bar dataKey="actual" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Active Produce + Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Produce */}
        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition">
          <h2 className="text-lg font-semibold text-green-700 mb-2">Active Produce</h2>
          {activeProduce.length === 0 ? (
            <p className="text-gray-500">No approved pool offers yet.</p>
          ) : (
            <ul className="space-y-1 text-gray-700">
              {activeProduce.map((p) => (
                <li key={p.id}>
                  🌾 {p.origin} → {p.destination} — {p.total_capacity}kg (Approved)
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Profile Snapshot */}
        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition">
          <h2 className="text-lg font-semibold text-green-700 mb-4">Profile Snapshot</h2>
          <p><b>Name:</b> {user?.username || "—"}</p>
          <p><b>Location:</b> —</p>
          <button className="mt-4 px-4 py-2 bg-green-700 text-white rounded-xl hover:bg-green-800 transition">
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}
