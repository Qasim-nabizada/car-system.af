'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface ContainerData {
  id: string;
  containerId: string;
  grandTotal: number;
  status: string;
  user: {
    id: string;
    username: string;
    name: string;
  };
}

interface SaleItem {
  id: string;
  number: number;
  item: string;
  salePrice: number;
  lotNumber: string;
  note: string;
}

interface ExpendItem {
  id: string;
  category: string;
  amount: number;
  description: string;
}

const USD_TO_AED_RATE = 3.67;
const EXPEND_CATEGORIES = ['PORT', 'Area Rent', 'Labors Tips', 'Over Expend'];

export default function UAESalesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [containers, setContainers] = useState<ContainerData[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<ContainerData | null>(null);
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [expends, setExpends] = useState<ExpendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerLoading, setContainerLoading] = useState(false);

  // اضافه کردن state جدید برای پرینت
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'manager') {
      router.push('/login');
      return;
    }
    
    loadContainersData();
  }, [session, status, router]);

  useEffect(() => {
    if (selectedContainer) {
      loadUAEData();
    } else {
      // وقتی کانتینر انتخاب نشده، داده‌ها را پاک کنید
      setSales([]);
      setExpends([]);
    }
  }, [selectedContainer]);

  const loadContainersData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading containers...');
      const response = await fetch('/api/purchase/containers?all=true');
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Containers loaded:', data.length);
        setContainers(data);
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

  const loadUAEData = async () => {
    if (!selectedContainer) return;
    
    try {
      setContainerLoading(true);
      setError(null);
      
      console.log('🔄 Loading UAE data for container:', selectedContainer.id);
      
      const response = await fetch(`/api/uae/sales?containerId=${selectedContainer.id}`);
      
      console.log('📊 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ UAE data loaded:', data);
        
        setSales(data.sales || []);
        setExpends(data.expends || []);
        
        console.log('✅ Sales items:', data.sales?.length || 0);
        console.log('✅ Expend items:', data.expends?.length || 0);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to load UAE data:', response.status, errorData);
        setError(`Failed to load data: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error loading UAE data:', error);
      setError('Error loading data. Please try again.');
    } finally {
      setContainerLoading(false);
    }
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
              <title>UAE Sales Report - Container ${selectedContainer?.containerId}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .container-info { margin-bottom: 20px; }
                .container-info table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                .container-info td { padding: 8px; border: 1px solid #000; }
                .section-title { background-color: #f0f0f0; padding: 8px; font-weight: bold; margin-top: 20px; border: 1px solid #000; }
                .contents-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .contents-table th, .contents-table td { padding: 8px; border: 1px solid #000; text-align: center; }
                .summary-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .summary-table th, .summary-table td { padding: 8px; border: 1px solid #000; }
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

  const addSaleItem = () => {
    const newItem: SaleItem = {
      id: Date.now().toString(),
      number: sales.length + 1,
      item: '',
      salePrice: 0,
      lotNumber: '',
      note: ''
    };
    setSales([...sales, newItem]);
  };

  const updateSaleItem = (id: string, field: keyof SaleItem, value: string | number) => {
    setSales(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const deleteSaleItem = (id: string) => {
    setSales(prev => prev.filter(item => item.id !== id));
  };

  const addExpend = () => {
    const newItem: ExpendItem = {
      id: Date.now().toString(),
      category: 'PORT',
      amount: 0,
      description: ''
    };
    setExpends([...expends, newItem]);
  };

  const updateExpend = (id: string, field: keyof ExpendItem, value: string | number) => {
    setExpends(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const deleteExpend = (id: string) => {
    setExpends(prev => prev.filter(item => item.id !== id));
  };

  const saveData = async () => {
    if (!selectedContainer) return;
    
    try {
      setSaving(true);
      console.log('💾 Saving data for container:', selectedContainer.id);
      
      const response = await fetch('/api/uae/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId: selectedContainer.id,
          sales,
          expends
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Data saved successfully:', result);
        alert('Data saved successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error saving data:', errorData);
        alert(`Error: ${errorData.error || 'Failed to save data'}`);
      }
    } catch (error) {
      console.error('❌ Error saving data:', error);
      alert('Error saving data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const totalExpendUAE = expends.reduce((sum, item) => sum + item.amount, 0);
  const totalBuyUSA = selectedContainer ? selectedContainer.grandTotal * USD_TO_AED_RATE : 0;
  const totalExpends = totalBuyUSA + totalExpendUAE;
  const totalSaleUAE = sales.reduce((sum, item) => sum + item.salePrice, 0);
  const totalBenefits = totalSaleUAE - totalExpends;
  const eachPersonBenefits = totalBenefits / 2;


    if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-green-800 text-xl">Loading...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex flex-col">
      <Navbar />
      
      <main className="flex-1 p-6 pt-24">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-green-200">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-green-900 mb-4">🇦🇪 UAE Sales Management</h1>
            <p className="text-green-700 text-lg mb-4">Sales and expenditure tracking for UAE operations</p>
            
            {selectedContainer && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={saveData}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition duration-200 font-semibold"
                >
                  {saving ? '💾 Saving...' : '💾 Save Data'}
                </button>
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-200 font-semibold"
                >
                  🖨️ Print Report
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button 
              onClick={() => {
                if (selectedContainer) {
                  loadUAEData();
                } else {
                  loadContainersData();
                }
              }}
              className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-green-200">
          <h2 className="text-2xl font-semibold text-green-900 mb-4">Select Container</h2>
          <select
            value={selectedContainer?.id || ''}
            onChange={(e) => {
              const container = containers.find(c => c.id === e.target.value);
              setSelectedContainer(container || null);
            }}
            className="w-full p-4 rounded-xl bg-green-50 text-green-900 border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={containerLoading}
          >
            <option value="">Select a container</option>
            {containers.map(container => (
              <option key={container.id} value={container.id}>
                {container.containerId} - {container.user?.name || 'Unknown'} 
                ({container.status}) - ${container.grandTotal.toLocaleString()}
              </option>
            ))}
          </select>
          
          <div className="mt-4 text-sm text-green-600">
            Total containers: {containers.length}
            {containerLoading && ' - Loading container data...'}
          </div>
        </div>

        {/* Loading Overlay */}
        {containerLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg">
              <div className="text-green-600">Loading container data...</div>
            </div>
          </div>
        )}

        {selectedContainer && !containerLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-semibold text-green-900">Sales Items</h3>
                  <button
                    onClick={addSaleItem}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full bg-green-50 rounded-xl border border-green-200">
                    <thead>
                      <tr className="bg-green-100">
                        <th className="p-3 text-left text-green-900 font-semibold border-b border-green-200">#</th>
                        <th className="p-3 text-left text-green-900 font-semibold border-b border-green-200">Item</th>
                        <th className="p-3 text-left text-green-900 font-semibold border-b border-green-200">Sale Price (AED)</th>
                        <th className="p-3 text-left text-green-900 font-semibold border-b border-green-200">Lot Number</th>
                        <th className="p-3 text-left text-green-900 font-semibold border-b border-green-200">Note</th>
                        <th className="p-3 text-left text-green-900 font-semibold border-b border-green-200">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((item) => (
                        <tr key={item.id} className="border-b border-green-200 hover:bg-green-100">
                          <td className="p-3 text-green-900">{item.number}</td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.item}
                              onChange={(e) => updateSaleItem(item.id, 'item', e.target.value)}
                              className="w-full p-2 rounded-lg bg-white text-green-900 border border-green-300 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={item.salePrice}
                              onChange={(e) => updateSaleItem(item.id, 'salePrice', Number(e.target.value))}
                              className="w-full p-2 rounded-lg bg-white text-green-900 border border-green-300 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.lotNumber}
                              onChange={(e) => updateSaleItem(item.id, 'lotNumber', e.target.value)}
                              className="w-full p-2 rounded-lg bg-white text-green-900 border border-green-300 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.note}
                              onChange={(e) => updateSaleItem(item.id, 'note', e.target.value)}
                              className="w-full p-2 rounded-lg bg-white text-green-900 border border-green-300 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => deleteSaleItem(item.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition duration-200"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {sales.length === 0 && (
                  <div className="text-center py-8 text-green-700">
                    No sales items added yet.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-green-900">🇦🇪 UAE Expends</h3>
                  <button
                    onClick={addExpend}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition duration-200"
                  >
                    + Add
                  </button>
                </div>

                <div className="space-y-3">
                  {expends.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <select
                        value={item.category}
                        onChange={(e) => updateExpend(item.id, 'category', e.target.value)}
                        className="flex-1 p-2 rounded-lg bg-white text-green-900 border border-green-300 focus:outline-none focus:ring-1 focus:ring-green-500"
                      >
                        {EXPEND_CATEGORIES.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateExpend(item.id, 'amount', Number(e.target.value))}
                        className="w-20 p-2 rounded-lg bg-white text-green-900 border border-green-300 focus:outline-none focus:ring-1 focus:ring-green-500"
                        placeholder="AED"
                      />
                      <button
                        onClick={() => deleteExpend(item.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition duration-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-green-900 font-semibold">Total Expend (AED):</span>
                    <span className="text-green-900 font-bold">{totalExpendUAE.toLocaleString()}</span>
                  </div>
                </div>

                {expends.length === 0 && (
                  <div className="text-center py-4 text-green-700 text-sm">
                    No expenditure items
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
                <h3 className="text-xl font-semibold text-green-900 mb-4">Grand Total Counting</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-green-800 text-sm">Total Buy in USA (AED):</span>
                    <span className="text-green-900 font-semibold">{totalBuyUSA.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-green-800 text-sm">Total Expend in UAE (AED):</span>
                    <span className="text-green-900 font-semibold">{totalExpendUAE.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-green-200">
                    <span className="text-blue-800 text-sm font-medium">Total Expends (AED):</span>
                    <span className="text-blue-900 font-semibold">{totalExpends.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-green-800 text-sm">Total Sale In UAE (AED):</span>
                    <span className="text-green-900 font-semibold">{totalSaleUAE.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-green-200">
                    <span className="text-yellow-800 text-sm font-medium">Total Benefits (AED):</span>
                    <span className={`font-semibold ${totalBenefits >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totalBenefits.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-purple-800 text-sm">Each person Benefits (AED):</span>
                    <span className={`font-semibold ${eachPersonBenefits >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {eachPersonBenefits.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
                  <div className="text-center">
                    <p className="text-green-900 text-sm">Exchange Rate: 1 USD = {USD_TO_AED_RATE} AED</p>
                    <p className="text-green-700 text-xs">Container: {selectedContainer.containerId}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

                {showPrintModal && selectedContainer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-green-900">
                  Print UAE Sales Report - Container {selectedContainer.containerId}
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
                  <h2>UAE Sales Report - Container {selectedContainer.containerId}</h2>
                  <p>Generated on: {new Date().toLocaleDateString()}</p>
                </div>

                <div className="container-info">
                  <table>
                    <tbody>
                      <tr>
                        <td><strong>Container ID:</strong></td>
                        <td>{selectedContainer.containerId}</td>
                        <td><strong>Status:</strong></td>
                        <td>{selectedContainer.status}</td>
                      </tr>
                      <tr>
                        <td><strong>User:</strong></td>
                        <td>{selectedContainer.user?.name || 'Unknown'}</td>
                        <td><strong>Total Buy (USD):</strong></td>
                        <td>${selectedContainer.grandTotal.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td><strong>Total Buy (AED):</strong></td>
                        <td>{totalBuyUSA.toLocaleString()} AED</td>
                        <td><strong>Exchange Rate:</strong></td>
                        <td>1 USD = {USD_TO_AED_RATE} AED</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="section-title">Sales Items</div>
                <table className="contents-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Item</th>
                      <th>Sale Price (AED)</th>
                      <th>Lot Number</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((item, index) => (
                      <tr key={index}>
                        <td>{item.number}</td>
                        <td>{item.item}</td>
                        <td>{item.salePrice.toLocaleString()}</td>
                        <td>{item.lotNumber}</td>
                        <td>{item.note}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={2}>Total Sales (AED):</td>
                      <td>{totalSaleUAE.toLocaleString()}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>

                <div className="section-title">UAE Expenditures</div>
                <table className="contents-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Amount (AED)</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expends.map((item, index) => (
                      <tr key={index}>
                        <td>{item.category}</td>
                        <td>{item.amount.toLocaleString()}</td>
                        <td>{item.description}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-bold">
                      <td>Total UAE Expend (AED):</td>
                      <td>{totalExpendUAE.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>

                <div className="section-title">Grand Total Counting</div>
                <table className="summary-table">
                  <tbody>
                    <tr>
                      <td><strong>Total Buy in USA (AED):</strong></td>
                      <td>{totalBuyUSA.toLocaleString()} AED</td>
                    </tr>
                    <tr>
                      <td><strong>Total Expend in UAE (AED):</strong></td>
                      <td>{totalExpendUAE.toLocaleString()} AED</td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td><strong>Total Expends (AED):</strong></td>
                      <td><strong>{totalExpends.toLocaleString()} AED</strong></td>
                    </tr>
                    <tr>
                      <td><strong>Total Sale In UAE (AED):</strong></td>
                      <td>{totalSaleUAE.toLocaleString()} AED</td>
                    </tr>
                    <tr className={totalBenefits >= 0 ? "bg-green-50" : "bg-red-50"}>
                      <td><strong>Total Benefits (AED):</strong></td>
                      <td><strong className={totalBenefits >= 0 ? "text-green-600" : "text-red-600"}>
                        {totalBenefits.toLocaleString()} AED
                      </strong></td>
                    </tr>
                    <tr className={eachPersonBenefits >= 0 ? "bg-purple-50" : "bg-red-50"}>
                      <td><strong>Each person Benefits (AED):</strong></td>
                      <td><strong className={eachPersonBenefits >= 0 ? "text-purple-600" : "text-red-600"}>
                        {eachPersonBenefits.toLocaleString()} AED
                      </strong></td>
                    </tr>
                  </tbody>
                </table>

                <div className="footer">
                  <p>© 2025 Al Raya Used Auto Spare Trading LLC. All rights reserved.</p>
                  <p>Report generated by: {session?.user?.name || 'System'}</p>
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