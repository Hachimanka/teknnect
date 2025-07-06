import React, { useState, useEffect, useMemo } from 'react';
// Only import addDoc and serverTimestamp here for reporting
import { addDoc, serverTimestamp } from 'firebase/firestore';
import './LostFoundPage.css';
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
  setDoc
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

function LostFoundPage({ darkMode }) {
  // Modal and Form State
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [defaultItemType, setDefaultItemType] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);
  const [message, setMessage] = useState('');

  // Report modal state (match Trade)
  const [reportingItem, setReportingItem] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState('');

  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  // Loading and Success State
  const [isSending, setIsSending] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageVariant, setSuccessMessageVariant] = useState('');
  const [successMessagePosition, setSuccessMessagePosition] = useState('');

  // Data and Loading State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtering, Sorting, and Pagination State
  const [filterType, setFilterType] = useState('all'); // all, lost, found
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest'); // newest, oldest
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'items'),
          where('type', 'in', ['lost', 'found']),
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
            status: data.type.charAt(0).toUpperCase() + data.type.slice(1),
            user: userName,
            image: data.imageUrls?.[0] || '',
            profile: userProfile,
          };
        }));

        // Filter out null values (completed items)
        const filteredResults = results.filter(item => item !== null);
        setItems(filteredResults);
      } catch (err)
        { console.error("Error fetching items:", err); } 
      finally 
        { setLoading(false); }
    };

    fetchItems();
  }, []);

  // Standardized categories for consistency with Rent/other pages
  const ALL_CATEGORIES = [
    "Electronics",
    "Books",
    "Clothing",
    "Other"
  ];

  const processedItems = useMemo(() => {
    let results = items;
    if (filterType !== 'all') { results = results.filter(item => item.type === filterType); }
    if (filterCategory !== 'all') { results = results.filter(item => item.category === filterCategory); }
    if (searchTerm.trim() !== '') { results = results.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase())); }
    results = [...results].sort((a, b) => {
      // Always sort by createdAt, even if category is 'all'
      const dateA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(0);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return results;
  }, [items, filterType, filterCategory, searchTerm, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterCategory, searchTerm, sortOrder]);

  const totalPages = Math.ceil(processedItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, processedItems]);

  const handleCardClick = (item) => setSelectedItem(item);
  // Trade-style report modal logic
  const openReportModal = (item) => {
    setReportingItem(item);
    setReportReason('');
    setReportSuccess(false);
    setReportError('');
  };
  const closeReportModal = () => {
    setReportingItem(null);
    setReportReason('');
    setReportSuccess(false);
    setReportError('');
  };
  const closeModal = () => setSelectedItem(null);
  const openPostModal = (itemType) => {
    setDefaultItemType(itemType);
    setShowPostModal(true);
  };
  const closePostModal = () => {
    setShowPostModal(false);
    setDefaultItemType('');
  };

  // Random success message generator
  const getRandomSuccessMessage = () => {
    const messages = [
      { title: "Message Sent! 🎉", text: "Your message has been delivered successfully!" },
      { title: "Awesome! ✨", text: "Your inquiry has been sent to the item owner!" },
      { title: "Success! 🚀", text: "Connection established! They'll get back to you soon." },
      { title: "Delivered! 📬", text: "Your message is on its way to the recipient!" },
      { title: "Great! 💫", text: "Successfully sent your message about the item!" },
      { title: "Sent! 🎊", text: "Your inquiry has been delivered successfully!" },
      { title: "Perfect! ⭐", text: "Message sent! Hope you find what you're looking for!" },
      { title: "Done! 🎯", text: "Your message has been sent to the item owner!" }
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getRandomVariantAndPosition = () => {
    const variants = ['variant-1', 'variant-2', 'variant-3', 'variant-4'];
    const positions = ['', 'position-top', 'position-bottom', 'position-left', 'position-right'];
    
    return {
      variant: variants[Math.floor(Math.random() * variants.length)],
      position: positions[Math.floor(Math.random() * positions.length)]
    };
  };

  const showSuccessNotification = (messageData) => {
    const { variant, position } = getRandomVariantAndPosition();
    setSuccessMessageVariant(variant);
    setSuccessMessagePosition(position);
    setShowSuccessMessage(true);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
      // Reset classes after animation
      setTimeout(() => {
        setSuccessMessageVariant('');
        setSuccessMessagePosition('');
      }, 300);
    }, 3000);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedItem?.uid || isSending) return;
    
    setIsSending(true);
    
    const sender = auth.currentUser; 
    const receiverId = selectedItem.uid;
    
    if (!sender || !receiverId) { 
      alert('Cannot send message. You may not be logged in.'); 
      setIsSending(false);
      return; 
    }
    
    const chatId = sender.uid < receiverId ? `${sender.uid}_${receiverId}` : `${receiverId}_${sender.uid}`;
    
    try {
      await setDoc(doc(db, 'chats', chatId), { 
        users: [sender.uid, receiverId], 
        lastMessage: message.trim(), 
        lastMessageTime: serverTimestamp(), 
        lastPostId: selectedItem.id, 
        lastPostTitle: selectedItem.title, 
        lastPostStatus: selectedItem.status 
      }, { merge: true });
      
      const messageData = {
        sender: sender.uid, 
        senderName: sender.displayName || sender.email, 
        text: `[RE: ${selectedItem.status} - ${selectedItem.title}] ${message.trim()}`, 
        timestamp: serverTimestamp(), 
        read: false,
        postReference: { 
          postId: selectedItem.id, 
          postTitle: selectedItem.title, 
          postStatus: selectedItem.status, 
          postCategory: selectedItem.category || 'N/A', 
          postLocation: selectedItem.location || 'N/A', 
          postImage: selectedItem.image, 
          postDescription: selectedItem.description, 
          postOwner: selectedItem.user, 
          postOwnerUid: selectedItem.uid, 
          postCreatedAt: selectedItem.createdAt 
        },
        messageType: 'post_inquiry', 
        messageContext: `Inquiry about ${selectedItem.status.toLowerCase()} item: ${selectedItem.title}`, 
        originalMessage: message.trim()
      };
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      // Close chat modal first
      setShowChatModal(false);
      setMessage('');
      
      // Close item detail modal
      setSelectedItem(null);
      
      // Show success message
      showSuccessNotification(getRandomSuccessMessage());
      
    } catch (err) { 
      console.error('Error sending message:', err); 
      alert('Failed to send message. Please try again.'); 
    } finally {
      setIsSending(false);
    }
  };

  const closeChatModal = () => {
    setShowChatModal(false);
    setMessage('');
  };

  return (
    <div className={`lostfound-PageWrapper ${darkMode ? 'dark-mode' : ''}`}>
      <main className="lostfound-page-container">
        <h1 className="lostfound-page-title">Lost & Found</h1>
        <p className="lostfound-page-subtitle">Have you lost or found an item? Post it here and help the community!</p>

        <div className="lostfound-action-buttons">
          <button className="lostfound-report-lost-btn" onClick={() => openPostModal('Lost')}>Report Lost Item</button>
          <button className="lostfound-report-found-btn" onClick={() => openPostModal('Found')}>Report Found Item</button>
        </div>
        
        <div className="lostfound-controls-bar">
            <input 
                type="text"
                placeholder="Search items..."
                className="lostfound-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
             <select className="lostfound-select-dropdown" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">All Types</option>
                <option value="lost">Lost</option>
                <option value="found">Found</option>
            </select>
            <select className="lostfound-select-dropdown" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">All Categories</option>
                {ALL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select className="lostfound-select-dropdown" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
            </select>
        </div>

        <section className="lostfound-items-section">
          <h2 className="lostfound-section-title">Community Posts</h2>
          {loading ? (
             <p className="lostfound-loading-message">Loading posts...</p>
          ) : paginatedItems.length === 0 ? (
              <p className="lostfound-empty-message">No posts match your criteria.</p>
            ) : (
            <>
              <div className="lostfound-items-grid">
                {paginatedItems.map((item) => (
                <div key={item.id} className={`lostfound-item-card ${item.type}`} onClick={() => handleCardClick(item)}>
                  <div className={`lostfound-item-badge ${item.type}`}>{item.status}</div>
                  <div className="lostfound-item-image"><img src={item.image} alt="item" /></div>
                  <div className={`lostfound-item-info ${item.type}`}>
                    <div>
                      <h3 className="lostfound-item-title">{item.title}</h3>
                      <p className="lostfound-item-description">{item.description}</p>
                      <p className="lostfound-item-date">{item.status === 'Lost' ? `Lost on: ${formatDate(item.createdAt)}` : `Found on: ${formatDate(item.createdAt)}`}</p>
                    </div>
                    <div className="lostfound-item-footer">
                      <div className="lostfound-item-user">
                        <img src={item.profile} alt="profile" className="lostfound-profile-pic" />
                        <span>{item.user}</span>
                      </div>
                      {auth.currentUser && item.uid !== auth.currentUser.uid && (
                        <button
                          className="lostfound-report-btn"
                          style={{ background: '#fff', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 6, padding: '2px 8px', fontSize: '0.85rem', cursor: 'pointer', position: 'absolute', top: 8, right: 8, zIndex: 2 }}
                          onClick={e => { e.stopPropagation(); openReportModal(item); }}
                          title="Report this post"
                        >
                          Report
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
                <div className="lostfound-pagination">
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
          <div className="lostfound-modal-overlay" onClick={closeModal}>
            <div className="lostfound-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="lostfound-modal-header">
                <button className="lostfound-modal-close" onClick={closeModal}> d7</button>
                <h2 className="lostfound-modal-title">{selectedItem.title}</h2>
              </div>
              <div className="lostfound-modal-body">
                <img src={selectedItem.image} alt="item" className="lostfound-modal-image" />
                <div className="lostfound-modal-details">
                  <p><strong>Description:</strong> {selectedItem.description}</p>
                  <p><strong>Status:</strong> {selectedItem.status}</p>  
                  <p><strong>Category:</strong> {selectedItem.category || 'N/A'}</p>
                  <p><strong>Location:</strong> {selectedItem.location || 'N/A'}</p>
                  <p><strong>{selectedItem.status === 'Lost' ? 'Lost on:' : 'Found on:'}</strong> {formatDate(selectedItem.createdAt)}</p>
                  <p><strong>Reported by:</strong> {selectedItem.user}</p>
                </div>
              </div>
              <div className="lostfound-modal-footer">
                {auth.currentUser && selectedItem.uid !== auth.currentUser.uid ? (
                  <>
                    <button className="lostfound-chat-button" onClick={() => setShowChatModal(true)}>Chat With Uploader</button>
                    <button className="lostfound-report-btn" style={{ marginLeft: 8, background: '#fbeee0', color: '#c0392b', border: '1px solid #c0392b', borderRadius: 6, padding: '4px 10px', fontSize: '0.95rem', cursor: 'pointer' }} onClick={() => openReportModal(selectedItem)}>Report</button>
                  </>
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

        {/* Report Modal (Trade style) */}
        {reportingItem && (
          <div className="lostfound-modal-overlay" onClick={closeReportModal}>
            <div className="lostfound-modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:400}}>
              <div className="lostfound-modal-header">
                <button className="lostfound-modal-close" onClick={closeReportModal}>×</button>
                <h2 className="lostfound-modal-title">Report Post</h2>
              </div>
              <div className="lostfound-modal-body">
                <p style={{marginBottom:8}}><strong>Post:</strong> {reportingItem.title}</p>
                <textarea
                  className="lostfound-chat-textarea"
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
                  className="lostfound-send-button"
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
                        postType: reportingItem.type || 'lostfound',
                        postTitle: reportingItem.title
                      });
                      setReportSuccess(true);
                      setTimeout(()=>closeReportModal(),1200);
                    } catch (err) {
                      setReportError('Failed to submit report.');
                    } finally {
                      setReportLoading(false);
                    }
                  }}
                >{reportLoading ? 'Submitting...' : 'Submit Report'}</button>
                <button className="lostfound-cancel-button" onClick={closeReportModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showPostModal && <PostItemModal onClose={closePostModal} defaultType={defaultItemType} />}

        {showChatModal && (
          <div className="lostfound-modal-overlay" onClick={() => setShowChatModal(false)}>
            <div className="lostfound-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="lostfound-modal-header">
                <button className="lostfound-modal-close" onClick={closeChatModal}>×</button>
                <h2 className="lostfound-modal-title">Chat With Uploader</h2>
              </div>
              <div className="lostfound-modal-body">
                <div className="lostfound-post-reference-card">
                  <div className="lostfound-post-ref-header">
                    <span className={`lostfound-post-ref-badge ${selectedItem?.type}`}>{selectedItem?.status}</span>
                    <h4 className="lostfound-post-ref-title">{selectedItem?.title}</h4>
                  </div>
                  <div className="lostfound-post-ref-details">
                    <div className="lostfound-post-ref-image"><img src={selectedItem?.image} alt="item" /></div>
                    <div className="lostfound-post-ref-info">
                      <p><strong>Category:</strong> {selectedItem?.category || 'N/A'}</p>
                      <p><strong>Location:</strong> {selectedItem?.location || 'N/A'}</p>
                      <p><strong>Posted by:</strong> {selectedItem?.user}</p>
                    </div>
                  </div>
                </div>
                <div className="lostfound-chat-info">
                  <p>Send a message to <strong>{selectedItem?.user}</strong> about their {selectedItem?.status.toLowerCase()} item: <strong>{selectedItem?.title}</strong></p>
                </div>
                <textarea
                  className="lostfound-chat-textarea"
                  placeholder={`Write a message...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                />
                <div className="lostfound-char-count">{message.length}/500</div>
              </div>
              <div className="lostfound-modal-footer">
                <div className="lostfound-chat-actions">
                  <button className="lostfound-cancel-button" onClick={closeChatModal}>Cancel</button>
                  <button 
                    className={`lostfound-send-button ${isSending ? 'loading' : ''}`} 
                    onClick={handleSendMessage} 
                    disabled={!message.trim() || isSending}
                  >
                    <span>{isSending ? 'Sending...' : 'Send Message'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message Overlay */}
        {showSuccessMessage && (
          <div className={`lostfound-success-overlay ${showSuccessMessage ? 'show' : ''}`}>
            <div className={`lostfound-success-message ${successMessageVariant} ${successMessagePosition}`}>
              <span className="lostfound-success-icon">✨</span>
              <h3 className="lostfound-success-title">{getRandomSuccessMessage().title}</h3>
              <p className="lostfound-success-text">{getRandomSuccessMessage().text}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default LostFoundPage;