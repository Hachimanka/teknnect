import { useState } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MarketplacePage from './pages/MarketplacePage';
import DonationsPage from './pages/DonationsPage';
import LostFoundPage from './pages/LostFoundPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import RentPage from './pages/RentPage';
import TradePage from './pages/TradePage';
import RegisterPage from './pages/RegisterPage';
import MyItemsPage from './pages/MyItemsPage';
import About from './pages/About';
import AdminPage from './pages/AdminPage';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [triggerTour, setTriggerTour] = useState(false);

  // Apply dark mode class to body element
  useState(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  // Listen for a custom event to trigger the tour
  useState(() => {
    const handler = () => setTriggerTour((v) => !v);
    window.addEventListener('triggerOnboardingTour', handler);
    return () => window.removeEventListener('triggerOnboardingTour', handler);
  }, []);

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
      <BrowserRouter>
        <Navbar 
          darkMode={darkMode} 
          setDarkMode={setDarkMode} 
          triggerTour={triggerTour}
        />
        <Routes>
          <Route path="/" element={<HomePage darkMode={darkMode} />} />
          <Route path="/login" element={<LoginPage darkMode={darkMode} />} />
          <Route path="/marketplace" element={<MarketplacePage darkMode={darkMode} />} />
          <Route path="/donations" element={<DonationsPage darkMode={darkMode} />} />
          <Route path="/lost-found" element={<LostFoundPage darkMode={darkMode} />} />
          <Route path="/forgotpassword" element={<ForgotPasswordPage darkMode={darkMode} />} />
          <Route path="/rent" element={<RentPage darkMode={darkMode} />} />
          <Route path="/trade" element={<TradePage darkMode={darkMode} />} />
          <Route path="/register" element={<RegisterPage darkMode={darkMode} />} />
          <Route path="/my-items" element={<MyItemsPage darkMode={darkMode} />} />
          <Route path="/about" element={<About darkMode={darkMode} />} />
          <Route path="/admin" element={<AdminPage darkMode={darkMode} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
