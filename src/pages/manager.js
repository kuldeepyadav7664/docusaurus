// /src/pages/manager.js
import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import styles from './managerDashboard.module.css';
import { useHistory } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function ManagerDashboard() {
  const [documents, setDocuments] = useState([]);
  const [filter, setFilter] = useState('All');
  const [expandedDocId, setExpandedDocId] = useState(null);
  const history = useHistory();
  const { siteConfig } = useDocusaurusContext();

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'manager') {
      history.push('/login');
      return;
    }

    const repo = 'kuldeepyadav7664/docusaurus';
    const githubToken = siteConfig.customFields.githubToken;

    async function fetchDocs() {
      const fetchFiles = async (path, status) => {
        try {
          const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
            headers: { Authorization: `Bearer ${githubToken}` }
          });

          if (res.status === 404) return [];

          const files = await res.json();

          return Promise.all(
            files.filter(f => f.name.endsWith('.md')).map(async (file) => {
              const res = await fetch(file.download_url);
              const content = await res.text();
              return {
                id: file.sha,
                title: file.name.replace('.md', ''),
                status,
                uploadedAt: '-',
                reviewedAt: status === 'Approved' ? new Date().toLocaleDateString() : '-',
                reviewComment: status === 'Approved' ? 'Approved on GitHub' : 'Awaiting review',
                author: 'Unknown',
                content,
                filename: file.name,
                sha: file.sha
              };
            })
          );
        } catch (err) {
          console.error(`Error fetching ${path}:`, err);
          return [];
        }
      };

      const [pendingDocs, approvedDocs] = await Promise.all([
        fetchFiles('pending-documents', 'Pending'),
        fetchFiles('docs/documents', 'Approved')
      ]);

      const storedDocs = JSON.parse(localStorage.getItem('docs') || '[]');
      const rejectedDocs = storedDocs.filter(d => d.status === 'Rejected');

      const docs = [...pendingDocs, ...approvedDocs, ...rejectedDocs];
      setDocuments(docs);
      localStorage.setItem('docs', JSON.stringify(docs));
      window.dispatchEvent(new Event('storage'));
    }

    fetchDocs();
    const interval = setInterval(fetchDocs, 30000);
    return () => clearInterval(interval);
  }, []);

  const deleteFromPending = async (filename, sha) => {
    const repo = 'kuldeepyadav7664/docusaurus';
    const githubToken = siteConfig.customFields.githubToken;
    const url = `https://api.github.com/repos/${repo}/contents/pending-documents/${filename}`;

    try {
      await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Remove ${filename} after review`,
          sha: sha,
          committer: {
            name: "Manager",
            email: "manager@appsquadz.com"
          }
        })
      });
    } catch (err) {
      console.error('Error deleting file from pending-documents:', err);
    }
  };

  const saveApprovedToGitHub = async (doc) => {
    try {
      const repo = 'kuldeepyadav7664/docusaurus';
      const path = `docs/documents/${doc.title}.md`;
      const githubToken = siteConfig.customFields.githubToken;
      const content = btoa(unescape(encodeURIComponent(doc.content)));

      const url = `https://api.github.com/repos/${repo}/contents/${path}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${githubToken}`,
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
        return;
      }

      await deleteFromPending(doc.filename, doc.sha);
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  const handleApprove = async (index, comment) => {
    const updatedDocs = [...documents];
    const doc = updatedDocs[index];
    doc.status = 'Approved';
    doc.reviewComment = comment;
    doc.reviewedAt = new Date().toLocaleDateString();
    await saveApprovedToGitHub(doc);

    const remainingDocs = updatedDocs.filter((_, i) => i !== index);
    const newDocs = [...remainingDocs, doc];
    setDocuments(newDocs);
    localStorage.setItem('docs', JSON.stringify(newDocs));
    window.dispatchEvent(new Event('storage'));
  };

  const handleReject = async (index, comment) => {
    const updatedDocs = [...documents];
    const doc = updatedDocs[index];
    doc.status = 'Rejected';
    doc.reviewComment = comment;
    doc.reviewedAt = new Date().toLocaleDateString();
    await deleteFromPending(doc.filename, doc.sha);

    const remainingDocs = updatedDocs.filter((_, i) => i !== index);
    const newDocs = [...remainingDocs, doc];
    setDocuments(newDocs);
    localStorage.setItem('docs', JSON.stringify(newDocs));
    window.dispatchEvent(new Event('storage'));
  };

  const filteredDocs =
    filter === 'All' ? documents : documents.filter((doc) => doc.status === filter);

  const getCount = (status) =>
    documents.filter((doc) => doc.status === status).length;

  const handleLogout = () => {
    localStorage.removeItem('role');
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
                  Author: {doc.author} | Uploaded: {doc.uploadedAt} {doc.reviewedAt ? `| Reviewed: ${doc.reviewedAt}` : ''}
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
                  <pre className={styles.docPreview}>{doc.content}</pre>
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
