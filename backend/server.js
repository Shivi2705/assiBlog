const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));
app.use('/uploads', express.static('uploads'));

let blogs = [];
let nextId = 1;

// Multer
const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Auth
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  jwt.verify(token, 'secretkey', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    next();
  });
};

// LOGIN
app.post('/api/login', (req, res) => {
  console.log('LOGIN:', req.body);
  if (req.body.username === 'admin' && req.body.password === 'admin123') {
    const token = jwt.sign({ username: 'admin' }, 'secretkey');
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// GET BLOGS
app.get('/api/blogs', (req, res) => {
  res.json(blogs);
});

// CREATE BLOG (Fixed!)
app.post('/api/blogs', authenticateToken, upload.single('image'), (req, res) => {
  console.log('Creating blog:', req.body);
  console.log('Image:', req.file ? req.file.filename : 'No image');
  
  const blog = {
    _id: nextId++ + '',
    title: req.body.title,
    content: req.body.content,
    category: req.body.category,
    excerpt: req.body.excerpt,
    image: req.file ? '/uploads/' + req.file.filename : '',
    featured: req.body.featured === 'true',
    views: 0,
    createdAt: new Date().toISOString()
  };
  
  blogs.push(blog);
  console.log('Blog saved:', blog._id);
  res.json(blog);
});

// UPDATE BLOG
app.put('/api/blogs/:id', authenticateToken, upload.single('image'), (req, res) => {
  const index = blogs.findIndex(b => b._id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  
  blogs[index] = {
    ...blogs[index],
    title: req.body.title,
    content: req.body.content,
    category: req.body.category,
    excerpt: req.body.excerpt,
    featured: req.body.featured === 'true',
    image: req.file ? '/uploads/' + req.file.filename : blogs[index].image
  };
  
  res.json(blogs[index]);
});

// DELETE
app.delete('/api/blogs/:id', authenticateToken, (req, res) => {
  blogs = blogs.filter(b => b._id !== req.params.id);
  res.json({ message: 'Deleted' });
});

app.listen(5000, () => {
  console.log('🚀 Backend: http://localhost:5000');
  console.log('✅ Login: admin/admin123');
});