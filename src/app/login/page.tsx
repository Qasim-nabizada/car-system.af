'use client';

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setError("");

  try {
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    console.log("SignIn response:", res);

if (res?.ok) {
  // دریافت session برای گرفتن نقش کاربر
  const sessionResponse = await fetch('/api/auth/session');
  const sessionData = await sessionResponse.json();
  
  if (sessionData?.user?.role === 'manager') {
    router.push('/dashboard');
  } else {
    router.push('/usa/purchase');
  }
  router.refresh();
}

  } catch (error) {
    console.error("Login error:", error);
    setError("خطای سیستمی. لطفا دوباره تلاش کنید.");
  }
}

// تابع برای دریافت نقش کاربر
async function getUserRole(username: string): Promise<string> {
  try {
    const response = await fetch(`/api/user/role?username=${username}`);
    const data = await response.json();
    return data.role;
  } catch (error) {
    console.error("Error getting user role:", error);
    return "user"; // پیش فرض
  }
}
  return (
    <div className="min-h-screen bg-green-900 flex items-center justify-center p-4">
      <div className="bg-green-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          Login to Al Raya LLC
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-green-200 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 rounded bg-green-700 text-white border border-green-600 focus:outline-none focus:border-green-400"
              placeholder="Enter username"
              required
            />
          </div>
          
          <div>
            <label className="block text-green-200 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded bg-green-700 text-white border border-green-600 focus:outline-none focus:border-green-400"
              placeholder="Enter password"
              required
            />
          </div>
          
          {error && (
            <div className="text-red-300 text-sm text-center">{error}</div>
          )}
          
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-500 transition duration-200 font-semibold"
          >
            Login
          </button>
        </form>
        
        <div className="mt-6 p-4 bg-green-700 rounded-lg">
          <h3 className="text-green-200 font-semibold mb-2 text-center">Demo Credentials</h3>
          <div className="text-green-300 text-sm text-center">
        
          </div>
        </div>
      </div>
    </div>
  );
}
