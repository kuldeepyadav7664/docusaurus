import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import styles from './managerDashboard.module.css';
import { useHistory } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import BrowserOnly from '@docusaurus/BrowserOnly';

// Add at the top:
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


function ManagerDashboard() {
  const [documents, setDocuments] = useState([]);
  const [filter, setFilter] = useState('All');
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [processingDocId, setProcessingDocId] = useState(null);
  const [showWaitMessage, setShowWaitMessage] = useState(null);
  const [comments, setComments] = useState({});
  const [disabledButtons, setDisabledButtons] = useState({});
  // For custom delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);

  const history = useHistory();
  const { siteConfig } = useDocusaurusContext();
  const githubToken = siteConfig.customFields.githubToken;
  const repo = 'Appsquadz-Software-Private-Limited/Docusaurus';
  const [username, setUsername] = useState(localStorage.getItem('username') || 'Unknown');

useEffect(() => {
  const validateSession = async () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || !role) {
  history.push('/login');
  return;
}

if (role !== 'manager') {
  toast.error('❌ Unauthorized access. Only managers allowed.');
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  history.push('/login');
  return;
}

const valid = await validateTokenWithBackend();
if (!valid) {
  return;
}

    await fetchDocuments(); // ✅ Only fetch if token is valid
  };

  validateSession(); // 👈 Only one call

  const interval = setInterval(() => {
    validateSession(); // refresh every 10s
  }, 10000);

  // Inactivity auto-logout
  let logoutTimer;
  const activityEvents = ['mousemove', 'keydown', 'scroll', 'click'];

  const resetTimer = () => {
    clearTimeout(logoutTimer);
    logoutTimer = setTimeout(() => {
      toast.info('🔒 Session expired due to inactivity.');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('username');
      history.push('/login');
    }, 10 * 60 * 1000); // 10 mins
  };

  activityEvents.forEach(event => window.addEventListener(event, resetTimer));
  resetTimer();

  window.addEventListener('storage', validateSession); // For logout in another tab

  return () => {
    clearInterval(interval);
    window.removeEventListener('storage', validateSession);
    clearTimeout(logoutTimer);
    activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
  };
}, []);


