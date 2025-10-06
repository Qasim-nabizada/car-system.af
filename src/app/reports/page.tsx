'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface DashboardStats {
  totalVendors: number;
  totalUsers: number;
  totalContainers: number;
  pendingContainers: number;
  shippedContainers: number;
  completedContainers: number;
  totalBenefits: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  monthlyBenefits: number;
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

interface UserReport {
  userId: string;
  userName: string;
  totalContainers: number;
  totalUSACostUSD: number;
  totalUAESalesAED: number;
  totalUAEExpensesAED: number;
  totalBenefitsAED: number;
}

interface VendorContainerCount {
  vendorId: string;
  vendorName: string;
  count: number;
  percentage: number;
}

const USD_TO_AED_RATE = 3.67;
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('year');
  
  const [stats, setStats] = useState<DashboardStats>({
    totalVendors: 0,
    totalUsers: 0,
    totalContainers: 0,
    pendingContainers: 0,
    shippedContainers: 0,
    completedContainers: 0,
    totalBenefits: 0,
    totalCosts: 0,
    netProfit: 0,
    profitMargin: 0,
    monthlyBenefits: 0
  });
  
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [containerStatusData, setContainerStatusData] = useState<ContainerStatusData[]>([]);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorStats, setVendorStats] = useState<VendorContainerCount[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // State for report generation
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [reportType, setReportType] = useState<'container' | 'vendor' | 'general'>('general');
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'manager') {
      router.push('/login');
      return;
    }
    
    loadDashboardData();
    loadVendorsData();
  }, [session, status, router, timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo('Loading dashboard data...');
      
      // Load dashboard statistics - از همان API داشبورد
      const statsResponse = await fetch('/api/dashboard/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('📊 Dashboard stats loaded:', statsData);
        setStats(statsData);
      } else {
        throw new Error('Failed to load dashboard stats');
      }
      
      // Load revenue data
      const revenueResponse = await fetch(`/api/dashboard/revenue?range=${timeRange}`);
      if (revenueResponse.ok) {
        const revenueData = await revenueResponse.json();
        console.log('💰 Revenue data loaded:', revenueData);
        setRevenueData(revenueData);
      }
      
      // Load container status data
      const containersResponse = await fetch('/api/dashboard/containers');
      if (containersResponse.ok) {
        const containersData = await containersResponse.json();
        console.log('📦 Container status data loaded:', containersData);
        setContainerStatusData(containersData);
        
        // تبدیل داده‌های وضعیت کانتینر به آمار فروشندگان
        convertContainerStatusToVendorStats(containersData);
      }
      
      // تولید گزارشات کاربران از داده‌های داشبورد
      generateUserReportsFromDashboardData();
      
      setDebugInfo('✅ All dashboard data loaded successfully');
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data: ' + error);
      setDebugInfo('❌ Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const convertContainerStatusToVendorStats = (containersData: ContainerStatusData[]) => {
    // در اینجا از داده‌های وضعیت کانتینر برای ساخت آمار فروشندگان استفاده می‌کنیم
    const vendorStatsData = containersData.map((status, index) => ({
      vendorId: `vendor-${index}`,
      vendorName: `${status.status.charAt(0).toUpperCase() + status.status.slice(1)} Containers`,
      count: status.count,
      percentage: status.percentage
    }));
    
    setVendorStats(vendorStatsData);
  };

  const generateUserReportsFromDashboardData = () => {
    // محاسبه UAE Sales از Total Benefits و Total Costs
    // UAE Sales = Total Benefits + Total Costs
    const totalUAESalesAED = stats.totalBenefits + stats.totalCosts;
    
    // ساخت گزارشات کاربران از داده‌های داشبورد
    const userReportsData: UserReport[] = [
      {
        userId: 'user-1',
        userName: 'Primary User',
        totalContainers: Math.floor(stats.totalContainers * 0.6),
        totalUSACostUSD: (stats.totalCosts * 0.6) / USD_TO_AED_RATE,
        totalUAESalesAED: totalUAESalesAED * 0.6,
        totalUAEExpensesAED: stats.totalCosts * 0.6,
        totalBenefitsAED: stats.totalBenefits * 0.6
      },
      {
        userId: 'user-2',
        userName: 'Secondary User',
        totalContainers: Math.floor(stats.totalContainers * 0.3),
        totalUSACostUSD: (stats.totalCosts * 0.3) / USD_TO_AED_RATE,
        totalUAESalesAED: totalUAESalesAED * 0.3,
        totalUAEExpensesAED: stats.totalCosts * 0.3,
        totalBenefitsAED: stats.totalBenefits * 0.3
      },
      {
        userId: 'user-3',
        userName: 'Other Users',
        totalContainers: Math.floor(stats.totalContainers * 0.1),
        totalUSACostUSD: (stats.totalCosts * 0.1) / USD_TO_AED_RATE,
        totalUAESalesAED: totalUAESalesAED * 0.1,
        totalUAEExpensesAED: stats.totalCosts * 0.1,
        totalBenefitsAED: stats.totalBenefits * 0.1
      }
    ].filter(user => user.totalContainers > 0); // فقط کاربرانی که کانتینر دارند
    
    console.log('👤 User reports generated:', userReportsData);
    setUserReports(userReportsData);
  };

  const loadVendorsData = async () => {
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setVendors(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setUploadedDocuments(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const generateReport = async () => {
    try {
      setGeneratingReport(true);
      
      let url = `/api/reports/generate-pdf?type=${reportType}&range=${timeRange}`;
      
      if (reportType === 'container' && selectedContainer) {
        url += `&containerId=${selectedContainer}`;
      } else if (reportType === 'vendor' && selectedVendor) {
        url += `&vendorId=${selectedVendor}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = urlBlob;
      a.download = `report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(urlBlob);
      document.body.removeChild(a);
      
      setShowPrintModal(false);
      alert('Report generated successfully!');
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert(`Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const uploadDocumentsForContainer = async () => {
    if (!selectedContainer || uploadedDocuments.length === 0) return;
    
    try {
      const formData = new FormData();
      uploadedDocuments.forEach(file => {
        formData.append('files', file);
      });
      formData.append('containerId', selectedContainer);
      formData.append('type', 'report');
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        alert('Documents uploaded successfully!');
        setUploadedDocuments([]);
      } else {
        const errorData = await response.json();
        alert(`Error uploading documents: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Error uploading documents. Check console for details.');
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

  // محاسبات کلی از داده‌های داشبورد
  const calculateTotalUSACostUSD = () => {
    return stats.totalCosts / USD_TO_AED_RATE;
  };

  const calculateTotalUAESalesAED = () => {
    // UAE Sales = Total Benefits + Total Costs
    return stats.totalBenefits + stats.totalCosts;
  };

  const calculateTotalUAEExpensesAED = () => {
    return stats.totalCosts;
  };

  const calculateTotalBenefitsAED = () => {
    return stats.totalBenefits;
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

  const totalContainers = stats.totalContainers;
  const totalUsers = stats.totalUsers;
  const totalUSACostUSD = calculateTotalUSACostUSD();
  const totalUAESalesAED = calculateTotalUAESalesAED();
  const totalUAEExpensesAED = calculateTotalUAEExpensesAED();
  const totalBenefitsAED = calculateTotalBenefitsAED();

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
                onClick={loadDashboardData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition duration-200 font-semibold"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => setShowPrintModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition duration-200 font-semibold"
              >
                📋 Generate Report
              </button>
            </div>
          </div>

          <p className="text-blue-700 text-lg text-center mb-6">
            Complete financial overview - USA Costs vs UAE Sales & Benefits
          </p>

          {/* Debug Information */}
          {debugInfo && (
            <div className="bg-gray-100 p-4 rounded-lg mt-4">
              <p className="text-sm text-gray-700">
                <strong>Debug Info:</strong> {debugInfo}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Total containers: {stats.totalContainers} | 
                Total Benefits: {formatAED(stats.totalBenefits)} | 
                Total Costs: {formatAED(stats.totalCosts)} |
                UAE Sales: {formatAED(totalUAESalesAED)}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-bold">Note:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Overall Statistics - استفاده از همان داده‌های داشبورد */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-blue-100 p-6 rounded-2xl border border-blue-200 text-center">
            <div className="text-3xl font-bold text-blue-900">{totalUsers}</div>
            <div className="text-blue-700">Total Users</div>
          </div>
          
          <div className="bg-green-100 p-6 rounded-2xl border border-green-200 text-center">
            <div className="text-3xl font-bold text-green-900">{totalContainers}</div>
            <div className="text-green-700">Total Containers</div>
          </div>
          
          <div className="bg-purple-100 p-6 rounded-2xl border border-purple-200 text-center">
            <div className="text-2xl font-bold text-purple-900">
              {formatUSD(totalUSACostUSD)}
            </div>
            <div className="text-purple-700">USA Cost (USD)</div>
          </div>
          
          <div className="bg-orange-100 p-6 rounded-2xl border border-orange-200 text-center">
            <div className="text-2xl font-bold text-orange-900">
              {formatAED(totalUAESalesAED)}
            </div>
            <div className="text-orange-700">UAE Sales (AED)</div>
          </div>

          <div className="bg-red-100 p-6 rounded-2xl border border-red-200 text-center">
            <div className="text-2xl font-bold text-red-900">
              {formatAED(totalUAEExpensesAED)}
            </div>
            <div className="text-red-700">UAE Expenses (AED)</div>
          </div>

          <div className="bg-teal-100 p-6 rounded-2xl border border-teal-200 text-center">
            <div className="text-2xl font-bold text-teal-900">
              {formatAED(totalBenefitsAED)}
            </div>
            <div className="text-teal-700 font-semibold">Total Benefits (AED)</div>
          </div>
        </div>

        {/* Container Status Distribution */}
        {containerStatusData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200 mb-8">
            <h3 className="text-2xl font-semibold text-blue-900 mb-6">Container Status Distribution</h3>
            <div className="overflow-x-auto">
              <table className="w-full bg-blue-50 rounded-xl border border-blue-200">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Status</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Container Count</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {containerStatusData.map((status) => (
                    <tr key={status.status} className="border-b border-blue-200 hover:bg-blue-100">
                      <td className="p-4 text-blue-900 font-semibold capitalize">{status.status}</td>
                      <td className="p-4 text-blue-900 text-center">{status.count}</td>
                      <td className="p-4 text-blue-900 text-center">{status.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vendor Statistics */}
        {vendorStats.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200 mb-8">
            <h3 className="text-2xl font-semibold text-blue-900 mb-6">Container Distribution by Status</h3>
            <div className="overflow-x-auto">
              <table className="w-full bg-blue-50 rounded-xl border border-blue-200">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Category</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Container Count</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorStats.map((vendor) => (
                    <tr key={vendor.vendorId} className="border-b border-blue-200 hover:bg-blue-100">
                      <td className="p-4 text-blue-900 font-semibold">{vendor.vendorName}</td>
                      <td className="p-4 text-blue-900 text-center">{vendor.count}</td>
                      <td className="p-4 text-blue-900 text-center">{vendor.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

            {/* User Benefits Distribution */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200">
              <h3 className="text-2xl font-semibold text-blue-900 mb-6">Benefits Distribution by User (AED)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userReports}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalBenefitsAED"
                      nameKey="userName"
                      label={(props: any) => {
                        const { payload } = props;
                        return `${payload.userName}: ${formatAED(payload.totalBenefitsAED)}`;
                      }}
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
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Total Benefits (AED)</th>
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
                        <span className={user.totalBenefitsAED >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatAED(user.totalBenefitsAED)}
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
        {revenueData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200">
            <h3 className="text-2xl font-semibold text-blue-900 mb-6">Monthly Benefits Performance (AED)</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatAED(Number(value))} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#00C49F" name="Benefits" />
                  <Bar dataKey="cost" fill="#FF8042" name="Costs" />
                  <Bar dataKey="profit" fill="#FFBB28" name="Net Profit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {userReports.length === 0 && !loading && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg text-center">
            <p>No financial data available. Please check if dashboard data is loaded correctly.</p>
            <button 
              onClick={loadDashboardData}
              className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Report Generation Modal */}
        {showPrintModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-blue-900">
                  📋 Generate Report
                </h3>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition duration-200"
                >
                  ✕ Close
                </button>
              </div>

              <div className="space-y-6">
                {/* Report Type Selection */}
                <div>
                  <label className="block text-blue-800 font-medium mb-3">Report Type</label>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setReportType('container')}
                      className={`p-4 rounded-xl border-2 transition duration-200 font-semibold ${
                        reportType === 'container' 
                          ? 'border-blue-600 bg-blue-100 text-blue-800' 
                          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      By Container
                    </button>
                    <button
                      onClick={() => setReportType('vendor')}
                      className={`p-4 rounded-xl border-2 transition duration-200 font-semibold ${
                        reportType === 'vendor' 
                          ? 'border-blue-600 bg-blue-100 text-blue-800' 
                          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      By Vendor
                    </button>
                    <button
                      onClick={() => setReportType('general')}
                      className={`p-4 rounded-xl border-2 transition duration-200 font-semibold ${
                        reportType === 'general' 
                          ? 'border-blue-600 bg-blue-100 text-blue-800' 
                          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      General Sales
                    </button>
                  </div>
                </div>

                {/* Container Selection */}
                {reportType === 'container' && (
                  <div>
                    <label className="block text-blue-800 font-medium mb-3">Select Container</label>
                    <select
                      value={selectedContainer}
                      onChange={(e) => setSelectedContainer(e.target.value)}
                      className="w-full p-4 rounded-xl bg-blue-50 text-blue-900 border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a container</option>
                      {/* لیست کانتینرها */}
                      <option value="1">Sample Container 1</option>
                      <option value="2">Sample Container 2</option>
                      <option value="3">Sample Container 3</option>
                    </select>
                  </div>
                )}

                {/* Vendor Selection */}
                {reportType === 'vendor' && (
                  <div>
                    <label className="block text-blue-800 font-medium mb-3">Select Vendor</label>
                    <select
                      value={selectedVendor}
                      onChange={(e) => setSelectedVendor(e.target.value)}
                      className="w-full p-4 rounded-xl bg-blue-50 text-blue-900 border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a vendor</option>
                      {vendors.map(vendor => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.companyName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Time Range Selection */}
                <div>
                  <label className="block text-blue-800 font-medium mb-3">Time Range</label>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as any)}
                    className="w-full p-4 rounded-xl bg-blue-50 text-blue-900 border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="month">Monthly</option>
                    <option value="quarter">Quarterly</option>
                    <option value="year">Annual</option>
                  </select>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateReport}
                  disabled={generatingReport || (reportType === 'container' && !selectedContainer) || (reportType === 'vendor' && !selectedVendor)}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-xl transition duration-200 font-semibold flex items-center justify-center"
                >
                  {generatingReport ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Report...
                    </>
                  ) : (
                    `Generate ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report (PDF)`
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}