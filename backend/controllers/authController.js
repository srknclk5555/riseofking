const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_real_secret';

// Register a new user
const register = async (req, res) => {
  try {
    const { email, username, password, mainCharacter } = req.body;
    
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate a unique UID
    const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert the new user
    const result = await db.query(
      `INSERT INTO users (uid, email, username, password_hash, "mainCharacter", profile)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, uid, email, username, "mainCharacter", "createdAt"`,
      [uid, email, username, passwordHash, mainCharacter || null, {}]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { 
        uid: user.uid, 
        id: user.id, 
        email: user.email,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        username: user.username,
        mainCharacter: user.mainCharacter
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    if ((!email && !username) || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    // Find user by email or username
    let query, params;
    if (email) {
      query = 'SELECT id, uid, email, username, password_hash, "mainCharacter", profile FROM users WHERE email = $1';
      params = [email];
    } else {
      query = 'SELECT id, uid, email, username, password_hash, "mainCharacter", profile FROM users WHERE username = $1';
      params = [username];
    }

    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Compare passwords
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        uid: user.uid, 
        id: user.id, 
        email: user.email,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        username: user.username,
        mainCharacter: user.mainCharacter
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    
    const result = await db.query(
      `SELECT id, uid, email, username, "mainCharacter", profile, other_players, createdAt
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { username, mainCharacter, profile } = req.body;

    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    if (username !== undefined) {
      updateFields.push(`username = $${paramIndex}`);
      params.push(username);
      paramIndex++;
    }

    if (mainCharacter !== undefined) {
      updateFields.push(`"mainCharacter" = $${paramIndex}`);
      params.push(mainCharacter);
      paramIndex++;
    }

    if (profile !== undefined) {
      updateFields.push(`profile = $${paramIndex}`);
      params.push(JSON.stringify(profile));
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updatedAt = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
      RETURNING id, uid, email, username, "mainCharacter", profile, other_players, updatedAt
    `;
    params.push(userId);

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};