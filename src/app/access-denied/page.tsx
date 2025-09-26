// app/access-denied/page.tsx
'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function AccessDenied() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
        
        {session?.user.role === 'user' && !session.user.isActive ? (
          <p className="text-gray-600 mb-6">
            Your account has been deactivated by the administrator. 
            Please contact support for more information.
          </p>
        ) : (
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
          </p>
        )}

        <div className="flex flex-col space-y-4">
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold"
          >
            Go to Dashboard
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-xl transition-all duration-200 font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}