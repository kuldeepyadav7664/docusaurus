require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4000;

// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ User schema & model
const userSchema = new mongoose.Schema({
  email: String,
  password: String, // hashed password
  role: String       // 'author' or 'manager'
});
const User = mongoose.model('User', userSchema);

// ✅ POST /api/login route (Updated with role match)
app.post('/api/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({ email, role }); // ✅ Match both email & role
    if (!user) return res.status(401).json({ message: 'Invalid email, password, or role' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign(
      { email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: `${process.env.TOKEN_EXPIRE_MINUTES}m` }
    );

    res.json({ token, role: user.role, email: user.email });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// ✅ NEW: GET /api/validate-token route (for token check on frontend)
app.get('/api/validate-token', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or malformed token' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    res.json({ valid: true, user: decoded });
  });
});


// ✅ GET /api/protected (JWT test route)
app.get('/api/protected', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Missing token' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });

    res.json({ message: 'Protected content', user: decoded });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
