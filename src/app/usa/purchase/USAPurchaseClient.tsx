'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface ContainerData {
  containerId: string;
  status: string;
  city: string;
  date: string;
}

interface ContentData {
  id?: string;
  number: number;
  item: string;
  model: string;
  lotNumber: string;
  price: number | '';
  recovery: number | '';
  cutting: number | '';
  total: number | '';
}

interface ContainerWithContents extends ContainerData {
  id: string;
  contents: ContentData[];
  rent: number;
  grandTotal: number;
  createdAt: string;
}

interface SessionUser {
  id: string;
  name: string;
  username: string;
}

interface Session {
  user: SessionUser;
}

interface Transfer {
  id: string;
  senderId: string;
  receiverId: string;
  amount: number;
  containerId: string;
  type: string;
  date: string;
  description?: string;
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

function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isLoggedIn');
      router.push('/login');
    }
  };

  return (
    <header className="bg-gradient-to-r from-green-600 to-green-400 shadow fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-center relative">
        <h1 className="text-4xl font-bold text-white text-center">
          Al Raya Used Auto Spare Trading LLC
        </h1>
        
        <div className="absolute right-4 flex items-center space-x-4">
          <div className="relative">
            <Image
              src="/LLC.png"
              alt="LLC Logo"
              width={60}
              height={30}
              className="object-contain filter brightness-0 invert"
            />
          </div>
          <button
            onClick={handleLogout}
            className="bg-white text-green-800 px-3 py-1 rounded text-sm hover:bg-gray-200"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-black text-white py-4 px-6 mt-auto">
      <div className="flex flex-col md:flex-row items-center justify-between max-w-6xl mx-auto">
        <p className="text-center flex-1">All Rights Reserved © 2025 | Qasim Jamal</p>
        <button className="bg-white text-black px-4 py-1 rounded hover:bg-gray-300 mt-2 md:mt-0">
          Contact Us
        </button>
      </div>
    </footer>
  );
}

