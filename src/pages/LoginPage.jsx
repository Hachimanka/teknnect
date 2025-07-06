import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; 
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import PolicyPageModal from '../components/PolicyPageModal'; // Import your existing modal
import './LoginPage.css';

function LoginPage() {
  // Hardcoded admin credentials
  const ADMIN_EMAIL = 'leonard.forrosuelo@cit.edu';
  const ADMIN_PASSWORD = 'leofors';
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [userCredential, setUserCredential] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    document.body.style.overflow = 'hidden'; // no scroll
    return () => {
      document.body.style.overflow = 'auto'; // reset scroll when leaving page
    };
  }, []);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // If admin credentials, redirect to /admin
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        // Try to sign in as admin (if not already)
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
          // ignore error if already signed in
        }
        localStorage.setItem('isLoggedIn', 'true');
        navigate('/admin');
        return;
      }

      const userCred = await signInWithEmailAndPassword(auth, email, password);

      if (!userCred.user.emailVerified) {
        setError('❗ Please verify your email before logging in.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      // Only proceed if email is verified
      const isFirstLogin = localStorage.getItem(`policy_accepted_${userCred.user.uid}`) === null;
      if (isFirstLogin) {
        setUserCredential(userCred);
        setShowPolicyModal(true);
      } else {
        localStorage.setItem('isLoggedIn', 'true');
        navigate('/');
      }

    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handlePolicyAccept = () => {
    // Mark policy as accepted for this user
    localStorage.setItem(`policy_accepted_${userCredential.user.uid}`, 'true');
    localStorage.setItem('isLoggedIn', 'true');
    setShowPolicyModal(false);
    navigate('/'); // ✅ Navigate after accepting policy
  };

  const handlePolicyDecline = () => {
    // Log out user if they decline policy
    auth.signOut();
    setShowPolicyModal(false);
    setUserCredential(null);
    setError('You must accept the policy and privacy terms to continue.');
  };

  const handleOverlayClick = () => {
    navigate('/'); // ✅ return to home if click outside
  };

  const handleBoxClick = (e) => {
    e.stopPropagation(); // ✅ prevent click inside box from closing modal
  };

  return (
    <>
      <div className="ModalOverlay" onClick={handleOverlayClick}>
        <div className="LoginBox" onClick={handleBoxClick}>
          <h3>Welcome!</h3>
          <h4>Login</h4>

          {error && <p className="Error">{error}</p>}

          <form className="LoginForm" onSubmit={handleLogin}>
            <div className="PasswordInput">
              <input 
                type="email" 
                placeholder="Email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingRight: '2.5rem' }}
              />
              {/* Invisible span for alignment */}
              <span className="PasswordToggle" style={{ visibility: 'hidden' }}><FaEye /></span>
            </div>

            <div className="PasswordInput">
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="PasswordToggle" onClick={togglePasswordVisibility}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            <div className="Links">
              <Link to="/forgotpassword">Forgot Password?</Link>
              <Link to="/register">Register</Link>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>
        </div>
      </div>

      {/* Policy Modal */}
      {showPolicyModal && (
        <PolicyPageModal
          onAccept={handlePolicyAccept}
          onDecline={handlePolicyDecline}
        />
      )}
    </>
  );
}

export default LoginPage;