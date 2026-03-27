const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isUserQuarantined } = require('../socket/socketManager');

const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_real_secret';

// Register a new user
const register = async (req, res) => {
  try {
    const { email, username, password, mainCharacter } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    if (username.toLowerCase() === 'astral1') {
      return res.status(400).json({ error: 'Bu kullanıcı adı kullanılamaz' });
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
       RETURNING id, uid, email, username, "mainCharacter", is_admin, created_at as "createdAt"`,
      [uid, email, username, passwordHash, mainCharacter || null, {}]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        uid: user.uid,
        id: user.id,
        email: user.email,
        username: user.username,
        is_admin: user.is_admin || false
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000 // 1 gün
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        username: user.username,
        mainCharacter: user.mainCharacter
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, username, password, fingerprint } = req.body;

    if ((!email && !username) || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    if (!fingerprint) {
      return res.status(400).json({ error: 'Device fingerprint is required' });
    }

    // Find user by email or username
    let query, params;
    if (email) {
      query = 'SELECT id, uid, email, username, password_hash, "mainCharacter", profile, is_admin FROM users WHERE email = $1';
      params = [email];
    } else {
      query = 'SELECT id, uid, email, username, password_hash, "mainCharacter", profile, is_admin FROM users WHERE username = $1';
      params = [username];
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // 🛡️ KARANTİNA (BAN) KONTROLÜ
    if (isUserQuarantined(user.uid)) {
        console.warn(`[LOGIN DEFANS] Banlı kullanıcı giriş yapmaya çalıştı: ${user.uid}`);
        return res.status(403).json({ error: 'Spam nedeniyle geçici olarak banlandınız. Lütfen sürenizin dolmasını bekleyin.' });
    }

    // 🛡️ CİHAZ PARMAK İZİ BAN KONTROLÜ
    const fingerprintCheck = await db.query(
      'SELECT is_blocked, ban_until FROM user_fingerprints WHERE fingerprint = $1',
      [fingerprint]
    );

    if (fingerprintCheck.rows.length > 0) {
      const fpData = fingerprintCheck.rows[0];
      if (fpData.is_blocked) {
        console.warn(`[FINGERPRINT BAN] Banlı cihaz giriş yapmaya çalıştı: ${fingerprint}`);
        return res.status(403).json({
          error: 'Cihazınız kalıcı olarak engellenmiştir.',
          forceLogout: true
        });
      } else if (fpData.ban_until && new Date(fpData.ban_until) > new Date()) {
        const remainingMs = new Date(fpData.ban_until) - new Date();
        const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
        console.warn(`[FINGERPRINT BAN] Süreli banlı cihaz giriş yapmaya çalıştı: ${fingerprint} - ${remainingMinutes} dakika kaldı`);
        return res.status(403).json({
          error: `Cihazınız şüpheli hareket nedeniyle ${remainingMinutes} dakika daha engellidir.`,
          forceLogout: true
        });
      }
    }

    // Compare passwords
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get IP and User-Agent
    const ipAddress = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // UPSERT fingerprint data
    await db.query(`
      INSERT INTO user_fingerprints (user_id, fingerprint, user_agent, ip_address, last_seen, login_count)
      VALUES ($1, $2, $3, $4, NOW(), 1)
      ON CONFLICT (user_id, fingerprint)
      DO UPDATE SET
        last_seen = NOW(),
        login_count = user_fingerprints.login_count + 1,
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent
    `, [user.uid, fingerprint, userAgent, ipAddress]);

    // Generate JWT token
    const token = jwt.sign(
      {
        uid: user.uid,
        id: user.id,
        email: user.email,
        username: user.username,
        is_admin: user.is_admin || false
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000 // 1 gün
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        username: user.username,
        mainCharacter: user.mainCharacter
      }
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
      `SELECT id, uid, email, username, "mainCharacter", profile, other_players, created_at as "createdAt"
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

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
      RETURNING id, uid, email, username, "mainCharacter", profile, other_players, updated_at as "updatedAt"
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

const logout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile
};