export default function USAPurchaseClient({ session }: { session: Session }) {
  const [step, setStep] = useState<'container' | 'contents' | 'search'>('container');
  const [containers, setContainers] = useState<ContainerWithContents[]>([]);
  const [currentContainer, setCurrentContainer] = useState<ContainerData>({
    containerId: '',
    status: '',
    city: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [currentContents, setCurrentContents] = useState<ContentData[]>([]);
  const [rent, setRent] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  const [showTransfersModal, setShowTransfersModal] = useState(false);
  const [userTransfers, setUserTransfers] = useState<Transfer[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ContainerWithContents[]>([]);
  const [editingContainer, setEditingContainer] = useState<ContainerWithContents | null>(null);
  const [editMode, setEditMode] = useState(false);

  // اضافه کردن state جدید برای پرینت
  const [printContainer, setPrintContainer] = useState<ContainerWithContents | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const calculateGrandTotal = () => {
    const contentsTotal = currentContents.reduce((sum, item) => {
      const itemTotal = typeof item.total === 'number' ? item.total : 0;
      return sum + itemTotal;
    }, 0);
    
    const rentValue = typeof rent === 'number' ? rent : 0;
    return contentsTotal + rentValue;
  };

  const handleContainerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('contents');
  };

  const addContentItem = () => {
    const newItem: ContentData = {
      number: currentContents.length + 1,
      item: '',
      model: '',
      lotNumber: '',
      price: '',
      recovery: '',
      cutting: '',
      total: ''
    };
    
    setCurrentContents(prevContents => [...prevContents, newItem]);
  };

  const updateContentItem = (index: number, field: keyof ContentData, value: string | number) => {
    setCurrentContents(prevContents => {
      const updatedContents = [...prevContents];
      
      if (['number', 'price', 'recovery', 'cutting', 'total'].includes(field)) {
        const numericValue = value === '' ? '' : Number(value);
        updatedContents[index] = {
          ...updatedContents[index],
          [field]: numericValue
        };
      } else {
        updatedContents[index] = {
          ...updatedContents[index],
          [field]: value
        };
      }
      
      if (['price', 'recovery', 'cutting'].includes(field)) {
        const price = typeof updatedContents[index].price === 'number' ? updatedContents[index].price : 0;
        const recovery = typeof updatedContents[index].recovery === 'number' ? updatedContents[index].recovery : 0;
        const cutting = typeof updatedContents[index].cutting === 'number' ? updatedContents[index].cutting : 0;
        
        updatedContents[index].total = price + recovery + cutting;
      }
      
      return updatedContents;
    });
  };

  const viewMyTransfers = async () => {
    try {
      setTransfersLoading(true);
      const response = await fetch(`/api/users/transfers?userId=${session?.user?.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setUserTransfers(data);
        setShowTransfersModal(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
      alert('Error loading transfers');
    } finally {
      setTransfersLoading(false);
    }
  };

  // تابع جدید برای نمایش مودال پرینت
  const handlePrint = (container: ContainerWithContents) => {
    setPrintContainer(container);
    setShowPrintModal(true);
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
              <title>Print Container ${printContainer?.containerId}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000; }
                .header { text-align: center; margin-bottom: 20px; }
                .container-info { margin-bottom: 20px; }
                .container-info table { width: 100%; border-collapse: collapse; }
                .container-info td { padding: 8px; border: 1px solid #000; }
                .contents-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .contents-table th, .contents-table td { padding: 8px; border: 1px solid #000; text-align: center; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; }
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

    const prepareDataForSave = () => {
    const contentsWithNumbers = currentContents.map(item => ({
      ...item,
      price: typeof item.price === 'number' ? item.price : 0,
      recovery: typeof item.recovery === 'number' ? item.recovery : 0,
      cutting: typeof item.cutting === 'number' ? item.cutting : 0,
      total: typeof item.total === 'number' ? item.total : 0,
      number: typeof item.number === 'number' ? item.number : 0
    }));

    const rentValue = typeof rent === 'number' ? rent : 0;
    const grandTotal = calculateGrandTotal();

    return {
      contents: contentsWithNumbers,
      rent: rentValue,
      grandTotal
    };
  };

  const saveContents = async () => {
    try {
      setLoading(true);
      const { contents, rent: rentValue, grandTotal } = prepareDataForSave();
      
      const response = await fetch('/api/purchase/containers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId: currentContainer.containerId,
          status: currentContainer.status,
          city: currentContainer.city,
          date: currentContainer.date,
          rent: rentValue,
          grandTotal: grandTotal,
          contents: contents
        })
      });
      
      if (response.ok) {
        const newContainer = await response.json();
        setContainers(prev => [newContainer, ...prev]);
        
        setCurrentContents([]);
        setRent('');
        
        alert('Contents saved successfully! Container is ready for more contents.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error saving container: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error saving container:', error);
      alert('Error saving container. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const deleteContainer = async (containerId: string) => {
    try {
      const response = await fetch(`/api/purchase/containers/${containerId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setContainers(prev => prev.filter(container => container.id !== containerId));
        setSearchResults(prev => prev.filter(container => container.id !== containerId));
        alert('Container deleted successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error deleting container: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting container:', error);
      alert('Error deleting container. Check console for details.');
    }
  };

  const deleteContentItem = async (contentId: string, containerId: string) => {
    if (!contentId) {
      alert('Content ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      const response = await fetch(`/api/purchase/contents/${contentId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setContainers(prev => prev.map(container => {
          if (container.id === containerId) {
            return {
              ...container,
              contents: container.contents.filter(content => content.id !== contentId)
            };
          }
          return container;
        }));
        alert('Content item deleted successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error deleting content item: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting content item:', error);
      alert('Error deleting content item. Check console for details.');
    }
  };

  const searchContainers = () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const results = containers.filter(container => 
      container.containerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      container.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      container.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setSearchResults(results);
  };

  const editContainer = (container: ContainerWithContents) => {
    setEditingContainer(container);
    setCurrentContainer({
      containerId: container.containerId,
      status: container.status,
      city: container.city,
      date: container.date
    });
    
    const contentsWithEmptyStrings = container.contents.map(item => ({
      ...item,
      price: item.price === 0 ? '' : item.price,
      recovery: item.recovery === 0 ? '' : item.recovery,
      cutting: item.cutting === 0 ? '' : item.cutting,
      total: item.total === 0 ? '' : item.total
    }));
    
    setCurrentContents(contentsWithEmptyStrings);
    setRent(container.rent === 0 ? '' : container.rent);
    setEditMode(true);
    setStep('contents');
  };

 const updateContainer = async () => {
  if (!editingContainer) return;

  try {
    setLoading(true);
    const { contents, rent: rentValue, grandTotal } = prepareDataForSave();
    
    // اطمینان از اینکه همه مقادیر عددی هستند
    const processedContents = contents.map(item => ({
      ...item,
      price: Number(item.price) || 0,
      recovery: Number(item.recovery) || 0,
      cutting: Number(item.cutting) || 0,
      total: Number(item.total) || 0,
      number: Number(item.number) || 0
    }));

    const response = await fetch(`/api/purchase/containers/${editingContainer.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        containerId: currentContainer.containerId,
        status: currentContainer.status,
        city: currentContainer.city,
        date: currentContainer.date,
        rent: Number(rentValue) || 0,
        grandTotal: Number(grandTotal) || 0,
        contents: processedContents
      })
    });
    
    if (response.ok) {
      const updatedContainer = await response.json();
      
      setContainers(prev => prev.map(container => 
        container.id === editingContainer.id ? updatedContainer : container
      ));
      
      setSearchResults(prev => prev.map(container => 
        container.id === editingContainer.id ? updatedContainer : container
      ));
      
      setEditingContainer(null);
      setEditMode(false);
      setCurrentContents([]);
      setRent('');
      setStep('container');
      
      alert('Container updated successfully!');
    } else {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      alert(`Error updating container: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error updating container:', error);
    alert('Error updating container. Check console for details.');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    const loadContainers = async () => {
      try {
        const response = await fetch('/api/purchase/containers');
        if (response.ok) {
          const data = await response.json();
          setContainers(data);
        } else {
          console.error('Failed to load containers:', response.status);
        }
      } catch (error) {
        console.error('Error loading containers:', error);
      }
    };
    
    loadContainers();
  }, []);

  const renderContentItems = () => {
    return currentContents.map((item, index) => (
      <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-green-700 rounded-lg border border-green-600">
        <div>
          <label className="block text-green-200 mb-2">Number</label>
          <input
            type="number"
            value={item.number}
            onChange={(e) => updateContentItem(index, 'number', e.target.value)}
            className="w-full p-3 rounded-lg bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
          />
        </div>
        <div>
          <label className="block text-green-200 mb-2">Item</label>
          <input
            type="text"
            value={item.item}
            onChange={(e) => updateContentItem(index, 'item', e.target.value)}
            className="w-full p-3 rounded-lg bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
          />
        </div>
        <div>
          <label className="block text-green-200 mb-2">Model</label>
          <input
            type="text"
            value={item.model}
            onChange={(e) => updateContentItem(index, 'model', e.target.value)}
            className="w-full p-3 rounded-lg bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
          />
        </div>
        <div>
          <label className="block text-green-200 mb-2">Lot Number</label>
          <input
            type="text"
            value={item.lotNumber}
            onChange={(e) => updateContentItem(index, 'lotNumber', e.target.value)}
            className="w-full p-3 rounded-lg bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
          />
        </div>
        <div>
          <label className="block text-green-200 mb-2">Price ($)</label>
          <input
            type="number"
            value={item.price}
            onChange={(e) => updateContentItem(index, 'price', e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full p-3 rounded-lg bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
            placeholder="Enter price"
          />
        </div>
        <div>
          <label className="block text-green-200 mb-2">Recovery ($)</label>
          <input
            type="number"
            value={item.recovery}
            onChange={(e) => updateContentItem(index, 'recovery', e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full p-3 rounded-lg bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
            placeholder="Enter recovery"
          />
        </div>
        <div>
          <label className="block text-green-200 mb-2">Cutting ($)</label>
          <input
            type="number"
            value={item.cutting}
            onChange={(e) => updateContentItem(index, 'cutting', e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full p-3 rounded-lg bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
            placeholder="Enter cutting"
          />
        </div>
        <div>
          <label className="block text-green-200 mb-2">Total ($)</label>
          <input
            type="number"
            value={item.total}
            readOnly
            className="w-full p-3 rounded-lg bg-green-700 text-white border border-green-600 cursor-not-allowed"
          />
        </div>
      </div>
    ));
  };
    return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 to-green-600 text-white flex flex-col">
      <Navbar />
      
      <div className="flex-grow pt-24 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-green-800 p-6 rounded-xl shadow-2xl mb-8 border border-green-700">
            <h1 className="text-3xl font-bold text-center mb-2">USA Purchase Page</h1>
            <p className="text-center text-green-200">
              Welcome {session?.user?.name} ({session?.user?.username})
            </p>
            
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => setStep('container')}
                className={`px-6 py-2 rounded-lg transition duration-200 font-semibold shadow-lg ${
                  step === 'container' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'
                }`}
              >
                Add Container
              </button>
              
              <button
                onClick={() => setStep('search')}
                className={`px-6 py-2 rounded-lg transition duration-200 font-semibold shadow-lg ${
                  step === 'search' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'
                }`}
              >
                Search Container
              </button>
              
              <button
                onClick={viewMyTransfers}
                disabled={transfersLoading}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition duration-200 font-semibold shadow-lg"
              >
                {transfersLoading ? 'Loading...' : '💰 View My Transfers'}
              </button>
            </div>
          </div>

          {step === 'container' && (
            <div className="bg-green-800 p-6 rounded-xl shadow-2xl mb-8 border border-green-700">
              <h2 className="text-2xl font-semibold mb-6 text-center">Container Specifications</h2>
              
              <form onSubmit={handleContainerSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-green-200 mb-2">Container ID</label>
                  <input
                    type="text"
                    value={currentContainer.containerId}
                    onChange={(e) => setCurrentContainer(prev => ({ ...prev, containerId: e.target.value }))}
                    className="w-full p-3 rounded-lg bg-green-700 text-white border border-green-600 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-green-200 mb-2">Status</label>
                  <select
                    value={currentContainer.status}
                    onChange={(e) => setCurrentContainer(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full p-3 rounded-lg bg-green-700 text-white border border-green-600 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select Status</option>
                    <option value="pending">Pending</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-green-200 mb-2">City</label>
                  <input
                    type="text"
                    value={currentContainer.city}
                    onChange={(e) => setCurrentContainer(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full p-3 rounded-lg bg-green-700 text-white border border-green-600 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-green-200 mb-2">Date</label>
                  <input
                    type="date"
                    value={currentContainer.date}
                    onChange={(e) => setCurrentContainer(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-3 rounded-lg bg-green-700 text-white border border-green-600 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg transition duration-200 font-semibold shadow-lg"
                  >
                    Next: Add Contents
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 'contents' && (
            <div className="bg-green-800 p-6 rounded-xl shadow-2xl mb-8 border border-green-700">
              <h2 className="text-2xl font-semibold mb-6 text-center">
                {editMode ? 'Edit' : 'Contents of'} Container {currentContainer.containerId}
              </h2>
              
              <div className="bg-green-700 p-4 rounded-lg mb-6 border border-green-600">
                <h3 className="text-lg font-semibold text-center mb-2">Container Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-green-200">Status:</span> {currentContainer.status}</p>
                  <p><span className="text-green-200">City:</span> {currentContainer.city}</p>
                  <p><span className="text-green-200">Date:</span> {currentContainer.date}</p>
                  <p><span className="text-green-200">Container ID:</span> {currentContainer.containerId}</p>
                </div>
              </div>
              
              <div className="bg-green-700 p-4 rounded-lg mb-6 border border-green-600">
                <h3 className="text-lg font-semibold text-center mb-2">Grand Total</h3>
                <p className="text-2xl font-bold text-center text-green-200">
                  ${calculateGrandTotal().toLocaleString()}
                </p>
                <p className="text-sm text-center text-green-300">
                  (Contents: ${currentContents.reduce((sum, item) => {
                    const itemTotal = typeof item.total === 'number' ? item.total : 0;
                    return sum + itemTotal;
                  }, 0).toLocaleString()} 
                  + Rent: ${typeof rent === 'number' ? rent.toLocaleString() : '0'})
                </p>
              </div>
              
              <div className="mb-6">
                <button
                  onClick={addContentItem}
                  className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg transition duration-200 font-semibold shadow-lg mb-4"
                >
                  + Add Item ({currentContents.length} items)
                </button>
              </div>
              
              {renderContentItems()}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div>
                  <label className="block text-green-200 mb-2">Rent ($)</label>
                  <input
                    type="number"
                    value={rent}
                    onChange={(e) => setRent(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-3 rounded-lg bg-green-700 text-white border border-green-600 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500"
                    placeholder="Enter rent"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={editMode ? updateContainer : saveContents}
                    disabled={loading || currentContents.length === 0}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white py-3 rounded-lg transition duration-200 font-semibold shadow-lg"
                  >
                    {loading ? 'Saving...' : editMode ? 'Update Container' : 'Save Contents'}
                  </button>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setCurrentContainer({
                        containerId: '',
                        status: '',
                        city: '',
                        date: new Date().toISOString().split('T')[0]
                      });
                      setCurrentContents([]);
                      setRent('');
                      setEditMode(false);
                      setEditingContainer(null);
                      setStep('container');
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg transition duration-200 font-semibold shadow-lg"
                  >
                    {editMode ? 'Cancel Edit' : 'Finish & New Container'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'search' && (
            <div className="bg-green-800 p-6 rounded-xl shadow-2xl mb-8 border border-green-700">
              <h2 className="text-2xl font-semibold mb-6 text-center">Search Containers</h2>
              
              <div className="flex gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Search by Container ID, City, or Status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-grow p-3 rounded-lg bg-green-700 text-white border border-green-600 focus:outline-none focus:border-green-400"
                />
                <button
                  onClick={searchContainers}
                  className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg transition duration-200 font-semibold"
                >
                  Search
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="bg-green-700 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-4">Search Results ({searchResults.length})</h3>
                  <div className="space-y-4">
                    {searchResults.map((container) => (
                      <div key={container.id} className="bg-green-600 p-4 rounded-lg border border-green-500">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xl font-semibold">Container: {container.containerId}</h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => editContainer(container)}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition duration-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handlePrint(container)}
                              className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-sm transition duration-200"
                            >
                              Print
                            </button>
                            <button
                              onClick={() => deleteContainer(container.id)}
                              className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm transition duration-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <p><span className="text-green-200">Status:</span> {container.status}</p>
                          <p><span className="text-green-200">City:</span> {container.city}</p>
                          <p><span className="text-green-200">Date:</span> {container.date}</p>
                          <p><span className="text-green-200">Items:</span> {container.contents.length}</p>
                        </div>
                        <p className="mt-2 text-green-200 font-semibold">
                          Grand Total: ${container.grandTotal.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchTerm && searchResults.length === 0 && (
                <div className="text-center py-8 text-green-300">
                  No containers found matching your search.
                </div>
              )}
            </div>
          )}

          {containers.length > 0 && step !== 'search' && (
            <div className="bg-green-800 p-6 rounded-xl shadow-2xl border border-green-700 mt-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-center">Saved Containers</h2>
                <button
                  onClick={() => {
                    setCurrentContainer({
                      containerId: '',
                      status: '',
                      city: '',
                      date: new Date().toISOString().split('T')[0]
                    });
                    setStep('container');
                  }}
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded transition duration-200"
                >
                  + Add New Container
                </button>
              </div>
              
              {containers.map((container) => (
                <div key={container.id} className="mb-6 p-4 bg-green-700 rounded-lg border border-green-600">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Container: {container.containerId}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editContainer(container)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition duration-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handlePrint(container)}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-sm transition duration-200"
                      >
                        Print
                      </button>
                      <button
                        onClick={() => deleteContainer(container.id)}
                        className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm transition duration-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <p><span className="text-green-200">Status:</span> {container.status}</p>
                    <p><span className="text-green-200">City:</span> {container.city}</p>
                    <p><span className="text-green-200">Date:</span> {container.date}</p>
                    <p><span className="text-green-200">Rent:</span> ${container.rent}</p>
                  </div>
                  
                  <div className="bg-green-600 p-3 rounded-lg mb-4">
                    <p className="text-lg font-semibold text-center">
                      Grand Total: ${container.grandTotal.toLocaleString()}
                    </p>
                  </div>

                  {container.contents.length > 0 && (
                    <>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-lg font-semibold">Contents</h4>
                        <span className="text-green-200">{container.contents.length} items</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full bg-green-600 rounded-lg">
                          <thead>
                            <tr className="bg-green-700">
                              <th className="p-2">Number</th>
                              <th className="p-2">Item</th>
                              <th className="p-2">Model</th>
                              <th className="p-2">Lot Number</th>
                              <th className="p-2">Price ($)</th>
                              <th className="p-2">Recovery ($)</th>
                              <th className="p-2">Cutting ($)</th>
                              <th className="p-2">Total ($)</th>
                              <th className="p-2">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {container.contents.map((item, idx) => (
                              <tr key={item.id || idx} className="border-b border-green-500">
                                <td className="p-2 text-center">{item.number}</td>
                                <td className="p-2 text-center">{item.item}</td>
                                <td className="p-2 text-center">{item.model}</td>
                                <td className="p-2 text-center">{item.lotNumber}</td>
                                <td className="p-2 text-center">${item.price}</td>
                                <td className="p-2 text-center">${item.recovery}</td>
                                <td className="p-2 text-center">${item.cutting}</td>
                                <td className="p-2 text-center">${item.total}</td>
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => deleteContentItem(item.id!, container.id)}
                                    className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs transition duration-200"
                                    title="Delete this item"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {showTransfersModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-semibold text-green-900">
                    My Money Transfers
                  </h3>
                  <button
                    onClick={() => setShowTransfersModal(false)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition duration-200"
                  >
                    Close
                  </button>
                </div>

                {userTransfers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full bg-green-50 rounded-lg">
                      <thead>
                        <tr className="bg-green-700">
                          <th className="p-3 text-white text-left">Date</th>
                          <th className="p-3 text-white text-left">Sender</th>
                          <th className="p-3 text-white text-left">Container ID</th>
                          <th className="p-3 text-white text-left">Amount (USD)</th>
                          <th className="p-3 text-white text-left">Type</th>
                          <th className="p-3 text-white text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userTransfers.map((transfer) => (
                          <tr key={transfer.id} className="border-b border-green-600">
                            <td className="p-3 text-green-900">{transfer.date}</td>
                            <td className="p-3 text-green-900">{transfer.sender.name}</td>
                            <td className="p-3 text-green-900 font-mono">{transfer.container.containerId}</td>
                            <td className="p-3 text-green-600 font-semibold">${transfer.amount.toLocaleString()}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                transfer.type === 'Bank' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {transfer.type}
                              </span>
                            </td>
                            <td className="p-3 text-green-900 text-sm">{transfer.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-green-700">
                    No transfers found for your account.
                  </div>
                )}

                {userTransfers.length > 0 && (
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-green-800 font-semibold">Total Received:</span>
                      <span className="text-green-900 font-bold">
                        ${userTransfers.reduce((sum, transfer) => sum + transfer.amount, 0).toLocaleString()}
                      </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showPrintModal && printContainer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-green-900">
                  Print Container {printContainer.containerId}
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
                  <h2>Container Report: {printContainer.containerId}</h2>
                </div>

                <div className="container-info">
                  <table>
                    <tbody>
                      <tr>
                        <td><strong>Container ID:</strong></td>
                        <td>{printContainer.containerId}</td>
                        <td><strong>Status:</strong></td>
                        <td>{printContainer.status}</td>
                      </tr>
                      <tr>
                        <td><strong>City:</strong></td>
                        <td>{printContainer.city}</td>
                        <td><strong>Date:</strong></td>
                        <td>{printContainer.date}</td>
                      </tr>
                      <tr>
                        <td><strong>Rent:</strong></td>
                        <td>${printContainer.rent}</td>
                        <td><strong>Grand Total:</strong></td>
                        <td>${printContainer.grandTotal}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <table className="contents-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Item</th>
                      <th>Model</th>
                      <th>Lot Number</th>
                      <th>Price ($)</th>
                      <th>Recovery ($)</th>
                      <th>Cutting ($)</th>
                      <th>Total ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printContainer.contents.map((item, index) => (
                      <tr key={index}>
                        <td>{item.number}</td>
                        <td>{item.item}</td>
                        <td>{item.model}</td>
                        <td>{item.lotNumber}</td>
                        <td>${item.price}</td>
                        <td>${item.recovery}</td>
                        <td>${item.cutting}</td>
                        <td>${item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="footer">
                  <p>Generated on: {new Date().toLocaleDateString()}</p>
                  <p>© 2025 Al Raya Used Auto Spare Trading LLC. All rights reserved.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    <Footer />
  </div>
  );
}