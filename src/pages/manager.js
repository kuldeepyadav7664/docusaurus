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
  const githubToken = siteConfig.customFields.githubToken;
  const repo = 'kuldeepyadav7664/docusaurus';

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'manager') history.push('/login');
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDocuments = async () => {
    const fetchApprovedFiles = async () => {
      try {
        const res = await fetch(`https://api.github.com/repos/${repo}/contents/docs/documents`, {
          headers: { Authorization: `Bearer ${githubToken}` },
        });

        if (res.status === 404) return [];
        const files = await res.json();
        if (!Array.isArray(files)) return [];

        return Promise.all(
          files.filter(f => f.name.endsWith('.md') && f.download_url).map(async file => {
            const res = await fetch(file.download_url);
            const content = await res.text();
            return {
              id: file.sha,
              title: file.name.replace('.md', ''),
              status: 'Approved',
              uploadedAt: '-',
              reviewedAt: new Date().toLocaleDateString(),
              reviewComment: 'Approved on GitHub',
              author: '-',
              content,
              filename: file.name,
              sha: file.sha,
              source: 'docs/documents',
            };
          })
        );
      } catch (err) {
        console.error(`Error fetching approved documents:`, err);
        return [];
      }
    };

    const approvedDocs = await fetchApprovedFiles();

    const fetchPendingFiles = async () => {
      try {
        const res = await fetch(`https://api.github.com/repos/${repo}/contents/pending-documents`, {
          headers: { Authorization: `Bearer ${githubToken}` },
        });

        if (res.status === 404) return [];
        const files = await res.json();
        if (!Array.isArray(files)) return [];

        return Promise.all(
          files.filter(f => f.name.endsWith('.md') && f.download_url).map(async file => {
            const res = await fetch(file.download_url);
            const content = await res.text();
            const isDuplicate = approvedDocs.some(ad => ad.filename === file.name);
            return {
              id: file.sha,
              title: file.name.replace('.md', ''),
              status: 'Pending',
              uploadedAt: '-',
              reviewedAt: '-',
              reviewComment: 'Awaiting review',
              author: '-',
              content,
              filename: file.name,
              sha: file.sha,
              source: 'pending-documents',
              duplicate: isDuplicate,
            };
          })
        );
      } catch (err) {
        console.error(`Error fetching pending documents:`, err);
        return [];
      }
    };

    const pendingDocs = await fetchPendingFiles();

    const storedDocs = JSON.parse(localStorage.getItem('docs') || '[]');
    const rejectedDocs = storedDocs.filter(d => d.status === 'Rejected');

    const docs = [...pendingDocs, ...approvedDocs, ...rejectedDocs];
    setDocuments(docs);
    localStorage.setItem('docs', JSON.stringify(docs));
    window.dispatchEvent(new Event('storage'));
  };

  const deleteFromPending = async (filename, sha) => {
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
          sha,
          committer: { name: 'Manager', email: 'manager@appsquadz.com' },
        })
      });
    } catch (err) {
      console.error('Error deleting file from pending-documents:', err);
    }
  };

  const saveApprovedToGitHub = async (doc) => {
    const path = `docs/documents/${doc.title}.md`;
    const url = `https://api.github.com/repos/${repo}/contents/${path}`;

    const check = await fetch(url, {
      headers: { Authorization: `Bearer ${githubToken}` }
    });

    let sha;
    if (check.status === 200) {
      const confirm = window.confirm(`⚠️ ${doc.title}.md already exists. Overwrite?`);
      if (!confirm) return false;
      const data = await check.json();
      sha = data.sha;
    }

    const content = btoa(unescape(encodeURIComponent(doc.content)));
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Manager approved ${doc.title}`,
        content,
        sha,
        committer: { name: 'Manager', email: 'manager@appsquadz.com' },
      })
    });

    if (!res.ok) {
      console.error('GitHub Push Error:', await res.json());
      alert('Failed to push approved document to GitHub');
      return false;
    }

    await deleteFromPending(doc.filename, doc.sha);
    return true;
  };

  const handleApprove = async (index, comment) => {
    const doc = documents[index];
    const success = await saveApprovedToGitHub(doc);
    if (!success) return;
    await fetchDocuments();
  };

  const handleReject = async (index, comment) => {
    const doc = documents[index];
    await deleteFromPending(doc.filename, doc.sha);

    const rejectedDoc = {
      ...doc,
      status: 'Rejected',
      reviewedAt: new Date().toLocaleDateString(),
      reviewComment: comment || 'Rejected',
    };

    const storedDocs = JSON.parse(localStorage.getItem('docs') || '[]');
    localStorage.setItem('docs', JSON.stringify([...storedDocs, rejectedDoc]));
    await fetchDocuments();
  };

  const filteredDocs = filter === 'All' ? documents : documents.filter(d => d.status === filter);
  const getCount = status => documents.filter(d => d.status === status).length;

  return (
    <Layout title="Manager Dashboard">
      <main className={styles.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={styles.heading}>Manager Dashboard</h1>
            <p className={styles.subheading}>Review and manage documentation submissions</p>
          </div>
          <button onClick={() => { localStorage.removeItem('role'); history.push('/login'); }} className={styles.rejectBtn}>Logout</button>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}><div>Total Documents</div><div className={styles.statNumber}>{documents.length}</div></div>
          <div className={styles.statCard}><div>Pending</div><div className={styles.statNumber}>{getCount('Pending')}</div></div>
          <div className={styles.statCard}><div>Approved</div><div className={styles.statNumberApproved}>{getCount('Approved')}</div></div>
          <div className={styles.statCard}><div>Rejected</div><div className={styles.statNumberRejected}>{getCount('Rejected')}</div></div>
        </div>

        <div className={styles.filterButtons}>
          {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
            <button key={status} className={`${styles.filterBtn} ${filter === status ? styles.active : ''}`} onClick={() => setFilter(status)}>
              {status} ({status === 'All' ? documents.length : getCount(status)})
            </button>
          ))}
        </div>

        <section className={styles.section}>
          <h2>Documents</h2>
          {filteredDocs.length === 0 ? <p>No documents found.</p> : filteredDocs.map((doc, index) => (
            <div key={index} className={styles.documentCard}>
              <div className={styles.docHeader}>
                {doc.title} {doc.status === 'Pending' && '🟡'}
                {doc.duplicate && doc.status === 'Pending' && (
                  <span style={{ color: 'red', fontWeight: 'bold', marginLeft: '0.5rem' }}>
                    ⚠️ Duplicate of approved
                  </span>
                )}
              </div>
              <div className={styles.docMeta}>Author: {doc.author} | Uploaded: {doc.uploadedAt} | Reviewed: {doc.reviewedAt}</div>

              <div className={styles.actionButtons}>
                <button className={styles.approveBtn} onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}>
                  {expandedDocId === doc.id ? 'Hide Document' : 'View Document'}
                </button>
                <button className={styles.rejectBtn} onClick={() => {
                  const blob = new Blob([doc.content], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${doc.title}.md`;
                  a.click();
                }}>⬇️ Download</button>
              </div>

              {expandedDocId === doc.id && (
                <pre className={styles.docPreview}>{doc.content}</pre>
              )}

              {doc.status === 'Pending' && (
                <>
                  <textarea className={styles.reviewTextarea} placeholder="Add comments about your review decision..." onChange={(e) => {
                    const updatedDocs = [...documents];
                    updatedDocs[index].tempComment = e.target.value;
                    setDocuments(updatedDocs);
                  }} />
                  <div className={styles.actionButtons}>
                    <button className={styles.approveBtn} onClick={() => handleApprove(index, doc.tempComment || '')}>✅ Approve</button>
                    <button className={styles.rejectBtn} onClick={() => handleReject(index, doc.tempComment || '')}>❌ Reject</button>
                  </div>
                </>
              )}

              {doc.reviewComment && (
                <div style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                  Manager Comment: {doc.reviewComment}
                </div>
              )}
            </div>
          ))}
        </section>
      </main>
    </Layout>
  );
}
