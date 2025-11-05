import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-8 bg-white border-t">
      <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-600 flex flex-col md:flex-row items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-green-700">AgriPool</span> · Efficient logistics for farmers
        </div>
        <div className="flex gap-4">
          <a className="hover:text-green-700" href="/pools">Browse Pools</a>
          <a className="hover:text-green-700" href="/create-pool-offer">Create Offer</a>
          <a className="hover:text-green-700" href="/profile">Profile</a>
        </div>
      </div>
    </footer>
  );
}
