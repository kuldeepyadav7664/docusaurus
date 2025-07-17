import React, { useState } from 'react';
import Layout from '@theme/Layout';
import styles from './login.module.css';
import { useHistory } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function Login() {
  const [role, setRole] = useState('Author');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const history = useHistory();

  const { siteConfig } = useDocusaurusContext();

const handleLogin = async (e) => {
  e.preventDefault();

  const userRole = role.trim().toLowerCase(); // Convert to 'author' or 'manager'

  try {
    const response = await fetch('http://13.202.138.18:4000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: userRole }), // ✅ Added role
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || 'Login failed');
      return;
    }

    // ✅ Save login data
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role); // 'author' or 'manager'
    localStorage.setItem('email', data.email);
    localStorage.setItem('loginTime', Date.now());
    localStorage.setItem('username', data.email.split('@')[0]);

    // ✅ Redirect
    if (data.role === 'author') {
      history.push('/author');
    } else if (data.role === 'manager') {
      history.push('/manager');
    }

  } catch (error) {
    console.error('Login error:', error);
    alert('Something went wrong. Please try again.');
  }
};

  return (
    <Layout title="Login">
      <main className={styles.main}>
        <div className={styles.loginContainer}>
          <h2 className={styles.welcome}>Welcome Back</h2>
          <p className={styles.subtext}>Sign in to access your dashboard</p>
          <form onSubmit={handleLogin} className={styles.form}>
            <label className={styles.label}>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={styles.input}>
              <option value="Author">Author</option>
              <option value="Manager">Manager</option>
            </select>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              required
            />
            <label className={styles.label}>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
            />
            <button type="submit" className={styles.button}>Sign In</button>
          </form>
          <a href="/" className={styles.backLink}>← Back to home</a>
        </div>
      </main>
    </Layout>
  );
}
