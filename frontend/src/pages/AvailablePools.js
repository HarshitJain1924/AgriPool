// src/pages/AvailablePools.js
import React, { useEffect, useState } from "react";
import axios from "../api";

export default function AvailablePools() {
  const [pools, setPools] = useState([]);
  const [filters, setFilters] = useState({ origin: "", destination: "", date: "" });
  const [joinQty, setJoinQty] = useState({});
  const [joinProd, setJoinProd] = useState({});
  const [currentUser, setCurrentUser] = useState("");
  const [myJoins, setMyJoins] = useState({}); // { [poolId]: 'PENDING' | 'APPROVED' | 'REJECTED' }

  // Fetch current user
  useEffect(() => {
    (async () => {
      // Get current user (fallback safe)
      try {
        const me = await axios.get("me/");
        setCurrentUser(me.data?.username || "");
      } catch (e) {
        console.warn("⚠️ Could not fetch user info via /me");
      }

      // Load my join requests and then load pools filtered accordingly
      try {
        const resJoins = await axios.get("my-join-requests/");
        const map = {};
        (resJoins.data || []).forEach((jr) => {
          if (jr?.pool) map[jr.pool] = jr.status;
        });
        setMyJoins(map);
        await load(map);
      } catch (e) {
        console.warn("⚠️ Could not load my join requests");
        await load();
      }
    })();
  }, []);

  // Load approved pool offers
  const load = async (joinsMap = myJoins) => {
    try {
      const params = { status: "APPROVED" };
      if (filters.origin) params.origin = filters.origin;
      if (filters.destination) params.destination = filters.destination;
      if (filters.date) params.date = filters.date;

      const res = await axios.get("pool-offers/", { params });
      // Exclude pools the user already has an APPROVED join on
      const raw = res.data || [];
      const filtered = raw.filter((p) => (joinsMap?.[p.id] !== 'APPROVED'));
      console.log("✅ Loaded pools (filtered):", filtered);
      setPools(filtered);
    } catch (err) {
      console.error("❌ Failed to load pools:", err);
      alert("Error fetching pools — check backend connection.");
    }
  };

  // Re-run load when filters change
  useEffect(() => {
    load();
  }, [filters.origin, filters.destination, filters.date]);

  // Join pool
  const handleJoin = async (p) => {
  const existing = myJoins[p.id];
  if (existing === 'PENDING') {
    return alert('You already have a pending request for this pool.');
  }
  if (existing === 'APPROVED') {
    return alert('You are already part of this pool.');
  }

    const qty = Number(joinQty[p.id] || 0);
    const produce = joinProd[p.id] || "";

    if (!produce || !qty) return alert("Please enter both produce and quantity.");
    if (qty > p.available_capacity)
      return alert(`Only ${p.available_capacity} kg available.`);

    const costPerKg = (p.total_cost / p.total_capacity).toFixed(2);
    const yourShare = (costPerKg * qty).toFixed(2);

    // Build payload expected by backend (destination must be a string)
    const payload = {
      produce_type: produce,
      quantity: qty,
      destination: p.destination || p.destination_name || "unknown",
      // Note: share_amount is computed client-side for display only and NOT sent to backend
    };

    // Debug logs
    console.log("🚀 Sending join request payload:", payload);

    try {
      const res = await axios.post(`pool-offers/${p.id}/join/`, payload);

      console.log("✅ Join success:", res.data);
      alert(`✅ Joined pool successfully!\nYour share: ₹${yourShare}`);
      setJoinQty((prev) => ({ ...prev, [p.id]: "" }));
      setJoinProd((prev) => ({ ...prev, [p.id]: "" }));
      // Refresh join map then reload pools to hide approved ones
      try {
        const resJoins = await axios.get("my-join-requests/");
        const map = {};
        (resJoins.data || []).forEach((jr) => {
          if (jr?.pool) map[jr.pool] = jr.status;
        });
        setMyJoins(map);
        await load(map);
      } catch {
        await load();
      }
    } catch (e) {
      console.error("❌ Join request failed:", e.response?.data || e.message || e);
      alert(
        e.response?.data?.detail ||
          e.response?.data?.message ||
          `Join failed: ${e.message}`
      );
    }
  };


  return (
    <div className="max-w-5xl mx-auto bg-white shadow p-6 rounded">
      <h2 className="text-xl font-semibold mb-4">Available Pool Offers</h2>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <input
          placeholder="Origin"
          className="border rounded px-2 py-1"
          value={filters.origin}
          onChange={(e) => setFilters({ ...filters, origin: e.target.value })}
        />
        <input
          placeholder="Destination"
          className="border rounded px-2 py-1"
          value={filters.destination}
          onChange={(e) => setFilters({ ...filters, destination: e.target.value })}
        />
        <input
          type="date"
          className="border rounded px-2 py-1"
          value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
        />
        <button
          onClick={load}
          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
        >
          Filter
        </button>
      </div>

      {/* Table */}
      {pools.length === 0 ? (
        <p className="text-gray-600">No approved pool offers found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-green-600 text-white text-left">
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Vehicle</th>
                <th className="px-3 py-2">Avail/Total (kg)</th>
                <th className="px-3 py-2">Rate/km</th>
                <th className="px-3 py-2">Total Cost</th>
                <th className="px-3 py-2">Cost/kg</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Join</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((p) => {
                const costPerKg =
                  p.total_cost && p.total_capacity
                    ? (p.total_cost / p.total_capacity).toFixed(2)
                    : "—";
                const qty = Number(joinQty[p.id] || 0);
                const yourShare =
                  qty > 0 && costPerKg !== "—"
                    ? (qty * costPerKg).toFixed(2)
                    : null;
                const isSelf = p.provider_username === currentUser;
                const joinStatus = myJoins[p.id];

                return (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{p.provider_username}</td>
                    <td className="px-3 py-2">
                      {p.origin} → {p.destination}
                    </td>
                    <td className="px-3 py-2">{p.date}</td>
                    <td className="px-3 py-2">
                      {p.vehicle_display ||
                        `${p.vehicle_type} (${p.total_capacity} kg)`}
                    </td>
                    <td className="px-3 py-2">
                      {p.available_capacity} / {p.total_capacity}
                    </td>
                    <td className="px-3 py-2">₹{p.rate_per_km}</td>
                    <td className="px-3 py-2">₹{p.total_cost}</td>
                    <td className="px-3 py-2">₹{costPerKg}</td>
                    <td className="px-3 py-2">{p.status}</td>

                    <td className="px-3 py-2">
                      {isSelf ? (
                        <span className="text-gray-500 font-medium">
                          Your Pool
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {joinStatus === 'PENDING' ? (
                            <span className="text-yellow-700 bg-yellow-100 px-2 py-1 rounded w-fit">
                              Pending ⏳
                            </span>
                          ) : (
                            <>
                              <div className="flex gap-2 items-center">
                                <input
                                  placeholder="Produce"
                                  className="border rounded px-2 py-1 w-28"
                                  value={joinProd[p.id] || ""}
                                  onChange={(e) =>
                                    setJoinProd((prev) => ({
                                      ...prev,
                                      [p.id]: e.target.value,
                                    }))
                                  }
                                />
                                <input
                                  placeholder="Qty (kg)"
                                  type="number"
                                  className="border rounded px-2 py-1 w-24"
                                  value={joinQty[p.id] || ""}
                                  onChange={(e) =>
                                    setJoinQty((prev) => ({
                                      ...prev,
                                      [p.id]: e.target.value,
                                    }))
                                  }
                                />
                                <button
                                  onClick={() => handleJoin(p)}
                                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                >
                                  Join
                                </button>
                              </div>
                              {yourShare && (
                                <div className="text-sm text-gray-700">
                                  💰 Your Share: ₹{yourShare}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
