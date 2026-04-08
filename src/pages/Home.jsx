import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  FaPlus, FaFacebook, FaTelegram, FaInstagram, 
  FaPhoneAlt, FaEnvelope, FaSearch, FaSignInAlt,
  FaAmbulance, FaUserMd, FaBaby 
} from "react-icons/fa";
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDept, setActiveDept] = useState(null);
  const navigate = useNavigate();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(
        searchQuery
      )}`;
      window.open(url, "_blank");
    }
  };

  const handleAdminLogin = () => {
    navigate('/login');
  };

  // Handle Enter key press for search
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* TOP HEADER */}
      <div className="w-full bg-blue-300 py-2 px-4">
        <div className="grid grid-cols-4 items-center text-sm font-medium">
          <div className="col-span-2 flex gap-4">
            <FaFacebook className="text-blue-600 cursor-pointer hover:opacity-80" />
            <FaTelegram className="text-sky-500 cursor-pointer hover:opacity-80" />
            <FaInstagram className="text-pink-500 cursor-pointer hover:opacity-80" />
          </div>
          <div className="flex items-center gap-2 justify-center">
            <FaPhoneAlt className="text-green-600" />
            <span className="text-xs sm:text-sm">+251 98 493 5677</span>
          </div>
          <div className="flex items-center gap-2 justify-end text-xs sm:text-sm">
            <FaEnvelope className="text-blue-600" />
            <span>agerneshdareje@gmail.com</span>
          </div>
        </div>
      </div>

      {/* MAIN HEADER */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 bg-white shadow-md gap-4 sm:gap-0">
        <h1 className="text-xl font-semibold text-center sm:text-left">
          National Health <span className="text-blue-500">Management System</span>
        </h1>
        <ul className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-sm font-medium">
          <li>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <input
                type="text"
                placeholder="Search..."
                className="px-3 py-2 text-sm w-32 sm:w-48 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button
                onClick={handleSearch}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
              >
                <FaSearch className="text-gray-600" />
              </button>
            </div>
          </li>
          <li><Link to="/" className="hover:text-blue-600 text-xl">Home</Link></li>
          <li><Link to="/about" className="hover:text-blue-600 text-xl">About</Link></li>
          <li><Link to="/contact" className="hover:text-blue-600 text-xl">Contact</Link></li>
          {/* <li>
            <button className="flex items-center gap-1 px-3 py-2 border border-blue-600 text-black rounded-full hover:bg-blue-600 hover:text-white transition bg-blue-200">
              <FaSignInAlt />
              Sign In
            </button>
          </li> */}
        </ul>
      </div>

      {/* HERO SECTION */}
      <div className="w-full relative overflow-hidden">
        <div className="mx-auto flex flex-col lg:flex-row items-center gap-8 lg:gap-16 px-4 relative min-h-[500px]">
          {/* LEFT CIRCLE */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[150px] h-[150px] overflow-hidden z-0">
            <div className="w-3/2 h-full bg-blue-300 rounded-full -translate-x-2/3"></div>
          </div>

          {/* RIGHT CIRCLE */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[300px] h-[300px] overflow-hidden z-0">
            <div className="w-full h-full bg-blue-300 rounded-full translate-x-1/2"></div>
          </div>

          {/* TEXT */}
          <div className="lg:w-2/5 text-left z-10 ml-0 lg:ml-9 mt-2">
            <h2 className="text-black font-bold text-2xl sm:text-3xl lg:text-4xl">
              Welcome To The National System
            </h2>
            <p className="text-gray-700 text-sm sm:text-base lg:text-lg mt-2">
              Health is the foundation of a strong and productive society.
              A well-organized health management system ensures that citizens
              receive timely, affordable, and quality healthcare services.
              By integrating modern technology with healthcare administration.
            </p>
          </div>

          {/* IMAGE */}
        <div
  className="relative w-[240px] h-[350px] flex items-center justify-center rounded-full mt-3 mb-5 bg-slate-50/95 z-10"
  style={{
    backgroundImage: "url('/images/2.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  }}
>
            <div className="absolute top-4 right-4 flex items-center justify-center w-12 h-12 rounded-full bg-white hover:bg-blue-700 cursor-pointer transition group">
              <FaPlus className="text-blue-700 group-hover:text-white text-lg" />
            </div>
            <div className="absolute bottom-4 left-4 flex items-center justify-center w-12 h-12 rounded-full bg-white hover:bg-blue-700 cursor-pointer transition group">
              <FaPlus className="text-blue-700 group-hover:text-white text-lg" />
            </div>
            <div className="absolute bottom-4 right-4 flex items-center justify-center w-12 h-12 rounded-full bg-white hover:bg-blue-700 cursor-pointer transition group">
              <FaPlus className="text-blue-700 group-hover:text-white text-lg" />
            </div>
          </div>

          {/* MINI CIRCLE */}
          <div className="absolute top-10 left-10 w-16 h-16 bg-blue-200 rounded-full"></div>
        </div>
      </div>

      {/* OUR SERVICE HEADING */}
      <div className="h-auto flex justify-center px-4 mt-10">
        <h1 className="text-center font-bold text-lg sm:text-xl md:text-2xl">
          Our System Service
        </h1>
      </div>

      {/* PARAGRAPH */}
      <div className="h-auto flex justify-center px-4 mt-2 mb-8">
        <p className="text-gray-700 text-center max-w-3xl">
          Health is the foundation of a productive and fulfilling life. 
          Maintaining physical, mental, and social well-being is essential for individuals and
          communities to thrive.
        </p>
      </div>

      {/* SERVICE CARDS */}
      <div className="w-full px-4 mt-6">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-5">
          {/* Emergency */}
          <div
            onClick={() => setActiveDept(activeDept === "emergency" ? null : "emergency")}
            className={`w-64 p-4 bg-blue-400 rounded-xl shadow-lg hover:scale-105 transition cursor-pointer flex flex-col items-center justify-center ${
              activeDept === "emergency" ? "ring-4 ring-blue-600" : ""
            }`}
          >
            <FaAmbulance className="text-red-700 text-4xl mb-3" />
            <h3 className="font-bold text-xl text-center">Emergency Department</h3>
            <p className="text-sm text-center mt-2">EMC works in the highly urgent...</p>
          </div>

          {/* OPD */}
          <div
            onClick={() => setActiveDept(activeDept === "opd" ? null : "opd")}
            className={`w-64 p-4 bg-blue-400 rounded-xl shadow-lg hover:scale-105 transition cursor-pointer flex flex-col items-center justify-center ${
              activeDept === "opd" ? "ring-4 ring-blue-600" : ""
            }`}
          >
            <FaUserMd className="text-red-700 text-4xl mb-3" />
            <h3 className="font-bold text-xl text-center">OPD Department</h3>
            <p className="text-sm text-center mt-2">OPD departments give services...</p>
          </div>

          {/* ANC */}
          <div
            onClick={() => setActiveDept(activeDept === "anc" ? null : "anc")}
            className={`w-64 p-4 bg-blue-400 rounded-xl shadow-lg hover:scale-105 transition cursor-pointer flex flex-col items-center justify-center ${
              activeDept === "anc" ? "ring-4 ring-blue-600" : ""
            }`}
          >
            <FaBaby className="text-red-700 text-4xl mb-3" />
            <h3 className="font-bold text-xl text-center">ANC Department</h3>
            <p className="text-sm text-center mt-2">This focused on mother...</p>
          </div>
        </div>

        {/* DETAILS */}
        {activeDept && (
          <div className="mt-10 max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-lg text-center">
            {activeDept === "emergency" && (
              <p className="text-gray-700">
                The Emergency Department provides 24/7 critical care for
                life-threatening conditions with rapid response teams.
              </p>
            )}
            {activeDept === "opd" && (
              <p className="text-gray-700">
                The OPD Department delivers outpatient consultations,
                diagnosis, and follow-up medical services.
              </p>
            )}
            {activeDept === "anc" && (
              <p className="text-gray-700">
                The ANC Department ensures maternal and fetal health through
                prenatal care and regular monitoring.
              </p>
            )}
          </div>
        )}
      </div>

      {/* LOGIN BUTTON */}
      <div className="flex flex-col items-center mt-6 px-4 pb-8">
        <button
          onClick={handleAdminLogin}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Admin Login
        </button>
      </div>
    </div>
  );
}



