// /src/pages/manager.js
import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import styles from './managerDashboard.module.css';
import { useHistory } from '@docusaurus/router';

export default function ManagerDashboard() {
  const [documents, setDocuments] = useState([]);
  const [filter, setFilter] = useState('All');
  const [expandedDocId, setExpandedDocId] = useState(null);
  const history = useHistory();

  useEffect(() => {
    const storedDocs = JSON.parse(localStorage.getItem('docs')) || [];
    setDocuments(storedDocs);

    const handleStorage = () => {
      const updatedDocs = JSON.parse(localStorage.getItem('docs')) || [];
      setDocuments(updatedDocs);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const saveApprovedToGitHub = async (doc) => {
    try {
      const repo = 'kuldeepyadav7664/docusaurus';
      const path = `docs/documents/${doc.title}.md`;
      const token = process.env.VITE_GITHUB_TOKEN;
      const content = btoa(unescape(encodeURIComponent(doc.content)));

      const url = `https://api.github.com/repos/${repo}/contents/${path}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Manager approved ${doc.title}`,
          content,
          committer: {
            name: "Manager",
            email: "manager@appsquadz.com"
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('GitHub Push Error:', error);
        alert('Failed to push approved document to GitHub');
      }
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  const handleApprove = (index, comment) => {
    const updatedDocs = [...documents];
    updatedDocs[index].status = 'Approved';
    updatedDocs[index].reviewComment = comment;
    updatedDocs[index].reviewedAt = new Date().toLocaleDateString();
    setDocuments(updatedDocs);
    localStorage.setItem('docs', JSON.stringify(updatedDocs));
    saveApprovedToGitHub(updatedDocs[index]);
  };

  const handleReject = (index, comment) => {
    const updatedDocs = [...documents];
    updatedDocs[index].status = 'Rejected';
    updatedDocs[index].reviewComment = comment;
    updatedDocs[index].reviewedAt = new Date().toLocaleDateString();
    setDocuments(updatedDocs);
    localStorage.setItem('docs', JSON.stringify(updatedDocs));
  };

  const filteredDocs =
    filter === 'All' ? documents : documents.filter((doc) => doc.status === filter);

  const getCount = (status) =>
    documents.filter((doc) => doc.status === status).length;

  const handleLogout = () => {
    localStorage.removeItem('managerLoggedIn');
    history.push('/login');
  };

  const toggleView = (docId) => {
    setExpandedDocId(expandedDocId === docId ? null : docId);
  };

  const handleDownload = (filename, content) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Layout title="Manager Dashboard">
      <main className={styles.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={styles.heading}>Manager Dashboard</h1>
            <p className={styles.subheading}>Review and manage documentation submissions</p>
          </div>
          <button onClick={handleLogout} className={styles.rejectBtn}>Logout</button>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div>Total Documents</div>
            <div className={styles.statNumber}>{documents.length}</div>
            <div className={styles.icon}>📄</div>
          </div>
          <div className={styles.statCard}>
            <div>Pending Review</div>
            <div className={styles.statNumber}>{getCount('Pending')}</div>
            <div className={styles.icon}>⏰</div>
          </div>
          <div className={styles.statCard}>
            <div>Approved</div>
            <div className={styles.statNumberApproved}>{getCount('Approved')}</div>
            <div className={styles.icon}>✅</div>
          </div>
          <div className={styles.statCard}>
            <div>Rejected</div>
            <div className={styles.statNumberRejected}>{getCount('Rejected')}</div>
            <div className={styles.icon}>❌</div>
          </div>
        </div>

        <div className={styles.filterButtons}>
          {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
            <button
              key={status}
              className={`${styles.filterBtn} ${filter === status ? styles.active : ''}`}
              onClick={() => setFilter(status)}>
              {status} ({status === 'All' ? documents.length : getCount(status)})
            </button>
          ))}
        </div>

        <section className={styles.section}>
          <h2>Documents</h2>
          {filteredDocs.length === 0 ? (
            <p>No documents found in this category.</p>
          ) : (
            filteredDocs.map((doc, index) => (
              <div key={index} className={styles.documentCard}>
                <div className={styles.docHeader}>
                  {doc.title} {doc.status === 'Pending' && <span>🟡</span>}
                </div>
                <div className={styles.docMeta}>
                  Author: {doc.author} | Category: {doc.category} <br />
                  Uploaded: {doc.uploadedAt} {doc.reviewedAt ? `| Reviewed: ${doc.reviewedAt}` : ''}
                </div>

                <div className={styles.actionButtons}>
                  <button
                    className={styles.approveBtn}
                    onClick={() => toggleView(doc.id)}>
                    {expandedDocId === doc.id ? 'Hide Document' : 'View Document'}
                  </button>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => handleDownload(`${doc.title}.md`, doc.content)}>
                    ⬇️ Download
                  </button>
                </div>

                {expandedDocId === doc.id && (
                  <pre className={styles.docPreview}>
                    {doc.content}
                  </pre>
                )}

                {doc.status === 'Pending' && (
                  <>
                    <textarea
                      className={styles.reviewTextarea}
                      placeholder="Add comments about your review decision..."
                      onChange={(e) => {
                        const updatedDocs = [...documents];
                        updatedDocs[index].tempComment = e.target.value;
                        setDocuments(updatedDocs);
                      }}
                    />
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.approveBtn}
                        onClick={() => handleApprove(index, doc.tempComment || '')}>
                        ✅ Approve
                      </button>
                      <button
                        className={styles.rejectBtn}
                        onClick={() => handleReject(index, doc.tempComment || '')}>
                        ❌ Reject
                      </button>
                    </div>
                  </>
                )}
                {doc.reviewComment && (
                  <div style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                    Manager Comment: {doc.reviewComment}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </main>
    </Layout>
  );
}
