import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaTimes, FaReply, FaCheck, FaUndo, FaDownload,
  FaFilePdf, FaFileWord, FaFileExcel, FaFileImage,
  FaPaperPlane, FaEnvelopeOpen, FaClock
} from 'react-icons/fa';
import { format } from 'date-fns';

const ReportView = ({ reportId, onClose, onUpdate }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyMode, setReplyMode] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `http://localhost:5000/api/regional/reports/${reportId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setReport(res.data.report);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim()) return;
    
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `http://localhost:5000/api/regional/reports/${reportId}/reply`,
        { body: replyBody },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.success) {
        setReplyMode(false);
        setReplyBody('');
        fetchReport();
        onUpdate?.();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error sending reply');
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm('Are you sure you want to close this report?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `http://localhost:5000/api/regional/reports/${reportId}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.success) {
        fetchReport();
        onUpdate?.();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error closing report');
    }
  };

  const handleReopen = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `http://localhost:5000/api/regional/reports/${reportId}/reopen`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.success) {
        fetchReport();
        onUpdate?.();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error reopening report');
    }
  };

  const getFileIcon = (type) => {
    if (type.includes('pdf')) return <FaFilePdf className="text-red-500" />;
    if (type.includes('word') || type.includes('document')) return <FaFileWord className="text-blue-500" />;
    if (type.includes('sheet') || type.includes('excel')) return <FaFileExcel className="text-green-500" />;
    if (type.includes('image')) return <FaFileImage className="text-purple-500" />;
    return <FaFileWord className="text-gray-500" />;
  };

  const getStatusBadge = (status) => {
    const colors = {
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      opened: 'bg-purple-100 text-purple-800',
      replied: 'bg-indigo-100 text-indigo-800',
      closed: 'bg-gray-100 text-gray-800',
      reopened: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || colors.sent;
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800 animate-pulse'
    };
    return colors[priority] || colors.medium;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-red-600">Report not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">{report.title}</h2>
              <p className="text-sm text-gray-500 mt-1">Report #{report.report_number}</p>
            </div>
            <div className="flex items-center gap-2">
              {report.status !== 'closed' ? (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <FaCheck /> Close
                </button>
              ) : (
                <button
                  onClick={handleReopen}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                >
                  <FaUndo /> Reopen
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex gap-3 mb-6">
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(report.status)}`}>
              {report.status.toUpperCase()}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${getPriorityBadge(report.priority)}`}>
              {report.priority.toUpperCase()}
            </span>
          </div>

          {/* Sender/Recipient Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">FROM</h3>
              <p className="font-medium">{report.sender_full_name}</p>
              <p className="text-sm text-gray-600">{report.sender_title}</p>
              {report.sender_region && (
                <p className="text-sm text-gray-600">Region: {report.sender_region}</p>
              )}
              {report.sender_zone && (
                <p className="text-sm text-gray-600">Zone: {report.sender_zone}</p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">TO</h3>
              <p className="font-medium">{report.recipient_full_name}</p>
              <p className="text-sm text-gray-600">{report.recipient_title}</p>
              {report.recipient_region && (
                <p className="text-sm text-gray-600">Region: {report.recipient_region}</p>
              )}
              {report.recipient_zone && (
                <p className="text-sm text-gray-600">Zone: {report.recipient_zone}</p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-3">Timeline</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Sent</p>
                <p className="text-sm font-medium">
                  {report.sent_at ? format(new Date(report.sent_at), 'MMM dd, yyyy HH:mm') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Opened</p>
                <p className="text-sm font-medium">
                  {report.opened_at ? format(new Date(report.opened_at), 'MMM dd, yyyy HH:mm') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Replied</p>
                <p className="text-sm font-medium">
                  {report.replied_at ? format(new Date(report.replied_at), 'MMM dd, yyyy HH:mm') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Closed</p>
                <p className="text-sm font-medium">
                  {report.closed_at ? format(new Date(report.closed_at), 'MMM dd, yyyy HH:mm') : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Message Content */}
          <div className="mb-6">
            <div className="bg-white border rounded-lg p-6">
              <p className="whitespace-pre-line">{report.opening}</p>
              <p className="whitespace-pre-line mt-4">{report.body}</p>
              <p className="whitespace-pre-line mt-4">{report.closing}</p>
            </div>
          </div>

          {/* Signature */}
          {report.sender_signature && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Signature</h3>
              <img
                src={report.sender_signature}
                alt="Signature"
                className="max-h-20 border rounded"
              />
            </div>
          )}

          {/* Attachments */}
          {report.attachments?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Attachments</h3>
              <div className="space-y-2">
                {report.attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.type)}
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <a
                      href={file.url}
                      download={file.name}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <FaDownload />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Replies */}
          {report.replies?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Replies</h3>
              <div className="space-y-4">
                {report.replies.map((reply, index) => (
                  <div key={reply.id} className="bg-gray-50 p-4 rounded-lg ml-4 border-l-4 border-green-500">
                    <div className="flex items-center gap-2 mb-2">
                      <FaReply className="text-green-600" />
                      <span className="font-medium">{reply.sender_full_name}</span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(reply.sent_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="whitespace-pre-line">{reply.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reply Form */}
          {replyMode ? (
            <div className="mt-6">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Type your reply..."
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <div className="flex justify-end gap-3 mt-3">
                <button
                  onClick={() => setReplyMode(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReply}
                  disabled={sending || !replyBody.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {sending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                  {sending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          ) : (
            report.status !== 'closed' && (
              <div className="flex justify-end">
                <button
                  onClick={() => setReplyMode(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <FaReply /> Reply
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportView;