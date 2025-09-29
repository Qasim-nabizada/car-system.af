'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Vendor {
  id: string;
  companyName: string;
  companyAddress: string;
  representativeName: string;
  email: string;
  phone: string;
  country: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ContainerData {
  containerId: string;
  status: string;
  city: string;
  date: string;
  vendorId: string;
}

interface ContentData {
  id?: string;
  number: number;
  item: string;
  model: string;
  year: string;
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
  updatedAt?: string;
  vendor?: Vendor;
  userId?: string;
  documents?: Document[];
}

interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  containerId: string;
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
  vendor?: {
    id: string;
    companyName: string;
    representativeName: string;
  };
  documents?: Array<{
    id: string;
    filename: string;
    originalName: string;
    path: string;
    type: string;
    createdAt: string;
  }>;
  createdAt: string;
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
  const [step, setStep] = useState<'vendors' | 'container' | 'contents' | 'containers'>('vendors');

  const [myTransfers, setMyTransfers] = useState<any[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [containers, setContainers] = useState<ContainerWithContents[]>([]);
  const [currentContainer, setCurrentContainer] = useState<ContainerData>({
    containerId: '',
    status: 'pending',
    city: '',
    date: new Date().toISOString().split('T')[0],
    vendorId: ''
  });
  
  const [currentContents, setCurrentContents] = useState<ContentData[]>([]);
  const [rent, setRent] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);

  const [showTransfersModal, setShowTransfersModal] = useState(false);
  const [userTransfers, setUserTransfers] = useState<Transfer[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ContainerWithContents[]>([]);
  const [editingContainer, setEditingContainer] = useState<ContainerWithContents | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<ContainerWithContents | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [containerStats, setContainerStats] = useState({
    total: 0,
    pending: 0,
    shipped: 0,
    completed: 0
  });
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showContainerStats, setShowContainerStats] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedContainerForDocs, setSelectedContainerForDocs] = useState<ContainerWithContents | null>(null);

  // Vendor form state
  const [vendorForm, setVendorForm] = useState({
    companyName: '',
    companyAddress: '',
    representativeName: '',
    email: '',
    phone: '',
    country: 'USA'
  });

  // State for document upload
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);

  useEffect(() => {
    loadVendors();
    loadContainers();
    loadMyTransfers();
  }, []);

  useEffect(() => {
    if (step === 'containers') {
      searchContainers();
    }
  }, [step, containers]);

  useEffect(() => {
    if (containers.length > 0) {
      const stats = {
        total: containers.length,
        pending: containers.filter(c => c.status === 'pending').length,
        shipped: containers.filter(c => c.status === 'shipped').length,
        completed: containers.filter(c => c.status === 'completed').length
      };
      setContainerStats(stats);
    }
  }, [containers]);

  const loadMyTransfers = async () => {
    try {
      setLoadingTransfers(true);
      const response = await fetch('/api/transfers/my-transfers');
      
      if (response.ok) {
        const data = await response.json();
        setMyTransfers(data);
      } else {
        console.error('Failed to load transfers:', response.status);
      }
    } catch (error) {
      console.error('Error loading transfers:', error);
    } finally {
      setLoadingTransfers(false);
    }
  };

  const handleApiError = async (response: Response, defaultMessage: string) => {
    try {
      const errorData = await response.json();
      return errorData.error || errorData.details || errorData.message || defaultMessage;
    } catch (e) {
      return `${defaultMessage}: ${response.status} ${response.statusText}`;
    }
  };

  const loadVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const vendorsData = await response.json();
        setVendors(vendorsData);
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

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

  const loadContainerDocuments = async (containerId: string) => {
    try {
      const response = await fetch(`/api/documents?containerId=${containerId}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vendorForm)
      });
      
      if (response.ok) {
        const newVendor = await response.json();
        setVendors(prev => [...prev, newVendor]);
        setVendorForm({
          companyName: '',
          companyAddress: '',
          representativeName: '',
          email: '',
          phone: '',
          country: 'USA'
        });
        setShowVendorForm(false);
        alert('Vendor created successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error creating vendor: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error creating vendor:', error);
      alert('Error creating vendor. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

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
    
    // Validate vendor selection
    if (!currentContainer.vendorId) {
      alert('Please select a vendor');
      return;
    }
    
    // Validate container ID
    if (!currentContainer.containerId.trim()) {
      alert('Please enter a container ID');
      return;
    }
    
    setStep('contents');
  };

  const addContentItem = () => {
    const newItem: ContentData = {
      number: currentContents.length + 1,
      item: '',
      model: '',
      year: '',
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
        const numericValue = value === '' ? 0 : Number(value);
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

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setUploadedDocuments(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
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
          vendorId: currentContainer.vendorId,
          rent: rentValue,
          grandTotal: grandTotal,
          contents: contents
        })
      });
      
      if (response.ok) {
        const newContainer = await response.json();
        setContainers(prev => [newContainer, ...prev]);
        
        // Upload documents if any
        if (uploadedDocuments.length > 0) {
          await uploadDocuments(newContainer.id);
        }
        
        setCurrentContents([]);
        setRent('');
        setUploadedDocuments([]);
        setCurrentContainer({
          containerId: '',
          status: 'pending',
          city: '',
          date: new Date().toISOString().split('T')[0],
          vendorId: ''
        });
        setStep('vendors');
        
        alert('Container saved successfully!');
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

  const uploadDocuments = async (containerId: string) => {
  if (uploadedDocuments.length === 0) return;

  try {
    const formData = new FormData();
    
    // اضافه کردن تمام فایل‌ها
    uploadedDocuments.forEach(file => {
      formData.append('files', file);
    });
    
    formData.append('containerId', containerId);
    formData.append('type', 'purchase');

    console.log('📤 Uploading documents for container:', containerId);
    console.log('📁 Files to upload:', uploadedDocuments.length);

    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const uploadedDocs = await response.json();
      console.log('✅ Documents uploaded successfully:', uploadedDocs);
      
      // بارگذاری مجدد اسناد برای اطمینان
      if (selectedContainerForDocs && selectedContainerForDocs.id === containerId) {
        await loadContainerDocuments(containerId);
      }
      
      setUploadedDocuments([]);
      alert(`✅ ${uploadedDocuments.length} document(s) uploaded successfully!`);
      
    } else {
      const errorText = await response.text();
      console.error('❌ Upload error:', response.status, errorText);
      alert(`❌ Upload failed: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Error uploading documents:', error);
    alert('❌ Error uploading documents. Check console for details.');
  }
};
  const searchContainers = () => {
    if (!searchTerm.trim()) {
      setSearchResults(containers);
      return;
    }

    const results = containers.filter(container => 
      container.containerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      container.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      container.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (container.vendor?.companyName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    setSearchResults(results);
  };

  const editContainer = (container: ContainerWithContents) => {
    setEditingContainer(container);
    setCurrentContainer({
      containerId: container.containerId,
      status: container.status,
      city: container.city,
      date: container.date,
      vendorId: container.vendorId
    });
    

    
// Ensure container exists and has contents
const contentsWithEmptyStrings = container.contents?.map(item => ({
  ...item,
  price: item.price === 0 ? '' : item.price,
  recovery: item.recovery === 0 ? '' : item.recovery,
})) || [];


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
      
      const processedContents = contents.map(item => ({
        ...item,
        price: Number(item.price) || 0,
        recovery: Number(item.recovery) || 0,
        cutting: Number(item.cutting) || 0,
        total: Number(item.total) || 0,
        number: Number(item.number) || 0
      }));

        // ساختار داده‌ای ساده‌تر برای ارسال به سرور
      const requestData = {
        containerId: currentContainer.containerId,
        status: currentContainer.status,
        city: currentContainer.city,
        date: currentContainer.date,
        vendorId: currentContainer.vendorId,
        rent: Number(rentValue) || 0,
        grandTotal: Number(grandTotal) || 0,
        contents: processedContents
      };

      console.log('Sending update request:', requestData);

      const response = await fetch(`/api/purchase/containers/${editingContainer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
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
        setStep('containers');
        
        alert('Container updated successfully!');
      } else {
        const errorMessage = await handleApiError(response, 'Failed to update container');
        
        // اگر خطای 404 باشد، ممکن است کانتینر وجود نداشته باشد
        if (response.status === 404) {
          alert(`Container not found. It may have been deleted. ${errorMessage}`);
          // بارگذاری مجدد لیست کانتینرها
          loadContainers();
        } else {
          alert(`Error updating container: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error('Error updating container:', error);
      alert('Error updating container. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

const deleteContainer = async (containerId: string) => {
  if (!confirm('Are you sure you want to delete this container? This action cannot be undone.')) {
    return;
  }

  try {
    // ابتدا با DELETE امتحان کنید
    let response = await fetch(`/api/purchase/containers/${containerId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // اگر DELETE کار نکرد، با POST امتحان کنید
    if (!response.ok && response.status === 405) {
      response = await fetch(`/api/purchase/containers/${containerId}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
    
    if (response.ok) {
      setContainers(prev => prev.filter(container => container.id !== containerId));
      setSearchResults(prev => prev.filter(container => container.id !== containerId));
      alert('Container deleted successfully!');
    } else {
      const errorMessage = await handleApiError(response, 'Failed to delete container');
      alert(`Error deleting container: ${errorMessage}`);
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

    if (!confirm('Are you sure you want to delete this content item?')) {
      return;
    }

    try {
      const response = await fetch(`/api/purchase/contents/${contentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ containerId })
      });
      
      if (response.ok) {
        // به‌روزرسانی وضعیت محلی
        setContainers(prev => prev.map(container => {
          if (container.id === containerId) {
            return {
              ...container,
              contents: container.contents.filter(content => content.id !== contentId)
            };
          }
          return container;
        }));
        
        // اگر در حال ویرایش هستیم، لیست کنونی را نیز به‌روزرسانی کنیم
        if (editingContainer && editingContainer.id === containerId) {
          setCurrentContents(prev => prev.filter(content => content.id !== contentId));
        }
        
        alert('Content item deleted successfully!');
      } else {
        const errorMessage = await handleApiError(response, 'Failed to delete content item');
        
        // اگر خطای 404 باشد، آیتم از قبل حذف شده است
        if (response.status === 404) {
          alert('Content item not found. It may have already been deleted.');
          // بارگذاری مجدد لیست کانتینرها
          loadContainers();
        } else {
          alert(`Error deleting content item: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error('Error deleting content item:', error);
      alert('Error deleting content item. Check console for details.');
    }
  };

  const markContainerComplete = async (containerId: string) => {
    try {
      const response = await fetch(`/api/purchase/containers/${containerId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' })
      });
      
      if (response.ok) {
        alert('Container marked as complete and moved to sales!');
        // بارگذاری مجدد لیست کانتینرها
        loadContainers();
      } else {
        // اگر PATCH کار نکرد، با PUT امتحان کنید
        if (response.status === 405) {
          await markContainerCompleteWithPut(containerId);
        } else {
          const errorMessage = await handleApiError(response, 'Failed to update container status');
          alert(`Error: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error('Error updating container:', error);
      alert('Error updating container. Check console for details.');
    }
  };

  // تابع جایگزین برای تغییر وضعیت با PUT
  const markContainerCompleteWithPut = async (containerId: string) => {
    try {
      const response = await fetch(`/api/purchase/containers/${containerId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' })
      });
      
      if (response.ok) {
        alert('Container marked as complete and moved to sales!');
        loadContainers();
      } else {
        const errorMessage = await handleApiError(response, 'Failed to update container status');
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error updating container status with PUT:', error);
      alert('Error updating container. Check console for details.');
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        alert('Document deleted successfully!');
      } else {
        const errorMessage = await handleApiError(response, 'Failed to delete document');
        
        // اگر خطای 404 باشد، سند از قبل حذف شده است
        if (response.status === 404) {
          alert('Document not found. It may have already been deleted.');
          // بارگذاری مجدد اسناد
          if (selectedContainerForDocs) {
            loadContainerDocuments(selectedContainerForDocs.id);
          }
        } else {
          alert(`Error deleting document: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document. Check console for details.');
    }
  };

  // تابع جایگزین برای حذف سند با POST
  const deleteDocumentWithPost = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        alert('Document deleted successfully!');
      } else {
        const errorMessage = await handleApiError(response, 'Failed to delete document');
        alert(`Error deleting document: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error deleting document with POST:', error);
      alert('Error deleting document. Check console for details.');
    }
  };

 const viewMyTransfers = async () => {
  try {
    setTransfersLoading(true);
    
    console.log('🔄 Fetching transfers for user:', session?.user?.id);
    
    const response = await fetch('/api/transfers/my-transfers');
    
    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Transfers data:', data);
      setUserTransfers(data);
      setShowTransfersModal(true);
    } else {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      alert(`Error: ${response.status} - Failed to load transfers`);
    }
  } catch (error) {
    console.error('❌ Error fetching transfers:', error);
    alert('Error loading transfers. Check console for details.');
  } finally {
    setTransfersLoading(false);
  }
};
  const printTransfer = (transfer: Transfer) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transfer Receipt - ${transfer.container.containerId}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-item { margin-bottom: 10px; }
          .label { font-weight: bold; color: #333; }
          .documents { margin-top: 30px; }
          .document-item { margin-bottom: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Al Raya Used Auto Spare Trading LLC</h1>
          <h2>Money Transfer Receipt</h2>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="info-grid">
          <div>
            <div class="info-item"><span class="label">Transfer Date:</span> ${transfer.date}</div>
            <div class="info-item"><span class="label">Container ID:</span> ${transfer.container.containerId}</div>
            <div class="info-item"><span class="label">Vendor:</span> ${transfer.vendor?.companyName || 'N/A'}</div>
          </div>
          <div>
            <div class="info-item"><span class="label">Amount:</span> $${transfer.amount.toLocaleString()}</div>
            <div class="info-item"><span class="label">Transfer Type:</span> ${transfer.type}</div>
            <div class="info-item"><span class="label">Description:</span> ${transfer.description || 'N/A'}</div>
          </div>
        </div>
        
        ${transfer.documents && transfer.documents.length > 0 ? `
          <div class="documents">
            <h3>Attached Documents (${transfer.documents.length})</h3>
            ${transfer.documents.map((doc: any) => `
              <div class="document-item">
                <strong>${doc.originalName}</strong><br>
                Uploaded: ${new Date(doc.createdAt).toLocaleDateString()}
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="no-print" style="margin-top: 40px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const viewTransferDetails = (transfer: Transfer) => {
    const detailsWindow = window.open('', '_blank');
    if (!detailsWindow) return;

    const detailsContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transfer Details - ${transfer.container.containerId}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; }
          .details { max-width: 600px; margin: 0 auto; }
          .detail-item { margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 5px; }
          .label { font-weight: bold; color: #333; display: inline-block; width: 150px; }
          .documents { margin-top: 30px; }
          .document-link { display: block; margin: 10px 0; padding: 10px; background: #e9ecef; border-radius: 5px; text-decoration: none; color: #007bff; }
          .document-link:hover { background: #dee2e6; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Transfer Details</h1>
        </div>
        
        <div class="details">
          <div class="detail-item">
            <span class="label">Transfer ID:</span> ${transfer.id}
          </div>
          <div class="detail-item">
            <span class="label">Date:</span> ${transfer.date}
          </div>
          <div class="detail-item">
            <span class="label">Vendor:</span> ${transfer.vendor?.companyName || 'N/A'}
          </div>
          <div class="detail-item">
            <span class="label">Container:</span> ${transfer.container.containerId}
          </div>
          <div class="detail-item">
            <span class="label">Amount:</span> $${transfer.amount.toLocaleString()}
          </div>
          <div class="detail-item">
            <span class="label">Type:</span> ${transfer.type}
          </div>
          <div class="detail-item">
            <span class="label">Description:</span> ${transfer.description || 'No description'}
          </div>
          <div class="detail-item">
            <span class="label">Created:</span> ${new Date(transfer.createdAt).toLocaleString()}
          </div>
        </div>
        
        ${transfer.documents && transfer.documents.length > 0 ? `
          <div class="documents">
            <h2>Attached Documents (${transfer.documents.length})</h2>
            ${transfer.documents.map((doc: any) => `
              <a href="${doc.path}" target="_blank" class="document-link">
                📎 ${doc.originalName} (${new Date(doc.createdAt).toLocaleDateString()})
              </a>
            `).join('')}
          </div>
        ` : '<p>No documents attached to this transfer.</p>'}
      </body>
      </html>
    `;

    detailsWindow.document.write(detailsContent);
    detailsWindow.document.close();
  };

  const printContainer = (container: ContainerWithContents) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Container ${container.containerId} - Print</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .container-info { margin-bottom: 20px; }
          .container-info table { width: 100%; border-collapse: collapse; }
          .container-info td { padding: 8px; border: 1px solid #ddd; }
          .container-info .label { font-weight: bold; background-color: #f5f5f5; }
          .contents-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .contents-table th, .contents-table td { padding: 8px; border: 1px solid #ddd; text-align: left; }
          .contents-table th { background-color: #f5f5f5; }
          .summary { margin-top: 20px; text-align: right; font-weight: bold; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Al Raya Used Auto Spare Trading LLC</h1>
          <h2>Container Details</h2>
        </div>
        
        <div class="container-info">
          <table>
            <tr>
              <td class="label" width="20%">Container ID:</td>
              <td width="30%">${container.containerId}</td>
              <td class="label" width="20%">Vendor:</td>
              <td width="30%">${container.vendor?.companyName || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Status:</td>
              <td>${container.status}</td>
              <td class="label">City:</td>
              <td>${container.city}</td>
            </tr>
            <tr>
              <td class="label">Date:</td>
              <td>${container.date}</td>
              <td class="label">Created:</td>
              <td>${new Date(container.createdAt).toLocaleDateString()}</td>
            </tr>
          </table>
        </div>
        
        <h3>Container Contents</h3>
        <table class="contents-table">
          <thead>
            <tr>
              <th>SN</th>
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
            ${container.contents.map(item => `
              <tr>
                <td>${item.number}</td>
                <td>${item.lotNumber}</td>
                <td>${item.item}</td>
                <td>${item.model}</td>
                <td>${item.year}</td>
                <td>${typeof item.price === 'number' ? item.price.toLocaleString() : '0'}</td>
                <td>${typeof item.recovery === 'number' ? item.recovery.toLocaleString() : '0'}</td>
                <td>${typeof item.cutting === 'number' ? item.cutting.toLocaleString() : '0'}</td>
                <td>${typeof item.total === 'number' ? item.total.toLocaleString() : '0'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <p>Rent: $${container.rent.toLocaleString()}</p>
          <p>Contents Total: $${container.contents.reduce((sum, item) => sum + (item.total || 0), 0).toLocaleString()}</p>
          <p>Grand Total: $${container.grandTotal.toLocaleString()}</p>
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()">Print</button>
          <button onclick="window.close()">Close</button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const filteredVendors = vendors.filter(vendor => 
    vendor.companyName.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
    vendor.representativeName.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
    vendor.email.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
    vendor.phone.includes(vendorSearchTerm)
  );

  const filterByVendor = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    setSelectedVendor(vendor || null);
    
    if (vendorId === 'all') {
      setSearchResults(containers);
    } else {
      const filtered = containers.filter(container => container.vendorId === vendorId);
      setSearchResults(filtered);
    }
  };

  const exportToExcel = () => {
    const data = containers.map(container => ({
      'Container ID': container.containerId,
      'Vendor': container.vendor?.companyName || 'N/A',
      'Status': container.status,
      'City': container.city,
      'Date': container.date,
      'Items Count': container.contents.length,
      'Rent': container.rent,
      'Grand Total': container.grandTotal
    }));

    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'containers_export.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const backupData = async () => {
    try {
      const backup = {
        vendors,
        containers,
        timestamp: new Date().toISOString()
      };

      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      alert('Backup created successfully!');
    } catch (error) {
      console.error('Backup error:', error);
      alert('Error creating backup. Check console for details.');
    }
  };

  const viewContainerDocuments = async (container: ContainerWithContents) => {
    setSelectedContainerForDocs(container);
    await loadContainerDocuments(container.id);
    setShowDocumentsModal(true);
  };

  const testApiEndpoints = async () => {
    console.log('Testing API endpoints...');
    
    try {
      // Test vendors endpoint
      const vendorsResponse = await fetch('/api/vendors');
      console.log('Vendors endpoint:', vendorsResponse.status, vendorsResponse.statusText);
      
      // Test containers endpoint
      const containersResponse = await fetch('/api/purchase/containers');
      console.log('Containers endpoint:', containersResponse.status, containersResponse.statusText);
      
      // Test documents endpoint
      const documentsResponse = await fetch('/api/documents');
      console.log('Documents endpoint:', documentsResponse.status, documentsResponse.statusText);
      
      // Test specific endpoints
      if (containers.length > 0) {
        const testContainerId = containers[0].id;
        const testResponse = await fetch(`/api/purchase/containers/${testContainerId}`);
        console.log('Specific container endpoint:', testResponse.status, testResponse.statusText);
      }
      
      alert('API endpoints tested. Check console for results.');
    } catch (error) {
      console.error('Error testing API endpoints:', error);
      alert('Error testing API endpoints. Check console for details.');
    }
  };

 const renderContentItems = () => {
  return currentContents.map((item, index) => (
    <div key={index} className="grid grid-cols-1 md:grid-cols-10 gap-2 mb-4 p-4 bg-green-700 rounded-lg border border-green-600 relative">
      {/* دکمه حذف */}
      <button
        onClick={() => {
          if (editMode && item.id) {
            deleteContentItem(item.id, editingContainer!.id);
          } else {
            setCurrentContents(prev => prev.filter((_, i) => i !== index));
          }
        }}
        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs"
        title="Delete item"
      >
        ×
      </button>
      
      {/* SN */}
      <div className="min-w-[60px]">
        <label className="block text-green-200 mb-1 ">SN</label>
        <input
          type="number"
          value={item.number}
          onChange={(e) => updateContentItem(index, 'number', e.target.value)}
          className="w-full p-1 text-sm rounded bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
        />
      </div>
      
      {/* Lot # */}
      <div className="min-w-[80px]">
        <label className="block text-green-200 mb-1 ">Lot #</label>
        <input
          type="text"
          value={item.lotNumber}
          onChange={(e) => updateContentItem(index, 'lotNumber', e.target.value)}
          className="w-full p-1 text-sm rounded bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
        />
      </div>
      
      {/* Make */}
      <div className="min-w-[100px]">
        <label className="block text-green-200 mb-1 text-xs">Make</label>
        <input
          type="text"
          value={item.item}
          onChange={(e) => updateContentItem(index, 'item', e.target.value)}
          className="w-full p-1 text-sm rounded bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
        />
      </div>
      
      {/* Model */}
      <div className="min-w-[100px]">
        <label className="block text-green-200 mb-1 text-xs">Model</label>
        <input
          type="text"
          value={item.model}
          onChange={(e) => updateContentItem(index, 'model', e.target.value)}
          className="w-full p-1 text-sm rounded bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
        />
      </div>
      
      {/* Year */}
      <div className="min-w-[70px]">
        <label className="block text-green-200 mb-1 text-xs">Year</label>
        <input
          type="text"
          value={item.year}
          onChange={(e) => updateContentItem(index, 'year', e.target.value)}
          className="w-full p-1 text-sm rounded bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
          placeholder="Year"
        />
      </div>
      
      {/* Price */}
      <div className="min-w-[100px]">
        <label className="block text-green-200 mb-1 text-xs">Price ($)</label>
        <input
          type="number"
          value={item.price}
          onChange={(e) => updateContentItem(index, 'price', e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full p-1 text-sm rounded bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
          placeholder="Price"
        />
      </div>
      
      {/* Recovery */}
      <div className="min-w-[100px]">
        <label className="block text-green-200 mb-1 text-xs">Recovery ($)</label>
        <input
          type="number"
          value={item.recovery}
          onChange={(e) => updateContentItem(index, 'recovery', e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full p-1 text-sm rounded bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
          placeholder="Recovery"
        />
      </div>
      
      {/* Cutting */}
      <div className="min-w-[100px]">
        <label className="block text-green-200 mb-1 text-xs">Cutting ($)</label>
        <input
          type="number"
          value={item.cutting}
          onChange={(e) => updateContentItem(index, 'cutting', e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full p-1 text-sm rounded bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
          placeholder="Cutting"
        />
      </div>
      
      {/* Total */}
      <div className="min-w-[100px]">
        <label className="block text-green-200 mb-1 text-xs">Total ($)</label>
        <input
          type="number"
          value={item.total}
          readOnly
          className="w-full p-1 text-sm rounded bg-green-700 text-white border border-green-600 cursor-not-allowed"
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
            <h1 className="text-3xl font-bold text-center mb-2">USA Purchase Management</h1>
            <p className="text-center text-green-200">
              Welcome {session?.user?.name} ({session?.user?.username})
            </p>
            
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => setStep('vendors')}
                className={`px-6 py-2 rounded-lg transition duration-200 font-semibold shadow-lg ${
                  step === 'vendors' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'
                }`}
              >
                Vendors
              </button>
              
              <button
                onClick={() => setStep('container')}
                className={`px-6 py-2 rounded-lg transition duration-200 font-semibold shadow-lg ${
                  step === 'container' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'
                }`}
              >
                Add Container
              </button>
              
              <button
                onClick={() => setStep('containers')}
                className={`px-6 py-2 rounded-lg transition duration-200 font-semibold shadow-lg ${
                  step === 'containers' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'
                }`}
              >
                Containers
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

          {/* Vendors Tab */}
          {step === 'vendors' && (
            <div className="bg-green-800 p-6 rounded-xl shadow-2xl mb-8 border border-green-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-center">Vendor Management</h2>
                <button
                  onClick={() => setShowVendorForm(true)}
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition duration-200 font-semibold"
                >
                  + Add Vendor
                </button>
              </div>

              {/* Vendor Search */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search vendors by name, email, or phone..."
                  value={vendorSearchTerm}
                  onChange={(e) => setVendorSearchTerm(e.target.value)}
                  className="w-full p-3 rounded-lg bg-green-700 text-white border border-green-600 focus:outline-none focus:border-green-400"
                />
              </div>

              {showVendorForm && (
                <div className="bg-green-700 p-6 rounded-lg mb-6 border border-green-600">
                  <h3 className="text-xl font-semibold text-center mb-4">Create New Vendor Profile</h3>
                  <form onSubmit={handleVendorSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-green-200 mb-2">Company Name *</label>
                      <input
                        type="text"
                        value={vendorForm.companyName}
                        onChange={(e) => setVendorForm(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full p-3 rounded-lg bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-green-200 mb-2">Representative Name *</label>
                      <input
                        type="text"
                        value={vendorForm.representativeName}
                        onChange={(e) => setVendorForm(prev => ({ ...prev, representativeName: e.target.value }))}
                        className="w-full p-3 rounded-lg bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-green-200 mb-2">Company Address *</label>
                      <textarea
                        value={vendorForm.companyAddress}
                        onChange={(e) => setVendorForm(prev => ({ ...prev, companyAddress: e.target.value }))}
                        rows={3}
                        className="w-full p-3 rounded-lg bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
                        required
                        placeholder="Street, City, State, ZIP Code"
                      />
                    </div>

                    <div>
                      <label className="block text-green-200 mb-2">Country *</label>
                      <select
                        value={vendorForm.country}
                        onChange={(e) => setVendorForm(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full p-3 rounded-lg bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
                      >
                        <option value="USA">United States</option>
                        <option value="Non-USA">Other Country</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-green-200 mb-2">Email *</label>
                      <input
                        type="email"
                        value={vendorForm.email}
                        onChange={(e) => setVendorForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full p-3 rounded-lg bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-green-200 mb-2">Phone *</label>
                      <input
                        type="tel"
                        value={vendorForm.phone}
                        onChange={(e) => setVendorForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full p-3 rounded-lg bg-green-600 text-white border border-green-500 focus:outline-none focus:border-green-400"
                        required
                      />
                    </div>

                    <div className="md:col-span-2 flex gap-4 justify-center">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition duration-200 font-semibold"
                      >
                        {loading ? 'Creating...' : 'Create Profile'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowVendorForm(false)}
                        className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg transition duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full bg-green-700 rounded-lg border border-green-600">
                  <thead>
                    <tr className="bg-green-600">
                      <th className="p-4 text-left text-green-200 font-semibold border-b border-green-500">Company</th>
                      <th className="p-4 text-left text-green-200 font-semibold border-b border-green-500">Representative</th>
                      <th className="p-4 text-left text-green-200 font-semibold border-b border-green-500">Contact</th>
                     <th className="p-4 text-left text-green-200 font-semibold border-b border-green-500">Country</th>
                      <th className="p-4 text-left text-green-200 font-semibold border-b border-green-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map((vendor) => (
                      <tr key={vendor.id} className="border-b border-green-600 hover:bg-green-700">
                        <td className="p-4 text-white font-semibold">{vendor.companyName}</td>
                        <td className="p-4 text-white">{vendor.representativeName}</td>
                        <td className="p-4 text-white">
                          <div>{vendor.email}</div>
                          <div className="text-sm text-green-200">{vendor.phone}</div>
                        </td>
                        <td className="p-4 text-white">{vendor.country}</td>
                        <td className="p-4">
                          <button
                            onClick={() => {
                              setCurrentContainer(prev => ({ ...prev, vendorId: vendor.id }));
                              setStep('container');
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-sm transition duration-200 mr-2"
                          >
                            Add Container
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {vendors.length === 0 && !showVendorForm && (
                <div className="text-center py-12 text-green-300">
                  No vendors found. Click "Add Vendor" to create your first vendor profile.
                </div>
              )}
            </div>
          )}

          {/* Container Tab */}
          {step === 'container' && (
            <div className="bg-green-800 p-6 rounded-xl shadow-2xl mb-8 border border-green-700">
              <h2 className="text-2xl font-semibold mb-6 text-center">Container Specifications</h2>
              
              <form onSubmit={handleContainerSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-green-200 mb-2">Container ID *</label>
                  <input
                    type="text"
                    value={currentContainer.containerId}
                    onChange={(e) => setCurrentContainer(prev => ({ ...prev, containerId: e.target.value }))}
                    className="w-full p-3 rounded-lg bg-green-700 text-white border border-green-600 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-green-200 mb-2">Vendor *</label>
                  <select
                    value={currentContainer.vendorId}
                    onChange={(e) => setCurrentContainer(prev => ({ ...prev, vendorId: e.target.value }))}
                    className="w-full p-3 rounded-lg bg-green-700 text-white border border-green-600 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>{vendor.companyName}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-green-200 mb-2">Status</label>
                  <select
                    value={currentContainer.status}
                    onChange={(e) => setCurrentContainer(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full p-3 rounded-lg bg-green-700 text-white border border-green-600 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="shipped">Shipped</option>
                    <option value="completed">Completed</option>
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

          {/* Contents Tab */}
          {step === 'contents' && (
            <div className="bg-green-800 p-6 rounded-xl shadow-2xl mb-8 border border-green-700">
              <h2 className="text-2xl font-semibold mb-6 text-center">
                {editMode ? 'Edit' : 'Contents of'} Container {currentContainer.containerId}
              </h2>
              
              <div className="bg-green-700 p-4 rounded-lg mb-6 border border-green-600">
                <h3 className="text-lg font-semibold text-center mb-2">Container Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-green-200">Vendor:</span> {vendors.find(v => v.id === currentContainer.vendorId)?.companyName || 'Unknown'}</p>
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

              {/* Document Upload Section */}
              <div className="bg-green-700 p-4 rounded-lg mb-6 border border-green-600">
                <h3 className="text-lg font-semibold text-center mb-4">Supporting Documents</h3>
                <div className="mb-4">
                  <label className="block text-green-200 mb-2">Upload Documents</label>
                  <input
                    type="file"
                    multiple
                    onChange={handleDocumentUpload}
                    className="w-full p-2 rounded-lg bg-green-600 text-white border border-green-500"
                  />
                </div>
                {uploadedDocuments.length > 0 && (
                  <div>
                    <h4 className="text-green-200 mb-2">Uploaded Files:</h4>
                    <ul className="space-y-2">
                      {uploadedDocuments.map((file, index) => (
                        <li key={index} className="flex justify-between items-center bg-green-600 p-2 rounded">
                          <span className="text-white">{file.name}</span>
                          <button
                            onClick={() => removeDocument(index)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

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
                    className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white py-3 rounded-lg transition duration-200 font-semibold shadow-lg flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {editMode ? 'Updating...' : 'Saving...'}
                      </>
                    ) : (
                      editMode ? 'Update Container' : 'Save Contents'
                    )}
                  </button>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setCurrentContainer({
                        containerId: '',
                        status: 'pending',
                        city: '',
                        date: new Date().toISOString().split('T')[0],
                        vendorId: ''
                      });
                      setCurrentContents([]);
                      setRent('');
                      setUploadedDocuments([]);
                      setEditMode(false);
                      setEditingContainer(null);
                      setStep('vendors');
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg transition duration-200 font-semibold shadow-lg"
                  >
                    {editMode ? 'Cancel Edit' : 'Finish & Back to Vendors'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Containers Tab */}
          {step === 'containers' && (
            <div className="bg-green-800 p-6 rounded-xl shadow-2xl mb-8 border border-green-700">
              <h2 className="text-2xl font-semibold mb-6 text-center">All Containers</h2>
              
              {/* آمار و کنترل‌های پیشرفته */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-700 p-4 rounded-lg text-center cursor-pointer hover:bg-green-600" onClick={() => setShowContainerStats(!showContainerStats)}>
                  <div className="text-2xl font-bold">{containerStats.total}</div>
                  <div className="text-green-200">Total Containers</div>
                </div>
                <div className="bg-yellow-700 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold">{containerStats.pending}</div>
                  <div className="text-yellow-200">Pending</div>
                </div>
                <div className="bg-blue-700 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold">{containerStats.shipped}</div>
                  <div className="text-blue-200">Shipped</div>
                </div>
                <div className="bg-green-600 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold">{containerStats.completed}</div>
                  <div className="text-green-200">Completed</div>
                </div>
              </div>

              {/* فیلتر و جستجو */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-green-200 mb-2">Search</label>
                  <input
                    type="text"
                    placeholder="Search containers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 rounded-lg bg-green-700 text-white border border-green-600"
                  />
                </div>
                
                <div>
                  <label className="block text-green-200 mb-2">Filter by Vendor</label>
                  <select
                    onChange={(e) => filterByVendor(e.target.value)}
                    className="w-full p-3 rounded-lg bg-green-700 text-white border border-green-600"
                  >
                    <option value="all">All Vendors</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>{vendor.companyName}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-end gap-2">
                  <button
                    onClick={searchContainers}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-lg flex-1"
                  >
                    Search
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg"
                    title="Export to Excel"
                  >
                    📊
                  </button>
                  <button
                    onClick={backupData}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-lg"
                    title="Backup Data"
                  >
                    💾
                  </button>
                </div>
              </div>

              {/* نمایش آمار دقیق */}
              {showContainerStats && (
                <div className="bg-green-700 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-center">Container Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{containerStats.total}</div>
                      <div className="text-green-200">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{containerStats.pending}</div>
                      <div className="text-yellow-200">Pending</div>
                      <div className="text-sm">
                        {containerStats.total > 0 ? Math.round((containerStats.pending / containerStats.total) * 100) : 0}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{containerStats.shipped}</div>
                      <div className="text-blue-200">Shipped</div>
                      <div className="text-sm">
                        {containerStats.total > 0 ? Math.round((containerStats.shipped / containerStats.total) * 100) : 0}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{containerStats.completed}</div>
                      <div className="text-green-200">Completed</div>
                      <div className="text-sm">
                        {containerStats.total > 0 ? Math.round((containerStats.completed / containerStats.total) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* نمایش vendor انتخاب شده */}
              {selectedVendor && (
                <div className="bg-green-700 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-2">Filtered by Vendor: {selectedVendor.companyName}</h3>
                  <p className="text-green-200">
                    Showing {searchResults.length} of {containers.length} containers
                  </p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="bg-green-700 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-4">Containers ({searchResults.length})</h3>
                  <div className="space-y-4">
                    {searchResults.map((container) => (
                      <div key={container.id} className="bg-green-600 p-4 rounded-lg border border-green-500">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xl font-semibold">Container: {container.containerId}</h4>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => {
                                setSelectedContainer(container);
                                loadContainerDocuments(container.id);
                              }}
                              className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm transition duration-200"
                            >
                              {selectedContainer && selectedContainer.id === container.id ? 'Hide Details' : 'View Details'}
                            </button>
                            <button
                              onClick={() => viewContainerDocuments(container)}
                              className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded text-sm transition duration-200"
                            >
                              Documents
                            </button>
                            <button
                              onClick={() => editContainer(container)}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition duration-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => printContainer(container)}
                              className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-sm transition duration-200"
                            >
                              Print
                            </button>
                            {container.status !== 'completed' && (
                              <button
                                onClick={() => markContainerComplete(container.id)}
                                className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm transition duration-200"
                              >
                                Mark Complete
                              </button>
                            )}
                            <button
                              onClick={() => deleteContainer(container.id)}
                              className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm transition duration-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <p><span className="text-green-200">Vendor:</span> {container.vendor?.companyName || 'Unknown'}</p>
                          <p><span className="text-green-200">Status:</span> {container.status}</p>
                          <p><span className="text-green-200">City:</span> {container.city}</p>
                          <p><span className="text-green-200">Date:</span> {container.date}</p>
                         <p><span className="text-green-200">Items:</span> {container.contents?.length || 0}</p>
                          <p><span className="text-green-200">Rent:</span> ${container.rent.toLocaleString()}</p>
                          <p><span className="text-green-200">Grand Total:</span> ${container.grandTotal.toLocaleString()}</p>
                        </div>
                        
                        {/* Container Documents */}
                        {selectedContainer && selectedContainer.id === container.id && documents.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-green-200 font-semibold mb-2">Documents:</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {documents.map((doc) => {
                                const isImage = doc.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                const isPDF = doc.name.match(/\.(pdf)$/i);
                                
                                return (
                                  <div key={doc.id} className="bg-green-700 p-3 rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="text-white text-sm truncate flex-1" title={doc.name}>
                                        {doc.name}
                                      </span>
                                      <div className="flex gap-2 ml-2">
                                        <a 
                                          href={doc.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs"
                                        >
                                          {isImage ? 'View' : isPDF ? 'Open' : 'Download'}
                                        </a>
                                        <button
                                          onClick={() => deleteDocument(doc.id)}
                                          className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {isImage && (
                                      <div className="mt-2">
                                        <img 
                                          src={doc.url} 
                                          alt={doc.name}
                                          className="w-full h-32 object-cover rounded-lg"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      </div>
                                    )}
                                    
                                    <div className="text-xs text-green-300 mt-2">
                                      Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Container Contents */}
                        {selectedContainer && selectedContainer.id === container.id && (
                          <div className="mt-4">
                            <h5 className="text-green-200 font-semibold mb-2">Contents:</h5>
                            <div className="overflow-x-auto">
                              <table className="w-full bg-green-700 rounded-lg">
                                <thead>
                                  <tr className="bg-green-800">
                                    <th className="p-2 text-left">SN</th>
                                    <th className="p-2 text-left">Lot #</th>
                                    <th className="p-2 text-left">Make</th>
                                    <th className="p-2 text-left">Model</th>
                                    <th className="p-2 text-left">Year</th>
                                    <th className="p-2 text-left">Price</th>
                                   <th className="p-2 text-left">Recovery</th>
                                    <th className="p-2 text-left">Cutting</th>
                                    <th className="p-2 text-left">Total</th>
                                    <th className="p-2 text-left">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                 {(container.contents || []).map((content, index) => (
                                <tr key={content.id || index} className="border-b border-green-700">
                                <td className="p-2">{content.number}</td>
                                <td className="p-2">{content.lotNumber}</td>
                                      <td className="p-2">{content.item}</td>
                                      <td className="p-2">{content.model}</td>
                                      <td className="p-2">{content.year}</td>
                                      <td className="p-2">${typeof content.price === 'number' ? content.price.toLocaleString() : '0'}</td>
                                      <td className="p-2">${typeof content.recovery === 'number' ? content.recovery.toLocaleString() : '0'}</td>
                                      <td className="p-2">${typeof content.cutting === 'number' ? content.cutting.toLocaleString() : '0'}</td>
                                      <td className="p-2">${typeof content.total === 'number' ? content.total.toLocaleString() : '0'}</td>
                                      <td className="p-2">
                                        <button
                                          onClick={() => content.id && deleteContentItem(content.id, container.id)}
                                          className="bg-red-500 hover:bg-red-400 text-white px-2 py-1 rounded text-xs"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
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
        </div>
      </div>

      {/* Documents Modal */}
      {showDocumentsModal && selectedContainerForDocs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-green-800 p-6 rounded-xl shadow-2xl border border-green-700 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4 text-center">
              Documents for Container {selectedContainerForDocs.containerId}
            </h3>
            
            {/* بخش آپلود */}
            <div className="mb-6 p-4 bg-green-700 rounded-lg">
              <h4 className="text-green-200 mb-3 font-semibold">Upload New Documents</h4>
              <input
                type="file"
                multiple
                onChange={handleDocumentUpload}
                className="w-full p-2 rounded-lg bg-green-600 text-white border border-green-500 mb-3"
              />
              
              {uploadedDocuments.length > 0 && (
                <div>
                  <h5 className="text-green-200 mb-2">Selected files:</h5>
                  <div className="space-y-2 mb-3">
                    {uploadedDocuments.map((file, index) => (
                      <div key={index} className="flex justify-between items-center bg-green-600 p-2 rounded">
                        <span className="text-white text-sm truncate">{file.name}</span>
                        <span className="text-green-200 text-xs">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          onClick={() => removeDocument(index)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => uploadDocuments(selectedContainerForDocs.id)}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded w-full"
                  >
                    Upload {uploadedDocuments.length} File(s)
                  </button>
                </div>
              )}
            </div>

            {/* نمایش اسناد موجود */}
            {documents.length > 0 ? (
              <div>
                <h4 className="text-green-200 mb-3 font-semibold">Existing Documents ({documents.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {documents.map((doc) => {
                    const isImage = doc.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    const isPDF = doc.name.match(/\.(pdf)$/i);
                    
                    return (
                      <div key={doc.id} className="bg-green-700 p-3 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-white text-sm truncate flex-1" title={doc.name}>
                            {doc.name}
                          </span>
                          <div className="flex gap-2 ml-2">
                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs"
                            >
                              {isImage ? 'View' : isPDF ? 'Open' : 'Download'}
                            </a>
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        
                        {isImage && (
                          <div className="mt-2">
                            <img 
                              src={doc.url} 
                              alt={doc.name}
                              className="w-full h-32 object-cover rounded-lg"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
                        <div className="text-xs text-green-300 mt-2">
                          Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-green-300 text-center py-4">No documents found for this container.</p>
            )}
            
            <div className="flex justify-end mt-6 pt-4 border-t border-green-700">
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedContainerForDocs(null);
                  setUploadedDocuments([]);
                }}
                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Transfers Modal */}
      {showTransfersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-green-800 p-6 rounded-xl shadow-2xl border border-green-700 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-center flex-1">
                💰 My Money Transfers
              </h3>
              <button
                onClick={() => setShowTransfersModal(false)}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>

            {transfersLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                <p className="mt-4 text-green-200">Loading transfers...</p>
              </div>
            ) : userTransfers.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-green-700 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{userTransfers.length}</div>
                    <div className="text-green-200">Total Transfers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      ${userTransfers.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                    </div>
                    <div className="text-green-200">Total Amount</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {new Set(userTransfers.map(t => t.vendor?.id)).size}
                    </div>
                    <div className="text-green-200">Vendors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {userTransfers.filter(t => t.documents && t.documents.length > 0).length}
                    </div>
                    <div className="text-green-200">With Documents</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full bg-green-700 rounded-lg border border-green-600">
                    <thead>
                      <tr className="bg-green-600">
                        <th className="p-3 text-left text-green-200 font-semibold">Date</th>
                        <th className="p-3 text-left text-green-200 font-semibold">Vendor</th>
                        <th className="p-3 text-left text-green-200 font-semibold">Container</th>
                        <th className="p-3 text-left text-green-200 font-semibold">Amount</th>
                        <th className="p-3 text-left text-green-200 font-semibold">Type</th>
                        <th className="p-3 text-left text-green-200 font-semibold">Documents</th>
                        <th className="p-3 text-left text-green-200 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userTransfers.map((transfer) => (
                        <tr key={transfer.id} className="border-b border-green-600 hover:bg-green-700">
                          <td className="p-3 text-white">{transfer.date}</td>
                          <td className="p-3 text-white font-semibold">
                            {transfer.vendor?.companyName || 'Unknown Vendor'}
                          </td>
                          <td className="p-3 text-white font-mono">{transfer.container.containerId}</td>
                          <td className="p-3 text-green-300 font-bold">
                            ${transfer.amount.toLocaleString()}
                          </td>
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
                          <td className="p-3">
                            {transfer.documents && transfer.documents.length > 0 ? (
                              <div className="space-y-1">
                                {transfer.documents.map((doc) => (
                                  <a 
                                    key={doc.id}
                                    href={doc.path} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-300 hover:text-blue-200 text-sm flex items-center"
                                    title={doc.originalName}
                                  >
                                    📎 {doc.originalName.length > 20 
                                      ? doc.originalName.substring(0, 20) + '...' 
                                      : doc.originalName}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No documents</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => printTransfer(transfer)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm"
                              >
                                Print
                              </button>
                              <button
                                onClick={() => viewTransferDetails(transfer)}
                                className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm"
                              >
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-green-300">
                <div className="text-6xl mb-4">💸</div>
                <h4 className="text-xl font-semibold mb-2">No Transfers Found</h4>
                <p>You haven't made any money transfers yet.</p>
                <button
                  onClick={() => {
                    setShowTransfersModal(false);
                    // رفتن به صفحه transfers
                    window.open('/transfers', '_blank');
                  }}
                  className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg mt-4"
                >
                  Go to Transfers Page
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}