// src/app/usa-containers/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface ContentData {
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
}

interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  containerId: string;
  createdAt: string;
  originalName?: string;
  path?: string;
}

interface VendorData {
  id: string;
  companyName: string;
  representativeName: string;
  email: string;
  phone: string;
  country: string;
}

interface UserData {
  id: string;
  username: string;
  name: string;
  email: string;
  role?: string;
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
  user?: UserData;
  vendor?: VendorData;
  contents: ContentData[];
  documents: Document[];
  createdAt: string;
  updatedAt: string;
}

interface StatsData {
  totalContainers: number;
  totalRevenue: number;
  totalItems: number;
  totalRent: number;
  totalContentsCost: number;
  avgContainerValue: number;
  avgItemsPerContainer: number;
  pendingCount: number;
  shippedCount: number;
  completedCount: number;
  userCount: number;
  vendorCount: number;
}

interface TransferData {
  id: string;
  containerId?: string;
  container?: {
    id: string;
    containerId: string;
  };
  senderId: string;
  receiverId: string;
  amount: number;
  type: string;
  status: string;
  date: string;
  description?: string;
  sender?: UserData;
  receiver?: UserData;
}

export default function USAContainersManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [containers, setContainers] = useState<ContainerData[]>([]);
  const [filteredContainers, setFilteredContainers] = useState<ContainerData[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<ContainerData | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [selectedContainerTransfers, setSelectedContainerTransfers] = useState<any[]>([]);

  const [stats, setStats] = useState<StatsData>({
    totalContainers: 0,
    totalRevenue: 0,
    totalItems: 0,
    totalRent: 0,
    totalContentsCost: 0,
    avgContainerValue: 0,
    avgItemsPerContainer: 0,
    pendingCount: 0,
    shippedCount: 0,
    completedCount: 0,
    userCount: 0,
    vendorCount: 0
  });
  
  const [filters, setFilters] = useState({
    userId: '',
    vendorId: '',
    containerId: '',
    status: ''
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'containers' | 'users' | 'vendors' | 'my-transfers'>('containers');
  const [myTransfers, setMyTransfers] = useState<any[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [containerTransfers, setContainerTransfers] = useState<{[key: string]: TransferData[]}>({});
  const [allTransfers, setAllTransfers] = useState<TransferData[]>([]);

  const loadContainerDocuments = async (containerId: string) => {
    try {
      setLoadingDocuments(true);
      console.log(`📄 Loading documents for container: ${containerId}`);
      
      const response = await fetch(`/api/documents?containerId=${containerId}`);
      
      if (response.ok) {
        const documentsData = await response.json();
        console.log(`✅ Loaded ${documentsData.length} documents`);
        setDocuments(documentsData);
        return documentsData;
      } else {
        console.error('❌ API Error:', response.status);
        setDocuments([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading documents:', error);
      setDocuments([]);
      return [];
    } finally {
      setLoadingDocuments(false);
    }
  };

  const loadContainerTransfers = async (containerId: string) => {
    try {
      console.log(`🔄 Loading transfers for container: ${containerId}`);
      
      const response = await fetch(`/api/transfers/container/${containerId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const transfers = await response.json();
        console.log(`✅ Loaded ${transfers.length} transfers for container ${containerId}`);
        
        setContainerTransfers(prev => ({
          ...prev,
          [containerId]: transfers
        }));
        
        return transfers;
      } else {
        console.error('❌ Failed to load container transfers:', response.status);
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading container transfers:', error);
      return [];
    }
  };

  const loadAllTransfers = async () => {
    try {
      console.log('🔄 Loading all transfers...');
      const response = await fetch('/api/transfers', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const transfersData = await response.json();
        setAllTransfers(transfersData);
        console.log(`✅ Loaded ${transfersData.length} total transfers`);
        return transfersData;
      }
      return [];
    } catch (error) {
      console.error('❌ Error loading all transfers:', error);
      return [];
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Starting to load all data...');
      
      // Load containers با timeout
      const [containersResponse, transfersData] = await Promise.all([
        fetch('/api/purchase/containers?all=true&include=user,vendor,contents,documents', {
          credentials: 'include'
        }),
        loadAllTransfers()
      ]);
      
      if (!containersResponse.ok) {
        throw new Error(`Failed to load containers: ${containersResponse.status}`);
      }
        
      const containersData = await containersResponse.json();
      console.log('📦 Containers loaded:', containersData?.length || 0);
      
      if (containersData && Array.isArray(containersData)) {
        const validContainers = containersData.filter(container => 
          container && container.id
        ).map(container => ({
          ...container,
          contents: container.contents || [],
          documents: container.documents || [],
          user: container.user || undefined,
          vendor: container.vendor || undefined
        }));
        
        setContainers(validContainers);
        setFilteredContainers(validContainers);
        calculateStats(validContainers);
        
        console.log('✅ Data loaded successfully');
      } else {
        setError('Invalid data received from server');
      }
    } catch (error) {
      console.error('❌ Load error:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
      console.log('🏁 Loading finished');
    }
  };
const calculateFinancialSummary = useCallback((container: ContainerData) => {
  const contentsTotal = container.contents?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
  const rent = container.rent || 0;
  const grandTotal = container.grandTotal || 0;
  
  // راه حل: چندین روش برای تطابق containerId
  const containerTransfers = allTransfers.filter(transfer => {
    // روش 1: تطابق مستقیم containerId
    if (transfer.containerId === container.id) return true;
    
    // روش 2: تطابق از طریق relation container
    if (transfer.container?.id === container.id) return true;
    
    // روش 3: تطابق از طریق containerId نمایشی
    if (transfer.container?.containerId === container.containerId) return true;
    
    return false;
  });
  
  console.log('🔍 Transfer Matching Debug:', {
    containerId: container.id,
    containerContainerId: container.containerId,
    allTransfersCount: allTransfers.length,
    matchedTransfers: containerTransfers.length,
    transfers: containerTransfers // اضافه کردن برای دیباگ
  });
  
  // محاسبه مجموع تمام ترانسفرها (صرف نظر از وضعیت)
  const totalTransfersAmount = containerTransfers.reduce((sum, transfer) => sum + (transfer.amount || 0), 0);
  
  // محاسبه مجموع ترانسفرهای completed
  const completedTransfersAmount = containerTransfers
    .filter(t => t.status === 'completed')
    .reduce((sum, transfer) => sum + (transfer.amount || 0), 0);
  
  const remainingBalance = grandTotal - completedTransfersAmount;
  
  return {
    contentsTotal,
    rent,
    grandTotal,
    totalTransfers: totalTransfersAmount, // تغییر: مجموع مبالغ به جای تعداد
    completedTransfersAmount, // مجموع مبالغ completed
    remainingBalance,
    transfersCount: containerTransfers.length, // تعداد ترانسفرها
    completedTransfersCount: containerTransfers.filter(t => t.status === 'completed').length, // تعداد completed
    allContainerTransfers: containerTransfers
  };
}, [allTransfers]);

  const loadMyTransfers = async () => {
    try {
      setLoadingTransfers(true);
      const response = await fetch('/api/transfers', {
        credentials: 'include'
      });
        
      if (response.ok) {
        const transfersData = await response.json();
        
        // فیلتر کردن transfers مربوط به کاربر جاری
        const userTransfers = transfersData.filter((transfer: any) => 
          transfer.senderId === session?.user?.id || 
          transfer.receiverId === session?.user?.id
        );
        
        setMyTransfers(userTransfers);
      }
    } catch (error) {
      console.error('Error loading transfers:', error);
    } finally {
      setLoadingTransfers(false);
    }
  };

  // اصلاح useEffect اصلی
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }
    
    if (session.user?.role !== 'manager') {
      router.push('/unauthorized');
      return;
    }
    
    console.log('🎯 Starting data load...');
    loadAllData();
  }, [session, status, router]);

  const calculateStats = useCallback((containersList: ContainerData[]) => {
    const totalContainers = containersList.length;
    const totalRevenue = containersList.reduce((sum, container) => sum + (container.grandTotal || 0), 0);
    const totalItems = containersList.reduce((sum, container) => sum + (container.contents?.length || 0), 0);
    const totalRent = containersList.reduce((sum, container) => sum + (container.rent || 0), 0);
    
    const totalContentsCost = containersList.reduce((sum, container) => 
      sum + (container.contents?.reduce((contentSum, item) => contentSum + (item.total || 0), 0) || 0), 0
    );
    
    const pendingCount = containersList.filter(c => c.status === 'pending').length;
    const shippedCount = containersList.filter(c => c.status === 'shipped').length;
    const completedCount = containersList.filter(c => c.status === 'completed').length;
    
    const avgContainerValue = totalContainers > 0 ? totalRevenue / totalContainers : 0;
    const avgItemsPerContainer = totalContainers > 0 ? totalItems / totalContainers : 0;
    
    const users = new Map();
    const vendors = new Map();
    
    containersList.forEach(container => {
      if (container.user) users.set(container.user.id, container.user);
      if (container.vendor) vendors.set(container.vendor.id, container.vendor);
    });
    
    setStats({
      totalContainers,
      totalRevenue,
      totalItems,
      totalRent,
      totalContentsCost,
      avgContainerValue,
      avgItemsPerContainer,
      pendingCount,
      shippedCount,
      completedCount,
      userCount: users.size,
      vendorCount: vendors.size
    });
  }, []);

  const getUniqueUsers = useCallback(() => {
    const usersMap = new Map();
    
    containers.forEach(container => {
      if (container.user) {
        usersMap.set(container.user.id, container.user);
      }
    });
    
    return Array.from(usersMap.values());
  }, [containers]);

  const getUniqueVendors = useCallback(() => {
    const vendorsMap = new Map();
    
    containers.forEach(container => {
      if (container.vendor) {
        vendorsMap.set(container.vendor.id, container.vendor);
      }
    });
    
    return Array.from(vendorsMap.values());
  }, [containers]);

  const applyFilters = useCallback(() => {
    let filtered = containers;

    if (filters.userId) {
      filtered = filtered.filter(container => 
        container.user && container.user.id === filters.userId
      );
    }

    if (filters.vendorId) {
      filtered = filtered.filter(container => 
        container.vendor && container.vendor.id === filters.vendorId
      );
    }

    if (filters.containerId) {
      filtered = filtered.filter(container => 
        container.containerId.toLowerCase().includes(filters.containerId.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(container => container.status === filters.status);
    }

    setFilteredContainers(filtered);
    calculateStats(filtered);
  }, [containers, filters, calculateStats]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const refreshData = () => {
    loadAllData();
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      vendorId: '',
      containerId: '',
      status: ''
    });
  };

const printContainerDetails = (container: ContainerData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  // استفاده از تابع calculateFinancialSummary برای محاسبه دقیق
  const financialSummary = calculateFinancialSummary(container);
  const contentsTotal = financialSummary.contentsTotal;
  const itemsCount = container.contents?.length || 0;

  // محاسبه مقادیر منفی برای ترانسفرها
  const negativeTransfersAmount = -financialSummary.totalTransfers;
  const remainingBalance = financialSummary.grandTotal + negativeTransfersAmount;

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Container ${container.containerId} - Print</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          background-color: #fff;
          color: #000;
          line-height: 1.4;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          padding-bottom: 20px;
          border-bottom: 3px solid #333;
        }
        .header h1 {
          color: #000;
          margin-bottom: 10px;
          font-size: 28px;
        }
        .section { 
          margin-bottom: 25px; 
          padding: 15px;
          border-radius: 5px;
          border: 1px solid #ddd;
        }
        .container-info { 
          background-color: #f8f9fa;
        }
        .financial-summary { 
          background-color: #e9ecef;
        }
        .transfers-summary {
          background-color: #fff3cd;
          border-color: #ffeaa7;
        }
        .contents-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 20px;
          font-size: 12px;
        }
        .contents-table th, .contents-table td { 
          padding: 8px; 
          border: 1px solid #000; 
          text-align: left; 
        }
        .contents-table th { 
          background-color: #333; 
          color: #fff;
          font-weight: bold;
        }
        .label { 
          font-weight: bold; 
          width: 150px;
          display: inline-block;
        }
        .total-row {
          font-weight: bold;
          background-color: #ddd;
        }
        .financial-row {
          display: flex;
          justify-between;
          margin-bottom: 5px;
        }
        .remaining-balance {
          font-weight: bold;
          font-size: 18px;
          border-top: 2px solid #333;
          padding-top: 10px;
          margin-top: 10px;
        }
        @media print {
          body { margin: 0.5in; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Al Raya Used Auto Spare Trading LLC</h1>
        <h2>Container Details - ${container.containerId}</h2>
      </div>
      
      <div class="section container-info">
        <h3>Container Information</h3>
        <div class="info-row">
          <span class="label">Container ID:</span>
          <span>${container.containerId}</span>
        </div>
        <div class="info-row">
          <span class="label">Vendor:</span>
          <span>${container.vendor?.companyName || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="label">Status:</span>
          <span>${container.status}</span>
        </div>
        <div class="info-row">
          <span class="label">City:</span>
          <span>${container.city}</span>
        </div>
        <div class="info-row">
          <span class="label">Date:</span>
          <span>${container.date}</span>
        </div>
        <div class="info-row">
          <span class="label">User:</span>
          <span>${container.user?.name || 'N/A'}</span>
        </div>
      </div>
      
      <div class="section financial-summary">
        <h3>Financial Summary</h3>
        <div class="financial-row">
          <span class="label">Contents Total:</span>
          <span>$${contentsTotal.toLocaleString()}</span>
        </div>
        <div class="financial-row">
          <span class="label">Container Rent:</span>
          <span>$${container.rent.toLocaleString()}</span>
        </div>
        <div class="financial-row">
          <span class="label">Grand Total:</span>
          <span>$${container.grandTotal.toLocaleString()}</span>
        </div>
        <div class="financial-row">
          <span class="label">Number of Items:</span>
          <span>${itemsCount}</span>
        </div>
      </div>

     <!-- بخش ترانسفرها -->
<div class="section transfers-summary">
  <h3>Transfers Summary</h3>
  <div class="financial-row">
    <span class="label">Total Transfers Amount:</span>
    <span>$${financialSummary.totalTransfers.toLocaleString()}</span>
  </div>

  <div class="financial-row remaining-balance">
    <span class="label">Remaining Balance:</span>
    <span>$${remainingBalance.toLocaleString()}</span>
  </div>
</div>
      
      <h3>Container Contents (${itemsCount} items)</h3>
      
      ${itemsCount > 0 ? `
        <table class="contents-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Lot #</th>
              <th>Make</th>
              <th>Model</th>
              <th>Year</th>
              <th>Price ($)</th>
              <th>Recovery ($)</th>
              <th>Cutting ($)</th>
              <th>Total ($)</th>
            </tr>
          </thead>
          <tbody>
            ${container.contents.map((item, index) => `
              <tr>
                <td>${item.number || index + 1}</td>
                <td>${item.lotNumber || '-'}</td>
                <td>${item.item || '-'}</td>
                <td>${item.model || '-'}</td>
                <td>${item.year || '-'}</td>
                <td>${(item.price || 0).toLocaleString()}</td>
                <td>${(item.recovery || 0).toLocaleString()}</td>
                <td>${(item.cutting || 0).toLocaleString()}</td>
                <td>${(item.total || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="8" style="text-align: right;">Total:</td>
              <td>$${contentsTotal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      ` : `
        <p style="color: #666; font-style: italic; padding: 20px; text-align: center;">
          No items found in this container.
        </p>
      `}
      
      <div class="no-print" style="margin-top: 40px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
      </div>

      <script>
        // پرینت خودکار پس از لود صفحه
        window.onload = function() {
          setTimeout(() => {
            window.print();
          }, 1000);
        };
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(printContent);
  printWindow.document.close();
};
  const handleViewContainer = async (container: ContainerData) => {
    try {
      console.log('👁️ Viewing container:', container.containerId);
      setSelectedContainer(container);
      
      // لود اسناد و ترانسفرها به صورت موازی
      await Promise.all([
        loadContainerDocuments(container.id),
        loadContainerTransfers(container.id)
      ]);
      
      console.log('✅ Container details loaded successfully');
    } catch (error) {
      console.error('❌ Error loading container details:', error);
      setError('Failed to load container details');
    }
  };

  // تابع تست برای بررسی API اسناد
  const testDocumentsAPI = async (containerId: string) => {
    try {
      console.log('Testing documents API for container:', containerId);

        const response = await fetch(`/api/documents?containerId=${containerId}`);
        console.log('API Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Documents data:', data);
          return data;
        } else {
          console.error('API Error:', response.status, response.statusText);
          return [];
        }
      } catch (error) {
        console.error('API Test error:', error);
        return [];
      }
    };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-green-800 text-xl">Checking authentication...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-green-800 text-xl">Loading data...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex flex-col">
      <Navbar />
      
      <main className="flex-1 p-6 pt-24">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-green-200">
          <div className="flex justify-between items-center mb-6">
            <Link 
              href="/dashboard"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition duration-200 font-semibold flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </Link>
            
            <button
              onClick={refreshData}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl transition duration-200 font-semibold"
            >
              Refresh Data
            </button>
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-green-900 mb-4">
              USA Containers Management
            </h1>
            <p className="text-green-700 text-lg">
              Comprehensive overview of all containers, users, and vendors
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
            <button 
              onClick={loadAllData}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded mt-2"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content Area */}
          <div className="flex-1">
            {/* Navigation Tabs */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-green-200">
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setSelectedTab('containers')}
                  className={`px-6 py-3 rounded-xl font-semibold transition duration-200 ${
                    selectedTab === 'containers'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Containers
                </button>
                <button
                  onClick={() => setSelectedTab('users')}
                  className={`px-6 py-3 rounded-xl font-semibold transition duration-200 ${
                    selectedTab === 'users'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => setSelectedTab('vendors')}
                  className={`px-6 py-3 rounded-xl font-semibold transition duration-200 ${
                    selectedTab === 'vendors'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Vendors
                </button>
                <button
                  onClick={() => {
                    setSelectedTab('my-transfers');
                    loadMyTransfers();
                  }}
                  className={`px-6 py-3 rounded-xl font-semibold transition duration-200 ${
                    selectedTab === 'my-transfers'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  My Transfers
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div>
                  <label className="block text-green-800 font-medium mb-3">User</label>
                  <select
                    value={filters.userId}
                    onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                    className="w-full p-4 rounded-xl bg-green-50 text-green-900 border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All Users</option>
                    {getUniqueUsers().map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-green-800 font-medium mb-3">Vendor</label>
                  <select
                    value={filters.vendorId}
                    onChange={(e) => setFilters(prev => ({ ...prev, vendorId: e.target.value }))}
                    className="w-full p-4 rounded-xl bg-green-50 text-green-900 border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All Vendors</option>
                    {getUniqueVendors().map(vendor => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-green-800 font-medium mb-3">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full p-4 rounded-xl bg-green-50 text-green-900 border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="shipped">Shipped</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-green-800 font-medium mb-3">Container ID</label>
                  <input
                    type="text"
                    placeholder="Search container ID..."
                    value={filters.containerId}
                    onChange={(e) => setFilters(prev => ({ ...prev, containerId: e.target.value }))}
                    className="w-full p-4 rounded-xl bg-green-50 text-green-900 border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-green-700">
                  Showing {filteredContainers.length} of {containers.length} containers
                </span>
                <button
                  onClick={clearFilters}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-xl"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            {selectedTab === 'containers' && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
                <h3 className="text-2xl font-semibold text-green-900 mb-6">
                  Containers List ({filteredContainers.length})
                </h3>
                
                {filteredContainers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full bg-green-50 rounded-xl border border-green-200">
                      <thead>
                        <tr className="bg-green-100">
                          <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Container ID</th>
                          <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">User</th>
                          <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Vendor</th>
                          <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Status</th>
                          <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">City</th>
                          <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Date</th>
                          <th className="p-4 text-right text-green-900 font-semibold border-b border-green-200">Total</th>
                          <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredContainers.map((container) => (
                          <tr 
                            key={container.id} 
                            className="border-b border-green-200 hover:bg-green-100"
                          >
                            <td className="p-4 text-green-900 font-medium">{container.containerId}</td>
                            <td className="p-4 text-green-900">
                              {container.user ? (
                                <div>
                                  <div className="font-medium">{container.user.name}</div>
                                  <div className="text-sm text-green-700">{container.user.username}</div>
                                </div>
                              ) : 'Unknown'}
                            </td>
                            <td className="p-4 text-green-900">
                              {container.vendor ? container.vendor.companyName : 'Unknown'}
                            </td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                container.status === 'completed' ? 'bg-green-500 text-white' :
                                container.status === 'shipped' ? 'bg-blue-500 text-white' :
                                'bg-yellow-500 text-white'
                              }`}>
                                {container.status}
                              </span>
                            </td>
                            <td className="p-4 text-green-900">{container.city}</td>
                            <td className="p-4 text-green-900">{new Date(container.date).toLocaleDateString()}</td>
                            <td className="p-4 text-right text-green-900 font-semibold">
                              ${container.grandTotal.toLocaleString()}
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleViewContainer(container)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => printContainerDetails(container)}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                >
                                  Print
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-green-700">
                    {containers.length === 0 ? 'No containers found in database.' : 'No containers match your filters.'}
                  </div>
                )}
              </div>
            )}

            {/* Users Tab */}
            {selectedTab === 'users' && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
                <h3 className="text-2xl font-semibold text-green-900 mb-6">
                  Users ({getUniqueUsers().length})
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getUniqueUsers().map(user => {
                    const userContainers = containers.filter(c => c.user && c.user.id === user.id);
                    const userTotal = userContainers.reduce((sum, c) => sum + c.grandTotal, 0);
                    
                    return (
                      <div key={user.id} className="bg-green-50 rounded-xl p-6 border border-green-200">
                        <h4 className="text-lg font-semibold text-green-900 mb-2">{user.name}</h4>
                        <p className="text-green-700 mb-2">@{user.username}</p>
                        <p className="text-green-600 mb-4">{user.email}</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-900">{userContainers.length}</div>
                            <div className="text-sm text-green-700">Containers</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-900">${userTotal.toLocaleString()}</div>
                            <div className="text-sm text-green-700">Total Value</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vendors Tab */}
            {selectedTab === 'vendors' && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
                <h3 className="text-2xl font-semibold text-green-900 mb-6">
                  Vendors ({getUniqueVendors().length})
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getUniqueVendors().map(vendor => {
                    const vendorContainers = containers.filter(c => c.vendor && c.vendor.id === vendor.id);
                    const vendorTotal = vendorContainers.reduce((sum, c) => sum + c.grandTotal, 0);
                    
                    return (
                      <div key={vendor.id} className="bg-green-50 rounded-xl p-6 border border-green-200">
                        <h4 className="text-lg font-semibold text-green-900 mb-2">{vendor.companyName}</h4>
                        <p className="text-green-700 mb-2">{vendor.representativeName}</p>
                        <p className="text-green-600 mb-2">{vendor.email}</p>
                        <p className="text-green-600 mb-4">{vendor.phone}</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-900">{vendorContainers.length}</div>
                            <div className="text-sm text-green-700">Containers</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-900">${vendorTotal.toLocaleString()}</div>
                            <div className="text-sm text-green-700">Total Value</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* My Transfers Tab */}
            {selectedTab === 'my-transfers' && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
                <h3 className="text-2xl font-semibold text-green-900 mb-6">
                  My Transfers ({myTransfers.length})
                </h3>
                
                {loadingTransfers ? (
                  <div className="text-center py-8 text-green-700">Loading transfers...</div>
                ) : myTransfers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full bg-green-50 rounded-xl border border-green-200">
                      <thead>
                        <tr className="bg-green-100">
                          <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Date</th>
                          <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Container</th>
                          <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Type</th>
                          <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Sender</th>
                          <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Receiver</th>
                          <th className="p-4 text-right text-green-900 font-semibold border-b border-green-200">Amount</th>
                          <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myTransfers.map((transfer) => (
                          <tr key={transfer.id} className="border-b border-green-200 hover:bg-green-100">
                            <td className="p-4 text-green-900">
                              {new Date(transfer.date).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-green-900">
                              {transfer.container?.containerId || 'N/A'}
                            </td>
                            <td className="p-4 text-green-900 capitalize">
                              {transfer.type}
                            </td>
                            <td className="p-4 text-green-900">
                              {transfer.sender?.name} (@{transfer.sender?.username})
                            </td>
                            <td className="p-4 text-green-900">
                              {transfer.receiver?.name} (@{transfer.receiver?.username})
                            </td>
                            <td className="p-4 text-right text-green-900 font-semibold">
                              ${transfer.amount?.toLocaleString()}
                            </td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                transfer.status === 'completed' ? 'bg-green-500 text-white' :
                                transfer.status === 'pending' ? 'bg-yellow-500 text-white' :
                                'bg-red-500 text-white'
                              }`}>
                                {transfer.status || 'pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-green-700">
                    No transfers found for your account.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="lg:w-80">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200 sticky top-24">
              <h3 className="text-xl font-semibold text-green-900 mb-4 text-center">Summary</h3>
              
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <h4 className="text-lg font-semibold text-green-900 mb-2 text-center">Containers</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-900">{stats.totalContainers}</div>
                      <div className="text-sm text-green-700">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-900">{stats.completedCount}</div>
                      <div className="text-sm text-green-700">Completed</div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <h4 className="text-lg font-semibold text-green-900 mb-2 text-center">Financial</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-700">Revenue</span>
                      <span className="text-green-900 font-semibold">${stats.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Contents Cost</span>
                      <span className="text-green-900">${stats.totalContentsCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Rent Cost</span>
                      <span className="text-green-900">${stats.totalRent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-green-200 pt-1">
                      <span className="text-green-700 font-medium">Profit</span>
                      <span className="text-green-900 font-semibold">
                        ${(stats.totalRevenue - stats.totalContentsCost - stats.totalRent).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <h4 className="text-lg font-semibold text-green-900 mb-2 text-center">Items & Averages</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-700">Total Items</span>
                      <span className="text-green-900 font-semibold">{stats.totalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Avg/Container</span>
                      <span className="text-green-900">{stats.avgItemsPerContainer.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Avg Value</span>
                      <span className="text-green-900">${stats.avgContainerValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <h4 className="text-lg font-semibold text-green-900 mb-2 text-center">Users & Vendors</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-900">{stats.userCount}</div>
                      <div className="text-sm text-green-700">Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-900">{stats.vendorCount}</div>
                      <div className="text-sm text-green-700">Vendors</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Container Details Modal */}
        {selectedContainer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-green-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-green-900">
                  Container Details: {selectedContainer.containerId}
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => printContainerDetails(selectedContainer)}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl text-white transition-colors flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m4 4h6a2 2 0 002-2v-4a2 2 0 00-2-2h-6a2 2 0 00-2 2v4a2 2 0 002 2z" />
                    </svg>
                    Print
                  </button>
                  <button
                    onClick={() => setSelectedContainer(null)}
                    className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-green-800 p-6 rounded-xl border border-green-700 text-white">
                  <h4 className="text-lg font-semibold mb-4">Container Information</h4>
                  <div className="space-y-3">
                    <p><span className="font-medium">User:</span> {selectedContainer.user?.name || 'N/A'} ({selectedContainer.user?.username || 'N/A'})</p>
                    <p><span className="font-medium">Vendor:</span> {selectedContainer.vendor?.companyName || 'N/A'}</p>
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-sm ${
                        selectedContainer.status === 'completed' ? 'bg-green-500' :
                        selectedContainer.status === 'shipped' ? 'bg-blue-500' :
                        'bg-yellow-500'
                      }`}>
                        {selectedContainer.status}
                      </span>
                    </p>
                    <p><span className="font-medium">City:</span> {selectedContainer.city}</p>
                    <p><span className="font-medium">Date:</span> {new Date(selectedContainer.date).toLocaleDateString()}</p>
                    <p><span className="font-medium">Created:</span> {new Date(selectedContainer.createdAt).toLocaleString()}</p>
                  </div>
                </div>
{/* محاسبه مستقیم ترانسفرها */}
{(() => {
  const financialSummary = calculateFinancialSummary(selectedContainer);
  
  // محاسبه مقادیر - ترانسفرها به عنوان کسر در نظر گرفته می‌شوند اما بدون علامت منفی نمایش داده می‌شوند
  const remainingBalance = financialSummary.grandTotal - financialSummary.totalTransfers;
  
  return (
    <div className="bg-green-800 p-6 rounded-xl border border-green-700 text-white">
      <h4 className="text-lg font-semibold mb-4">Financial Summary</h4>
      <div className="space-y-3">
        <p><span className="font-medium">Contents Total:</span> 
          ${financialSummary.contentsTotal.toLocaleString()}
        </p>
        <p><span className="font-medium">Container Rent:</span> 
          ${financialSummary.rent.toLocaleString()}
        </p>
        <p><span className="font-medium">Grand Total:</span> 
          <span className="font-semibold">${financialSummary.grandTotal.toLocaleString()}</span>
        </p>

        {/* Transfers Section - فقط مجموع مبالغ */}
        <div className="pb-2 border-b border-green-600">
          <p className="font-bold mb-2">Transfers Summary:</p>
          
          <div className="flex justify-between items-center">
            <span className="text-green-200">Total Transfers Amount:</span>
            <span className="font-semibold">
              $${financialSummary.totalTransfers.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Final Calculation */}
        <div className="pt-2">
          <div className="flex justify-between items-center text-lg border-t border-green-600 pt-2">
            <span className="font-semibold">Remaining Balance:</span>
            <span className={`font-bold text-xl ${
              remainingBalance >= 0 ? 'text-green-300' : 'text-red-300'
            }`}>
              ${remainingBalance.toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-green-300 mt-1">
            (Grand Total: ${financialSummary.grandTotal.toLocaleString()} - Total Transfers: ${financialSummary.totalTransfers.toLocaleString()})
          </div>
        </div>

        <p><span className="font-medium">Number of Items:</span> 
          {selectedContainer.contents?.length || 0}
        </p>
      </div>
    </div>
  );
})()}
              </div>

              {/* Documents Section */}
              {loadingDocuments ? (
                <div className="text-center py-4 text-green-700">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                  Loading documents...
                </div>
              ) : documents.length > 0 ? (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-green-900 mb-4">Documents ({documents.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documents.map((doc, index) => (
                      <div key={doc.id || index} className="bg-white p-4 rounded-lg border border-green-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-green-900 font-medium truncate">
                            {doc.originalName || doc.name || 'Unnamed Document'}
                          </span>
                          <a 
                            href={doc.url || doc.path} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm ml-2"
                          >
                            📎 Open
                          </a>
                        </div>
                        <div className="text-xs text-green-600">
                          Type: {doc.type} | 
                          Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-orange-600 mb-8">
                  <div className="text-2xl mb-2">📭</div>
                  <p>No documents found for this container.</p>
                  <p className="text-sm mt-2">This could mean:</p>
                  <ul className="text-xs text-left mt-1 space-y-1 max-w-md mx-auto">
                    <li>• No documents have been uploaded yet</li>
                    <li>• Documents are still processing</li>
                    <li>• There might be a database issue</li>
                  </ul>
                </div>
              )}

              <h4 className="text-xl font-semibold text-green-900 mb-6">
                Contents ({(selectedContainer?.contents?.length) || 0} items)
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full bg-green-50 rounded-xl border border-green-200">
                  <thead>
                    <tr className="bg-green-100">
                      <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">#</th>
                      <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Item</th>
                      <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Model</th>
                      <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Year</th>
                      <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Lot Number</th>
                      <th className="p-4 text-right text-green-900 font-semibold border-b border-green-200">Price</th>
                      <th className="p-4 text-right text-green-900 font-semibold border-b border-green-200">Recovery</th>
                      <th className="p-4 text-right text-green-900 font-semibold border-b border-green-200">Cutting</th>
                      <th className="p-4 text-right text-green-900 font-semibold border-b border-green-200">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedContainer?.contents || []).map((item, index) => (
                      <tr key={index} className="border-b border-green-200 hover:bg-green-100">
                        <td className="p-4 text-green-900">{item.number}</td>
                        <td className="p-4 text-green-900">{item.item}</td>
                        <td className="p-4 text-green-900">{item.model}</td>
                        <td className="p-4 text-green-900">{item.year}</td>
                        <td className="p-4 text-green-900">{item.lotNumber}</td>
                        <td className="p-4 text-right text-green-900">${item.price.toLocaleString()}</td>
                        <td className="p-4 text-right text-green-900">${item.recovery.toLocaleString()}</td>
                        <td className="p-4 text-right text-green-900">${item.cutting.toLocaleString()}</td>
                        <td className="p-4 text-right text-green-900 font-semibold">${item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}