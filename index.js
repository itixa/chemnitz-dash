const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const User = require('./models/User');

const app = express();
const PORT = 3000;

mongoose.connect('mongodb://127.0.0.1:27017/chemnitz', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'chemnitz-secret-key',
  resave: false,
  saveUninitialized: true
}));

function isAuthenticated(req, res, next) {
  if (req.session.userId) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ROUTES
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/register.html', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/map.html', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public/map.html')));

app.post('/register', async (req, res) => {
  try {
    const { name, password, nationality, currentLocation, destinationLocation } = req.body;

    if (!name || !password || !nationality || !currentLocation || !destinationLocation) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await User.findOne({ name });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      password: hashedPassword,
      nationality,
      currentLocation: { name: currentLocation },
      destinationLocation: { name: destinationLocation }
    });

    await user.save();
    req.session.userId = user._id;
    res.status(201).json({ message: 'User registered', userId: user._id });

  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ error: 'Registration failed' });
  }
});
app.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const user = await User.findById(req.session.userId);
  res.json(user);
});

app.get('/api/sites', async (req, res) => {
  try {
    const sites = await Site.find();  // Make sure this model exists
    res.json(sites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ LOGIN USER WITH PASSWORD CHECK
app.post('/login', async (req, res) => {
  const { name, password } = req.body;
  try {
    const user = await User.findOne({ name });
    if (!user) return res.status(401).json({ error: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });

    req.session.userId = user._id;
    res.json({ message: 'Login successful', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Login error' });
  }
});
app.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const user = await User.findById(req.session.userId);
  res.json(user);
});

// ✅ LOGOUT
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

// ✅ GET USERS
app.get('/users', async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

// ✅ UPDATE USER
app.put('/users/:id', async (req, res) => {
  try {
    const { name, nationality, currentLocation, destinationLocation } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, {
      name,
      nationality,
      currentLocation,
      destinationLocation
    }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// ✅ DELETE USER
app.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ✅ FAVORITES
app.post('/users/:id/favorites', isAuthenticated, async (req, res) => {
  const user = await User.findById(req.params.id);
  const site = req.body.site;
  if (!user) return res.status(404).send('User not found');
  if (!user.favorites.some(f => f.name === site.name)) {
    user.favorites.push(site);
    await user.save();
  }
  res.json(user.favorites);
});
app.post('/users/:id/favorites', async (req, res) => {
  try {
    const { id } = req.params;
    const site = req.body.site;

    const user = await User.findById(id);
    if (!user || !site) return res.status(400).json({ error: "Invalid data" });

    const alreadyExists = user.favorites.some(fav => fav.name === site.name);
    if (!alreadyExists) {
      user.favorites.push(site);
      await user.save();
    }

    res.json(user.favorites);
  } catch (err) {
    console.error("❌ Failed to add favorite:", err);
    res.status(500).json({ error: "Server error" });
  }
});
app.post('/users/:id/favorites', async (req, res) => {
  try {
    const { id } = req.params;
    const site = req.body.site;

    const user = await User.findById(id);
    if (!user || !site) return res.status(400).json({ error: "Invalid data" });

    const alreadyExists = user.favorites.some(f => f.name === site.name);
    if (!alreadyExists) {
      user.favorites.push(site);
      await user.save();
    }

    res.json(user.favorites);
  } catch (err) {
    console.error("❌ Failed to add favorite:", err);
    res.status(500).json({ error: "Server error" });
  }
});
app.put('/users/:id', async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});
app.delete('/users/:id/favorites', async (req, res) => {
  const { site } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.favorites = user.favorites.filter(fav =>
      fav.name !== site.name ||
      fav.address !== site.address
    );

    await user.save();
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});


app.get('/users/:id/favorites', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send("User not found");

    res.json({ favorites: user.favorites || [] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

app.delete('/users/:id/favorites', isAuthenticated, async (req, res) => {
  try {
    const { site } = req.body;
    await User.findByIdAndUpdate(req.params.id, {
      $pull: { favorites: { name: site.name } }
    });
    res.json({ message: 'Favorite removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

app.get('/users/:id/favorites', isAuthenticated, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).send('User not found');
  res.json(user.favorites);
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
