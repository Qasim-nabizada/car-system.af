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
  const [newTransfer, setNewTransfer] = useState({
    receiverId: '',
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

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load transfers, users, containers and documents in parallel
      const [transfersResponse, usersResponse, containersResponse, documentsResponse] = await Promise.all([
        fetch('/api/transfers'),
        fetch('/api/users'),
        fetch('/api/containers?all=true'),
        fetch('/api/documents?type=transfer')
        
      ]);
      
      if (!transfersResponse.ok) throw new Error(`Failed to load transfers: ${transfersResponse.status}`);
      if (!usersResponse.ok) throw new Error(`Failed to load users: ${usersResponse.status}`);
      if (!containersResponse.ok) throw new Error(`Failed to load containers: ${containersResponse.status}`);
      
      const transfersData = await transfersResponse.json();
      const usersData = await usersResponse.json();
      const containersData = await containersResponse.json();
      const documentsData = documentsResponse.ok ? await documentsResponse.json() : [];
      
      // Try to load vendors from the correct endpoint
      let vendorsData = [];
      try {
        const vendorsResponse = await fetch('/api/vendors');
        if (vendorsResponse.ok) {
          vendorsData = await vendorsResponse.json();
        } else {
          // Fallback: extract vendors from transfers
          const vendorMap = new Map();
          transfersData.forEach((transfer: Transfer) => {
            if (transfer.receiver && !vendorMap.has(transfer.receiver.id)) {
              vendorMap.set(transfer.receiver.id, {
                id: transfer.receiver.id,
                companyName: transfer.receiver.name,
                representativeName: transfer.receiver.username,
                email: '',
                phone: '',
                country: '',
                balance: 0,
                userId: transfer.receiver.id
              });
            }
          });
          vendorsData = Array.from(vendorMap.values());
        }
      } catch (vendorError) {
        console.error('Error loading vendors:', vendorError);
        // Fallback: extract from transfers
        const vendorMap = new Map();
        transfersData.forEach((transfer: Transfer) => {
          if (transfer.receiver && !vendorMap.has(transfer.receiver.id)) {
            vendorMap.set(transfer.receiver.id, {
              id: transfer.receiver.id,
              companyName: transfer.receiver.name,
              representativeName: transfer.receiver.username,
              email: '',
              phone: '',
              country: '',
              balance: 0,
              userId: transfer.receiver.id
            });
          }
        });
        vendorsData = Array.from(vendorMap.values());
      }
      
      setTransfers(transfersData);
      setFilteredTransfers(transfersData);
      setUsers(usersData);
      setVendors(vendorsData);
      setContainers(containersData);
      setDocuments(documentsData);
      
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setError('Failed to load data. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const filterTransfers = () => {
    let filtered = transfers;

    if (filters.vendorId) {
      filtered = filtered.filter(transfer => transfer.receiverId === filters.vendorId);
    }

    if (filters.userId) {
      filtered = filtered.filter(transfer => transfer.senderId === filters.userId);
    }

    if (filters.containerId) {
      filtered = filtered.filter(transfer =>
        transfer.container.containerId.toLowerCase().includes(filters.containerId.toLowerCase())
      );
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
      
      // First, create the transfer
      const transferResponse = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newTransfer,
          amount: parseFloat(newTransfer.amount),
          senderId: session?.user?.id,
          receiverId: newTransfer.receiverId
        })
      });
      
      if (!transferResponse.ok) {
        const errorData = await transferResponse.json();
        throw new Error(errorData.error || 'Failed to save transfer');
      }

      const savedTransfer = await transferResponse.json();

      // Then, upload the document if a file was selected
      if (selectedFile) {
        try {
          setUploadingDocument(true);
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('transferId', savedTransfer.id);
          formData.append('type', 'transfer');
          
     const documentResponse = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData,
});
          
          if (!documentResponse.ok) {
            const errorData = await documentResponse.json();
            throw new Error(errorData.error || 'Failed to upload document');
          }
          
          const newDocument = await documentResponse.json();
          setDocuments(prev => [...prev, newDocument]);
        } catch (uploadError) {
          console.error('Error uploading document:', uploadError);
          // Don't throw the error here, just show a warning
          alert('Transfer saved successfully, but document upload failed. You can upload it later.');
        } finally {
          setUploadingDocument(false);
        }
      }

      // Reset form
      setTransfers(prev => [savedTransfer, ...prev]);
      setNewTransfer({
        receiverId: '',
        amount: '',
        containerId: '',
        type: 'Bank',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      alert('Transfer saved successfully!');
    } catch (error) {
      console.error('Error saving transfer:', error);
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

  const printTransfers = (containerId?: string) => {
    setPrinting(true);
    
    setTimeout(() => {
      const printContent = document.getElementById('print-content');
      if (!printContent) {
        setPrinting(false);
        return;
      }

      const transfersToPrint = containerId 
        ? filteredTransfers.filter(t => t.containerId === containerId)
        : filteredTransfers;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setPrinting(false);
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Transfers Report ${containerId ? `- Container ${containerId}` : ''}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .total { font-weight: bold; margin-top: 20px; }
              .header { display: flex; justify-content: between; align-items: center; margin-bottom: 20px; }
              .logo { font-size: 24px; font-weight: bold; }
              .date { color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">💰 Money Transfers Report</div>
              <div class="date">Generated on: ${new Date().toLocaleDateString()}</div>
            </div>
            
            <h1>${containerId ? `Transfers for Container: ${containerId}` : 'All Transfers'}</h1>
            
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
                ${transfersToPrint.map(transfer => `
                  <tr>
                    <td>${transfer.date}</td>
                    <td>${transfer.sender.name}</td>
                    <td>${transfer.receiver.name}</td>
                    <td>${transfer.container.containerId}</td>
                    <td>$${transfer.amount.toLocaleString()}</td>
                    <td>${transfer.type}</td>
                    <td>${transfer.description || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="total">
              Total Transfers: ${transfersToPrint.length}<br>
              Total Amount: $${transfersToPrint.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setPrinting(false);
      }, 250);
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
                      {filteredTransfers.map((transfer) => (
                        <tr key={transfer.id} className="border-b border-purple-200 hover:bg-purple-100">
                          <td className="p-3 text-purple-900">{transfer.date}</td>
                          <td className="p-3 text-purple-900">{transfer.sender.name}</td>
                          <td className="p-3 text-purple-900">{transfer.receiver.name}</td>
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
                          <td className="p-3 text-purple-900 text-sm">{transfer.description || '-'}</td>
                          <td className="p-3">
                            <button
                              onClick={() => printTransfers(transfer.containerId)}
                              disabled={printing}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                            >
                              Print
                            </button>
                          </td>
                        </tr>
                      ))}
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
                <div>
                  <label className="block text-purple-800 font-medium mb-2">Sender *</label>
                  <input
                    type="text"
                    value={session?.user?.name || ''}
                    disabled
                    className="w-full p-3 rounded-lg bg-gray-100 text-gray-600 border border-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-purple-800 font-medium mb-2">Receiver (Vendor) *</label>
               <select
  name="receiverId"
  value={newTransfer.receiverId}
  onChange={handleInputChange}
  required
  className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
>
  <option value="">Select Vendor</option>
  {vendors.map(vendor => (
    <option key={vendor.id} value={vendor.id}>  {/* ✅ از vendor.id استفاده کن */}
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
                    onChange={handleInputChange}
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
                  <label className="block text-purple-800 font-medium mb-2">Description</label>
                  <textarea
                    name="description"
                    value={newTransfer.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Optional description of the transfer"
                  />
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





