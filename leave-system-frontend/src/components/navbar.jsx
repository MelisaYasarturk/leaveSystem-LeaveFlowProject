import React from 'react';
import { useTranslation } from 'react-i18next';
import './navbar.css';
import { Link } from 'react-router-dom';


const Navbar = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  return (
  <nav className="sticky top-0 z-50">
    <ul className="flex justify-between items-center">
      <div className="flex space-x-4">
          <li>
            <Link to="/" className="hover:underline">{t('home')}</Link>
          </li>
          <li>
            <Link to="/login" className="hover:underline">{t('login')}</Link>
          </li>
          <li>
            <Link to="/register" className="hover:underline">{t('register')}</Link>
          </li>
        </div>

        {/* Dil değiştirme butonları sağda */}
        <div className="flex space-x-2">
          <button
            onClick={() => changeLanguage('en')}
            className="px-2 py-1 border rounded hover:bg-gray-200"
          >
            EN
          </button>
          <button
            onClick={() => changeLanguage('tr')}
            className="px-2 py-1 border rounded hover:bg-gray-200"
          >
            TR
          </button>
        </div>
      </ul>
    </nav>
  );
};



  /*return (
    <nav>
      <ul>
        <li>
          <Link to="/">{t('home')}</Link>
        </li>
        <li>
          <Link to="/leave-requests">{t('leaveRequests')}</Link>
        </li>
        <li>
          <Link to="/history">{t('history')}</Link>
        </li>
        <li>
          <button onClick={() => changeLanguage('en')}>EN</button>
          <button onClick={() => changeLanguage('tr')}>TR</button>
        </li>
      </ul>
    </nav>
  );*/


export default Navbar;
