import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import {
  collection,
  query,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  where
} from 'firebase/firestore';
import './DonationsPage.css'; // Reuse styles for layout

const POST_TYPES = ['all', 'donation', 'request', 'lost', 'found', 'rent'];
const STATUS_TYPES = ['all', 'pending', 'approved', 'rejected'];

function AdminPage() {
  const [selectedItem, setSelectedItem] = useState(null);
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showReported, setShowReported] = useState(false);
  const [reportedPosts, setReportedPosts] = useState([]);
  const [showLogin, setShowLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  // Hardcoded admin credentials
  const ADMIN_EMAIL = 'leonard.forrosuelo@cit.edu';
  const ADMIN_PASSWORD = 'leofors09';

  // Check admin authentication on mount
  useEffect(() => {
    // If not logged in as admin, show login form
    const user = auth.currentUser;
    if (!user || user.email !== ADMIN_EMAIL) {
      setShowLogin(true);
    }
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (adminEmail === ADMIN_EMAIL && adminPassword === ADMIN_PASSWORD) {
      // If already logged in as another user, sign out first
      if (auth.currentUser && auth.currentUser.email !== ADMIN_EMAIL) {
        await auth.signOut();
      }
      try {
        await auth.signInWithEmailAndPassword(adminEmail, adminPassword);
        setShowLogin(false);
      } catch (err) {
        setLoginError('Firebase login failed.');
      }
    } else {
      setLoginError('Invalid admin credentials.');
    }
  };

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const allPosts = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          // Use first image from imageUrls array if present, else fallback to .image or ''
          const image = Array.isArray(data.imageUrls) && data.imageUrls.length > 0
            ? data.imageUrls[0]
            : (data.image || '');
          return { id: docSnap.id, ...data, image };
        });
        setPosts(allPosts);
      } catch (err) {
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  useEffect(() => {
    // Fetch reported/flagged posts (assuming a 'reports' collection)
    const fetchReports = async () => {
      try {
        const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const reports = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        console.log('Fetched reports:', reports); // Debug log
        setReportedPosts(reports);
      } catch (err) {
        console.error('Error fetching reports:', err); // Debug log
        // If no reports collection, skip
      }
    };
    fetchReports();
  }, []);

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (filterType !== 'all') result = result.filter(p => p.type === filterType);
    if (filterStatus !== 'all') result = result.filter(p => (p.status || 'pending') === filterStatus);
    result = [...result].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.();
      const dateB = b.createdAt?.toDate?.();
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return result;
  }, [posts, filterType, filterStatus, sortOrder]);

  const handleApprove = async (postId) => {
    await updateDoc(doc(db, 'items', postId), { status: 'approved' });
    setPosts(posts => posts.map(p => p.id === postId ? { ...p, status: 'approved' } : p));
  };
  const handleReject = async (postId) => {
    await updateDoc(doc(db, 'items', postId), { status: 'rejected' });
    setPosts(posts => posts.map(p => p.id === postId ? { ...p, status: 'rejected' } : p));
  };
  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    await deleteDoc(doc(db, 'items', postId));
    setPosts(posts => posts.filter(p => p.id !== postId));
    setSuccessMessage('Post deleted successfully.');
    setTimeout(() => setSuccessMessage(''), 2500);
  };
  // Edit logic can be added as a modal or inline form

  if (showLogin) {
    return (
      <div className="donations-PageWrapper">
        <main className="donations-page-container">
          <h1 className="donations-page-title">Admin Login</h1>
          <form onSubmit={handleAdminLogin} style={{maxWidth: 400, margin: '2rem auto', background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px #0001'}}>
            <div style={{marginBottom: 16}}>
              <label>Email<br/>
                <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="donations-search-input" required />
              </label>
            </div>
            <div style={{marginBottom: 16}}>
              <label>Password<br/>
                <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="donations-search-input" required />
              </label>
            </div>
            {loginError && <div style={{color: 'red', marginBottom: 12}}>{loginError}</div>}
            <button className="donations-donate-btn" type="submit">Login</button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="donations-PageWrapper">
      <main className="donations-page-container">
        <h1 className="donations-page-title">Admin Panel</h1>
        <div className="donations-controls-bar">
          <select className="donations-select-dropdown" value={filterType} onChange={e => setFilterType(e.target.value)}>
            {POST_TYPES.map(type => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
          </select>
          <select className="donations-select-dropdown" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {STATUS_TYPES.map(status => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
          </select>
          <select className="donations-select-dropdown" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <div style={{position:'relative', display:'inline-block'}}>
            <button
              className="donations-donate-btn"
              onClick={() => {
                setShowReported(r => {
                  setSelectedItem(null); // Reset modal when toggling views
                  return !r;
                });
              }}
            >
              {showReported ? 'Hide' : 'Show'} Reported Posts
              {reportedPosts.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -8,
                  right: -10,
                  background: '#e74c3c',
                  color: '#fff',
                  borderRadius: '50%',
                  minWidth: 22,
                  height: 22,
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 4px #0002',
                  zIndex: 2,
                  padding: '0 6px',
                  pointerEvents: 'none',
                }}>
                  {reportedPosts.length}
                </span>
              )}
            </button>
          </div>
        </div>
        {/* Success message notification */}
        {successMessage && (
          <div style={{
            background: '#2ecc40',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 8,
            margin: '0 0 18px 0',
            fontWeight: 600,
            fontSize: '1.08rem',
            boxShadow: '0 2px 8px #0002',
            textAlign: 'center',
            zIndex: 100,
            position: 'relative',
          }}>
            {successMessage}
          </div>
        )}
        {showReported ? (
          <section>
            <h2 className="donations-section-title">Reported/Flagged Posts</h2>
            {reportedPosts.length === 0 ? <p>No reports.</p> : (
              <div
                className="donations-items-grid admin-mobile-grid"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '1.2rem',
                }}
              >
                {reportedPosts.map(r => {
                  const post = posts.find(p => p.id === r.postId);
                  const fallbackImg = require('../assets/placeholderimage.png');
                  if (!post) {
                    // Show a placeholder card for missing post, open modal on click
                    return (
                      <div
                        key={r.id}
                        className="donations-item-card missing-post admin-mobile-card"
                        style={{
                          minHeight: 0,
                          maxWidth: 380,
                          height: 'auto',
                          borderRadius: 14,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                          background: '#fff',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: '1.1rem 1.2rem 0.7rem 1.2rem',
                          margin: '0.7rem 0.7rem 0.7rem auto',
                          opacity: 0.7,
                          border: '2px dashed #c0392b',
                          cursor: 'pointer',
                        }}
                        onClick={e => {
                          // Prevent modal from being blocked by button clicks
                          if (e.target.tagName === 'BUTTON') return;
                          setSelectedItem({
                            ...r,
                            title: 'Post Not Found',
                            image: fallbackImg,
                            description: 'This post was reported but no longer exists.',
                            status: 'deleted',
                            type: 'unknown',
                            createdAt: r.createdAt,
                            email: r.reportedBy || 'N/A',
                            reportReason: r.reason,
                            reportedBy: r.reportedBy
                          });
                        }}
                      >
                        <div style={{ width: '100%', height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, background: '#f7f7f7', borderRadius: 10, overflow: 'hidden' }}>
                          <img
                            src={fallbackImg}
                            alt="Post not found"
                            style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain', width: 'auto', height: '100%' }}
                          />
                        </div>
                        <div style={{marginBottom: 8, textAlign: 'left', paddingLeft: 4}}>
                          <h3 style={{fontSize: '1.15rem', fontWeight: 700, color: '#c0392b', margin: 0, marginBottom: 4}}>Post Not Found</h3>
                          <div style={{marginTop: 8, fontSize: '0.97rem', color: '#c0392b', background: '#fbeee0', borderRadius: 6, padding: '6px 10px'}}>
                            <strong>Report Reason:</strong> {r.reason || 'N/A'}<br/>
                            <strong>Reported by:</strong> {r.reportedBy || 'N/A'}
                          </div>
                          <div style={{marginTop: 8, fontSize: '0.95rem', color: '#888'}}>
                            <strong>Post ID:</strong> {r.postId}
                          </div>
                        </div>
                        <div style={{display:'flex', gap:10, marginTop:10, justifyContent:'flex-end', flexWrap:'wrap'}} onClick={e => e.stopPropagation()}>
                          <button className="donations-cancel-button" style={{minWidth: 90, fontSize: '0.97rem', padding: '7px 0'}} onClick={async (e) => {
                            e.stopPropagation();
                            if(window.confirm('Delete this report?')) {
                              await deleteDoc(doc(db, 'reports', r.id));
                              setReportedPosts(prev => prev.filter(rep => rep.id !== r.id));
                              setSuccessMessage('Report deleted successfully.');
                              setTimeout(() => setSuccessMessage(''), 2500);
                            }
                          }}>🗑 Delete Report</button>
                          <button className="donations-cancel-button" style={{minWidth: 90, fontSize: '0.97rem', padding: '7px 0', background: '#e74c3c', color: '#fff'}} onClick={async (e) => {
                            e.stopPropagation();
                            if(window.confirm('Delete this post?')) {
                              await deleteDoc(doc(db, 'items', post.id));
                              setPosts(prev => prev.filter(p => p.id !== post.id));
                              setSuccessMessage('Post deleted successfully.');
                              setTimeout(() => setSuccessMessage(''), 2500);
                            }
                          }}>🗑 Delete Post</button>
                        </div>
                      </div>
                    );
                  }
                  // Make reported post card open modal on click (like all posts)
                  return (
                    <div
                      key={r.id}
                      className={`donations-item-card ${post.type || ''} admin-mobile-card`}
                      style={{
                        minHeight: 0,
                        maxWidth: 380,
                        height: 'auto',
                        borderRadius: 14,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                        background: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '1.1rem 1.2rem 0.7rem 1.2rem',
                        margin: '0.7rem 0.7rem 0.7rem auto',
                        cursor: 'pointer',
                        transition: 'box-shadow 0.2s',
                      }}
                      onClick={e => {
                        // Prevent modal from being blocked by button clicks
                        if (e.target.tagName === 'BUTTON') return;
                        setSelectedItem({ ...post, reportReason: r.reason, reportedBy: r.reportedBy });
                      }}
                    >
                      <div style={{ width: '100%', height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, background: '#f7f7f7', borderRadius: 10, overflow: 'hidden' }}>
                        <img
                          src={post.image || fallbackImg}
                          alt={post.title}
                          style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain', width: 'auto', height: '100%' }}
                          onError={e => { e.target.onerror = null; e.target.src = fallbackImg; }}
                        />
                      </div>
                      <div style={{marginBottom: 8, textAlign: 'left', paddingLeft: 4}}>
                        <h3 style={{fontSize: '1.15rem', fontWeight: 700, color: '#c0392b', margin: 0, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{post.title}</h3>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.7rem', fontSize: '0.97rem', marginBottom: 2, marginLeft: 0}}>
                          <span style={{background: '#f0f0f0', borderRadius: 6, padding: '2px 10px', color: '#444'}}><strong>Type:</strong> {post.type}</span>
                          {/* Status removed as requested */}
                          <span style={{background: '#f0f0f0', borderRadius: 6, padding: '2px 10px', color: '#444'}}><strong>User:</strong> {post.email || post.user || 'N/A'}</span>
                        </div>
                        <div style={{fontSize: '0.93rem', color: '#666', margin: '4px 0 2px 0'}}>
                          <strong>Date:</strong> {post.createdAt && post.createdAt.toDate ? post.createdAt.toDate().toLocaleString() : 'N/A'}
                        </div>
                        <div style={{fontSize: '0.95rem', color: '#333', margin: '2px 0 0 0', maxHeight: 38, overflow: 'hidden', textOverflow: 'ellipsis'}}>
                          <strong>Description:</strong> {post.description}
                        </div>
                        <div style={{marginTop: 8, fontSize: '0.97rem', color: '#c0392b', background: '#fbeee0', borderRadius: 6, padding: '6px 10px'}}>
                          <strong>Report Reason:</strong> {r.reason || 'N/A'}<br/>
                          <strong>Reported by:</strong> {r.reportedBy || 'N/A'}
                        </div>
                      </div>
                      <div style={{display:'flex', gap:10, marginTop:10, justifyContent:'flex-end', flexWrap:'wrap'}} onClick={e => e.stopPropagation()}>
                        <button className="donations-cancel-button" style={{minWidth: 90, fontSize: '0.97rem', padding: '7px 0'}} onClick={async (e) => { e.stopPropagation(); if(window.confirm('Delete this report?')) { await deleteDoc(doc(db, 'reports', r.id)); setReportedPosts(prev => prev.filter(rep => rep.id !== r.id)); } }}>🗑 Delete Report</button>
                        <button className="donations-cancel-button" style={{minWidth: 90, fontSize: '0.97rem', padding: '7px 0', background: '#e74c3c', color: '#fff'}} onClick={async (e) => { e.stopPropagation(); if(window.confirm('Delete this post?')) { await deleteDoc(doc(db, 'items', post.id)); setPosts(prev => prev.filter(p => p.id !== post.id)); } }}>🗑 Delete Post</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section>
            <h2 className="donations-section-title">All Posts</h2>
            {loading ? <p>Loading...</p> : filteredPosts.length === 0 ? <p>No posts found.</p> : (
              <div
                className="donations-items-grid admin-mobile-grid"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '1.2rem',
                }}
              >
                {filteredPosts && filteredPosts.length > 0 && filteredPosts.map(post => {
                  const fallbackImg = require('../assets/placeholderimage.png');
                  return (
                    <div
                      key={post.id}
                      className={`donations-item-card ${post.type || ''} admin-mobile-card`}
                      style={{
                        minHeight: 0,
                        maxWidth: 380,
                        height: 'auto',
                        borderRadius: 14,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                        background: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '1.1rem 1.2rem 0.7rem 1.2rem',
                        margin: 'auto',
                        cursor: 'pointer',
                        transition: 'box-shadow 0.2s',
                      }}
                      onClick={() => setSelectedItem(post)}
                    >
                      <div style={{ width: '100%', height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, background: '#f7f7f7', borderRadius: 10, overflow: 'hidden' }}>
                        <img
                          src={post.image || fallbackImg}
                          alt={post.title}
                          style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain', width: 'auto', height: '100%' }}
                          onError={e => { e.target.onerror = null; e.target.src = fallbackImg; }}
                        />
                      </div>
                      <div style={{marginBottom: 8, textAlign: 'left', paddingLeft: 4}}>
                        <h3 style={{fontSize: '1.15rem', fontWeight: 700, color: '#2E8B57', margin: 0, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{post.title}</h3>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.7rem', fontSize: '0.97rem', marginBottom: 2, marginLeft: 0}}>
                          <span style={{background: '#f0f0f0', borderRadius: 6, padding: '2px 10px', color: '#444'}}><strong>Type:</strong> {post.type}</span>
                          {/* Status removed as requested */}
                          <span style={{background: '#f0f0f0', borderRadius: 6, padding: '2px 10px', color: '#444'}}><strong>User:</strong> {post.email || post.user || 'N/A'}</span>
                        </div>
                        <div style={{fontSize: '0.93rem', color: '#666', margin: '4px 0 2px 0'}}>
                          <strong>Date:</strong> {post.createdAt && post.createdAt.toDate ? post.createdAt.toDate().toLocaleString() : 'N/A'}
                        </div>
                        <div style={{fontSize: '0.95rem', color: '#333', margin: '2px 0 0 0', maxHeight: 38, overflow: 'hidden', textOverflow: 'ellipsis'}}>
                          <strong>Description:</strong> {post.description}
                        </div>
                      </div>
                      <div style={{display:'flex', gap:10, marginTop:10, justifyContent:'flex-end', flexWrap:'wrap'}} onClick={e => e.stopPropagation()}>
                        {/* Approve and Reject buttons removed as requested */}
                        <button className="donations-cancel-button" style={{minWidth: 90, fontSize: '0.97rem', padding: '7px 0'}} onClick={() => handleDelete(post.id)}>🗑 Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        )}
        {/* Modal for selected item info - always render at the end so it works for both views */}
        {selectedItem && (
          <div className="donations-modal-overlay" onClick={() => setSelectedItem(null)}>
            <div className="donations-modal-content" onClick={e => e.stopPropagation()}>
              <div className="donations-modal-header">
                <button className="donations-modal-close" onClick={() => setSelectedItem(null)}>×</button>
                <h2 className="donations-modal-title">{selectedItem.title}</h2>
              </div>
              <div className="donations-modal-body">
                <img
                  src={selectedItem.image || require('../assets/placeholderimage.png')}
                  alt="item"
                  className="donations-modal-image"
                  style={{maxHeight: 220, objectFit: 'contain', marginBottom: 16}}
                  onError={e => { e.target.onerror = null; e.target.src = require('../assets/placeholderimage.png'); }}
                />
                <div className="donations-modal-details">
                  <p><strong>Description:</strong> {selectedItem.description}</p>
                  {/* Status removed as requested */}
                  <p><strong>Type:</strong> {selectedItem.type}</p>
                  <p><strong>Category:</strong> {selectedItem.category || 'N/A'}</p>
                  <p><strong>Location:</strong> {selectedItem.location || 'N/A'}</p>
                  {selectedItem.quantity && <p><strong>Quantity:</strong> {selectedItem.quantity}</p>}
                  {selectedItem.condition && <p><strong>Condition:</strong> {selectedItem.condition}</p>}
                  {selectedItem.urgency && <p><strong>Urgency:</strong> {selectedItem.urgency}</p>}
                  <p><strong>Date:</strong> {selectedItem.createdAt && selectedItem.createdAt.toDate ? selectedItem.createdAt.toDate().toLocaleString() : (selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : 'N/A')}</p>
                  <p><strong>User:</strong> {selectedItem.email || selectedItem.user || 'N/A'}</p>
                  {selectedItem.reportReason && (
                    <>
                      <p style={{color:'#c0392b'}}><strong>Report Reason:</strong> {selectedItem.reportReason}</p>
                      <p style={{color:'#c0392b'}}><strong>Reported by:</strong> {selectedItem.reportedBy}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminPage;
