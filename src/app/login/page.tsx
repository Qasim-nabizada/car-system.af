'use client';

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      console.log("SignIn response:", res);

      if (res?.error) {
        // Check error type
        if (res.error.includes("deactivated")) {
          setError("Your account has been deactivated by administrator. Please contact support.");
        } else if (res.error.includes("credentials")) {
          setError("Invalid username or password");
        } else {
          setError("Login error. Please try again.");
        }
        return;
      }

      if (res?.ok) {
        // Get session information to check user role
        try {
          const sessionResponse = await fetch('/api/auth/session');
          const sessionData = await sessionResponse.json();
          
          console.log("Session data:", sessionData);
          
          if (sessionData?.user?.role === 'manager') {
            // مدیران به داشبورد می‌روند
            router.push('/dashboard');
          } else if (sessionData?.user?.role === 'user') {
            // Check if user is active
            if (sessionData.user.isActive === false) {
              setError("Your account has been deactivated. Please contact system administrator.");
              // Sign out to clear session
              await fetch('/api/auth/signout', { method: 'POST' });
              return;
            }
            // کاربران عادی مستقیماً به صفحه خرید آمریکا می‌روند
            router.push('/usa/purchase');
          } else {
            // برای سایر موارد به داشبورد
            router.push('/dashboard');
          }
        } catch (sessionError) {
          console.error("Session error:", sessionError);
          // If session retrieval fails, redirect to default page
          router.push('/dashboard');
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("System error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center p-4">
      <div className="bg-green-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-green-600">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Al Raya LLC</h1>
          <p className="text-green-200">Login to your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-green-200 mb-3 font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-green-700 text-white border border-green-600 
                         focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent
                         placeholder-green-400"
              placeholder="Enter your username"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-green-200 mb-3 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-green-700 text-white border border-green-600 
                         focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent
                         placeholder-green-400"
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>
          
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-center">
              <div className="flex items-center justify-center">
                <span className="ml-2">⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-700 
                       text-white py-3 rounded-lg transition duration-200 font-semibold
                       flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        <div className="mt-8 p-4 bg-green-700/50 rounded-lg border border-green-600">
          <h3 className="text-green-200 font-semibold mb-3 text-center">Demo Accounts</h3>
  
        </div>

        <div className="mt-6 text-center">
          <p className="text-green-400 text-sm">
      Al Raya Used Auto Spare Trading LLC
          </p>
        </div>
      </div>
    </div>
  );
}