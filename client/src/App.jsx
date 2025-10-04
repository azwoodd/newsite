import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AffiliateTracker from './components/AffiliateTracker';
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
import AuthSuccess from './components/AuthSuccess';   // ← keep only this one
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import UserProfile from './components/UserProfile';

// Additional pages
import Showcase from './components/Showcase';
import NotFound from './components/NotFound';


// Homepage component
const HomePage = ({ scrolled }) => {
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

const App = () => {
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
    <AuthProvider>
      <MusicPlayerProvider>
        <Router>
          <div className="App">
            <AffiliateTracker />
            
            <Routes>
              {/* Homepage */}
              <Route path="/" element={<HomePage scrolled={scrolled} />} />
              
              {/* Auth routes */}
              <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />
  <Route path="/auth/success" element={<AuthSuccess />} />
              
              {/* Protected routes */}
              <Route 
                path="/dashboard" 
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                } 
              />
              <Route 
                path="/admin/*" 
                element={
                  <RequireAdmin>
                    <AdminDashboard />
                  </RequireAdmin>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <RequireAuth>
                    <UserProfile />
                  </RequireAuth>
                } 
              />
              
              
              {/* Public routes */}
              <Route 
                path="/showcase" 
                element={
                  <>
                    <Header scrolled={scrolled} />
                    <Showcase />
                    <Footer />
                  </>
                } 
              />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            <EmailPopup />
          </div>
        </Router>
      </MusicPlayerProvider>
    </AuthProvider>
  );
};

export default App;