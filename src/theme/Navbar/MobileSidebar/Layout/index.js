import React, { version, useEffect, useState } from 'react';
import './mobileAuth.css';
import clsx from 'clsx';
import { useNavbarSecondaryMenu } from '@docusaurus/theme-common/internal';
import { ThemeClassNames } from '@docusaurus/theme-common';

function inertProps(inert) {
  const isBeforeReact19 = parseInt(version.split('.')[0], 10) < 19;
  if (isBeforeReact19) {
    return { inert: inert ? '' : undefined };
  }
  return { inert };
}

function NavbarMobileSidebarPanel({ children, inert }) {
  return (
    <div
      className={clsx(
        ThemeClassNames.layout.navbar.mobileSidebar.panel,
        'navbar-sidebar__item menu'
      )}
      {...inertProps(inert)}
    >
      {children}
    </div>
  );
}

export default function NavbarMobileSidebarLayout({
  header,
  primaryMenu,
  secondaryMenu,
}) {
  const { shown: secondaryMenuShown } = useNavbarSecondaryMenu();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const name = localStorage.getItem('username');
    setIsLoggedIn(!!token);
    setUsername(name || '');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    window.location.href = '/';
  };

  return (
    <div
      className={clsx(
        ThemeClassNames.layout.navbar.mobileSidebar.container,
        'navbar-sidebar'
      )}
    >
      {header}
      <div
        className={clsx('navbar-sidebar__items', {
          'navbar-sidebar__items--show-secondary': secondaryMenuShown,
        })}
      >
        <NavbarMobileSidebarPanel inert={secondaryMenuShown}>
          {primaryMenu}
        </NavbarMobileSidebarPanel>
        <NavbarMobileSidebarPanel inert={!secondaryMenuShown}>
          {secondaryMenu}
        </NavbarMobileSidebarPanel>
      </div>

      {/* ✅ Footer with login/logout */}
      <div className="navbar-sidebar__footer">
        <div className="mobile-auth">
          {isLoggedIn ? (
            <>
              <div className="mobile-auth-username">Hello, {username}</div>
              <button onClick={handleLogout} className="mobile-auth-button">
                Logout
              </button>
            </>
          ) : (
            <a href="/login" className="mobile-auth-button">
              Login
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
