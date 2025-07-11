// client/src/components/admin/ShowcaseManager.jsx
import { useState, useEffect, useRef } from 'react';
import { adminService } from '../../services/api';

const ShowcaseManager = () => {
  const [showcaseItems, setShowcaseItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    author: '',
    genre: '',
    category: '',
    featured: false,
    isPublic: true, // Default to public
    image: null,
    audio: null
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRefs = {
    image: useRef(null),
    audio: useRef(null)
  };

  // Load showcase items on component mount
  useEffect(() => {
    fetchShowcaseItems();
    
    // Check if there are any gallery consents stored in localStorage
    try {
      const galleryConsent = localStorage.getItem('songSculptors_galleryConsent');
      console.log('Gallery consent from localStorage:', galleryConsent);
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
    }
  }, []);

  // Fetch showcase items from API
  const fetchShowcaseItems = async () => {
    try {
      setLoading(true);
      const response = await adminService.getShowcaseItems();
      setShowcaseItems(response.data.showcaseItems);
    } catch (err) {
      console.error('Error fetching showcase items:', err);
      setError('Failed to load showcase items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      author: '',
      genre: '',
      category: '',
      featured: false,
      isPublic: true,
      image: null,
      audio: null
    });
    setIsEditing(false);
    setIsCreating(false);
    setSelectedItem(null);
    
    // Clear file inputs
    if (fileInputRefs.image.current) fileInputRefs.image.current.value = '';
    if (fileInputRefs.audio.current) fileInputRefs.audio.current.value = '';
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      setFormData({
        ...formData,
        [name]: files[0]
      });
    } else if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Simulate upload progress
  const simulateProgress = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress > 95) {
        clearInterval(interval);
        progress = 95;
      }
      setUploadProgress(Math.min(Math.round(progress), 95));
    }, 300);
    
    return () => clearInterval(interval);
  };

  // Handle form submission for creating or updating showcase item
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate file sizes
    const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
    
    if (formData.image && formData.image.size > maxSizeInBytes) {
      setError('Image file is too large. Maximum allowed size is 50MB.');
      return;
    }
    
    if (formData.audio && formData.audio.size > maxSizeInBytes) {
      setError('Audio file is too large. Maximum allowed size is 50MB.');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      // Start progress simulation
      const stopProgress = simulateProgress();
      
      // Create FormData object
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('author', formData.author);
      data.append('genre', formData.genre);
      data.append('category', formData.category);
      data.append('featured', formData.featured);
      data.append('isPublic', formData.isPublic);
      
      // Only append files if they exist (for editing case)
      if (formData.image) {
        data.append('image', formData.image);
      }
      
      if (formData.audio) {
        data.append('audio', formData.audio);
      }
      
      // Create or update showcase item
      if (isEditing) {
        await adminService.updateShowcaseItem(selectedItem.id, data);
      } else {
        await adminService.addShowcaseItem(data);
      }
      
      // Stop progress simulation
      stopProgress();
      setUploadProgress(100);
      
      // Refresh showcase items
      await fetchShowcaseItems();
      
      // Reset form
      resetForm();
      
      // Show success message
      setError({ type: 'success', message: isEditing ? 'Showcase item updated successfully!' : 'New showcase item added successfully!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } catch (err) {
      console.error('Error saving showcase item:', err);
      setError('Failed to save showcase item. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Handle click on edit button
  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      author: item.author,
      genre: item.genre,
      category: item.category,
      featured: item.featured,
      isPublic: item.is_public !== undefined ? item.is_public : true,
      image: null,
      audio: null
    });
    setIsEditing(true);
    setIsCreating(true);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open delete confirmation
  const openDeleteConfirmation = (item) => {
    setConfirmDeleteItem(item);
  };

  // Cancel delete
  const cancelDelete = () => {
    setConfirmDeleteItem(null);
  };

  // Handle click on delete button
  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await adminService.deleteShowcaseItem(id);
      await fetchShowcaseItems();
      setConfirmDeleteItem(null);
      setError({ type: 'success', message: 'Showcase item deleted successfully!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } catch (err) {
      console.error('Error deleting showcase item:', err);
      setError('Failed to delete showcase item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle featured status
  const toggleFeatured = async (id, featured) => {
    try {
      setLoading(true);
      const data = new FormData();
      data.append('featured', !featured);
      await adminService.updateShowcaseItem(id, data);
      await fetchShowcaseItems();
      setError({ type: 'success', message: !featured ? 'Item added to featured!' : 'Item removed from featured!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } catch (err) {
      console.error('Error updating featured status:', err);
      setError('Failed to update featured status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle public status
  const togglePublic = async (id, isPublic) => {
    try {
      setLoading(true);
      const data = new FormData();
      data.append('isPublic', !isPublic);
      await adminService.updateShowcaseItem(id, data);
      await fetchShowcaseItems();
      setError({ type: 'success', message: !isPublic ? 'Item is now public!' : 'Item is now private!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } catch (err) {
      console.error('Error updating public status:', err);
      setError('Failed to update visibility status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-secondary">Showcase Gallery</h1>
        
        <button
          onClick={() => setIsCreating(!isCreating)}
          className={`px-4 py-2 ${isCreating ? 'bg-white/10 border-white/20' : 'bg-accent text-dark'} rounded-lg hover:bg-accent-alt transition-colors flex items-center`}
        >
          {isCreating ? (
            <>
              <i className="fas fa-times mr-2"></i>
              Cancel
            </>
          ) : (
            <>
              <i className="fas fa-plus mr-2"></i>
              Add New Item
            </>
          )}
        </button>
      </div>
      
      {/* Error/Success Message */}
      {error && (
        <div className={`${error.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-romantic/10 border border-romantic'} rounded-lg p-4 mb-6 flex items-center justify-between`}>
          <div>
            <i className={`${error.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'} mr-2`}></i>
            {typeof error === 'string' ? error : error.message}
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-white/70 hover:text-white"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      
      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-white/5 rounded-lg border border-white/10 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">
            {isEditing ? 'Edit Showcase Item' : 'Add New Showcase Item'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="title" className="block mb-2 text-sm font-medium">
                  Title <span className="text-romantic">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                />
              </div>
              
              <div>
                <label htmlFor="author" className="block mb-2 text-sm font-medium">
                  Author <span className="text-romantic">*</span>
                </label>
                <input
                  type="text"
                  id="author"
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                />
              </div>
              
              <div>
                <label htmlFor="genre" className="block mb-2 text-sm font-medium">
                  Genre <span className="text-romantic">*</span>
                </label>
                <input
                  type="text"
                  id="genre"
                  name="genre"
                  value={formData.genre}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                />
              </div>
              
              <div>
                <label htmlFor="category" className="block mb-2 text-sm font-medium">
                  Category <span className="text-romantic">*</span>
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                >
                  <option value="">Select Category</option>
                  <option value="wedding">Wedding & Proposals</option>
                  <option value="family">Family & Children</option>
                  <option value="celebration">Celebrations</option>
                  <option value="memorial">Memorial</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="description" className="block mb-2 text-sm font-medium">
                  Description <span className="text-romantic">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                ></textarea>
              </div>
              
              <div>
                <label htmlFor="image" className="block mb-2 text-sm font-medium">
                  Cover Image {!isEditing && <span className="text-romantic">*</span>}
                </label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  ref={fileInputRefs.image}
                  accept="image/*"
                  onChange={handleInputChange}
                  required={!isEditing}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                />
                {isEditing && !formData.image && (
                  <div className="text-xs text-light-muted mt-1">
                    Leave empty to keep current image
                  </div>
                )}
              </div>
              
              <div>
                <label htmlFor="audio" className="block mb-2 text-sm font-medium">
                  Audio File {!isEditing && <span className="text-romantic">*</span>}
                </label>
                <input
                  type="file"
                  id="audio"
                  name="audio"
                  ref={fileInputRefs.audio}
                  accept="audio/*"
                  onChange={handleInputChange}
                  required={!isEditing}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                />
                {isEditing && !formData.audio && (
                  <div className="text-xs text-light-muted mt-1">
                    Leave empty to keep current audio
                  </div>
                )}
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 ${formData.featured ? 'bg-accent' : 'bg-white/10'} rounded-full p-1 transition duration-300 ease-in-out mr-3`}>
                    <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition duration-300 ease-in-out ${formData.featured ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                  <span>Feature this item in the showcase gallery</span>
                </label>
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isPublic"
                    checked={formData.isPublic}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 ${formData.isPublic ? 'bg-accent' : 'bg-white/10'} rounded-full p-1 transition duration-300 ease-in-out mr-3`}>
                    <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition duration-300 ease-in-out ${formData.isPublic ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                  <span>Make this item visible to the public</span>
                </label>
              </div>
            </div>
            
            {uploading && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-light-muted">Uploading...</span>
                  <span className="text-sm text-light-muted">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-transparent border border-white/20 text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={uploading}
                className="px-6 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors flex items-center"
              >
                {uploading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Save
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Loading Indicator */}
      {loading && !uploading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        </div>
      )}
      
      {/* Showcase Items Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {showcaseItems.length === 0 ? (
            <div className="md:col-span-3 text-center py-12 bg-white/5 rounded-lg border border-white/10">
              <i className="fas fa-music text-4xl text-light-muted mb-4"></i>
              <p className="text-light-muted">No showcase items found. Add your first one!</p>
            </div>
          ) : (
            showcaseItems.map((item) => (
              <div
                key={item.id}
                className={`bg-white/5 rounded-lg overflow-hidden border-2 ${
                  item.featured ? 'border-accent' : item.is_public ? 'border-white/10' : 'border-romantic/50'
                }`}
              >
                <div className="h-40 relative overflow-hidden">
                  <img
                    src={item.image_path ? `/uploads/${item.image_path}` : item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Status badges */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    {item.featured && (
                      <div className="bg-accent text-dark py-1 px-3 rounded-full text-xs font-semibold">
                        Featured
                      </div>
                    )}
                    {!item.is_public && (
                      <div className="bg-romantic/80 text-white py-1 px-3 rounded-full text-xs font-semibold">
                        Private
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end p-4">
                    <h3 className="text-xl font-secondary text-white">{item.title}</h3>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-light-muted">
                      <i className="fas fa-user mr-1"></i> {item.author}
                    </div>
                    <div className="text-sm text-light-muted">
                      <i className="fas fa-music mr-1"></i> {item.genre}
                    </div>
                  </div>
                  
                  <p className="text-sm text-light-muted mb-4 line-clamp-2">{item.description}</p>
                  
                  <div className="flex justify-between text-xs text-light-muted mt-2">
                    <div className="flex items-center">
                      <i className="fas fa-eye mr-1"></i> {item.view_count || 0} views
                    </div>
                    <div className="flex items-center">
                      <i className={`fas fa-${item.is_public ? 'globe' : 'lock'} mr-1`}></i>
                      {item.is_public ? 'Public' : 'Private'}
                    </div>
                  </div>
                  
                  {/* Action buttons row */}
                  <div className="flex justify-between mt-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleFeatured(item.id, item.featured)}
                        className={`w-10 h-10 rounded-full ${
                          item.featured
                            ? 'bg-accent text-dark'
                            : 'bg-transparent border border-white/20 text-white'
                        } flex items-center justify-center transition-colors`}
                        title={item.featured ? 'Remove from featured' : 'Add to featured'}
                        aria-label={item.featured ? 'Remove from featured' : 'Add to featured'}
                      >
                        <i className="fas fa-star"></i>
                      </button>
                      
                      <button
                        onClick={() => togglePublic(item.id, item.is_public)}
                        className={`w-10 h-10 rounded-full ${
                          item.is_public
                            ? 'bg-transparent border border-white/20 text-white'
                            : 'bg-romantic/20 border border-romantic/50 text-romantic'
                        } flex items-center justify-center transition-colors`}
                        title={item.is_public ? 'Make private' : 'Make public'}
                        aria-label={item.is_public ? 'Make private' : 'Make public'}
                      >
                        <i className={`fas fa-${item.is_public ? 'globe' : 'lock'}`}></i>
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="w-10 h-10 rounded-full bg-transparent border border-white/20 text-white flex items-center justify-center hover:bg-white/10 transition-colors"
                        title="Edit"
                        aria-label="Edit item"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      
                      <button
                        onClick={() => openDeleteConfirmation(item)}
                        className="w-10 h-10 rounded-full bg-transparent border border-romantic/50 text-romantic flex items-center justify-center hover:bg-romantic/10 transition-colors"
                        title="Delete"
                        aria-label="Delete item"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {confirmDeleteItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-deep border border-white/10 rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
              <p className="mb-6">
                Are you sure you want to delete "{confirmDeleteItem.title}"? This action cannot be undone.
              </p>
              
              <div className="flex space-x-4 justify-end">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 bg-transparent border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteItem.id)}
                  className="px-4 py-2 bg-romantic text-white rounded-lg hover:bg-romantic/80 transition-colors flex items-center"
                >
                  <i className="fas fa-trash-alt mr-2"></i>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowcaseManager;