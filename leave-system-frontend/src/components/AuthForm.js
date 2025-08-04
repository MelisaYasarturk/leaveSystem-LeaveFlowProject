import React, { useState } from 'react';
import API from '../api/api';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function AuthForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const res = await API.post('/auth/login', {
          email: form.email,
          password: form.password,
        });
        const { token, user } = res.data;

        localStorage.setItem('token', token);
        localStorage.setItem('role', user.role);
        localStorage.setItem('user', JSON.stringify(user));

        if (user.role === 'employee') navigate('/employee');
        else if (user.role === 'manager') navigate('/manager');
        else if (user.role === 'hr') navigate('/hr');
      } else {
        const res = await API.post('/auth/register', {
          name: form.name,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
        });
        alert(t('register_success'));
        setIsLogin(true);
      }
    } catch (err) {
      setError(err?.response?.data?.message || t('something_wrong'));
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-6 rounded-xl shadow-md space-y-4">
      {!isLogin && (
        <input
          type="text"
          name="name"
          placeholder={t('name')}
          value={form.name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
      )}
      <input
        type="email"
        name="email"
        placeholder={t('email')}
        value={form.email}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />
      <input
        type="password"
        name="password"
        placeholder={t('password')}
        value={form.password}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />
      {!isLogin && (
        <input
          type="password"
          name="confirmPassword"
          placeholder={t('confirm_password')}
          value={form.confirmPassword}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded w-full">
        {isLogin ? t('login') : t('register')}
      </button>
      <div className="flex justify-between text-sm">
        <p
          className="text-blue-600 cursor-pointer"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? t('no_account') : t('already_account')}
        </p>
        {isLogin && (
          <p
            className="text-blue-600 cursor-pointer"
            onClick={handleForgotPassword}
          >
            {t('forgot_password')}
          </p>
        )}
      </div>
    </form>
  );
}