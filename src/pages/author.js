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

  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [expandedDocId, setExpandedDocId] = useState(null);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'author') {
      history.push('/login');
      return;
    }

    const fetchApprovedDocs = async () => {
      const repo = 'kuldeepyadav7664/docusaurus';
      const path = 'docs/documents';

      try {
        const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
          headers: {
            Authorization: `Bearer ${githubToken}`,
          },
        });

        if (!res.ok) {
          console.error('Failed to fetch from GitHub:', await res.text());
          return;
        }

        const files = await res.json();

        const approvedDocs = await Promise.all(
          files
            .filter((f) => f.name.endsWith('.md'))
            .map(async (file) => {
              const contentRes = await fetch(file.download_url);
              const content = await contentRes.text();

              return {
                id: file.sha,
                title: file.name.replace('.md', ''),
                category: 'uncategorized',
                status: 'Approved',
                uploadedAt: '-', // Placeholder
                reviewedAt: new Date().toLocaleDateString(),
                reviewComment: 'Approved on GitHub',
                author: 'Unknown',
                content,
              };
            })
        );

        setDocuments(approvedDocs);
        localStorage.setItem('docs', JSON.stringify(approvedDocs));
      } catch (error) {
        console.error('GitHub fetch error:', error);
      }
    };

    fetchApprovedDocs();

    const handleStorage = () => {
      const updatedDocs = JSON.parse(localStorage.getItem('docs')) || [];
      setDocuments(updatedDocs);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const statusCounts = documents.reduce(
    (acc, doc) => {
      acc.total++;
      acc[doc.status.toLowerCase()]++;
      return acc;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0 }
  );

  const handleUpload = async () => {
    if (!file) return alert('Please select a Markdown (.md) file');
    if (!file.name.endsWith('.md')) {
      alert('Only .md files are allowed');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      const newDoc = {
        id: Date.now(),
        title: file.name.replace('.md', ''),
        category: 'uncategorized',
        status: 'Pending',
        uploadedAt: new Date().toLocaleDateString(),
        reviewedAt: '-',
        reviewComment: 'Awaiting review',
        author: localStorage.getItem('username') || 'Unknown',
        content,
      };

      const repo = 'kuldeepyadav7664/docusaurus';
      const path = `pending-documents/${file.name}`;
      const encodedContent = btoa(unescape(encodeURIComponent(content)));

      try {
        const url = `https://api.github.com/repos/${repo}/contents/${path}`;
        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Upload document for review: ${file.name}`,
            content: encodedContent,
            committer: {
              name: newDoc.author,
              email: `${newDoc.author.toLowerCase()}@appsquadz.com`,
            },
          }),
        });

        if (res.status === 422) {
          alert('❌ File already exists. Please rename your file and try again.');
          return;
        }

        if (!res.ok) {
          const error = await res.json();
          console.error('GitHub upload failed:', error);
          alert('❌ Failed to upload document to GitHub');
          return;
        }

        const updatedDocs = [newDoc, ...documents];
        setDocuments(updatedDocs);
        localStorage.setItem('docs', JSON.stringify(updatedDocs));
        alert('✅ Document uploaded and sent for review');
      } catch (err) {
        console.error('❌ Upload error:', err);
        alert('Upload failed');
      }
    };

    reader.readAsText(file);
  };

  const handleLogout = () => {
    localStorage.removeItem('role');
    history.push('/login');
  };

  const toggleView = (docId) => {
    setExpandedDocId(expandedDocId === docId ? null : docId);
  };

  return (
    <Layout title="Author Dashboard">
      <main className={styles.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className={styles.heading}>Author Dashboard</h1>
          <button className={styles.uploadBtn} onClick={handleLogout}>Logout</button>
        </div>
        <p className={styles.subheading}>
          Welcome back, {localStorage.getItem('username') || 'Kuldeep Yadav'}!
        </p>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div>Total Documents</div>
            <div className={styles.statNumber}>{statusCounts.total}</div>
            <span className={styles.icon}>📄</span>
          </div>
          <div className={styles.statCard}>
            <div>Pending Review</div>
            <div className={styles.statNumber}>{statusCounts.pending}</div>
            <span className={styles.icon}>⏰</span>
          </div>
          <div className={styles.statCard}>
            <div>Approved</div>
            <div className={styles.statNumberApproved}>{statusCounts.approved}</div>
            <span className={styles.icon}>✅</span>
          </div>
          <div className={styles.statCard}>
            <div>Rejected</div>
            <div className={styles.statNumberRejected}>{statusCounts.rejected}</div>
            <span className={styles.icon}>❌</span>
          </div>
        </div>

        <div className={styles.uploadSection}>
          <input type="file" accept=".md" onChange={(e) => setFile(e.target.files[0])} />
          <button className={styles.uploadBtn} onClick={handleUpload}>Upload New Document</button>
        </div>

        <section className={styles.documentSection}>
          <h2>My Documents</h2>
          {documents
            .filter((doc) => doc.author === (localStorage.getItem('username') || 'Unknown') || doc.status === 'Approved')
            .map((doc) => (
              <div key={doc.id} className={styles.documentCard}>
                <div className={styles.docHeader}>
                  <span className={styles.docStatusIcon}>
                    {doc.status === 'Approved' ? '✅' : doc.status === 'Rejected' ? '❌' : '⏳'}
                  </span>
                  <span className={styles.docTitle}>{doc.title}</span>
                  <span className={styles.docStatus}>{doc.status}</span>
                </div>
                <div className={styles.docMeta}>
                  Category: {doc.category} | Uploaded: {doc.uploadedAt} | Reviewed: {doc.reviewedAt}
                </div>
                <div className={styles.docComment}><strong>Review Comments:</strong> {doc.reviewComment}</div>
                <button
                  className={styles.uploadBtn}
                  onClick={() => toggleView(doc.id)}
                  style={{ marginTop: '0.5rem', background: '#0088cc' }}
                >
                  {expandedDocId === doc.id ? 'Hide' : 'View'} Document
                </button>
                {expandedDocId === doc.id && (
                  <pre style={{
                    background: '#01192f',
                    padding: '1rem',
                    borderRadius: '8px',
                    color: '#fff',
                    marginTop: '1rem',
                    overflowX: 'auto'
                  }}>
                    {doc.content}
                  </pre>
                )}
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
