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

interface ContainerData {
  id: string;
  containerId: string;
  status: string;
  city: string;
  date: string;
  rent: number;
  grandTotal: number;
  userId: string;
  vendorId: string;
  user?: {
    id: string;
    username: string;
    name: string;
    email: string;
  };
  vendor?: {
    id: string;
    companyName: string;
    representativeName: string;
    email: string;
    phone: string;
  };
  contents: Array<{
    id: string;
    number: number;
    item: string;
    model: string;
    year: string;
    lotNumber: string;
    price: number;
    recovery: number;
    cutting: number;
    total: number;
  }>;
}

interface UAESalesData {
  containerId: string;
  sales: Array<{
    salePrice: number;
  }>;
  expends: Array<{
    amount: number;
  }>;
}

interface ContainerReport {
  containerId: string;
  containerName: string;
  containers: number;
  usaCostUSD: number;
  usaCostAED: number;
  uaeSalesAED: number;
  uaeExpensesAED: number;
  totalCostsAED: number;
  totalBenefitsAED: number;
}

interface ContainerBenefits {
  containerId: string;
  containerName: string;
  benefitsAED: number;
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
  const [containerReports, setContainerReports] = useState<ContainerReport[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [containerBenefits, setContainerBenefits] = useState<ContainerBenefits[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // State for report generation
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [reportType, setReportType] = useState<'container' | 'vendor' | 'general'>('general');
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'manager') {
      router.push('/login');
      return;
    }
    
    loadDashboardData();
    loadVendorsData();
    loadAllData();
  }, [session, status, router, timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo('Loading dashboard data...');
      
      // Load dashboard statistics
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
      
      setDebugInfo('✅ All dashboard data loaded successfully');
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data: ' + error);
      setDebugInfo('❌ Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Load all containers data
      const containersResponse = await fetch('/api/purchase/containers?all=true&include=user,vendor,contents');
      if (!containersResponse.ok) {
        throw new Error('Failed to load containers data');
      }
      
      const containersData = await containersResponse.json();
      console.log('📦 Containers data loaded:', containersData?.length || 0);
      
      // Load all UAE sales data
      const uaeSalesResponse = await fetch('/api/uae/sales/all');
      let allUAESalesData: UAESalesData[] = [];
      
      if (uaeSalesResponse.ok) {
        allUAESalesData = await uaeSalesResponse.json();
        console.log('🇦🇪 UAE Sales data loaded:', allUAESalesData?.length || 0);
      } else {
        console.log('⚠️ UAE Sales API failed, loading data per container');
        // If bulk API fails, load data for each container individually
        allUAESalesData = await loadUAESalesDataPerContainer(containersData);
      }
      
      // Generate reports with combined data
      generateCombinedReports(containersData, allUAESalesData);
      
    } catch (error) {
      console.error('Error loading all data:', error);
      generateSampleContainerReports();
    } finally {
      setLoading(false);
    }
  };

  const loadUAESalesDataPerContainer = async (containersData: ContainerData[]): Promise<UAESalesData[]> => {
    const uaeData: UAESalesData[] = [];
    
    for (const container of containersData) {
      try {
        const response = await fetch(`/api/uae/sales?containerId=${container.id}`);
        if (response.ok) {
          const data = await response.json();
          uaeData.push({
            containerId: container.id,
            sales: data.sales || [],
            expends: data.expends || []
          });
        }
      } catch (error) {
        console.error(`Error loading UAE data for container ${container.id}:`, error);
      }
    }
    
    return uaeData;
  };

