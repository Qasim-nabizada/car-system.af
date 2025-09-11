'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    // فقط در سمت کلاینت اجرا میشه
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isLoggedIn');
      router.push('/login');
    }
  };

  return (
    <header className="bg-gradient-to-r from-green-600 to-green-400 shadow fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-center relative">
        <h1 className="text-4xl font-bold text-white text-center">
          Al Raya Used Auto Spare Trading LLC
        </h1>
        
        <div className="absolute right-4 flex items-center space-x-4">
          <div className="relative">
            <Image
              src="/LLC.png"
              alt="LLC Logo"
              width={60}
              height={30}
              className="object-contain filter brightness-0 invert"
            />
          </div>
          <button
            onClick={handleLogout}
            className="bg-white text-green-800 px-3 py-1 rounded text-sm hover:bg-gray-200"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}