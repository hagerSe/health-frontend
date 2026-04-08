// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { FaBed, FaCheck, FaTools, FaUser, FaCalendarAlt, FaSync } from 'react-icons/fa';

// const BedSelectionModal = ({ ward, hospitalId, onBedSelect, selectedBed, onClose }) => {
//   const [beds, setBeds] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');

//   const API_URL = 'http://localhost:5001';

//   useEffect(() => {
//     if (ward && hospitalId) {
//       fetchAvailableBeds();
//     }
//   }, [ward, hospitalId]);

//   const fetchAvailableBeds = async () => {
//     try {
//       setLoading(true);
//       setError('');
//       const token = localStorage.getItem('token');
      
//       const res = await axios.get(`${API_URL}/api/doctor/available-beds`, {
//         params: {
//           ward: ward,
//           hospital_id: hospitalId
//         },
//         headers: { Authorization: `Bearer ${token}` }
//       });
      
//       if (res.data.success) {
//         setBeds(res.data.beds);
//         if (res.data.beds.length === 0) {
//           setError('No beds available in this ward');
//         }
//       } else {
//         setError('Failed to load beds');
//       }
//     } catch (error) {
//       console.error('Error fetching beds:', error);
//       setError(error.response?.data?.message || 'Could not load beds');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getBedIcon = (status) => {
//     switch(status) {
//       case 'available': return <FaCheck className="text-green-500" />;
//       case 'occupied': return <FaUser className="text-red-500" />;
//       case 'maintenance': return <FaTools className="text-gray-500" />;
//       case 'reserved': return <FaCalendarAlt className="text-blue-500" />;
//       default: return <FaBed className="text-gray-400" />;
//     }
//   };

//   const getBedStatusClass = (status) => {
//     switch(status) {
//       case 'available': return 'border-green-500 bg-green-50 hover:bg-green-100 cursor-pointer';
//       case 'occupied': return 'border-red-500 bg-red-50 opacity-60 cursor-not-allowed';
//       case 'maintenance': return 'border-gray-500 bg-gray-50 opacity-60 cursor-not-allowed';
//       case 'reserved': return 'border-blue-500 bg-blue-50 opacity-60 cursor-not-allowed';
//       default: return 'border-gray-300 bg-white cursor-pointer';
//     }
//   };

//   const getBedTypeText = (type) => {
//     const types = {
//       general: 'General',
//       private: 'Private',
//       'semi-private': 'Semi-Private',
//       icu: 'ICU',
//       isolation: 'Isolation'
//     };
//     return types[type] || type;
//   };

//   return (
//     <>
//       {/* Header */}
//       <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-200">
//         <div>
//           <h3 className="text-xl font-semibold text-gray-900">Select Bed for Admission</h3>
//           <p className="text-sm text-gray-500 mt-1">{ward} Ward</p>
//         </div>
//         <button
//           onClick={onClose}
//           className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
//         >
//           ×
//         </button>
//       </div>

//       {/* Content */}
//       {loading ? (
//         <div className="text-center py-12">
//           <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto mb-4"></div>
//           <p className="text-gray-500">Loading available beds...</p>
//         </div>
//       ) : error ? (
//         <div className="text-center py-12 bg-red-50 rounded-xl">
//           <span className="text-4xl block mb-3">⚠️</span>
//           <p className="text-red-600 mb-3">{error}</p>
//           <button
//             onClick={fetchAvailableBeds}
//             className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 inline-flex items-center gap-2"
//           >
//             <FaSync /> Retry
//           </button>
//         </div>
//       ) : beds.length === 0 ? (
//         <div className="text-center py-12 bg-yellow-50 rounded-xl">
//           <FaBed className="text-5xl text-yellow-500 mx-auto mb-4" />
//           <p className="text-gray-700 font-medium mb-2">No Available Beds</p>
//           <p className="text-sm text-gray-500">No available beds in {ward} ward.</p>
//           <p className="text-sm text-gray-500 mt-1">Please register beds in the Bed Management dashboard.</p>
//           <button
//             onClick={fetchAvailableBeds}
//             className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 inline-flex items-center gap-2"
//           >
//             <FaSync /> Refresh
//           </button>
//         </div>
//       ) : (
//         <>
//           {/* Bed Grid */}
//           <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto mb-5 pr-1">
//             {beds.map(bed => {
//               const isAvailable = bed.status === 'available';
//               const isSelected = selectedBed === bed.id;
              
//               return (
//                 <div
//                   key={bed.id}
//                   onClick={() => isAvailable && onBedSelect(bed.id)}
//                   className={`border-2 rounded-xl p-4 transition-all ${
//                     isSelected
//                       ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-200'
//                       : getBedStatusClass(bed.status)
//                   }`}
//                 >
//                   <div className="flex items-center justify-between mb-2">
//                     <span className="font-bold text-lg">Bed {bed.number}</span>
//                     <span className="text-xl">{getBedIcon(bed.status)}</span>
//                   </div>
//                   <div className="text-xs text-gray-500 mb-2">
//                     {getBedTypeText(bed.type)}
//                   </div>
//                   <div className="text-xs font-medium">
//                     {bed.status === 'available' && (
//                       <span className="text-green-600">✓ Available</span>
//                     )}
//                     {bed.status === 'occupied' && (
//                       <span className="text-red-600">Occupied</span>
//                     )}
//                     {bed.status === 'maintenance' && (
//                       <span className="text-gray-600">Maintenance</span>
//                     )}
//                     {bed.status === 'reserved' && (
//                       <span className="text-blue-600">Reserved</span>
//                     )}
//                   </div>
//                   {bed.notes && bed.status === 'available' && (
//                     <div className="mt-2 text-xs text-gray-400 truncate">
//                       {bed.notes}
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </div>

//           {/* Footer */}
//           <div className="flex justify-between items-center pt-4 border-t border-gray-200">
//             <div className="text-sm text-gray-500">
//               {beds.filter(b => b.status === 'available').length} bed(s) available
//             </div>
//             <button
//               onClick={fetchAvailableBeds}
//               className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 inline-flex items-center gap-2"
//               disabled={loading}
//             >
//               <FaSync className={loading ? 'animate-spin' : ''} />
//               Refresh
//             </button>
//           </div>
//         </>
//       )}
//     </>
//   );
// };

// export default BedSelectionModal;