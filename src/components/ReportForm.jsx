import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaTimes, FaPaperPlane, FaUpload, FaTrash, 
  FaFilePdf, FaFileWord, FaFileExcel, FaFileImage,
  FaSpinner, FaUserCircle, FaPhone, FaMapMarkerAlt
} from 'react-icons/fa';

const ReportForm = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    body: '',
    priority: 'medium',
    recipient_type: '',
    recipient_id: '',
    attachments: []
  });

  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingRecipients, setFetchingRecipients] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Determine available recipient levels based on user type
  const getRecipientLevels = () => {
    switch(user?.userType) {
      case 'federal':
        return ['regional'];
      case 'regional':
        return ['federal', 'zone'];
      case 'zone':
        return ['regional', 'woreda'];
      case 'woreda':
        return ['zone', 'kebele'];
      case 'kebele':
        return ['woreda', 'hospital'];
      case 'hospital':
        return ['kebele', 'staff'];
      case 'staff':
        return ['hospital'];
      default:
        return [];
    }
  };

  const recipientLevels = getRecipientLevels();

  // AUTO-SELECT the first available level for Federal Admin
  useEffect(() => {
    if (user?.userType === 'federal' && recipientLevels.length > 0) {
      // Automatically select 'regional' for federal admin
      setFormData(prev => ({
        ...prev,
        recipient_type: 'regional'
      }));
    }
  }, [user]);

  // Fetch recipients when level changes
  useEffect(() => {
    if (formData.recipient_type) {
      fetchRecipients();
    }
  }, [formData.recipient_type]);

  const fetchRecipients = async () => {
    try {
      setFetchingRecipients(true);
      const token = localStorage.getItem('token');
      
      // Build base URL
      let url = `http://localhost:5000/api/users/by-level?level=${formData.recipient_type}`;
      
      // STRICT HIERARCHICAL FILTERING based on foreign keys
      switch(user?.userType) {
        case 'federal':
          if (formData.recipient_type === 'regional') {
            url += `&federal_id=${user.id}`; // Federal sees their regions
          }
          break;
          
        case 'regional':
          if (formData.recipient_type === 'zone') {
            url += `&regional_id=${user.id}`; // Regional sees their zones
          } else if (formData.recipient_type === 'federal') {
            url += `&id=${user.federal_id}`; // Regional sees their federal
          }
          break;
          
        case 'zone':
          if (formData.recipient_type === 'woreda') {
            url += `&zone_id=${user.id}`; // Zone sees their woredas
          } else if (formData.recipient_type === 'regional') {
            url += `&id=${user.regional_id}`; // Zone sees their regional
          }
          break;
          
        case 'woreda':
          if (formData.recipient_type === 'kebele') {
            url += `&woreda_id=${user.id}`; // Woreda sees their kebeles
          } else if (formData.recipient_type === 'zone') {
            url += `&id=${user.zone_id}`; // Woreda sees their zone
          }
          break;
          
        case 'kebele':
          if (formData.recipient_type === 'hospital') {
            url += `&kebele_id=${user.id}`; // Kebele sees their hospitals
          } else if (formData.recipient_type === 'woreda') {
            url += `&id=${user.woreda_id}`; // Kebele sees their woreda
          }
          break;
          
        case 'hospital':
          if (formData.recipient_type === 'staff') {
            url += `&hospital_id=${user.id}`; // Hospital sees their staff
          } else if (formData.recipient_type === 'kebele') {
            url += `&id=${user.kebele_id}`; // Hospital sees their kebele
          }
          break;
          
        case 'staff':
          if (formData.recipient_type === 'hospital') {
            url += `&id=${user.hospital_id}`; // Staff sees their hospital only
          }
          break;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setRecipients(res.data.users);
      }
    } catch (error) {
      console.error('Error fetching recipients:', error);
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
    setFormData({
      ...formData,
      attachments: [...formData.attachments, ...typeValidFiles]
    });
  };

  const removeFile = (index) => {
    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
    
    const newAttachments = [...formData.attachments];
    newAttachments.splice(index, 1);
    setFormData({
      ...formData,
      attachments: newAttachments
    });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.title || !formData.body || !formData.recipient_id) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Create FormData for file upload
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

      // Determine API endpoint based on user type
      const endpoints = {
        federal: '/api/federal/reports/send',
        regional: '/api/regional/reports/send',
        zone: '/api/zone/reports/send',
        woreda: '/api/woreda/reports/send',
        kebele: '/api/kebele/reports/send',
        hospital: '/api/hospital/reports/send',
        staff: '/api/staff/reports/send'
      };

      const endpoint = endpoints[user?.userType] || '/api/reports/send';

      const res = await axios.post(
        `http://localhost:5000${endpoint}`,
        submitData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );

      if (res.data.success) {
        onSuccess?.(res.data.report);
        onClose();
        alert('Report sent successfully!');
      }
    } catch (error) {
      console.error('Error sending report:', error);
      alert(error.response?.data?.message || 'Error sending report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Send New Report</h2>
              <p className="text-sm text-gray-600 mt-1">
                {user?.full_name} • {user?.userType?.charAt(0).toUpperCase() + user?.userType?.slice(1)} Admin
              </p>
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
              <select
                value={formData.recipient_type}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    recipient_type: e.target.value,
                    recipient_id: ''
                  });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                required
              >
                <option value="">Select recipient level</option>
                {recipientLevels.map(level => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Specific Recipient Dropdown */}
            {formData.recipient_type && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Recipient <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.recipient_id}
                    onChange={(e) => setFormData({...formData, recipient_id: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                    required
                    disabled={fetchingRecipients}
                  >
                    <option value="">
                      {fetchingRecipients ? 'Loading recipients...' : `Select ${formData.recipient_type}`}
                    </option>
                    {recipients.map(rec => (
                      <option key={rec.id} value={rec.id}>
                        {rec.full_name} 
                        {rec.region_name && ` - ${rec.region_name}`}
                        {rec.zone_name && ` - ${rec.zone_name}`}
                        {rec.woreda_name && ` - ${rec.woreda_name}`}
                        {rec.kebele_name && ` - ${rec.kebele_name}`}
                        {rec.hospital_name && ` - ${rec.hospital_name}`}
                        {rec.department && ` (${rec.department})`}
                        {rec.phone && ` ☎️ ${rec.phone}`}
                      </option>
                    ))}
                  </select>
                  {fetchingRecipients && (
                    <FaSpinner className="absolute right-3 top-3 animate-spin text-blue-500" />
                  )}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                required
                placeholder="Write your report message here..."
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments <span className="text-gray-400 text-xs">(Max 5 files, 10MB each)</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors group">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FaUpload className="mx-auto text-3xl text-gray-400 group-hover:text-blue-500 transition-colors mb-2" />
                  <p className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
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

            {/* Recipient Summary (if selected) */}
            {formData.recipient_id && recipients.find(r => r.id === parseInt(formData.recipient_id)) && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">Sending to:</p>
                {(() => {
                  const rec = recipients.find(r => r.id === parseInt(formData.recipient_id));
                  return (
                    <div className="space-y-1 text-sm text-blue-700">
                      <p className="font-medium">{rec.full_name}</p>
                      <p className="capitalize">{formData.recipient_type}</p>
                      {rec.region_name && <p className="flex items-center gap-1"><FaMapMarkerAlt size={12} /> {rec.region_name}</p>}
                      {rec.zone_name && <p className="flex items-center gap-1"><FaMapMarkerAlt size={12} /> {rec.zone_name}</p>}
                      {rec.woreda_name && <p className="flex items-center gap-1"><FaMapMarkerAlt size={12} /> {rec.woreda_name}</p>}
                      {rec.phone && <p className="flex items-center gap-1"><FaPhone size={12} /> {rec.phone}</p>}
                    </div>
                  );
                })()}
              </div>
            )}

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
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
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

export default ReportForm;