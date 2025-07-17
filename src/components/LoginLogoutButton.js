import React, { useEffect, useState } from 'react';
import { useHistory } from '@docusaurus/router';

export default function LoginLogoutButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const history = useHistory();

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
  }, []);

  const handleClick = () => {
    if (isLoggedIn) {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('role');
      setIsLoggedIn(false);
      history.push('/');
    } else {
      history.push('/login');
    }
  };

  return (
    <button className="button button--primary margin-left--sm" onClick={handleClick}>
      {isLoggedIn ? 'Logout' : 'Login'}
    </button>
  );
}
