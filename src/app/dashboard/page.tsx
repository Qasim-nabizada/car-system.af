// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface DashboardStats {
  totalVendors: number;
  totalUsers: number;
  totalContainers: number;
  pendingContainers: number;
  shippedContainers: number;
  completedContainers: number;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  monthlyRevenue: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  profit: number;
  cost: number;
}

interface ContainerStatusData {
  status: string;
  count: number;
  percentage: number;
}

interface ProfitByCategory {
  category: string;
  profit: number;
  color: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalVendors: 0,
    totalUsers: 0,
    totalContainers: 0,
    pendingContainers: 0,
    shippedContainers: 0,
    completedContainers: 0,
    totalRevenue: 0,
    totalCosts: 0,
    netProfit: 0,
    profitMargin: 0,
    monthlyRevenue: 0
  });
  
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [containerStatusData, setContainerStatusData] = useState<ContainerStatusData[]>([]);
  const [profitByCategory, setProfitByCategory] = useState<ProfitByCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }
    
    loadDashboardData();
  }, [session, status, router, timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard statistics
      const statsResponse = await fetch('/api/dashboard/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
      
      // Load revenue data
      const revenueResponse = await fetch(`/api/dashboard/revenue?range=${timeRange}`);
      if (revenueResponse.ok) {
        const revenueData = await revenueResponse.json();
        setRevenueData(revenueData);
      }
      
      // Load container status data
      const containersResponse = await fetch('/api/dashboard/containers');
      if (containersResponse.ok) {
        const containersData = await containersResponse.json();
        setContainerStatusData(containersData);
      }
      
      // Load profit by category
      const profitResponse = await fetch('/api/dashboard/profit-by-category');
      if (profitResponse.ok) {
        const profitData = await profitResponse.json();
        setProfitByCategory(profitData);
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Colors for charts
  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];
  
  const statusColors: { [key: string]: string } = {
    pending: '#F59E0B',
    shipped: '#3B82F6',
    completed: '#10B981'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-green-800 mt-4 text-lg">Loading Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 p-6 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="text-center flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Al Raya Used Auto Spare Trading LLC
            </h1>
            <p className="text-green-100 text-lg mt-2">
              Profitability Dashboard & Analytics
            </p>
          </div>
          <div className="ml-6">
            <Image
              src="/LLC.png"
              alt="LLC Logo"
              width={100}
              height={60}
              className="object-contain filter brightness-0 invert"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Time Range Selector */}
          <div className="flex justify-between items-center mb-6">
            <div className="bg-white rounded-lg shadow-sm p-2 border border-green-200">
              <div className="flex space-x-1">
                {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition duration-200 ${
                      timeRange === range
                        ? 'bg-green-600 text-white'
                        : 'text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
      
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Net Profit Card */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-500 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Net Profit</h3>
                <div className="bg-green-700 p-2 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold mb-2">
                ${stats.netProfit.toLocaleString('en-US')}
              </p>
              <div className="flex items-center">
                <span className="text-green-200 text-sm">Profit after all costs</span>
              </div>
            </div>

            {/* Total Revenue Card */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-500 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Total Revenue</h3>
                <div className="bg-blue-700 p-2 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold mb-2">
                ${stats.totalRevenue.toLocaleString('en-US')}
              </p>
              <div className="flex items-center">
                <span className="text-blue-200 text-sm">Total UAE sales revenue</span>
              </div>
            </div>

            {/* Profit Margin Card */}
            <div className="bg-gradient-to-br from-purple-600 to-purple-500 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Profit Margin</h3>
                <div className="bg-purple-700 p-2 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold mb-2">
                {stats.profitMargin}%
              </p>
              <div className="flex items-center">
                <span className="text-purple-200 text-sm">Net profit margin</span>
              </div>
            </div>

            {/* Total Containers Card */}
            <div className="bg-gradient-to-br from-amber-600 to-amber-500 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Total Containers</h3>
                <div className="bg-amber-700 p-2 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-16" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold mb-2">
                {stats.totalContainers}
              </p>
              <div className="flex items-center">
                <span className="text-amber-200 text-sm">Containers managed</span>
              </div>
            </div>
          </div>

          {/* Secondary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-4 rounded-xl shadow border border-green-200 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalVendors}</div>
              <div className="text-gray-600">Total Vendors</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow border border-green-200 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
              <div className="text-gray-600">Active Users</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow border border-green-200 text-center">
              <div className="text-2xl font-bold text-purple-600">${stats.totalCosts.toLocaleString()}</div>
              <div className="text-gray-600">Total Costs</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow border border-green-200 text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.completedContainers}</div>
              <div className="text-gray-600">Completed Containers</div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Trend Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-green-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Revenue & Profit Trend</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']}
                      labelFormatter={(label) => `Period: ${label}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10B981" 
                      strokeWidth={3}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      name="Revenue"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      name="Profit"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Container Status Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-green-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Container Status Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={containerStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                     
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {containerStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={statusColors[entry.status] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Containers']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Additional Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Profit by Category */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-green-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Profit by Container Status</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitByCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="category" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Profit']}
                    />
                    <Legend />
                    <Bar dataKey="profit" name="Profit">
                      {profitByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Performance */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-green-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Revenue vs Cost Analysis</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#10B981" />
                    <Bar dataKey="cost" name="Cost" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Container Status Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-400 p-6 rounded-2xl shadow-lg text-white text-center">
              <div className="text-4xl font-bold mb-2">{stats.pendingContainers}</div>
              <div className="text-yellow-100">Pending Containers</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-400 p-6 rounded-2xl shadow-lg text-white text-center">
              <div className="text-4xl font-bold mb-2">{stats.shippedContainers}</div>
              <div className="text-blue-100">Shipped Containers</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-400 p-6 rounded-2xl shadow-lg text-white text-center">
              <div className="text-4xl font-bold mb-2">{stats.completedContainers}</div>
              <div className="text-green-100">Completed Containers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-green-800 to-emerald-700 text-white py-6 px-4 mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-center md:text-center text-white">
              All Rights Reserved © 2025 | Qasim Jamal
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <button 
                onClick={loadDashboardData}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}