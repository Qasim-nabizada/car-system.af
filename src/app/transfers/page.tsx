'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface Transfer {
  id: string;
  senderId: string;
  receiverId: string;
  amount: number;
  containerId: string;
  type: string;
  date: string;
  description?: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    username: string;
  };
  receiver: {
    id: string;
    name: string;
    username: string;
  };
  vendor: {
    id: string;
    companyName: string;
    representativeName: string;
  };
  container: {
    containerId: string;
  };
}

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
}

interface Vendor {
  id: string;
  companyName: string;
  representativeName: string;
  email: string;
  phone: string;
  country: string;
  balance: number;
  userId: string;
}

interface Container {
  id: string;
  containerId: string;
}

interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  transferId: string;
  createdAt: string;
}

interface StatsData {
  totalTransfers: number;
  totalAmount: number;
  totalVendors: number;
  totalUsers: number;
  avgTransferAmount: number;
}

export default function TransfersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New transfer form states
// در قسمت newTransfer state
const [newTransfer, setNewTransfer] = useState({
  senderName: '', // نام فرستنده (متن آزاد)
  vendorId: '', // ID فروشنده
  amount: '',
  containerId: '',
  type: 'Bank',
  date: new Date().toISOString().split('T')[0],
  description: ''
});

  // File upload for new transfer
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    vendorId: '',
    userId: '',
    containerId: '',
    dateFrom: '',
    dateTo: ''
  });

  // Stats state
  const [stats, setStats] = useState<StatsData>({
    totalTransfers: 0,
    totalAmount: 0,
    totalVendors: 0,
    totalUsers: 0,
    avgTransferAmount: 0
  });

  // Print states
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'manager') {
      router.push('/login');
      return;
    }
    
    loadData();
  }, [session, status, router]);

  useEffect(() => {
    filterTransfers();
    calculateStats();
  }, [filters, transfers, vendors]);
