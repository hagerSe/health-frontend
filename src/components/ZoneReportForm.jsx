import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaTimes, FaPaperPlane, FaUpload, FaTrash, 
  FaFilePdf, FaFileWord, FaFileExcel, FaFileImage,
  FaSpinner, FaUserCircle, FaPhone, FaCheck, FaBuilding, FaMapMarkerAlt
} from 'react-icons/fa';

const ZoneReportForm = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    body: '',
    priority: 'medium',
    recipient_type: '',
    recipient_id: '',
    attachments: []
  });

  const [regionalAdmin, setRegionalAdmin] = useState(null);
  const [woredas, setWoredas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingRecipients, setFetchingRecipients] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedRecipientInfo, setSelectedRecipientInfo] = useState(null);

  const API_BASE_URL = 'http://localhost:5001'; // FIXED: Use port 5001, not 5000

  // AUTO-SELECT 'regional' for zone admin (most common)
  useEffect(() => {
    if (user?.userType === 'zone') {
      console.log("🔄 Auto-selecting 'regional' for zone admin");
      setFormData(prev => ({
        ...prev,
        recipient_type: 'regional'
      }));
    }
  }, [user]);

  // Fetch recipients when level changes
  useEffect(() => {
    if (formData.recipient_type === 'regional') {
      fetchRegionalAdmin();
    } else if (formData.recipient_type === 'woreda') {
      fetchWoredas();
    }
  }, [formData.recipient_type]);

  // Auto-select regional if only one option
  useEffect(() => {
    if (formData.recipient_type === 'regional' && regionalAdmin && !formData.recipient_id) {
      console.log("🔄 Auto-selecting regional admin:", regionalAdmin);
      setFormData(prev => ({
        ...prev,
        recipient_id: regionalAdmin.id
      }));
      setSelectedRecipientInfo(regionalAdmin);
    }
  }, [regionalAdmin]);

  // Fetch the SPECIFIC regional admin for this zone
  const fetchRegionalAdmin = async () => {
    try {
      setFetchingRecipients(true);
      const token = localStorage.getItem('token');
      
      console.log("🔍 Fetching SPECIFIC regional admin for zone...");
      console.log("Zone admin regional_id:", user?.regional_id);
      
      const res = await axios.get(`${API_BASE_URL}/api/zone/regional-info`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("📥 Regional admin response:", res.data);

      if (res.data.success && res.data.regional) {
        setRegionalAdmin(res.data.regional);
        console.log("✅ Found regional admin:", res.data.regional);
      } else {
        console.warn("⚠️ No regional admin found:", res.data.message);
        setRegionalAdmin(null);
      }
    } catch (error) {
      console.error('❌ Error fetching regional admin:', error);
      setRegionalAdmin(null);
    } finally {
      setFetchingRecipients(false);
    }
  };

  // Fetch ALL woredas under this zone
  const fetchWoredas = async () => {
    try {
      setFetchingRecipients(true);
      const token = localStorage.getItem('token');
      
      console.log("🔍 Fetching woredas under this zone...");
      console.log("Zone admin ID:", user?.id);
      
      const res = await axios.get(`${API_BASE_URL}/api/zone/woredas-list`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("📥 Woredas response:", res.data);

      if (res.data.success) {
        setWoredas(res.data.woredas || []);
        console.log(`✅ Found ${res.data.count || 0} woredas`);
      } else {
        setWoredas([]);
      }
    } catch (error) {
      console.error('❌ Error fetching woredas:', error);
      setWoredas([]);
    } finally {
      setFetchingRecipients(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file size (max 10MB)
    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024);
    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    
    if (invalidFiles.length > 0) {
      alert(`${invalidFiles.length} file(s) exceed 10MB limit`);
    }
    
    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ];
    
    const typeValidFiles = validFiles.filter(file => allowedTypes.includes(file.type));
    
    // Limit to 5 files total
    const totalFiles = [...uploadedFiles, ...typeValidFiles];
    if (totalFiles.length > 5) {
      alert('Maximum 5 files allowed');
      return;
    }
    
    setUploadedFiles(prev => [...prev, ...typeValidFiles]);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...typeValidFiles]
    }));
  };

  const removeFile = (index) => {
    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
    
    const newAttachments = [...formData.attachments];
    newAttachments.splice(index, 1);
    setFormData(prev => ({
      ...prev,
      attachments: newAttachments
    }));
  };

  const getFileIcon = (file) => {
    const type = file.type;
    if (type.includes('pdf')) return <FaFilePdf className="text-red-500" />;
    if (type.includes('word')) return <FaFileWord className="text-blue-500" />;
    if (type.includes('sheet') || type.includes('excel')) return <FaFileExcel className="text-green-500" />;
    if (type.includes('image')) return <FaFileImage className="text-purple-500" />;
    return <FaFileWord className="text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleRecipientSelect = (id, info) => {
    setFormData(prev => ({ ...prev, recipient_id: id }));
    setSelectedRecipientInfo(info);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.body || !formData.recipient_id) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('subject', formData.subject || '');
      submitData.append('body', formData.body);
      submitData.append('priority', formData.priority);
      submitData.append('recipient_type', formData.recipient_type);
      submitData.append('recipient_id', formData.recipient_id);
      
      // Append files
      formData.attachments.forEach((file) => {
        submitData.append('attachments', file);
      });

      console.log("📤 Sending report to:", formData.recipient_type, "ID:", formData.recipient_id);
      console.log("Recipient info:", selectedRecipientInfo);

      const res = await axios.post(
        `${API_BASE_URL}/api/zone/reports/send`,
        submitData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );

      console.log("✅ Report sent successfully:", res.data);

      if (res.data.success) {
        onSuccess?.(res.data.report);
        onClose();
        alert(`Report sent to ${selectedRecipientInfo?.full_name || 'recipient'} successfully!`);
      }
    } catch (error) {
      console.error('❌ Error sending report:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.message || 
                            error.response.data?.error?.message || 
                            `Server error: ${error.response.status}`;
        
        if (error.response.data?.errors) {
          const validationErrors = error.response.data.errors
            .map(e => `${e.field}: ${e.message}`)
            .join('\n');
          alert(`Validation errors:\n${validationErrors}`);
        } else {
          alert(errorMessage);
        }
        
      } else if (error.request) {
        alert('No response from server. Please check if backend is running.');
      } else {
        alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Get recipient display info
  const getRecipientDisplay = () => {
    if (formData.recipient_type === 'regional' && regionalAdmin) {
      return {
        icon: <FaBuilding className="text-blue-500" />,
        title: 'Regional Ministry',
        name: regionalAdmin.full_name,
        details: regionalAdmin.region_name ? `${regionalAdmin.region_name} Region` : 'Regional Admin',
        phone: regionalAdmin.phone
      };
    } else if (formData.recipient_type === 'woreda' && selectedRecipientInfo) {
      return {
        icon: <FaMapMarkerAlt className="text-green-500" />,
        title: 'Woreda Administration',
        name: selectedRecipientInfo.full_name,
        details: selectedRecipientInfo.woreda_name ? `${selectedRecipientInfo.woreda_name} Woreda` : 'Woreda Admin',
        phone: selectedRecipientInfo.phone
      };
    }
    return null;
  };

  const recipientDisplay = getRecipientDisplay();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Send New Report</h2>
              <p className="text-sm text-gray-600 mt-1">
                {user?.full_name} • Zone Admin • {user?.zone_name} Zone
              </p>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>Regional ID: {user?.regional_id}</span>
                <span>Zone ID: {user?.id}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Recipient Level Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Level <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.recipient_type === 'regional'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="recipient_type"
                    value="regional"
                    checked={formData.recipient_type === 'regional'}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        recipient_type: e.target.value,
                        recipient_id: ''
                      });
                      setSelectedRecipientInfo(null);
                    }}
                    className="sr-only"
                  />
                  <FaBuilding className={`mr-2 ${formData.recipient_type === 'regional' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className="font-medium">Regional</span>
                </label>
                
                <label
                  className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.recipient_type === 'woreda'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="recipient_type"
                    value="woreda"
                    checked={formData.recipient_type === 'woreda'}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        recipient_type: e.target.value,
                        recipient_id: ''
                      });
                      setSelectedRecipientInfo(null);
                    }}
                    className="sr-only"
                  />
                  <FaMapMarkerAlt className={`mr-2 ${formData.recipient_type === 'woreda' ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="font-medium">Woreda</span>
                </label>
              </div>
            </div>

            {/* Regional Admin Display */}
            {formData.recipient_type === 'regional' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Regional Admin <span className="text-red-500">*</span>
                </label>
                
                {fetchingRecipients ? (
                  <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
                    <FaSpinner className="animate-spin text-purple-500 mr-2" />
                    <span className="text-gray-600">Loading regional admin...</span>
                  </div>
                ) : regionalAdmin ? (
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.recipient_id === regionalAdmin.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => handleRecipientSelect(regionalAdmin.id, regionalAdmin)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FaBuilding className="text-blue-500 text-2xl" />
                        <div>
                          <p className="font-medium text-gray-800">{regionalAdmin.full_name}</p>
                          <p className="text-sm text-gray-600">
                            {regionalAdmin.region_name} Region
                            {regionalAdmin.phone && ` • ☎️ ${regionalAdmin.phone}`}
                          </p>
                        </div>
                      </div>
                      {formData.recipient_id === regionalAdmin.id && (
                        <FaCheck className="text-blue-500 text-xl" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      ⚠️ No regional admin found. Please contact support.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Woredas Selection */}
            {formData.recipient_type === 'woreda' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Woreda <span className="text-red-500">*</span>
                </label>
                
                {fetchingRecipients ? (
                  <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
                    <FaSpinner className="animate-spin text-purple-500 mr-2" />
                    <span className="text-gray-600">Loading woredas...</span>
                  </div>
                ) : woredas.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                    {woredas.map(woreda => (
                      <div 
                        key={woreda.id}
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.recipient_id === woreda.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                        onClick={() => handleRecipientSelect(woreda.id, woreda)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FaMapMarkerAlt className={`text-xl ${
                              formData.recipient_id === woreda.id ? 'text-green-500' : 'text-gray-400'
                            }`} />
                            <div>
                              <p className="font-medium text-gray-800">{woreda.full_name}</p>
                              <p className="text-sm text-gray-600">
                                {woreda.woreda_name} Woreda
                                {woreda.phone && ` • ☎️ ${woreda.phone}`}
                              </p>
                            </div>
                          </div>
                          {formData.recipient_id === woreda.id && (
                            <FaCheck className="text-green-500 text-xl" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      ⚠️ No woredas found. Create woredas first.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Selected Recipient Summary */}
            {recipientDisplay && formData.recipient_id && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-medium text-purple-800 mb-2">Sending to:</p>
                <div className="flex items-center gap-3">
                  {recipientDisplay.icon}
                  <div>
                    <p className="font-medium text-gray-800">{recipientDisplay.name}</p>
                    <p className="text-sm text-gray-600">
                      {recipientDisplay.details}
                      {recipientDisplay.phone && ` • ☎️ ${recipientDisplay.phone}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Priority Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-3">
                {['low', 'medium', 'high', 'urgent'].map(p => (
                  <label
                    key={p}
                    className={`flex items-center justify-center px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.priority === p
                        ? p === 'urgent'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : p === 'high'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : p === 'medium'
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${p === 'urgent' && 'animate-pulse'}`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={formData.priority === p}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      className="sr-only"
                    />
                    <span className="capitalize text-sm font-medium">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                required
                placeholder="Enter report title"
                maxLength="200"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                placeholder="Enter report subject"
                maxLength="200"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({...formData, body: e.target.value})}
                rows="8"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
                required
                placeholder="Write your report message here..."
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments <span className="text-gray-400 text-xs">(Max 5 files, 10MB each)</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 transition-colors group">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FaUpload className="mx-auto text-3xl text-gray-400 group-hover:text-purple-500 transition-colors mb-2" />
                  <p className="text-sm text-gray-600 group-hover:text-purple-600 transition-colors">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, DOC, XLS, JPG, PNG (max 10MB each)
                  </p>
                </label>
              </div>
              
              {/* File List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Selected files ({uploadedFiles.length}/5)
                  </p>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg group hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate max-w-xs">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove file"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.recipient_id}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FaPaperPlane />
                    Send Report
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ZoneReportForm;