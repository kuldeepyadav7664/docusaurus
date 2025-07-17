import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import {
  useThemeConfig,
  ErrorCauseBoundary,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import {
  splitNavbarItems,
  useNavbarMobileSidebar,
} from '@docusaurus/theme-common/internal';
import NavbarItem from '@theme/NavbarItem';
import NavbarColorModeToggle from '@theme/Navbar/ColorModeToggle';
import SearchBar from '@theme/SearchBar';
import NavbarMobileSidebarToggle from '@theme/Navbar/MobileSidebar/Toggle';
import NavbarLogo from '@theme/Navbar/Logo';
import NavbarSearch from '@theme/Navbar/Search';
import styles from './styles.module.css';
import './navbarAuth.css'; // ✅ Your custom login/logout styles

// ✅ Grab navbar items from config
function useNavbarItems() {
  return useThemeConfig().navbar.items;
}

// ✅ Render each NavbarItem with error handling
function NavbarItems({ items }) {
  return (
    <>
      {items.map((item, i) => (
        <ErrorCauseBoundary
          key={i}
          onError={(error) =>
            new Error(
              `A theme navbar item failed to render.
Please double-check the following navbar item (themeConfig.navbar.items) of your Docusaurus config:
${JSON.stringify(item, null, 2)}`,
              { cause: error },
            )
          }>
          <NavbarItem {...item} />
        </ErrorCauseBoundary>
      ))}
    </>
  );
}

// ✅ Layout for left and right aligned navbar sections
function NavbarContentLayout({ left, right }) {
  return (
    <div className="navbar__inner">
      <div
        className={clsx(
          ThemeClassNames.layout.navbar.containerLeft,
          'navbar__items',
        )}>
        {left}
      </div>
      <div
        className={clsx(
          ThemeClassNames.layout.navbar.containerRight,
          'navbar__items navbar__items--right',
        )}>
        {right}
      </div>
    </div>
  );
}

// ✅ Main NavbarContent with Login/Logout logic injected
export default function NavbarContent() {
  const mobileSidebar = useNavbarMobileSidebar();
  const items = useNavbarItems();
  const [leftItems, rightItems] = splitNavbarItems(items);
  const searchBarItem = items.find((item) => item.type === 'search');

const [isLoggedIn, setIsLoggedIn] = useState(false);
const [username, setUsername] = useState('');

 useEffect(() => {
  const checkLoginStatus = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('username');
    setIsLoggedIn(!!token);
    setUsername(user || '');
  };

  checkLoginStatus(); // initial

  window.addEventListener('storage', checkLoginStatus);
  return () => window.removeEventListener('storage', checkLoginStatus);
}, []);



const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  localStorage.removeItem('email');
  localStorage.removeItem('loginTime');
  setIsLoggedIn(false);
  window.location.href = '/';
};

 const authButton = isLoggedIn ? (
  <div className="navbar-auth-group">
    <span className="navbar-auth-username">Hello, {username}</span>
    <button onClick={handleLogout} className="navbar-auth-button">
      Logout
    </button>
  </div>
) : (
  <a href="/login" className="navbar-auth-button">
    Login
  </a>
);

  return (
    <NavbarContentLayout
      left={
        <>
          {!mobileSidebar.disabled && <NavbarMobileSidebarToggle />}
          <NavbarLogo />
          <NavbarItems items={leftItems} />
        </>
      }
      right={
        <>
          <NavbarItems items={rightItems} />
          <NavbarColorModeToggle className={styles.colorModeToggle} />
          {!searchBarItem && (
            <NavbarSearch>
              <SearchBar />
            </NavbarSearch>
          )}
          {authButton}
        </>
      }
    />
  );
}
