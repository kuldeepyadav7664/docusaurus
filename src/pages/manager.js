import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import styles from './managerDashboard.module.css';
import { useHistory } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
// Add at the top:
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


export default function ManagerDashboard() {
  const [documents, setDocuments] = useState([]);
  const [filter, setFilter] = useState('All');
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [processingDocId, setProcessingDocId] = useState(null);
  const [showWaitMessage, setShowWaitMessage] = useState(null);
  const [disabledButtons, setDisabledButtons] = useState({});
  // For custom delete confirmation modal
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [docToDelete, setDocToDelete] = useState(null);

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
    try {
      const allDocs = [];
      const pendingRes = await fetch(`https://api.github.com/repos/${repo}/contents/pending-documents`, {
        headers: { Authorization: `token ${githubToken}` },
      });
      const pendingFolders = await pendingRes.json();
      const subPendingFolders = pendingFolders.filter(item => item.type === 'dir');

      for (const folder of subPendingFolders) {
        const folderName = folder.name;
        const filesRes = await fetch(folder.url, { headers: { Authorization: `token ${githubToken}` } });
        const files = await filesRes.json();
        const mdFiles = files.filter(file => file.name.endsWith('.md'));

        for (const file of mdFiles) {
          const contentRes = await fetch(file.download_url);
          const content = await contentRes.text();
          const authorMatch = content.match(/<!--\s*author:\s*(.*?)\s*-->/);
          const author = authorMatch ? authorMatch[1] : 'Unknown';

          allDocs.push({
            id: file.sha,
            title: file.name.replace('.md', ''),
            filename: file.name,
            folder: folderName,
            status: 'Pending',
            author,
            content,
            reviewedAt: '-',
            uploadedAt: new Date().toLocaleDateString(),
            reviewComment: '',
          });
        }
      }

      const docsRes = await fetch(`https://api.github.com/repos/${repo}/contents/docs`, {
        headers: { Authorization: `token ${githubToken}` },
      });
      const docFolders = await docsRes.json();
      const subDocFolders = docFolders.filter(item => item.type === 'dir');

      for (const folder of subDocFolders) {
        const folderName = folder.name;
        const filesRes = await fetch(folder.url, {
          headers: { Authorization: `token ${githubToken}` },
        });
        const files = await filesRes.json();
        const mdFiles = files.filter(file => file.name.endsWith('.md'));

        for (const file of mdFiles) {
          const contentRes = await fetch(file.download_url);
          const content = await contentRes.text();
          const authorMatch = content.match(/<!--\s*author:\s*(.*?)\s*-->/);
          const commentMatch = content.match(/<!--\s*reviewComment:\s*(.*?)\s*-->/);
          const author = authorMatch ? authorMatch[1] : 'Unknown';

          allDocs.push({
            id: file.sha,
            title: file.name.replace('.md', ''),
            filename: file.name,
            folder: folderName,
            status: 'Approved',
            author,
            content,
            reviewedAt: new Date().toLocaleDateString(),
            uploadedAt: '-',
            reviewComment: commentMatch ? commentMatch[1] : `Approved by ${username}`,
          });
        }
      }

      const stored = JSON.parse(localStorage.getItem('docs') || '[]');
      const rejectedDocs = stored.filter(d => d.status === 'Rejected');
      const allFinal = [...allDocs, ...rejectedDocs];

      setDocuments(allFinal);
      localStorage.setItem('docs', JSON.stringify(allFinal));
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
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

const deleteApprovedDoc = async () => {
  if (!docToDelete) return;

  const path = `docs/${docToDelete.folder}/${docToDelete.filename}`;
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Delete approved document ${docToDelete.filename}`,
        sha: docToDelete.id,
        committer: { name: 'Manager', email: 'manager@appsquadz.com' },
      }),
    });

    if (!res.ok) {
      console.error('Error deleting approved doc:', await res.json());
      toast.error('❌ Failed to delete the document from GitHub.');
      return;
    }

    const updatedDocs = documents.filter(d => d.filename !== docToDelete.filename);
    setDocuments(updatedDocs);
    localStorage.setItem('docs', JSON.stringify(updatedDocs));
    toast.success(`✅ ${docToDelete.filename} deleted successfully.`);
  } catch (err) {
    console.error('Delete failed:', err);
    toast.error('❌ Error deleting document.');
  } finally {
    setShowDeleteModal(false);
    setDocToDelete(null);
  }
};



  const saveApprovedToGitHub = async (doc) => {
    const sourcePath = `pending-documents/${doc.folder}/${doc.title}.md`;
    const destinationPath = `docs/${doc.folder}/${doc.title}.md`;
    const comment = `<!-- reviewComment: ${doc.tempComment || 'Approved'} by ${username} -->`;
    const newContent = `${doc.content.trim()}\n\n${comment}`;
    const content = btoa(unescape(encodeURIComponent(newContent)));

    const putUrl = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(destinationPath)}`;
    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${githubToken}`,
      },
      body: JSON.stringify({
        message: `Approve document: ${doc.title}`,
        content,
        committer: {
          name: username,
          email: `${username}@users.noreply.github.com`,
        },
      }),
    });

    if (!putRes.ok) throw new Error(await putRes.text());

    const getUrl = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(sourcePath)}`;
    const getRes = await fetch(getUrl, { headers: { Authorization: `token ${githubToken}` } });
    if (!getRes.ok) throw new Error(await getRes.text());
    const fileData = await getRes.json();

    const deleteRes = await fetch(getUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${githubToken}`,
      },
      body: JSON.stringify({
        message: `Remove pending document after approval: ${doc.title}`,
        sha: fileData.sha,
        committer: {
          name: username,
          email: `${username}@users.noreply.github.com`,
        },
      }),
    });

    if (!deleteRes.ok) throw new Error(await deleteRes.text());
  };

  const handleApprove = async (index, comment) => {
    const doc = documents[index];
    setProcessingDocId(doc.id);
    setDisabledButtons(prev => ({ ...prev, [doc.id]: true }));
    setShowWaitMessage(doc.id); // <-- set to current doc id

    setTimeout(() => {
      setShowWaitMessage(null); // <-- clear after timeout
      setDisabledButtons(prev => ({ ...prev, [doc.id]: false }));
      // window.location.reload();
    }, 60000);

    try {
      await saveApprovedToGitHub(doc);
      await new Promise(resolve => setTimeout(resolve, 20000));

      const updatedDoc = {
        ...doc,
        status: 'Approved',
        reviewedAt: new Date().toLocaleDateString(),
        reviewComment: `${comment || 'Approved'} by ${username}`,
      };

      const updatedDocs = [...documents];
      updatedDocs[index] = updatedDoc;
      setDocuments(updatedDocs);

      const storedDocs = JSON.parse(localStorage.getItem('docs') || '[]');
      const updatedStoredDocs = storedDocs.filter(d => d.filename !== doc.filename);
      localStorage.setItem('docs', JSON.stringify([...updatedStoredDocs, updatedDoc]));
    } catch (err) {
      console.error('Approve failed:', err);
      toast.error('❌ Approval failed.');
    }

    setProcessingDocId(null);
  };

  const handleReject = async (index, comment) => {
  const doc = documents[index];
  setProcessingDocId(doc.id);
  setDisabledButtons(prev => ({ ...prev, [doc.id]: true }));

  try {
    const rejectionComment = `<!-- reviewComment: ${comment || 'Rejected'} by ${username} -->`;
    const contentWithComment = `${doc.content.trim()}\n\n${rejectionComment}`;
    const encodedContent = btoa(unescape(encodeURIComponent(contentWithComment)));
    const rejectedPath = `Rejected/${doc.folder}/${doc.filename}`;

    // Upload the rejected file to Rejected folder
    await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(rejectedPath)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${githubToken}`,
      },
      body: JSON.stringify({
        message: `Reject document: ${doc.title}`,
        content: encodedContent,
        committer: {
          name: username,
          email: `${username}@users.noreply.github.com`,
        },
      }),
    });

    // Delete from pending-documents
    await deleteFromPending(`${doc.folder}/${doc.filename}`, doc.sha);

    toast.success('✅ Rejected and moved to Rejected folder.');

    // Update state (optional localStorage)
    const rejectedDoc = {
      ...doc,
      status: 'Rejected',
      reviewedAt: new Date().toLocaleDateString(),
      reviewComment: `${comment || 'Rejected'} by ${username}`,
    };

    const updatedDocs = [...documents];
    updatedDocs[index] = rejectedDoc;
    setDocuments(updatedDocs);

    const storedDocs = JSON.parse(localStorage.getItem('docs') || '[]');
    const updatedStoredDocs = storedDocs.filter(d => d.filename !== doc.filename);
    localStorage.setItem('docs', JSON.stringify([...updatedStoredDocs, rejectedDoc]));

  } catch (err) {
    console.error('Reject failed:', err);
    toast.error('❌ Rejection failed.');
  }

  setTimeout(() => {
    setDisabledButtons(prev => ({ ...prev, [doc.id]: false }));
  }, 60000);

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
            const isDisabled = !!disabledButtons[doc.id];
            return (
              <div key={index} className={styles.documentCard}>
                <div className={styles.docHeader}>
                  {doc.title} {doc.status === 'Pending' && '🟡'}
                </div>
                <div className={styles.docMeta}>Author: {doc.author} | Uploaded: {doc.uploadedAt} | Reviewed: {doc.reviewedAt}</div>
                <div className={styles.docMeta}> 📂 Folder: <strong>{doc.folder}</strong></div>
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

                {showWaitMessage === doc.id && (  /* <-- changed here */
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
                      <button className={styles.approveBtn} disabled={isDisabled} onClick={() => handleApprove(index, doc.tempComment || '')}>✅ Approve</button>
                      <button className={styles.rejectBtn} disabled={isDisabled} onClick={() => handleReject(index, doc.tempComment || '')}>❌ Reject</button>
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
      setDocToDelete(doc);
      setShowDeleteModal(true);
    }}
  >
    🗑️ Delete 
  </button>
)}
              </div>
            );
          })}
        </section>
      </main>
      <ToastContainer position="top-right" autoClose={4000} />
      {showDeleteModal && (
  <div className={styles.modalOverlay}>
    <div className={styles.modalContent}>
      <h3>Confirm Deletion</h3>
      <p>Are you sure you want to delete <strong>{docToDelete?.title}</strong>?</p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button className={styles.rejectBtn} onClick={() => {
          setShowDeleteModal(false);
          setDocToDelete(null);
        }}>
          Cancel
        </button>
        <button className={styles.approveBtn} onClick={deleteApprovedDoc}>
          Confirm
        </button>
      </div>
    </div>
  </div>
)}
    </Layout>
  );
}
