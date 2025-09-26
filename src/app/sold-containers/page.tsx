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

interface DocumentFile {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  type: string;
  containerId: string | null;
  transferId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
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
  documents: DocumentFile[];
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
      const response = await fetch('/api/uae/sold-containers');
      
      if (response.ok) {
        const soldContainers = await response.json();
        console.log('✅ Sold containers loaded:', soldContainers.length);
        
        // دیباگ: نمایش اطلاعات فایل‌های هر کانتینر
        soldContainers.forEach((container: ContainerData) => {
          console.log(`📦 Container ${container.containerId}:`, {
            filesCount: container.documents?.length || 0,
            files: container.documents?.map(f => ({
              path: f.path,
              originalName: f.originalName,
              type: f.type
            }))
          });
        });
        
        setContainers(soldContainers);
        setFilteredContainers(soldContainers);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load sold containers');
        console.error('❌ Error loading sold containers:', errorData);
      }
    } catch (error) {
      setError('Failed to load sold containers');
      console.error('❌ Error loading sold containers:', error);
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePrint = (container: ContainerData) => {
  // ایجاد یک پنجره جدید برای پرینت
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Container Report - ${container.containerId}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: black; 
              background: white;
            }
            h1, h2, h3, p, td, th { color: black !important; }
            table { border-collapse: collapse; width: 100%; margin: 10px 0; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .section { margin-bottom: 25px; }
            .footer { margin-top: 40px; text-align: center; border-top: 1px solid #000; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Container Sales Report</h1>
            <p>Container ID: ${container.containerId}</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="section">
            <h2>Container Information</h2>
            <p><strong>Owner:</strong> ${container.user?.name || 'Unknown'}</p>
            <p><strong>City:</strong> ${container.city}</p>
            <p><strong>Date:</strong> ${container.date}</p>
            <p><strong>Status:</strong> ${container.status}</p>
          </div>
          
          <div class="section">
            <h2>Financial Summary</h2>
            <p><strong>Purchase Cost:</strong> $${formatCurrency(container.grandTotal)} (${formatCurrency(container.grandTotal * 3.67)} AED)</p>
            <p><strong>Total Sales:</strong> ${formatCurrency(container.uaeSales?.reduce((sum, sale) => sum + sale.salePrice, 0) || 0)} AED</p>
            <p><strong>Net Profit:</strong> ${formatCurrency((container.uaeSales?.reduce((sum, sale) => sum + sale.salePrice, 0) || 0) - (container.grandTotal * 3.67))} AED</p>
          </div>
          
          <div class="footer">
            <p>UAE Container Management System - Automated Report</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
  }
};
  const getFileIcon = (fileType: string, fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (fileType.includes('pdf') || extension === 'pdf') return '📕';
    if (fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension || '')) return '🖼️';
    if (fileType.includes('word') || fileType.includes('document') || ['doc', 'docx'].includes(extension || '')) return '📄';
    if (fileType.includes('excel') || fileType.includes('sheet') || ['xls', 'xlsx'].includes(extension || '')) return '📊';
    if (fileType.includes('zip') || fileType.includes('rar') || ['zip', 'rar', '7z'].includes(extension || '')) return '📦';
    return '📎';
  };

  const getContainerFiles = (container: ContainerData) => {
    return container.documents?.filter(doc => 
      doc.containerId === container.id && !doc.transferId
    ) || [];
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

  function openFileInNewTab(path: string, originalName: string): void {
    const fileUrl = `${window.location.origin}${path}`;
    const newTab = window.open(fileUrl, '_blank');
    if (!newTab) {
      alert(`Unable to open the file "${originalName}". Please check your browser's popup settings.`);
    }
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
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl shadow-lg p-6 border border-green-200 sticky top-24">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-semibold text-green-900">
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
                    <div className="space-y-2 text-sm text-green-900">
                      <p><span className="font-medium">Container ID:</span> {selectedContainer.containerId}</p>
                      <p><span className="font-medium">User:</span> {selectedContainer.user?.name}</p>
                      <p><span className="font-medium">City:</span> {selectedContainer.city}</p>
                      <p><span className="font-medium">Date:</span> {selectedContainer.date}</p>
                      <p><span className="font-medium">Status:</span> {selectedContainer.status}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-blue-800 mb-2">Financial Information</h4>
                    <div className="space-y-2 text-sm text-green-900">
                      <p><span className="font-medium">Purchase Cost in USA:</span> ${formatCurrency(selectedContainer.grandTotal)}</p>
                      <p><span className="font-medium">Purchase Cost (AED):</span> {formatCurrency(selectedContainer.grandTotal * 3.67)} AED</p>
                      <p><span className="font-medium">Container Rent:</span> ${formatCurrency(selectedContainer.rent)}</p>
                    </div>
                  </div>

                  {/* Uploaded Files Section */}
                  <div>
                    <h4 className="text-lg font-semibold text-blue-800 mb-2">
                      Uploaded Files ({getContainerFiles(selectedContainer).length})
                    </h4>
                    {getContainerFiles(selectedContainer).length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {getContainerFiles(selectedContainer).map((file) => (
                          <div key={file.id} className="bg-white rounded-lg p-3 border border-green-200 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <span className="text-xl">{getFileIcon(file.type, file.originalName)}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-green-900 text-sm truncate" title={file.originalName}>
                                    {file.originalName}
                                  </p>
                                  <p className="text-xs text-green-700">
                                    Type: {file.type} • Date: {new Date(file.createdAt).toLocaleDateString()}
                                  </p>
                                  <p className="text-xs text-gray-600 truncate" title={file.path}>
                                    Path: {file.path}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => openFileInNewTab(file.path, file.originalName)}
                                className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition duration-200 whitespace-nowrap"
                                title="View File"
                              >
                                Open
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-green-700 text-sm">No files uploaded for this container.</p>
                        <p className="text-green-600 text-xs mt-1">
                          Total documents in DB: {selectedContainer.documents?.length || 0}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedContainer.uaeSales && selectedContainer.uaeSales.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-blue-800 mb-2">UAE Sales</h4>
                      <div className="space-y-1 text-sm text-green-900">
                        <p><span className="font-medium">Sales Items:</span> {selectedContainer.uaeSales.length}</p>
                        <p><span className="font-medium">Total Sales:</span> {formatCurrency(selectedContainer.uaeSales.reduce((sum, sale) => sum + sale.salePrice, 0))} AED</p>
                      </div>
                    </div>
                  )}

                  {selectedContainer.uaeExpends && selectedContainer.uaeExpends.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-blue-800 mb-2">UAE Expenses</h4>
                      <div className="space-y-1 text-sm text-green-900">
                        <p><span className="font-medium">Expense Items:</span> {selectedContainer.uaeExpends.length}</p>
                        <p><span className="font-medium">Total Expenses:</span> {formatCurrency(selectedContainer.uaeExpends.reduce((sum, expend) => sum + expend.amount, 0))} AED</p>
                      </div>
                    </div>
                  )}

                  {selectedContainer.uaeSales && selectedContainer.uaeSales.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-blue-800 mb-2">Profit Calculation</h4>
                      <div className="space-y-1 text-sm text-green-900">
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

                  <button
                    onClick={() => handlePrint(selectedContainer)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition duration-200 font-semibold"
                  >
                    🖨️ Print Container Report
                  </button>
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
                        <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Files</th>
                        <th className="p-4 text-left text-blue-900 font-semibold border-b border-blue-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContainers.map((container) => {
                        const stats = calculateContainerStats(container);
                        const containerFiles = getContainerFiles(container);
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
                            <td className="p-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`px-2 py-1 rounded-full text-sm ${
                                  containerFiles.length > 0 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {containerFiles.length} files
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => setSelectedContainer(container)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition duration-200 mr-2"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => handlePrint(container)}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition duration-200"
                              >
                                Print
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

      {/* Footer */}
      <Footer />
    <style jsx global>{`
      @media print {
        body {
          visibility: visible !important;
          background: white !important;
          color: black !important;
          font-family: Arial, sans-serif !important;
        }
        body * {
          visibility: visible !important;
        }
        .no-print {
          display: none !important;
        }
        #print-section {
          display: block !important;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: auto;
          z-index: 9999;
        }
        .hidden {
          display: block !important;
        }
      }
      .hidden {
        display: none;
      }
    `}</style>
  </div>
 );
}