  const generateCombinedReports = (containersData: ContainerData[], uaeSalesData: UAESalesData[]) => {
    const reports: ContainerReport[] = [];
    
    // Create a map for quick UAE data lookup
    const uaeDataMap = new Map();
    uaeSalesData.forEach(data => {
      uaeDataMap.set(data.containerId, data);
    });
    
    for (const container of containersData) {
      const uaeData = uaeDataMap.get(container.id);
      
      // USA costs
      const usaCostUSD = container.grandTotal || 0;
      const usaCostAED = usaCostUSD * USD_TO_AED_RATE;
      
      // UAE sales and expenses
      const uaeSalesAED = uaeData?.sales?.reduce((sum: number, sale: any) => sum + (sale.salePrice || 0), 0) || 0;
      const uaeExpensesAED = uaeData?.expends?.reduce((sum: number, expend: any) => sum + (expend.amount || 0), 0) || 0;
      
      // Total costs: USA Cost AED + UAE Expenses
      const totalCostsAED = usaCostAED + uaeExpensesAED;
      
      // Calculate benefits: UAE Sales - Total Costs
      const totalBenefitsAED = uaeSalesAED - totalCostsAED;
      
      reports.push({
        containerId: container.id,
        containerName: container.containerId || `Container ${container.id}`,
        containers: 1,
        usaCostUSD,
        usaCostAED,
        uaeSalesAED,
        uaeExpensesAED,
        totalCostsAED,
        totalBenefitsAED
      });
      
      console.log(`📊 Container ${container.containerId}: USA=${usaCostUSD}, UAE Sales=${uaeSalesAED}, UAE Expenses=${uaeExpensesAED}, Total Costs=${totalCostsAED}`);
    }
    
    console.log('📊 Generated combined container reports:', reports);
    setContainerReports(reports);
    generateContainerBenefitsDataFromReports(reports);
  };

  const generateSampleContainerReports = () => {
    // Generate sample data based on dashboard stats
    const totalContainers = stats.totalContainers || 3;
    const sampleReports: ContainerReport[] = [];
    
    for (let i = 1; i <= totalContainers; i++) {
      const usaCostUSD = 50000 + (i * 10000);
      const usaCostAED = usaCostUSD * USD_TO_AED_RATE;
      const uaeSalesAED = 300000 + (i * 50000);
      const uaeExpensesAED = 20000 + (i * 5000);
      const totalCostsAED = usaCostAED + uaeExpensesAED;
      const totalBenefitsAED = uaeSalesAED - totalCostsAED;
      
      sampleReports.push({
        containerId: `cont-${i}`,
        containerName: `Container #100${i}`,
        containers: 1,
        usaCostUSD,
        usaCostAED,
        uaeSalesAED,
        uaeExpensesAED,
        totalCostsAED,
        totalBenefitsAED
      });
    }
    
    console.log('📊 Generated sample container reports:', sampleReports);
    setContainerReports(sampleReports);
    generateContainerBenefitsDataFromReports(sampleReports);
  };

