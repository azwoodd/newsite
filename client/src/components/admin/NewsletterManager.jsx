import { useState, useEffect } from 'react';
import { adminService } from '../../services/api';

const NewsletterManager = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('subscribed_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getNewsletterSignups();
      setSubscribers(response.data.signups);
    } catch (err) {
      console.error('Error fetching newsletter subscribers:', err);
      setError('Failed to load newsletter subscribers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      
      // Request CSV file
      const response = await adminService.exportNewsletterSignups();
      
      // Create blob from response
      const blob = new Blob([response.data], { type: 'text/csv' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
      
      // Append link to body, click it, and clean up
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting subscribers:', err);
      setError('Failed to export subscribers. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Handle sort change
  const handleSort = (field) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Otherwise, sort by the new field in ascending order
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort subscribers
  const filteredSubscribers = subscribers
    .filter(subscriber => {
      if (!search) return true;
      
      const searchLower = search.toLowerCase();
      return subscriber.email.toLowerCase().includes(searchLower);
    })
    .sort((a, b) => {
      // Sort subscribers
      let comparison = 0;
      
      if (sortField === 'subscribed_at') {
        comparison = new Date(a.subscribed_at) - new Date(b.subscribed_at);
      } else if (sortField === 'email') {
        comparison = a.email.localeCompare(b.email);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-secondary">Newsletter Subscribers</h1>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search emails..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="py-2 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-light-muted"></i>
          </div>
          
          <button
            onClick={handleExportCSV}
            disabled={loading || exporting || subscribers.length === 0}
            className="px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Exporting...
              </>
            ) : (
              <>
                <i className="fas fa-file-export mr-2"></i>
                Export CSV
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-romantic/10 border border-romantic rounded-lg p-4 mb-6">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Total Subscribers</h3>
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xl">
              <i className="fas fa-users"></i>
            </div>
          </div>
          <div className="text-3xl font-bold mt-2">{subscribers.length}</div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">This Month</h3>
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xl">
              <i className="fas fa-calendar-alt"></i>
            </div>
          </div>
          <div className="text-3xl font-bold mt-2">
            {subscribers.filter(s => {
              const date = new Date(s.subscribed_at);
              const now = new Date();
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length}
          </div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">This Week</h3>
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xl">
              <i className="fas fa-clock"></i>
            </div>
          </div>
          <div className="text-3xl font-bold mt-2">
            {subscribers.filter(s => {
              const date = new Date(s.subscribed_at);
              const now = new Date();
              const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              return date > oneWeekAgo;
            }).length}
          </div>
        </div>
      </div>
      
      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        </div>
      )}
      
      {/* Subscribers Table */}
      {!loading && (
        <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/10">
                  <th className="py-3 px-4 text-left">
                    <button
                      className="flex items-center focus:outline-none"
                      onClick={() => handleSort('email')}
                    >
                      Email Address
                      {sortField === 'email' && (
                        <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ml-2`}></i>
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left">
                    <button
                      className="flex items-center focus:outline-none"
                      onClick={() => handleSort('subscribed_at')}
                    >
                      Date Subscribed
                      {sortField === 'subscribed_at' && (
                        <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ml-2`}></i>
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="py-8 text-center text-light-muted">
                      {search ? 'No subscribers match your search.' : 'No subscribers found.'}
                    </td>
                  </tr>
                ) : (
                  filteredSubscribers.map((subscriber) => (
                    <tr key={subscriber.id} className="border-t border-white/10 hover:bg-white/5">
                      <td className="py-3 px-4">
                        <a
                          href={`mailto:${subscriber.email}`}
                          className="hover:text-accent transition-colors"
                        >
                          {subscriber.email}
                        </a>
                      </td>
                      <td className="py-3 px-4">
                        {formatDate(subscriber.subscribed_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsletterManager;