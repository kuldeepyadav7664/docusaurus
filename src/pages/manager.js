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
  const [processingDocId, setProcessingDocId] = useState(null);
  const [showWaitMessage, setShowWaitMessage] = useState(false);
  const history = useHistory();
  const { siteConfig } = useDocusaurusContext();
  const githubToken = siteConfig.customFields.githubToken;
  const repo = 'kuldeepyadav7664/docusaurus';
  const username = localStorage.getItem('username') || 'Unknown';

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
            const matchReviewer = content.match(/<!--\s*approvedBy:\s*(.*?)\s*-->/i);
            const matchAuthor = content.match(/<!--\s*author:\s*(.*?)\s*-->/i);
            const reviewerName = matchReviewer ? matchReviewer[1] : 'Unknown';
            const authorName = matchAuthor ? matchAuthor[1] : 'Unknown';

            const commitRes = await fetch(`https://api.github.com/repos/${repo}/commits?path=${file.path}&per_page=1`, {
              headers: { Authorization: `Bearer ${githubToken}` },
            });
            const commitData = await commitRes.json();
            const uploadDate = Array.isArray(commitData) && commitData.length > 0
              ? new Date(commitData[0].commit.author.date).toLocaleDateString()
              : '-';

            return {
              id: file.sha,
              title: file.name.replace('.md', ''),
              status: 'Approved',
              uploadedAt: uploadDate,
              reviewedAt: new Date().toLocaleDateString(),
              reviewComment: `Approved by ${reviewerName}`,
              author: authorName,
              content,
              filename: file.name,
              sha: file.sha,
              source: 'docs/documents',
            };
          })
        );
      } catch (err) {
        console.error('Error fetching approved documents:', err);
        return [];
      }
    };

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
            const matchAuthor = content.match(/<!--\s*author:\s*(.*?)\s*-->/i);
            const authorName = matchAuthor ? matchAuthor[1] : 'Unknown';

            const commitRes = await fetch(`https://api.github.com/repos/${repo}/commits?path=${file.path}&per_page=1`, {
              headers: { Authorization: `Bearer ${githubToken}` },
            });
            const commitData = await commitRes.json();
            const uploadDate = Array.isArray(commitData) && commitData.length > 0
              ? new Date(commitData[0].commit.author.date).toLocaleDateString()
              : '-';

            return {
              id: file.sha,
              title: file.name.replace('.md', ''),
              status: 'Pending',
              uploadedAt: uploadDate,
              reviewedAt: '-',
              reviewComment: 'Awaiting review',
              author: authorName,
              content,
              filename: file.name,
              sha: file.sha,
              source: 'pending-documents',
            };
          })
        );
      } catch (err) {
        console.error('Error fetching pending documents:', err);
        return [];
      }
    };

    const approvedDocs = await fetchApprovedFiles();
    const pendingDocs = await fetchPendingFiles();
    const storedDocs = JSON.parse(localStorage.getItem('docs') || '[]');
    const rejectedDocs = storedDocs.filter(d => d.status === 'Rejected');

    const filteredPendingDocs = pendingDocs.filter(
      pd => !approvedDocs.some(ad => ad.filename === pd.filename)
    );

    const docs = [...filteredPendingDocs, ...approvedDocs, ...rejectedDocs];

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
  
  // ✅ NEW DELETE FUNCTION FOR APPROVED DOCS

  const deleteApprovedDoc = async (doc) => {

    const path = `docs/documents/${doc.filename}`;

    const url = `https://api.github.com/repos/${repo}/contents/${path}`;

    try {

      const res = await fetch(url, {

        method: 'DELETE',

        headers: {

          Authorization: `Bearer ${githubToken}`,

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({

          message: `Delete approved document ${doc.filename}`,

          sha: doc.sha,

          committer: { name: 'Manager', email: 'manager@appsquadz.com' },

        }),

      });



      if (!res.ok) {

        console.error('Error deleting approved doc:', await res.json());

        alert('Failed to delete the document from GitHub.');

        return;

      }



      const updatedDocs = documents.filter(d => d.filename !== doc.filename);

      setDocuments(updatedDocs);

      localStorage.setItem('docs', JSON.stringify(updatedDocs));

      alert(`✅ ${doc.filename} deleted successfully.`);

    } catch (err) {

      console.error('Delete failed:', err);

      alert('Error deleting document.');

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

    const approvedByComment = `<!-- approvedBy: ${username} -->\n`;
    const content = btoa(unescape(encodeURIComponent(approvedByComment + doc.content)));

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
    setProcessingDocId(doc.id);
    const delay = new Promise(resolve => setTimeout(resolve, 20000));
    setShowWaitMessage(true);
    setTimeout(() => {
      setShowWaitMessage(false);
      window.location.reload();
    }, 40000);

    const success = await saveApprovedToGitHub(doc);
    if (!success) {
      setProcessingDocId(null);
      return;
    }

    await delay;

    const updatedDoc = {
      ...doc,
      status: 'Approved',
      reviewedAt: new Date().toLocaleDateString(),
      reviewComment: comment || 'Approved',
    };

    const updatedDocs = [...documents];
    updatedDocs[index] = updatedDoc;
    setDocuments(updatedDocs);

    const storedDocs = JSON.parse(localStorage.getItem('docs') || '[]');
    const updatedStoredDocs = storedDocs.filter(d => d.filename !== doc.filename);
    localStorage.setItem('docs', JSON.stringify([...updatedStoredDocs, updatedDoc]));

    setProcessingDocId(null);
  };

  const handleReject = async (index, comment) => {
    const doc = documents[index];
    setProcessingDocId(doc.id);
    await deleteFromPending(doc.filename, doc.sha);

    const rejectedDoc = {
      ...doc,
      status: 'Rejected',
      reviewedAt: new Date().toLocaleDateString(),
      reviewComment: comment || 'Rejected',
    };

    const updatedDocs = [...documents];
    updatedDocs[index] = rejectedDoc;
    setDocuments(updatedDocs);

    const storedDocs = JSON.parse(localStorage.getItem('docs') || '[]');
    const updatedStoredDocs = storedDocs.filter(d => d.filename !== doc.filename);
    localStorage.setItem('docs', JSON.stringify([...updatedStoredDocs, rejectedDoc]));

    setProcessingDocId(null);
  };

  const filteredDocs = filter === 'All' ? documents : documents.filter(d => d.status === filter);
  const getCount = status => documents.filter(d => d.status === status).length;

  return (
    <Layout title="Manager Dashboard">
      <main className={styles.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h1 className={styles.heading}>Manager Dashboard</h1>
            <h3 className={styles.subheading}>
              Welcome back, <span style={{ color: '#10b981', fontSize: '30px' }}>{username}</span>
            </h3>
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
          {filteredDocs.length === 0 ? <p>No documents found.</p> : filteredDocs.map((doc, index) => {
            const isProcessing = processingDocId === doc.id;
            return (
              <div key={index} className={styles.documentCard}>
                <div className={styles.docHeader}>
                  {doc.title} {doc.status === 'Pending' && '🟡'}
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

                {isProcessing && (
                  <div className={styles.processing}>⏳ Processing...</div>
                )}

                {showWaitMessage && (
                  <div className={styles.waitMessage}>This will take some time, please wait...</div>
                )}

                {doc.status === 'Pending' && !isProcessing && (
                  <>
                    <textarea className={styles.reviewTextarea} placeholder="Add comments..." onChange={(e) => {
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

                {(doc.status === 'Approved' || doc.status === 'Rejected') && doc.reviewComment && (
                  <div style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                    Manager Comment: {doc.reviewComment}
                  </div>
                )}

                {doc.status === 'Approved' && (
                  <button
                    className={styles.rejectBtn}
                    style={{ marginTop: '10px', backgroundColor: '#dc2626' }}
                    onClick={() => {
                      const confirm = window.confirm(`Are you sure you want to delete "${doc.title}"?`);
                      if (confirm) deleteApprovedDoc(doc);
                    }}
                  >
                    🗑️ Delete Document
                  </button>
                )}
              </div>
            );
          })}
        </section>
      </main>
    </Layout>
  );
}
