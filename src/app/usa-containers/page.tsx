// src/app/usa-containers/page.tsx
'use client';

import { useState, useEffect } from 'react';
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
  lotNumber: string;
  price: number;
  recovery: number;
  cutting: number;
  total: number;
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
  user: {
    id: string;
    username: string;
    name: string;
  };
  contents: ContentData[];
  createdAt: string;
}

export default function USAContainersManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [containers, setContainers] = useState<ContainerData[]>([]);
  const [filteredContainers, setFilteredContainers] = useState<ContainerData[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<ContainerData | null>(null);
  const [filters, setFilters] = useState({
    userId: '',
    containerId: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate statistics based on filtered containers
  const totalContainers = filteredContainers.length;
  const totalRevenue = filteredContainers.reduce((sum, container) => sum + container.grandTotal, 0);
  const totalItems = filteredContainers.reduce((sum, container) => sum + container.contents.length, 0);
  const totalRent = filteredContainers.reduce((sum, container) => sum + container.rent, 0);

  // Check manager access and load data
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }
    
    if (session.user?.role !== 'manager') {
      router.push('/login');
      return;
    }
    
    loadContainersData();
  }, [session, status, router]);

  const loadContainersData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/purchase/containers?all=true', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && Array.isArray(data)) {
          // فیلتر کردن containerهای بدون user
          const validContainers = data.filter(container => container.user != null);
          setContainers(validContainers);
          setFilteredContainers(validContainers);
        } else {
          setError('Invalid data received from server');
        }
      } else {
        const errorText = await response.text();
        setError(`Server error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Network error:', error);
      setError('Failed to connect to server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getUniqueUsers = () => {
    const usersMap = new Map();
    
    containers.forEach(container => {
      if (container.user && container.user.username) {
        usersMap.set(container.user.username, container.user);
      }
    });
    
    return Array.from(usersMap.values());
  };

  const applyFilters = () => {
    let filtered = containers;

    if (filters.userId) {
      filtered = filtered.filter(container => 
        container.user && container.user.username === filters.userId
      );
    }

    if (filters.containerId) {
      filtered = filtered.filter(container => 
        container.containerId.toLowerCase().includes(filters.containerId.toLowerCase())
      );
    }

    setFilteredContainers(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [containers]);

  useEffect(() => {
    applyFilters();
  }, [filters]);

  const refreshData = () => {
    loadContainersData();
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
          <div className="text-green-800 text-xl">Loading containers data...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex flex-col">
      <Navbar />
      
      <main className="flex-1 p-6 pt-24">
        {/* Header with Back Button */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-green-200 relative">
          <div className="absolute left-6 top-6">
            <Link 
              href="/dashboard"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition duration-200 font-semibold flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </Link>
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-green-900 mb-4">
              USA Containers Management
            </h1>
            <p className="text-green-700 text-lg mb-4">
              Comprehensive overview of all user containers
            </p>
            
            <button
              onClick={refreshData}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
            <button 
              onClick={loadContainersData}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded mt-2"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3 space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
              <h3 className="text-2xl font-semibold text-green-900 mb-6">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-green-800 font-medium mb-3">User</label>
                  <select
                    value={filters.userId}
                    onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                    className="w-full p-4 rounded-xl bg-green-50 text-green-900 border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">All Users</option>
                    {getUniqueUsers().map(user => (
                      <option key={user.username} value={user.username}>
                        {user.name} ({user.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-green-800 font-medium mb-3">Container ID</label>
                  <input
                    type="text"
                    placeholder="Search container ID..."
                    value={filters.containerId}
                    onChange={(e) => setFilters(prev => ({ ...prev, containerId: e.target.value }))}
                    className="w-full p-4 rounded-xl bg-green-50 text-green-900 border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Containers Table */}
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
                        <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Status</th>
                        <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">City</th>
                        <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Date</th>
                        <th className="p-4 text-right text-green-900 font-semibold border-b border-green-200">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContainers.map((container) => (
                        <tr 
                          key={container.id} 
                          className="border-b border-green-200 hover:bg-green-100 cursor-pointer transition-colors"
                          onClick={() => setSelectedContainer(container)}
                        >
                          <td className="p-4 text-green-900">{container.containerId}</td>
                          <td className="p-4 text-green-900">
                            {container.user ? (
                              `${container.user.name} (${container.user.username})`
                            ) : (
                              <span className="text-red-500">User not found</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              container.status === 'delivered' ? 'bg-green-500 text-white' :
                              container.status === 'shipped' ? 'bg-yellow-500 text-white' :
                              'bg-gray-500 text-white'
                            }`}>
                              {container.status}
                            </span>
                          </td>
                          <td className="p-4 text-green-900">{container.city}</td>
                          <td className="p-4 text-green-900">{container.date}</td>
                          <td className="p-4 text-right text-green-900 font-semibold">
                            ${container.grandTotal.toLocaleString()}
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
          </div>

          {/* Statistics Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
              <h3 className="text-xl font-semibold text-green-900 mb-4">Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-green-700">Total Containers</span>
                  <span className="text-green-900 font-semibold">{totalContainers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700">Total Revenue</span>
                  <span className="text-green-900 font-semibold">${totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700">Total Items</span>
                  <span className="text-green-900 font-semibold">{totalItems}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700">Total Rent</span>
                  <span className="text-green-900 font-semibold">${totalRent.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* User Statistics */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
              <h3 className="text-xl font-semibold text-green-900 mb-4">Users ({getUniqueUsers().length})</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {getUniqueUsers().map(user => (
                  <div key={user.username} className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                    <span className="text-green-700 text-sm">{user.name}</span>
                    <span className="text-green-900 font-semibold text-sm">
                      {containers.filter(c => c.user && c.user.username === user.username).length}
                    </span>
                  </div>
                ))}
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
                <button
                  onClick={() => setSelectedContainer(null)}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-white transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                  <h4 className="text-lg font-semibold text-green-900 mb-4">Container Information</h4>
                  <div className="space-y-2">
                    <p><span className="text-green-700 font-medium">User:</span> {selectedContainer.user ? selectedContainer.user.name : 'Unknown'}</p>
                    <p><span className="text-green-700 font-medium">Status:</span> {selectedContainer.status}</p>
                    <p><span className="text-green-700 font-medium">City:</span> {selectedContainer.city}</p>
                    <p><span className="text-green-700 font-medium">Date:</span> {selectedContainer.date}</p>
                    <p><span className="text-green-700 font-medium">Rent:</span> ${selectedContainer.rent}</p>
                    <p><span className="text-green-700 font-medium">Grand Total:</span> ${selectedContainer.grandTotal}</p>
                  </div>
                </div>

                <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                  <h4 className="text-lg font-semibold text-green-900 mb-4">Financial Summary</h4>
                  <div className="space-y-2">
                    <p><span className="text-green-700 font-medium">Contents Total:</span> 
                      ${selectedContainer.contents.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                    </p>
                    <p><span className="text-green-700 font-medium">Container Rent:</span> 
                      ${selectedContainer.rent.toLocaleString()}
                    </p>
                    <p><span className="text-green-700 font-medium">Number of Items:</span> 
                      {selectedContainer.contents.length}
                    </p>
                  </div>
                </div>
              </div>

              <h4 className="text-xl font-semibold text-green-900 mb-6">
                Contents ({selectedContainer.contents.length} items)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full bg-green-50 rounded-xl border border-green-200">
                  <thead>
                    <tr className="bg-green-100">
                      <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">#</th>
                      <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Item</th>
                      <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Model</th>
                      <th className="p-4 text-left text-green-900 font-semibold border-b border-green-200">Lot Number</th>
                      <th className="p-4 text-right text-green-900 font-semibold border-b border-green-200">Price</th>
                      <th className="p-4 text-right text-green-900 font-semibold border-b border-green-200">Recovery</th>
                      <th className="p-4 text-right text-green-900 font-semibold border-b border-green-200">Cutting</th>
                      <th className="p-4 text-right text-green-900 font-semibold border-b border-green-200">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedContainer.contents.map((item, index) => (
                      <tr key={index} className="border-b border-green-200 hover:bg-green-100">
                        <td className="p-4 text-green-900">{item.number}</td>
                        <td className="p-4 text-green-900">{item.item}</td>
                        <td className="p-4 text-green-900">{item.model}</td>
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