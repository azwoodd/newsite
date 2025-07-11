const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');

// These routes are public (no authentication required)

// @route   GET api/songs/showcase
// @desc    Get all showcase songs
// @access  Public
router.get('/showcase', songController.getShowcaseSongs);

// @route   GET api/songs/showcase/categories
// @desc    Get all showcase categories
// @access  Public
router.get('/showcase/categories', songController.getShowcaseCategories);

// @route   GET api/songs/showcase/:id
// @desc    Get showcase song by ID
// @access  Public
router.get('/showcase/:id', songController.getShowcaseSongById);

// @route   POST api/songs/showcase/:id/view
// @desc    Increment view count for a showcase song
// @access  Public
router.post('/showcase/:id/view', songController.incrementViewCount);

module.exports = router;