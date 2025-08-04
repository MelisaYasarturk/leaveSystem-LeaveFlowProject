import React, { useState } from "react";
import imageLogin from "./image_login.png"; // Ensure this points to the correct image
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from "../components/LanguageSwitcher";
import { jwtDecode } from 'jwt-decode';
import API from '../api/api';
import { useNavigate } from 'react-router-dom';

/*import AuthForm from '../components/AuthForm'; // az sonra oluşturacağın bileşen
export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center px-4 py-10 text-gray-700">
      <AuthForm />
    </div>
  );
}
*/


export default function LoginRegisterToggle() {
  const navigate = useNavigate();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState({
    login: false,
    register: false,
    registerConfirm: false,
  });
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);




    const { t } = useTranslation();
  const handleLogin = async (e) => {
  e.preventDefault();

  try {
    const response = await API.post('/auth/login', {
      email: loginEmail,
      password: loginPassword,
    });

    const data = response.data;
    const token = data.token;
    
    if (rememberMe) {
      localStorage.setItem('token', token);
    } else {
      sessionStorage.setItem('token', token);
}

    localStorage.setItem('token', token);

    localStorage.setItem('userId', response.data.user.id);

    const decoded = jwtDecode(token);
    const role = decoded.role;

    // Role göre yönlendirme
    if (role === 'employee') navigate('/employee');
    else if (role === 'manager') navigate('/manager');
    else if (role === 'hr') navigate('/hr');
    else navigate('/');
  } catch (error) {
    console.error('Login error:', error.response?.data?.message || error.message);
    alert(error.response?.data?.message || 'Login error');
  }
};


