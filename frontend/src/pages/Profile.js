import React, { useEffect, useState } from "react";
import api from "../api";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState({
    username: "",
    location: "",
    contact: "",
    farm_size: "",
    preferred_crops: [],
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("farmer/profile/");
        if (!mounted) return;
        setProfile({
          username: res.data.username || JSON.parse(localStorage.getItem("user") || "{}").username || "",
          location: res.data.location || "",
          contact: res.data.contact || "",
          farm_size: res.data.farm_size ?? "",
          preferred_crops: Array.isArray(res.data.preferred_crops) ? res.data.preferred_crops : [],
        });
      } catch (e) {
        if (!mounted) return;
        setError(e.response?.data?.detail || "Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const save = async () => {
    setError("");
    try {
      const body = { ...profile };
      // Ensure preferred_crops is array
      if (!Array.isArray(body.preferred_crops)) {
        body.preferred_crops = [];
      }
      await api.put("farmer/profile/", body);
      // update local user name if changed
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        if (u && profile.username) {
          u.username = profile.username;
          localStorage.setItem("user", JSON.stringify(u));
        }
      } catch {}
      alert("Profile updated!");
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to save profile");
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded shadow mt-6">
      <h2 className="text-2xl font-bold text-green-700 mb-4">Farmer Profile</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600 mb-3">{error}</p>}

      {!loading && (
        <>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            className="border w-full mb-3 p-2 rounded"
            value={profile.username}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            placeholder="Username"
          />

          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            className="border w-full mb-3 p-2 rounded"
            value={profile.location}
            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
            placeholder="City, District"
          />

          <label className="block text-sm font-medium mb-1">Contact</label>
          <input
            className="border w-full mb-3 p-2 rounded"
            value={profile.contact}
            onChange={(e) => setProfile({ ...profile, contact: e.target.value })}
            placeholder="Phone number"
          />

          <label className="block text-sm font-medium mb-1">Farm Size (acres)</label>
          <input
            className="border w-full mb-3 p-2 rounded"
            value={profile.farm_size}
            onChange={(e) => setProfile({ ...profile, farm_size: e.target.value })}
            placeholder="e.g., 12.5"
          />

          <label className="block text-sm font-medium mb-1">Preferred Crops</label>
          <input
            className="border w-full mb-3 p-2 rounded"
            value={(profile.preferred_crops || []).join(", ")}
            onChange={(e) =>
              setProfile({
                ...profile,
                preferred_crops: e.target.value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Wheat, Soybean, Corn"
          />

          <div className="mt-4">
            <button
              onClick={save}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Save
            </button>
          </div>
        </>
      )}
    </div>
  );
}
