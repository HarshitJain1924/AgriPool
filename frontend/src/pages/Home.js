import React, { useState, useEffect } from 'react';
import hero1 from '../images/hero1.jpg';
import hero2 from '../images/hero2.jpg';
import hero3 from '../images/hero3.jpg';
import hero4 from '../images/hero4.jpg';

export default function Home() {
  const [user, setUser] = useState(null);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      setUser(storedUser || null);
    } catch {
      setUser(null);
    }
    setHasToken(!!localStorage.getItem('access'));
  }, []);

  return (
    <div className="bg-white shadow-md p-6 sm:p-8 lg:p-10 rounded-xl mt-8">
      <h1 className="text-4xl font-bold text-green-700 mb-4">Welcome to AgriPool</h1>
      <p className="text-gray-700 mb-8 text-lg">
        A simple marketplace to share transport capacity for farm produce. Create pool offers as a provider,
        or join available pools as a farmer.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[140px] md:auto-rows-[180px] lg:auto-rows-[220px] gap-4 md:gap-6 mb-10 mx-auto max-w-100">
        {/* First (large) tile spans two rows – height now derives from grid auto-rows so it matches the bottom of the 4th image */}
        <div className="col-span-2 row-span-2 relative group overflow-hidden rounded-2xl h-full">
          <img src={hero1} alt="A large farm transport truck" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-green-800 bg-opacity-20 group-hover:bg-opacity-30 transition-all"></div>
        </div>
        <div className="relative group overflow-hidden rounded-2xl h-full">
          <img src={hero2} alt="Fresh farm produce ready for transport" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-green-800 bg-opacity-20 group-hover:bg-opacity-30 transition-all"></div>
        </div>
        <div className="relative group overflow-hidden rounded-2xl h-full">
          <img src={hero3} alt="Farmers collaborating on logistics" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-green-800 bg-opacity-20 group-hover:bg-opacity-30 transition-all"></div>
        </div>
        {/* Bottom wide tile – one row tall; using grid track height for perfect alignment */}
        <div className="col-span-2 relative group overflow-hidden rounded-2xl hidden md:block h-full">
          <img src={hero4} alt="Green fields with transport vehicles" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-green-800 bg-opacity-20 group-hover:bg-opacity-30 transition-all"></div>
        </div>
      </div>

      {!hasToken ? (
        <div className="flex gap-4 justify-center">
          <a href="/login" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-all" tabIndex={0}>Login</a>
          <a href="/signup" className="border border-green-600 text-green-700 px-6 py-2 rounded-lg hover:bg-green-50 transition-all" tabIndex={0}>Signup</a>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-gray-600 mb-3">
            Logged in as <span className="font-semibold">{user?.username || 'user'}</span>
          </p>
          <div className="flex gap-4 justify-center">
            {user?.is_admin ? (
              <a href="/admin/pool-offers" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-all" tabIndex={0}>Go to Admin</a>
            ) : (
              <a href="/pools" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-all" tabIndex={0}>Browse Pools</a>
            )}
            {user?.is_farmer && (
              <a href="/my-pools" className="border border-green-600 text-green-700 px-6 py-2 rounded-lg hover:bg-green-50 transition-all" tabIndex={0}>My Pools</a>
            )}
          </div>
        </div>
      )}
      <hr className="my-8" />
      <div className="text-sm text-gray-500 text-center">
        Tip: Use the navbar to navigate. Admins can review pool offers; farmers can create offers and join pools.
      </div>
    </div>
  );
}
