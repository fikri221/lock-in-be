const express = require('express');
const router = express.Router();
const habitController = require('../controllers/habitController');
const auth = require('../middlewares/auth');
const { validator, schemas } = require('../middleware/validator');

// All routes here require authentication
router.use(auth);