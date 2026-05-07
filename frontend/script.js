// Safe DOM ready
document.addEventListener('DOMContentLoaded', function() {
  // Frontend init
  if (document.querySelector('.filter-btn')) initFrontend();
  // Admin init  
  if (document.getElementById('loginForm')) initAdmin();
});

// Global vars - FIXED
let allBlogs = [];
let blogs = [];

// ===== FRONTEND =====
function initFrontend() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.filter-btn.active')?.classList.remove('active');
      btn.classList.add('active');
      loadBlogs(btn.dataset.category);
    });
  });
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => searchBlogs(e.target.value), 300);
    });
  }
  
  loadBlogs();
}

async function loadBlogs(category = 'all') {
  try {
    const params = new URLSearchParams({ category });
    const res = await fetch(`http://localhost:5000/api/blogs?${params}`);
    const data = await res.json();
    
    // Store ALL blogs globally
    allBlogs = data.blogs || data;
    blogs = allBlogs; // For search
    
    renderBlogs(allBlogs);
  } catch(e) {
    console.error('Backend error:', e);
  }
}

function renderBlogs(blogsToRender) {
  const container = document.querySelector('#blogGrid .container');
  if (!container) return;
  
  container.innerHTML = (blogsToRender || []).map(blog => `
    <div class="blog-card ${blog.image ? 'has-image' : ''}">
      <div class="blog-image" style="${blog.image ? `background-image: url(http://localhost:5000${blog.image})` : ''}">
        ${!blog.image ? '<i class="fas fa-newspaper"></i>' : ''}
      </div>
      <div class="blog-content">
        <span class="blog-category">${blog.category?.replace('-', ' ')?.toUpperCase()}</span>
        <h3 class="blog-title">${blog.title}</h3>
        <p class="blog-excerpt">${blog.excerpt?.substring(0,150) || blog.content?.substring(0,150) || 'No description'}...</p>
        <div class="blog-meta">
          <span>👁️ ${blog.views || 0} views</span>
          <button class="read-more" data-blog-id="${blog._id}">Read More →</button>
        </div>
      </div>
    </div>
  `).join('') || '<p style="text-align:center;padding:40px;color:#666">No blogs yet. Create in Admin!</p>';
  
  // Add click handlers AFTER rendering
  document.querySelectorAll('.read-more').forEach(btn => {
    btn.addEventListener('click', () => openBlogModal(btn.dataset.blogId));
  });
}

function searchBlogs(term) {
  const filtered = allBlogs.filter(b => 
    b.title.toLowerCase().includes(term.toLowerCase()) ||
    b.content.toLowerCase().includes(term.toLowerCase())
  );
  renderBlogs(filtered);
}

// Modal functions
function openBlogModal(id) {
  const blog = allBlogs.find(b => b._id === id);
  if (!blog) return;
  
  const modalContent = `
    <div style="max-width:800px;margin:0 auto;padding:20px;">
      ${blog.image ? `<img src="http://localhost:5000${blog.image}" style="width:100%;height:300px;object-fit:cover;border-radius:12px;margin-bottom:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2);">` : ''}
      <h1 style="font-size:2.2em;font-weight:700;color:#1f2937;margin-bottom:15px;line-height:1.2;">${blog.title}</h1>
      <div style="display:flex;gap:20px;margin-bottom:25px;font-size:0.95em;color:#6b7280;">
        <span style="background:linear-gradient(to right, #8b5cf6, #3b82f6);color:white;padding:4px 12px;border-radius:9999px;font-size:0.875rem;font-weight:600;">${blog.category?.replace('-',' ').toUpperCase()}</span>
        <span>👁️ ${blog.views || 0} views</span>
      </div>
      <div style="background:#f8fafc;border-left:5px solid #6366f1;padding:25px;border-radius:0 12px 12px 12px;font-size:1.1em;line-height:1.7;color:#374151;">
        ${blog.content.replace(/\n/g, '<br>')}
      </div>
    </div>
  `;
  
  const modal = document.getElementById('blogModal');
  const modalBody = document.getElementById('modalBody');
  if (modal && modalBody) {
    modalBody.innerHTML = modalContent;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

// ===== MODAL CONTROLS =====
document.addEventListener('click', (e) => {
  const blogModal = document.getElementById('blogModal');
  if (e.target === blogModal) {
    blogModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('blogModal');
    if (modal && modal.style.display === 'flex') {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }
});

// ===== ADMIN =====
let editingId = null;

function initAdmin() {
  const form = document.getElementById('loginForm');
  if (form) form.addEventListener('submit', loginAdmin);
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  
  if (localStorage.getItem('adminToken')) {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    loadAdminBlogs();
  }
}

async function loginAdmin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const res = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    
    if (data.token) {
      localStorage.setItem('adminToken', data.token);
      document.getElementById('loginModal').style.display = 'none';
      document.getElementById('adminDashboard').style.display = 'block';
      loadAdminBlogs();
    } else {
      alert('Login failed: ' + (data.error || 'Try admin/admin123'));
    }
  } catch(e) {
    alert('Server error. Start backend: cd backend && npm start');
  }
}

async function loadAdminBlogs() {
  try {
    const res = await fetch('http://localhost:5000/api/blogs', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
    });
    const blogs = await res.json();
    const grid = document.getElementById('adminBlogGrid');
    if (grid) {
      grid.innerHTML = blogs.map(b => `
        <div class="admin-blog-card">
          <h4>${b.title}</h4>
          <p>${b.category} | ${b.views || 0} views</p>
          <button onclick="editBlog('${b._id}')" style="background:#3b82f6;color:white;padding:8px 16px;border:none;border-radius:6px;margin-right:8px;cursor:pointer;">Edit</button>
          <button onclick="deleteBlog('${b._id}')" style="background:#ef4444;color:white;padding:8px 16px;border:none;border-radius:6px;cursor:pointer;">Delete</button>
        </div>
      `).join('') || '<p>No blogs yet. Create one!</p>';
    }
  } catch(e) {
    console.error('Admin blogs error:', e);
    alert('Load failed. Check token or backend.');
  }
}

function logout() {
  localStorage.removeItem('adminToken');
  location.reload();
}

// ===== FIXED EDIT FUNCTION - NOW LOADS DATA =====
async function editBlog(id) {
  try {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`http://localhost:5000/api/blogs/${id}`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const blog = await res.json();
    
    // Populate form fields
    document.getElementById('blogTitle').value = blog.title || '';
    document.getElementById('blogExcerpt').value = blog.excerpt || '';
    document.getElementById('blogCategory').value = blog.category || 'general';
    document.getElementById('blogFeatured').checked = blog.featured || false;
    document.getElementById('blogContent').innerHTML = blog.content || '<p>Start writing...</p>';
    
    // Show image preview if exists
    const preview = document.getElementById('imagePreview');
    if (preview && blog.image) {
      preview.src = `http://localhost:5000${blog.image}`;
      preview.style.display = 'block';
    }
    
    editingId = id;
    
    // Scroll to form
    document.getElementById('blogForm').scrollIntoView({ behavior: 'smooth' });
    
  } catch(e) {
    console.error('Edit load error:', e);
    alert('Failed to load blog for editing');
  }
}

async function deleteBlog(id) {
  if (confirm('Delete this blog?')) {
    try {
      await fetch(`http://localhost:5000/api/blogs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
      });
      loadAdminBlogs();
      alert('✅ Blog deleted!');
    } catch(e) {
      alert('Delete failed');
    }
  }
}

// ===== FORM HANDLING =====
document.addEventListener('DOMContentLoaded', () => {
  const blogForm = document.getElementById('blogForm');
  const blogImage = document.getElementById('blogImage');
  
  if (blogForm) blogForm.addEventListener('submit', saveBlog);
  if (blogImage) blogImage.addEventListener('change', previewImage);
});

function previewImage(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = ev => {
      const preview = document.getElementById('imagePreview');
      if (preview) {
        preview.src = ev.target.result;
        preview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  }
}

async function saveBlog(e) {
  e.preventDefault();
  
  const token = localStorage.getItem('adminToken');
  if (!token) {
    alert('Please login again');
    return;
  }
  
  const formData = new FormData();
  formData.append('title', document.getElementById('blogTitle').value);
  formData.append('content', document.getElementById('blogContent').innerHTML);
  formData.append('category', document.getElementById('blogCategory').value);
  formData.append('excerpt', document.getElementById('blogExcerpt').value);
  formData.append('featured', document.getElementById('blogFeatured').checked);
  
  const imageInput = document.getElementById('blogImage');
  if (imageInput.files[0]) {
    formData.append('image', imageInput.files[0]);
  }
  
  try {
    const url = editingId 
      ? `http://localhost:5000/api/blogs/${editingId}` 
      : 'http://localhost:5000/api/blogs';
    
    const method = editingId ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': 'Bearer ' + token
      },
      body: formData
    });
    
    if (res.ok) {
      alert(editingId ? '✅ Blog Updated!' : '✅ Blog Created!');
      loadAdminBlogs();
      resetForm();
    } else {
      const error = await res.text();
      alert('Save failed: ' + error);
    }
  } catch (e) {
    console.error('Save error:', e);
    alert('Network error. Backend running?');
  }
}

function resetForm() {
  const form = document.getElementById('blogForm');
  if (form) form.reset();
  
  const content = document.getElementById('blogContent');
  if (content) content.innerHTML = '<p>Start writing...</p>';
  
  const preview = document.getElementById('imagePreview');
  if (preview) preview.style.display = 'none';
  
  editingId = null;
}

// Rich editor
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.execCommand(btn.dataset.command, false, btn.dataset.value || null);
      document.getElementById('blogContent').focus();
    });
  });
  
  // Modal close buttons
  document.querySelectorAll('.close').forEach(close => {
    close.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
      document.body.style.overflow = 'auto';
    });
  });
});