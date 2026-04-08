import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaPaperPlane, FaGlobeAfrica, FaCity } from 'react-icons/fa';
import axios from 'axios';

const RegionalReportForm = ({ user, onClose, onSuccess, recipients = [], fetchingRecipients = false, federalInfo = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    body: '',
    priority: 'medium',
    recipient_id: '',
    recipient_type: ''
  });
  
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Find selected recipient to get type
      const selectedRecipient = recipients.find(r => r.id.toString() === formData.recipient_id);
      
      if (!selectedRecipient) {
        setError('Please select a recipient');
        setSending(false);
        return;
      }

      const payload = {
        ...formData,
        recipient_type: selectedRecipient.type, // 'federal' or 'zone'
        recipient_id: parseInt(formData.recipient_id)
      };

      const response = await axios.post(
        'http://localhost:5001/api/regional/reports/send',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        onSuccess(response.data.report);
      }
    } catch (err) {
      console.error('Error sending report:', err);
      setError(err.response?.data?.message || 'Failed to send report');
    } finally {
      setSending(false);
    }
  };

  // Group recipients by type for better UI
  const federalRecipients = recipients.filter(r => r.type === 'federal');
  const zoneRecipients = recipients.filter(r => r.type === 'zone');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Send New Report
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FaTimes className="text-xl text-gray-500" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Recipient Selection - UPDATED VERSION */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Recipient <span className="text-red-500">*</span>
              </label>
              {fetchingRecipients ? (
                <div className="flex items-center justify-center p-6 bg-gray-50 rounded-xl">
                  <FaSpinner className="animate-spin text-green-600 mr-2" />
                  <span className="text-gray-600">Loading recipients...</span>
                </div>
              ) : (
                <select
                  value={formData.recipient_id}
                  onChange={(e) => setFormData({...formData, recipient_id: e.target.value})}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                >
                  <option value="">Select a recipient</option>
                  
                  {/* Federal Section - Always show if exists */}
                  {recipients.filter(r => r.type === 'federal').length > 0 && (
                    <optgroup label="🏛️ FEDERAL MINISTRY" className="font-bold text-blue-600">
                      {recipients.filter(r => r.type === 'federal').map(recipient => (
                        <option key={recipient.id} value={recipient.id} className="font-medium">
                          🏛️ {recipient.name} - {recipient.admin_name} (Federal)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {/* Zones Section */}
                  {recipients.filter(r => r.type === 'zone').length > 0 && (
                    <optgroup label="🏙️ ZONES" className="font-bold text-purple-600">
                      {recipients.filter(r => r.type === 'zone').map(recipient => (
                        <option key={recipient.id} value={recipient.id}>
                          🏙️ {recipient.name} - Admin: {recipient.admin_name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}
              
              {/* Debug info - remove in production */}
              {recipients.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Found: {recipients.filter(r => r.type === 'federal').length} Federal, {recipients.filter(r => r.type === 'zone').length} Zones
                </div>
              )}
              
              {recipients.length === 0 && !fetchingRecipients && (
                <p className="text-sm text-red-500 mt-2">
                  No recipients found. Please check your connection.
                </p>
              )}
            </div>

            {/* Priority Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
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
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                placeholder="Report title"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                placeholder="Report subject (optional)"
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
                required
                rows="6"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none"
                placeholder="Write your report message here..."
              />
            </div>

            {/* Summary of selected recipient */}
            {formData.recipient_id && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <p className="text-sm text-green-800 font-medium">
                  Sending to: {
                    recipients.find(r => r.id.toString() === formData.recipient_id)?.type === 'federal' 
                      ? 'Federal Ministry of Health' 
                      : `Zone: ${recipients.find(r => r.id.toString() === formData.recipient_id)?.name}`
                  }
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || recipients.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {sending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                {sending ? 'Sending...' : 'Send Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegionalReportForm;