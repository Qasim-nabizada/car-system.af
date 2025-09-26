
"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const router = useRouter();

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-green-800 shadow-lg h-screen sticky top-0 pt-16 overflow-y-auto flex flex-col justify-between">
      <div className="px-4 space-y-4 py-6">
        <h2 className="text-lg font-semibold text-white mb-6 px-2">Dashboard Menu</h2>
        <div className="space-y-2">
          <Link href="/usa-containers" className="block">
            <div className="px-3 py-2 text-green-200 hover:bg-green-700 rounded-lg cursor-pointer">
              <span>USA Containers</span>
            </div>
          </Link>
          <Link href="/uae-sales" className="block">
            <div className="px-3 py-2 text-green-200 hover:bg-green-700 rounded-lg cursor-pointer">
              <span>UAE Sales</span>
            </div>
          </Link>
          <div className="space-y-2">
            <Link href="/sold-containers" className="block">
              <div className="px-3 py-2 text-green-200 hover:bg-green-700 rounded-lg cursor-pointer">
                <span className="font-medium">Sold Containers</span>
              </div>
            </Link>
          </div>
          <div className="space-y-2">
            <Link href="/transfers" className="block">
              <div className="px-3 py-2 text-green-200 hover:bg-green-700 rounded-lg cursor-pointer">
                <span className="font-medium">Transfers</span>
              </div>
            </Link>
          </div>
          <div className="space-y-2">
            <Link href="/reports" className="block">
              <div className="px-3 py-2 text-green-200 hover:bg-green-700 rounded-lg cursor-pointer">
                <span className="font-medium">Reports</span>
              </div>
            </Link>
          </div>
          <div className="space-y-2">
            <Link href="/settings" className="block">
              <div className="px-3 py-2 text-green-200 hover:bg-green-700 rounded-lg cursor-pointer">
                <span className="font-medium">Settings</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
      <div className="px-4 pb-6">
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 bg-black green-white rounded-lg hover:bg-white-700 transition-colors"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}