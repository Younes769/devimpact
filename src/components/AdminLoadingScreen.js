'use client';

import Image from 'next/image';

export default function AdminLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      <div className="relative w-16 h-16 mb-8">
        <Image
          src="/logo.png"
          alt="DevImpact Logo"
          width={64}
          height={64}
          className="rounded-xl animate-pulse"
        />
      </div>
      
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
        <p className="text-white/60">Loading admin panel...</p>
      </div>
    </div>
  );
} 