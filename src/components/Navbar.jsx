
import { useRef, useEffect, useState} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaComments, FaUserCircle, FaChevronDown } from 'react-icons/fa';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './Navbar.css';
import PostItemModal from './PostItemModal';
import PolicyPageModal from './PolicyPageModal';
import { onAuthStateChanged } from 'firebase/auth';
import ChatBox from '../components/Chatbox';


// --- Onboarding Tour Steps ---
const TOUR_STEPS = [
  {
    selector: '.navbar-center a', // Home link
    message: 'This is the Home link. See the latest posts and updates here.',
  },
  {
    selector: '.navbar-center .navbar-link:nth-child(2)', // Trade button
    message: 'This is the Trade section. Trade items with other students here!',
  },
  {
    selector: '.navbar-center .navbar-link:nth-child(3)', // Rent button
    message: 'This is the Rent section. Click here to rent items from other students!',
  },
  {
    selector: '.navbar-center .navbar-link:nth-child(4)', // Lost & Found
    message: 'Lost something? Check here or report lost/found items.',
  },
  {
    selector: '.navbar-center .navbar-link:nth-child(5)', // Donations
    message: 'Support others or request help in the Donations section.',
  },
  {
    selector: '.chat-icon', // Message icon
    message: 'This is your Messages. Click here to chat with other users!',
  },
  {
    selector: '.post-item-button', // Post Item button
    message: 'Post your own item here! Share what you have with the community.',
  },
  {
    selector: '.profile-section', // Profile/avatar
    message: 'Access your profile and settings here.\n\nYou can switch between light/dark mode, view your items, or log out. Click your avatar to open the menu.',
    messagePosition: 'far-bottom-left', // Show message further to the left and below the avatar
  },
];