const validateTokenWithBackend = async () => {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const res = await fetch('http://13.202.138.18:4000/api/validate-token', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 200) {
      return true;
    } else {
      throw new Error('Invalid token');
    }
  } catch (error) {
    toast.error('❌ Session expired. Please log in again.');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    history.push('/login');
    return false;
  }
};


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
          const commentMatch = content.match(/<!--\s*reviewComment:\s*([\s\S]*?)\s*-->/);
          const reviewerMatch = content.match(/<!--\s*reviewer:\s*(.*?)\s*-->/);
          const reviewer = reviewerMatch ? reviewerMatch[1] : 'Unknown';
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
            reviewComment: commentMatch ? commentMatch[1] : '',
            reviewer,
          });
        }
      }

      // Fetch rejected documents from GitHub
      const rejectedRes = await fetch(`https://api.github.com/repos/${repo}/contents/Rejected`, {
        headers: { Authorization: `token ${githubToken}` },
      });
      const rejectedFolders = await rejectedRes.json();
      const subRejectedFolders = rejectedFolders.filter(item => item.type === 'dir');

      for (const folder of subRejectedFolders) {
        const folderName = folder.name;
        const filesRes = await fetch(`https://api.github.com/repos/${repo}/contents/Rejected/${folderName}`, {
          headers: { Authorization: `token ${githubToken}` },
        });
        const files = await filesRes.json();
        const mdFiles = files.filter(file => file.name.endsWith('.md'));

        for (const file of mdFiles) {
          const contentRes = await fetch(file.download_url);
          const content = await contentRes.text();
          const authorMatch = content.match(/<!--\s*author:\s*(.*?)\s*-->/);
          const commentMatch = content.match(/<!--\s*reviewComment:\s*([\s\S]*?)\s*-->/);
          const reviewerMatch = content.match(/<!--\s*reviewer:\s*(.*?)\s*-->/);
          const reviewer = reviewerMatch ? reviewerMatch[1] : 'Unknown';
          const author = authorMatch ? authorMatch[1] : 'Unknown';

          allDocs.push({
            id: file.sha,
            title: file.name.replace('.md', ''),
            filename: file.name,
            folder: folderName,
            status: 'Rejected',
            author,
            content,
            reviewedAt: new Date().toLocaleDateString(),
            uploadedAt: '-',
            reviewComment: commentMatch ? commentMatch[1] : '',
            reviewer,
          });
        }
      }

      setDocuments(allDocs);
      localStorage.setItem('docs', JSON.stringify(allDocs));


    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const deleteFromPending = async (fullPath, sha) => {
    const url = `https://api.github.com/repos/${repo}/contents/${fullPath}`;
    try {
      await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Remove ${fullPath} after rejection`,
          sha,
          committer: { name: 'Manager', email: 'manager@appsquadz.com' },
        })
      });
    } catch (err) {
      console.error('Error deleting file from pending-documents:', err);
    }
  };
  fetchDocuments();

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

  const deleteRejectedDoc = async () => {
    if (!rejectedToDelete) return;

    const path = `Rejected/${rejectedToDelete.folder}/${rejectedToDelete.filename}`;
    const url = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}`;

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `token ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Delete rejected document ${rejectedToDelete.filename}`,
          sha: rejectedToDelete.id,
          committer: { name: 'Manager', email: 'manager@appsquadz.com' },
        }),
      });

      if (!res.ok) {
        toast.error('❌ Failed to delete rejected document.');
        return;
      }

      const updatedDocs = documents.filter(d => d.filename !== rejectedToDelete.filename || d.folder !== rejectedToDelete.folder);
      setDocuments(updatedDocs);
      localStorage.setItem('docs', JSON.stringify(updatedDocs));
      toast.success(`✅ Rejected document ${rejectedToDelete.filename} deleted.`);
    } catch (err) {
      console.error('Error deleting rejected doc:', err);
      toast.error('❌ Error deleting rejected document.');
    } finally {
      setRejectedToDelete(null);
      setShowRejectedDeleteModal(false);
    }
  };


  const saveApprovedToGitHub = async (doc) => {
    const sourcePath = `pending-documents/${doc.folder}/${doc.title}.md`;
    const destinationPath = `docs/${doc.folder}/${doc.title}.md`;
    const comment = `<!-- reviewComment: ${doc.tempComment || 'Approved'} -->\n<!-- reviewer: ${username} -->`;
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
      doc.tempComment = comment; // 🔥 inject latest comment
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
      const commentToUse = comment?.trim() || doc.tempComment?.trim() || 'Rejected';
      const markdownBody = doc.content.replace(/<!-- reviewComment:.*?-->\n?/g, '')
        .replace(/<!-- reviewer:.*?-->\n?/g, '');

      const contentWithComment = `${markdownBody.trim()}\n\n<!-- reviewComment: ${commentToUse} -->\n<!-- reviewer: ${username} -->`;

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
      await deleteFromPending(`pending-documents/${doc.folder}/${doc.filename}`, doc.id);


      toast.success('✅ Rejected and moved to Rejected folder.');

      // Update state (optional localStorage)
      const rejectedDoc = {
        ...doc,
        status: 'Rejected',
        reviewedAt: new Date().toLocaleDateString(),
        reviewComment: (comment?.trim() || doc.tempComment?.trim() || 'Rejected'),
        rejected: true  // 👈 Add this flag
      };

      const updatedDocs = documents
        .filter((d, i) => i !== index) // remove original pending doc
        .concat(rejectedDoc); // add rejected version
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


  const filteredDocs = filter === 'All'
    ? documents.filter(d => d.status !== 'Rejected')  // exclude rejected
    : documents.filter(d => d.status === filter);
  const getCount = status => documents.filter(d => d.status === status).length;
  const rejectedDocs = documents.filter(doc => doc.status === 'Rejected');
  const [rejectedToDelete, setRejectedToDelete] = useState(null);
  const [showRejectedDeleteModal, setShowRejectedDeleteModal] = useState(false);

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
                {(doc.status === 'Approved' || doc.status === 'Rejected') && doc.reviewComment && (
                  <div style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                    <strong>📝Comment:</strong> {doc.reviewComment} <br />
                    <strong>Reviewed By:</strong> {doc.reviewer}
                  </div>
                )}
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
                  {doc.status === 'Approved' && (
                    <button
                      className={styles.rejectBtn}
                      style={{ backgroundColor: '#dc2626' }}
                      onClick={() => {
                        setDocToDelete(doc);
                        setShowDeleteModal(true);
                      }}
                    >
                      🗑️ Delete
                    </button>
                  )}
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
                    <textarea
                      className={styles.reviewTextarea}
                      placeholder="Add comments..."
                      value={comments[doc.id] || ''}
                      onChange={(e) => {
                        setComments(prev => ({ ...prev, [doc.id]: e.target.value }));
                      }}
                    />
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.approveBtn}
                        disabled={isDisabled}
                        onClick={() => handleApprove(index, comments[doc.id] || '')}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className={styles.rejectBtn}
                        disabled={isDisabled}
                        onClick={() => {
                          const comment = comments[doc.id]?.trim() || 'Rejected';
                          handleReject(index, comment);
                        }}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </>
                )}




              </div>
            );
          })}
        </section>
        {rejectedDocs.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.docHeader} style={{ color: 'crimson', display: 'flex', alignItems: 'center' }}>
              ❌ Rejected Documents
            </h2>
            {rejectedDocs.map((doc, index) => (
              <div key={index} className={styles.documentCard}>
                <div className={styles.docHeader}>
                  {doc.title}
                </div>
                <div className={styles.docMeta}>
                  Author: {doc.author} | Reviewed: {doc.reviewedAt}
                </div>
                <div className={styles.docMeta}>
                  📂 Folder: <strong>{doc.folder}</strong>
                </div>
                <div className={styles.docMeta}>
                  <strong>📝 Comment:</strong> <i>{doc.reviewComment}</i> <br />
                  <strong>Reviewed By:</strong> {doc.reviewer}
                </div>
                <div className={styles.actionButtons}>
                  <button
                    className={styles.approveBtn}
                    onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                  >
                    {expandedDocId === doc.id ? 'Hide Document' : 'View Document'}
                  </button>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => {
                      const blob = new Blob([doc.content], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${doc.title}.md`;
                      a.click();
                    }}
                  >
                    ⬇️ Download
                  </button>
                  <button
                    className={styles.rejectBtn}
                    style={{ backgroundColor: '#dc2626' }}
                    onClick={() => {
                      setRejectedToDelete(doc);
                      setShowRejectedDeleteModal(true);
                    }}
                  >
                    🗑️ Delete
                  </button>

                </div>
                {expandedDocId === doc.id && (
                  <pre className={styles.docPreview}>{doc.content}</pre>
                )}
              </div>
            ))}
          </section>
        )}
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

      {showRejectedDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete <strong>{rejectedToDelete?.title}</strong>?</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className={styles.rejectBtn} onClick={() => {
                setShowRejectedDeleteModal(false);
                setRejectedToDelete(null);
              }}>
                Cancel
              </button>
              <button className={styles.approveBtn} onClick={deleteRejectedDoc}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default function ManagerPageWrapper() {
  return (
    <BrowserOnly fallback={<div>Loading Manager Dashboard...</div>}>
      {() => <ManagerDashboard />}
    </BrowserOnly>
  );
}