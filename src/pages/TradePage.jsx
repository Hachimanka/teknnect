import React, { useState, useEffect, useMemo } from 'react';
// Only import addDoc and serverTimestamp ONCE, and collection if not already imported below
import './TradePage.css';
import DefaultProfile from '../assets/logo.png';
import PostItemModal from '../components/PostItemModal';
import { auth, db } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

const ITEMS_PER_PAGE = 8;

function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return 'Unknown date';
  const date = timestamp.toDate();
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function TradePage({ darkMode }) {
  // Modal and Form State
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [message, setMessage] = useState('');
  // Report modal state
  const [reportingItem, setReportingItem] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState('');

  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  // Data and Loading State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtering, Sorting, and Pagination State
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'items'),
          where('type', '==', 'trade'),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const results = await Promise.all(querySnapshot.docs.map(async docSnap => {
          const data = docSnap.data();
          
          // Skip items that are marked as completed
          if (data.completed === true) {
            return null;
          }
          
          let userProfile = DefaultProfile;
          let userName = data.email;

          if (data.uid) {
            const userDoc = await getDoc(doc(db, 'users', data.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.photoURL) userProfile = userData.photoURL;
              if (userData.name) userName = userData.name;
            }
          }

          return {
            id: docSnap.id,
            ...data,
            status: 'Trade',
            user: userName,
            image: data.imageUrls?.[0] || '',
            profile: userProfile,
          };
        }));

        // Filter out null values (completed items)
        const filteredResults = results.filter(item => item !== null);
        setItems(filteredResults);
      } catch (err) {
        console.error("Error fetching trade items:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const ALL_CATEGORIES = [
    "Electronics",
    "Books",
    "Clothing",
    "Other"
  ];

  const processedItems = useMemo(() => {
    let results = items;
    if (filterCategory !== 'all') { results = results.filter(item => item.category === filterCategory); }
    if (searchTerm.trim() !== '') { results = results.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase())); }
    results = [...results].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.();
      const dateB = b.createdAt?.toDate?.();
      
      // Handle cases where dates might be missing or invalid
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;  // Put items without date at the end
      if (!dateB) return -1; // Put items without date at the end
      
      return sortOrder === 'newest' ? 
        dateB.getTime() - dateA.getTime() : 
        dateA.getTime() - dateB.getTime();
    });
    return results;
  }, [items, filterCategory, searchTerm, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, searchTerm, sortOrder]);

  const totalPages = Math.ceil(processedItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, processedItems]);

  const handleCardClick = (item) => setSelectedItem(item);
  const closeModal = () => setSelectedItem(null);
  const openPostModal = () => setShowPostModal(true);
  const closePostModal = () => setShowPostModal(false);

  const handleSendMessage = async () => {
    // Logic is identical to the original and does not need changes
    if (!message.trim() || !selectedItem?.uid) return;
    const sender = auth.currentUser; const receiverId = selectedItem.uid;
    if (!sender || !receiverId) { alert('Cannot send message. You may not be logged in.'); return; }
    if (sender.uid === receiverId) { alert('You cannot message yourself.'); return; }
    const chatId = sender.uid < receiverId ? `${sender.uid}_${receiverId}` : `${receiverId}_${sender.uid}`;
    try {
        await setDoc(doc(db, 'chats', chatId), { users: [sender.uid, receiverId], lastMessage: `[RE: Trade - ${selectedItem.title}] ${message.trim()}`, lastMessageTime: serverTimestamp(), lastPostId: selectedItem.id, lastPostTitle: selectedItem.title, lastPostStatus: 'Trade', lastPostType: 'trade' }, { merge: true });
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
            sender: sender.uid, senderName: sender.displayName || sender.email, text: `[RE: Trade - ${selectedItem.title}] ${message.trim()}`, timestamp: serverTimestamp(), read: false,
            postReference: { postType: 'trade', postId: selectedItem.id, postTitle: selectedItem.title, postStatus: 'Trade', postCategory: selectedItem.category || 'N/A', postLocation: selectedItem.location || 'N/A', postImage: selectedItem.image, postDescription: selectedItem.description, postOwner: selectedItem.user, postOwnerUid: selectedItem.uid, postCreatedAt: selectedItem.createdAt, postPrice: selectedItem.price || 'N/A', postCondition: selectedItem.condition || 'N/A' },
            messageType: 'post_inquiry', messageContext: `Inquiry about trade item: ${selectedItem.title}`, originalMessage: message.trim()
        });
        setShowChatModal(false); setMessage(''); alert('Message sent successfully!');
    } catch (err) { console.error('Error sending message:', err); alert('Failed to send message. Please try again.'); }
  };

  const closeChatModal = () => {
    setShowChatModal(false);
    setMessage('');
  };

  return (
    <div className={`trade-PageWrapper ${darkMode ? 'dark-mode' : ''}`}>
      <main className="trade-page-container">
        <h1 className="trade-page-title">Trade Marketplace</h1>
        <p className="trade-page-subtitle">Trade items with the community!</p>

        <div className="trade-action-buttons">
          <button className="trade-post-trade-btn" onClick={openPostModal}>Post Trade Offer</button>
        </div>

        <div className="trade-controls-bar">
            <input 
                type="text"
                placeholder="Search items..."
                className="trade-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select className="trade-select-dropdown" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">All Categories</option>
                {ALL_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
            <select className="trade-select-dropdown" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
            </select>
        </div>
        
        <section className="trade-items-section">
          <h2 className="trade-section-title">Recent Trade Posts</h2>
          {loading ? (
             <p className="trade-loading-message">Loading posts...</p>
          ) : paginatedItems.length === 0 ? (
            <p className="trade-empty-message">No trade posts found.</p>
          ) : (
            <>
            <div className="trade-items-grid">
              {paginatedItems.map((item) => (
                <div key={item.id} className="trade-item-card" onClick={() => handleCardClick(item)} style={{position:'relative'}}>
                  <div className="trade-item-badge">For Trade</div>
                  <div className="trade-item-image">
                    <img src={item.image} alt={item.title} />
                  </div>
                  {/* Small report button */}
                  <button
                    className="trade-report-btn"
                    style={{position:'absolute',top:8,right:8,padding:'2px 8px',fontSize:'0.85rem',borderRadius:6,border:'1px solid #e74c3c',background:'#fff',color:'#e74c3c',cursor:'pointer',zIndex:2}}
                    onClick={e => {e.stopPropagation(); setReportingItem(item); setReportReason(''); setReportSuccess(false); setReportError('');}}
                    title="Report this post"
                  >
                    Report
                  </button>
                  <div className="trade-item-info">
                    <div>
                      <h3 className="trade-item-title">{item.title}</h3>
                      <p className="trade-item-description">{item.description}</p>
                      {item.price && <p className="trade-item-price">₱{item.price}</p>}
                      <p className="trade-item-date">Posted on: {formatDate(item.createdAt)}</p>
                    </div>
                    <div className="trade-item-footer">
                      <div className="trade-item-user">
                        <img src={item.profile} alt="profile" className="trade-profile-pic" />
                        <span>{item.user}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
        {/* Report Modal */}
        {reportingItem && (
          <div className="trade-modal-overlay" onClick={()=>setReportingItem(null)}>
            <div className="trade-modal-content" onClick={e=>e.stopPropagation()} style={{maxWidth:400}}>
              <div className="trade-modal-header">
                <button className="trade-modal-close" onClick={()=>setReportingItem(null)}>×</button>
                <h2 className="trade-modal-title">Report Post</h2>
              </div>
              <div className="trade-modal-body">
                <p style={{marginBottom:8}}><strong>Post:</strong> {reportingItem.title}</p>
                <textarea
                  className="trade-chat-textarea"
                  placeholder="Reason for reporting (required)"
                  value={reportReason}
                  onChange={e=>setReportReason(e.target.value)}
                  maxLength={300}
                  style={{width:'100%',minHeight:60,marginBottom:8}}
                />
                <div style={{fontSize:'0.9rem',color:'#888',marginBottom:8}}>{reportReason.length}/300</div>
                {reportError && <div style={{color:'#e74c3c',marginBottom:8}}>{reportError}</div>}
                {reportSuccess && <div style={{color:'#27ae60',marginBottom:8}}>Report submitted. Thank you!</div>}
                <button
                  className="trade-send-button"
                  style={{background:'#e74c3c',color:'#fff',marginRight:8}}
                  disabled={!reportReason.trim() || reportLoading}
                  onClick={async ()=>{
                    setReportError('');
                    setReportSuccess(false);
                    setReportLoading(true);
                    try {
                      const user = auth.currentUser;
                      await addDoc(collection(db,'reports'),{
                        postId: reportingItem.id,
                        reason: reportReason.trim(),
                        reportedBy: user ? (user.email || user.uid) : 'Anonymous',
                        createdAt: serverTimestamp(),
                        postType: 'trade',
                        postTitle: reportingItem.title
                      });
                      setReportSuccess(true);
                      setTimeout(()=>setReportingItem(null),1200);
                    } catch (err) {
                      setReportError('Failed to submit report.');
                    } finally {
                      setReportLoading(false);
                    }
                  }}
                >{reportLoading ? 'Submitting...' : 'Submit Report'}</button>
                <button className="trade-cancel-button" onClick={()=>setReportingItem(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
            </div>
             {totalPages > 1 && (
                <div className="trade-pagination">
                    <button onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}>« Previous</button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage === totalPages}>Next »</button>
                </div>
            )}
            </>
          )}
        </section>
        
        {/* --- Modals --- */}
        {selectedItem && (
          <div className="trade-modal-overlay" onClick={closeModal}>
            <div className="trade-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="trade-modal-header">
                <button className="trade-modal-close" onClick={closeModal}>×</button>
                <h2 className="trade-modal-title">{selectedItem.title}</h2>
              </div>
              <div className="trade-modal-body">
                <img src={selectedItem.image} alt={selectedItem.title} className="trade-modal-image" />
                <div className="trade-modal-details">
                  <p><strong>Description:</strong> {selectedItem.description}</p>
                  <p><strong>Type:</strong> For Trade</p>
                  {selectedItem.price && <p><strong>Price:</strong> ₱{selectedItem.price}</p>}
                  <p><strong>Category:</strong> {selectedItem.category || 'N/A'}</p>
                  <p><strong>Location:</strong> {selectedItem.location || 'N/A'}</p>
                  {selectedItem.condition && <p><strong>Condition:</strong> {selectedItem.condition}</p>}
                  <p><strong>Posted on:</strong> {formatDate(selectedItem.createdAt)}</p>
                  <p><strong>Posted by:</strong> {selectedItem.user}</p>
                </div>
              </div>
              <div className="trade-modal-footer">
                {auth.currentUser && selectedItem.uid !== auth.currentUser.uid ? (
                  <button className="trade-chat-button" onClick={() => setShowChatModal(true)}>Contact Trader</button>
                ) : (
                  <div style={{textAlign: 'center', color: '#888', fontWeight: 500, padding: '0.2rem 0', minHeight: '32px'}}>
                    <div style={{fontSize: '1rem', lineHeight: 1.1}}>Your Post</div>
                    <div style={{fontSize: '0.85rem', lineHeight: 1.1}}>This is your post. Other users can contact you about this item.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showPostModal && <PostItemModal onClose={closePostModal} defaultType="trade" />}

        {showChatModal && selectedItem && (
          <div className="trade-modal-overlay" onClick={closeChatModal}>
            <div className="trade-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="trade-modal-header">
                <button className="trade-modal-close" onClick={closeChatModal}>×</button>
                <h2 className="trade-modal-title">Contact Trader</h2>
              </div>
              <div className="trade-modal-body">
                <div className="trade-post-reference-card">
                  <div className="trade-post-ref-header">
                    <span className="trade-post-ref-badge">For Trade</span>
                    <h4 className="trade-post-ref-title">{selectedItem.title}</h4>
                  </div>
                  <div className="trade-post-ref-details">
                    <div className="trade-post-ref-image"><img src={selectedItem.image} alt={selectedItem.title} /></div>
                    <div className="trade-post-ref-info">
                      <p><strong>Category:</strong> {selectedItem.category || 'N/A'}</p>
                      <p><strong>Location:</strong> {selectedItem.location || 'N/A'}</p>
                      {selectedItem.price && <p><strong>Price:</strong> ₱{selectedItem.price}</p>}
                      <p><strong>Posted by:</strong> {selectedItem.user}</p>
                    </div>
                  </div>
                </div>
                <div className="trade-chat-info">
                  <p>Send a message to <strong>{selectedItem.user}</strong> about their trade item: <strong> {selectedItem.title}</strong></p>
                </div>
                <textarea
                  className="trade-chat-textarea"
                  placeholder={`Write a message...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                />
                <div className="trade-char-count">{message.length}/500</div>
              </div>
              <div className="trade-modal-footer">
                <div className="trade-chat-actions">
                  <button className="trade-cancel-button" onClick={closeChatModal}>Cancel</button>
                  <button className="trade-send-button" onClick={handleSendMessage} disabled={!message.trim()}>Send Message</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default TradePage;