function Navbar(props) {
  // Onboarding tour state
  const [tourStep, setTourStep] = useState(null);
  // Allow parent to trigger the tour
  useEffect(() => {
    if (props.triggerTour) {
      setTourStep(0);
    }
  }, [props.triggerTour]);
  const startTour = () => setTourStep(0);
  const nextTourStep = () => setTourStep((prev) => (prev < TOUR_STEPS.length - 1 ? prev + 1 : null));
  const endTour = () => setTourStep(null);
  // Add/remove blur class to body when tour is active
  useEffect(() => {
    if (tourStep !== null) {
      document.body.classList.add('tour-active');
    } else {
      document.body.classList.remove('tour-active');
    }
    return () => document.body.classList.remove('tour-active');
  }, [tourStep]);
// --- SpotlightTour Component ---
function SpotlightTour({ step, onNext, onClose, isLast }) {
  const [targetRect, setTargetRect] = useState(null);
  useEffect(() => {
    const el = document.querySelector(step.selector);
    if (!el) return;
    // For mobile: scroll horizontally if needed to bring the element into view
    if (window.innerWidth <= 768 && el.scrollIntoView) {
      // Always scroll the navbar container to the start before spotlighting the first item
      if (step.selector === '.navbar-center a') {
        const navbarCenter = document.querySelector('.navbar-center');
        if (navbarCenter && navbarCenter.scrollTo) {
          navbarCenter.scrollTo({ left: 0, behavior: 'auto' });
        }
        // Wait for scroll to start, then scroll the element into view
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
          // Wait for DOM to update, then measure
          setTimeout(() => {
            setTargetRect(el.getBoundingClientRect());
          }, 100);
        }, 100);
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        setTimeout(() => {
          setTargetRect(el.getBoundingClientRect());
        }, 400);
      }
    } else {
      setTargetRect(el.getBoundingClientRect());
    }
  }, [step]);

  // Prevent scrolling and interaction with everything except the tour message/buttons
  useEffect(() => {
    // Prevent scrolling
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    // Prevent keyboard navigation
    const handleKeydown = (e) => {
      // Allow tab/shift+tab only inside the tour message
      const focusable = document.querySelectorAll('.spotlight-tour-message button');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      } else if (["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"," ","Spacebar"].includes(e.key)) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeydown, true);
    // Prevent mouse/touch interaction outside the tour message
    const stopEvent = (e) => {
      // Only allow interaction with the tour message/buttons
      const message = document.querySelector('.spotlight-tour-message');
      if (message && !message.contains(e.target)) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    document.addEventListener('mousedown', stopEvent, true);
    document.addEventListener('touchstart', stopEvent, { capture: true, passive: false });
    document.addEventListener('wheel', stopEvent, { capture: true, passive: false });
    // Clean up
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.removeEventListener('keydown', handleKeydown, true);
      document.removeEventListener('mousedown', stopEvent, true);
      document.removeEventListener('touchstart', stopEvent, true);
      document.removeEventListener('wheel', stopEvent, true);
    };
  }, []);
  if (!targetRect) return null;
  // Default: below and centered
  let messageStyle = {
    position: 'fixed',
    left: targetRect.left + targetRect.width / 2,
    top: targetRect.bottom + 12,
    transform: 'translateX(-50%)',
    zIndex: 10003,
    background: '#fff',
    color: '#222',
    borderRadius: 8,
    padding: '1.2rem 1.5rem',
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    minWidth: 220,
    maxWidth: 320,
    textAlign: 'center',
    fontFamily: 'Poppins, Arial, sans-serif',
    whiteSpace: 'pre-line',
    outline: 'none',
  };
  // If step.messagePosition === 'left', show message to the left of the target
  if (step.messagePosition === 'left') {
    messageStyle = {
      ...messageStyle,
      left: targetRect.left - 340,
      top: targetRect.top + targetRect.height / 2,
      transform: 'translateY(-50%)',
      textAlign: 'left',
      minWidth: 260,
      maxWidth: 340,
    };
  }
  // If step.messagePosition === 'far-left', show message even further to the left
  if (step.messagePosition === 'far-left') {
    messageStyle = {
      ...messageStyle,
      left: targetRect.left - 440,
      top: targetRect.top + targetRect.height / 2,
      transform: 'translateY(-50%)',
      textAlign: 'left',
      minWidth: 260,
      maxWidth: 340,
    };
  }
  // If step.messagePosition === 'far-bottom-left', show message further left and below
  if (step.messagePosition === 'far-bottom-left') {
    // On mobile, keep message fully visible on screen
    const isMobile = window.innerWidth <= 768;
    let left = targetRect.left - 220;
    if (isMobile) {
      left = Math.max(12, left);
    }
    messageStyle = {
      ...messageStyle,
      left,
      top: targetRect.bottom + 32,
      transform: 'none',
      textAlign: 'left',
      minWidth: isMobile ? 180 : 260,
      maxWidth: isMobile ? 220 : 340,
    };
  }
  // Overlay to block all interaction
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.35)',
    zIndex: 10000,
    pointerEvents: 'auto',
    touchAction: 'none',
    userSelect: 'none',
  };
  const spotlightStyle = {
    position: 'fixed',
    left: targetRect.left - 8,
    top: targetRect.top - 8,
    width: targetRect.width + 16,
    height: targetRect.height + 16,
    borderRadius: 16,
    // No boxShadow at all: no light or dark outside the border radius
    pointerEvents: 'none',
    zIndex: 10001,
    transition: 'all 0.3s',
    background: 'transparent',
  };
  // Overlay with a "hole" for the spotlight: use pointer-events to allow the spotlight area to be interactive, but block everything else
  // We'll use two overlays: one for the full screen, and one for the spotlight area (transparent, pointer-events: none)
  // To get a rounded spotlight, use an SVG mask
  const maskId = 'spotlight-mask';
  const svgWidth = window.innerWidth;
  const svgHeight = window.innerHeight;
  const x = Math.max(0, targetRect.left - 8);
  const y = Math.max(0, targetRect.top - 8);
  const w = targetRect.width + 16;
  const h = targetRect.height + 16;
  const r = 16;
  return (
    <>
      {/* SVG overlay with a rounded rectangle cutout */}
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 10000,
          pointerEvents: 'auto',
        }}
        aria-hidden="true"
      >
        <defs>
          <mask id={maskId}>
            {/* Full white = visible, black = transparent */}
            <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="white" />
            <rect x={x} y={y} width={w} height={h} rx={r} ry={r} fill="black" />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={svgWidth}
          height={svgHeight}
          fill="rgba(0,0,0,0.35)"
          mask={`url(#${maskId})`}
        />
      </svg>
      {/* The spotlight border itself (visual only, pointer-events: none) */}
      <div style={spotlightStyle} aria-hidden="true" />
      <div
        className="spotlight-tour-message"
        style={messageStyle}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Onboarding Tour Step"
      >
        <div style={{ marginBottom: 12 }}>{step.message}</div>
        <button onClick={isLast ? onClose : onNext} style={{
          background: '#9B000A', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', cursor: 'pointer'
        }} autoFocus>
          {isLast ? 'Finish' : 'Next'}
        </button>
        <button onClick={onClose} style={{
          background: 'transparent', color: '#9B000A', border: 'none', marginLeft: 16, cursor: 'pointer'
        }}>
          Skip
        </button>
      </div>
    </>
  );
}
  const [showModal, setShowModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [photoURL, setPhotoURL] = useState(null);
  const [showChatBox, setShowChatBox] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const chatBoxRef = useRef(null);
  const profileMenuRef = useRef(null);
  const chatButtonRef = useRef(null);
  const profileButtonRef = useRef(null);

  const navigate = useNavigate();

  
  
  // Helper function to check authentication and redirect if needed
  const requireAuth = (callback) => {
    if (!user) {
      navigate('/login');
      return false;
    }
    callback();
    return true;
  };

  // Helper function to get user initials
  const getUserInitials = (email) => {
    if (!email) return 'GU'; // Guest User
    
    // Extract the part before @cit.edu
    const username = email.replace('@cit.edu', '');
    
    // Split by dots and get first letter of each part
    const parts = username.split('.');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    } else {
      // If no dots, take first two letters
      return username.substring(0, 2).toUpperCase();
    }
  };

  // Handle protected navigation
  const handleProtectedNavigation = (path) => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(path);
  };
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        chatBoxRef.current &&
        !chatBoxRef.current.contains(event.target) &&
        !chatButtonRef.current.contains(event.target)
      ) {
        setShowChatBox(false);
      }

      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target) &&
        !profileButtonRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setPhotoURL(userDoc.data().photoURL || null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    } else {
      // Clear user data when user logs out
      setPhotoURL(null);
      setTotalUnreadCount(0);
    }
  });

  return () => unsubscribe();
}, []);
  // 🔔 Listen for unread messages count
  useEffect(() => {
    if (!user) {
      setTotalUnreadCount(0);
      return;
    }

    const setupUnreadListener = async () => {
      try {
        // Get all chats where current user is a participant
        const chatsQuery = query(
          collection(db, 'chats'),
          where('users', 'array-contains', user.uid)
        );
        
        const chatsSnapshot = await getDocs(chatsQuery);
        const unsubscribers = [];

        chatsSnapshot.docs.forEach(chatDoc => {
          const chatId = chatDoc.id;
          
          // Listen for unread messages in each chat
          const unreadQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            where('sender', '!=', user.uid),
            where('read', '==', false)
          );

          const unsubscribe = onSnapshot(unreadQuery, (snapshot) => {
            // Update the total unread count
            let totalUnread = 0;
            
            // We need to recalculate total from all chats
            chatsSnapshot.docs.forEach(async (chatDocForCount) => {
              const chatIdForCount = chatDocForCount.id;
              const unreadQueryForCount = query(
                collection(db, 'chats', chatIdForCount, 'messages'),
                where('sender', '!=', user.uid),
                where('read', '==', false)
              );
              
              const unreadSnapshot = await getDocs(unreadQueryForCount);
              totalUnread += unreadSnapshot.size;
              
              // Set the total after processing all chats
              setTotalUnreadCount(totalUnread);
            });
          }, (error) => {
            console.error('Error listening to unread messages:', error);
          });

          unsubscribers.push(unsubscribe);
        });

        // Return cleanup function
        return () => {
          unsubscribers.forEach(unsub => unsub());
        };
      } catch (error) {
        console.error('Error setting up unread listener:', error);
      }
    };

    setupUnreadListener();
  }, [user]);

  // Alternative simpler approach for unread count
  useEffect(() => {
    if (!user) {
      setTotalUnreadCount(0);
      return;
    }

    const updateUnreadCount = async () => {
      try {
        // Get all chats where current user is a participant
        const chatsQuery = query(
          collection(db, 'chats'),
          where('users', 'array-contains', user.uid)
        );
        
        const chatsSnapshot = await getDocs(chatsQuery);
        let totalUnread = 0;

        // Count unread messages in each chat
        for (const chatDoc of chatsSnapshot.docs) {
          const chatId = chatDoc.id;
          const unreadQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            where('sender', '!=', user.uid),
            where('read', '==', false)
          );
          
          const unreadSnapshot = await getDocs(unreadQuery);
          totalUnread += unreadSnapshot.size;
        }

        setTotalUnreadCount(totalUnread);
      } catch (error) {
        console.error('Error updating unread count:', error);
      }
    };

    // Update count immediately
    updateUnreadCount();

    // Set up interval to update count periodically (every 30 seconds)
    const interval = setInterval(updateUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // ✅ Helper Functions
  const isActiveLink = (path) => {
    return window.location.pathname === path;
  };

  const handleProfileClick = () => {
    requireAuth(() => {
      setShowProfileMenu(!showProfileMenu);
    });
  };

  const handleToggleMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode', !darkMode);
  };

  const handleLogout = () => {
    auth.signOut()
      .then(() => {
        navigate('/');
      })
      .catch((error) => {
        console.error('Logout failed:', error);
      });
  };

  const handleMyItemsClick = () => {
    setShowProfileMenu(false);
    navigate('/my-items');
  };

  // Handle chat box toggle with auth check
  const handleChatToggle = () => {
    requireAuth(() => {
      setShowChatBox((prev) => !prev);
    });
  };

  // Handle post item with auth check
  const handlePostItem = () => {
    requireAuth(() => {
      setShowModal(true);
    });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    try {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF)');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        alert('File size too large (max 2MB)');
        return;
      }

      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, `profilePictures/${user.uid}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { photoURL: downloadURL });

      setPhotoURL(downloadURL);
      alert('Profile picture updated!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture. Please try again.');
    }
  };

  const displayName = user?.email ? user.email.replace('@cit.edu', '') : 'Guest';

  // Trigger tour after first login only
  // Show PolicyPageModal before onboarding tour
  const [showTermsModal, setShowTermsModal] = useState(false);
  useEffect(() => {
    if (user && localStorage.getItem('teknnect_tour_shown') !== '1') {
      setTimeout(() => setShowTermsModal(true), 400);
    }
  }, [user]);

  // Handler for accepting terms
  const handleAcceptTerms = () => {
    setShowTermsModal(false);
    setTimeout(() => setTourStep(0), 200); // Start tour after accepting
    localStorage.setItem('teknnect_tour_shown', '1');
  };

  // Handler for declining terms
  const handleDeclineTerms = () => {
    setShowTermsModal(false);
    // Do not start tour or set teknnect_tour_shown
  };

  return (
    <div className="page-header" style={{ position: 'relative' }}>
      {/* Terms Modal before onboarding tour */}
      {showTermsModal && (
        <PolicyPageModal
          viewOnly={false}
          onAccept={handleAcceptTerms}
          onDecline={handleDeclineTerms}
        />
      )}
      {/* Spotlight Tour Overlay */}
      {tourStep !== null && (
        <SpotlightTour
          step={TOUR_STEPS[tourStep]}
          onNext={nextTourStep}
          onClose={endTour}
          isLast={tourStep === TOUR_STEPS.length - 1}
        />
      )}
      <nav className="navbar">
        <div className="navbar-left">
          <Link to="/" className="navbar-logo">
            <img src={require('../assets/logo.png')} alt="icon" className="logo-img" />
            Tek<span className="highlight">nnec</span>T
          </Link>
        </div>

        <div className="navbar-center">
          <Link to="/" className={isActiveLink('/') ? 'active' : ''}>Home</Link>
          <div 
            onClick={() => handleProtectedNavigation('/trade')} 
            className={`navbar-link ${isActiveLink('/trade') ? 'active' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            Trade
          </div>
          <div 
            onClick={() => handleProtectedNavigation('/rent')} 
            className={`navbar-link ${isActiveLink('/rent') ? 'active' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            Rent
          </div>
          <div 
            onClick={() => handleProtectedNavigation('/lost-found')} 
            className={`navbar-link ${isActiveLink('/lost-found') ? 'active' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            Lost & Found
          </div>
          <div 
            onClick={() => handleProtectedNavigation('/donations')} 
            className={`navbar-link ${isActiveLink('/donations') ? 'active' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            Donations
          </div>
        </div>

        <div className="navbar-right">
          <div
            className="navbar-icon chat-icon"
            title="Messages"
            onClick={handleChatToggle}
            ref={chatButtonRef}
            style={{ position: 'relative', cursor: 'pointer' }}
          >
            <FaComments size={24} />
            {totalUnreadCount > 0 && (
              <span className="message-badge">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
          </div>
          <button
            className={`post-item-button${darkMode ? ' post-item-button-dark' : ''}`}
            onClick={handlePostItem}
          >
            Post Item
          </button>

          <div
            className="profile-section"
            title="Profile"
            onClick={handleProfileClick}
            ref={profileButtonRef}
            style={{ cursor: 'pointer' }}
          >
            {/* Updated profile avatar section */}
            <div className="navbar-profile-avatar">
            {photoURL ? (
              <img
                src={photoURL}
                alt="Profile"
                className="navbar-avatar-image"
              />
            ) : user?.email ? (
              <div className="navbar-avatar-initials">
                {getUserInitials(user.email)}
              </div>
            ) : (
              <div className="navbar-avatar-default">
                <FaUserCircle size={24} />
              </div>
            )}
          </div>
            <FaChevronDown
              size={14}
              className={`dropdown-arrow-icon ${showProfileMenu ? 'rotated' : ''}`}
            />
          </div>
        </div>
      </nav>

      {showProfileMenu && user && (
        <div className="profile-menu" ref={profileMenuRef}>
          <div className="profile-header">
            <div className="profile-picture-container">
              <img
                src={photoURL || require('../assets/logo.png')}
                alt="Profile"
                className="avatar-image"
                key={photoURL}
              />
              <label htmlFor="file-upload" className="upload-icon">+</label>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
            </div>
            <p className="profile-name">{displayName}</p>
            <p className="profile-email">{user?.email || 'Not logged in'}</p>
          </div>

          <hr />
          <button className="mode-toggle" onClick={handleToggleMode}>
            {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </button>
          <hr />
          <button className="my-items-button" onClick={handleMyItemsClick}>
            My Items
          </button>
          <hr />
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}

      {showModal && (
        <PostItemModal onClose={() => setShowModal(false)} />
      )}
      
      {showChatBox && user && (
        <div className="chatbox-wrapper" ref={chatBoxRef}>
          <ChatBox />
        </div>
      )}
    </div>
  );
}

export default Navbar;