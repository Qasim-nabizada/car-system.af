// src/app/page.tsx
export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-200 via-green-400 to-green-700">
      <div className="bg-white bg-opacity-90 rounded-2xl shadow-2xl p-10 flex flex-col items-center">
        <h1 className="text-4xl font-extrabold text-green-800 mb-4 drop-shadow-lg">Welcome to Al Raya LLC</h1>
        <p className="text-lg text-green-700 mb-8">Manage your cars, containers, and sales with ease.</p>
        <a
          href="/login"
          className="px-8 py-3 rounded-full bg-green-600 text-white font-semibold text-lg shadow-md hover:bg-green-700 transition-colors duration-200"
        >
          Go to Login
        </a>
      </div>
    </div>
  );
}