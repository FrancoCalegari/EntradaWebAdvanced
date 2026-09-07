// routes/auth.routes.js
// Rutas de autenticación.

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// POST /api/auth/login — Iniciar sesión y obtener JWT
router.post('/login', authController.login);

module.exports = router;