const handleRegister = async (e) => {
  e.preventDefault();

  if (!registerName || !registerEmail || !registerPassword || !registerConfirmPassword) {
  alert('Tüm alanları doldurun!');
  return;
}
if (registerPassword !== registerConfirmPassword) {
  alert('Şifreler eşleşmiyor!');
  return;
}


  try {
    const response = await API.post('/auth/register', {
      name: registerName,
      email: registerEmail,
      password: registerPassword,
    });

    alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
    setIsLogin(true);
  } catch (error) {
    console.error('Register error:', error.response?.data?.message || error.message);
    alert(error.response?.data?.message || 'Register error');
  }
};




  return (
  <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center px-4 py-10 text-gray-700">
      <h1 className="text-4xl md:text-5xl  text-center text-green-700 mb-12">
  {/*{t('hero_title')}*/}
  Professional Leave Management Platform
</h1>

      <div className="flex w-full max-w-3xl bg-white rounded-xl shadow-lg overflow-hidden">
        
        {/* Image Section */}
        <div className="flex-1 flex flex-col items-center py-8 px-6">
          <img src={imageLogin} alt="Login Visual" className="mb-4 w-full max-w-md" />
          <h2 className="text-lg font-medium text-center">Sustainable Solutions</h2>
          <p className="text-sm text-gray-500 text-center">
           {/* {t('image_text')}*/}
           Streamline leave management with a smart, efficient, and user-friendly system tailored for modern workplaces.
          </p>
        </div>

{/* Login/Register Form Section */}
<div className="w-1/2 p-6">
  <div className="flex border-b border-gray-200 mb-4">
    <button
      onClick={() => setIsLogin(true)}
      className={`flex-grow py-3 font-semibold text-sm rounded-t-xl focus:outline-none transition ${
        isLogin ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-800 hover:bg-blue-600 hover:text-white"
      }`}
      aria-pressed={isLogin}
    >
      Login
    </button>
    <button
      onClick={() => setIsLogin(false)}
      className={`flex-grow py-3 font-semibold text-sm rounded-t-xl focus:outline-none transition ${
        !isLogin ? "bg-green-600 text-white" : "bg-gray-50 text-gray-800 hover:bg-green-600 hover:text-white"
      }`}
      aria-pressed={!isLogin}
    >
      New Account
    </button>
  </div>

  {/* Form */}
  <form
    onSubmit={isLogin ? handleLogin : handleRegister}
    className="space-y-6"
  >
    {isLogin ? (
      <>
        <div className="text-center">
          <h2 className="text-lg font-medium">Welcome Back</h2>
          <p className="text-sm text-gray-600">
            Access your leave dashboard and manage requests
          </p>
        </div>

        <label className="block">
          <span className="font-semibold text-gray-700">Email</span>
          <input
            type="email"
            required
            placeholder="employee@company.com"
            className="w-full border border-gray-300 rounded-md p-2 mt-1"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="font-semibold text-gray-700">Password</span>
          <input
            type={showPassword.login ? "text" : "password"}
            required
            placeholder="********"
            className="w-full border border-gray-300 rounded-md p-2 mt-1"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
          />
        </label>

        <div className="flex items-center justify-between">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span className="ml-2">Remember me</span>
          </label>
          <button
            type="button"
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Forgot password clicked from top link');
              navigate('/forgot-password');
            }}
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-md"
        >
          Access Dashboard
        </button>
      </>
    ) : (
      <>
        <div className="text-center">
          <h2 className="text-lg font-medium">Create Your Account</h2>
          <p className="text-sm text-gray-600">
            Join the leave management system
          </p>
        </div>

        <label className="block">
          <span className="font-semibold text-gray-700">Name</span>
          <input
            type="text"
            required
            placeholder="Your Name"
            className="w-full border border-gray-300 rounded-md p-2 mt-1"
            value={registerName}
            onChange={(e) => setRegisterName(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="font-semibold text-gray-700">Email</span>
          <input
            type="email"
            required
            placeholder="you@company.com"
            className="w-full border border-gray-300 rounded-md p-2 mt-1"
            value={registerEmail}
            onChange={(e) => setRegisterEmail(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="font-semibold text-gray-700">Password</span>
          <input
            type={showPassword.register ? "text" : "password"}
            required
            placeholder="********"
            className="w-full border border-gray-300 rounded-md p-2 mt-1"
            value={registerPassword}
            onChange={(e) => setRegisterPassword(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="font-semibold text-gray-700">Confirm Password</span>
          <input
            type={showPassword.register ? "text" : "password"}
            required
            placeholder="********"
            className="w-full border border-gray-300 rounded-md p-2 mt-1"
            value={registerConfirmPassword}
            onChange={(e) => setRegisterConfirmPassword(e.target.value)}
          />
        </label>

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-3 rounded-md"
        >
          Register Account
        </button>
      </>
    )}
  </form>

  {/* Forgot Password Link - Form dışında */}
  {isLogin && (
    <div className="mt-4 text-center">
      <button
        type="button"
        className="text-blue-600 hover:text-blue-800 text-sm underline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Forgot password clicked');
          navigate('/forgot-password');
        }}
      >
        {t('forgot_password')}
      </button>
    </div>
  )}
</div>

      </div>

      {/* Footer Section */}
      <><div className="mt-10 max-w-md text-center text-gray-600 text-sm">
    {/* <p>
        &copy; {new Date().getFullYear()} {t('app_name')}. {t('rights_reserved')}
     </p>*/}
  </div><div className="mt-10 max-w-md text-center text-gray-600 text-sm">
      <p className="mb-8">
        Complete leave management solution for modern workplaces
      </p>

      <div className="grid grid-cols-4 gap-4 mb-6 text-gray-700">
        <div className="flex flex-col items-center text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-green-600 mb-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10m-6 4h2" />
          </svg>
          <span className="text-xs">Submit Requests</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-blue-700 mb-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs">Quick Answer</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-orange-400 mb-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          <span className="text-xs">Real-time Tracking</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-purple-600 mb-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17v-6a2 2 0 012-2h3" />
          </svg>
          <span className="text-xs">Detailed Reports</span>
        </div>
      </div>

      <div className="text-xs mb-2 text-gray-500">
        <div className="inline-flex space-x-4">
          <span className="flex items-center space-x-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7v4c0 1.104.896 2 2 2h2m0 0h8a2 2 0 002-2v-4m-2-2v4m0 0v8m0-8H7" />
            </svg>
            <span>Multi-Department</span>
          </span>
          <span className="flex items-center space-x-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M9 10h.01M15 10h.01M12 14a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
            <span>Team Management</span>
          </span>
          <span className="flex items-center space-x-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>24/7 Access</span>
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Powering the future with clean, renewable energy
      </p>

      <div className="flex justify-center space-x-8 text-sm font-semibold">
        <span className="text-orange-500 flex items-center space-x-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v9m0 0l3-3m-3 3l-3-3m3 3a9 9 0 110 6m-7-6H4m16 0h-1m-3 3h-3" />
          </svg>
          <span>Solar</span>
        </span>
        <span className="text-blue-700 flex items-center space-x-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Energy</span>
        </span>
        <span className="text-green-600 flex items-center space-x-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7" />
          </svg>
          <span>Green</span>
        </span>
      </div>
    </div></>
    </div>
  );
}
