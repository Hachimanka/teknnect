import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import styles from './MyItemsPage.module.css';


function MyItemsPage() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [completeLoading, setCompleteLoading] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageVariant, setSuccessMessageVariant] = useState('');
  const [successMessagePosition, setSuccessMessagePosition] = useState('');
  
  const getRandomSuccessMessage = (type) => {
  const messages = {
    delete: [
      { title: "Item Deleted!", text: "Your item has been successfully removed." },
      { title: "Gone Forever!", text: "Item deleted from your collection." },
      { title: "Removed!", text: "Item has been permanently deleted." }
    ],
    complete: [
      { title: "Transaction Complete!", text: "Congratulations on your successful transaction!" },
      { title: "Well Done!", text: "Another successful transaction completed!" },
      { title: "Success!", text: "Transaction marked as completed successfully!" }
    ]
  };
  
  const typeMessages = messages[type] || messages.complete;
  return typeMessages[Math.floor(Math.random() * typeMessages.length)];
};

const showSuccessAnimation = (type) => {
  setSuccessMessageVariant(type === 'delete' ? 'delete' : 'complete');
  setSuccessMessagePosition('center');
  setShowSuccessMessage(true);
  
  setTimeout(() => {
    setShowSuccessMessage(false);
  }, 3000);
};
  // New state for posts/completed filter
  const [statusFilter, setStatusFilter] = useState('posts'); // 'posts' or 'completed'
  
  // New state for search and sort
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Modal state
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUserItems(currentUser.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserItems = async (userId) => {
    try {
      setLoading(true);
      const itemsRef = collection(db, 'items');
      const q = query(
        itemsRef,
        where('uid', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const userItems = [];
      
      querySnapshot.forEach((doc) => {
        userItems.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      userItems.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      setItems(userItems);
    } catch (error) {
      console.error('Error fetching user items:', error);
      alert('Error loading your items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      setDeleteLoading(itemId);
      await deleteDoc(doc(db, 'items', itemId));
      setItems(items.filter(item => item.id !== itemId));
      showSuccessAnimation('delete');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleCompleteTransaction = async (itemId) => {
    if (!window.confirm('Mark this transaction as completed? This will hide it from public listings.')) {
      return;
    }

    try {
      setCompleteLoading(itemId);
      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, {
        completed: true,
        completedAt: new Date()
      });
      
      // Update local state
      setItems(items.map(item => 
        item.id === itemId 
          ? { ...item, completed: true, completedAt: new Date() }
          : item
      ));
      
      showSuccessAnimation('complete');
    } catch (error) {
      console.error('Error completing transaction:', error);
      alert('Error completing transaction. Please try again.');
    } finally {
      setCompleteLoading(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const categorizeItems = () => {
    // Filter based on status first
    const statusFilteredItems = items.filter(item => {
      if (statusFilter === 'posts') {
        return !item.completed;
      } else {
        return item.completed;
      }
    });

    const categorized = {
      trade: [],
      rent: [],
      lost: [],
      found: [],
      donation: []
    };

    statusFilteredItems.forEach(item => {
      const type = item.type?.toLowerCase();
      if (categorized[type]) {
        categorized[type].push(item);
      }
    });

    return categorized;
  };

  // Updated filtering function that includes search and status
  const getFilteredItems = () => {
    let filtered = items;

    // Filter by status (posts/completed)
    if (statusFilter === 'posts') {
      filtered = filtered.filter(item => !item.completed);
    } else {
      filtered = filtered.filter(item => item.completed);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.type?.toLowerCase() === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.title?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower) ||
        item.location?.toLowerCase().includes(searchLower)
      );
    }

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        
        case 'oldest':
          const dateA2 = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB2 = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateA2 - dateB2;
        
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '');
        
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        
        case 'location':
          return (a.location || '').localeCompare(b.location || '');
        
        default:
          return 0;
      }
    });

    return filtered;
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const getItemTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'trade': return '🔄';
      case 'rent': return '🏠';
      case 'lost': return '😰';
      case 'found': return '😊';
      case 'donation': return '❤️';
      default: return '📦';
    }
  };

  const getItemTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'trade': return '#007bff';
      case 'rent': return '#28a745';
      case 'lost': return '#dc3545';
      case 'found': return '#ffc107';
      case 'donation': return '#e83e8c';
      default: return '#6c757d';
    }
  };

  // Modal functions
  const openModal = (item) => {
    setSelectedItem(item);
    setCurrentImageIndex(0);
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  };

  const closeModal = () => {
    setSelectedItem(null);
    setCurrentImageIndex(0);
    document.body.style.overflow = 'unset'; // Restore scrolling
  };

  const nextImage = () => {
    if (selectedItem?.imageUrls?.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === selectedItem.imageUrls.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (selectedItem?.imageUrls?.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedItem.imageUrls.length - 1 : prev - 1
      );
    }
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && selectedItem) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedItem]);

  const categorizedItems = categorizeItems();
  const filteredItems = getFilteredItems();

  // Get counts for status filter
  const postsCount = items.filter(item => !item.completed).length;
  const completedCount = items.filter(item => item.completed).length;

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.notLoggedIn}>
          <h2>Please log in to view your items</h2>
          <p>You need to be logged in to see your posting history.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading your items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Items</h1>
        <p>Your posting history organized by category</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{items.length}</span>
          <span className={styles.statLabel}>Total Items</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{categorizedItems.trade.length}</span>
          <span className={styles.statLabel}>Trade Items</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{categorizedItems.rent.length}</span>
          <span className={styles.statLabel}>Rent Items</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{categorizedItems.lost.length + categorizedItems.found.length}</span>
          <span className={styles.statLabel}>Lost & Found</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{categorizedItems.donation.length}</span>
          <span className={styles.statLabel}>Donations</span>
        </div>
      </div>

      {/* Status Filter Section - UPDATED */}
      <div className={styles.transactionFilterSection}>
        <div className={styles.transactionFilterButtons}>
          <button 
            className={`${styles.transactionFilterButton} ${statusFilter === 'posts' ? styles.active : ''}`}
            onClick={() => setStatusFilter('posts')}
          >
            📋 Posts ({postsCount})
          </button>
          <button 
            className={`${styles.transactionFilterButton} ${statusFilter === 'completed' ? styles.active : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            ✅ Completed Transactions ({completedCount})
          </button>
        </div>
      </div>

      <div className={styles.filterSection}>
        <h3>Filter by Category:</h3>
        <div className={styles.filterButtons}>
          <button 
            className={selectedCategory === 'all' ? styles.active : ''}
            onClick={() => setSelectedCategory('all')}
          >
            All Items ({categorizedItems.trade.length + categorizedItems.rent.length + categorizedItems.lost.length + categorizedItems.found.length + categorizedItems.donation.length})
          </button>
          <button 
            className={selectedCategory === 'trade' ? styles.active : ''}
            onClick={() => setSelectedCategory('trade')}
          >
            🔄 Trade ({categorizedItems.trade.length})
          </button>
          <button 
            className={selectedCategory === 'rent' ? styles.active : ''}
            onClick={() => setSelectedCategory('rent')}
          >
            🏠 Rent ({categorizedItems.rent.length})
          </button>
          <button 
            className={selectedCategory === 'lost' ? styles.active : ''}
            onClick={() => setSelectedCategory('lost')}
          >
            😰 Lost ({categorizedItems.lost.length})
          </button>
          <button 
            className={selectedCategory === 'found' ? styles.active : ''}
            onClick={() => setSelectedCategory('found')}
          >
            😊 Found ({categorizedItems.found.length})
          </button>
          <button 
            className={selectedCategory === 'donation' ? styles.active : ''}
            onClick={() => setSelectedCategory('donation')}
          >
            ❤️ Donations ({categorizedItems.donation.length})
          </button>
        </div>
      </div>

      {/* Search and Sort Section */}
      <div className={styles.searchSortSection}>
        <div className={styles.searchSortHeader}>
          <h4>Search & Sort</h4>
          <span className={styles.resultsCount}>
            Showing {filteredItems.length} of {statusFilter === 'posts' ? postsCount : completedCount} items
          </span>
        </div>
        
        <div className={styles.searchSortControls}>
          <div className={styles.searchContainer}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by title, description, category, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className={styles.clearSearch}
                onClick={handleClearSearch}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          
          <div className={styles.sortContainer}>
            <label className={styles.sortLabel}>Sort by:</label>
            <select 
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">📅 Newest first</option>
              <option value="oldest">📅 Oldest first</option>
              <option value="title-asc">🔤 Title A-Z</option>
              <option value="title-desc">🔤 Title Z-A</option>
              <option value="category">📁 Category</option>
              <option value="location">📍 Location</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.itemsList}>
        {filteredItems.length === 0 ? (
          <div className={styles.noItems}>
            <h3>No items found</h3>
            <p>
              {searchTerm 
                ? `No items found matching "${searchTerm}". Try a different search term.`
                : selectedCategory === 'all' 
                ? statusFilter === 'posts' 
                  ? "You haven't posted any items yet." 
                  : "You don't have any completed transactions yet."
                : statusFilter === 'posts'
                ? `You don't have any active ${selectedCategory} items.`
                : `You don't have any completed ${selectedCategory} transactions.`
              }
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className={styles.itemTile} onClick={() => openModal(item)}>
              <div className={styles.itemImageContainer}>
                {item.imageUrls?.length > 0 ? (
                  <>
                    <img 
                      src={item.imageUrls[0]} 
                      alt={item.title}
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = 
                          '<div class="image-placeholder">📷 Image not available</div>';
                      }}
                    />
                    {item.imageUrls.length > 1 && (
                      <div className={styles.imageCount}>+{item.imageUrls.length - 1}</div>
                    )}
                  </>
                ) : (
                  <div className={styles.imagePlaceholder}>No image</div>
                )}
              </div>
              
              <div className={styles.itemContentWrapper}>
                <div className={styles.itemHeader}>
                  <div className={styles.itemTypeBadge} style={{ backgroundColor: getItemTypeColor(item.type) }}>
                    {getItemTypeIcon(item.type)} {item.type?.toUpperCase()}
                  </div>
                  <div className={styles.itemActionButtons}>
                    {!item.completed && (
                      <button 
                        className={styles.completeButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteTransaction(item.id);
                        }}
                        disabled={completeLoading === item.id}
                        aria-label="Complete transaction"
                        title="Mark as completed"
                      >
                        {completeLoading === item.id ? '...' : '✅'}
                      </button>
                    )}
                    <button 
                      className={styles.deleteButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                      disabled={deleteLoading === item.id}
                      aria-label="Delete item"
                      title="Delete item"
                    >
                      {deleteLoading === item.id ? '...' : '🗑️'}
                    </button>
                  </div>
                </div>

                <div className={styles.itemContent}>
                  <h3 className={styles.itemTitle} title={item.title}>
                    {item.title.length > 50 ? `${item.title.substring(0, 50)}...` : item.title}
                  </h3>
                  <p className={styles.itemDescription} title={item.description}>
                    {item.description.length > 100 
                      ? `${item.description.substring(0, 100)}...` 
                      : item.description}
                  </p>
                  
                  <div className={styles.itemDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>📁 Category:</span>
                      <span className={styles.detailValue} title={item.category}>
                        {item.category.length > 15 
                          ? `${item.category.substring(0, 15)}...` 
                          : item.category}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>📍 Location:</span>
                      <span className={styles.detailValue} title={item.location}>
                        {item.location.length > 15 
                          ? `${item.location.substring(0, 15)}...` 
                          : item.location}
                      </span>
                    </div>
                    
                    {/* Fixed: Always show consistent number of rows */}
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        {item.completed ? '✅ Completed:' : '📅 Posted:'}
                      </span>
                      <span className={styles.detailValue}>
                        {item.completed 
                          ? formatDate(item.completedAt) 
                          : formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Updated: Use complete transaction button from CSS */}
                <div className={styles.cardActions}>
                  {!item.completed ? (
                    <button 
                      className={styles.completeTransactionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompleteTransaction(item.id);
                      }}
                      disabled={completeLoading === item.id}
                    >
                      {completeLoading === item.id ? 'Completing...' : 'Complete Transaction'}
                    </button>
                  ) : (
                    <div className={styles.completedBadge}>
                      ✅ Completed
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {selectedItem && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseButton} onClick={closeModal}>
              ✕
            </button>
            
            <div className={styles.modalHeader}>
              <div className={styles.modalTypeBadge} style={{ backgroundColor: getItemTypeColor(selectedItem.type) }}>
                {getItemTypeIcon(selectedItem.type)} {selectedItem.type?.toUpperCase()}
              </div>
              <h2 className={styles.modalTitle}>{selectedItem.title}</h2>
            </div>

            <div className={styles.modalBody}>
              {selectedItem.imageUrls?.length > 0 ? (
                <div className={styles.modalImageContainer}>
                  <img 
                    src={selectedItem.imageUrls[currentImageIndex]} 
                    alt={selectedItem.title}
                    className={styles.modalImage}
                  />
                  {selectedItem.imageUrls.length > 1 && (
                    <>
                      <button 
                        className={`${styles.imageNavButton} ${styles.prevButton}`}
                        onClick={prevImage}
                        aria-label="Previous image"
                      >
                        ‹
                      </button>
                      <button 
                        className={`${styles.imageNavButton} ${styles.nextButton}`}
                        onClick={nextImage}
                        aria-label="Next image"
                      >
                        ›
                      </button>
                      <div className={styles.imageIndicators}>
                        {selectedItem.imageUrls.map((_, index) => (
                          <button
                            key={index}
                            className={`${styles.imageIndicator} ${index === currentImageIndex ? styles.active : ''}`}
                            onClick={() => setCurrentImageIndex(index)}
                            aria-label={`Go to image ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className={styles.modalImagePlaceholder}>
                  📷 No image available
                </div>
              )}

              <div className={styles.modalInfo}>
                <div className={styles.modalDescription}>
                  <h3>Description</h3>
                  <p>{selectedItem.description}</p>
                </div>

                <div className={styles.modalDetails}>
                  <h3>Details</h3>
                  <div className={styles.modalDetailGrid}>
                    <div className={styles.modalDetailRow}>
                      <span className={styles.modalDetailLabel}>📁 Category:</span>
                      <span className={styles.modalDetailValue}>{selectedItem.category}</span>
                    </div>
                    <div className={styles.modalDetailRow}>
                      <span className={styles.modalDetailLabel}>📍 Location:</span>
                      <span className={styles.modalDetailValue}>{selectedItem.location}</span>
                    </div>
                    <div className={styles.modalDetailRow}>
                      <span className={styles.modalDetailLabel}>📅 Posted:</span>
                      <span className={styles.modalDetailValue}>{formatDate(selectedItem.createdAt)}</span>
                    </div>
                    {selectedItem.completed && (
                      <div className={styles.modalDetailRow}>
                        <span className={styles.modalDetailLabel}>✅ Completed:</span>
                        <span className={styles.modalDetailValue}>{formatDate(selectedItem.completedAt)}</span>
                      </div>
                    )}
                    {selectedItem.price && (
                      <div className={styles.modalDetailRow}>
                        <span className={styles.modalDetailLabel}>💰 Price:</span>
                        <span className={styles.modalDetailValue}>${selectedItem.price}</span>
                      </div>
                    )}
                    {selectedItem.contact && (
                      <div className={styles.modalDetailRow}>
                        <span className={styles.modalDetailLabel}>📞 Contact:</span>
                        <span className={styles.modalDetailValue}>{selectedItem.contact}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Section */}
            <div className={`${styles.modalActions} ${selectedItem.completed ? styles.completed : ''}`}>
              {!selectedItem.completed ? (
                <>
                  <button 
                    className={styles.modalCompleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCompleteTransaction(selectedItem.id);
                    }}
                    disabled={completeLoading === selectedItem.id}
                    aria-label="Complete transaction"
                  >
                    {completeLoading === selectedItem.id ? (
                      <>
                        <span>⏳</span>
                        Completing...
                      </>
                    ) : (
                      <>
                        <span>✅</span>
                        Complete Transaction
                      </>
                    )}
                  </button>
                  <button 
                    className={styles.modalDeleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(selectedItem.id);
                    }}
                    disabled={deleteLoading === selectedItem.id}
                    aria-label="Delete item"
                  >
                    {deleteLoading === selectedItem.id ? (
                      <>
                        <span>⏳</span>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <span>🗑️</span>
                        Delete Item
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className={styles.modalCompletedBadge}>
                    <span>✅</span>
                    Transaction Completed
                  </div>
                  <button 
                    className={styles.modalDeleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(selectedItem.id);
                    }}
                    disabled={deleteLoading === selectedItem.id}
                    aria-label="Delete item"
                  >
                    {deleteLoading === selectedItem.id ? (
                      <>
                        <span>⏳</span>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <span>🗑️</span>
                        Delete Item
                      </>
                    )}
                  </button>
                </>
              )}             
            </div>
          </div>
        </div>
      )}

      {/* Success Message Overlay */}
      {showSuccessMessage && (
        <div className={`${styles.successOverlay} ${showSuccessMessage ? styles.show : ''}`}>
          <div className={`${styles.successMessage} ${styles[successMessageVariant]} ${styles[successMessagePosition]}`}>
            <span className={styles.successIcon}>✨</span>
            <h3 className={styles.successTitle}>{getRandomSuccessMessage(successMessageVariant === 'delete' ? 'delete' : 'complete').title}</h3>
            <p className={styles.successText}>{getRandomSuccessMessage(successMessageVariant === 'delete' ? 'delete' : 'complete').text}</p>
          </div>
        </div>
      )}
    </div>
  );
} 

export default MyItemsPage;