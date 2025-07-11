// client/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { MusicPlayerProvider } from './components/GlobalMusicPlayer';
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';
import EmailPopup from './components/EmailPopup';

// Main site components
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import SoundExperience from './components/SoundExperience';
import ProcessSection from './components/ProcessSection';
import TestimonialsSection from './components/TestimonialsSection';
import FaqSection from './components/FaqSection';
import SamplesSection from './components/SamplesSection';
import PricingSection from './components/PricingSection';
import OrderForm from './components/OrderForm/OrderForm';
import Footer from './components/Footer';

// Auth and dashboard components
import Login from './components/Login';
import Signup from './components/Signup';
import AuthSuccess from './components/AuthSuccess';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import UserProfile from './components/UserProfile';

// Additional pages
import Showcase from './components/Showcase';
import NotFound from './components/NotFound';

// Home page component
const Home = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    // Animate elements when they come into view
    const animateOnScroll = () => {
      const elements = document.querySelectorAll('.animate-on-scroll');
      
      elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementBottom = element.getBoundingClientRect().bottom;
        
        // If element is in viewport
        if (elementTop < window.innerHeight - 100 && elementBottom > 0) {
          element.classList.add('fade-in');
        }
      });
    };
    
    // Initial call and scroll event
    animateOnScroll();
    window.addEventListener('scroll', animateOnScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', animateOnScroll);
    };
  }, []);

  return (
    <>
      <Header scrolled={scrolled} />
      <main className="pb-24"> {/* Added padding bottom for music player */}
        <HeroSection />
        <SoundExperience />
        <ProcessSection />
        <TestimonialsSection />
        <FaqSection />
        <SamplesSection />
        <PricingSection />
        <OrderForm />
      </main>
      <Footer />
    </>
  );
};

// ShowcasePage component with header and footer
const ShowcasePage = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      <Header scrolled={scrolled} />
      <Showcase />
      <Footer />
    </>
  );
};

function App() {
  const [showEmailPopup, setShowEmailPopup] = useState(true);

  return (
    <Router>
      <AuthProvider>
        <MusicPlayerProvider>
          {showEmailPopup && <EmailPopup />}
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/showcase" element={<ShowcasePage />} />
            <Route path="/auth/success" element={<AuthSuccess />} />
            
            {/* Protected user routes */}
            <Route path="/dashboard" element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            } />
            <Route path="/profile" element={
              <RequireAuth>
                <UserProfile />
              </RequireAuth>
            } />
            
            {/* Protected admin routes */}
            <Route path="/admin/*" element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            } />
            
            {/* 404 Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MusicPlayerProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;