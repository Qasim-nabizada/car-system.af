'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface SaleItem {
  id: string;
  number: number;
  item: string;
  salePrice: number;
  lotNumber: string;
  note: string;
  createdAt: string;
}

interface ExpendItem {
  id: string;
  category: string;
  amount: number;
  description: string;
  createdAt: string;
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
  contents: any[];
  uaeSales: SaleItem[];
  uaeExpends: ExpendItem[];
  createdAt: string;
  updatedAt: string;
}

export default function SoldContainersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [containers, setContainers] = useState<ContainerData[]>([]);
  const [filteredContainers, setFilteredContainers] = useState<ContainerData[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<ContainerData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }
    
    loadSoldContainers();
  }, [session, status, router]);

  useEffect(() => {
    // Filter containers based on container ID
    const filtered = containers.filter(container =>
      container.containerId.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredContainers(filtered);
  }, [searchTerm, containers]);

  const loadSoldContainers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading sold containers...');
      const response = await fetch('/api/purchase/containers?all=true');
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Containers loaded:', data.length);
        
        // Only containers that have UAE sales data
        const soldContainers = data.filter((container: ContainerData) => 
          container.uaeSales && container.uaeSales.length > 0
        );
        
        console.log('✅ Sold containers:', soldContainers.length);
        setContainers(soldContainers);
        setFilteredContainers(soldContainers);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load containers');
        console.error('❌ Error loading containers:', errorData);
      }
    } catch (error) {
      setError('Failed to load containers');
      console.error('❌ Error loading containers:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateContainerStats = (container: ContainerData) => {
    const totalSales = container.uaeSales?.reduce((sum, sale) => sum + sale.salePrice, 0) || 0;
    const totalExpends = container.uaeExpends?.reduce((sum, expend) => sum + expend.amount, 0) || 0;
    const totalBuyUSA = container.grandTotal * 3.67; // USD to AED conversion rate
    const totalBenefits = totalSales - totalExpends - totalBuyUSA;
    
    return {
      totalSales,
      totalExpends,
      totalBuyUSA,
      totalBenefits
    };
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-blue-800 text-xl">Loading...</div>
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
              className="bg-green-800 hover:bg-green-500 text-white px-6 py-3 rounded-xl transition duration-200 font-semibold flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </Link>
            
            <h1 className="text-4xl font-bold text-blue-900 text-center">
            Sold Containers in UAE
            </h1>
            
            <button
              onClick={loadSoldContainers}
              className="bg-green-800 hover:bg-green-500 text-white px-6 py-3 rounded-xl transition duration-200 font-semibold"
            >
              🔄 Refresh
            </button>
          </div>

          <p className="text-blue-700 text-lg text-center mb-6">
            Manage and view containers sold in UAE
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button 
              onClick={loadSoldContainers}
              className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Search and Stats */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div>
              <label className="block text-blue-800 font-medium mb-3">Search by Container ID</label>
              <input
                type="text"
                placeholder="Enter container ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-4 rounded-xl bg-blue-50 text-blue-900 border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="text-center">
              <div className="bg-blue-100 p-4 rounded-xl border border-blue-200">
                <h3 className="text-2xl font-bold text-blue-900">{filteredContainers.length}</h3>
                <p className="text-blue-700">Total Sold Containers</p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-green-100 p-4 rounded-xl border border-green-200">
                <h3 className="text-2xl font-bold text-green-900">
                  {formatCurrency(filteredContainers.reduce((sum, container) => {
                    const stats = calculateContainerStats(container);
                    return sum + stats.totalSales;
                  }, 0))} AED
                </h3>
                <p className="text-green-700">Total Sales</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Container Details - 1 column */}
          {selectedContainer && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200 sticky top-24">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-semibold text-blue-900">
                    Container Details
                  </h3>
                  <button
                    onClick={() => setSelectedContainer(null)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition duration-200"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-green-800 mb-2">Container Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Container ID:</span> {selectedContainer.containerId}</p>
                      <p><span className="font-medium">User:</span> {selectedContainer.user?.name}</p>
                      <p><span className="font-medium">City:</span> {selectedContainer.city}</p>
                      <p><span className="font-medium">Date:</span> {selectedContainer.date}</p>
                      <p><span className="font-medium">Status:</span> {selectedContainer.status}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-blue-800 mb-2">Financial Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Purchase Cost in USA:</span> ${formatCurrency(selectedContainer.grandTotal)}</p>
                      <p><span className="font-medium">Purchase Cost (AED):</span> {formatCurrency(selectedContainer.grandTotal * 3.67)} AED</p>
                      <p><span className="font-medium">Container Rent:</span> ${formatCurrency(selectedContainer.rent)}</p>
                    </div>
                  </div>

                  {selectedContainer.uaeSales && selectedContainer.uaeSales.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-blue-800 mb-2">UAE Sales</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Sales Items:</span> {selectedContainer.uaeSales.length}</p>
                        <p><span className="font-medium">Total Sales:</span> {formatCurrency(selectedContainer.uaeSales.reduce((sum, sale) => sum + sale.salePrice, 0))} AED</p>
                      </div>
                    </div>
                  )}

                  {selectedContainer.uaeExpends && selectedContainer.uaeExpends.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-blue-800 mb-2">UAE Expenses</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Expense Items:</span> {selectedContainer.uaeExpends.length}</p>
                        <p><span className="font-medium">Total Expenses:</span> {formatCurrency(selectedContainer.uaeExpends.reduce((sum, expend) => sum + expend.amount, 0))} AED</p>
                      </div>
                    </div>
                  )}

                  {selectedContainer.uaeSales && selectedContainer.uaeSales.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-blue-800 mb-2">Profit Calculation</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Total Revenue:</span> {formatCurrency(selectedContainer.uaeSales.reduce((sum, sale) => sum + sale.salePrice, 0))} AED</p>
                        <p><span className="font-medium">Total Costs:</span> {formatCurrency((selectedContainer.grandTotal * 3.67) + (selectedContainer.uaeExpends?.reduce((sum, expend) => sum + expend.amount, 0) || 0))} AED</p>
                        <p><span className="font-medium">Net Profit:</span> 
                          <span className={selectedContainer.uaeSales.reduce((sum, sale) => sum + sale.salePrice, 0) - ((selectedContainer.grandTotal * 3.67) + (selectedContainer.uaeExpends?.reduce((sum, expend) => sum + expend.amount, 0) || 0)) >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {' '}{formatCurrency(selectedContainer.uaeSales.reduce((sum, sale) => sum + sale.salePrice, 0) - ((selectedContainer.grandTotal * 3.67) + (selectedContainer.uaeExpends?.reduce((sum, expend) => sum + expend.amount, 0) || 0)))} AED
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Containers Table - 3 columns */}
          <div className={selectedContainer ? "lg:col-span-3" : "lg:col-span-4"}>
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200">
              <h3 className="text-2xl font-semibold text-blue-900 mb-6">
                Sold Containers List ({filteredContainers.length})
              </h3>
              
              {filteredContainers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full bg-blue-50 rounded-xl border border-blue-200">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Container ID</th>
                        <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">User</th>
                        <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">City</th>
                        <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Date</th>
                        <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Sales (AED)</th>
                        <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Expenses (AED)</th>
                        <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Profit (AED)</th>
                        <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContainers.map((container) => {
                        const stats = calculateContainerStats(container);
                        return (
                          <tr key={container.id} className="border-b border-blue-200 hover:bg-blue-100">
                            <td className="p-4 text-blue-900 font-mono">{container.containerId}</td>
                            <td className="p-4 text-blue-900">
                              {container.user?.name || 'Unknown'}
                            </td>
                            <td className="p-4 text-blue-900">{container.city}</td>
                            <td className="p-4 text-blue-900">{container.date}</td>
                            <td className="p-4 text-green-600 font-semibold">
                              {formatCurrency(stats.totalSales)} AED
                            </td>
                            <td className="p-4 text-red-600">
                              {formatCurrency(stats.totalExpends + stats.totalBuyUSA)} AED
                            </td>
                            <td className="p-4 font-semibold">
                              <span className={stats.totalBenefits >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(stats.totalBenefits)} AED
                              </span>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => setSelectedContainer(container)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition duration-200"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-blue-700">
                  {containers.length === 0 ? 'No sold containers found.' : 'No containers found with this ID.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}