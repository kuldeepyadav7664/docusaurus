// /src/pages/author.js
import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import styles from './authorDashboard.module.css';
import { useHistory } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import BrowserOnly from '@docusaurus/BrowserOnly';

function AuthorDashboard() {
  const history = useHistory();
  const { siteConfig } = useDocusaurusContext();
  const githubToken = siteConfig.customFields.githubToken;
  const repo = 'kuldeepyadav7664/docusaurus';

  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [expandedDocId, setExpandedDocId] = useState(null);

  const username = localStorage.getItem('username') || 'Unknown';

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'author') history.push('/login');
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchFiles = async (path, status) => {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        headers: { Authorization: `Bearer ${githubToken}` },
      });
      if (res.status === 404) return [];
      const files = await res.json();
      if (!Array.isArray(files)) return [];

      return Promise.all(
        files.filter(f => f.name.endsWith('.md')).map(async file => {
          const res = await fetch(file.download_url);
          const content = await res.text();
          return {
            id: file.sha,
            title: file.name.replace('.md', ''),
            status,
            uploadedAt: '-',
            reviewedAt: status !== 'Pending' ? new Date().toLocaleDateString() : '-',
            reviewComment: status === 'Rejected' ? 'Rejected' : (status === 'Approved' ? 'Approved' : 'Awaiting review'),
            author: username,
            content,
            filename: file.name,
            sha: file.sha,
          };
        })
      );
    } catch (err) {
      console.error(`Error fetching ${path}:`, err);
      return [];
    }
  };

  const fetchDocuments = async () => {
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
  };

  const handleUpload = async () => {
    if (!file) return alert('Please select a Markdown (.md) file');
    if (!file.name.endsWith('.md')) return alert('Only .md files are allowed');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      const encodedContent = btoa(unescape(encodeURIComponent(content)));
      const path = `pending-documents/${file.name}`;
      const url = `https://api.github.com/repos/${repo}/contents/${path}`;

      const newDoc = {
        title: file.name.replace('.md', ''),
        author: username,
        content,
      };

      const check = await fetch(url, { headers: { Authorization: `Bearer ${githubToken}` } });
      if (check.status === 200) {
        const confirm = window.confirm(`⚠️ ${file.name} already exists. Overwrite?`);
        if (!confirm) return;
        const existing = await check.json();
        newDoc.sha = existing.sha;
      }

      try {
        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Upload document for review: ${file.name}`,
            content: encodedContent,
            sha: newDoc.sha,
            committer: {
              name: username,
              email: `${username.toLowerCase()}@appsquadz.com`
            }
          })
        });

        if (!res.ok) throw new Error('GitHub upload failed');

        alert('✅ Document uploaded and sent for review');
        fetchDocuments();
      } catch (err) {
        console.error('Upload error:', err);
        alert('❌ Upload failed');
      }
    };
    reader.readAsText(file);
  };

  const toggleView = (docId) => setExpandedDocId(expandedDocId === docId ? null : docId);

  const statusCounts = documents.reduce(
    (acc, doc) => {
      acc.total++;
      acc[doc.status.toLowerCase()]++;
      return acc;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0 }
  );

  return (
    <Layout title="Author Dashboard">
      <main className={styles.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{width: '100%'}}>
            <h1 className={styles.heading}>Author Dashboard</h1>
            <h3 className={styles.subheading}>Welcome back, <span style={{color: '#10b981', fontSize: '30px'}}>{username}</span></h3>
          </div>
          <button onClick={() => { localStorage.removeItem('role'); history.push('/login'); }} className={styles.rejectBtn}>Logout</button>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}><div>Total</div><div className={styles.statNumber}>{statusCounts.total}</div></div>
          <div className={styles.statCard}><div>Pending</div><div className={styles.statNumber}>{statusCounts.pending}</div></div>
          <div className={styles.statCard}><div>Approved</div><div className={styles.statNumberApproved}>{statusCounts.approved}</div></div>
          <div className={styles.statCard}><div>Rejected</div><div className={styles.statNumberRejected}>{statusCounts.rejected}</div></div>
        </div>

        <div className={styles.fileUploadContainer}>
          <label htmlFor="file-upload" className={styles.fileLabel}>📁 Choose Markdown File</label>
          <input
            id="file-upload"
            type="file"
            accept=".md"
            onChange={(e) => setFile(e.target.files[0])}
            className={styles.customFileInput}
          />
          <button className={styles.uploadBtn} onClick={handleUpload}>Upload Document</button>
        </div>

        <section className={styles.documentSection}>
          <h2>My Documents</h2>
          {documents.filter(doc => doc.author === username).map((doc, index) => (
            <div key={index} className={styles.documentCard}>
              <div className={styles.docHeader}>
                <span>{doc.status === 'Approved' ? '✅' : doc.status === 'Rejected' ? '❌' : '⏳'}</span>
                <span className={styles.docTitle}>{doc.title}</span>
                <span className={styles.docStatus}>{doc.status}</span>
              </div>
              <div className={styles.docMeta}>Uploaded: {doc.uploadedAt} | Reviewed: {doc.reviewedAt}</div>
              <div className={styles.docComment}><strong>Comments:</strong> {doc.reviewComment}</div>
              <button className={styles.uploadBtn} onClick={() => toggleView(doc.id)}>
                {expandedDocId === doc.id ? 'Hide' : 'View'} Document
              </button>
              {expandedDocId === doc.id && <pre className={styles.docPreview}>{doc.content}</pre>}
            </div>
          ))}
        </section>
      </main>
    </Layout>
  );
}

export default function AuthorPageWrapper() {
  return (
    <BrowserOnly fallback={<div>Loading Author Dashboard...</div>}>
      {() => <AuthorDashboard />}
    </BrowserOnly>
  );
}
