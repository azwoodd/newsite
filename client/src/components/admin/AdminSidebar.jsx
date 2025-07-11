import { Link } from 'react-router-dom';

const AdminSidebar = ({ activeSection, setActiveSection }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'tachometer-alt' },
    { id: 'orders', label: 'Orders', icon: 'file-invoice' },
    { id: 'showcase', label: 'Showcase', icon: 'music' },
    { id: 'affiliate', label: 'Affiliates', icon: 'handshake' }, // ADDED AFFILIATE
    { id: 'helpdesk', label: 'Help Desk', icon: 'headset' },
    { id: 'newsletter', label: 'Newsletter', icon: 'envelope' }
  ];

  return (
    <aside className="h-full flex flex-col">
      <div className="p-4 border-b border-white/10">
        <Link to="/" className="flex items-center">
          <i className="fas fa-music text-accent mr-2"></i>
          <span className="text-xl font-bold font-secondary">SongSculptors</span>
        </Link>
        <div className="mt-2 px-2 py-1 bg-white/10 rounded text-xs font-medium">
          Admin Panel
        </div>
      </div>
      
      <nav className="p-4 flex-grow overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                  activeSection === item.id
                    ? 'bg-accent text-dark font-medium'
                    : 'hover:bg-white/5 text-light-muted'
                }`}
                onClick={() => setActiveSection(item.id)}
              >
                <i className={`fas fa-${item.icon} w-6`}></i>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        
        <div className="mt-8 pt-6 border-t border-white/10">
          <h3 className="px-4 text-xs font-semibold text-light-muted uppercase tracking-wider mb-2">
            Main Site
          </h3>
          <ul className="space-y-2">
            <li>
              <Link
                to="/"
                className="flex items-center px-4 py-2 rounded-lg hover:bg-white/5 text-light-muted transition-colors"
              >
                <i className="fas fa-home w-6"></i>
                <span>Homepage</span>
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard"
                className="flex items-center px-4 py-2 rounded-lg hover:bg-white/5 text-light-muted transition-colors"
              >
                <i className="fas fa-user w-6"></i>
                <span>User Dashboard</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>
      
      <div className="p-4 text-xs text-light-muted border-t border-white/10 hidden sm:block">
        <p>© 2025 SongSculptors</p>
        <p>Admin Version 1.0</p>
      </div>
    </aside>
  );
};

export default AdminSidebar;