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
}

interface Container {
  id: string;
  containerId: string;
}

export default function TransfersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [containerFilter, setContainerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // New transfer form states
  const [newTransfer, setNewTransfer] = useState({
    receiverId: '',
    amount: '',
    containerId: '',
    type: 'Bank',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  // اضافه کردن state جدید برای پرینت
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printType, setPrintType] = useState<'all' | 'container' | 'user' | 'single' | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');

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
  }, [containerFilter, dateFilter, transfers]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading data...');
      
      // Load transfers, users, and containers in parallel
      const [transfersResponse, usersResponse, containersResponse] = await Promise.all([
        fetch('/api/transfers'),
        fetch('/api/users'),
        fetch('/api/containers?all=true')
      ]);
      
      console.log('📊 Transfers response:', transfersResponse.status);
      console.log('📊 Users response:', usersResponse.status);
      console.log('📊 Containers response:', containersResponse.status);
      
      if (!transfersResponse.ok) throw new Error(`Failed to load transfers: ${transfersResponse.status}`);
      if (!usersResponse.ok) throw new Error(`Failed to load users: ${usersResponse.status}`);
      if (!containersResponse.ok) throw new Error(`Failed to load containers: ${containersResponse.status}`);
      
      const transfersData = await transfersResponse.json();
      const usersData = await usersResponse.json();
      const containersData = await containersResponse.json();
      
      console.log('✅ Users loaded:', usersData.length);
      console.log('✅ Containers loaded:', containersData.length);
      console.log('✅ Transfers loaded:', transfersData.length);
      
      setTransfers(transfersData);
      setFilteredTransfers(transfersData);
      setUsers(usersData);
      setContainers(containersData);
      
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setError('Failed to load data. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const filterTransfers = () => {
    let filtered = transfers;

    if (containerFilter) {
      filtered = filtered.filter(transfer =>
        transfer.container.containerId.toLowerCase().includes(containerFilter.toLowerCase())
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(transfer => transfer.date === dateFilter);
    }

    setFilteredTransfers(filtered);
  };

  // تابع جدید برای پرینت گرفتن
  const executePrint = () => {
    const printContent = document.getElementById('print-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Money Transfers Report - Al Raya Trading</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .summary { margin-bottom: 20px; padding: 15px; border: 1px solid #000; }
                .section-title { background-color: #f0f0f0; padding: 10px; font-weight: bold; margin-top: 20px; border: 1px solid #000; }
                .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .data-table th, .data-table td { padding: 10px; border: 1px solid #000; text-align: left; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; border-top: 1px solid #000; padding-top: 10px; }
                @media print {
                  body { margin: 0; padding: 15px; }
                  .page-break { page-break-after: always; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 100);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewTransfer(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newTransfer,
          amount: parseFloat(newTransfer.amount),
          senderId: session?.user?.id
        })
      });
      
      if (response.ok) {
        const savedTransfer = await response.json();
        setTransfers(prev => [savedTransfer, ...prev]);
        setNewTransfer({
          receiverId: '',
          amount: '',
          containerId: '',
          type: 'Bank',
          date: new Date().toISOString().split('T')[0],
          description: ''
        });
        alert('Transfer saved successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save transfer');
      }
    } catch (error) {
      console.error('Error saving transfer:', error);
      setError(error instanceof Error ? error.message : 'Failed to save transfer');
    } finally {
      setSaving(false);
    }
  };

  const totalAmount = filteredTransfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  const totalTransfers = filteredTransfers.length;

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
            
            <div className="flex space-x-2">
              <button
                onClick={loadData}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition duration-200 font-semibold"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => {
                  setPrintType('all');
                  setShowPrintModal(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition duration-200 font-semibold"
              >
                🖨️ Print All
              </button>
            </div>
          </div>

          <p className="text-purple-700 text-lg text-center mb-6">
            Manage money transfers for containers
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Side - Add New Transfer */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-200 sticky top-24">
              <h2 className="text-2xl font-semibold text-purple-900 mb-6">Add New Transfer</h2>
              
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
                  <label className="block text-purple-800 font-medium mb-2">Receiver *</label>
                  <select
                    name="receiverId"
                    value={newTransfer.receiverId}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Receiver</option>
                    {users.filter(user => user.id !== session?.user?.id).map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.username})
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
                    placeholder="Optional description"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg transition duration-200 font-semibold"
                >
                  {saving ? '💾 Saving...' : '💾 Save Transfer'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Side - Transfers List */}
          <div className="lg:col-span-3">
            {/* Filters and Stats */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-purple-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-purple-800 font-medium mb-2">Filter by Container ID</label>
                  <input
                    type="text"
                    placeholder="Enter container ID..."
                    value={containerFilter}
                    onChange={(e) => setContainerFilter(e.target.value)}
                    className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-purple-800 font-medium mb-2">Filter by Date</label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex space-x-4">
                  <div className="bg-purple-100 p-4 rounded-lg border border-purple-200 flex-1">
                    <h3 className="text-2xl font-bold text-purple-900">{totalTransfers}</h3>
                    <p className="text-purple-700">Total Transfers</p>
                  </div>
                  <div className="bg-green-100 p-4 rounded-lg border border-green-200 flex-1">
                    <h3 className="text-2xl font-bold text-green-900">${totalAmount.toLocaleString()}</h3>
                    <p className="text-green-700">Total Amount</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setContainerFilter('');
                    setDateFilter('');
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition duration-200"
                >
                  Clear Filters
                </button>
                
                {/* دکمه‌های پرینت اضافی */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedContainer(e.target.value);
                      setPrintType('container');
                      setShowPrintModal(true);
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded border border-blue-500"
                >
                  <option value="">Print by Container</option>
                  {Array.from(new Set(transfers.map(t => t.container.containerId))).map(containerId => (
                    <option key={containerId} value={containerId}>{containerId}</option>
                  ))}
                </select>

                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedUser(e.target.value);
                      setPrintType('user');
                      setShowPrintModal(true);
                    }
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded border border-green-500"
                >
                  <option value="">Print by User</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transfers Table */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-200">
              <h3 className="text-2xl font-semibold text-purple-900 mb-6">
                Transfers List ({filteredTransfers.length})
              </h3>
              
              {filteredTransfers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full bg-purple-50 rounded-xl border border-purple-200">
                    <thead>
                      <tr className="bg-purple-100">
                        <th className="p-4 text-left text-purple-900 font-semibold border-b border-purple-200">Date</th>
                        <th className="p-4 text-left text-purple-900 font-semibold border-b border-purple-200">Sender</th>
                        <th className="p-4 text-left text-purple-900 font-semibold border-b border-purple-200">Receiver</th>
                        <th className="p-4 text-left text-purple-900 font-semibold border-b border-purple-200">Container ID</th>
                        <th className="p-4 text-left text-purple-900 font-semibold border-b border-purple-200">Amount (USD)</th>
                        <th className="p-4 text-left text-purple-900 font-semibold border-b border-purple-200">Type</th>
                        <th className="p-4 text-left text-purple-900 font-semibold border-b border-purple-200">Description</th>
                        <th className="p-4 text-left text-purple-900 font-semibold border-b border-purple-200">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransfers.map((transfer) => (
                        <tr key={transfer.id} className="border-b border-purple-200 hover:bg-purple-100">
                          <td className="p-4 text-purple-900">{transfer.date}</td>
                          <td className="p-4 text-purple-900">{transfer.sender.name}</td>
                          <td className="p-4 text-purple-900">{transfer.receiver.name}</td>
                          <td className="p-4 text-purple-900 font-mono">{transfer.container.containerId}</td>
                          <td className="p-4 text-green-600 font-semibold">${transfer.amount.toLocaleString()}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              transfer.type === 'Bank' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {transfer.type}
                            </span>
                          </td>
                          <td className="p-4 text-purple-900 text-sm">{transfer.description || '-'}</td>
                          <td className="p-4">
                            <button
                              onClick={() => {
                                setSelectedTransfer(transfer);
                                setPrintType('single');
                                setShowPrintModal(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition duration-200"
                              title="Print this transfer"
                            >
                              🖨️
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
        </div>


                {/* Print Modal */}
        {showPrintModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-purple-900">
                  🖨️ Print Transfer Report
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={executePrint}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded transition duration-200"
                  >
                    Print Now
                  </button>
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div id="print-content" className="p-4 bg-white text-black">
                <div className="header">
                  <h1>Al Raya Used Auto Spare Trading LLC</h1>
                  <h2>Money Transfers Report</h2>
                  <p>Generated on: {new Date().toLocaleDateString()}</p>
                </div>

                {printType === 'all' && (
                  <>
                    <div className="summary">
                      <h3>Summary Report - All Transfers</h3>
                      <p>Total Transfers: {transfers.length}</p>
                      <p>Total Amount: ${totalAmount.toLocaleString()} USD</p>
                      <p>Date Range: All records</p>
                    </div>

                    <div className="section-title">All Transfers</div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Sender</th>
                          <th>Receiver</th>
                          <th>Container ID</th>
                          <th>Amount (USD)</th>
                          <th>Type</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfers.map((transfer) => (
                          <tr key={transfer.id}>
                            <td>{transfer.date}</td>
                            <td>{transfer.sender.name}</td>
                            <td>{transfer.receiver.name}</td>
                            <td>{transfer.container.containerId}</td>
                            <td>${transfer.amount.toLocaleString()}</td>
                            <td>{transfer.type}</td>
                            <td>{transfer.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {printType === 'container' && selectedContainer && (
                  <>
                    <div className="summary">
                      <h3>Container Transfer Report</h3>
                      <p>Container ID: {selectedContainer}</p>
                      <p>Total Transfers: {transfers.filter(t => t.container.containerId === selectedContainer).length}</p>
                      <p>Total Amount: ${transfers.filter(t => t.container.containerId === selectedContainer).reduce((sum, t) => sum + t.amount, 0).toLocaleString()} USD</p>
                    </div>

                    <div className="section-title">Transfers for Container {selectedContainer}</div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Sender</th>
                          <th>Receiver</th>
                          <th>Amount (USD)</th>
                          <th>Type</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfers
                          .filter(t => t.container.containerId === selectedContainer)
                          .map((transfer) => (
                            <tr key={transfer.id}>
                              <td>{transfer.date}</td>
                              <td>{transfer.sender.name}</td>
                              <td>{transfer.receiver.name}</td>
                              <td>${transfer.amount.toLocaleString()}</td>
                              <td>{transfer.type}</td>
                              <td>{transfer.description || '-'}</td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </>
                )}

                {printType === 'user' && selectedUser && (
                  <>
                    <div className="summary">
                      <h3>User Transfer Report</h3>
                      <p>User: {users.find(u => u.id === selectedUser)?.name}</p>
                      <p>Total Received: ${transfers.filter(t => t.receiverId === selectedUser).reduce((sum, t) => sum + t.amount, 0).toLocaleString()} USD</p>
                      <p>Total Sent: ${transfers.filter(t => t.senderId === selectedUser).reduce((sum, t) => sum + t.amount, 0).toLocaleString()} USD</p>
                    </div>

                    <div className="section-title">Transfers for {users.find(u => u.id === selectedUser)?.name}</div>
                    
                    <div className="section-title">Received Transfers</div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Sender</th>
                          <th>Container ID</th>
                          <th>Amount (USD)</th>
                          <th>Type</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfers
                          .filter(t => t.receiverId === selectedUser)
                          .map((transfer) => (
                            <tr key={transfer.id}>
                              <td>{transfer.date}</td>
                              <td>{transfer.sender.name}</td>
                              <td>{transfer.container.containerId}</td>
                              <td>${transfer.amount.toLocaleString()}</td>
                              <td>{transfer.type}</td>
                              <td>{transfer.description || '-'}</td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>

                    <div className="section-title">Sent Transfers</div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Receiver</th>
                          <th>Container ID</th>
                          <th>Amount (USD)</th>
                          <th>Type</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfers
                          .filter(t => t.senderId === selectedUser)
                          .map((transfer) => (
                            <tr key={transfer.id}>
                              <td>{transfer.date}</td>
                              <td>{transfer.receiver.name}</td>
                              <td>{transfer.container.containerId}</td>
                              <td>${transfer.amount.toLocaleString()}</td>
                              <td>{transfer.type}</td>
                              <td>{transfer.description || '-'}</td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </>
                )}

                {printType === 'single' && selectedTransfer && (
                  <>
                    <div className="summary">
                      <h3>Single Transfer Receipt</h3>
                      <p>Transfer ID: {selectedTransfer.id}</p>
                      <p>Date: {selectedTransfer.date}</p>
                    </div>

                    <div className="section-title">Transfer Details</div>
                    <table className="data-table">
                      <tbody>
                        <tr>
                          <td><strong>Transfer ID:</strong></td>
                          <td>{selectedTransfer.id}</td>
                        </tr>
                        <tr>
                          <td><strong>Date:</strong></td>
                          <td>{selectedTransfer.date}</td>
                        </tr>
                        <tr>
                          <td><strong>Sender:</strong></td>
                          <td>{selectedTransfer.sender.name}</td>
                        </tr>
                        <tr>
                          <td><strong>Receiver:</strong></td>
                          <td>{selectedTransfer.receiver.name}</td>
                        </tr>
                        <tr>
                          <td><strong>Container ID:</strong></td>
                          <td>{selectedTransfer.container.containerId}</td>
                        </tr>
                        <tr>
                          <td><strong>Amount:</strong></td>
                          <td>${selectedTransfer.amount.toLocaleString()} USD</td>
                        </tr>
                        <tr>
                          <td><strong>Transfer Type:</strong></td>
                          <td>{selectedTransfer.type}</td>
                        </tr>
                        <tr>
                          <td><strong>Description:</strong></td>
                          <td>{selectedTransfer.description || 'No description'}</td>
                        </tr>
                        <tr>
                          <td><strong>Created At:</strong></td>
                          <td>{new Date(selectedTransfer.createdAt).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="section-title">Authorization</div>
                    <table className="data-table">
                      <tbody>
                        <tr>
                          <td><strong>Approved By:</strong></td>
                          <td>{session?.user?.name || 'System Manager'}</td>
                        </tr>
                        <tr>
                          <td><strong>Print Date:</strong></td>
                          <td>{new Date().toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                )}

                <div className="footer">
                  <p>© 2025 Al Raya Used Auto Spare Trading LLC. All rights reserved.</p>
                  <p>Report generated by: {session?.user?.name || 'System Manager'}</p>
                  <p>This is an official financial document</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}