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

interface UserReport {
  userId: string;
  userName: string;
  totalContainers: number;
  totalUSACostUSD: number;
  totalUAESalesAED: number;
  totalUAEExpensesAED: number;
  totalProfitAED: number;
}

interface MonthlyReport {
  month: string;
  salesAED: number;
  expensesAED: number;
  profitAED: number;
}

interface ContainerData {
  id: string;
  containerId: string;
  status: string;
  city: string;
  date: string;
  grandTotal: number;
  rent: number;
  userId: string;
  vendorId: string;
  user: {
    id: string;
    username: string;
    name: string;
  };
  vendor?: {
    id: string;
    companyName: string;
  };
}

interface Vendor {
  id: string;
  companyName: string;
  containerCount?: number;
}

interface VendorContainerCount {
  vendorId: string;
  count: number;
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
  const [containers, setContainers] = useState<ContainerData[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorStats, setVendorStats] = useState<any>({
    totalVendors: 0,
    vendorContainerCounts: []
  });

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
    
    loadReportsData();
    loadContainersData();
    loadVendorsData();
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

  const loadContainersData = async () => {
    try {
      const response = await fetch('/api/purchase/containers?all=true');
      if (response.ok) {
        const data = await response.json();
        setContainers(data);
        
        // Calculate vendor container counts
        const vendorCounts: Record<string, number> = {};
        data.forEach((container: ContainerData) => {
          if (container.vendorId) {
            vendorCounts[container.vendorId] = (vendorCounts[container.vendorId] || 0) + 1;
          }
        });
        
        setVendorStats({
          totalVendors: Object.keys(vendorCounts).length,
          vendorContainerCounts: Object.entries(vendorCounts).map(([vendorId, count]) => ({
            vendorId,
            count
          }))
        });
      }
    } catch (error) {
      console.error('Error loading containers:', error);
    }
  };

  const loadVendorsData = async () => {
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      } else {
        console.error('Failed to load vendors:', response.status);
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
    console.log('Starting report generation...');
    
    let url = `/api/reports/generate-pdf?type=${reportType}&range=${timeRange}`;
    console.log('Request URL:', url);
    
    if (reportType === 'container' && selectedContainer) {
      url += `&containerId=${selectedContainer}`;
    } else if (reportType === 'vendor' && selectedVendor) {
      url += `&vendorId=${selectedVendor}`;
    }
    
    console.log('Final URL:', url);
    
    const response = await fetch(url);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    // بقیه کد...
  } catch (error) {
    console.error('Detailed error:', error);
    alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
              <button
                onClick={() => setShowPrintModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition duration-200 font-semibold"
              >
                📋 Generate Report
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-8">
          {summary && (
            <>
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
                <div className="text-purple-700">USA Cost (USD)</div>
              </div>
              
              <div className="bg-orange-100 p-6 rounded-2xl border border-orange-200 text-center">
                <div className="text-2xl font-bold text-orange-900">
                  {formatAED(summary.totalNetProfitAED)}
                </div>
                <div className="text-orange-700">Net Profit (AED)</div>
              </div>
            </>
          )}
          
          {/* Vendor Statistics */}
          <div className="bg-indigo-100 p-6 rounded-2xl border border-indigo-200 text-center">
            <div className="text-3xl font-bold text-indigo-900">{vendorStats.totalVendors}</div>
            <div className="text-indigo-700">Total Vendors</div>
          </div>
          
          <div className="bg-pink-100 p-6 rounded-2xl border border-pink-200 text-center">
            <div className="text-3xl font-bold text-pink-900">
              {vendors.length > 0 ? Math.round(containers.length / vendors.length) : 0}
            </div>
            <div className="text-pink-700">Avg Containers per Vendor</div>
          </div>
        </div>

        {/* Vendor Container Counts */}
        {vendorStats.vendorContainerCounts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200 mb-8">
            <h3 className="text-2xl font-semibold text-blue-900 mb-6">Containers per Vendor</h3>
            <div className="overflow-x-auto">
              <table className="w-full bg-blue-50 rounded-xl border border-blue-200">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Vendor</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Container Count</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorStats.vendorContainerCounts.map((item: VendorContainerCount) => {
                    const vendor = vendors.find(v => v.id === item.vendorId);
                    const percentage = (item.count / containers.length) * 100;
                    
                    return (
                      <tr key={item.vendorId} className="border-b border-blue-200 hover:bg-blue-100">
                        <td className="p-4 text-blue-900 font-semibold">{vendor?.companyName || 'Unknown Vendor'}</td>
                        <td className="p-4 text-blue-900 text-center">{item.count}</td>
                        <td className="p-4 text-blue-900 text-center">{percentage.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
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
                      label={(props: any) => {
                        const { payload } = props;
                        return `${payload.userName}: ${formatAED(payload.totalProfitAED)}`;
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
                      {containers.map(container => (
                        <option key={container.id} value={container.id}>
                          {container.containerId} - {container.user?.name || 'Unknown'} ({container.status})
                        </option>
                      ))}
                    </select>

                    {/* Document Upload for Container */}
                    {selectedContainer && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <label className="block text-blue-800 font-medium mb-3">Upload Documents for Selected Container</label>
                        <input
                          type="file"
                          multiple
                          onChange={handleDocumentUpload}
                          className="w-full p-2 rounded-lg bg-white text-blue-900 border border-blue-300 mb-3"
                        />
                        
                        {uploadedDocuments.length > 0 && (
                          <div className="mb-3">
                            <p className="text-blue-700 font-medium mb-2">Selected files:</p>
                            <ul className="space-y-1">
                              {uploadedDocuments.map((file, index) => (
                                <li key={index} className="flex justify-between items-center bg-white p-2 rounded border">
                                  <span className="text-blue-900 text-sm truncate">{file.name}</span>
                                  <button
                                    onClick={() => removeDocument(index)}
                                    className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                                  >
                                    Remove
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <button
                          onClick={uploadDocumentsForContainer}
                          disabled={uploadedDocuments.length === 0}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition duration-200"
                        >
                          Upload Documents
                        </button>
                      </div>
                    )}
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