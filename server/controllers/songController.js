const { query } = require('../config/db');

// small helpers
const toBool = v => v === 1 || v === true || v === '1';
const normalizeAsset = p => {
  if (!p) return null;
  // ensure it’s served from /uploads/... regardless of how it’s stored
  const clean = String(p).replace(/^\/+/, ''); // strip leading slashes
  return clean.startsWith('uploads/') ? `/${clean}` : `/uploads/${clean}`;
};

// GET /api/songs/showcase
exports.getShowcaseSongs = async (req, res) => {
  try {
    // sanitize inputs
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, rawLimit)) : 6;

    const category = (req.query.category || '').trim().toLowerCase();

    let sql = `
      SELECT *
      FROM showcase_items
      WHERE is_public = 1
    `;
    const params = [];

    if (category && category !== 'all') {
      // case-insensitive match
      sql += ` AND LOWER(category) = ?`;
      params.push(category);
    }

sql += `
  ORDER BY featured DESC, view_count DESC, created_at DESC
  LIMIT ${limit}
`;
// Don't push limit to params - use template literal instead

const rows = await query(sql, params);

    const items = rows.map(r => ({
      ...r,
      image: normalizeAsset(r.image_path),
      trackUrl: normalizeAsset(r.audio_path),
      featured: toBool(r.featured),
      isPublic: toBool(r.is_public),
    }));

    return res.status(200).json({ success: true, items });
  } catch (err) {
    console.error('Get showcase songs error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching showcase songs',
    });
  }
};

// GET /api/songs/showcase/:id
exports.getShowcaseSongById = async (req, res) => {
  try {
    const songId = parseInt(req.params.id, 10);
    if (!Number.isFinite(songId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const rows = await query('SELECT * FROM showcase_items WHERE id = ?', [songId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Showcase song not found' });
    }

    const r = rows[0];
    const item = {
      ...r,
      image: normalizeAsset(r.image_path),
      trackUrl: normalizeAsset(r.audio_path),
      featured: toBool(r.featured),
      isPublic: toBool(r.is_public),
    };

    return res.status(200).json({ success: true, item });
  } catch (err) {
    console.error('Get showcase song by ID error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching showcase song',
    });
  }
};

// GET /api/songs/showcase/categories
exports.getShowcaseCategories = async (_req, res) => {
  try {
    const rows = await query(
      'SELECT DISTINCT category FROM showcase_items WHERE is_public = 1 ORDER BY category'
    );

    const categories = [
      { id: 'all', name: 'All Works' },
      ...rows
        .map(x => (x.category || '').trim())
        .filter(Boolean)
        .map(c => ({ id: c.toLowerCase(), name: c.charAt(0).toUpperCase() + c.slice(1) })),
    ];

    return res.status(200).json({ success: true, categories });
  } catch (err) {
    console.error('Get showcase categories error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching showcase categories',
    });
  }
};

// POST /api/songs/showcase/:id/view (or wherever you mount it)
exports.incrementViewCount = async (req, res) => {
  try {
    const songId = parseInt(req.params.id, 10);
    if (!Number.isFinite(songId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    await query('UPDATE showcase_items SET view_count = view_count + 1 WHERE id = ?', [songId]);
    return res.status(200).json({ success: true, message: 'View count incremented' });
  } catch (err) {
    console.error('Increment view count error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating view count',
    });
  }
};