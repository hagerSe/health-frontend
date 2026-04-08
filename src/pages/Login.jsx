import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUserCircle, FaLock, FaEnvelope, FaEye, FaEyeSlash } from 'react-icons/fa';

const Login = ({ setAdmin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log("🔐 Login attempt for email:", email);
      
      const res = await axios.post(
        "http://localhost:5001/api/auth/login",
        { email, password },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000
        }
      );

      console.log("✅ Login response:", res.data);

      if (res.data.success && res.data.token) {
        // Store token and user data
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        
        if (setAdmin) {
          setAdmin(res.data.user);
        }
        
        console.log("✅ User data:", res.data.user);

        // Role-based redirection
        const userType = res.data.user?.userType;
        const department = res.data.user?.department;
        
        switch(userType) {
          case 'federal':
            navigate("/federal-dashboard");
            break;
          case 'regional':
            navigate("/regional-dashboard");
            break;
          case 'zone':
            navigate("/zone-dashboard");
            break;
          case 'woreda':
            navigate("/woreda-dashboard");
            break;
          case 'kebele':
            navigate("/kebele-dashboard");
            break;
          case 'hospital':
            navigate("/hospital-dashboard");
            break;
          case 'staff':
            // Redirect based on department from HospitalStaff model
            if (department) {
              const departmentRoute = getDepartmentRoute(department);
              navigate(departmentRoute);
            } else {
              setError("Department not specified");
            }
            break;
          default:
            setError("No dashboard configured for your role");
        }
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      
      if (err.code === 'ECONNABORTED') {
        setError("Connection timeout. Server may be down.");
      } else if (err.response) {
        if (err.response.status === 401) {
          setError("❌ Invalid email or password");
        } else {
          setError(err.response.data?.message || "Login failed");
        }
      } else if (err.request) {
        setError("❌ Cannot connect to server. Make sure backend is running on port 5000.");
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get department route based on HospitalStaff model
  const getDepartmentRoute = (department) => {
    const routes = {
      'Doctor': '/doctor-dashboard',
      'Nurse': '/nurse-dashboard',
      'Pharma': '/pharma-dashboard',
      'Lab': '/lab-dashboard',
      'Radio': '/radio-dashboard',
      'Midwife': '/midwife-dashboard',
      'Triage': '/triage-dashboard',
      'cardofffice': '/card-office-dashboard',
      'Bed_Management': '/bed-management-dashboard',
      'Human_Resource': '/hr-dashboard'
    };
    return routes[department] || '/staff-dashboard'; // Fallback
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-300 to-blue-200">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-5 rounded-full"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white opacity-5 rounded-full"></div>
      </div>

      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 m-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full mb-4 shadow-lg">
            <FaUserCircle className="text-white text-4xl" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-600 mt-2">National Health Management System</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@nhms.gov.et"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <FaEyeSlash className="text-gray-400 hover:text-gray-600" />
                ) : (
                  <FaEye className="text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-800 mb-2">Demo Accounts:</p>
      
        </div>

        <p className="mt-6 text-xs text-center text-gray-500">
          Secure access for authorized administrators only
        </p>
      </div>
    </div>
  );
};

export default Login;