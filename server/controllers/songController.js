const { query } = require('../config/db');

// Get public showcase songs
exports.getShowcaseSongs = async (req, res) => {
  try {
    // Get category filter and limit
    const { category, limit } = req.query;
    
    let showcaseQuery = `
      SELECT * FROM showcase_items 
      WHERE is_public = 1
    `;
    
    const queryParams = [];
    
    // Add category filter if provided
    if (category && category !== 'all') {
      showcaseQuery += ' AND category = ?';
      queryParams.push(category);
    }
    
    // Order by featured first, then view_count, then created date
    showcaseQuery += ' ORDER BY featured DESC, view_count DESC, created_at DESC';
    
    // Add limit if provided
    if (limit && !isNaN(parseInt(limit))) {
      showcaseQuery += ' LIMIT ?';
      queryParams.push(parseInt(limit));
    }
    
    const showcaseItems = await query(showcaseQuery, queryParams);
    
    // Format URLs for frontend
    const formattedItems = showcaseItems.map(item => ({
      ...item,
      image: `/uploads/${item.image_path}`,
      trackUrl: `/uploads/${item.audio_path}`,
      featured: item.featured === 1,
      isPublic: item.is_public === 1
    }));
    
    res.status(200).json({
      success: true,
      showcaseItems: formattedItems
    });
  } catch (error) {
    console.error('Get showcase songs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching showcase songs'
    });
  }
};

// Get showcase song by ID
exports.getShowcaseSongById = async (req, res) => {
  try {
    const songId = req.params.id;
    
    const songs = await query('SELECT * FROM showcase_items WHERE id = ?', [songId]);
    
    if (songs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Showcase song not found'
      });
    }
    
    const song = songs[0];
    
    // Format URLs for frontend
    const formattedSong = {
      ...song,
      image: `/uploads/${song.image_path}`,
      trackUrl: `/uploads/${song.audio_path}`,
      featured: song.featured === 1,
      isPublic: song.is_public === 1
    };
    
    res.status(200).json({
      success: true,
      showcaseItem: formattedSong
    });
  } catch (error) {
    console.error('Get showcase song by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching showcase song'
    });
  }
};

// Get showcase categories
exports.getShowcaseCategories = async (req, res) => {
  try {
    const categoriesResult = await query(
      'SELECT DISTINCT category FROM showcase_items WHERE is_public = 1 ORDER BY category'
    );
    
    const categories = [
      { id: 'all', name: 'All Works' },
      ...categoriesResult.map(item => ({
        id: item.category,
        name: item.category.charAt(0).toUpperCase() + item.category.slice(1)
      }))
    ];
    
    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get showcase categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching showcase categories'
    });
  }
};

// Increment view count for a showcase song
exports.incrementViewCount = async (req, res) => {
  try {
    const songId = req.params.id;
    
    // Increment view count
    await query(
      'UPDATE showcase_items SET view_count = view_count + 1 WHERE id = ?',
      [songId]
    );
    
    res.status(200).json({
      success: true,
      message: 'View count incremented'
    });
  } catch (error) {
    console.error('Increment view count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating view count'
    });
  }
};