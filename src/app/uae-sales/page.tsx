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
  vendor: {
    id: string;
    companyName: string;
    representativeName: string;
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

interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  containerId: string;
  createdAt: string;
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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerLoading, setContainerLoading] = useState(false);
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
      loadContainerDocuments();
    } else {
      setSales([]);
      setExpends([]);
      setDocuments([]);
    }
  }, [selectedContainer]);

  const loadContainersData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/purchase/containers?all=true&include=vendor');
      
      if (response.ok) {
        const data = await response.json();
        const completedContainers = data.filter((container: ContainerData) => 
          container.status === 'completed'
        );
        setContainers(completedContainers);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load containers');
      }
    } catch (error) {
      setError('Failed to load containers');
    } finally {
      setLoading(false);
    }
  };

  const loadUAEData = async () => {
    if (!selectedContainer) return;
    
    try {
      setContainerLoading(true);
      setError(null);
      
      const response = await fetch(`/api/uae/sales?containerId=${selectedContainer.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setSales(data.sales || []);
        setExpends(data.expends || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(`Failed to load data: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      setError('Error loading data. Please try again.');
    } finally {
      setContainerLoading(false);
    }
  };

  const loadContainerDocuments = async () => {
    if (!selectedContainer) return;
    
    try {
      const response = await fetch(`/api/documents?containerId=${selectedContainer.id}`);
      if (response.ok) {
        const docs = await response.json();
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setUploadedFiles(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async () => {
    if (!selectedContainer || uploadedFiles.length === 0) return;
    
    try {
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('containerId', selectedContainer.id);
      formData.append('type', 'uae-sales');
      
      console.log('📤 Uploading files to UAE API...');
      
      const response = await fetch('/api/documents/uae-upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        setUploadedFiles([]);
        loadContainerDocuments();
        alert(result.message || 'Documents uploaded successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to upload documents: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Error uploading documents');
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/uae/${documentId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        alert('Document deleted successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to delete document: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document');
    }
  };

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
        alert('Data saved successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error: ${errorData.error || 'Failed to save data'}`);
      }
    } catch (error) {
      alert('Error saving data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const totalExpendUAE = expends.reduce((sum, item) => sum + item.amount, 0);
  const totalBuyUSA = selectedContainer ? selectedContainer.grandTotal * USD_TO_AED_RATE : 0;
  const totalSaleUAE = sales.reduce((sum, item) => sum + item.salePrice, 0);
  const totalBenefits = totalSaleUAE - totalExpendUAE;
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
            Total completed containers: {containers.length}
            {containerLoading && ' - Loading container data...'}
          </div>
        </div>

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
              {/* Vendor Information */}
              <div className="bg-green-800 p-6 rounded-2xl border border-green-700 text-white">
                <h3 className="text-xl font-semibold mb-4">Vendor Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">Company Name:</p>
                    <p>{selectedContainer.vendor?.companyName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Representative:</p>
                    <p>{selectedContainer.vendor?.representativeName || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Sales Items */}
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

              {/* Document Upload Section */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
                <h3 className="text-2xl font-semibold text-green-900 mb-4">Supporting Documents</h3>
                
                <div className="mb-4">
                  <label className="block text-green-800 font-medium mb-2">Upload Documents</label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="w-full p-2 rounded-lg bg-green-50 text-green-900 border border-green-300"
                  />
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-green-700 font-medium mb-2">Selected Files:</h4>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex justify-between items-center bg-green-100 p-2 rounded">
                          <span className="text-green-800 text-sm">{file.name}</span>
                          <button
                            onClick={() => removeUploadedFile(index)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={uploadDocuments}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded mt-2"
                    >
                      Upload {uploadedFiles.length} File(s)
                    </button>
                  </div>
                )}
                
                {documents.length > 0 && (
                  <div>
                    <h4 className="text-green-700 font-medium mb-2">Uploaded Documents:</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {documents.map((doc) => {
                        const fileName = doc.name || doc.name || 'document';
                        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
                        const isPDF = fileExtension === 'pdf';
                        return (
                          <div key={doc.id} className="flex justify-between items-center bg-green-50 p-3 rounded border border-green-200">
                            <div className="flex-1">
                              <span className="text-green-900 font-medium">{doc.name}</span>
                              <div className="text-sm text-green-600">
                                Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <a 
                                href={doc.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                              >
                                {isImage ? 'View' : isPDF ? 'Open PDF' : 'Download'}
                              </a>
                              <button
                                onClick={() => deleteDocument(doc.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* UAE Expends */}
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

              {/* Grand Total Counting - اصلاح شده */}
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

                  {/* این بخش اصلاح شده - فقط مصارف UAE را نشان می‌دهد */}
                  <div className="flex justify-between items-center pt-2 border-t border-green-200">
                    <span className="text-blue-800 text-sm font-medium">Total Expends (AED):</span>
                    <span className="text-blue-900 font-semibold">{totalExpendUAE.toLocaleString()}</span>
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

        {/* Print Modal */}
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
                        <td><strong>Vendor:</strong></td>
                        <td>{selectedContainer.vendor?.companyName || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Total Buy (USD):</strong></td>
                        <td>${selectedContainer.grandTotal.toLocaleString()}</td>
                        <td><strong>Total Buy (AED):</strong></td>
                        <td>{totalBuyUSA.toLocaleString()} AED</td>
                      </tr>
                      <tr>
                        <td><strong>Exchange Rate:</strong></td>
                        <td>1 USD = {USD_TO_AED_RATE} AED</td>
                        <td></td>
                        <td></td>
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
                    {/* این بخش اصلاح شده */}
                    <tr className="bg-blue-50">
                      <td><strong>Total Expends (AED):</strong></td>
                      <td><strong>{totalExpendUAE.toLocaleString()} AED</strong></td>
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