'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

interface UserReport {
  userId: string;
  userName: string;
  totalContainers: number;
  totalUSACostUSD: number; // هزینه‌های آمریکا به دلار
  totalUAESalesAED: number; // فروش امارات به درهم
  totalUAEExpensesAED: number; // هزینه‌های امارات به درهم
  totalProfitAED: number; // سود نهایی به درهم
}

interface MonthlyReport {
  month: string;
  salesAED: number;
  expensesAED: number;
  profitAED: number;
}

interface ApiResponse {
  success: boolean;
  data: {
    userReports: UserReport[];
    monthlyReports: MonthlyReport[];
    summary: {
      totalUsers: number;
      totalContainers: number;
      totalUSACostUSD: number;
      totalUAESalesAED: number;
      totalUAEExpensesAED: number;
      totalNetProfitAED: number;
    };
  };
}

const USD_TO_AED_RATE = 3.67;
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('year');
  
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'manager') {
      router.push('/login');
      return;
    }
    
    loadReportsData();
  }, [session, status, router, timeRange]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/reports?range=${timeRange}`);
      
      if (response.ok) {
        const result: ApiResponse = await response.json();
        
        if (result.success && result.data) {
          setUserReports(result.data.userReports || []);
          setMonthlyReports(result.data.monthlyReports || []);
          setSummary(result.data.summary || null);
        } else {
          setError('Invalid data format from server');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Failed to load reports: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setError('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatAED = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AED'
    }).format(amount);
  };

  const formatNumber = (number: number) => {
    return new Intl.NumberFormat('en-US').format(number);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-blue-800 text-xl">Loading reports...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex flex-col">
      <Navbar />
      
      <main className="flex-1 p-6 pt-24">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-blue-200">
          <div className="flex justify-between items-center mb-6">
            <Link 
              href="/dashboard"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition duration-200 font-semibold flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </Link>
            
            <h1 className="text-4xl font-bold text-blue-900 text-center">
              📊 Financial Reports
            </h1>
            
            <div className="flex space-x-2">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl border border-blue-500"
              >
                <option value="month">Monthly</option>
                <option value="quarter">Quarterly</option>
                <option value="year">Yearly</option>
              </select>
              <button
                onClick={loadReportsData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition duration-200 font-semibold"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          <p className="text-blue-700 text-lg text-center mb-6">
            Complete financial overview - USA Costs vs UAE Sales & Profits
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
            <button 
              onClick={loadReportsData}
              className="mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Overall Statistics */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-100 p-6 rounded-2xl border border-blue-200 text-center">
              <div className="text-3xl font-bold text-blue-900">{summary.totalUsers}</div>
              <div className="text-blue-700">Total Users</div>
            </div>
            
            <div className="bg-green-100 p-6 rounded-2xl border border-green-200 text-center">
              <div className="text-3xl font-bold text-green-900">{summary.totalContainers}</div>
              <div className="text-green-700">Total Containers</div>
            </div>
            
            <div className="bg-purple-100 p-6 rounded-2xl border border-purple-200 text-center">
              <div className="text-3xl font-bold text-purple-900">
                {formatUSD(summary.totalUSACostUSD)}
              </div>
              <div className="text-purple-700">Total USA Cost (USD)</div>
            </div>
            
            <div className="bg-orange-100 p-6 rounded-2xl border border-orange-200 text-center">
              <div className="text-3xl font-bold text-orange-900">
                {formatAED(summary.totalNetProfitAED)}
              </div>
              <div className="text-orange-700">Net Profit (AED)</div>
            </div>
          </div>
        )}

        {/* User Performance Charts */}
        {userReports.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* User Containers Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200">
              <h3 className="text-2xl font-semibold text-blue-900 mb-6">Containers per User</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userReports}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="userName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalContainers" fill="#0088FE" name="Containers" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* User Profit Distribution */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200">
              <h3 className="text-2xl font-semibold text-blue-900 mb-6">Profit Distribution by User (AED)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userReports}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalProfitAED"
                      nameKey="userName"
                      label={({ userName, totalProfitAED }) => 
                        `${userName}: ${formatAED(totalProfitAED)}`}
                    >
                      {userReports.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatAED(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Detailed User Reports Table */}
        {userReports.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200 mb-8">
            <h3 className="text-2xl font-semibold text-blue-900 mb-6">Detailed User Financial Reports</h3>
            <div className="overflow-x-auto">
              <table className="w-full bg-blue-50 rounded-xl border border-blue-200">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">User</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Containers</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">USA Cost (USD)</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">USA Cost (AED)</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">UAE Sales (AED)</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">UAE Expenses (AED)</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Net Profit (AED)</th>
                  </tr>
                </thead>
                <tbody>
                  {userReports.map((user) => (
                    <tr key={user.userId} className="border-b border-blue-200 hover:bg-blue-100">
                      <td className="p-4 text-blue-900 font-semibold">{user.userName}</td>
                      <td className="p-4 text-blue-900 text-center">{user.totalContainers}</td>
                      <td className="p-4 text-red-600">{formatUSD(user.totalUSACostUSD)}</td>
                      <td className="p-4 text-red-600">{formatAED(user.totalUSACostUSD * USD_TO_AED_RATE)}</td>
                      <td className="p-4 text-green-600">{formatAED(user.totalUAESalesAED)}</td>
                      <td className="p-4 text-orange-600">{formatAED(user.totalUAEExpensesAED)}</td>
                      <td className="p-4 font-semibold">
                        <span className={user.totalProfitAED >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatAED(user.totalProfitAED)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Monthly Reports */}
        {monthlyReports.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200">
            <h3 className="text-2xl font-semibold text-blue-900 mb-6">Monthly Sales Performance (AED)</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyReports}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatAED(Number(value))} />
                  <Legend />
                  <Bar dataKey="salesAED" fill="#00C49F" name="Sales" />
                  <Bar dataKey="expensesAED" fill="#FF8042" name="Expenses" />
                  <Bar dataKey="profitAED" fill="#FFBB28" name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {userReports.length === 0 && !loading && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg text-center">
            <p>No financial data available. Users need to create containers and complete UAE sales.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}