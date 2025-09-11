import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/database";
import Link from "next/link";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.role !== "manager") {
    return <p className="text-center mt-20">دسترسی ندارید. لطفا وارد شوید.</p>;
  }

  let totalContainers = 0;
  let pendingContainers = 0;
  let totalUsers = 0;
  let totalRevenue = 0;

  try {
    // دریافت داده‌های واقعی از دیتابیس با error handling
    const [
      containersCount,
      pendingCount,
      usersCount,
      recentSales
    ] = await Promise.all([
      prisma.purchaseContainer.count().catch(() => 0),
      prisma.purchaseContainer.count({
        where: { status: 'pending' }
      }).catch(() => 0),
      prisma.user.count({
        where: { role: 'user' }
      }).catch(() => 0),
      prisma.uAESale.aggregate({
        _sum: { salePrice: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }).catch(() => ({ _sum: { salePrice: 0 } }))
    ]);

    totalContainers = containersCount;
    pendingContainers = pendingCount;
    totalUsers = usersCount;
    totalRevenue = recentSales._sum.salePrice || 0;

  } catch (error) {
    console.error('Database connection error:', error);
    // در صورت خطا، مقادیر پیش‌فرض استفاده می‌شوند
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* هدر اصلی با عرض کامل و بدون فاصله */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 p-8 rounded-none shadow-lg">
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
         Al Raya Used Auto Spare Trading LLC
        </h1>
        <p className="text-green-100 text-lg text-center">
          Comprehensive management dashboard for USA purchases and UAE sales
        </p>
      </div>

      {/* محتویات اصلی با حداقل فاصله */}
      <div className="p-4">
        {/* کارت های آماری */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* کارت کل کانتینرها */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-500 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold">Total Containers</h3>
              <div className="bg-blue-700 p-1 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-16" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold">{totalContainers}</p>
            <p className="text-blue-200 text-xs mt-1">Total containers in system</p>
          </div>
          
          {/* کارت کانتینرهای در حال انتظار */}
          <div className="bg-gradient-to-br from-yellow-600 to-yellow-500 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold">Pending Containers</h3>
              <div className="bg-yellow-700 p-1 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold">{pendingContainers}</p>
            <p className="text-yellow-200 text-xs mt-1">Awaiting processing</p>
          </div>
          
          {/* کارت تعداد کاربران */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-500 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold">Active Users</h3>
              <div className="bg-purple-700 p-1 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold">{totalUsers}</p>
            <p className="text-purple-200 text-xs mt-1">Registered users</p>
          </div>
          
          {/* کارت درآمد */}
          <div className="bg-gradient-to-br from-green-600 to-green-500 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold">Revenue (AED)</h3>
              <div className="bg-green-700 p-1 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold">
              {totalRevenue.toLocaleString('en-US')}
            </p>
            <p className="text-green-200 text-xs mt-1">Last 30 days sales</p>
          </div>
        </div>

        {/* پیام خطای اتصال به دیتابیس */}
        {totalContainers === 0 && totalUsers === 0 && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-bold">Database Connection Issue</p>
                <p>Unable to connect to database. Showing placeholder data.</p>
                <p className="text-sm mt-1">Please check your database connection and refresh the page.</p>
              </div>
            </div>
          </div>
        )}

        {/* بخش‌های اضافی */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* کارت فعالیت‌های اخیر */}
          <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Activity</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                <span className="text-blue-700 text-sm">New container registered</span>
                <span className="text-xs text-gray-500">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span className="text-green-700 text-sm">UAE sale completed</span>
                <span className="text-xs text-gray-500">5 hours ago</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <span className="text-yellow-700 text-sm">Pending approval</span>
                <span className="text-xs text-gray-500">1 day ago</span>
              </div>
            </div>
          </div>

          {/* کارت وضعیت سیستم */}
          <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 text-sm">Database</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  totalContainers > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {totalContainers > 0 ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 text-sm">API Services</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 text-sm">User Authentication</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* لینک‌های سریع */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200 mt-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/usa/purchase" className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-center transition duration-200">
              <div className="font-semibold">➕ New Purchase</div>
              <div className="text-sm mt-1">Create USA container</div>
            </Link>
            
            <Link href="/settings" className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center transition duration-200">
              <div className="font-semibold">👥 User Management</div>
              <div className="text-sm mt-1">Manage users</div>
            </Link>
            
            <Link href="/reports" className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-center transition duration-200">
              <div className="font-semibold">📊 Reports</div>
              <div className="text-sm mt-1">View financial reports</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}