// در صفحه Transfers - تابع loadData
const loadData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('🔄 Starting to load all data...');
    
    if (!session) {
      throw new Error('No session found');
    }

    // بارگذاری موازی تمام داده‌های مورد نیاز
    const endpoints = [
      { url: '/api/transfers', name: 'transfers' },
      { url: '/api/vendors', name: 'vendors' },
      { url: '/api/purchase/containers?all=true', name: 'containers' },
      { url: '/api/documents?type=transfer', name: 'documents' },
      { url: '/api/users', name: 'users' } // اضافه کردن endpoint کاربران
    ];

    console.log('📡 Fetching from endpoints:', endpoints);

    const responses = await Promise.allSettled(
      endpoints.map(endpoint => 
        fetch(endpoint.url).then(res => {
          if (!res.ok) throw new Error(`Failed to load ${endpoint.name}`);
          return res.json();
        })
      )
    );

    console.log('📊 All responses received');

    // پردازش پاسخ‌ها
    const [transfersResult, vendorsResult, containersResult, documentsResult, usersResult] = responses;

    let transfersData = [];
    let vendorsData = [];
    let containersData = [];
    let documentsData = [];
    let usersData = [];

    if (transfersResult.status === 'fulfilled') {
      transfersData = transfersResult.value;
      console.log('✅ Transfers loaded:', transfersData.length);
    } else {
      console.error('❌ Transfers failed:', transfersResult.reason);
    }

    if (vendorsResult.status === 'fulfilled') {
      vendorsData = vendorsResult.value;
      console.log('✅ Vendors loaded:', vendorsData.length);
    } else {
      console.error('❌ Vendors failed:', vendorsResult.reason);
    }

    if (containersResult.status === 'fulfilled') {
      containersData = containersResult.value;
      console.log('✅ Containers loaded:', containersData.length);
    } else {
      console.error('❌ Containers failed:', containersResult.reason);
    }

    if (documentsResult.status === 'fulfilled') {
      documentsData = documentsResult.value;
      console.log('✅ Documents loaded:', documentsData.length);
    } else {
      console.error('❌ Documents failed:', documentsResult.reason);
    }

    if (usersResult.status === 'fulfilled') {
      usersData = usersResult.value;
      console.log('✅ Users loaded:', usersData.length);
    } else {
      console.error('❌ Users failed:', usersResult.reason);
    }

    // تنظیم stateها
    setTransfers(transfersData);
    setFilteredTransfers(transfersData);
    setVendors(vendorsData);
    setContainers(containersData);
    setDocuments(documentsData);
    setUsers(usersData); // اضافه کردن کاربران

    console.log('🎉 All data loaded successfully');
    console.log('📊 Data summary:', {
      transfers: transfersData.length,
      vendors: vendorsData.length,
      containers: containersData.length,
      users: usersData.length,
      documents: documentsData.length
    });
    
  } catch (error) {
    console.error('❌ Error in loadData:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message
      });
    }
    
    setError(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setLoading(false);
  }
};
  const filterTransfers = () => {
  let filtered = transfers;

  if (filters.vendorId) {
    filtered = filtered.filter(transfer => transfer.vendor.companyName === filters.vendorId);
  }

  if (filters.userId) {
    filtered = filtered.filter(transfer => transfer.senderId === filters.userId);
  }

  if (filters.containerId) {
    filtered = filtered.filter(transfer => transfer.containerId === filters.containerId);
  }

  if (filters.dateFrom) {
    filtered = filtered.filter(
      transfer => new Date(transfer.date) >= new Date(filters.dateFrom)
    );
  }

  if (filters.dateTo) {
    filtered = filtered.filter(
      transfer => new Date(transfer.date) <= new Date(filters.dateTo)
    );
  }

  setFilteredTransfers(filtered);
};

  const calculateStats = () => {
    const totalTransfers = filteredTransfers.length;
    const totalAmount = filteredTransfers.reduce((sum, transfer) => sum + transfer.amount, 0);
    const totalVendors = new Set(filteredTransfers.map(t => t.receiverId)).size;
    const totalUsers = new Set(filteredTransfers.map(t => t.senderId)).size;
    const avgTransferAmount = totalTransfers > 0 ? totalAmount / totalTransfers : 0;

    setStats({
      totalTransfers,
      totalAmount,
      totalVendors,
      totalUsers,
      avgTransferAmount
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewTransfer(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    setSaving(true);
    setError(null);
    
    // ایجاد description ترکیبی
    const finalDescription = newTransfer.description 
      ? `Sender: ${newTransfer.senderName} | ${newTransfer.description}`
      : `Sender: ${newTransfer.senderName}`;

    // ذخیره ترانسفر
    const transferResponse = await fetch('/api/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        senderName: newTransfer.senderName,
        vendorId: newTransfer.vendorId,
        amount: newTransfer.amount,
        containerId: newTransfer.containerId,
        type: newTransfer.type,
        date: newTransfer.date,
        description: finalDescription
      })
    });
      
    if (!transferResponse.ok) {
      const errorData = await transferResponse.json();
      throw new Error(errorData.error || 'Failed to save transfer');
    }

    const savedTransfer = await transferResponse.json();
    console.log('✅ Transfer saved:', savedTransfer.id);

    // آپلود داکیومنت اگر فایل انتخاب شده باشد
    if (selectedFile) {
      try {
        setUploadingDocument(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('transferId', savedTransfer.id);
        formData.append('type', 'transfer');
        
        console.log('📤 Uploading document for transfer:', savedTransfer.id);
        
        // استفاده از API مخصوص ترانسفر
        const documentResponse = await fetch('/api/documents/upload-transfer', {
          method: 'POST',
          body: formData,
        });
        
        if (!documentResponse.ok) {
          const errorData = await documentResponse.json();
          console.error('❌ Document upload failed:', errorData);
          throw new Error(errorData.error || 'Failed to upload document');
        }
        
        const newDocument = await documentResponse.json();
        console.log('✅ Document uploaded:', newDocument.id);
        
        setDocuments(prev => [...prev, newDocument]);
        
      } catch (uploadError) {
        console.error('❌ Error uploading document:', uploadError);
        // خطا را به کاربر نشان می‌دهیم اما ترانسفر ذخیره شده است
        alert('Transfer saved successfully, but document upload failed. You can upload it later.');
      } finally {
        setUploadingDocument(false);
      }
    }

    // اضافه کردن ترانسفر جدید به لیست
    setTransfers(prev => [savedTransfer, ...prev]);
    
    // ریست فرم
    setNewTransfer({
      senderName: '',
      vendorId: '',
      amount: '',
      containerId: '',
      type: 'Bank',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setSelectedFile(null);
    
    // ریست فایل اینپوت
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    
    alert('Transfer saved successfully!');
    
  } catch (error) {
    console.error('❌ Error saving transfer:', error);
    setError(error instanceof Error ? error.message : 'Failed to save transfer');
  } finally {
    setSaving(false);
  }
};
  const clearFilters = () => {
    setFilters({
      vendorId: '',
      userId: '',
      containerId: '',
      dateFrom: '',
      dateTo: ''
    });
  };
const handleDelete = async (transferId: string) => {
  // confirmation برای حذف
  if (!confirm('Are you sure you want to delete this transfer? This action cannot be undone.')) {
    return;
  }

  try {
    setDeletingId(transferId);
    setError(null);

    const response = await fetch(`/api/transfers/${transferId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete transfer');
    }

    // حذف از state
    setTransfers(prev => prev.filter(transfer => transfer.id !== transferId));
    setFilteredTransfers(prev => prev.filter(transfer => transfer.id !== transferId));

    alert('Transfer deleted successfully!');
    
  } catch (error) {
    console.error('❌ Error deleting transfer:', error);
    setError(error instanceof Error ? error.message : 'Failed to delete transfer');
  } finally {
    setDeletingId(null);
  }
};
  const printTransfers = (containerId?: string) => {
  setPrinting(true);
  
  setTimeout(() => {
    const transfersToPrint = containerId 
      ? filteredTransfers.filter(t => t.containerId === containerId)
      : filteredTransfers;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setPrinting(false);
      alert('Popup blocked! Please allow popups for this site.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Transfers Report ${containerId ? `- Container ${containerId}` : ''}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.4;
            }
            h1 { 
              color: #333; 
              border-bottom: 2px solid #333; 
              padding-bottom: 10px; 
              margin-bottom: 20px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px; 
              font-size: 14px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 10px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold; 
            }
            .total { 
              font-weight: bold; 
              margin-top: 20px; 
              padding: 15px;
              background-color: #f9f9f9;
              border-radius: 5px;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              margin-bottom: 30px;
              padding-bottom: 15px;
              border-bottom: 1px solid #eee;
            }
            .logo { 
              font-size: 24px; 
              font-weight: bold; 
              color: #6b46c1;
            }
            .date { 
              color: #666; 
              font-size: 14px;
            }
            .summary {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">💰 Money Transfers Report</div>
            <div class="date">Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          </div>
          
          <h1>${containerId ? `Transfers for Container: ${containerId}` : 'All Transfers Report'}</h1>
          
          <div class="summary">
            <strong>Report Summary:</strong><br>
            • Total Transfers: ${transfersToPrint.length}<br>
            • Total Amount: $${transfersToPrint.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}<br>
            • Date Range: ${transfersToPrint.length > 0 ? 
              `${new Date(Math.min(...transfersToPrint.map(t => new Date(t.date).getTime()))).toLocaleDateString()} - 
               ${new Date(Math.max(...transfersToPrint.map(t => new Date(t.date).getTime()))).toLocaleDateString()}` : 'N/A'}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Sender</th>
                <th>Receiver</th>
                <th>Container</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${transfersToPrint.map(transfer => {
                const senderName = transfer.description?.split('|')[0]?.replace('Sender:', '').trim() || transfer.sender.name;
                const description = transfer.description?.split('|')[1]?.trim() || '-';
                
                return `
                  <tr>
                    <td>${new Date(transfer.date).toLocaleDateString()}</td>
                    <td>${senderName}</td>
                    <td>${transfer.vendor?.companyName || 'Unknown'}</td>
                    <td>${transfer.container.containerId}</td>
                    <td><strong>$${transfer.amount.toLocaleString()}</strong></td>
                    <td>${transfer.type}</td>
                    <td>${description}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="total">
            <strong>Final Summary:</strong><br>
            Total Transfers: ${transfersToPrint.length}<br>
            Total Amount: <strong>$${transfersToPrint.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</strong><br>
            Average Transfer: $${transfersToPrint.length > 0 ? (transfersToPrint.reduce((sum, t) => sum + t.amount, 0) / transfersToPrint.length).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    
  }, 500);
};
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-purple-800 text-xl">Loading...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex flex-col">
      <Navbar />
      
      <main className="flex-1 p-6 pt-24">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-purple-200">
          <div className="flex justify-between items-center mb-6">
            <Link 
              href="/dashboard"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl transition duration-200 font-semibold flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </Link>
            
            <h1 className="text-4xl font-bold text-purple-900 text-center">
              💰 Money Transfers
            </h1>
            
            <button
              onClick={loadData}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition duration-200 font-semibold"
            >
              🔄 Refresh
            </button>
          </div>

          <p className="text-purple-700 text-lg text-center mb-6">
            Manage money transfers for vendors and containers
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button 
              onClick={loadData}
              className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Transfers Table */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-purple-200">
              <h3 className="text-2xl font-semibold text-purple-900 mb-6">Filters</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div>
                  <label className="block text-purple-800 font-medium mb-2">Vendor</label>
                  <select
                    name="vendorId"
                    value={filters.vendorId}
                    onChange={handleFilterChange}
                    className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Vendors</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-purple-800 font-medium mb-2">User</label>
                  <select
                    name="userId"
                    value={filters.userId}
                    onChange={handleFilterChange}
                    className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Users</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-purple-800 font-medium mb-2">Container ID</label>
                  <input
                    type="text"
                    name="containerId"
                    placeholder="Search..."
                    value={filters.containerId}
                    onChange={handleFilterChange}
                    className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-purple-800 font-medium mb-2">From Date</label>
                  <input
                    type="date"
                    name="dateFrom"
                    value={filters.dateFrom}
                    onChange={handleFilterChange}
                    className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-purple-800 font-medium mb-2">To Date</label>
                  <input
                    type="date"
                    name="dateTo"
                    value={filters.dateTo}
                    onChange={handleFilterChange}
                    className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-purple-700">
                  Showing {filteredTransfers.length} of {transfers.length} transfers
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={clearFilters}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => printTransfers()}
                    disabled={printing || filteredTransfers.length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {printing ? 'Printing...' : '📄 Print All'}
                  </button>
                </div>
              </div>
            </div>

            {/* Transfers Table */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-200">
              <h3 className="text-2xl font-semibold text-purple-900 mb-6">
                Previous Transfers ({filteredTransfers.length})
              </h3>
              
              {filteredTransfers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full bg-purple-50 rounded-lg border border-purple-200">
                    <thead>
                      <tr className="bg-purple-100">
                        <th className="p-3 text-left text-purple-900 font-semibold border-b border-purple-200">Date</th>
                        <th className="p-3 text-left text-purple-900 font-semibold border-b border-purple-200">Sender</th>
                        <th className="p-3 text-left text-purple-900 font-semibold border-b border-purple-200">Receiver</th>
                        <th className="p-3 text-left text-purple-900 font-semibold border-b border-purple-200">Container</th>
                        <th className="p-3 text-left text-purple-900 font-semibold border-b border-purple-200">Amount</th>
                        <th className="p-3 text-left text-purple-900 font-semibold border-b border-purple-200">Type</th>
                        <th className="p-3 text-left text-purple-900 font-semibold border-b border-purple-200">Description</th>
                        <th className="p-3 text-left text-purple-900 font-semibold border-b border-purple-200">Actions</th>
                      </tr>
                    </thead>
                 
               
<tbody>
  {filteredTransfers.map((transfer) => {
    // استخراج نام فرستنده واقعی از description
    const senderName = transfer.description?.split('|')[0]?.replace('Sender:', '').trim() || transfer.sender.name;
    const descriptionOnly = transfer.description?.split('|')[1]?.trim() || '-';
    
    return (
      <tr key={transfer.id} className="border-b border-purple-200 hover:bg-purple-100 transition duration-200">
        <td className="p-3 text-purple-900">{transfer.date}</td>
        <td className="p-3 text-purple-900 font-medium">
          {senderName}
        </td>
        <td className="p-3 text-purple-900">
          {transfer.vendor?.companyName || 'Unknown Vendor'}
        </td>
        <td className="p-3 text-purple-900 font-mono">{transfer.container.containerId}</td>
        <td className="p-3 text-green-600 font-semibold">${transfer.amount.toLocaleString()}</td>
        <td className="p-3">
          <span className={`px-2 py-1 rounded-full text-xs ${
            transfer.type === 'Bank' 
              ? 'bg-blue-100 text-blue-800' 
              : transfer.type === 'Cash'
              ? 'bg-green-100 text-green-800'
              : 'bg-orange-100 text-orange-800'
          }`}>
            {transfer.type}
          </span>
        </td>
        <td className="p-3 text-purple-900 text-sm">{descriptionOnly}</td>
        <td className="p-3">
          <div className="flex space-x-2">
            <button
              onClick={() => printTransfers(transfer.containerId)}
              disabled={printing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50 transition duration-200 flex items-center space-x-1"
              title="Print this transfer"
            >
              <span>🖨️</span>
              <span>Print</span>
            </button>
            <button
              onClick={() => handleDelete(transfer.id)}
              disabled={deletingId === transfer.id}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50 transition duration-200 flex items-center space-x-1"
              title="Delete this transfer"
            >
              {deletingId === transfer.id ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <span>🗑️</span>
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        </td>
      </tr>
    );
  })}
</tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-purple-700">
                  {transfers.length === 0 ? 'No transfers found.' : 'No transfers match your filters.'}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Add New Transfer */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-200 sticky top-24">
              <h2 className="text-xl font-semibold text-purple-900 mb-6 text-center">Add New Transfer</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
  {/* فیلد نام فرستنده (آزاد) */}
  <div>
    <label className="block text-purple-800 font-medium mb-2">
      Sender Name * 
      <span className="text-sm text-gray-500 ml-2">(Actual sender name)</span>
    </label>
    <input
      type="text"
      name="senderName"
      value={newTransfer.senderName}
      onChange={handleInputChange}
      required
      className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
      placeholder="Enter actual sender name"
    />
  </div>

  {/* فیلد گیرنده (فروشنده) */}
  <div>
    <label className="block text-purple-800 font-medium mb-2">Receiver (Vendor) *</label>
    <select
      name="vendorId"
      value={newTransfer.vendorId}
      onChange={handleInputChange}
      required
      className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
    >
      <option value="">Select Vendor</option>
      {vendors.map(vendor => (
        <option key={vendor.id} value={vendor.id}>
          {vendor.companyName} - {vendor.representativeName}
        </option>
      ))}
    </select>
  </div>
               

                <div>
    <label className="block text-purple-800 font-medium mb-2">Amount (USD) *</label>
    <input
      type="number"
      name="amount"
      value={newTransfer.amount}
      onChange={(e) => setNewTransfer(prev => ({ ...prev, amount: e.target.value }))}
      required
      min="0"
      step="0.01"
      className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
      placeholder="0.00"
    />
  </div>


                <div>
                  <label className="block text-purple-800 font-medium mb-2">Container ID *</label>
                  <select
                    name="containerId"
                    value={newTransfer.containerId}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Container</option>
                    {containers.map(container => (
                      <option key={container.id} value={container.id}>
                        {container.containerId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-purple-800 font-medium mb-2">Transfer Type *</label>
                  <select
                    name="type"
                    value={newTransfer.type}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Bank">Bank Transfer</option>
                    <option value="Hand">By Hand</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-purple-800 font-medium mb-2">Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={newTransfer.date}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

               <div>
    <label className="block text-purple-800 font-medium mb-2">
      Description
      <span className="text-sm text-gray-500 ml-2">(Additional notes)</span>
    </label>
    <textarea
      name="description"
      value={newTransfer.description}
      onChange={(e) => setNewTransfer(prev => ({ ...prev, description: e.target.value }))}
      rows={2}
      className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
      placeholder="Additional notes about this transfer"
    />
    <p className="text-xs text-gray-500 mt-1">
      Sender name will be automatically included in the description.
    </p>
  </div>


                {/* File Upload Section */}
                <div>
                  <label className="block text-purple-800 font-medium mb-2">Upload Document (Optional)</label>
                  <input
                    id="file-upload"
                    type="file"
                    onChange={handleFileSelect}
                    className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {selectedFile && (
                    <p className="text-sm text-purple-600 mt-1">Selected: {selectedFile.name}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={saving || uploadingDocument}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition duration-200 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : uploadingDocument ? 'Uploading...' : 'Add Transfer'}
                </button>
              </form>
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-200 mt-8">
              <h2 className="text-xl font-semibold text-purple-900 mb-6 text-center">Statistics</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-purple-800 font-medium">Total Transfers</span>
                  <span className="text-purple-900 font-bold">{stats.totalTransfers}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-purple-800 font-medium">Total Amount</span>
                  <span className="text-green-600 font-bold">${stats.totalAmount.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-purple-800 font-medium">Vendors</span>
                  <span className="text-purple-900 font-bold">{stats.totalVendors}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-purple-800 font-medium">Users</span>
                  <span className="text-purple-900 font-bold">{stats.totalUsers}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-purple-800 font-medium">Avg. Transfer</span>
                  <span className="text-purple-900 font-bold">${stats.avgTransferAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden print content */}
        <div id="print-content" style={{ display: 'none' }}></div>
      </main>

      <Footer />
    </div>
  );
}





