// client/src/components/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/api';
import { useMusicPlayer } from '../../components/GlobalMusicPlayer';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import OrdersList from './OrdersList';
import ShowcaseManager from './ShowcaseManager';
import NewsletterManager from './NewsletterManager';
import HelpDeskManager from './HelpDeskManager';

const AdminDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { currentTrack } = useMusicPlayer();
  const [activeSection, setActiveSection] = useState('orders');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    inProductionOrders: 0,
    readyForReviewOrders: 0,
    completedOrders: 0,
    newsletterSubscribers: 0,
    showcaseItems: 0
  });

  useEffect(() => {
    // Redirect if not admin
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/dashboard');
    }
    
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch orders
        const ordersResponse = await adminService.getAllOrders();
        const orders = ordersResponse.data.orders;
        
        // Calculate order stats
        const pendingOrders = orders.filter(order => order.status === 'Pending').length;
        const inProductionOrders = orders.filter(order => order.status === 'In Production').length;
        const readyForReviewOrders = orders.filter(order => order.status === 'Ready for Review').length;
        const completedOrders = orders.filter(order => order.status === 'Completed').length;
        
        // Fetch newsletter subscribers
        const newsletterResponse = await adminService.getNewsletterSignups();
        const subscribers = newsletterResponse.data.signups.length;
        
        // Fetch showcase items
        const showcaseResponse = await adminService.getShowcaseItems();
        const showcaseItems = showcaseResponse.data.showcaseItems.length;
        
        // Update stats
        setStats({
          totalOrders: orders.length,
          pendingOrders,
          inProductionOrders,
          readyForReviewOrders,
          completedOrders,
          newsletterSubscribers: subscribers,
          showcaseItems
        });
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        setError('Failed to load dashboard statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [currentUser, navigate]);

  // Toggle mobile navigation
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-deep">
        <div className="text-center">
          <p className="mb-4">You must be logged in to view this page.</p>
          <Link to="/login" className="btn px-6 py-2 border-2 border-accent rounded-full hover:bg-accent/10 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Stat card component
  const StatCard = ({ title, value, icon, color = 'accent' }) => (
    <div className={`bg-white/5 rounded-lg p-6 border border-white/10 transition-transform hover:-translate-y-1 relative overflow-hidden`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">{title}</h3>
        <div className={`w-12 h-12 rounded-full bg-${color}/10 flex items-center justify-center text-accent text-xl`}>
          <i className={`fas fa-${icon}`}></i>
        </div>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark to-deep flex pb-24">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 border-r border-white/10 overflow-y-auto bg-deep">
        <AdminSidebar 
          activeSection={activeSection} 
          setActiveSection={setActiveSection} 
        />
      </div>
      
      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-0 z-50 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full w-64 bg-deep border-r border-white/10 overflow-y-auto">
          <AdminSidebar 
            activeSection={activeSection}
            setActiveSection={(section) => {
              setActiveSection(section);
              setMobileMenuOpen(false);
            }}
          />
        </div>
        
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/70 -z-10"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <AdminHeader 
          userName={currentUser.name} 
          onLogout={logout}
          onMenuToggle={toggleMobileMenu}
          mobileMenuOpen={mobileMenuOpen}
        />
        
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-20">
          {/* Error Message */}
          {error && (
            <div className="bg-romantic/10 border border-romantic rounded-lg p-4 mb-6">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}
          
          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
            </div>
          )}
          
          {/* Dashboard Overview */}
          {activeSection === 'dashboard' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold font-secondary">Admin Dashboard</h1>
                
                <div>
                  <Link 
                    to="/dashboard" 
                    className="px-4 py-2 bg-transparent border border-white/20 rounded-lg hover:bg-white/5 transition-colors inline-flex items-center"
                  >
                    <i className="fas fa-user mr-2"></i>
                    User Dashboard
                  </Link>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
                <StatCard title="Total Orders" value={stats.totalOrders} icon="file-invoice" />
                <StatCard title="Pending Orders" value={stats.pendingOrders} icon="clock" color="yellow-400" />
                <StatCard title="In Production" value={stats.inProductionOrders} icon="cogs" color="blue-400" />
                <StatCard title="Ready for Review" value={stats.readyForReviewOrders} icon="headphones" color="purple-400" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <StatCard title="Completed Orders" value={stats.completedOrders} icon="check-circle" color="green-400" />
                <StatCard title="Newsletter Subscribers" value={stats.newsletterSubscribers} icon="envelope" />
                <StatCard title="Showcase Items" value={stats.showcaseItems} icon="music" />
              </div>
              
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold font-secondary">Recent Orders</h2>
                    <Link to="#" onClick={() => setActiveSection('orders')} className="text-accent hover:underline text-sm">
                      View All
                    </Link>
                  </div>
                  {/* Add recent orders preview here */}
                  <div className="text-center text-light-muted py-6">
                    Recent orders will appear here
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold font-secondary">Recent Newsletter Signups</h2>
                    <Link to="#" onClick={() => setActiveSection('newsletter')} className="text-accent hover:underline text-sm">
                      View All
                    </Link>
                  </div>
                  {/* Add recent newsletter signups preview here */}
                  <div className="text-center text-light-muted py-6">
                    Recent newsletter signups will appear here
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="mt-10">
                <h2 className="text-xl font-bold mb-4 font-secondary">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => setActiveSection('orders')}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mr-3">
                        <i className="fas fa-list"></i>
                      </div>
                      <span className="font-medium">Manage Orders</span>
                    </div>
                    <p className="text-sm text-light-muted">View and process customer orders</p>
                  </button>
                  
                  <button
                    onClick={() => setActiveSection('showcase')}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mr-3">
                        <i className="fas fa-music"></i>
                      </div>
                      <span className="font-medium">Edit Showcase</span>
                    </div>
                    <p className="text-sm text-light-muted">Update and manage gallery songs</p>
                  </button>
                  
                  <button
                    onClick={() => setActiveSection('helpdesk')}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mr-3">
                        <i className="fas fa-headset"></i>
                      </div>
                      <span className="font-medium">Help Desk</span>
                    </div>
                    <p className="text-sm text-light-muted">Manage customer support tickets</p>
                  </button>
                  
                  <button
                    onClick={() => setActiveSection('newsletter')}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mr-3">
                        <i className="fas fa-envelope"></i>
                      </div>
                      <span className="font-medium">Newsletter</span>
                    </div>
                    <p className="text-sm text-light-muted">Manage email subscribers</p>
                  </button>
                  
                  <Link
                    to="/"
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mr-3">
                        <i className="fas fa-home"></i>
                      </div>
                      <span className="font-medium">Visit Site</span>
                    </div>
                    <p className="text-sm text-light-muted">Go to main website</p>
                  </Link>
                </div>
              </div>
            </div>
          )}
          
          {/* Orders Management */}
          {activeSection === 'orders' && (
            <OrdersList />
          )}
          
          {/* Showcase Management */}
          {activeSection === 'showcase' && (
            <ShowcaseManager />
          )}
          
          {/* Newsletter Management */}
          {activeSection === 'newsletter' && (
            <NewsletterManager />
          )}
          
          {/* Help Desk Management */}
          {activeSection === 'helpdesk' && (
            <HelpDeskManager />
          )}
        </main>
        
        {/* Mobile Navigation Footer - Updated to make space for music player */}
        <div className={`lg:hidden fixed bottom-0 left-0 w-full bg-dark/90 backdrop-blur-md border-t border-white/10 z-30 ${currentTrack ? 'mb-[90px]' : ''}`}>
          <div className="flex justify-around py-2">
            <button
              className={`flex flex-col items-center p-2 ${activeSection === 'dashboard' ? 'text-accent' : 'text-light-muted'}`}
              onClick={() => setActiveSection('dashboard')}
            >
              <i className="fas fa-tachometer-alt text-lg"></i>
              <span className="text-xs mt-1">Dashboard</span>
            </button>
            <button
              className={`flex flex-col items-center p-2 ${activeSection === 'orders' ? 'text-accent' : 'text-light-muted'}`}
              onClick={() => setActiveSection('orders')}
            >
              <i className="fas fa-file-invoice text-lg"></i>
              <span className="text-xs mt-1">Orders</span>
            </button>
            <button
              className={`flex flex-col items-center p-2 ${activeSection === 'showcase' ? 'text-accent' : 'text-light-muted'}`}
              onClick={() => setActiveSection('showcase')}
            >
              <i className="fas fa-music text-lg"></i>
              <span className="text-xs mt-1">Showcase</span>
            </button>
            <button
              className={`flex flex-col items-center p-2 ${activeSection === 'helpdesk' ? 'text-accent' : 'text-light-muted'}`}
              onClick={() => setActiveSection('helpdesk')}
            >
              <i className="fas fa-headset text-lg"></i>
              <span className="text-xs mt-1">Help Desk</span>
            </button>
            <button
              className={`flex flex-col items-center p-2 ${activeSection === 'newsletter' ? 'text-accent' : 'text-light-muted'}`}
              onClick={() => setActiveSection('newsletter')}
            >
              <i className="fas fa-envelope text-lg"></i>
              <span className="text-xs mt-1">Newsletter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;