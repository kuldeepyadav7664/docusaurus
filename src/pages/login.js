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
  const { customFields } = siteConfig;

  const handleLogin = (e) => {
    e.preventDefault();

    const authorEmail = customFields.authorEmail;
    const authorPass = customFields.authorPassword;
    const managerEmail = customFields.managerEmail;
    const managerPass = customFields.managerPassword;

    const isAuthor = role === 'Author' && email === authorEmail && password === authorPass;
    const isManager = role === 'Manager' && email === managerEmail && password === managerPass;

    if (isAuthor || isManager) {
      localStorage.setItem('role', role.toLowerCase());
      history.push(`/${role.toLowerCase()}`);
    } else {
      alert('Invalid credentials');
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