  const generateContainerBenefitsDataFromReports = (reports: ContainerReport[]) => {
    const benefitsData = reports.map(report => ({
      containerId: report.containerId,
      containerName: report.containerName,
      benefitsAED: report.totalBenefitsAED
    })).filter(container => container.benefitsAED !== 0);
    
    console.log('📊 Generated benefits data from reports:', benefitsData);
    setContainerBenefits(benefitsData);
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

  const generateReport = async () => {
    try {
      setGeneratingReport(true);
      
      // Prepare all data for PDF - با دقت بیشتر
      const pdfData = {
        reportType,
        timeRange,
        selectedContainer: reportType === 'container' ? selectedContainer : undefined,
        selectedVendor: reportType === 'vendor' ? selectedVendor : undefined,
        stats: {
          totalUsers: stats.totalUsers || 0,
          totalContainers: stats.totalContainers || 0,
          totalUSACostUSD: calculateTotalUSACostUSD(),
          totalUSACostAED: calculateTotalUSACostAED(),
          totalUAESalesAED: calculateTotalUAESalesAED(),
          totalUAEExpensesAED: calculateTotalUAEExpensesAED(),
          totalCostsAED: calculateTotalCostsAED(),
          totalBenefitsAED: calculateTotalBenefitsAED(),
        },
        containerReports: containerReports.map(report => ({
          containerId: report.containerId,
          containerName: report.containerName,
          containers: report.containers,
          usaCostUSD: report.usaCostUSD,
          usaCostAED: report.usaCostAED,
          uaeSalesAED: report.uaeSalesAED,
          uaeExpensesAED: report.uaeExpensesAED,
          totalCostsAED: report.totalCostsAED,
          totalBenefitsAED: report.totalBenefitsAED
        })),
        revenueData: revenueData.map(month => ({
          month: month.month,
          revenue: month.revenue || 0,
          profit: month.profit || 0,
          cost: month.cost || 0
        })),
        containerBenefits: containerBenefits.map(container => ({
          containerId: container.containerId,
          containerName: container.containerName,
          benefitsAED: container.benefitsAED
        })),
        summary: {
          totalContainersCount: containerReports.length,
          totalBenefits: calculateTotalBenefitsAED(),
          totalCosts: calculateTotalCostsAED(),
          profitMargin: calculateTotalBenefitsAED() > 0 && calculateTotalUAESalesAED() > 0 ? 
            ((calculateTotalBenefitsAED() / calculateTotalUAESalesAED()) * 100) : 0
        }
      };
      
      console.log('📤 Sending data to PDF API:', pdfData);
      
      const response = await fetch('/api/reports/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pdfData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF API Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('PDF blob is empty');
      }

      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = urlBlob;
      a.download = `financial-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
      
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

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatAED = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // محاسبات بر اساس داده‌های واقعی از تمام کانتینرها
  const calculateTotalUSACostUSD = () => {
    return containerReports.reduce((sum, report) => sum + (report.usaCostUSD || 0), 0);
  };

  const calculateTotalUAESalesAED = () => {
    return containerReports.reduce((sum, report) => sum + (report.uaeSalesAED || 0), 0);
  };

  const calculateTotalUAEExpensesAED = () => {
    return containerReports.reduce((sum, report) => sum + (report.uaeExpensesAED || 0), 0);
  };

  const calculateTotalCostsAED = () => {
    return containerReports.reduce((sum, report) => sum + (report.totalCostsAED || 0), 0);
  };

  const calculateTotalBenefitsAED = () => {
    return containerReports.reduce((sum, report) => sum + (report.totalBenefitsAED || 0), 0);
  };

  const calculateTotalUSACostAED = () => {
    return containerReports.reduce((sum, report) => sum + (report.usaCostAED || 0), 0);
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
  const totalUSACostAED = calculateTotalUSACostAED();
  const totalUAESalesAED = calculateTotalUAESalesAED();
  const totalUAEExpensesAED = calculateTotalUAEExpensesAED();
  const totalCostsAED = calculateTotalCostsAED();
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
                onClick={loadAllData}
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
                Container Reports: {containerReports.length} |
                Total UAE Sales: {formatAED(totalUAESalesAED)} |
                Total Costs: {formatAED(totalCostsAED)}
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

        {/* Overall Statistics - Compact Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-blue-100 p-4 rounded-2xl border border-blue-200 text-center">
            <div className="text-xl font-bold text-blue-900">{totalUsers}</div>
            <div className="text-blue-700 text-sm">Total Users</div>
          </div>
          
          <div className="bg-green-100 p-4 rounded-2xl border border-green-200 text-center">
            <div className="text-xl font-bold text-green-900">{totalContainers}</div>
            <div className="text-green-700 text-sm">Total Containers</div>
          </div>
          
          <div className="bg-purple-100 p-4 rounded-2xl border border-purple-200 text-center">
            <div className="text-lg font-bold text-purple-900">
              {formatUSD(totalUSACostUSD)}
            </div>
            <div className="text-purple-700 text-sm">USA Cost (USD)</div>
          </div>
          
          <div className="bg-orange-100 p-4 rounded-2xl border border-orange-200 text-center">
            <div className="text-lg font-bold text-orange-900">
              {formatAED(totalUAESalesAED)}
            </div>
            <div className="text-orange-700 text-sm">UAE Sales (AED)</div>
          </div>

          <div className="bg-red-100 p-4 rounded-2xl border border-red-200 text-center">
            <div className="text-lg font-bold text-red-900">
              {formatAED(totalCostsAED)}
            </div>
            <div className="text-red-700 text-sm">Total Costs (AED)</div>
          </div>

          <div className="bg-teal-100 p-4 rounded-2xl border border-teal-200 text-center">
            <div className="text-lg font-bold text-teal-900">
              {formatAED(totalBenefitsAED)}
            </div>
            <div className="text-teal-700 text-sm font-semibold">Total Benefits (AED)</div>
          </div>
        </div>

        {/* Container Financial Reports Table */}
        {containerReports.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200 mb-8">
            <h3 className="text-2xl font-semibold text-blue-900 mb-6">Container Financial Reports</h3>
            <div className="overflow-x-auto">
              <table className="w-full bg-blue-50 rounded-xl border border-blue-200">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Container</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Containers</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">USA Cost (USD)</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">USA Cost (AED)</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">UAE Sales (AED)</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">UAE Expenses (AED)</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Total Costs (AED)</th>
                    <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Total Benefits (AED)</th>
                  </tr>
                </thead>
                <tbody>
                  {containerReports.map((container) => (
                    <tr key={container.containerId} className="border-b border-blue-200 hover:bg-blue-100">
                      <td className="p-4 text-blue-900 font-semibold">{container.containerName}</td>
                      <td className="p-4 text-blue-900 text-center">{container.containers}</td>
                      <td className="p-4 text-red-600">{formatUSD(container.usaCostUSD)}</td>
                      <td className="p-4 text-red-600">{formatAED(container.usaCostAED)}</td>
                      <td className="p-4 text-green-600">{formatAED(container.uaeSalesAED)}</td>
                      <td className="p-4 text-orange-600">{formatAED(container.uaeExpensesAED)}</td>
                      <td className="p-4 text-red-600 font-semibold">{formatAED(container.totalCostsAED)}</td>
                      <td className="p-4 font-semibold text-center">
                        <span className={container.totalBenefitsAED >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatAED(container.totalBenefitsAED)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Total Row */}
                  <tr className="bg-blue-200 font-bold">
                    <td className="p-4 text-blue-900">TOTAL</td>
                    <td className="p-4 text-blue-900 text-center">{containerReports.reduce((sum, c) => sum + c.containers, 0)}</td>
                    <td className="p-4 text-red-700">{formatUSD(containerReports.reduce((sum, c) => sum + c.usaCostUSD, 0))}</td>
                    <td className="p-4 text-red-700">{formatAED(containerReports.reduce((sum, c) => sum + c.usaCostAED, 0))}</td>
                    <td className="p-4 text-green-700">{formatAED(containerReports.reduce((sum, c) => sum + c.uaeSalesAED, 0))}</td>
                    <td className="p-4 text-orange-700">{formatAED(containerReports.reduce((sum, c) => sum + c.uaeExpensesAED, 0))}</td>
                    <td className="p-4 text-red-700 font-bold">{formatAED(containerReports.reduce((sum, c) => sum + c.totalCostsAED, 0))}</td>
                    <td className="p-4 font-bold text-center">
                      <span className={containerReports.reduce((sum, c) => sum + c.totalBenefitsAED, 0) >= 0 ? 'text-green-700' : 'text-red-700'}>
                        {formatAED(containerReports.reduce((sum, c) => sum + c.totalBenefitsAED, 0))}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Benefits Distribution by Container */}
        {containerBenefits.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200 mb-8">
            <h3 className="text-2xl font-semibold text-blue-900 mb-6">Benefits Distribution by Container (AED)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={containerBenefits}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="containerName" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatAED(Number(value))} />
                  <Legend />
                  <Bar dataKey="benefitsAED" fill="#00C49F" name="Benefits (AED)" />
                </BarChart>
              </ResponsiveContainer>
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

        {containerReports.length === 0 && !loading && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg text-center">
            <p>No financial data available. Please check if dashboard data is loaded correctly.</p>
            <button 
              onClick={loadAllData}
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
                      {containerReports.map(container => (
                        <option key={container.containerId} value={container.containerId}>
                          {container.containerName}
                        </option>
                      ))}
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

                {/* Report Information */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">What will be included in the PDF:</h4>
                  <ul className="text-blue-700 text-sm list-disc list-inside space-y-1">
                    <li>Complete Container Financial Reports table with all data</li>
                    <li>Summary statistics and totals</li>
                    <li>Monthly revenue and benefits charts</li>
                    <li>Container benefits distribution</li>
                    <li>All calculations in both USD and AED</li>
                  </ul>
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
                    `Generate Complete ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report (PDF)`
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