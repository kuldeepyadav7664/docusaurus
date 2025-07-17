import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import styles from './authorDashboard.module.css';
import { useHistory } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import BrowserOnly from '@docusaurus/BrowserOnly';

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      {message}
    </div>
  );
}

function AuthorDashboard() {
  const history = useHistory();
  const { siteConfig } = useDocusaurusContext();
  const githubToken = siteConfig.customFields.githubToken;
  const repo = 'Appsquadz-Software-Private-Limited/Docusaurus';

  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [folders, setFolders] = useState([]);

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null);
  const [rejectedDocuments, setRejectedDocuments] = useState([]);

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const username = localStorage.getItem('username') || 'Unknown';

useEffect(() => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || !role || role !== 'author') {
    localStorage.clear();
    history.push('/login');
    return;
  }

  const validateToken = async () => {
    try {
      const res = await fetch('http://13.202.138.18:4000/api/validate-token', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Token invalid or expired');

      const loginTime = localStorage.getItem('loginTime');
      const maxSessionAge = 10 * 60 * 1000;
      const sessionAge = Date.now() - Number(loginTime);
      if (sessionAge > maxSessionAge) {
        showToast('Session expired. Please login again.', 'error');
        localStorage.clear();
        history.push('/login');
        return;
      }

      fetchFolders();
    } catch (err) {
      showToast('Session expired. Please login again.', 'error');
      localStorage.clear();
      history.push('/login');
    }
  };

  validateToken();

  // 🔁 Auto logout if session exceeds time
  const interval = setInterval(() => {
    const loginTime = localStorage.getItem('loginTime');
    const maxSessionAge = 10 * 60 * 1000;
    const sessionAge = Date.now() - Number(loginTime);
    if (sessionAge > maxSessionAge) {
      showToast('Session expired. Please login again.', 'error');
      localStorage.clear();
      history.push('/login');
    }
  }, 60000); // every 60 seconds

  return () => clearInterval(interval);
}, []);


  useEffect(() => {
    if (folders.length === 0) return;

    fetchDocuments();
    fetchRejectedDocuments();

    const interval = setInterval(() => {
      const currentUsername = localStorage.getItem('username');
      if (currentUsername !== username) {
        window.location.reload();
      } else {
        fetchDocuments();
        fetchRejectedDocuments();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [folders]);

const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
};


  const fetchFolders = async () => {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/pending-documents`, {
        headers: { Authorization: `Bearer ${githubToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch folders');
      const contents = await res.json();
      const folderNames = contents.filter(item => item.type === 'dir').map(folder => folder.name);
      setFolders(folderNames);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const fetchFiles = async (path, status) => {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        headers: { Authorization: `Bearer ${githubToken}` },
      });
      if (res.status === 404) return [];
      const files = await res.json();
      if (!Array.isArray(files)) return [];

      const mdFiles = files.filter(f => f.name.endsWith('.md'));

      return Promise.all(
        mdFiles.map(async file => {
          const res = await fetch(file.download_url);
          const content = await res.text();
          const authorMatch = content.match(/<!--\s*author:\s*(.*?)\s*-->/);
          const fileAuthor = authorMatch ? authorMatch[1] : 'Unknown';
          const commentMatch = content.match(/<!--\s*reviewComment:\s*(.*?)\s*-->/);
          const reviewComment = commentMatch ? commentMatch[1] : (status === 'Approved' ? 'Approved' : (status === 'Rejected' ? 'Rejected' : 'Awaiting review'));

          const reviewerMatch = content.match(/<!--\s*reviewer:\s*(.*?)\s*-->/);
const reviewer = reviewerMatch ? reviewerMatch[1] : 'Unknown';


          const commitRes = await fetch(`https://api.github.com/repos/${repo}/commits?path=${file.path}&per_page=1`, {
            headers: { Authorization: `Bearer ${githubToken}` },
          });
          const commitData = await commitRes.json();
          const uploadedAt = Array.isArray(commitData) && commitData.length > 0
            ? new Date(commitData[0].commit.author.date).toLocaleDateString()
            : '-';

          return {
            id: file.sha,
            title: file.name.replace('.md', ''),
            status,
            uploadedAt,
            reviewedAt: status !== 'Pending' ? new Date().toLocaleDateString() : '-',
            reviewComment,
            reviewer,
            author: fileAuthor,
            content,
            filename: file.name,
            sha: file.sha,
            folder: path.split('/')[1] || '-',
          };
        })
      );
    } catch (err) {
      console.error(`Error fetching ${path}:`, err);
      return [];
    }
  };

  const fetchDocuments = async () => {
    try {
      const docsRes = await fetch(`https://api.github.com/repos/${repo}/contents/docs`, {
        headers: { Authorization: `Bearer ${githubToken}` },
      });
      const docsFolders = await docsRes.json();
      const subDocsFolders = docsFolders.filter(item => item.type === 'dir');
      const approvedPromises = subDocsFolders.map(folder =>
        fetchFiles(`docs/${folder.name}`, 'Approved')
      );

      const pendingPromises = folders.map(folder =>
        fetchFiles(`pending-documents/${folder}`, 'Pending')
      );

      const [approvedResults, ...pendingFolders] = await Promise.all([
        Promise.all(approvedPromises).then(res => res.flat()),
        ...pendingPromises
      ]);

      const approvedDocs = approvedResults;
      const storedDocs = JSON.parse(localStorage.getItem('docs') || '[]');
      const rejectedDocs = storedDocs.filter(d => d.status === 'Rejected');

      const rejectedFetched = await fetchRejectedDocuments(true); // pass flag to return data
      const docs = [...pendingFolders.flat(), ...approvedDocs];

      const filteredDocs = docs.filter(d => d.status !== 'Rejected');
setDocuments(filteredDocs);
      localStorage.setItem('docs', JSON.stringify(docs));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const fetchRejectedDocuments = async (returnOnly = false) => {
    try {
      const rejectedRes = await fetch(`https://api.github.com/repos/${repo}/contents/Rejected`, {
        headers: { Authorization: `Bearer ${githubToken}` },
      });

      const rejectedContents = await rejectedRes.json();
      const subfolders = rejectedContents.filter(item => item.type === 'dir'); // ✅ Only folders

      const allDocs = [];

      for (const folder of subfolders) {
        const filesRes = await fetch(folder.url, {
          headers: { Authorization: `Bearer ${githubToken}` },
        });
        const files = await filesRes.json();

        const mdFiles = files.filter(file => file.name.endsWith('.md'));

        for (const file of mdFiles) {
          const contentRes = await fetch(file.download_url);
          const content = await contentRes.text();

          const authorMatch = content.match(/<!--\s*author:\s*(.*?)\s*-->/);
          const commentMatch = content.match(/<!--\s*reviewComment:\s*(.*?)\s*-->/);
          const reviewerMatch = content.match(/<!--\s*reviewer:\s*(.*?)\s*-->/);
const reviewer = reviewerMatch ? reviewerMatch[1] : 'Unknown';

          const fileAuthor = authorMatch ? authorMatch[1] : 'Unknown';

          if (fileAuthor === username) {
            allDocs.push({
              id: file.sha,
              sha: file.sha,
              title: file.name.replace('.md', ''),
              filename: file.name,
              folder: folder.name,
              content,
              author: fileAuthor,
              status: 'Rejected',
              reviewComment: commentMatch ? commentMatch[1] : '',
              reviewer,
              uploadedAt: '-',
              reviewedAt: new Date().toLocaleDateString()
            });
          }
        }
      }

      if (returnOnly) return allDocs;
      setRejectedDocuments(allDocs);
    } catch (err) {
      console.error('Error fetching rejected documents:', err);
      if (returnOnly) return [];
    }
  };




  const handleUpload = async () => {
    if (!file) return showToast('Please select a Markdown (.md) file', 'warning');
    if (!file.name.endsWith('.md')) return showToast('Only .md files are allowed', 'warning');
    if (!selectedFolder) return showToast('Please select a folder before uploading', 'warning');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const timestamp = new Date().toISOString();
      const content = `<!-- author: ${username} -->\n<!-- uploadedAt: ${timestamp} -->\n` + e.target.result;
      const encodedContent = btoa(unescape(encodeURIComponent(content)));
      const path = `pending-documents/${selectedFolder}/${file.name}`;
      const url = `https://api.github.com/repos/${repo}/contents/${path}`;

      const newDoc = {
        title: file.name.replace('.md', ''),
        author: username,
        content,
      };

      const check = await fetch(url, { headers: { Authorization: `Bearer ${githubToken}` } });
      if (check.status === 200) {
        const existing = await check.json();
        newDoc.sha = existing.sha;
        setPendingUpload({ url, encodedContent, newDoc });
        setShowConfirmModal(true);
        return;
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
        showToast('✅ Document uploaded and sent for review');
        fetchDocuments();
      } catch (err) {
        console.error('Upload error:', err);
        showToast('❌ Upload failed', 'error');
      }
    };
    reader.readAsText(file);
  };
  const confirmUpload = async () => {
    const { url, encodedContent, newDoc } = pendingUpload;
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
      showToast('✅ Document uploaded and sent for review');
      fetchDocuments();
    } catch (err) {
      console.error('Upload error:', err);
      showToast('❌ Upload failed', 'error');
    } finally {
      setShowConfirmModal(false);
      setPendingUpload(null);
    }
  };


  const toggleView = (docId) => setExpandedDocId(expandedDocId === docId ? null : docId);

  const deleteRejectedDoc = async (doc) => {
    const rejectedPath = `Rejected/${doc.folder}/${doc.filename}`;
    const pendingPath = `pending-documents/${doc.folder}/${doc.filename}`;

    const deleteFromGitHub = async (path, sha) => {
      const url = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}`;
      return fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Delete document: ${path}`,
          sha,
          committer: {
            name: username,
            email: `${username.toLowerCase()}@appsquadz.com`,
          },
        }),
      });
    };

    try {
      // Step 1: Delete from Rejected
      const res1 = await deleteFromGitHub(rejectedPath, doc.sha);
      if (!res1.ok) throw new Error('Failed to delete from Rejected');

      // Step 2: Try deleting from pending-documents too (may not exist if already deleted manually)
      const pendingUrl = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(pendingPath)}`;
      const pendingMeta = await fetch(pendingUrl, {
        headers: { Authorization: `Bearer ${githubToken}` },
      });

      if (pendingMeta.ok) {
        const pendingDoc = await pendingMeta.json();
        const res2 = await deleteFromGitHub(pendingPath, pendingDoc.sha);
        if (!res2.ok) console.warn('Could not delete from pending-documents');
      }

      showToast(`🗑️ Deleted ${doc.filename}`);
      setRejectedDocuments(prev => prev.filter(d => d.filename !== doc.filename));
      await fetchRejectedDocuments();
      fetchDocuments(); // Update local state
    } catch (err) {
      console.error('Delete rejected doc failed:', err);
      showToast('❌ Failed to delete rejected document', 'error');
    }
  };



 const allDocs = [...documents, ...rejectedDocuments];

  const statusCounts = allDocs.reduce(
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
          <div style={{ width: '100%' }}>
            <h1 className={styles.heading}>Author Dashboard</h1>
            <h3 className={styles.subheading}>
              Welcome back, <span style={{ color: '#10b981', fontSize: '30px' }}>{username}</span>
            </h3>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}><div>Total</div><div className={styles.statNumber}>{statusCounts.total}</div></div>
          <div className={styles.statCard}><div>Pending</div><div className={styles.statNumber}>{statusCounts.pending}</div></div>
          <div className={styles.statCard}><div>Approved</div><div className={styles.statNumberApproved}>{statusCounts.approved}</div></div>
          <div className={styles.statCard}><div>Rejected</div><div className={styles.statNumberRejected}>{statusCounts.rejected}</div></div>
        </div>

        <div className={styles.uploadRow}>
          <input
            id="file-upload"
            type="file"
            accept=".md"
            onChange={(e) => setFile(e.target.files[0])}
            className={styles.inputField}
          />
          <label htmlFor="file-upload" className={styles.customButton}>
            Choose File
          </label>
          <span className={styles.fileName}>
            {file ? file.name : 'No file chosen'}
          </span>

          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className={styles.selectField}
          >
            <option value="">Select Folder</option>
            {folders.map(folder => (
              <option key={folder} value={folder}>{folder}</option>
            ))}
          </select>

          <button className={styles.uploadBtn} onClick={handleUpload}>Upload</button>
        </div>

        <section className={styles.documentSection}>
          <h2>Documents</h2>
          {documents.length === 0 && (
  <div className={styles.noDocs}>No documents uploaded yet.</div>
)}
          {documents.map((doc, index) => (
            <div key={index} className={styles.documentCard}>
              <div className={styles.docHeader}>
                <span>{doc.status === 'Approved' ? '✅' : doc.status === 'Rejected' ? '❌' : '⏳'}</span>
                <span className={styles.docTitle}>{doc.title}</span>
                <span className={styles.docStatus}>{doc.status}</span>
              </div>
              <div className={styles.docMeta}>
                Author: {doc.author} | Uploaded: {doc.uploadedAt} | Reviewed: {doc.reviewedAt}
              </div>
              {doc.folder && (
                <div className={styles.docMeta}>
                  📂 Folder: <strong>{doc.folder}</strong>
                </div>
              )}
              {doc.status === 'Rejected' ? (
  <div className={styles.docComment}>
    <strong>Manager Comment:</strong> {doc.reviewComment}
  </div>
) : (
 <div className={styles.docComment}>
  <strong>Review Status:</strong> {doc.reviewComment} <br />
  <strong>Reviewed By:</strong> {doc.reviewer}
</div>
)}
              <button className={styles.uploadBtn} onClick={() => toggleView(doc.id)}>
                {expandedDocId === doc.id ? 'Hide' : 'View'} Document
              </button>
              {expandedDocId === doc.id && <pre className={styles.docPreview}>{doc.content}</pre>}
            </div>
          ))}
        </section>

        {rejectedDocuments.length > 0 && (
          <section className={styles.documentSection}>
            {rejectedDocuments.length === 0 && (
  <div className={styles.noDocs}>No rejected documents found.</div>
)}
            <h2>❌ Rejected Documents</h2>
            {rejectedDocuments.map((doc, index) => (
              <div key={index} className={styles.documentCard}>
                <div className={styles.docHeader}>
                  ❌ {doc.title}
                </div>
                <div className={styles.docMeta}>
                  📂 Folder: <strong>{doc.folder}</strong>
                </div>
                <div className={styles.docComment}>
  <strong>Manager Comment:</strong> {doc.reviewComment || 'No comment provided by manager.'} <br />
  <strong>Reviewed By:</strong> {doc.reviewer}
</div>
                <div className={styles.actionButtons}>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => deleteRejectedDoc(doc)}
                  >
                    🗑️ Delete
                  </button>
                  <button
                    className={styles.uploadBtn}
                    onClick={() => toggleView(doc.id)}
                  >
                    {expandedDocId === doc.filename ? 'Hide' : 'View'} Document
                  </button>
                </div>
                {expandedDocId === doc.id && (
                  <pre className={styles.docPreview}>{doc.content}</pre>
                )}
              </div>
            ))}
          </section>
        )}


        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage('')}
        />
        {showConfirmModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3>Overwrite Document?</h3>
              <p>⚠️ {file.name} already exists in <strong>{selectedFolder}</strong>. Do you want to overwrite it?</p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  className={styles.rejectBtn}
                  onClick={() => {
                    setShowConfirmModal(false);
                    setPendingUpload(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className={styles.uploadBtn}
                  onClick={confirmUpload}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

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
