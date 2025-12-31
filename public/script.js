// Main JavaScript for BismarShop Admin Dashboard

// Global variables
let currentSection = 'dashboard';
let products = [];
let orders = [];
let customers = [];
let dashboardStats = {};
let enhancedDashboardData = {};
let currentUser = null;
let authToken = null;
let userPermissions = [];

// Client-side permissions map as a fallback in case API does not return permissions
const rolesPermissions = {
    super_admin: [
        'dashboard', 'products', 'customers', 'orders',
        'vouchers', 'flash-sales', 'free-shipping', 'product-vouchers',
        'reviews', 'analytics', 'categories', 'settings', 'widgets', 'best-sellers', 'admin-management'
    ],
    manager: [
        'dashboard', 'products', 'customers',
        'vouchers', 'flash-sales', 'free-shipping', 'product-vouchers',
        'reviews', 'widgets', 'categories', 'best-sellers'
    ],
    staff: [
        'dashboard', 'products', 'customers', 'reviews', 'categories', 'best-sellers'
    ]
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    
    // Force show admin menu after a short delay
    setTimeout(() => {
        showAdminMenu();
    }, 1000);
});

// Force refresh function for testing
window.forceRefreshAuth = function() {
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken');
    location.reload();
};

// Debug function to test widgets
window.testWidgets = async function() {
    console.log('🧪 Testing widgets functionality...');

    try {
        const resp = await fetch('/api/widgets', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('📡 Response status:', resp.status);
        console.log('📡 Response headers:', [...resp.headers.entries()]);

        const data = await resp.json();
        console.log('📊 Response data:', data);

        const tbody = document.getElementById('widgetsTableBody');
        console.log('📋 Table body element:', tbody);

        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-success">✅ Test berhasil!</td></tr>';
        }

    } catch (error) {
        console.error('❌ Test widgets error:', error);
    }
};

// Function to fix widget data and reload
window.fixWidgetData = async function() {
    console.log('🔧 Fixing widget data...');
    try {
        const resp = await apiCall('/api/widgets');
        if (resp && resp.success && resp.data) {
            console.log('📊 Current widgets:', resp.data);
            // Force reload with corrected data
            loadWidgetsList();
        }
    } catch (error) {
        console.error('❌ Fix widget data error:', error);
    }
};

// Comprehensive test function
window.testAllWidgetFunctions = async function() {
    console.log('🧪 Testing all widget functions...');
    
    try {
        // Test 1: Load widgets
        console.log('1️⃣ Testing loadWidgetsList...');
        await loadWidgetsList();
        
        // Test 2: Check if table exists
        console.log('2️⃣ Checking table elements...');
        const table = document.getElementById('widgetsTable');
        const tbody = document.getElementById('widgetsTableBody');
        console.log('Table exists:', !!table);
        console.log('Table body exists:', !!tbody);
        
        // Test 3: Check upload form
        console.log('3️⃣ Checking upload form...');
        const form = document.getElementById('widgetUploadForm');
        const titleInput = document.getElementById('widgetTitle');
        const typeSelect = document.getElementById('widgetType');
        const fileInput = document.getElementById('widgetFile');
        console.log('Form exists:', !!form);
        console.log('Title input exists:', !!titleInput);
        console.log('Type select exists:', !!typeSelect);
        console.log('File input exists:', !!fileInput);
        
        // Test 4: Check functions exist
        console.log('4️⃣ Checking functions...');
        console.log('submitWidgetUpload exists:', typeof submitWidgetUpload === 'function');
        console.log('editWidget exists:', typeof window.editWidget === 'function');
        console.log('toggleWidget exists:', typeof window.toggleWidget === 'function');
        console.log('deleteWidget exists:', typeof window.deleteWidget === 'function');
        
        console.log('✅ All tests completed!');
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
};

// Test image loading specifically
window.testImageLoading = function() {
    console.log('🖼️ Testing image loading...');
    
    const images = document.querySelectorAll('#widgetsTable img');
    images.forEach((img, index) => {
        console.log(`Image ${index + 1}:`);
        console.log('  - Source:', img.src);
        console.log('  - Complete:', img.complete);
        console.log('  - Natural width:', img.naturalWidth);
        console.log('  - Natural height:', img.naturalHeight);
        
        if (img.naturalWidth === 0) {
            console.log('  - ❌ Image failed to load');
        } else {
            console.log('  - ✅ Image loaded successfully');
        }
    });
    
    // Test direct image URLs
    const testUrls = [
        '/uploads/logo%20bulat.png',
        '/uploads/logo bulat.png',
        '/uploads/banner-defaults.jpeg',
        '/uploads/placeholder.svg'
    ];
    
    testUrls.forEach(url => {
        fetch(url)
            .then(response => {
                console.log(`${url}: ${response.status} ${response.statusText}`);
            })
            .catch(error => {
                console.log(`${url}: Error - ${error.message}`);
            });
    });
};

// Force reload widgets with cache clear
window.forceReloadWidgets = async function() {
    console.log('🔄 Force reloading widgets...');
    
    try {
        // Clear any cached data
        const tbody = document.getElementById('widgetsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
        }
        
        // Wait a bit then reload
        setTimeout(async () => {
            await loadWidgetsList();
            
            // Test images after load
            setTimeout(() => {
                testImageLoading();
            }, 1000);
        }, 500);
        
    } catch (error) {
        console.error('❌ Force reload error:', error);
    }
};

// Ensure Admin Management menu is shown only if permitted
window.showAdminMenu = function() {
    const hasAdminMgmt = Array.isArray(userPermissions) && userPermissions.includes('admin-management');
    if (!hasAdminMgmt) {
        return; // Do nothing for users without permission
    }
    // Add to sidebar if not exists
    const sidebar = document.querySelector('.sidebar ul.nav');
    const existingAdminMenu = document.querySelector('a[onclick="showSection(\'admin-management\')"]');
    if (!existingAdminMenu && sidebar) {
        const adminMenuItem = document.createElement('li');
        adminMenuItem.className = 'nav-item';
        adminMenuItem.innerHTML = `
            <a class="nav-link" href="#" onclick="showSection('admin-management')">
                <i class="fas fa-user-shield me-2"></i>Kelola Admin & Staff
            </a>`;
        sidebar.appendChild(adminMenuItem);
    }
    // Make sure it's visible
    let navItem = null;
    if (existingAdminMenu) {
        navItem = existingAdminMenu.closest('.nav-item');
    } else {
        const found = document.querySelector('a[onclick="showSection(\'admin-management\')"]');
        if (found) navItem = found.closest('.nav-item');
    }
    if (navItem) {
        navItem.style.display = 'block';
        navItem.style.visibility = 'visible';
    }
};

// Debug function to show admin menu
window.debugShowAdminMenu = function() {
    console.log('=== DEBUG ADMIN MENU ===');
    console.log('Current user:', currentUser);
    console.log('User permissions:', userPermissions);
    // Re-run filter and gated show
    filterNavigationByRole();
    showAdminMenu();
};

// Authentication functions
function checkAuthentication() {
    // Check for stored token
    authToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || localStorage.getItem('token');
    // Mirror to window for any consumers that reference window.authToken
    if (authToken) {
        try { window.authToken = authToken; } catch(_) {}
    }
    
    if (!authToken) {
        redirectToLogin();
        return;
    }
    // Verify token and bootstrap app
    verifyToken();
}

// ================= Orders Management: Search/Filter/Sort =================
let allOrdersCache = [];
let ordersToolbarWired = false;

function normalizeOrderStatus(val) {
    const v = String(val || '').toLowerCase().trim();
    if (!v) return '';
    if (v === 'delivered' || v === 'complete' || v === 'completed ') return 'completed';
    if (v === 'in_process' || v === 'in-progress' || v === 'processing ') return 'processing';
    if (v === 'shipping' || v === 'shippings') return 'shipped';
    if (v === 'cancelled' || v === 'canceled ') return 'canceled';
    return v;
}

async function loadOrders(options = {}) {
    try {
        // If useServerFilter is true and a status is selected, query with status param
        let url = '/api/orders';
        if (options.useServerFilter) {
            const sel = document.getElementById('ordersStatusFilter');
            const selected = normalizeOrderStatus(sel ? sel.value : '');
            if (selected) {
                const p = new URLSearchParams({ status: selected });
                url = `/api/orders?${p.toString()}`;
            }
        }
        const res = await apiCall(url, 'GET');
        allOrdersCache = res?.data || [];
        renderOrders();
        wireOrdersToolbar();
    } catch (e) {
        console.error('loadOrders error', e);
    }
}

function wireOrdersToolbar() {
    const search = document.getElementById('ordersSearch');
    const status = document.getElementById('ordersStatusFilter');
    const sortBy = document.getElementById('ordersSortBy');
    const clearBtn = document.getElementById('ordersClearFilters');
    if (!search || !status || !sortBy || !clearBtn) return;
    if (ordersToolbarWired) return; // prevent duplicate handlers

    const debouncedRender = debounce(renderOrders, 200);
    search.addEventListener('input', debouncedRender);
    status.addEventListener('change', renderOrders);
    status.addEventListener('input', renderOrders);
    sortBy.addEventListener('change', renderOrders);
    clearBtn.addEventListener('click', () => {
        search.value = '';
        status.value = '';
        sortBy.value = 'id_desc';
        renderOrders();
    });
    ordersToolbarWired = true;
}

function renderOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    const q = (document.getElementById('ordersSearch')?.value || '').toLowerCase();
    let status = normalizeOrderStatus(document.getElementById('ordersStatusFilter')?.value || '');
    const sortBy = document.getElementById('ordersSortBy')?.value || 'id_desc';

    let rows = [...allOrdersCache];

    if (q) {
        rows = rows.filter(o => {
            const addr = (o.shipping_address || o.address || '').toLowerCase();
            const track = (o.tracking_number || o.tracking || '').toLowerCase();
            return (
                String(o.id).toLowerCase().includes(q) ||
                (o.customer_name || '').toLowerCase().includes(q) ||
                (o.customer_email || '').toLowerCase().includes(q) ||
                addr.includes(q) ||
                track.includes(q)
            );
        });
    }
    if (status) {
        rows = rows.filter(o => normalizeOrderStatus(o.status || o.order_status) === status);
    }

    rows.sort((a, b) => {
        switch (sortBy) {
            case 'id_asc': return (a.id || 0) - (b.id || 0);
            case 'id_desc': return (b.id || 0) - (a.id || 0);
            case 'total_asc': return (Number(a.total_amount || 0) - Number(b.total_amount || 0));
            case 'total_desc': return (Number(b.total_amount || 0) - Number(a.total_amount || 0));
            default: return 0;
        }
    });

    tbody.innerHTML = rows.map(o => renderOrderRow(o)).join('');
    try {
        const sample = (allOrdersCache || []).slice(0, 5).map(x => normalizeOrderStatus(x.status || x.order_status));
        console.debug('[Orders] selected =', status || '(all)', 'total=', allOrdersCache.length, 'shown=', rows.length, 'sample statuses=', sample);
    } catch(_){ }
}

function renderOrderRow(o) {
    const id = o.id ?? '';
    const customer = o.customer_name ?? '';
    const email = o.customer_email ?? '';
    const address = (o.shipping_address ?? o.address) ?? '';
    const total = typeof o.total_amount === 'number' ? formatCurrency(o.total_amount) : (o.total_amount ?? '');
    const status = o.status ?? o.order_status ?? '';
    const date = o.created_at ? formatDate(o.created_at) : (o.date || '');
    const statusOptions = ['pending','processing','shipped','completed','canceled']
        .map(s => `<option value="${s}" ${String(status).toLowerCase()===s?'selected':''}>${capitalize(s)}</option>`)
        .join('');

    return `
        <tr>
            <td>#${id}</td>
            <td>${escapeHtml(customer)}</td>
            <td>${escapeHtml(email)}</td>
            <td>${escapeHtml(address)}</td>
            <td>${escapeHtml(total)}</td>
            <td>
                <select class="form-select form-select-sm" onchange="updateOrderStatus(${id}, this.value)">
                    ${statusOptions}
                </select>
            </td>
            <td>${escapeHtml(date)}</td>
            <td>
                <button class="btn btn-sm btn-outline-success" onclick="printReceipt(${id})"><i class="fas fa-receipt"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteOrder(${id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
}

async function deleteOrder(id) {
    if (!id) return;
    if (!confirm('Yakin ingin menghapus order ini? Tindakan ini tidak dapat dibatalkan.')) return;

    try {
        const result = await apiCall(`/api/orders/${id}`, 'DELETE');
        console.log('Delete order response:', result);

        if (result && result.success) {
            showNotification('Order berhasil dihapus', 'success');
            // Hapus dari cache dan render ulang
            allOrdersCache = (allOrdersCache || []).filter(o => String(o.id) !== String(id));
            renderOrders();
        } else {
            showNotification(result?.message || 'Gagal menghapus order', 'error');
        }
    } catch (e) {
        console.error('deleteOrder error', e);
        showNotification('Terjadi kesalahan saat menghapus order', 'error');
    }
}

function debounce(fn, wait) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

function formatCurrency(n) {
    try { return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR' }).format(Number(n||0)); } catch { return `Rp ${n}`; }
}

function formatDate(d) {
    try { return new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }); } catch { return d; }
}

function capitalize(s){ return (s||'').charAt(0).toUpperCase() + (s||'').slice(1); }

// ===== Best Sellers Page =====
window.loadBestSellers = async function loadBestSellers() {
    try {
        const resp = await apiCall('/api/reports/best-sellers');
        const rows = resp && resp.success ? resp.data : [];
        const tbody = document.getElementById('bestSellersTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Belum ada data</td></tr>';
            return;
        }
        rows.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(item.name || '-')}</td>
                <td>${escapeHtml(item.category || '-')}</td>
                <td>${item.sold_count || 0}</td>
                <td class="currency">${formatCurrency(item.revenue || 0)}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('loadBestSellers error', e);
    }
}

// Global variables for widgets
let allWidgets = [];
let filteredWidgets = [];
let currentView = 'grid'; // 'grid' or 'table'

// ===== Widgets List & CRUD =====
window.loadWidgetsList = async function loadWidgetsList() {
    try {
        console.log('🔄 Loading widgets list...');
        console.log('🔍 Current view:', currentView);
        
        // Show loading state for both views
        showWidgetsLoading();
        
        const response = await apiCall('/api/widgets');
        console.log('📡 Full API response:', JSON.stringify(response, null, 2));

        if (!response || response.success === false) {
            const errorMsg = 'Failed to load widgets: ' + (response?.message || 'Unknown error');
            console.error('❌ API Error:', errorMsg);
            showWidgetsError(errorMsg);
            return;
        }

        // Normalisasi struktur data supaya kompatibel dengan berbagai bentuk response
        let widgets = [];
        if (Array.isArray(response.data)) {
            widgets = response.data;
        } else if (Array.isArray(response.widgets)) {
            widgets = response.widgets;
        } else if (response.data && Array.isArray(response.data.data)) {
            widgets = response.data.data;
        } else {
            console.warn('⚠️ Unexpected widgets response shape, raw response:', response);
        }

        console.log('📊 Raw widgets data (normalized):', widgets);
        console.log('📊 Widgets count:', widgets.length);
        
        // Store widgets globally with detailed logging
        allWidgets = widgets.map((w, index) => {
            console.log(`🔍 Processing widget ${index + 1}:`, w);
            const processedWidget = {
                id: w.id || 0,
                title: w.title || 'Untitled Widget',
                type: w.type || 'banner',
                url: w.url || '',
                file_path: w.file_path || '',
                is_active: Boolean(w.is_active),
                created_at: w.created_at || '',
                updated_at: w.updated_at || ''
            };
            console.log(`✅ Processed widget ${index + 1}:`, processedWidget);
            return processedWidget;
        });
        
        filteredWidgets = [...allWidgets];
        console.log('📋 Filtered widgets:', filteredWidgets);
        
        // Update statistics
        updateWidgetsStats();
        
        // Force render both views to ensure display
        console.log('🎨 Starting render process...');
        
        // Always start with grid view
        currentView = 'grid';
        renderWidgetsGrid();
        
        // Also prepare table view
        renderWidgetsTable();
        
        // Ensure grid view is active
        const gridBtn = document.getElementById('gridViewBtn');
        const tableBtn = document.getElementById('tableViewBtn');
        const gridContainer = document.getElementById('widgetsGrid');
        const tableContainer = document.getElementById('widgetsTableView');
        
        if (gridBtn) gridBtn.classList.add('active');
        if (tableBtn) tableBtn.classList.remove('active');
        if (gridContainer) gridContainer.classList.remove('d-none');
        if (tableContainer) tableContainer.classList.add('d-none');
        
        console.log(`✅ Successfully loaded and rendered ${allWidgets.length} widgets`);
        
    } catch (error) {
        console.error('❌ loadWidgetsList error:', error);
        showWidgetsError('Network error: ' + error.message);
    }
}

// Show loading state
function showWidgetsLoading() {
    const gridContainer = document.getElementById('widgetsGrid');
    const tableBody = document.getElementById('widgetsTableBody');
    
    if (gridContainer) {
        gridContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading widgets...</p>
            </div>
        `;
    }
    
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-spinner fa-spin"></i> Loading widgets...
                </td>
            </tr>
        `;
    }
}

// Show error state
function showWidgetsError(message) {
    const gridContainer = document.getElementById('widgetsGrid');
    const tableBody = document.getElementById('widgetsTableBody');
    
    if (gridContainer) {
        gridContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h5 class="text-danger">Error Loading Widgets</h5>
                <p class="text-muted">${message}</p>
                <button class="btn btn-primary" onclick="loadWidgetsList()">
                    <i class="fas fa-retry me-1"></i>Try Again
                </button>
            </div>
        `;
    }
    
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>${message}
                    <br>
                    <button class="btn btn-sm btn-primary mt-2" onclick="loadWidgetsList()">
                        <i class="fas fa-retry me-1"></i>Try Again
                    </button>
                </td>
            </tr>
        `;
    }
}

// Helper functions
function getWidgetImageSrc(widget) {
    console.log('🖼️ Processing widget image:', widget);
    
    let imageSrc = widget.url || widget.file_path || '';
    console.log('📁 Original image path:', imageSrc);
    
    // Handle different path formats
    if (imageSrc) {
        // If it's already a proper uploads path, keep it
        if (imageSrc.startsWith('/uploads/')) {
            // ok
        }
        // Normalize paths that contain "uploads" somewhere inside (e.g. public/uploads/...)
        else if (imageSrc.includes('uploads')) {
            const idx = imageSrc.indexOf('uploads');
            imageSrc = '/' + imageSrc.substring(idx).replace(/\\/g, '/');
        }
        // Normalize widget directory paths: public/widget/... or storage/.../widget/...
        else if (imageSrc.startsWith('/widget/')) {
            // ok
        } else if (imageSrc.includes('widget')) {
            const idx = imageSrc.indexOf('widget');
            imageSrc = '/' + imageSrc.substring(idx).replace(/\\/g, '/');
        }
        // If it's just a filename or other relative string, default to /uploads/filename
        else if (!imageSrc.startsWith('http')) {
            const filename = imageSrc.replace(/^.*[\\\/]/, '');
            imageSrc = '/uploads/' + filename;
        }
        
        // Always encode spaces for URL compatibility
        if (imageSrc.includes(' ')) {
            imageSrc = imageSrc.replace(/ /g, '%20');
        }
    }
    
    // Fallback handling
    if (!imageSrc || imageSrc === 'null' || imageSrc === 'undefined' || imageSrc === '/uploads/') {
        imageSrc = '/uploads/placeholder.svg';
    }
    
    console.log('🔗 Final image URL:', imageSrc);
    return imageSrc;
}

function getTypeBadge(type) {
    const badges = {
        'banner': '<span class="badge bg-primary">Banner</span>',
        'widget': '<span class="badge bg-info">Widget</span>',
        'promotion': '<span class="badge bg-warning">Promotion</span>'
    };
    return badges[type] || '<span class="badge bg-secondary">Unknown</span>';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString('id-ID');
    } catch (e) {
        return '-';
    }
}

// View switching functions
window.switchToGridView = function() {
    currentView = 'grid';
    document.getElementById('widgetsGrid').classList.remove('d-none');
    document.getElementById('widgetsTableView').classList.add('d-none');
    document.getElementById('gridViewBtn').classList.add('active');
    document.getElementById('tableViewBtn').classList.remove('active');
    renderWidgetsGrid();
}

window.switchToTableView = function() {
    currentView = 'table';
    document.getElementById('widgetsGrid').classList.add('d-none');
    document.getElementById('widgetsTableView').classList.remove('d-none');
    document.getElementById('gridViewBtn').classList.remove('active');
    document.getElementById('tableViewBtn').classList.add('active');
    renderWidgetsTable();
}

// Filter functions
window.filterWidgets = function() {
    const searchTerm = document.getElementById('widgetSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    filteredWidgets = allWidgets.filter(widget => {
        const matchesSearch = !searchTerm || 
            widget.title.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === '' || 
            (statusFilter === '1' && widget.is_active) ||
            (statusFilter === '0' && !widget.is_active);
            
        return matchesSearch && matchesStatus;
    });
    
    // Update badge count
    const badgeEl = document.getElementById('widgetCountBadge');
    if (badgeEl) badgeEl.textContent = filteredWidgets.length;
    
    // Re-render based on current view
    if (currentView === 'grid') {
        renderWidgetsGrid();
    } else {
        renderWidgetsTable();
    }
}

window.clearWidgetFilters = function() {
    document.getElementById('widgetSearch').value = '';
    document.getElementById('statusFilter').value = '';
    filterWidgets();
}

// Upload form functions
window.resetUploadForm = function() {
    const form = document.getElementById('widgetUploadForm');
    if (form) form.reset();
    
    // Reset file preview
    const uploadArea = document.querySelector('.upload-area');
    const uploadContent = document.getElementById('uploadAreaContent');
    const filePreview = document.getElementById('filePreview');
    
    if (uploadContent) uploadContent.classList.remove('d-none');
    if (filePreview) filePreview.classList.add('d-none');
    if (uploadArea) uploadArea.classList.remove('border-success');
}

// File upload area interaction
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.querySelector('.upload-area');
    const fileInput = document.getElementById('widgetFile');
    
    if (uploadArea && fileInput) {
        // Click to select file
        uploadArea.addEventListener('click', function() {
            fileInput.click();
        });
        
        // File selection handler
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                handleFilePreview(file);
            }
        });
        
        // Drag and drop handlers
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.classList.add('border-primary', 'bg-light');
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('border-primary', 'bg-light');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('border-primary', 'bg-light');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFilePreview(files[0]);
            }
        });
    }
});

function handleFilePreview(file) {
    const uploadContent = document.getElementById('uploadAreaContent');
    const filePreview = document.getElementById('filePreview');
    const previewImage = document.getElementById('previewImage');
    const fileName = document.getElementById('fileName');
    const uploadArea = document.querySelector('.upload-area');
    
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (previewImage) previewImage.src = e.target.result;
            if (fileName) fileName.textContent = file.name;
            if (uploadContent) uploadContent.classList.add('d-none');
            if (filePreview) filePreview.classList.remove('d-none');
            if (uploadArea) uploadArea.classList.add('border-success');
        };
        reader.readAsDataURL(file);
    }
}

// Render widgets in grid view
function renderWidgetsGrid() {
    console.log('🎨 Rendering widgets grid...');
    const container = document.getElementById('widgetsGrid');
    
    if (!container) {
        console.error('❌ Grid container not found');
        return;
    }
    
    console.log('📊 Filtered widgets for grid:', filteredWidgets.length);
    
    if (filteredWidgets.length === 0) {
        console.log('📝 No widgets to display, showing empty state');
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-images fa-4x text-muted mb-3"></i>
                <h5 class="text-muted">No Widgets Found</h5>
                <p class="text-muted">Upload your first widget or banner to get started</p>
                <button class="btn btn-primary mt-3" onclick="loadWidgetsList()">
                    <i class="fas fa-sync-alt me-1"></i>Refresh
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    filteredWidgets.forEach((widget, index) => {
        console.log(`🔄 Rendering widget ${index + 1}:`, widget.title);
        
        const imageSrc = getWidgetImageSrc(widget);
        const statusBadge = widget.is_active ? 
            '<span class="badge bg-success">Active</span>' : 
            '<span class="badge bg-secondary">Inactive</span>';
        const typeBadge = getTypeBadge(widget.type);
        
        html += `
            <div class="col-xl-3 col-lg-4 col-md-6 mb-4">
                <div class="card h-100 shadow-sm widget-card" data-widget-id="${widget.id}">
                    <div class="position-relative">
                        <img src="${imageSrc}" class="card-img-top widget-preview" 
                             alt="${escapeHtml(widget.title)}" 
                             style="height: 200px; object-fit: cover; background: #f8f9fa;"
                             onerror="this.src='/uploads/placeholder.svg'; console.log('Image failed to load: ${imageSrc}');">
                        <div class="position-absolute top-0 end-0 p-2">
                            ${statusBadge}
                        </div>
                        <div class="position-absolute top-0 start-0 p-2">
                            ${typeBadge}
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title text-truncate" title="${escapeHtml(widget.title)}">
                            ${escapeHtml(widget.title)}
                        </h6>
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>
                            ${formatDate(widget.created_at)}
                        </small>
                        <div class="mt-2">
                            <small class="text-muted">ID: ${widget.id}</small>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="editWidget(${widget.id}, '${escapeAttr(widget.title)}', ${widget.is_active})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm ${widget.is_active ? 'btn-outline-warning' : 'btn-outline-success'}" onclick="toggleWidget(${widget.id}, ${widget.is_active})" title="${widget.is_active ? 'Deactivate' : 'Activate'}">
                                <i class="fas ${widget.is_active ? 'fa-eye-slash' : 'fa-eye'}"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteWidget(${widget.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    console.log('✅ Grid HTML generated, setting innerHTML...');
    container.innerHTML = html;
    console.log('✅ Grid rendered successfully');
}

// Render widgets in table view
function renderWidgetsTable() {
    const tbody = document.getElementById('widgetsTableBody');
    if (!tbody) return;
    
    if (filteredWidgets.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-images fa-3x text-muted mb-3"></i>
                    <div>No widgets found</div>
                    <small class="text-muted">Upload your first widget or banner</small>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    filteredWidgets.forEach(widget => {
        const imageSrc = getWidgetImageSrc(widget);
        const statusBadge = widget.is_active ? 
            '<span class="badge bg-success">Active</span>' : 
            '<span class="badge bg-secondary">Inactive</span>';
        const typeBadge = getTypeBadge(widget.type);
        
        html += `
            <tr>
                <td>
                    <img src="${imageSrc}" alt="${escapeHtml(widget.title)}" 
                         class="rounded" style="width: 50px; height: 50px; object-fit: cover;"
                         onerror="this.src='/uploads/placeholder.svg'">
                </td>
                <td>
                    <div class="fw-bold">${escapeHtml(widget.title)}</div>
                    <small class="text-muted">ID: ${widget.id}</small>
                </td>
                <td>${typeBadge}</td>
                <td>${statusBadge}</td>
                <td>
                    <small>${formatDate(widget.created_at)}</small>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editWidget(${widget.id}, '${escapeAttr(widget.title)}', ${widget.is_active})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm ${widget.is_active ? 'btn-outline-warning' : 'btn-outline-success'}" onclick="toggleWidget(${widget.id}, ${widget.is_active})" title="${widget.is_active ? 'Deactivate' : 'Activate'}">
                            <i class="fas ${widget.is_active ? 'fa-eye-slash' : 'fa-eye'}"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteWidget(${widget.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Update widgets statistics
function updateWidgetsStats() {
    const total = allWidgets.length;
    const active = allWidgets.filter(w => w.is_active).length;
    const banners = allWidgets.filter(w => w.type === 'banner').length;
    const promotions = allWidgets.filter(w => w.type === 'promotion').length;
    
    // Update stat cards
    const totalEl = document.getElementById('totalWidgetsCount');
    const activeEl = document.getElementById('activeWidgetsCount');
    const bannersEl = document.getElementById('bannersCount');
    const promotionsEl = document.getElementById('promotionsCount');
    const badgeEl = document.getElementById('widgetCountBadge');
    
    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (bannersEl) bannersEl.textContent = banners;
    if (promotionsEl) promotionsEl.textContent = promotions;
    if (badgeEl) badgeEl.textContent = filteredWidgets.length;
}

// Submit widget upload form
async function submitWidgetUpload(event) {
    event.preventDefault();
    
    console.log('📤 Starting widget upload...');
    
    const title = document.getElementById('widgetTitle')?.value.trim();
    const type = document.getElementById('widgetType')?.value;
    const category = document.getElementById('widgetCategory')?.value || '';
    const fileInput = document.getElementById('widgetFile');
    const file = fileInput?.files[0];
    
    console.log('📋 Upload data:', { title, type, category, file: file?.name });
    
    // Validation
    if (!title) {
        showNotification('Please enter a title for the widget', 'warning');
        return;
    }
    
    if (!type) {
        showNotification('Please select a widget type', 'warning');
        return;
    }
    
    if (!file) {
        showNotification('Please select an image file', 'warning');
        return;
    }
    
    // File validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('Invalid file type. Only JPG, PNG, WebP, and GIF are allowed.', 'error');
        return;
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showNotification('File size too large. Maximum size is 5MB.', 'error');
        return;
    }
    
    const btnText = document.getElementById('uploadWidgetBtnText');
    const btnLoading = document.getElementById('uploadWidgetBtnLoading');
    
    try {
        if (btnText && btnLoading) {
            btnText.classList.add('d-none');
            btnLoading.classList.remove('d-none');
        }
        
        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', type);
        if (category) formData.append('category_slug', category);
        formData.append('file', file);
        formData.append('is_active', '1');
        
        // Use shared apiCall helper so auth, base URL, and JSON handling are consistent
        const result = await apiCall('/api/widgets', 'POST', formData);
        console.log('📡 Upload response:', result);

        if (result && result.success) {
            console.log('✅ Widget uploaded successfully');
            showNotification('Widget uploaded successfully!', 'success');
            
            // Reset form
            const form = document.getElementById('widgetUploadForm');
            if (form) form.reset();
            
            // Clear file input specifically
            if (fileInput) fileInput.value = '';
            
            // Reload widgets list
            await loadWidgetsList();
            
            // Close modal if exists
            const modal = bootstrap.Modal.getInstance(document.getElementById('widgetUploadModal'));
            if (modal) modal.hide();
            
        } else {
            console.error('❌ Upload failed:', result);
            showNotification(result.message || 'Failed to upload widget', 'error');
        }
        
    } catch (error) {
        console.error('❌ Upload widget error:', error);
        showNotification('Network error occurred during upload', 'error');
    } finally {
        // Reset button state
        if (btnText && btnLoading) {
            btnText.classList.remove('d-none');
            btnLoading.classList.add('d-none');
        }
    }
}

window.openWidgetUploadModal = function openWidgetUploadModal() {
    const id = 'widgetUploadModal';
    let modalEl = document.getElementById(id);
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.className = 'modal fade';
        modalEl.id = id;
        modalEl.tabIndex = -1;
        modalEl.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="fas fa-image me-2"></i>Upload Banner / Widget</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Judul</label>
                        <input type="text" class="form-control" id="widgetTitle" placeholder="Judul">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Tipe</label>
                        <select class="form-control" id="widgetType">
                            <option value="banner">Banner</option>
                            <option value="widget">Widget</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">File Gambar</label>
                        <input type="file" class="form-control" id="widgetFile" accept="image/*">
                        <small class="text-muted">Maks 5MB. JPG/PNG/WebP/GIF.</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                    <button class="btn btn-primary" onclick="saveWidget()">Upload</button>
                </div>
            </div>
        </div>`;
        document.body.appendChild(modalEl);
    }
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    // Ensure file input listener is attached (modal content may be injected later)
    try {
        const imageInput = document.getElementById('productImages');
        if (imageInput) {
            imageInput.removeEventListener('change', handleImageUpload);
            imageInput.addEventListener('change', handleImageUpload);
        }
    } catch (_) {}
}

window.saveWidget = async function saveWidget() {
    const title = document.getElementById('widgetTitle').value.trim() || 'Banner';
    const type = document.getElementById('widgetType').value || 'banner';
    const fileInput = document.getElementById('widgetFile');
    if (!fileInput.files || fileInput.files.length === 0) {
        showNotification('Pilih file gambar terlebih dahulu', 'warning');
        return;
    }
    const file = fileInput.files[0];
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Ukuran file maksimal 5MB', 'error');
        return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('type', type);
    const headers = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch('/api/widgets', { method: 'POST', headers, body: formData });
    const result = await res.json();
    if (res.ok && result.success) {
        showNotification('Widget berhasil diunggah', 'success');
        loadWidgetsList();
        const modalEl = document.getElementById('widgetUploadModal');
        if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
    } else {
        showNotification(result.message || 'Gagal mengunggah widget', 'error');
    }
}

window.editWidget = async function editWidget(id, currentTitle, isActive) {
    console.log('✏️ Edit widget:', { id, currentTitle, isActive });
    
    const newTitle = prompt('Enter new title for the widget:', currentTitle || '');
    if (newTitle === null || newTitle.trim() === '') {
        return; // User cancelled or entered empty title
    }
    
    try {
        console.log('📤 Updating widget title...');
        const resp = await apiCall(`/api/widgets/${id}`, 'PUT', { 
            title: newTitle.trim() 
        });
        
        if (resp && resp.success) {
            console.log('✅ Widget updated successfully');
            await loadWidgetsList();
            showNotification('Widget title updated successfully!', 'success');
        } else {
            console.error('❌ Update failed:', resp);
            showNotification(resp?.message || 'Failed to update widget', 'error');
        }
    } catch (error) {
        console.error('❌ Edit widget error:', error);
        showNotification('Network error occurred while updating', 'error');
    }
}

window.toggleWidget = async function toggleWidget(id, isActive) {
    console.log('🔄 Toggle widget status:', { id, currentStatus: isActive });
    
    const newStatus = isActive ? 0 : 1;
    const statusText = newStatus ? 'active' : 'inactive';
    
    try {
        console.log('📤 Updating widget status...');
        const resp = await apiCall(`/api/widgets/${id}`, 'PUT', { 
            is_active: newStatus 
        });
        
        if (resp && resp.success) {
            console.log('✅ Widget status updated successfully');
            await loadWidgetsList();
            showNotification(`Widget is now ${statusText}`, 'success');
        } else {
            console.error('❌ Status update failed:', resp);
            showNotification(resp?.message || 'Failed to update widget status', 'error');
        }
    } catch (error) {
        console.error('❌ Toggle widget error:', error);
        showNotification('Network error occurred while updating status', 'error');
    }
}

window.deleteWidget = async function deleteWidget(id) {
    console.log('🗑️ Delete widget:', id);
    
    if (!confirm('Are you sure you want to delete this widget? This action cannot be undone.')) {
        return;
    }
    
    try {
        console.log('📤 Deleting widget via API...');

        // Gunakan apiCall agar header Authorization, base URL, dan fallback /index.php konsisten
        const result = await apiCall(`/api/widgets/${id}`, 'DELETE');
        console.log('📡 Delete response:', result);

        if (result && result.success) {
            console.log('✅ Widget deleted successfully');
            showNotification('Widget deleted successfully!', 'success');
            // Reload list supaya tabel dan grid langsung ter-update
            await loadWidgetsList();
        } else {
            console.error('❌ Delete failed:', result);
            showNotification(result?.message || 'Failed to delete widget', 'error');
        }
    } catch (error) {
        console.error('❌ Delete widget error:', error);
        showNotification('Network error occurred while deleting', 'error');
    }
}

// Helpers for safe text
window.escapeHtml = function escapeHtml(str){
    return (str||'').toString().replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
}
window.escapeAttr = function escapeAttr(str){
    return (str||'').toString().replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
}

// ===== WIDGETS MANAGEMENT (Super Admin) =====
async function loadWidgets() {
    try {
        const img = document.getElementById('currentBanner');
        const placeholder = document.getElementById('noBannerPlaceholder');
        if (img) img.style.display = 'none';
        if (placeholder) placeholder.style.display = 'none';

        const response = await apiCall('/api/widgets/banner');
        if (response && response.success) {
            if (response.banner) {
                if (img) {
                    img.src = response.banner;
                    img.onload = () => { img.style.display = 'block'; };
                }
            } else if (placeholder) {
                placeholder.style.display = 'block';
            }
        } else if (placeholder) {
            placeholder.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading widgets:', error);
        showNotification('Gagal memuat banner', 'error');
    }
}

async function uploadBanner() {
    const fileInput = document.getElementById('bannerFile');
    const btnText = document.getElementById('uploadBannerText');
    const btnLoading = document.getElementById('uploadBannerLoading');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showNotification('Pilih file banner terlebih dahulu', 'warning');
        return;
    }

    const file = fileInput.files[0];
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Ukuran file maksimal 5MB', 'error');
        return;
    }

    try {
        if (btnText && btnLoading) {
            btnText.classList.add('d-none');
            btnLoading.classList.remove('d-none');
        }

        const formData = new FormData();
        formData.append('banner', file);

        const headers = {};
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        const res = await fetch('/api/widgets/banner', {
            method: 'POST',
            headers,
            body: formData
        });
        const result = await res.json();
        if (res.ok && result.success) {
            showNotification('Banner berhasil diunggah', 'success');
            // Refresh preview
            loadWidgets();
            // Clear input
            fileInput.value = '';
        } else {
            showNotification(result.message || 'Gagal mengunggah banner', 'error');
        }
    } catch (error) {
        console.error('Upload banner error:', error);
        showNotification('Terjadi kesalahan saat mengunggah banner', 'error');
    } finally {
        if (btnText && btnLoading) {
            btnText.classList.remove('d-none');
            btnLoading.classList.add('d-none');
        }
    }
}

async function verifyToken() {
    try {
        const headers = { 'Authorization': `Bearer ${authToken}` };
        let response = await fetch('/api/auth/me', { headers });
        let isJson = false;
        try { const ct = response.headers.get('content-type') || ''; isJson = ct.includes('application/json'); } catch(_) { isJson = false; }
        let result = isJson ? (await response.json().catch(() => null)) : null;

        // Fallback for dev servers that don't route /api/* to Laravel
        if (!(response.ok && result) && !window.location.pathname.startsWith('/index.php')) {
            const alt = '/index.php/api/auth/me';
            const resp2 = await fetch(alt, { headers });
            const ct2 = resp2.headers.get('content-type') || '';
            const json2 = ct2.includes('application/json') ? (await resp2.json().catch(() => null)) : null;
            if (resp2.ok && json2) {
                response = resp2;
                result = json2;
            }
        }

        if (response.ok && result) {
            currentUser = result.user;
            // Normalize and fallback: ensure we always have permissions
            const apiPerms = Array.isArray(result.permissions) ? result.permissions : [];
            const rawRole = (currentUser?.role_name || currentUser?.role || currentUser?.role_display_name || '').toString();
            let roleKey = rawRole.trim().toLowerCase();
            // Map by numeric role_id if role name is missing
            if (!roleKey && (currentUser?.role_id === 2 || currentUser?.role_id === '2')) roleKey = 'manager';
            if (!roleKey && (currentUser?.role_id === 3 || currentUser?.role_id === '3')) roleKey = 'staff';
            userPermissions = apiPerms.length ? apiPerms : (rolesPermissions[roleKey] || []);
            // Final safeguards for odd role naming
            if (!Array.isArray(userPermissions) || userPermissions.length === 0) {
                const rl = roleKey;
                if (rl && rolesPermissions[rl]) {
                    userPermissions = rolesPermissions[rl];
                } else if (rl.includes('manager')) {
                    userPermissions = rolesPermissions['manager'];
                } else if (rl.includes('staff') || rl.includes('staf')) {
                    userPermissions = rolesPermissions['staff'];
                }
            }
            // Guarantee dashboard access for authenticated users
            if (Array.isArray(userPermissions) && !userPermissions.includes('dashboard')) {
                userPermissions = ['dashboard', ...userPermissions];
            }
            updateUserInfo();
            filterNavigationByRole();
            loadDashboardData();
            showSection('dashboard');
        } else {
            clearAuthToken();
            redirectToLogin();
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        clearAuthToken();
        redirectToLogin();
    }
}

function updateUserInfo() {
    if (currentUser) {
        // Update user display in navbar
        const userDisplay = document.querySelector('#navbarDropdown');
        if (userDisplay) {
            const roleDisplay = currentUser.role_display_name || currentUser.role_name || currentUser.role || '';
            userDisplay.innerHTML = `<i class="fas fa-user-circle me-1"></i>${currentUser.name} (${roleDisplay})`;
        }
    }
}

// Filter navigation based on user role
function filterNavigationByRole() {
    if (!currentUser) {
        console.log('No current user, skipping navigation filter');
        return;
    }
    
    // Get permissions from user or fallback to role-based permissions
    if (!Array.isArray(userPermissions) || userPermissions.length === 0) {
        const rawRole = (currentUser?.role_name || currentUser?.role || currentUser?.role_display_name || '').toString();
        let roleKey = rawRole.trim().toLowerCase();
        if (!roleKey && (currentUser?.role_id === 2 || currentUser?.role_id === '2')) roleKey = 'manager';
        if (!roleKey && (currentUser?.role_id === 3 || currentUser?.role_id === '3')) roleKey = 'staff';
        let perms = rolesPermissions[roleKey] || [];
        if (!perms.length) {
            const rl = roleKey;
            if (rl.includes('manager')) perms = rolesPermissions['manager'];
            else if (rl.includes('staff') || rl.includes('staf')) perms = rolesPermissions['staff'];
        }
        userPermissions = perms;
        if (!userPermissions.includes('dashboard')) {
            userPermissions = ['dashboard', ...userPermissions];
        }
        console.log(`Using fallback permissions for role: ${roleKey}`, userPermissions);
    }
    
    console.log('Current user:', currentUser);
    console.log('User permissions:', userPermissions);
    
    const navItems = document.querySelectorAll('.sidebar .nav-item');
    console.log(`Found ${navItems.length} navigation items`);
    
    navItems.forEach((navItem, index) => {
        const link = navItem.querySelector('a[onclick*="showSection"]');
        if (link) {
            const onclickAttr = link.getAttribute('onclick');
            const sectionMatch = onclickAttr.match(/showSection\('([^']+)'\)/);
            
            if (sectionMatch) {
                const sectionName = sectionMatch[1];
                const hasPermission = userPermissions.includes(sectionName);
                
                if (hasPermission) {
                    navItem.style.display = 'block';
                    navItem.style.visibility = 'visible';
                    console.log(`✅ Showing section: ${sectionName}`);
                } else {
                    navItem.style.display = 'none';
                    console.log(`❌ Hiding section: ${sectionName}`);
                }
            }
        } else {
            console.log(`Nav item ${index} has no showSection link`);
        }
    });
    
    // Force show admin-management for super_admin specifically
    if (currentUser.role_name === 'super_admin' || userPermissions.includes('admin-management')) {
        const adminManagementLink = document.querySelector('a[onclick="showSection(\'admin-management\')"]');
        if (adminManagementLink) {
            const navItem = adminManagementLink.closest('.nav-item');
            if (navItem) {
                navItem.style.display = 'block';
                navItem.style.visibility = 'visible';
                console.log('🔧 Force showing admin-management for super admin');
            }
        }
    }
}

// Check if user has access to a section
function hasAccessToSection(sectionName) {
    if (!currentUser) return false;
    // Always allow dashboard for authenticated users
    if (sectionName === 'dashboard') return true;
    // If permissions not ready, derive from role as a temporary fallback
    if (!Array.isArray(userPermissions) || userPermissions.length === 0) {
        const rawRole = (currentUser?.role_name || currentUser?.role || currentUser?.role_display_name || '').toString();
        const roleKey = rawRole.trim().toLowerCase();
        const temp = rolesPermissions[roleKey] || (roleKey.includes('manager') ? rolesPermissions['manager'] : (roleKey.includes('staff') || roleKey.includes('staf')) ? rolesPermissions['staff'] : []);
        return Array.isArray(temp) && temp.includes(sectionName);
    }
    return userPermissions.includes(sectionName);
}

// Show access denied modal
function showAccessDenied(sectionName) {
    const modal = document.getElementById('accessDeniedModal');
    if (modal) {
        const sectionNameSpan = document.getElementById('deniedSectionName');
        const userRoleSpan = document.getElementById('currentUserRole');
        
        if (sectionNameSpan) sectionNameSpan.textContent = sectionName;
        if (userRoleSpan) userRoleSpan.textContent = (currentUser.role_display_name || currentUser.role_name || (currentUser.role_id === 2 ? 'Manager' : currentUser.role_id === 3 ? 'Staff' : ''));
        
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    } else {
        alert(`Akses ditolak! Anda tidak memiliki izin untuk mengakses halaman ${sectionName}. Role Anda: ${currentUser.role_display_name}`);
    }
}

function clearAuthToken() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('token');
    sessionStorage.removeItem('adminToken');
    authToken = null;
    currentUser = null;
}

function redirectToLogin() {
    console.log('🔄 Redirecting to login...');
    // Clear any existing tokens to prevent loops
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken');
    sessionStorage.clear();
    window.location.href = '/login.html';
}

async function logout() {
    try {
        if (authToken) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        clearAuthToken();
        redirectToLogin();
    }
}

// Navigation functions
function showSection(sectionName) {
    // Ensure widgets section is not nested inside dashboard to keep navigation correct
    try {
        const main = document.querySelector('main');
        const widgets = document.getElementById('widgets');
        const dashboard = document.getElementById('dashboard');
        if (main && widgets && dashboard && dashboard.contains(widgets)) {
            // move widgets to be a sibling after dashboard
            if (dashboard.nextSibling) {
                main.insertBefore(widgets, dashboard.nextSibling);
            } else {
                main.appendChild(widgets);
            }
        }
        // Hide widgets-only statistics row (if exists) without touching dashboard
        if (widgets) {
            const statsIds = ['totalWidgetsCount','activeWidgetsCount','bannersCount','promotionsCount'];
            for (const sid of statsIds) {
                const el = widgets.querySelector(`#${sid}`);
                if (el) {
                    const row = el.closest('.row');
                    if (row && row.parentElement) row.parentElement.removeChild(row);
                    break;
                }
            }
        }
    } catch (e) { /* ignore */ }
    // Clean up any stuck overlays/backdrops that could block clicks
    try {
        document.body.classList.remove('modal-open');
        document.querySelectorAll('.modal-backdrop, .swal2-container, .swal2-shown').forEach(el => {
            if (el && el.parentNode) el.parentNode.removeChild(el);
        });
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    } catch (e) { /* ignore */ }
    // Check if user has access to this section
    if (!hasAccessToSection(sectionName)) {
        showAccessDenied(sectionName);
        return;
    }

    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Remove active class from all nav links
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.style.display = 'block';
        currentSection = sectionName;
        try { window.currentSection = sectionName; } catch(_) {}

        // Explicitly reveal inner content for best-sellers and scroll into view
        if (sectionName === 'best-sellers') {
            try {
                const table = document.getElementById('bestSellersTable');
                if (table) table.classList.remove('d-none');
                const wrap = table ? table.closest('.table-responsive') : null;
                if (wrap) wrap.style.display = 'block';
                // small delay to allow DOM paint before scroll
                setTimeout(() => { try { targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch(_) {} }, 50);
            } catch(_) {}
        }

        // Note: Do NOT force-show ancestor .content-section to prevent leaking dashboard content
    }

    // Add active class to current nav link
    const currentNavLink = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
    if (currentNavLink) {
        currentNavLink.classList.add('active');
    }

    // Load section-specific data
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'products':
            loadProducts();
            // extra render tick in case fetch already populated products
            setTimeout(() => {
                try { updateProductsTable(); } catch(e) { console.warn('updateProductsTable deferred error', e); }
            }, 150);
            break;
        case 'best-sellers':
            try {
                const section = document.getElementById('best-sellers');
                // If best-sellers is mistakenly inside dashboard, move it to be a sibling under main
                try {
                    const main = document.querySelector('main');
                    const dashboard = document.getElementById('dashboard');
                    if (main && section && dashboard && dashboard.contains(section)) {
                        if (dashboard.nextSibling) {
                            main.insertBefore(section, dashboard.nextSibling);
                        } else {
                            main.appendChild(section);
                        }
                    }
                } catch(_) {}
                if (section) {
                    section.style.display = 'block';
                    section.style.visibility = 'visible';
                }
                const table = document.getElementById('bestSellersTable');
                if (table) {
                    table.classList.remove('d-none');
                    table.style.visibility = 'visible';
                }
                const wrap = table ? table.closest('.table-responsive') : null;
                if (wrap) {
                    wrap.style.display = 'block';
                    wrap.style.visibility = 'visible';
                }
                const card = section ? section.querySelector('.card') : null;
                if (card) { card.style.display = 'block'; card.style.visibility = 'visible'; }
                const cardBody = section ? section.querySelector('.card-body') : null;
                if (cardBody) { cardBody.style.display = 'block'; cardBody.style.visibility = 'visible'; }
            } catch(_) {}
            try { if (window.loadBestSellersProducts) window.loadBestSellersProducts(); } catch(e) { console.warn('best-sellers load error', e); }
            setTimeout(() => {
                try { if (window.loadBestSellersProducts) window.loadBestSellersProducts(); } catch(e) {}
            }, 150);
            break;
        case 'orders':
            loadOrders();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'analytics':
            console.log('Loading analytics section...');
            // Force show analytics section immediately
            document.getElementById('analytics').style.display = 'block';
            // Load analytics data with a small delay to ensure DOM is ready
            setTimeout(() => {
                loadAnalyticsData();
                initializeMonthlyAnalytics();
            }, 200);
            break;
        case 'vouchers':
            loadVouchers();
            break;
        case 'flash-sales':
            loadFlashSales();
            break;
        case 'categories':
            loadCategories();
            break;
        case 'free-shipping':
            loadFreeShipping();
            break;
        case 'product-vouchers':
            loadProductVouchers();
            break;
        case 'reviews':
            loadReviews();
            break;
        case 'widgets':
            console.log('🎯 Loading widgets section...');
            console.log('🔍 Checking widgets elements...');
            
            // Check if widgets elements exist
            const widgetsGrid = document.getElementById('widgetsGrid');
            const widgetsStats = document.getElementById('totalWidgetsCount');
            
            console.log('Grid container:', widgetsGrid ? 'Found' : 'Missing');
            console.log('Stats elements:', widgetsStats ? 'Found' : 'Missing');
            
            // Initialize widgets section with retry mechanism
            let retryCount = 0;
            const maxRetries = 3;
            
            const tryLoadWidgets = async () => {
                try {
                    if (typeof loadWidgetsList === 'function') {
                        console.log(`🔄 Attempt ${retryCount + 1} to load widgets...`);
                        await loadWidgetsList();
                        console.log('✅ Widgets loaded successfully');
                    } else {
                        console.error('❌ loadWidgetsList function not found');
                        
                        // Fallback: try to render manually if we have data
                        if (window.allWidgets && window.allWidgets.length > 0) {
                            console.log('🔄 Trying manual render with existing data...');
                            if (typeof renderWidgetsGrid === 'function') {
                                renderWidgetsGrid();
                            }
                        }
                    }
                } catch (error) {
                    console.error('❌ Error loading widgets:', error);
                    retryCount++;
                    
                    if (retryCount < maxRetries) {
                        console.log(`🔄 Retrying in 1 second... (${retryCount}/${maxRetries})`);
                        setTimeout(tryLoadWidgets, 1000);
                    } else {
                        console.error('❌ Max retries reached, widgets loading failed');
                        
                        // Show error in grid
                        if (widgetsGrid) {
                            widgetsGrid.innerHTML = `
                                <div class="col-12 text-center py-5">
                                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                                    <h5 class="text-danger">Failed to Load Widgets</h5>
                                    <p class="text-muted">Please check console for errors</p>
                                    <button class="btn btn-primary" onclick="showSection('widgets')">
                                        <i class="fas fa-retry me-1"></i>Try Again
                                    </button>
                                </div>
                            `;
                        }
                    }
                }
            };
            
            // Start loading widgets
            tryLoadWidgets();
            break;
        case 'best-sellers':
            loadBestSellers();
            break;
        case 'admin-management':
            loadAdminUsers();
            break;
        case 'settings':
            // Load settings if needed
            break;
    }
}

// ===== Admin Management (Super Admin only) =====
async function loadAdminUsers() {
    try {
        const tbody = document.getElementById('adminUsersTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Memuat...</td></tr>';
        
        // Get search parameters
        const q = document.getElementById('userSearchQ')?.value.trim() || '';
        const role_id = document.getElementById('userSearchRole')?.value || '';
        const status = document.getElementById('userSearchStatus')?.value || '';
        
        // Build query params
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (role_id) params.append('role_id', role_id);
        if (status !== '') params.append('status', status);
        
        const url = '/api/admin/users' + (params.toString() ? '?' + params.toString() : '');
        const resp = await apiCall(url);
        
        if (!resp || resp.success === false) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Gagal memuat data</td></tr>';
            return;
        }
        const rows = Array.isArray(resp.data) ? resp.data : [];
        // cache rows for viewReview
        window._reviewsCache = rows;
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Belum ada data pengguna</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        rows.forEach(u => {
            const tr = document.createElement('tr');
            const active = (u.is_active ?? 1) ? 1 : 0;
            tr.innerHTML = `
                <td>${escapeHtml(u.name)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td><span class="badge bg-secondary text-uppercase">${escapeHtml(u.role_display_name || u.role_name)}</span></td>
                <td>${active ? '<span class="badge status-active">Active</span>' : '<span class="badge status-inactive">Inactive</span>'}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary me-1" title="Edit" onclick="openEditUserModal(${u.id}, '${escapeAttr(u.name)}', '${escapeAttr(u.email)}', ${u.role_id}, ${active})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm ${active ? 'btn-outline-warning' : 'btn-outline-success'} me-1" title="${active ? 'Disable' : 'Enable'}" onclick="toggleUserStatus(${u.id}, ${active ? 0 : 1})">
                        <i class="fas ${active ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="deleteUser(${u.id}, '${escapeAttr(u.name)}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('loadAdminUsers error', e);
        showNotification('Gagal memuat pengguna', 'error');
    }
}

async function submitCreateAdmin(event) {
    event.preventDefault();
    const name = document.getElementById('createAdminName')?.value.trim();
    const email = document.getElementById('createAdminEmail')?.value.trim();
    const password = document.getElementById('createAdminPassword')?.value;
    const role_id = parseInt(document.getElementById('createAdminRole')?.value || '0', 10);
    if (!name || !email || !password || !role_id) {
        showNotification('Semua field harus diisi', 'warning');
        return;
    }
    const btnText = document.getElementById('createAdminBtnText');
    const btnLoading = document.getElementById('createAdminBtnLoading');
    try {
        if (btnText && btnLoading) { btnText.classList.add('d-none'); btnLoading.classList.remove('d-none'); }
        const resp = await apiCall('/api/admin/users', 'POST', { name, email, password, role_id });
        if (resp && resp.success) {
            showNotification('Pengguna berhasil dibuat', 'success');
            // reset form
            document.getElementById('createAdminForm')?.reset();
            loadAdminUsers();
        } else {
            showNotification(resp?.message || 'Gagal membuat pengguna', 'error');
        }
    } catch (e) {
        console.error('submitCreateAdmin error', e);
        showNotification('Terjadi kesalahan', 'error');
    } finally {
        if (btnText && btnLoading) { btnText.classList.remove('d-none'); btnLoading.classList.add('d-none'); }
    }
}

async function toggleUserStatus(id, is_active) {
    try {
        const resp = await apiCall(`/api/admin/users/${id}/status`, 'PATCH', { is_active });
        if (resp && resp.success) {
            showNotification(resp.message || 'Status diperbarui', 'success');
            loadAdminUsers();
        } else {
            showNotification(resp?.message || 'Gagal mengubah status', 'error');
        }
    } catch (e) {
        console.error('toggleUserStatus error', e);
        showNotification('Terjadi kesalahan', 'error');
    }
}

function openEditUserModal(id, name, email, role_id, is_active) {
    const idEl = document.getElementById('editUserId');
    const nameEl = document.getElementById('editUserName');
    const emailEl = document.getElementById('editUserEmail');
    const roleEl = document.getElementById('editUserRole');
    const passEl = document.getElementById('editUserPassword');
    
    if (!idEl || !nameEl || !emailEl || !roleEl) {
        console.error('Edit user modal elements not found');
        return;
    }
    
    idEl.value = id;
    nameEl.value = name || '';
    emailEl.value = email || '';
    roleEl.value = String(role_id || '3');
    if (passEl) passEl.value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    modal.show();
}

async function submitEditUser(event) {
    event.preventDefault();
    const id = parseInt(document.getElementById('editUserId')?.value || '0', 10);
    const name = document.getElementById('editUserName')?.value.trim();
    const email = document.getElementById('editUserEmail')?.value.trim();
    const role_id = parseInt(document.getElementById('editUserRole')?.value || '0', 10);
    const password = document.getElementById('editUserPassword')?.value;
    
    if (!id || !name || !email || !role_id) {
        showNotification('Semua field wajib diisi', 'warning');
        return;
    }
    
    const btnText = document.getElementById('editUserBtnText');
    const btnLoading = document.getElementById('editUserBtnLoading');
    
    try {
        if (btnText && btnLoading) { 
            btnText.classList.add('d-none'); 
            btnLoading.classList.remove('d-none'); 
        }
        
        const payload = { name, email, role_id };
        if (password && password.length >= 6) payload.password = password;
        
        const resp = await apiCall(`/api/admin/users/${id}`, 'PUT', payload);
        if (resp && resp.success) {
            showNotification('Pengguna diperbarui', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editUserModal'))?.hide();
            loadAdminUsers();
        } else {
            showNotification(resp?.message || 'Gagal memperbarui pengguna', 'error');
        }
    } catch (e) {
        console.error('submitEditUser error', e);
        showNotification('Terjadi kesalahan', 'error');
    } finally {
        if (btnText && btnLoading) { 
            btnText.classList.remove('d-none'); 
            btnLoading.classList.add('d-none'); 
        }
    }
}

async function deleteUser(id, name) {
    if (!confirm(`Apakah Anda yakin ingin menghapus pengguna "${name}"?\n\nTindakan ini tidak dapat dibatalkan.`)) {
        return;
    }
    try {
        const resp = await apiCall(`/api/admin/users/${id}`, 'DELETE');
        if (resp && resp.success) {
            showNotification(resp.message || 'Pengguna dihapus', 'success');
            loadAdminUsers();
        } else {
            showNotification(resp?.message || 'Gagal menghapus pengguna', 'error');
        }
    } catch (e) {
        console.error('deleteUser error', e);
        showNotification('Terjadi kesalahan', 'error');
    }
}

// ===== Reviews: realtime loader with lightweight polling =====
let _reviewsPollTimer = null;
window._reviewsCache = [];

function startReviewsLive(intervalMs = 5000) {
    stopReviewsLive();
    // initial load immediately
    loadReviews();
    _reviewsPollTimer = setInterval(loadReviews, Math.max(2000, intervalMs));
}

function stopReviewsLive() {
    if (_reviewsPollTimer) {
        clearInterval(_reviewsPollTimer);
        _reviewsPollTimer = null;
    }
}

// Simple reviews loader
async function loadReviews() {
    console.log('Loading reviews...');
    const tbody = document.getElementById('reviewsTableBody');
    if (!tbody) return;
    // show spinner
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </td>
        </tr>`;

    try {
        const resp = await apiCall('/api/reviews', 'GET');
        if (!resp || resp.success !== true) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Gagal memuat ulasan</td></tr>`;
            return;
        }
        const rows = Array.isArray(resp.data) ? resp.data : [];
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Belum ada ulasan</td></tr>`;
            return;
        }
        // Only re-render if data changed to prevent flicker
        const prevKey = JSON.stringify(window._reviewsCache || []);
        const nextKey = JSON.stringify(rows);
        if (prevKey === nextKey) return;
        window._reviewsCache = rows;

        const fmtDate = (v) => {
            try { return new Date(v).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }); } catch (_) { return v || '-'; }
        };
        const stars = (n) => {
            const r = Math.max(0, Math.min(5, parseInt(n || 0, 10)));
            return '<span>' + '★'.repeat(r) + '☆'.repeat(5 - r) + `</span> <small class="text-muted">(${r})</small>`;
        };
        const statusBadge = (s) => `<span class="badge bg-success">${s || 'published'}</span>`;

        tbody.innerHTML = rows.map(r => `
            <tr>
                <td>${r.customer || '-'}</td>
                <td>
                    <div class="d-flex align-items-center" style="gap:8px;">
                        ${r.productImage ? `<img src="${r.productImage}" alt="img" style="width:28px;height:28px;object-fit:cover;border-radius:4px;" onerror="this.replaceWith(document.createTextNode('📦'))">` : ''}
                        <span>${(r.product || r.productId || '-')}</span>
                    </div>
                </td>
                <td>${stars(r.rating)}</td>
                <td>${(r.review || '').toString().replace(/</g,'&lt;')}</td>
                <td>${fmtDate(r.date)}</td>
                <td>${statusBadge(r.status)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger" title="Hapus" onclick="deleteReview(${r.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('loadReviews error', e);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Terjadi kesalahan saat memuat</td></tr>`;
    }
}

// Show review details in a modal
window.viewReview = function(id) {
    try {
        const rows = Array.isArray(window._reviewsCache) ? window._reviewsCache : [];
        const r = rows.find(x => parseInt(x.id, 10) === parseInt(id, 10));
        if (!r) return;
        const modal = document.getElementById('reviewDetailModal');
        if (!modal) return;
        const stars = (n) => {
            const val = Math.max(0, Math.min(5, parseInt(n || 0, 10)));
            return '★'.repeat(val) + '☆'.repeat(5 - val) + ` (${val})`;
        };
        const fmtDate = (v) => {
            try { return new Date(v).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }); } catch (_) { return v || '-'; }
        };
        modal.querySelector('.modal-title').textContent = `Review #${r.id}`;
        modal.querySelector('[data-field="customer"]').textContent = r.customer || '-';
        modal.querySelector('[data-field="product"]').textContent = (r.product || r.productId || '-');
        modal.querySelector('[data-field="rating"]').textContent = stars(r.rating);
        modal.querySelector('[data-field="review"]').textContent = (r.review || '-');
        modal.querySelector('[data-field="date"]').textContent = fmtDate(r.date);
        modal.querySelector('[data-field="status"]').textContent = r.status || 'published';
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    } catch (e) { console.error('viewReview error', e); }
}

// Delete a review
window.deleteReview = async function(id) {
    if (!confirm('Hapus ulasan ini?')) return;
    try {
        // Use action-based endpoint to ensure JSON response
        const resp = await apiCall(`/api/reviews/${id}`, 'POST', { action: 'delete' });
        if (resp && resp.success) {
            showNotification('Ulasan dihapus', 'success');
            await loadReviews();
        } else {
            showNotification((resp && resp.message) ? resp.message : 'Gagal menghapus ulasan', 'error');
        }
    } catch (e) {
        console.error('deleteReview error', e);
        showNotification('Terjadi kesalahan', 'error');
    }
}

// API functions
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {}
        };

        // Add authentication token to all API calls
        if (authToken) {
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }

        if (data) {
            // If sending FormData, let the browser set Content-Type (multipart/form-data)
            if (data instanceof FormData) {
                options.body = data;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }
        }

        let response = await fetch(endpoint, options);

        // Handle authentication errors with one retry using rehydrated token
        if (response.status === 401 || response.status === 403) {
            // Try to rehydrate token from storage
            const stored = (localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || localStorage.getItem('token'));
            if (stored && stored !== authToken) {
                authToken = stored;
                options.headers['Authorization'] = `Bearer ${authToken}`;
                // Retry original endpoint
                response = await fetch(endpoint, options);
            }
            // If still unauthorized and endpoint is /api/*, try /index.php/api/*
            if ((response.status === 401 || response.status === 403) && typeof endpoint === 'string' && endpoint.startsWith('/api/') && !endpoint.startsWith('/index.php')) {
                const alt = '/index.php' + endpoint;
                response = await fetch(alt, options);
            }
            if (response.status === 401 || response.status === 403) {
                clearAuthToken();
                redirectToLogin();
                return null;
            }
        }
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        // Fallback: some dev servers may not route /api/* correctly.
        // Retry via /index.php prefix to force Laravel front controller.
        if (typeof endpoint === 'string' && endpoint.startsWith('/api/') && !endpoint.startsWith('/index.php')) {
            const alt = '/index.php' + endpoint;
            const resp2 = await fetch(alt, options);
            const ct2 = resp2.headers.get('content-type');
            if (ct2 && ct2.includes('application/json')) {
                return await resp2.json();
            }
            // If still not JSON but request succeeded and it's not a GET, consider success
            if (resp2.ok && String(options.method || 'GET').toUpperCase() !== 'GET') {
                return { success: true };
            }
            try { console.error('Non-JSON response (fallback):', await resp2.text()); } catch (_) {}
            return { success: false, message: 'Invalid response format' };
        }

        // If not JSON: if request succeeded and it's not a GET, consider success (some servers return empty body)
        if (response.ok && String(options.method || 'GET').toUpperCase() !== 'GET') {
            return { success: true };
        }
        // Otherwise return text for debugging
        const text = await response.text();
        console.error('Non-JSON response:', text);
        return { success: false, message: 'Invalid response format' };
    } catch (error) {
        console.error('API call failed:', error);
        showNotification('Error connecting to server', 'error');
        return null;
    }
}

// Dashboard functions
async function loadDashboardData() {
    try {
        // Load enhanced dashboard data
        enhancedDashboardData = await apiCall('/api/dashboard/enhanced');
        if (enhancedDashboardData) {
            updateEnhancedDashboard();
        }

        // Load recent orders
        const ordersResp = await apiCall('/api/orders');
        orders = Array.isArray(ordersResp) ? ordersResp : (ordersResp && Array.isArray(ordersResp.data) ? ordersResp.data : []);
        updateRecentOrders();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Refresh dashboard function
async function refreshDashboard() {
    showNotification('Refreshing dashboard...', 'info', 2000);
    await loadDashboardData();
    showNotification('Dashboard refreshed successfully!', 'success', 3000);
}

// Enhanced dashboard update function
function updateEnhancedDashboard() {
    if (!enhancedDashboardData) return;

    // Update sales summary
    const { salesSummary, orderStats, bestSellers, notifications } = enhancedDashboardData;
    
    // Sales summary cards
    document.getElementById('todayRevenue').textContent = formatCurrency(salesSummary.today.revenue);
    document.getElementById('todayOrders').textContent = `${salesSummary.today.orders} pesanan`;
    
    document.getElementById('weekRevenue').textContent = formatCurrency(salesSummary.week.revenue);
    document.getElementById('weekOrders').textContent = `${salesSummary.week.orders} pesanan`;
    
    document.getElementById('monthRevenue').textContent = formatCurrency(salesSummary.month.revenue);
    document.getElementById('monthOrders').textContent = `${salesSummary.month.orders} pesanan`;

    // Order status counts
    document.getElementById('pendingOrdersCount').textContent = orderStats.pending || 0;
    document.getElementById('processingOrdersCount').textContent = orderStats.processing || 0;
    document.getElementById('shippedOrdersCount').textContent = orderStats.shipped || 0;
    document.getElementById('completedOrdersCount').textContent = orderStats.completed || 0;
    document.getElementById('cancelledOrdersCount').textContent = orderStats.cancelled || 0;

    // Update best sellers
    updateBestSellers(bestSellers);
    
    // Update notifications
    updateNotifications(notifications);
}

function updateBestSellers(bestSellers) {
    const container = document.getElementById('bestSellersContainer');
    
    if (!bestSellers || bestSellers.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">Belum ada data produk terlaris</p>';
        return;
    }

    let html = '';
    bestSellers.forEach((product, index) => {
        const medalColor = index === 0 ? 'text-warning' : index === 1 ? 'text-secondary' : index === 2 ? 'text-warning' : 'text-muted';
        const medalIcon = index < 3 ? 'fas fa-medal' : 'fas fa-star';
        
        html += `
            <div class="d-flex align-items-center mb-3 p-2 border rounded">
                <div class="me-3">
                    <i class="${medalIcon} ${medalColor} fa-lg"></i>
                    <span class="badge bg-primary ms-1">${index + 1}</span>
                </div>
                <img src="${product.image}" alt="${product.name}" class="rounded me-3" style="width: 50px; height: 50px; object-fit: cover;">
                <div class="flex-grow-1">
                    <h6 class="mb-1 text-truncate" style="max-width: 200px;">${product.name}</h6>
                    <small class="text-muted">Terjual: ${product.sold_count} unit</small><br>
                    <small class="text-success fw-bold">${formatCurrency(product.revenue)}</small>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateNotifications(notifications) {
    const container = document.getElementById('notificationsContainer');
    const countBadge = document.getElementById('notificationCount');
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">Tidak ada notifikasi baru</p>';
        countBadge.textContent = '0';
        return;
    }

    countBadge.textContent = notifications.length;
    
    let html = '';
    notifications.forEach(notification => {
        const iconClass = notification.type === 'order' ? 'fas fa-shopping-cart text-primary' : 
                         notification.type === 'stock' ? 'fas fa-exclamation-triangle text-warning' :
                         'fas fa-info-circle text-info';
        
        const timeAgo = getTimeAgo(notification.time);
        
        html += `
            <div class="notification-item border-bottom pb-2 mb-2">
                <div class="d-flex align-items-start">
                    <div class="me-3 mt-1">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1 fs-6">${notification.title}</h6>
                        <p class="mb-1 text-muted small">${notification.message}</p>
                        ${notification.amount ? `<small class="text-success fw-bold">${formatCurrency(notification.amount)}</small><br>` : ''}
                        <small class="text-muted">${timeAgo}</small>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateRecentOrders() {
    const tbody = document.getElementById('recentOrdersBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const source = Array.isArray(orders) ? orders : [];
    const recentOrders = source.slice(0, 5); // Show only 5 recent orders

    recentOrders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${order.customer_name}</td>
            <td class="currency">${formatCurrency(order.total_amount)}</td>
            <td><span class="badge status-${order.status}">${capitalizeFirst(order.status)}</span></td>
            <td>${formatDate(order.created_at)}</td>
        `;
        tbody.appendChild(row);
    });
    console.log('[Products] tbody children after render:', tbody.children.length);
}

// Products functions
async function loadProducts() {
    try {
        const resp = await apiCall('/api/products');
        console.log('[Products] API raw response:', resp);
        // Accept either array or { success, data }
        const list = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.data) ? resp.data : []);
        if (!list) {
            showNotification('Failed to load products', 'error');
        }
        products = (list || []).map(p => {
            let variants = [];
            const toArray = (val) => {
                if (Array.isArray(val)) return val;
                if (val && typeof val === 'object') {
                    // Convert object map into array of {type,name}
                    return Object.entries(val).map(([k, v]) => ({ type: k, name: String(v) }));
                }
                return [];
            };
            if (Array.isArray(p.variants)) variants = p.variants;
            else if (typeof p.variants === 'string') { try { variants = toArray(JSON.parse(p.variants)); } catch(_) { variants = []; } }
            else if (p.variants && typeof p.variants === 'object') { variants = toArray(p.variants); }
            else if (p.variants_json) { try { variants = toArray(JSON.parse(p.variants_json)); } catch(_) { variants = []; } }
            return { ...p, variants };
        });
        // expose to window for console debugging
        try { window.products = products; } catch(_) {}
        console.log('[Products] loaded count:', products.length);
        updateProductsTable();
        // render again on next frame to ensure DOM is ready
        requestAnimationFrame(() => updateProductsTable());
    } catch (e) {
        console.error('loadProducts error:', e);
        products = [];
        try { window.products = products; } catch(_) {}
        updateProductsTable();
    }
}

function updateProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) {
        console.warn('[Products] tbody #productsTableBody not found');
        return;
    }
    tbody.innerHTML = '';

    const list = Array.isArray(products) ? products : [];
    console.log('[Products] rendering rows:', list.length);
    if (!list.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="10" class="text-center text-muted">No products found</td>`;
        tbody.appendChild(tr);
        return;
    }

    // 1) Sort by category, then name
    const sorted = [...list].sort((a, b) => {
        const ca = (a.category || '').toString().toLowerCase();
        const cb = (b.category || '').toString().toLowerCase();
        const byCat = ca.localeCompare(cb);
        if (byCat !== 0) return byCat;
        const na = (a.name || '').toString().toLowerCase();
        const nb = (b.name || '').toString().toLowerCase();
        return na.localeCompare(nb);
    });

    // 2) Render rows (no category group header; category shown in its own column)
    sorted.forEach(product => {
        const category = product.category || 'Uncategorized';

        const normalizedImages = (Array.isArray(product.images) ? product.images : []).map(u => {
            let s = String(u || '');
            if (s && s.includes('uploads')) {
                const i = s.indexOf('uploads');
                s = '/' + s.substring(i).replace(/\\/g,'/');
            }
            if (s && s.includes(' ')) s = s.replace(/ /g, '%20');
            return s || '/uploads/placeholder.svg';
        });
        const imageHtml = normalizedImages.length > 0 
            ? `<div class="product-images">
                ${normalizedImages.slice(0, 2).map(img => 
                    `<img src="${img}" alt="${product.name}" class="product-image-small me-1" style="width:60px;height:60px;object-fit:cover;">`
                ).join('')}
                ${normalizedImages.length > 2 ? `<span class="badge bg-secondary">+${normalizedImages.length - 2}</span>` : ''}
               </div>`
            : '<img src="/uploads/placeholder.svg" alt="No Image" class="product-image-small" style="width:60px;height:60px;object-fit:cover">';

        const variantsHtml = product.variants && product.variants.length > 0
            ? `<div class="variants-summary">
                ${product.variants.slice(0, 3).map(variant => 
                    `<span class="badge bg-light text-dark me-1">${variant.name}</span>`
                ).join('')}
                ${product.variants.length > 3 ? `<span class="badge bg-secondary">+${product.variants.length - 3}</span>` : ''}
               </div>`
            : '<span class="text-muted">No variants</span>';

        const statusBadgeClass = (s => {
            s = String(s || '').toLowerCase();
            if (s === 'active') return 'bg-success';
            if (s === 'low_stock') return 'bg-warning text-dark';
            if (s === 'inactive') return 'bg-secondary';
            return 'bg-light text-dark';
        })(product.status);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${imageHtml}</td>
            <td><div class="fw-bold">${product.name ?? ''}</div></td>
            <td>${product.description ? product.description : ''}</td>
            <td><span class="badge bg-info text-dark">${category}</span></td>
            <td class="text-end">${formatCurrency(product.regular_price ?? 0)}</td>
            <td class="text-end">${product.promo_price != null ? `<span class="text-success fw-bold">${formatCurrency(product.promo_price)}</span>` : '<span class="text-muted">-</span>'}</td>
            <td class="text-end"><span class="fw-bold">${Number.isFinite(+product.stock) ? parseInt(product.stock, 10) : 0}</span></td>
            <td class="text-start">${Array.isArray(product.variants) && product.variants.length ? product.variants.map(v => `<span class=\"badge bg-light text-dark me-1\">${(v && (v.name || v.type || '')).toString()}</span>`).join('') : '-'}</td>
            <td><span class="badge ${statusBadgeClass}">${capitalizeFirst(String(product.status || '').replace('_', ' '))}</span></td>
            <td class="action-buttons">
                <div class="btn-group" role="group" aria-label="Actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="editProduct('${product.id}')" title="Edit Product">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${product.id}')" title="Delete Product">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>`;
        tbody.appendChild(row);
    });
    console.log('[Products] rows appended:', tbody.children.length);
}

// Global variables for product management
let currentProductImages = [];
let currentProductVariants = [];
let isEditMode = false;

function showProductModal(productId = null) {
    isEditMode = !!productId;
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    const modalTitle = document.getElementById('productModalTitle');
    const saveBtn = document.getElementById('saveProductBtn');
    
    // Reset form and variables
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = productId || '';
    document.getElementById('imagePreview').innerHTML = '';
    const variantsContainer = document.getElementById('variantsContainer');
    if (variantsContainer) variantsContainer.innerHTML = '';
    currentProductImages = [];
    currentProductVariants = [];
    
    if (isEditMode) {
        modalTitle.textContent = 'Edit Product';
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm d-none me-2" id="saveSpinner"></span>Update Product';
        loadProductForEdit(productId);
    } else {
        modalTitle.textContent = 'Add New Product';
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm d-none me-2" id="saveSpinner"></span>Save Product';
    }
    
    modal.show();
}

async function loadProductForEdit(productId) {
    try {
        // Fetch latest product by ID
        const resp = await apiCall(`/api/products/${productId}`);
        const p = resp && (resp.data || resp);
        if (!p) {
            showNotification('Failed to load product details', 'error');
            return;
        }

        // Normalize
        const images = Array.isArray(p.images) ? p.images : [];
        let variants = [];
        if (Array.isArray(p.variants)) variants = p.variants;
        else if (typeof p.variants === 'string') { try { variants = JSON.parse(p.variants); } catch(_) { variants = []; } }
        else if (p.variants_json) { try { variants = JSON.parse(p.variants_json); } catch(_) { variants = []; } }

        // Fill hidden id
        document.getElementById('productId').value = p.id;

        // Fill basic fields
        document.getElementById('productName').value = p.name || '';
        document.getElementById('productCategory').value = p.category || '';
        const brandInput = document.getElementById('productBrand');
        if (brandInput) brandInput.value = p.brand || '';
        document.getElementById('productRegularPrice').value = p.regular_price ?? '';
        document.getElementById('productPromoPrice').value = p.promo_price ?? '';
        document.getElementById('productStock').value = p.stock ?? 0;
        document.getElementById('productStatus').value = p.status || 'active';
        document.getElementById('productDescription').value = p.description || '';

        // Load images
        currentProductImages = [...images];
        displayImagePreviews();

        // Load variants
        currentProductVariants = [...variants];
        displayVariants();
    } catch (e) {
        console.error('loadProductForEdit error:', e);
        showNotification('Error loading product for edit', 'error');
    }
}

// Image handling functions
document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('productImages');
    if (imageInput) {
        imageInput.addEventListener('change', handleImageUpload);
    }
});

async function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    if (currentProductImages.length + files.length > 5) {
        showNotification('Maximum 5 images allowed', 'error');
        return;
    }
    
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    
    try {
        let response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        if (!response || !response.ok) {
            // Fallback for dev servers without pretty URLs
            response = await fetch('/index.php/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
                body: formData
            });
        }
        let result = null;
        try { result = await response.json(); } catch(_) { result = null; }
        if (result.success) {
            result.files.forEach(file => {
                currentProductImages.push(file.url);
            });
            displayImagePreviews();
            showNotification('Images uploaded successfully!', 'success');
        } else {
            showNotification(result.message || 'Upload failed', 'error');
        }
    } catch (error) {
        showNotification('Error uploading images', 'error');
    }
    
    // Clear the input
    event.target.value = '';
}

function displayImagePreviews() {
    const container = document.getElementById('imagePreview');
    container.innerHTML = '';
    
    currentProductImages.forEach((imageUrl, index) => {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'position-relative d-inline-block';
        imageDiv.innerHTML = `
            <img src="${imageUrl}" alt="Product Image" style="width: 80px; height: 80px; object-fit: cover;" class="rounded border">
            <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0" 
                    onclick="removeImage(${index})" style="transform: translate(50%, -50%);">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(imageDiv);
    });
}

function removeImage(index) {
    currentProductImages.splice(index, 1);
    displayImagePreviews();
}

// Variant management functions
function addVariant() {
    const container = document.getElementById('variantsContainer');
    if (!container) return;
    const variantIndex = currentProductVariants.length;

    const variant = { type: '', name: '', stock: 0 };
    currentProductVariants.push(variant);
    const variantDiv = document.createElement('div');
    variantDiv.className = 'variant-item border rounded p-2 mb-2';
    variantDiv.innerHTML = `
        <div class="row align-items-center">
            <div class="col-md-3">
                <select class="form-control form-control-sm" onchange="updateVariant(${variantIndex}, 'type', this.value)">
                    <option value="">Select Type</option>
                    <option value="color">Color</option>
                    <option value="size">Size</option>
                    <option value="storage">Storage</option>
                    <option value="memory">Memory</option>
                    <option value="material">Material</option>
                </select>
            </div>
            <div class="col-md-4">
                <input type="text" class="form-control form-control-sm" placeholder="Variant Name" 
                       onchange="updateVariant(${variantIndex}, 'name', this.value)">
            </div>
            <div class="col-md-3">
                <input type="number" class="form-control form-control-sm" placeholder="Stock" 
                       onchange="updateVariant(${variantIndex}, 'stock', parseInt(this.value || '0'))">
            </div>
            <div class="col-md-2 text-end">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeVariant(${variantIndex})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
    container.appendChild(variantDiv);
}

function updateVariant(index, field, value) {
    if (!currentProductVariants[index]) return;
    currentProductVariants[index][field] = value;
}

function removeVariant(index) {
    currentProductVariants.splice(index, 1);
    displayVariants();
}

function displayVariants() {
    const container = document.getElementById('variantsContainer');
    if (!container) return;
    container.innerHTML = '';
    currentProductVariants.forEach((variant, idx) => {
        const variantDiv = document.createElement('div');
        variantDiv.className = 'variant-item border rounded p-2 mb-2';
        variantDiv.innerHTML = `
            <div class="row align-items-center">
                <div class="col-md-3">
                    <select class="form-control form-control-sm" onchange="updateVariant(${idx}, 'type', this.value)">
                        <option value="">Select Type</option>
                        <option value="color" ${variant.type === 'color' ? 'selected' : ''}>Color</option>
                        <option value="size" ${variant.type === 'size' ? 'selected' : ''}>Size</option>
                        <option value="storage" ${variant.type === 'storage' ? 'selected' : ''}>Storage</option>
                        <option value="memory" ${variant.type === 'memory' ? 'selected' : ''}>Memory</option>
                        <option value="material" ${variant.type === 'material' ? 'selected' : ''}>Material</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <input type="text" class="form-control form-control-sm" placeholder="Variant Name" 
                           value="${variant.name || ''}" onchange="updateVariant(${idx}, 'name', this.value)">
                </div>
                <div class="col-md-3">
                    <input type="number" class="form-control form-control-sm" placeholder="Stock" 
                           value="${variant.stock || 0}" onchange="updateVariant(${idx}, 'stock', parseInt(this.value || '0'))">
                </div>
                <div class="col-md-2 text-end">
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeVariant(${idx})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`;
        container.appendChild(variantDiv);
    });
}

// Safely read current variants directly from DOM so values are captured even if inputs haven't blurred
function collectVariantsFromDOM() {
    const out = [];
    const container = document.getElementById('variantsContainer');
    if (!container) {
        // fallback to in-memory array
        return (currentProductVariants || []).filter(v => v && (v.type || v.name)).map(v => ({
            type: v.type || '',
            name: v.name || '',
            stock: Number.isFinite(+v.stock) ? parseInt(v.stock, 10) : 0
        }));
    }
    const items = container.querySelectorAll('.variant-item');
    items.forEach((item) => {
        const sel = item.querySelector('select');
        const inputs = item.querySelectorAll('input');
        const type = sel ? sel.value : '';
        const name = inputs[0] ? inputs[0].value : '';
        const stock = inputs[1] ? parseInt(inputs[1].value || '0', 10) : 0;
        if (type || name) {
            out.push({ type, name, stock: Number.isFinite(stock) ? stock : 0 });
        }
    });
    return out;
}

async function saveProduct() {
    const saveBtn = document.getElementById('saveProductBtn');
    const spinner = document.getElementById('saveSpinner');
    
    // Validate required fields
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const brand = (document.getElementById('productBrand')?.value || '').trim();
    const regularPrice = document.getElementById('productRegularPrice').value;
    const stock = document.getElementById('productStock').value;
    
    if (!name || !category || !regularPrice || !stock) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Show loading
    spinner.classList.remove('d-none');
    saveBtn.disabled = true;

    try {
        // If file input has files but previews not processed yet, upload now
        try {
            const fileInput = document.getElementById('productImages');
            if (fileInput && fileInput.files && fileInput.files.length > 0) {
                const formData = new FormData();
                Array.from(fileInput.files).forEach(f => formData.append('images', f));
                let up = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` }, body: formData }).catch(()=>null);
                if (!(up && up.ok)) {
                    up = await fetch('/index.php/api/upload', { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` }, body: formData }).catch(()=>null);
                }
                if (up && up.ok) {
                    let uj = null; try { uj = await up.json(); } catch(_) {}
                    if (uj && uj.success && Array.isArray(uj.files)) {
                        uj.files.forEach(f => { currentProductImages.push(f.url); });
                    }
                }
            }
        } catch(_) {}

        const productData = {
            name: name,
            category: category,
            brand: brand || null,
            regular_price: parseInt(regularPrice, 10),
            promo_price: document.getElementById('productPromoPrice').value ? parseInt(document.getElementById('productPromoPrice').value, 10) : null,
            stock: parseInt(stock, 10),
            status: document.getElementById('productStatus').value,
            description: document.getElementById('productDescription').value.trim(),
            images: currentProductImages,
            variants: collectVariantsFromDOM()
        };
        const productId = document.getElementById('productId').value;
        const method = isEditMode ? 'PUT' : 'POST';
        const url = isEditMode ? `/api/products/${productId}` : '/api/products';
        
        const result = await apiCall(url, method, productData);
        if (result && (result.success || Array.isArray(result))) {
            showNotification(`Product ${isEditMode ? 'updated' : 'added'} successfully!`, 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
            modal.hide();
            // optimistic update if API returns data
            if (result.data) {
                const saved = result.data;
                // Normalize variants for UI
                let variants = [];
                if (Array.isArray(saved.variants)) variants = saved.variants;
                else if (typeof saved.variants === 'string') { try { variants = JSON.parse(saved.variants); } catch(_) { variants = []; } }
                else if (saved.variants_json) { try { variants = JSON.parse(saved.variants_json); } catch(_) { variants = []; } }
                const normalized = { ...saved, variants };
                products = Array.isArray(products) ? products : [];
                if (isEditMode) {
                    const idx = products.findIndex(p => p.id === normalized.id);
                    if (idx >= 0) products[idx] = normalized; else products.unshift(normalized);
                } else {
                    products.unshift(normalized);
                }
                updateProductsTable();
            } else {
                // fallback reload
                loadProducts();
            }
            loadDashboardData(); // Refresh dashboard stats
        } else {
            const msg = (result && (result.message || result.error)) || 'Failed to save product';
            showNotification(msg, 'error');
        }
    } catch (error) {
        showNotification('Error saving product', 'error');
    } finally {
        spinner.classList.add('d-none');
        saveBtn.disabled = false;
    }
}

function editProduct(productId) {
    showProductModal(productId);
}

async function viewProduct(productId) {
    try {
        // Prepare modal and show loading state early
        const modalEl = document.getElementById('productViewModal');
        if (!modalEl) return;
        const loader = document.getElementById('viewProductLoading');
        const titleEl = document.getElementById('viewProductTitle');
        const imgWrap = document.getElementById('viewProductImages');
        const detailsEl = document.getElementById('viewProductDetails');
        const variantsEl = document.getElementById('viewProductVariants');

        if (loader) loader.classList.remove('d-none');
        if (titleEl) titleEl.textContent = '';
        if (imgWrap) imgWrap.innerHTML = '';
        if (detailsEl) detailsEl.innerHTML = '';
        if (variantsEl) variantsEl.innerHTML = '';

        const modal = (bootstrap.Modal.getOrCreateInstance ? bootstrap.Modal.getOrCreateInstance(modalEl) : new bootstrap.Modal(modalEl));
        modal.show();

        // Fetch fresh data
        console.debug('[ViewProduct] requested id:', productId);
        const resp = await apiCall(`/api/products/${productId}`);
        console.debug('[ViewProduct] API response:', resp);
        let p = resp && (resp.data || resp);
        // Fallback: use locally loaded products if API did not return a record
        if (!p && Array.isArray(products)) {
            const pidNum = Number(productId);
            p = products.find(x => x && (Number(x.id) === pidNum || String(x.id) === String(productId)));
            if (p) console.debug('[ViewProduct] Using local product cache as fallback');
        }
        if (!p) {
            if (detailsEl) detailsEl.innerHTML = '<div class="text-danger">Failed to load product details.</div>';
            if (variantsEl) variantsEl.innerHTML = '';
            if (imgWrap) imgWrap.innerHTML = '';
            showNotification('Failed to load product details', 'error');
            if (loader) loader.classList.add('d-none');
            return;
        }

        // Normalize variants and images
        let variants = [];
        const toArray = (val) => {
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
            if (val && typeof val === 'object') return Object.entries(val).map(([k,v]) => ({type:k, name:String(v)}));
            return [];
        };
        variants = toArray(p.variants || p.variants_json || []);
        const images = Array.isArray(p.images) ? p.images : [];

        // Populate modal
        document.getElementById('viewProductTitle').textContent = p.name || '';
        if (images.length > 1) {
            const carouselId = 'viewProductCarousel';
            const indicators = images.map((_, i) => `
                <button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${i}" ${i===0?'class="active" aria-current="true"':''} aria-label="Slide ${i+1}"></button>
            `).join('');
            const inner = images.map((u, i) => `
                <div class="carousel-item ${i===0?'active':''}">
                    <img src="${u}" class="d-block w-100" style="max-height:380px;object-fit:contain;" alt="image-${i}">
                </div>
            `).join('');
            imgWrap.innerHTML = `
                <div id="${carouselId}" class="carousel slide" data-bs-ride="carousel">
                    <div class="carousel-indicators">${indicators}</div>
                    <div class="carousel-inner">${inner}</div>
                    <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Previous</span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                        <span class="carousel-control-next-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Next</span>
                    </button>
                </div>`;
        } else if (images.length === 1) {
            imgWrap.innerHTML = `<img src="${images[0]}" style="width:100%;max-height:380px;object-fit:contain;border-radius:6px;border:1px solid #ddd;"/>`;
        } else {
            imgWrap.innerHTML = '<span class="text-muted">No images</span>';
        }

        const details = [
            {label:'Category', value: p.category || '-'},
            {label:'Regular Price', value: formatCurrency(p.regular_price || 0)},
            {label:'Promo Price', value: p.promo_price ? formatCurrency(p.promo_price) : '-'},
            {label:'Stock', value: Number.isFinite(+p.stock) ? parseInt(p.stock,10) : 0},
            {label:'Status', value: p.status || '-'},
            {label:'Description', value: p.description || '-'}
        ];
        detailsEl.innerHTML = details.map(d => `
            <div class="col-md-6">
                <div class="border rounded p-2">
                    <div class="text-muted small">${d.label}</div>
                    <div class="fw-bold">${d.value}</div>
                </div>
            </div>`).join('');

        variantsEl.innerHTML = variants.length
            ? variants.map(v => `<span class="badge bg-light text-dark">${(v && (v.name || v.type || '')).toString()}</span>`).join(' ')
            : '<span class="text-muted">No variants</span>';

        // Hide loader after populate
        if (loader) loader.classList.add('d-none');
    } catch (e) {
        console.error('viewProduct error:', e);
        showNotification('Error loading product details', 'error');
        const loader = document.getElementById('viewProductLoading');
        if (loader) loader.classList.add('d-none');
    }
}

async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        const result = await apiCall(`/api/products/${productId}`, 'DELETE');
        if (result) {
            showNotification('Product deleted successfully!', 'success');
            loadProducts();
            loadDashboardData(); // Refresh dashboard stats
        }
    }
}

// Analytics functionality (variables moved to comprehensive analytics section below)

async function loadAnalyticsData(period = '7days') {
    try {
        const response = await fetch(`/api/analytics?period=${period}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch analytics data');
        
        const data = await response.json();
        updateAnalyticsUI(data);
        updateAnalyticsCharts(data);
        
        return data;
    } catch (error) {
        console.error('Error loading analytics:', error);
        showNotification('Error loading analytics data', 'error');
    }
}

function updateAnalyticsUI(data) {
    // Update summary cards
    document.getElementById('totalSalesAmount').textContent = formatCurrency(data.summary.totalSales.amount);
    document.getElementById('totalSalesCount').textContent = `${data.summary.totalSales.count} transaksi`;
    document.getElementById('totalVisitors').textContent = data.summary.totalVisitors.toLocaleString();
    document.getElementById('todayVisitors').textContent = data.visitorStats.today.toLocaleString();
    document.getElementById('topProductName').textContent = data.summary.topProduct.name;
    document.getElementById('topProductSales').textContent = data.summary.topProduct.sold;
    document.getElementById('conversionRate').textContent = `${data.summary.conversionRate}%`;

    // Update visitor statistics
    document.getElementById('visitorToday').textContent = data.visitorStats.today.toLocaleString();
    document.getElementById('visitorWeek').textContent = data.visitorStats.week.toLocaleString();
    document.getElementById('visitorMonth').textContent = data.visitorStats.month.toLocaleString();
    document.getElementById('visitorAverage').textContent = data.visitorStats.average.toLocaleString();
    document.getElementById('peakHour').textContent = data.visitorStats.peakHour;

    // Update product statistics table
    updateProductStatsTable(data.productStats);
    
    // Update top products list
    updateTopProductsList(data.topProducts);
}

function updateProductStatsTable(productStats) {
    const tbody = document.getElementById('productStatsTable');
    tbody.innerHTML = '';

    productStats.slice(0, 10).forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="fw-bold">${product.name}</div>
                <small class="text-muted">${product.category}</small>
            </td>
            <td><span class="fw-bold">${product.sold}</span></td>
            <td><span class="currency">${formatCurrency(product.revenue)}</span></td>
            <td>
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar bg-primary" role="progressbar" 
                         style="width: ${product.percentage}%" 
                         aria-valuenow="${product.percentage}" aria-valuemin="0" aria-valuemax="100">
                        ${product.percentage}%
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    console.log('[Products] rows appended:', tbody.children.length);
}

function updateTopProductsList(topProducts) {
    const container = document.getElementById('topProductsList');
    container.innerHTML = '';

    topProducts.forEach((product, index) => {
        const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`;
        const productDiv = document.createElement('div');
        productDiv.className = 'd-flex justify-content-between align-items-center mb-2 p-2 border rounded';
        productDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <span class="me-2 fs-5">${medal}</span>
                <div>
                    <div class="fw-bold">${product.name}</div>
                    <small class="text-muted">${product.category}</small>
                </div>
            </div>
            <div class="text-end">
                <div class="fw-bold">${product.sold} terjual</div>
                <small class="text-success">${formatCurrency(product.revenue)}</small>
            </div>
        `;
        container.appendChild(productDiv);
    });
}

function updateAnalyticsCharts(data) {
    // Revenue Chart
    updateRevenueChart(data.revenueTrend);
    
    // Visitor vs Sales Chart
    updateVisitorChart(data.visitorData);
    
    // Visitor Trend Chart
    updateVisitorTrendChart(data.visitorData);
}

function updateRevenueChart(revenueTrend) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    if (revenueChart) {
        revenueChart.destroy();
    }
    
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: revenueTrend.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
            }),
            datasets: [{
                label: 'Pendapatan',
                data: revenueTrend.map(item => item.revenue),
                borderColor: 'rgb(220, 53, 69)',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Pembelian (COGS)',
                data: revenueTrend.map(item => item.purchases || Math.round((item.revenue || 0) * 0.68)),
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Jumlah Pesanan',
                data: revenueTrend.map(item => item.orders),
                borderColor: 'rgb(40, 167, 69)',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                tension: 0.4,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        callback: function(value) {
                            return 'Rp ' + (value / 1000000).toFixed(1) + 'M';
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            },
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0 || context.datasetIndex === 1) {
                                return 'Pendapatan: ' + formatCurrency(context.parsed.y);
                            } else {
                                return 'Pesanan: ' + context.parsed.y;
                            }
                        }
                    }
                }
            }
        }
    });
}

function updateVisitorChart(visitorData) {
    const ctx = document.getElementById('visitorChart').getContext('2d');
    
    if (visitorChart) {
        visitorChart.destroy();
    }
    
    const totalVisitors = visitorData.reduce((sum, day) => sum + day.visitors, 0);
    const totalOrders = visitorData.reduce((sum, day) => sum + day.orders, 0);
    
    visitorChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pengunjung', 'Pembeli'],
            datasets: [{
                data: [totalVisitors - totalOrders, totalOrders],
                backgroundColor: [
                    'rgba(108, 117, 125, 0.8)',
                    'rgba(220, 53, 69, 0.8)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const percentage = ((context.parsed / totalVisitors) * 100).toFixed(1);
                            return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

// Render Category Distribution (by items sold) as a doughnut chart
function updateCategoryChart(categoryData) {
    const canvas = document.getElementById('categoryChart');
    if (!canvas || !categoryData || !Array.isArray(categoryData)) return;

    if (categoryChart) {
        categoryChart.destroy();
    }

    // Normalise raw categories into 4 main groups
    const buckets = {
        laptop: 0,
        handphone: 0,
        tablet: 0,
        accessories: 0,
    };

    categoryData.forEach(item => {
        const raw = (item.name || '').toString().toLowerCase();
        const sold = Number(item.totalSold || item.sold || 0) || 0;
        if (!sold) return;

        if (['laptop', 'laptops'].includes(raw)) {
            buckets.laptop += sold;
        } else if (['handphone', 'hp', 'smartphone', 'smartphones', 'phone', 'phones'].includes(raw)) {
            buckets.handphone += sold;
        } else if (['tablet', 'tablets', 'tab', 'ipad'].includes(raw)) {
            buckets.tablet += sold;
        } else if (['accessory', 'accessories', 'aksesoris', 'aksessories', 'aksesoriss'].includes(raw)) {
            buckets.accessories += sold;
        }
    });

    const labels = ['Laptop', 'Handphone', 'Tablet', 'Accessories'];
    const data = [
        buckets.laptop,
        buckets.handphone,
        buckets.tablet,
        buckets.accessories,
    ];

    const backgroundColors = [
        'rgba(25, 135, 84, 0.8)',   // Laptop - green
        'rgba(220, 53, 69, 0.8)',   // Handphone - red
        'rgba(13, 202, 240, 0.8)',  // Tablet - blue
        'rgba(255, 193, 7, 0.8)',   // Accessories - yellow
    ];

    categoryChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const val = context.parsed;
                            const pct = total ? ((val / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${val} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateVisitorTrendChart(visitorData) {
    const ctx = document.getElementById('visitorTrendChart').getContext('2d');
    
    if (visitorTrendChart) {
        visitorTrendChart.destroy();
    }
    
    visitorTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: visitorData.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
            }),
            datasets: [{
                label: 'Pengunjung',
                data: visitorData.map(item => item.visitors),
                backgroundColor: 'rgba(220, 53, 69, 0.8)',
                borderColor: 'rgb(220, 53, 69)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

async function changeChartPeriod(period) {
    currentAnalyticsPeriod = period;
    
    // Update button states
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Reload analytics data
    await loadAnalyticsData(period);
}

async function refreshAnalytics() {
    const refreshBtn = event.target;
    const originalText = refreshBtn.innerHTML;
    
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Refreshing...';
    refreshBtn.disabled = true;
    
    try {
        await loadAnalyticsData(currentAnalyticsPeriod);
        showNotification('Analytics data refreshed successfully!', 'success');
    } catch (error) {
        showNotification('Error refreshing analytics data', 'error');
    } finally {
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
    }
}

// Load analytics when analytics section is shown
const originalShowSection = showSection;
showSection = function(section) {
    originalShowSection(section);
    
    if (section === 'analytics') {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            loadAnalyticsData(currentAnalyticsPeriod);
        }, 100);
    }
};

function editProduct(productId) {
    // Open edit modal with prefilled product data
    showProductModal(productId);
}

// Orders functions (legacy - kept for backward compatibility, not used)
async function loadOrdersLegacy() {
    try {
        const resp = await apiCall('/api/orders');
        const data = (resp && Array.isArray(resp.data)) ? resp.data : (Array.isArray(resp) ? resp : []);
        allOrdersCache = data;
        renderOrders();
        wireOrdersToolbar();
    } catch (e) {
        console.error('loadOrdersLegacy error', e);
        // Fallback to old path if needed
        try {
            orders = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.data) ? resp.data : []);
            updateOrdersTable();
        } catch(_){}
    }
}

function updateOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';

    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${order.customer_name}</td>
            <td>${order.customer_email}</td>
            <td>${escapeHtml(order.shipping_address || '-')}</td>
            <td class="currency">${formatCurrency(order.total_amount)}</td>
            <td>
                <select class="form-select form-select-sm" data-current="${String(order.status || '')}" onchange="updateOrderStatus('${order.id}', this.value, this)">
                    <option value="pending" ${String(order.status).toLowerCase()==='pending' ? 'selected' : ''}>Pending</option>
                    <option value="processing" ${String(order.status).toLowerCase()==='processing' ? 'selected' : ''}>Processing</option>
                    <option value="shipped" ${String(order.status).toLowerCase()==='shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="completed" ${String(order.status).toLowerCase()==='completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${String(order.status).toLowerCase()==='cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>${formatDate(order.created_at)}</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-outline-success" onclick="printReceipt('${order.id}')" title="Print Receipt">
                    <i class="fas fa-print"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function updateOrderStatus(orderId, newStatus, el = null) {
    try {
        const prev = el ? (el.getAttribute('data-prev') || el.getAttribute('data-current') || el.value) : null;
        if (el) {
            el.setAttribute('data-prev', prev);
            el.disabled = true;
        }
        let resp = await apiCall(`/api/orders/${orderId}`, 'PUT', { status: newStatus });
        if (!resp || resp.success !== true) {
            // Fallback to POST /status
            resp = await apiCall(`/api/orders/${orderId}/status`, 'POST', { status: newStatus });
            if (!resp || resp.success !== true) {
                if (el && prev) el.value = prev;
                showNotification(resp && resp.message ? 'Failed: ' + resp.message : 'Failed to update order status', 'error');
                return;
            }
        }
        showNotification('Order status updated successfully!', 'success');
        // Optimistic update: update local array and rerender immediately
        const idx = Array.isArray(orders) ? orders.findIndex(o => String(o.id) === String(orderId)) : -1;
        if (idx >= 0) {
            orders[idx].status = newStatus;
            updateOrdersTable();
        }
        if (el) {
            el.setAttribute('data-current', newStatus);
        }
        // Refresh in background to keep data consistent
        loadDashboardData();
    } catch (e) {
        if (el && el.getAttribute('data-prev')) el.value = el.getAttribute('data-prev');
        console.error('updateOrderStatus error', e);
        showNotification('Error updating status', 'error');
    } finally {
        if (el) el.disabled = false;
    }
}

function viewOrderDetails(orderId) {
    const order = Array.isArray(orders) ? orders.find(o => String(o.id) === String(orderId)) : null;
    if (!order) {
        showNotification('Order details not found', 'error');
        return;
    }
    let itemsHtml = '';
    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach(item => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        itemsHtml += `<li>${escapeHtml(item.product_name || '-') } x${qty} - ${formatCurrency(price * qty)}</li>`;
    });

    const details = `
        <strong>Order #${order.id}</strong><br>
        Customer: ${order.customer_name}<br>
        Email: ${order.customer_email}<br>
        Address: ${escapeHtml(order.shipping_address || '-') }<br>
        Total: ${formatCurrency(order.total_amount)}<br>
        Status: ${capitalizeFirst(order.status)}<br>
        Date: ${formatDate(order.created_at)}<br><br>
        <strong>Items:</strong><br>
        <ul>${itemsHtml || '<li>-</li>'}</ul>
    `;

    showNotification(details, 'info', 10000);
}

// Receipt printing functionality
async function printReceipt(orderId) {
    try {
        showNotification('Generating receipt...', 'info', 2000);
        
        // Fetch receipt data from API
        const response = await apiCall(`/api/orders/${orderId}/receipt`);
        if (!response || !response.success) {
            showNotification('Error generating receipt', 'error');
            return;
        }
        
        const receiptData = response.data;
        
        // Create receipt HTML
        const receiptHtml = generateReceiptHTML(receiptData);
        
        // Create a new window for printing
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        };
        
        showNotification('Receipt generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error printing receipt:', error);
        showNotification('Error printing receipt', 'error');
    }
}

function generateReceiptHTML(receiptData) {
    const { order, store, receiptNumber, printDate, subtotal, tax, shipping, grandTotal } = receiptData;
    
    let itemsHtml = '';
    order.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        itemsHtml += `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(itemTotal)}</td>
            </tr>
        `;
    });
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Receipt - Order #${order.id}</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    margin: 0;
                    padding: 20px;
                    background: white;
                    color: black;
                    line-height: 1.4;
                }
                .receipt-container {
                    max-width: 600px;
                    margin: 0 auto;
                    border: 2px solid #000;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #000;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }
                .store-name {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .store-info {
                    font-size: 12px;
                    margin: 2px 0;
                }
                .receipt-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    font-size: 12px;
                }
                .customer-info {
                    margin-bottom: 20px;
                    padding: 10px;
                    border: 1px solid #000;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                .items-table th {
                    background: #f0f0f0;
                    padding: 10px 8px;
                    border: 1px solid #000;
                    text-align: left;
                    font-weight: bold;
                }
                .items-table td {
                    padding: 8px;
                    border-bottom: 1px solid #eee;
                }
                .totals {
                    border-top: 2px solid #000;
                    padding-top: 10px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 5px 0;
                }
                .grand-total {
                    font-weight: bold;
                    font-size: 16px;
                    border-top: 1px solid #000;
                    padding-top: 10px;
                    margin-top: 10px;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #000;
                    font-size: 12px;
                }
                @media print {
                    body { margin: 0; padding: 10px; }
                    .receipt-container { border: none; }
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <!-- Header -->
                <div class="header">
                    <div class="store-name">${store.name}</div>
                    <div class="store-info">${store.address}</div>
                    <div class="store-info">Tel: ${store.phone} | Email: ${store.email}</div>
                    ${store.website ? `<div class="store-info">Website: ${store.website}</div>` : ''}
                </div>
                
                <!-- Receipt Info -->
                <div class="receipt-info">
                    <div>
                        <strong>Receipt #:</strong> ${receiptNumber}<br>
                        <strong>Order #:</strong> ${order.id}
                    </div>
                    <div>
                        <strong>Date:</strong> ${formatDate(printDate)}<br>
                        <strong>Time:</strong> ${formatTime(printDate)}
                    </div>
                </div>
                
                <!-- Customer Info -->
                <div class="customer-info">
                    <strong>CUSTOMER INFORMATION</strong><br>
                    Name: ${order.customer_name}<br>
                    Email: ${order.customer_email}<br>
                    Order Date: ${formatDate(order.created_at)}<br>
                    Status: ${capitalizeFirst(order.status)}
                </div>
                
                <!-- Items Table -->
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Price</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <!-- Totals -->
                <div class="totals">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>${formatCurrency(subtotal)}</span>
                    </div>
                    <div class="total-row">
                        <span>Tax (10%):</span>
                        <span>${formatCurrency(tax)}</span>
                    </div>
                    <div class="total-row">
                        <span>Shipping:</span>
                        <span>${formatCurrency(shipping)}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span>GRAND TOTAL:</span>
                        <span>${formatCurrency(grandTotal)}</span>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="footer">
                    <p><strong>Thank you for your business!</strong></p>
                    <p>For questions about this order, please contact us at ${store.phone}</p>
                    <p>This is a computer-generated receipt.</p>
                </div>
            </div>
            
            <script>
                // Helper functions for formatting
                function formatCurrency(amount) {
                    return new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0
                    }).format(amount);
                }
                
                function formatDate(dateString) {
                    return new Date(dateString).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                }
                
                function formatTime(dateString) {
                    return new Date(dateString).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                }
                
                function capitalizeFirst(str) {
                    return str.charAt(0).toUpperCase() + str.slice(1);
                }
            </script>
        </body>
        </html>
    `;
}

// ===== CUSTOMERS MANAGEMENT =====

let filteredCustomers = [];
let currentPage = 1;
let itemsPerPage = 10;

// Load customers from API
async function loadCustomers() {
    try {
        console.log('🔄 Loading customers...');
        
        // Show loading state
        const tbody = document.getElementById('customersTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <div class="mt-2">Loading customers...</div>
                    </td>
                </tr>
            `;
        }
        
        // Reset statistics while loading
        updateCustomersStatsLoading();
        
        const response = await apiCall('/api/customers');
        console.log('📊 Customers response:', response);
        
        if (response && response.success && Array.isArray(response.data)) {
            customers = response.data;
            console.log(`✅ Loaded ${customers.length} customers`);
        } else if (Array.isArray(response)) {
            customers = response;
            console.log(`✅ Loaded ${customers.length} customers (direct array)`);
        } else {
            console.warn('⚠️ No customers data received');
            customers = [];
        }
        
        // Ensure each customer has required fields
        customers = customers.map(customer => ({
            id: customer.id || 0,
            name: customer.name || 'Unknown',
            email: customer.email || '',
            phone: customer.phone || '',
            address: customer.address || '',
            status: customer.status || 'active',
            total_orders: parseInt(customer.total_orders) || 0,
            total_spent: parseInt(customer.total_spent) || 0,
            joined_date: customer.joined_date || customer.created_at || '',
            created_at: customer.created_at || ''
        }));
        
        filteredCustomers = [...customers];
        updateCustomersTable();
        updateCustomersStats();
        
        console.log(`✅ Customers loaded successfully: ${customers.length} total`);
        
    } catch (error) {
        console.error('❌ Error loading customers:', error);
        const tbody = document.getElementById('customersTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger py-4">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Error loading customers. Please check your connection.
                        <br>
                        <small class="text-muted">${error.message}</small>
                        <br>
                        <button class="btn btn-sm btn-primary mt-2" onclick="loadCustomers()">
                            <i class="fas fa-sync-alt me-1"></i>Retry
                        </button>
                    </td>
                </tr>
            `;
        }
        
        // Reset stats on error
        updateCustomersStatsError();
        
        showNotification('Error loading customers: ' + error.message, 'error');
    }
}

// Update customers table with pagination and responsive design
function updateCustomersTable() {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    if (!filteredCustomers || filteredCustomers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="fas fa-users fa-3x mb-3 opacity-50"></i>
                    <div>No customers found</div>
                    <small>Try adjusting your search filters</small>
                </td>
            </tr>
        `;
        updatePagination(0);
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

    let html = '';
    paginatedCustomers.forEach(customer => {
        const statusBadgeClass = getStatusBadgeClass(customer.status);
        const statusIcon = getStatusIcon(customer.status);
        
        html += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <div class="fw-bold">${escapeHtml(customer.name || 'N/A')}</div>
                            <small class="text-muted d-md-none">${escapeHtml(customer.email || 'N/A')}</small>
                        </div>
                    </div>
                </td>
                <td class="d-none d-md-table-cell">
                    <div>${escapeHtml(customer.email || 'N/A')}</div>
                    <small class="text-muted">Email</small>
                </td>
                <td class="d-none d-lg-table-cell">
                    <div>${escapeHtml(customer.phone || 'N/A')}</div>
                    <small class="text-muted">Phone</small>
                </td>
                
                <td class="d-none d-sm-table-cell text-center">
                    <span class="badge bg-info">${customer.total_orders || 0}</span>
                </td>
                <td class="d-none d-md-table-cell text-end">
                    <div class="fw-bold text-success">${formatCurrency(customer.total_spent || 0)}</div>
                    <small class="text-muted">Total</small>
                </td>
                <td class="text-center">
                    <div class="dropdown">
                        <button class="btn btn-sm ${statusBadgeClass} dropdown-toggle" type="button" data-bs-toggle="dropdown" data-bs-display="static" aria-expanded="false">
                            <i class="fas ${statusIcon} me-1"></i>${capitalizeFirst(customer.status || 'active')}
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="#" onclick="updateCustomerStatus(${customer.id}, 'active')">
                                <i class="fas fa-user-check text-success me-2"></i>Active
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="updateCustomerStatus(${customer.id}, 'inactive')">
                                <i class="fas fa-user-times text-warning me-2"></i>Inactive
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="updateCustomerStatus(${customer.id}, 'banned')">
                                <i class="fas fa-user-slash text-danger me-2"></i>Banned
                            </a></li>
                        </ul>
                    </div>
                </td>
                <td class="d-none d-lg-table-cell text-center">
                    <div>${formatDate(customer.joined_date || customer.created_at)}</div>
                    <small class="text-muted">Joined</small>
                </td>
                <td class="text-center">
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewCustomerDetails(${customer.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info" onclick="editCustomer(${customer.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    updatePagination(filteredCustomers.length);
    updateCustomerCountBadge();
}

// Cache for primary addresses
const customerAddressesCache = new Map();

// Load and render primary address for a customer into its cell
async function loadPrimaryAddressForCustomer(customerId) {
    const cell = document.getElementById(`addr-primary-${customerId}`);
    if (!cell) return;
    if (customerAddressesCache.has(customerId)) {
        cell.textContent = customerAddressesCache.get(customerId);
        return;
    }
    cell.textContent = 'Loading...';
    let resp = await callCustomerAddressesApi(`?user_id=${customerId}`);
    if (!resp || (!Array.isArray(resp.addresses) && resp.success !== true)) {
        if (window.ALLOW_LARAVEL_ADDR === true) {
            const laravelBases = ['/bismarshop-api', '/bismarshop-api/public', ''];
            for (const base of laravelBases) {
                const tryUrl = `${base}/admin/customers/${customerId}/addresses`;
                const alt = await fetchJsonLoose(tryUrl, 'GET');
                if (alt && Array.isArray(alt.addresses)) { resp = alt; break; }
            }
        }
    }
    const addresses = (resp && Array.isArray(resp.addresses)) ? resp.addresses : [];
    if (!addresses.length) {
        cell.textContent = '—';
        customerAddressesCache.set(customerId, '—');
        return;
    }
    const primary = addresses.find(a => a.is_default) || addresses[0];
    const parts = [primary.address_line1, primary.address_line2, primary.district, primary.city, primary.province, primary.postal_code]
        .filter(Boolean).map(x => String(x).trim()).filter(x => x.length);
    const text = parts.join(', ');
    cell.textContent = text || '—';
    customerAddressesCache.set(customerId, cell.textContent);
}

// Update customers statistics
function updateCustomersStats() {
    if (!customers || customers.length === 0) {
        updateCustomersStatsEmpty();
        return;
    }

    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    const inactiveCustomers = customers.filter(c => c.status === 'inactive').length;
    const bannedCustomers = customers.filter(c => c.status === 'banned').length;

    // Update UI elements
    const totalEl = document.getElementById('totalCustomersCount');
    const activeEl = document.getElementById('activeCustomersCount');
    const inactiveEl = document.getElementById('inactiveCustomersCount');
    const bannedEl = document.getElementById('bannedCustomersCount');

    if (totalEl) totalEl.textContent = totalCustomers.toLocaleString();
    if (activeEl) activeEl.textContent = activeCustomers.toLocaleString();
    if (inactiveEl) inactiveEl.textContent = inactiveCustomers.toLocaleString();
    if (bannedEl) bannedEl.textContent = bannedCustomers.toLocaleString();
    
    console.log(`📊 Stats updated: Total=${totalCustomers}, Active=${activeCustomers}, Inactive=${inactiveCustomers}, Banned=${bannedCustomers}`);
}

// Update stats with loading state
function updateCustomersStatsLoading() {
    const elements = ['totalCustomersCount', 'activeCustomersCount', 'inactiveCustomersCount', 'bannedCustomersCount'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>';
    });
}

// Update stats with empty state
function updateCustomersStatsEmpty() {
    const elements = ['totalCustomersCount', 'activeCustomersCount', 'inactiveCustomersCount', 'bannedCustomersCount'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });
}

// Update stats with error state
function updateCustomersStatsError() {
    const elements = ['totalCustomersCount', 'activeCustomersCount', 'inactiveCustomersCount', 'bannedCustomersCount'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i>';
    });
}

// Get status badge class
function getStatusBadgeClass(status) {
    switch (status) {
        case 'active': return 'btn-success';
        case 'inactive': return 'btn-warning';
        case 'banned': return 'btn-danger';
        default: return 'btn-secondary';
    }
}

// Get status icon
function getStatusIcon(status) {
    switch (status) {
        case 'active': return 'fa-user-check';
        case 'inactive': return 'fa-user-times';
        case 'banned': return 'fa-user-slash';
        default: return 'fa-user';
    }
}

// Update customer status
async function updateCustomerStatus(customerId, newStatus) {
    try {
        console.log(`🔄 Updating customer ${customerId} status to ${newStatus}`);
        
        const customer = customers.find(c => c.id == customerId);
        if (!customer) {
            console.error(`❌ Customer ${customerId} not found`);
            showNotification('Customer not found', 'error');
            return;
        }

        // Prevent unnecessary updates
        if (customer.status === newStatus) {
            console.log(`ℹ️ Customer ${customerId} already has status ${newStatus}`);
            showNotification(`Customer already has ${newStatus} status`, 'info');
            return;
        }

        const confirmMessage = `Are you sure you want to change ${customer.name}'s status to ${newStatus.toUpperCase()}?`;
        if (!confirm(confirmMessage)) {
            console.log(`❌ User cancelled status update for customer ${customerId}`);
            return;
        }

        // Show loading state
        const statusButton = document.querySelector(`[onclick*="updateCustomerStatus(${customerId}"]`);
        if (statusButton) {
            statusButton.disabled = true;
            statusButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Updating...';
        }

        const response = await apiCall(`/api/customers/${customerId}/status`, 'PUT', {
            status: newStatus
        });

        console.log('📊 Update response:', response);

        if (response && response.success) {
            // Update local data
            const oldStatus = customer.status;
            customer.status = newStatus;
            
            // Update filtered customers if it exists
            const filteredCustomer = filteredCustomers.find(c => c.id == customerId);
            if (filteredCustomer) {
                filteredCustomer.status = newStatus;
            }

            updateCustomersTable();
            updateCustomersStats();
            
            console.log(`✅ Customer ${customerId} status updated from ${oldStatus} to ${newStatus}`);
            showNotification(`${customer.name}'s status updated to ${newStatus}`, 'success');
        } else {
            console.error('❌ Failed to update customer status:', response);
            showNotification(response?.message || 'Failed to update customer status', 'error');
        }
    } catch (error) {
        console.error('❌ Error updating customer status:', error);
        showNotification('Network error while updating customer status', 'error');
    } finally {
        // Reset button state
        setTimeout(() => {
            updateCustomersTable(); // This will restore the original button
        }, 1000);
    }
}

// Filter customers
function filterCustomers() {
    const searchTerm = document.getElementById('customerSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('customerStatusFilter')?.value || '';

    filteredCustomers = customers.filter(customer => {
        const matchesSearch = !searchTerm || 
            (customer.name && customer.name.toLowerCase().includes(searchTerm)) ||
            (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
            (customer.phone && customer.phone.toLowerCase().includes(searchTerm));
        
        const statusNorm = String(customer.status || '').toLowerCase().trim();
        const filterNorm = String(statusFilter || '').toLowerCase().trim();
        const matchesStatus = !filterNorm || statusNorm === filterNorm;
        
        return matchesSearch && matchesStatus;
    });

    currentPage = 1; // Reset to first page
    updateCustomersTable();
}

// Sort customers
function sortCustomers() {
    const sortBy = document.getElementById('sortBy')?.value || 'name';
    
    filteredCustomers.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return (a.name || '').localeCompare(b.name || '');
            case 'name_desc':
                return (b.name || '').localeCompare(a.name || '');
            case 'joined_date':
                return new Date(b.joined_date || b.created_at || 0) - new Date(a.joined_date || a.created_at || 0);
            case 'joined_date_desc':
                return new Date(a.joined_date || a.created_at || 0) - new Date(b.joined_date || b.created_at || 0);
            case 'total_spent':
                return (b.total_spent || 0) - (a.total_spent || 0);
            case 'total_spent_desc':
                return (a.total_spent || 0) - (b.total_spent || 0);
            default:
                return 0;
        }
    });

    updateCustomersTable();
}

// Clear filters
function clearFilters() {
    document.getElementById('customerSearch').value = '';
    document.getElementById('customerStatusFilter').value = '';
    document.getElementById('sortBy').value = 'name';
    
    filteredCustomers = [...customers];
    currentPage = 1;
    updateCustomersTable();
}

// Update pagination
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination = document.getElementById('customersPagination');
    const showingFrom = document.getElementById('showingFrom');
    const showingTo = document.getElementById('showingTo');
    const totalCustomersEl = document.getElementById('totalCustomers');

    if (!pagination) return;

    // Update showing info
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, totalItems);
    
    if (showingFrom) showingFrom.textContent = totalItems > 0 ? startIndex : 0;
    if (showingTo) showingTo.textContent = endIndex;
    if (totalCustomersEl) totalCustomersEl.textContent = totalItems;

    // Generate pagination
    let paginationHTML = '';
    
    if (totalPages > 1) {
        // Previous button
        paginationHTML += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(1)">1</a></li>`;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${totalPages})">${totalPages}</a></li>`;
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
    }

    pagination.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    updateCustomersTable();
}

// Update customer count badge
function updateCustomerCountBadge() {
    const badge = document.getElementById('customerCountBadge');
    if (badge) {
        badge.textContent = filteredCustomers.length;
    }
}

// View customer details (placeholder)
function viewCustomerDetails(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
        showNotification('Customer not found', 'error');
        return;
    }

    // For now, show a simple alert with customer details
    // In a real application, this would open a detailed modal
    const details = `
Customer Details:

Name: ${customer.name || 'N/A'}
Email: ${customer.email || 'N/A'}
Phone: ${customer.phone || 'N/A'}
Status: ${customer.status || 'N/A'}
Total Orders: ${customer.total_orders || 0}
Total Spent: ${formatCurrency(customer.total_spent || 0)}
Joined: ${formatDate(customer.joined_date || customer.created_at)}
`;

    alert(details);
}

// Edit customer (placeholder)
function editCustomer(customerId) {
    showNotification('Customer editing feature will be available soon', 'info');
}

const CUSTOMER_ADDR_API_BASE = '/api/customer-addresses';
const CUSTOMER_ADDR_API_BASES = (() => {
    const origin = window.location.origin || '';
    const currentDir = (window.location.pathname || '/').replace(/[^/]*$/, '');
    const hosts = [
        '', // same-origin
        'http://localhost',
        'http://127.0.0.1',
        'http://localhost:8000',
        'http://127.0.0.1:8000'
    ];
    const paths = [
        '/api/customer-addresses',
        '/api/customer-addresses/',
        '/api/customer-addresses/index.php',
        '/public/api/customer-addresses',
        '/public/api/customer-addresses/',
        '/public/api/customer-addresses/index.php',
        // variants based on current directory
        currentDir + 'api/customer-addresses',
        currentDir + 'api/customer-addresses/',
        currentDir + 'api/customer-addresses/index.php'
    ];
    const bases = [];
    for (const c of paths) {
        // same-origin absolute
        if (origin) bases.push(origin + c);
        // try additional hosts
        for (const h of hosts.filter(Boolean)) {
            bases.push(h + c);
        }
        // Root-absolute
        bases.push(c);
        // Relative
        bases.push(c.replace(/^\//, ''));
        // Up-one and up-two in case app served from nested path
        bases.push('../' + c.replace(/^\//, ''));
        bases.push('../../' + c.replace(/^\//, ''));
    }
    return bases;
})();

async function fetchJsonLoose(url, method = 'GET', data = null) {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    try {
        if (typeof authToken !== 'undefined' && authToken) {
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }
        if (data) options.body = JSON.stringify(data);
        console.debug('[ADDR API] fetch', method, url, data);
        const res = await fetch(url, options);
        const text = await res.text();
        try {
            const parsed = JSON.parse(text);
            console.debug('[ADDR API] response OK', parsed);
            return parsed;
        } catch (e) {
            console.warn('[ADDR API] non-JSON response', { status: res.status, text });
            return { success: false, message: 'Invalid response format', raw: text, status: res.status };
        }
    } catch (err) {
        console.error('[ADDR API] network error', err);
        return { success: false, message: err?.message || 'Network error' };
    }
}

let __resolvedCustomerAddrBase = null;
async function resolveCustomerAddressesBase() {
    if (__resolvedCustomerAddrBase) return __resolvedCustomerAddrBase;
    // 1) Manual override: window or localStorage
    const manual = (typeof window !== 'undefined' && (window.CUSTOMER_ADDR_BASE || window.ADDRESS_API_BASES && window.ADDRESS_API_BASES[0]))
        || (typeof localStorage !== 'undefined' && localStorage.getItem('CUSTOMER_ADDR_BASE')) || null;
    if (manual) {
        __resolvedCustomerAddrBase = manual;
        return __resolvedCustomerAddrBase;
    }
    // 2) Probe customer-addresses candidates directly with a lightweight count
    for (const base of CUSTOMER_ADDR_API_BASES) {
        const url = base + (base.includes('?') ? '&' : '?') + 'action=count';
        const r = await fetchJsonLoose(url, 'GET');
        if (r && r.success === true && typeof r.count !== 'undefined') {
            __resolvedCustomerAddrBase = base;
            return __resolvedCustomerAddrBase;
        }
    }
    // 3) Infer from a known working endpoint: /api/product-vouchers
    const probeCandidates = [
        '/api/product-vouchers',
        '/api/product-vouchers/',
        '/public/api/product-vouchers',
        '/public/api/product-vouchers/'
    ];
    for (const p of probeCandidates) {
        const urlAbs = (window.location.origin || '') + p;
        const r1 = await fetchJsonLoose(urlAbs, 'GET');
        if (r1 && (r1.success === true || Array.isArray(r1?.data))) {
            // assume customer-addresses sits alongside product-vouchers
            __resolvedCustomerAddrBase = urlAbs.replace(/product-vouchers\/?$/, 'customer-addresses');
            return __resolvedCustomerAddrBase;
        }
        const r2 = await fetchJsonLoose(p, 'GET');
        if (r2 && (r2.success === true || Array.isArray(r2?.data))) {
            __resolvedCustomerAddrBase = p.replace(/product-vouchers\/?$/, 'customer-addresses');
            return __resolvedCustomerAddrBase;
        }
    }
    // 4) fallback to first candidate
    __resolvedCustomerAddrBase = CUSTOMER_ADDR_API_BASES[0];
    return __resolvedCustomerAddrBase;
}

async function callCustomerAddressesApi(path = '', method = 'GET', data = null) {
    // First, try a resolved base derived from product-vouchers
    const inferred = await resolveCustomerAddressesBase();
    if (inferred) {
        const sep = (inferred.endsWith('/') || path.startsWith('/') || path.startsWith('?')) ? '' : '';
        const url = `${inferred}${sep}${path}`;
        const resp = await fetchJsonLoose(url, method, data);
        if (resp && (resp.success === true || Array.isArray(resp?.addresses) || typeof resp?.id !== 'undefined')) {
            return resp;
        }
        console.debug('[ADDR API] inferred base failed', inferred, resp);
    }
    // Then, try the generic candidates
    for (const base of CUSTOMER_ADDR_API_BASES) {
        const sep = (base.endsWith('/') || path.startsWith('/') || path.startsWith('?')) ? '' : '';
        const url = `${base}${sep}${path}`;
        const resp = await fetchJsonLoose(url, method, data);
        if (resp && (resp.success === true || Array.isArray(resp?.addresses) || typeof resp?.id !== 'undefined')) {
            return resp;
        }
        console.debug('[ADDR API] candidate base failed', base, resp);
    }
    return { success: false, message: 'Invalid response format' };
}

// Analytics functions
function loadAnalytics() {
    // Create a simple sales chart
    const ctx = document.getElementById('salesChart');
    if (ctx) {
        // Sample data for demonstration
        const salesData = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Sales (Millions Rp)',
                data: [120, 190, 300, 500, 200, 300],
                backgroundColor: 'rgba(220, 38, 38, 0.2)',
                borderColor: 'rgba(220, 38, 38, 1)',
                borderWidth: 2,
                fill: true
            }]
        };

        new Chart(ctx, {
            type: 'line',
            data: salesData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Monthly Sales Report'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Baru saja';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} menit yang lalu`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} jam yang lalu`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} hari yang lalu`;
    }
}

function showNotification(message, type = 'info', duration = 5000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 80px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);
}

// Search functionality (can be enhanced)
function searchTable(tableId, searchTerm) {
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Store Settings Functions
let storeSettings = {};
let currentShippingZones = [];

// Load store settings when settings section is accessed
async function loadStoreSettings() {
    try {
        const response = await apiCall('/api/settings');
        if (response && response.success) {
            storeSettings = response.data;
            populateStoreSettings();
        }
    } catch (error) {
        console.error('Error loading store settings:', error);
        showNotification('Error loading store settings', 'error');
    }
}

// Populate all settings forms with current data
function populateStoreSettings() {
    // Profile settings
    if (storeSettings.profile) {
        document.getElementById('storeName').value = storeSettings.profile.name || '';
        document.getElementById('storeTagline').value = storeSettings.profile.tagline || '';
        document.getElementById('storePhone').value = storeSettings.profile.phone || '';
        document.getElementById('storeEmail').value = storeSettings.profile.email || '';
        document.getElementById('storeWebsite').value = storeSettings.profile.website || '';
        document.getElementById('storeDescription').value = storeSettings.profile.description || '';
        
        // Show logo and banner previews
        if (storeSettings.profile.logo) {
            const logoPreview = document.getElementById('logoPreview');
            logoPreview.src = storeSettings.profile.logo;
            logoPreview.style.display = 'block';
        }
        
        if (storeSettings.profile.banner) {
            const bannerPreview = document.getElementById('bannerPreview');
            bannerPreview.src = storeSettings.profile.banner;
            bannerPreview.style.display = 'block';
        }
    }
    
    // Operating hours
    populateOperatingHours();
    
    // Address settings
    if (storeSettings.address) {
        document.getElementById('storeStreet').value = storeSettings.address.street || '';
        document.getElementById('storeCity').value = storeSettings.address.city || '';
        document.getElementById('storeProvince').value = storeSettings.address.province || '';
        document.getElementById('storePostalCode').value = storeSettings.address.postalCode || '';
        document.getElementById('storeCountry').value = storeSettings.address.country || 'Indonesia';
        
        currentShippingZones = storeSettings.address.shippingZones || [];
        populateShippingZones();
    }
    
    // Payment methods
    populatePaymentMethods();
    
    // Shipping methods
    populateShippingMethods();
    
    // Social media
    if (storeSettings.socialMedia) {
        document.getElementById('facebookUrl').value = storeSettings.socialMedia.facebook || '';
        document.getElementById('instagramUrl').value = storeSettings.socialMedia.instagram || '';
        document.getElementById('twitterUrl').value = storeSettings.socialMedia.twitter || '';
        document.getElementById('youtubeUrl').value = storeSettings.socialMedia.youtube || '';
        document.getElementById('tiktokUrl').value = storeSettings.socialMedia.tiktok || '';
        document.getElementById('whatsappNumber').value = storeSettings.socialMedia.whatsapp || '';
    }
}

// Operating Hours Functions
function populateOperatingHours() {
    const container = document.getElementById('operatingHoursContainer');
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    
    container.innerHTML = '';
    
    days.forEach((day, index) => {
        const dayData = storeSettings.operatingHours?.[day] || { open: '08:00', close: '22:00', isOpen: true };

        const dayDiv = document.createElement('div');
        dayDiv.className = 'row align-items-center mb-3 p-3 border rounded';
        dayDiv.innerHTML = `
            <div class="col-md-2">
                <strong>${dayNames[index]}</strong>
            </div>
            <div class="col-md-2">
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="${day}IsOpen" ${dayData.isOpen ? 'checked' : ''}>
                    <label class="form-check-label" for="${day}IsOpen">Buka</label>
                </div>
            </div>
            <div class="col-md-3">
                <label class="form-label small">Jam Buka</label>
                <input type="time" class="form-control" id="${day}Open" value="${dayData.open}" ${!dayData.isOpen ? 'disabled' : ''}>
            </div>
            <div class="col-md-3">
                <label class="form-label small">Jam Tutup</label>
                <input type="time" class="form-control" id="${day}Close" value="${dayData.close}" ${!dayData.isOpen ? 'disabled' : ''}>
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="copyToAllDays('${day}')">
                    <i class="fas fa-copy"></i> Salin ke Semua
                </button>
            </div>
        `;

        container.appendChild(dayDiv);

        // Add event listener for open/close toggle
        const checkbox = dayDiv.querySelector(`#${day}IsOpen`);
        const timeInputs = dayDiv.querySelectorAll(`input[type="time"]`);

        checkbox.addEventListener('change', function() {
            timeInputs.forEach(input => {
                input.disabled = !this.checked;
            });
        });
    });
}

function copyToAllDays(sourceDay) {
    const openTime = document.getElementById(`${sourceDay}Open`).value;
    const closeTime = document.getElementById(`${sourceDay}Close`).value;
    const isOpen = document.getElementById(`${sourceDay}IsOpen`).checked;
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
        if (day !== sourceDay) {
            document.getElementById(`${day}Open`).value = openTime;
            document.getElementById(`${day}Close`).value = closeTime;
            document.getElementById(`${day}IsOpen`).checked = isOpen;

            // Trigger change event
            const checkbox = document.getElementById(`${day}IsOpen`);
            checkbox.dispatchEvent(new Event('change'));
        }
    });
    
    showNotification('Jam operasional telah disalin ke semua hari', 'success');
}

// Shipping Zones Functions
function populateShippingZones() {
    const container = document.getElementById('shippingZonesContainer');
    container.innerHTML = '';
    
    currentShippingZones.forEach((zone, index) => {
        const zoneDiv = document.createElement('div');
        zoneDiv.className = 'shipping-zone-item border rounded p-2 mb-2';
        zoneDiv.innerHTML = `
            <div class="row align-items-center">
                <div class="col-md-4">
                    <input type="text" class="form-control form-control-sm" placeholder="Nama Zona" 
                           value="${zone.name}" onchange="updateShippingZone(${index}, 'name', this.value)">
                </div>
                <div class="col-md-3">
                    <input type="number" class="form-control form-control-sm" placeholder="Biaya (Rp)" 
                           value="${zone.cost}" onchange="updateShippingZone(${index}, 'cost', this.value)">
                </div>
                <div class="col-md-3">
                    <input type="text" class="form-control form-control-sm" placeholder="Estimasi (hari)" 
                           value="${zone.estimatedDays}" onchange="updateShippingZone(${index}, 'estimatedDays', this.value)">
                </div>
                <div class="col-md-2">
                    <button type="button" class="btn btn-sm btn-outline-primary me-1" title="Simpan" onclick="saveShippingZones()">
                        <i class="fas fa-save"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeShippingZone(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(zoneDiv);
    });
}

function addShippingZone() {
    currentShippingZones.push({ name: '', cost: 0, estimatedDays: '' });
    populateShippingZones();
    // focus the last added zone name input
    const container = document.getElementById('shippingZonesContainer');
    const inputs = container?.querySelectorAll('input.form-control-sm');
    if (inputs && inputs.length) {
        const nameInput = inputs[inputs.length - 3]; // first input of the last row
        if (nameInput) nameInput.focus();
    }
}

function updateShippingZone(index, field, value) {
    if (currentShippingZones[index]) {
        let v = value;
        if (field === 'cost') {
            const n = parseInt(String(value || '0'), 10);
            v = isNaN(n) ? 0 : n;
        }
        currentShippingZones[index][field] = v;
    }
}

function removeShippingZone(index) {
    currentShippingZones.splice(index, 1);
    populateShippingZones();
}

// Persist shipping zones immediately
async function saveShippingZones() {
    try {
        const addressData = {
            ...storeSettings.address,
            shippingZones: currentShippingZones.filter(z => (z.name || '').trim() && Number(z.cost) > 0)
        };
        const result = await apiCall('/api/settings/address', 'PUT', addressData);
        if (result && result.success) {
            storeSettings.address = { ...addressData };
            showNotification('Zona pengiriman disimpan', 'success');
        } else {
            showNotification(result?.message || 'Gagal menyimpan zona pengiriman', 'error');
        }
    } catch (e) {
        console.error('saveShippingZones error', e);
        showNotification('Terjadi kesalahan saat menyimpan zona pengiriman', 'error');
    }
}

// Payment Methods Functions
function populatePaymentMethods() {
    const container = document.getElementById('paymentMethodsContainer');
    container.innerHTML = '';
    
    if (!storeSettings.paymentMethods) return;
    
    storeSettings.paymentMethods.forEach(method => {
        const methodDiv = document.createElement('div');
        methodDiv.className = 'col-md-6 mb-3';
        methodDiv.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="card-title">${method.name}</h6>
                            <p class="card-text small text-muted">${method.description || ''}</p>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="payment_${method.id}" 
                                   ${method.enabled ? 'checked' : ''} onchange="togglePaymentMethod('${method.id}', this.checked)">
                        </div>
                    </div>
                    <div class="text-end">
                        <button class="btn btn-sm btn-outline-primary" onclick="showPaymentMethodModal('${method.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(methodDiv);
    });
}

function togglePaymentMethod(methodId, enabled) {
    const method = storeSettings.paymentMethods.find(m => m.id === methodId);
    if (method) {
        method.enabled = enabled;
    }
}

// Payment Method Modal helpers
function showPaymentMethodModal(id = null) {
    const modalEl = document.getElementById('paymentMethodModal');
    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    const title = document.getElementById('paymentMethodModalTitle');
    const idEl = document.getElementById('paymentMethodId');
    const nameEl = document.getElementById('paymentMethodName');
    const descEl = document.getElementById('paymentMethodDescription');
    const enabledEl = document.getElementById('paymentMethodEnabled');

    let pm = null;
    if (id) {
        pm = storeSettings.paymentMethods?.find(m => String(m.id) === String(id)) || null;
    }
    title.textContent = pm ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran';
    idEl.value = pm ? pm.id : '';
    nameEl.value = pm ? (pm.name || '') : '';
    descEl.value = pm ? (pm.description || '') : '';
    enabledEl.checked = pm ? !!pm.enabled : true;

    modal.show();
}

async function savePaymentMethod() {
    const idEl = document.getElementById('paymentMethodId');
    const nameEl = document.getElementById('paymentMethodName');
    const descEl = document.getElementById('paymentMethodDescription');
    const enabledEl = document.getElementById('paymentMethodEnabled');

    const name = nameEl.value.trim();
    if (!name) {
        showNotification('Nama metode wajib diisi', 'warning');
        return;
    }
    const description = descEl.value.trim();
    const enabled = !!enabledEl.checked;

    const id = idEl.value.trim();
    if (!Array.isArray(storeSettings.paymentMethods)) {
        storeSettings.paymentMethods = [];
    }

    if (id) {
        const idx = storeSettings.paymentMethods.findIndex(m => String(m.id) === String(id));
        if (idx !== -1) {
            storeSettings.paymentMethods[idx] = { ...storeSettings.paymentMethods[idx], name, description, enabled };
        }
    } else {
        const newId = 'pm_' + Math.random().toString(36).slice(2, 8);
        storeSettings.paymentMethods.push({ id: newId, name, description, enabled });
    }

    try {
        const result = await apiCall('/api/settings/payment-methods', 'PUT', storeSettings.paymentMethods);
        if (result && result.success) {
            storeSettings.paymentMethods = result.data || storeSettings.paymentMethods;
            populatePaymentMethods();
            bootstrap.Modal.getInstance(document.getElementById('paymentMethodModal')).hide();
            showNotification('Metode pembayaran tersimpan', 'success');
        } else {
            showNotification(result?.message || 'Gagal menyimpan metode pembayaran', 'error');
        }
    } catch (e) {
        console.error('savePaymentMethod error', e);
        showNotification('Terjadi kesalahan saat menyimpan metode pembayaran', 'error');
    }
}

// Shipping Methods Functions
function populateShippingMethods() {
    const container = document.getElementById('shippingMethodsContainer');
    container.innerHTML = '';
    
    if (!storeSettings.shippingMethods) return;
    
    storeSettings.shippingMethods.forEach(method => {
        const methodDiv = document.createElement('div');
        methodDiv.className = 'col-md-6 mb-3';
        methodDiv.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="card-title">${method.name}</h6>
                            <p class="card-text small text-muted">${method.description}</p>
                            <small class="text-info">Estimasi: ${method.estimatedDays} hari</small>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="shipping_${method.id}" 
                                   ${method.enabled ? 'checked' : ''} onchange="toggleShippingMethod('${method.id}', this.checked)">
                        </div>
                    </div>
                    <div class="text-end">
                        <button class="btn btn-sm btn-outline-primary" onclick="showShippingMethodModal('${method.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(methodDiv);
    });
}

function toggleShippingMethod(methodId, enabled) {
    const method = storeSettings.shippingMethods.find(m => m.id === methodId);
    if (method) {
        method.enabled = enabled;
    }
}

// Shipping Method Modal helpers
function showShippingMethodModal(id = null) {
    const modalEl = document.getElementById('shippingMethodModal');
    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    const title = document.getElementById('shippingMethodModalTitle');
    const idEl = document.getElementById('shippingMethodId');
    const nameEl = document.getElementById('shippingMethodName');
    const descEl = document.getElementById('shippingMethodDescription');
    const estEl = document.getElementById('shippingMethodEstimatedDays');
    const enabledEl = document.getElementById('shippingMethodEnabled');

    let sm = null;
    if (id) {
        sm = storeSettings.shippingMethods?.find(m => String(m.id) === String(id)) || null;
    }
    title.textContent = sm ? 'Edit Metode Pengiriman' : 'Tambah Metode Pengiriman';
    idEl.value = sm ? sm.id : '';
    nameEl.value = sm ? (sm.name || '') : '';
    descEl.value = sm ? (sm.description || '') : '';
    estEl.value = sm ? (sm.estimatedDays || '') : '';
    enabledEl.checked = sm ? !!sm.enabled : true;

    modal.show();
}

async function saveShippingMethod() {
    const idEl = document.getElementById('shippingMethodId');
    const nameEl = document.getElementById('shippingMethodName');
    const descEl = document.getElementById('shippingMethodDescription');
    const estEl = document.getElementById('shippingMethodEstimatedDays');
    const enabledEl = document.getElementById('shippingMethodEnabled');

    const name = nameEl.value.trim();
    if (!name) {
        showNotification('Nama metode pengiriman wajib diisi', 'warning');
        return;
    }
    const description = descEl.value.trim();
    const estimatedDays = estEl.value.trim();
    const enabled = !!enabledEl.checked;

    const id = idEl.value.trim();
    if (!Array.isArray(storeSettings.shippingMethods)) {
        storeSettings.shippingMethods = [];
    }

    if (id) {
        const idx = storeSettings.shippingMethods.findIndex(m => String(m.id) === String(id));
        if (idx !== -1) {
            storeSettings.shippingMethods[idx] = { ...storeSettings.shippingMethods[idx], name, description, estimatedDays, enabled };
        }
    } else {
        const newId = 'sm_' + Math.random().toString(36).slice(2, 8);
        storeSettings.shippingMethods.push({ id: newId, name, description, estimatedDays, enabled });
    }

    try {
        const result = await apiCall('/api/settings/shipping-methods', 'PUT', storeSettings.shippingMethods);
        if (result && result.success) {
            storeSettings.shippingMethods = result.data || storeSettings.shippingMethods;
            populateShippingMethods();
            bootstrap.Modal.getInstance(document.getElementById('shippingMethodModal')).hide();
            showNotification('Metode pengiriman tersimpan', 'success');
        } else {
            showNotification(result?.message || 'Gagal menyimpan metode pengiriman', 'error');
        }
    } catch (e) {
        console.error('saveShippingMethod error', e);
        showNotification('Terjadi kesalahan saat menyimpan metode pengiriman', 'error');
    }
}

// Save Functions
async function saveProfileSettings() {
    const profileData = {
        name: document.getElementById('storeName').value,
        tagline: document.getElementById('storeTagline').value,
        phone: document.getElementById('storePhone').value,
        email: document.getElementById('storeEmail').value,
        website: document.getElementById('storeWebsite').value,
        description: document.getElementById('storeDescription').value
    };
    
    // Handle logo and banner uploads if any
    const logoFile = document.getElementById('logoUpload').files[0];
    const bannerFile = document.getElementById('bannerUpload').files[0];
    
    try {
        // Upload images if selected
        if (logoFile) {
            const logoUrl = await uploadImage(logoFile);
            if (logoUrl) profileData.logo = logoUrl;
        }
        
        if (bannerFile) {
            const bannerUrl = await uploadImage(bannerFile);
            if (bannerUrl) profileData.banner = bannerUrl;
        }
        
        const result = await apiCall('/api/settings/profile', 'PUT', profileData);
        if (result && result.success) {
            showNotification('Profil toko berhasil disimpan!', 'success');
            storeSettings.profile = { ...storeSettings.profile, ...profileData };
        }
    } catch (error) {
        showNotification('Error saving profile settings', 'error');
    }
}

async function saveOperatingHours() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const operatingHours = {};
    
    days.forEach(day => {
        operatingHours[day] = {
            isOpen: document.getElementById(`${day}IsOpen`).checked,
            open: document.getElementById(`${day}Open`).value,
            close: document.getElementById(`${day}Close`).value
        };
    });
    
    try {
        const result = await apiCall('/api/settings/operating-hours', 'PUT', operatingHours);
        if (result && result.success) {
            showNotification('Jam operasional berhasil disimpan!', 'success');
            storeSettings.operatingHours = operatingHours;
        }
    } catch (error) {
        showNotification('Error saving operating hours', 'error');
    }
}

async function saveAddressSettings() {
    const addressData = {
        street: document.getElementById('storeStreet').value,
        city: document.getElementById('storeCity').value,
        province: document.getElementById('storeProvince').value,
        postalCode: document.getElementById('storePostalCode').value,
        country: document.getElementById('storeCountry').value,
        shippingZones: currentShippingZones.filter(zone => zone.name && zone.cost)
    };
    
    try {
        const result = await apiCall('/api/settings/address', 'PUT', addressData);
        if (result && result.success) {
            showNotification('Alamat dan zona pengiriman berhasil disimpan!', 'success');
            storeSettings.address = { ...storeSettings.address, ...addressData };
        }
    } catch (error) {
        showNotification('Error saving address settings', 'error');
    }
}

async function savePaymentMethods() {
    try {
        const result = await apiCall('/api/settings/payment-methods', 'PUT', storeSettings.paymentMethods);
        if (result && result.success) {
            showNotification('Metode pembayaran berhasil disimpan!', 'success');
        }
    } catch (error) {
        showNotification('Error saving payment methods', 'error');
    }
}

async function saveShippingMethods() {
    try {
        const result = await apiCall('/api/settings/shipping-methods', 'PUT', storeSettings.shippingMethods);
        if (result && result.success) {
            showNotification('Metode pengiriman berhasil disimpan!', 'success');
        }
    } catch (error) {
        showNotification('Error saving shipping methods', 'error');
    }
}

async function saveSocialMediaSettings() {
    const socialMediaData = {
        facebook: document.getElementById('facebookUrl').value,
        instagram: document.getElementById('instagramUrl').value,
        twitter: document.getElementById('twitterUrl').value,
        youtube: document.getElementById('youtubeUrl').value,
        tiktok: document.getElementById('tiktokUrl').value,
        whatsapp: document.getElementById('whatsappNumber').value
    };
    
    try {
        const result = await apiCall('/api/settings/social-media', 'PUT', socialMediaData);
        if (result && result.success) {
            showNotification('Pengaturan media sosial berhasil disimpan!', 'success');
            storeSettings.socialMedia = { ...storeSettings.socialMedia, ...socialMediaData };
        }
    } catch (error) {
        showNotification('Error saving social media settings', 'error');
    }
}

async function saveAllSettings() {
    showNotification('Menyimpan semua pengaturan...', 'info');
    
    try {
        await Promise.all([
            saveProfileSettings(),
            saveOperatingHours(),
            saveAddressSettings(),
            savePaymentMethods(),
            saveShippingMethods(),
            saveSocialMediaSettings()
        ]);
        
        showNotification('Semua pengaturan berhasil disimpan!', 'success');
    } catch (error) {
        showNotification('Error saving some settings', 'error');
    }
}

// Image upload helper function
async function uploadImage(file) {
    const formData = new FormData();
    formData.append('images', file);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        const result = await response.json();
        if (result.success && result.files.length > 0) {
            return result.files[0].url;
        }
    } catch (error) {
        console.error('Error uploading image:', error);
    }
    
    return null;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing admin panel...');
    
    // Only run if we're not on login page
    if (window.location.pathname.includes('login.html') || window.location.pathname === '/login') {
        console.log('📝 On login page, skipping admin initialization');
        return;
    }
    
    // Check authentication
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || localStorage.getItem('token');
    if (!token) {
        console.log('❌ No token found, redirecting to login');
        redirectToLogin();
        return;
    }
    
    // Set global auth token (both let and window)
    window.authToken = token;
    authToken = token;
    
    // Initialize the application
    try {
        initializeApp();
        console.log('✅ Admin panel initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing admin panel:', error);
    }
    
    // Force initialize widgets if on widgets page (with delay)
    setTimeout(() => {
        try {
            const currentSection = document.querySelector('.content-section:not([style*="display: none"])');
            if (currentSection && currentSection.id === 'widgets') {
                console.log('🎯 Widgets section is active, force loading...');
                if (typeof loadWidgetsList === 'function') {
                    loadWidgetsList();
                }
            }
        } catch (error) {
            console.error('❌ Error loading widgets:', error);
        }
    }, 2000);
});

// Image preview handlers
document.addEventListener('DOMContentLoaded', function() {
    const logoUpload = document.getElementById('logoUpload');
    const bannerUpload = document.getElementById('bannerUpload');
    
    if (logoUpload) {
        logoUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const logoPreview = document.getElementById('logoPreview');
                    logoPreview.src = e.target.result;
                    logoPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (bannerUpload) {
        bannerUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const bannerPreview = document.getElementById('bannerPreview');
                    bannerPreview.src = e.target.result;
                    bannerPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

// Update showSection function to load settings when needed
const originalShowSectionForSettings = showSection;
showSection = function(sectionName) {
    originalShowSectionForSettings(sectionName);
    
    if (sectionName === 'settings') {
        loadStoreSettings();
    } else if (sectionName === 'analytics') {
        setTimeout(() => {
            loadAnalyticsData(currentAnalyticsPeriod);
        }, 100);
    } else if (sectionName === 'promotions') {
        loadPromotions();
    }
};

// Promotions functionality
let currentEditingId = null;

// Load promotions section
async function loadPromotions() {
    console.log('loadPromotions function called');
    try {
        console.log('Loading promotion stats...');
        await loadPromotionStats();
        console.log('Loading vouchers...');
        await loadVouchers();
        console.log('Loading product discounts...');
        await loadProductDiscounts();
        console.log('Loading flash sales...');
        await loadFlashSales();
        console.log('Loading free shipping...');
        await loadFreeShipping();
        console.log('Loading promotion modals...');
        loadPromotionModals();
        console.log('Promotions loaded successfully');
    } catch (error) {
        console.error('Error loading promotions:', error);
        showNotification('Error loading promotions', 'error');
    }
}

// Load promotion statistics
async function loadPromotionStats() {
    try {
        console.log('Calling /api/promotions/analytics...');
        const response = await apiCall('/api/promotions/analytics');
        console.log('Promotion stats response:', response);
        if (response && response.success) {
            displayPromotionStats(response.data);
        } else {
            console.log('No promotion stats data or unsuccessful response');
            // Display empty stats if no data
            displayPromotionStats({
                vouchers: { active: 0, total: 0 },
                flashSales: { active: 0 },
                productDiscounts: { active: 0 },
                totalSavings: 0
            });
        }
    } catch (error) {
        console.error('Error loading promotion stats:', error);
        // Display empty stats on error
        displayPromotionStats({
            vouchers: { active: 0, total: 0 },
            flashSales: { active: 0 },
            productDiscounts: { active: 0 },
            totalSavings: 0
        });
    }
}

// Display promotion statistics
function displayPromotionStats(stats) {
    const statsCards = document.getElementById('promotionStatsCards');
    if (!statsCards) return;
    
    statsCards.innerHTML = `
        <div class="col-md-3">
            <div class="card bg-primary text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">Voucher Aktif</h6>
                            <div class="h4 mb-0">${stats.vouchers?.active || 0}</div>
                            <small>dari ${stats.vouchers?.total || 0} total</small>
                        </div>
                        <i class="fas fa-ticket-alt fa-2x opacity-75"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-warning text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">Flash Sale</h6>
                            <div class="h4 mb-0">${stats.flashSales?.active || 0}</div>
                            <small>sedang berlangsung</small>
                        </div>
                        <i class="fas fa-bolt fa-2x opacity-75"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-success text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">Diskon Produk</h6>
                            <div class="h4 mb-0">${stats.productDiscounts?.active || 0}</div>
                            <small>produk dengan diskon</small>
                        </div>
                        <i class="fas fa-percent fa-2x opacity-75"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-info text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">Total Penghematan</h6>
                            <div class="h4 mb-0">Rp ${formatCurrency(stats.totalSavings || 0)}</div>
                            <small>dari semua promo</small>
                        </div>
                        <i class="fas fa-coins fa-2x opacity-75"></i>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Load vouchers
async function loadVouchers() {
    try {
        // show loading in table if present
        const tbody = document.getElementById('vouchersTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-3">
                        <i class="fas fa-spinner fa-spin me-1"></i> Memuat vouchers...
                    </td>
                </tr>`;
        }

        console.log('[Vouchers] calling /api/vouchers ...');
        const response = await apiCall('/api/vouchers');
        console.log('[Vouchers] API response:', response);
        const data = Array.isArray(response) ? response : (response && Array.isArray(response.data) ? response.data : []);
        console.log(`[Vouchers] items: ${data.length}`);
        displayVouchers(data);
    } catch (error) {
        console.error('[Vouchers] load error:', error);
        displayVouchers([]);
    }
}

// Display vouchers (supports table in index.html and card list fallback)
function displayVouchers(vouchers) {
    const tbody = document.getElementById('vouchersTableBody');
    const list = document.getElementById('vouchersList');

    // Normalize array
    const items = Array.isArray(vouchers) ? vouchers : [];

    // Table renderer for index.html
    if (tbody) {
        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center text-muted">Belum ada voucher</td>
                </tr>`;
            return;
        }
        tbody.innerHTML = items.map(v => {
            const code = v.code || '';
            const name = v.name || '';
            const type = v.type || v.voucher_type || '';
            const value = parseInt(v.value ?? v.voucher_value ?? 0) || 0;
            const minPurchase = parseInt(v.minPurchase ?? v.min_purchase ?? 0) || 0;
            const usageLimit = parseInt(v.usageLimit ?? v.usage_limit ?? 0) || 0;
            const usedCount = parseInt(v.usedCount ?? v.used_count ?? 0) || 0;
            const startDate = v.startDate || v.start_date || null;
            const endDate = v.endDate || v.end_date || null;
            const isActive = (v.isActive === true) || (parseInt(v.is_active) === 1);
            const statusHtml = isActive ? '<span class="badge bg-success">Aktif</span>' : '<span class="badge bg-secondary">Tidak Aktif</span>';
            const valueHtml = type === 'percentage' ? `${value}%` : `Rp ${formatCurrency(value)}`;
            const usageHtml = `${usedCount}/${usageLimit || '∞'}`;
            return `
                <tr>
                    <td><span class="badge bg-primary">${code}</span></td>
                    <td>${name}</td>
                    <td>${type}</td>
                    <td>${valueHtml}</td>
                    <td>Rp ${formatCurrency(minPurchase)}</td>
                    <td>${usageHtml}</td>
                    <td>${startDate ? formatDate(startDate) : '-'}</td>
                    <td>${endDate ? formatDate(endDate) : '-'}</td>
                    <td>${statusHtml}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="editVoucher('${v.id || ''}')"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-outline-danger" onclick="deleteVoucher('${v.id || ''}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
        return;
    }

    // Card list fallback (older layout)
    if (list) {
        if (items.length === 0) {
            list.innerHTML = '<p class="text-muted text-center">Belum ada voucher yang dibuat.</p>';
            return;
        }
        list.innerHTML = items.map(voucher => {
            const usageLimit = voucher.usageLimit ?? voucher.usage_limit ?? 0;
            const usedCount = voucher.usedCount ?? voucher.used_count ?? 0;
            const startDate = voucher.startDate ?? voucher.start_date;
            const endDate = voucher.endDate ?? voucher.end_date;
            const isActive = (voucher.isActive === true) || (parseInt(voucher.is_active) === 1);
            const usagePercentage = usageLimit > 0 ? (usedCount / usageLimit) * 100 : 0;
            const isExpired = endDate ? (new Date(endDate) < new Date()) : false;
            const statusBadge = isActive && !isExpired ? '<span class="badge bg-success">Aktif</span>' : '<span class="badge bg-secondary">Tidak Aktif</span>';
            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <div class="d-flex align-items-center mb-2">
                                    <h6 class="mb-0 me-3">${voucher.name || ''}</h6>
                                    ${statusBadge}
                                    <span class="badge bg-primary ms-2">${voucher.code || ''}</span>
                                </div>
                                <p class="text-muted mb-2">${voucher.description || ''}</p>
                                <div class="row">
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-calendar me-1"></i>
                                            ${startDate ? formatDate(startDate) : '-'} - ${endDate ? formatDate(endDate) : '-'}
                                        </small>
                                    </div>
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-users me-1"></i>
                                            ${usedCount}/${usageLimit || '∞'} digunakan
                                        </small>
                                    </div>
                                </div>
                                ${usageLimit > 0 ? `
                                    <div class="progress mt-2" style="height: 6px;">
                                        <div class="progress-bar" role="progressbar" style="width: ${usagePercentage}%"></div>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="col-md-4 text-end">
                                <div class="mb-2">
                                    <strong class="text-primary">
                                        ${(voucher.type === 'percentage' ? (voucher.value ?? 0) + '%' : 'Rp ' + formatCurrency(voucher.value ?? 0))}
                                    </strong>
                                </div>
                                <div class="btn-group">
                                    <button class="btn btn-sm btn-outline-primary" onclick="editVoucher('${voucher.id || ''}')"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteVoucher('${voucher.id || ''}')"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }
}

// Load product discounts
async function loadProductDiscounts() {
    try {
        const response = await apiCall('/api/product-discounts');
        if (response.success) {
            displayProductDiscounts(response.data);
        }
    } catch (error) {
        console.error('Error loading product discounts:', error);
    }
}

// Display product discounts
function displayProductDiscounts(discounts) {
    const discountsList = document.getElementById('productDiscountsList');
    if (!discountsList) return;
    
    if (discounts.length === 0) {
        discountsList.innerHTML = '<p class="text-muted text-center">Belum ada diskon produk yang dibuat.</p>';
        return;
    }

    discountsList.innerHTML = discounts.map(discount => {
        const isExpired = new Date(discount.endDate) < new Date();
        const statusBadge = discount.isActive && !isExpired ? 
            '<span class="badge bg-success">Aktif</span>' : 
            '<span class="badge bg-secondary">Tidak Aktif</span>';

        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <div class="d-flex align-items-center mb-2">
                                <h6 class="mb-0 me-3">${discount.productName}</h6>
                                ${statusBadge}
                            </div>
                            <p class="text-muted mb-2">${discount.reason || 'Diskon khusus'}</p>
                            <div class="row">
                                <div class="col-sm-6">
                                    <small class="text-muted">
                                        <i class="fas fa-calendar me-1"></i>
                                        ${formatDate(discount.startDate)} - ${formatDate(discount.endDate)}
                                    </small>
                                </div>
                                <div class="col-sm-6">
                                    <small class="text-muted">
                                        <i class="fas fa-tag me-1"></i>
                                        Hemat Rp ${formatCurrency(discount.originalPrice - discount.discountedPrice)}
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="mb-2">
                                <div class="text-decoration-line-through text-muted">Rp ${formatCurrency(discount.originalPrice)}</div>
                                <strong class="text-success">Rp ${formatCurrency(discount.discountedPrice)}</strong>
                            </div>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-primary" onclick="editProductDiscount('${discount.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteProductDiscount('${discount.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Load flash sales
async function loadFlashSales() {
    try {
        const response = await apiCall('/api/flash-sales');
        if (response.success) {
            displayFlashSales(response.data);
        }
    } catch (error) {
        console.error('Error loading flash sales:', error);
    }
}

// Display flash sales
function displayFlashSales(flashSales) {
    const flashSalesList = document.getElementById('flashSalesList');
    if (!flashSalesList) return;
    
    if (flashSales.length === 0) {
        flashSalesList.innerHTML = '<p class="text-muted text-center">Belum ada flash sale yang dibuat.</p>';
        return;
    }

    flashSalesList.innerHTML = flashSales.map(flashSale => {
        const isExpired = new Date(flashSale.endDate) < new Date();
        const statusBadge = flashSale.isActive && !isExpired ? 
            '<span class="badge bg-success">Aktif</span>' : 
            '<span class="badge bg-secondary">Tidak Aktif</span>';

        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <div class="d-flex align-items-center mb-2">
                                <h6 class="mb-0 me-3">${flashSale.name}</h6>
                                ${statusBadge}
                                <span class="badge bg-danger ms-2">${flashSale.discountPercentage}% OFF</span>
                            </div>
                            <p class="text-muted mb-2">${flashSale.description}</p>
                            <div class="row">
                                <div class="col-sm-6">
                                    <small class="text-muted">
                                        <i class="fas fa-calendar me-1"></i>
                                        ${formatDate(flashSale.startDate)} - ${formatDate(flashSale.endDate)}
                                    </small>
                                </div>
                                <div class="col-sm-6">
                                    <small class="text-muted">
                                        <i class="fas fa-box me-1"></i>
                                        ${flashSale.products?.length || 0} produk terlibat
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="mb-2">
                                <strong class="text-danger">${flashSale.discountPercentage}% Diskon</strong>
                            </div>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-primary" onclick="editFlashSale('${flashSale.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteFlashSale('${flashSale.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Load free shipping promotions
async function loadFreeShipping() {
    try {
        const response = await apiCall('/api/free-shipping');
        if (response.success) {
            displayFreeShipping(response.data);
        }
    } catch (error) {
        console.error('Error loading free shipping:', error);
    }
}

// Display free shipping promotions
function displayFreeShipping(promotions) {
    const freeShippingList = document.getElementById('freeShippingList');
    if (!freeShippingList) return;
    
    if (promotions.length === 0) {
        freeShippingList.innerHTML = '<p class="text-muted text-center">Belum ada promo gratis ongkir yang dibuat.</p>';
        return;
    }

    freeShippingList.innerHTML = promotions.map(promo => {
        const isExpired = new Date(promo.endDate) < new Date();
        const statusBadge = promo.isActive && !isExpired ? 
            '<span class="badge bg-success">Aktif</span>' : 
            '<span class="badge bg-secondary">Tidak Aktif</span>';

        let conditionText = '';
        if (promo.type === 'location') {
            conditionText = `Lokasi: ${promo.conditions.locations.join(', ')}`;
        } else if (promo.type === 'amount') {
            conditionText = `Min. pembelian: Rp ${formatCurrency(promo.conditions.minAmount)}`;
        } else if (promo.type === 'category') {
            conditionText = `Kategori: ${promo.conditions.categories.join(', ')}`;
        }

        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <div class="d-flex align-items-center mb-2">
                                <h6 class="mb-0 me-3">${promo.name}</h6>
                                ${statusBadge}
                                <span class="badge bg-info ms-2">GRATIS ONGKIR</span>
                            </div>
                            <p class="text-muted mb-2">${promo.description}</p>
                            <div class="row">
                                <div class="col-sm-6">
                                    <small class="text-muted">
                                        <i class="fas fa-calendar me-1"></i>
                                        ${formatDate(promo.startDate)} - ${formatDate(promo.endDate)}
                                    </small>
                                </div>
                                <div class="col-sm-6">
                                    <small class="text-muted">
                                        <i class="fas fa-info-circle me-1"></i>
                                        ${conditionText}
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="mb-2">
                                <strong class="text-info">Gratis Ongkir</strong>
                            </div>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-primary" onclick="editFreeShipping('${promo.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteFreeShipping('${promo.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Refresh promotions
function refreshPromotions() {
    loadPromotions();
    showNotification('Data promosi berhasil diperbarui', 'success');
}

// Load promotion modals
function loadPromotionModals() {
    // Check if modals container exists, if not create it
    let modalsContainer = document.getElementById('promotionModalsContainer');
    if (!modalsContainer) {
        modalsContainer = document.createElement('div');
        modalsContainer.id = 'promotionModalsContainer';
        document.body.appendChild(modalsContainer);
    }
    
    modalsContainer.innerHTML = `
        <!-- Voucher Modal -->
        <div class="modal fade" id="voucherModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="fas fa-ticket-alt me-2"></i>Voucher Belanja</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="voucherForm">
                            <input type="hidden" id="voucherId">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Kode Voucher *</label>
                                        <input type="text" class="form-control" id="voucherCode" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Nama Voucher *</label>
                                        <input type="text" class="form-control" id="voucherName" required>
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Deskripsi</label>
                                <textarea class="form-control" id="voucherDescription" rows="2"></textarea>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Tipe Diskon *</label>
                                        <select class="form-select" id="voucherType" required>
                                            <option value="percentage">Persentase (%)</option>
                                            <option value="fixed_amount">Nominal (Rp)</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Nilai Diskon *</label>
                                        <input type="number" class="form-control" id="voucherValue" required>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Pembelian Minimal (Rp)</label>
                                        <input type="number" class="form-control" id="voucherMinPurchase" value="0">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Maksimal Diskon (Rp)</label>
                                        <input type="number" class="form-control" id="voucherMaxDiscount" value="0">
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Batas Penggunaan</label>
                                        <input type="number" class="form-control" id="voucherUsageLimit" value="0">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="voucherIsActive">
                                            <option value="true">Aktif</option>
                                            <option value="false">Tidak Aktif</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Tanggal Mulai *</label>
                                        <input type="datetime-local" class="form-control" id="voucherStartDate" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Tanggal Berakhir *</label>
                                        <input type="datetime-local" class="form-control" id="voucherEndDate" required>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                        <button type="button" class="btn btn-primary" onclick="saveVoucher()">Simpan</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Modal functions
function openVoucherModal(id = null) {
    currentEditingId = id;
    loadPromotionModals(); // Ensure modals are loaded
    
    const modal = new bootstrap.Modal(document.getElementById('voucherModal'));
    
    if (id) {
        // Edit mode - load voucher data
        loadVoucherData(id);
    } else {
        // Add mode - clear form
        document.getElementById('voucherForm').reset();
        document.getElementById('voucherId').value = '';
    }
    
    modal.show();
}

// Load voucher data for editing
async function loadVoucherData(id) {
    try {
        const response = await apiCall(`/api/vouchers/${id}`);
        if (response.success) {
            const voucher = response.data;
            document.getElementById('voucherId').value = voucher.id;
            document.getElementById('voucherCode').value = voucher.code;
            document.getElementById('voucherName').value = voucher.name;
            document.getElementById('voucherDescription').value = voucher.description;
            document.getElementById('voucherType').value = voucher.type;
            document.getElementById('voucherValue').value = voucher.value;
            document.getElementById('voucherMinPurchase').value = voucher.minPurchase;
            document.getElementById('voucherMaxDiscount').value = voucher.maxDiscount;
            document.getElementById('voucherUsageLimit').value = voucher.usageLimit;
            document.getElementById('voucherIsActive').value = voucher.isActive.toString();
            document.getElementById('voucherStartDate').value = new Date(voucher.startDate).toISOString().slice(0, 16);
            document.getElementById('voucherEndDate').value = new Date(voucher.endDate).toISOString().slice(0, 16);
        }
    } catch (error) {
        console.error('Error loading voucher data:', error);
        showNotification('Error loading voucher data', 'error');
    }
}

// Save voucher
async function saveVoucher() {
    try {
        const voucherId = document.getElementById('voucherId').value;
        
        const voucherData = {
            code: document.getElementById('voucherCode').value,
            name: document.getElementById('voucherName').value,
            description: document.getElementById('voucherDescription').value,
            type: document.getElementById('voucherType').value,
            value: parseFloat(document.getElementById('voucherValue').value),
            minPurchase: parseFloat(document.getElementById('voucherMinPurchase').value) || 0,
            maxDiscount: parseFloat(document.getElementById('voucherMaxDiscount').value) || 0,
            usageLimit: parseInt(document.getElementById('voucherUsageLimit').value) || 0,
            isActive: document.getElementById('voucherIsActive').value === 'true',
            startDate: document.getElementById('voucherStartDate').value,
            endDate: document.getElementById('voucherEndDate').value
        };

        const endpoint = voucherId ? `/api/vouchers/${voucherId}` : '/api/vouchers';
        const method = voucherId ? 'PUT' : 'POST';

        const response = await apiCall(endpoint, method, voucherData);

        if (response.success) {
            showNotification(response.message || 'Voucher berhasil disimpan', 'success');
            bootstrap.Modal.getInstance(document.getElementById('voucherModal')).hide();
            loadVouchers();
            loadPromotionStats();
        } else {
            throw new Error(response.message || 'Failed to save voucher');
        }
    } catch (error) {
        console.error('Error saving voucher:', error);
        showNotification('Gagal menyimpan voucher', 'error');
    }
}

// Delete voucher
async function deleteVoucher(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus voucher ini?')) {
        return;
    }

    try {
        const response = await apiCall(`/api/vouchers/${id}`, 'DELETE');
        if (response.success) {
            showNotification('Voucher berhasil dihapus', 'success');
            loadVouchers();
            loadPromotionStats();
        } else {
            throw new Error(response.message || 'Failed to delete voucher');
        }
    } catch (error) {
        console.error('Error deleting voucher:', error);
        showNotification('Gagal menghapus voucher', 'error');
    }
}

// Edit functions
function editVoucher(id) {
    openVoucherModal(id);
}

// Promotion functions are handled by promotions.js
// These functions will be available after promotions.js loads

// Analytics Chart Variables
let revenueChart = null;
let categoryChart = null;
let productSalesChart = null;
let categoryRevenueChart = null;
let visitorTrendChart = null;
let performanceChart = null;
let currentChartPeriod = '7days';
let currentAnalyticsPeriod = '7days';
let currentCategoryFilter = 'all';
let currentChartType = 'all';
let currentTopProductsLimit = 10;

// Use static, in-memory analytics without database/API
const USE_MOCK_ANALYTICS = false;

// -------- Mock Analytics Data Generators (Sales & Purchases) --------
function generateMockRevenueTrend(period) {
    const now = new Date();
    let days = 7;
    if (period === '30days') days = 30;
    else if (period === '90days') days = 90;
    else if (period === '365days') days = 365;

    const trend = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const orders = Math.floor(20 + Math.random() * 80);
        const avgOrder = 75000 + Math.random() * 350000; // Rp
        const revenue = Math.round(orders * avgOrder);
        // Simulate purchases (COGS) as 60-75% of revenue
        const purchases = Math.round(revenue * (0.6 + Math.random() * 0.15));
        trend.push({ date: d.toISOString().slice(0, 10), orders, revenue, purchases });
    }
    return trend;
}

function generateMockCategoryData() {
    const cats = ['Electronics', 'Fashion', 'Books', 'Home', 'Beauty', 'Sports'];
    return cats.map(name => {
        const sold = Math.floor(100 + Math.random() * 900);
        const avg = 90000 + Math.random() * 500000;
        const totalRevenue = Math.round(sold * avg);
        return { name, sold, totalRevenue };
    });
}

function generateMockProductSales(limit = 10) {
    const list = [];
    for (let i = 1; i <= limit; i++) {
        const sold = Math.floor(50 + Math.random() * 450);
        const revenue = Math.round(sold * (70000 + Math.random() * 400000));
        list.push({ name: `Produk ${i}`, sold, revenue });
    }
    return list;
}

function generateMockVisitors(days = 7) {
    const now = new Date();
    const arr = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const visitors = Math.floor(80 + Math.random() * 220);
        const orders = Math.floor(visitors * (0.05 + Math.random() * 0.15));
        arr.push({ date: d.toISOString().slice(0, 10), visitors, orders });
    }
    return arr;
}

function getMockAnalyticsBundle(period) {
    const revenueTrend = generateMockRevenueTrend(period);
    const categorySales = generateMockCategoryData();
    const productSales = generateMockProductSales(10);
    const visitorData = generateMockVisitors(period === '30days' ? 30 : period === '90days' ? 90 : period === '365days' ? 365 : 7);
    const totalRevenue = revenueTrend.reduce((s, x) => s + x.revenue, 0);
    const totalOrders = revenueTrend.reduce((s, x) => s + x.orders, 0);
    return {
        summary: {
            totalSales: { amount: totalRevenue, count: totalOrders },
            topProduct: { name: productSales[0].name, sold: productSales[0].sold }
        },
        revenueTrend,
        categorySales,
        productSales,
        visitorData
    };
}

// Analytics Functions
async function loadAnalyticsData() {
    try {
        console.log('Loading analytics data...');

        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded!');
            showNotification('Chart.js library not loaded', 'error');
            return;
        }

        const analyticsSection = document.getElementById('analytics');
        if (analyticsSection) {
            analyticsSection.style.display = 'block';
        }

        // If using mock analytics, build data locally and render charts
        if (USE_MOCK_ANALYTICS) {
            const mock = getMockAnalyticsBundle(currentChartPeriod);
            updateAnalyticsSummary(mock);
            updateRevenueChart(mock.revenueTrend);
            updateCategoryChart(mock.categorySales);
            updateCategoryRevenueChart(mock.categorySales);
            updateProductSalesChart(mock.productSales);
            updateVisitorTrendChart(mock.visitorData);
            showNotification('Analytics ditampilkan dengan data contoh (tanpa database)', 'success');
            return;
        }

        // Fallback to API calls (real-time)
        const period = currentChartPeriod || currentAnalyticsPeriod || '7days';
        const [analyticsResponse, productSalesResponse, categorySalesResponse, salesTrendResponse] = await Promise.all([
            apiCall(`/api/analytics?period=${period}`).catch(err => ({ success: false, error: err })),
            apiCall(`/api/analytics/product-sales?limit=10&period=${period}`).catch(err => ({ success: false, error: err })),
            apiCall(`/api/analytics/category-sales?period=${period}`).catch(err => ({ success: false, error: err })),
            apiCall(`/api/analytics/sales-trend?period=${period}`).catch(err => ({ success: false, error: err }))
        ]);

        if (analyticsResponse && analyticsResponse.summary) updateAnalyticsSummary(analyticsResponse);
        if (salesTrendResponse && salesTrendResponse.data) updateRevenueChart(salesTrendResponse.data);
        if (categorySalesResponse && categorySalesResponse.data) {
            updateCategoryChart(categorySalesResponse.data);
            updateCategoryRevenueChart(categorySalesResponse.data);
        }
        if (productSalesResponse && productSalesResponse.data) updateProductSalesChart(productSalesResponse.data);

        showNotification('Analytics data loaded', 'success');
    } catch (error) {
        console.error('Error loading analytics data:', error);
        showNotification('Error loading analytics data', 'error');
    }
}

function updateAnalyticsSummary(data) {
    if (!data || !data.summary) return;
    
    const summary = data.summary;
    
    // Update summary cards with null checks
    const totalSalesAmountEl = document.getElementById('totalSalesAmount');
    const totalSalesCountEl = document.getElementById('totalSalesCount');
    const totalVisitorsEl = document.getElementById('totalVisitors');
    const todayVisitorsEl = document.getElementById('todayVisitors');
    const topProductNameEl = document.getElementById('topProductName');
    const topProductSalesEl = document.getElementById('topProductSales');
    const conversionRateEl = document.getElementById('conversionRate');
    
    if (totalSalesAmountEl && summary.totalSales) {
        totalSalesAmountEl.textContent = formatCurrency(summary.totalSales.amount || 0);
    }
    if (totalSalesCountEl && summary.totalSales) {
        totalSalesCountEl.textContent = `${summary.totalSales.count || 0} transaksi`;
    }
    if (totalVisitorsEl) {
        totalVisitorsEl.textContent = (summary.totalVisitors || 0).toLocaleString();
    }
    if (todayVisitorsEl) {
        todayVisitorsEl.textContent = data.visitorStats?.today || 0;
    }
    if (topProductNameEl && summary.topProduct) {
        topProductNameEl.textContent = summary.topProduct.name || '-';
    }
    if (topProductSalesEl && summary.topProduct) {
        topProductSalesEl.textContent = summary.topProduct.sold || 0;
    }

    // Placeholder functions for other features
    function openProductDiscountModal() {
        showNotification('Fitur diskon produk akan segera tersedia', 'info');
    }

    function openFlashSaleModal() {
        showNotification('Fitur flash sale akan segera tersedia', 'info');
    }

    function openFreeShippingModal() {
        showNotification('Fitur gratis ongkir akan segera tersedia', 'info');
    }
}

function updateProductSalesChart(productData) {
    const ctx = document.getElementById('productSalesChart');
    if (!ctx || !productData || !Array.isArray(productData)) return;

    if (productSalesChart) {
        productSalesChart.destroy();
    }

    const labels = productData.map(item => {
        const baseName = item.name || item.category || (item.id ? `Produk #${item.id}` : 'Tanpa Nama');
        return baseName.length > 25 ? baseName.substring(0, 25) + '...' : baseName;
    });
    const data = productData.map(item => item.sold || 0);

    productSalesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Terjual',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Jumlah Terjual'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Produk'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return productData[context[0].dataIndex].name;
                        }
                    }
                }
            }
        }
    });
}

function updateCategoryRevenueChart(categoryData) {
    const ctx = document.getElementById('categoryRevenueChart');
    if (!ctx) return;

    if (categoryRevenueChart) {
        categoryRevenueChart.destroy();
    }

    // Normalise raw categories into 4 revenue buckets
    const buckets = {
        laptop: 0,
        handphone: 0,
        tablet: 0,
        accessories: 0,
    };

    if (Array.isArray(categoryData)) {
        categoryData.forEach(item => {
            const raw = (item.name || '').toString().toLowerCase();
            const revenue = Number(item.totalRevenue || item.revenue || 0) || 0;
            if (!revenue) return;

            if (['laptop', 'laptops'].includes(raw)) {
                buckets.laptop += revenue;
            } else if (['handphone', 'hp', 'smartphone', 'smartphones', 'phone', 'phones'].includes(raw)) {
                buckets.handphone += revenue;
            } else if (['tablet', 'tablets', 'tab', 'ipad'].includes(raw)) {
                buckets.tablet += revenue;
            } else if (['accessory', 'accessories', 'aksesoris', 'aksessories', 'aksesoriss'].includes(raw)) {
                buckets.accessories += revenue;
            }
        });
    }

    const labels = ['Laptop', 'Handphone', 'Tablet', 'Accessories'];
    const data = [
        buckets.laptop,
        buckets.handphone,
        buckets.tablet,
        buckets.accessories,
    ];

    categoryRevenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue (Rp)',
                data: data,
                backgroundColor: 'rgba(255, 159, 64, 0.8)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Revenue (Rp)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Kategori'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Revenue: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            }
        }
    });
}

function updateVisitorTrendChart(visitorData) {
    const ctx = document.getElementById('visitorTrendChart');
    if (!ctx) {
        console.error('Visitor trend chart canvas not found');
        return;
    }

    if (visitorTrendChart) {
        visitorTrendChart.destroy();
    }

    // Use mock data if no data provided
    if (!visitorData || !Array.isArray(visitorData) || visitorData.length === 0) {
        console.log('Using mock data for visitor trend chart');
        visitorData = [
            { date: '2024-01-10', visitors: 120, orders: 8 },
            { date: '2024-01-11', visitors: 145, orders: 12 },
            { date: '2024-01-12', visitors: 98, orders: 6 },
            { date: '2024-01-13', visitors: 167, orders: 15 },
            { date: '2024-01-14', visitors: 189, orders: 18 },
            { date: '2024-01-15', visitors: 156, orders: 14 },
            { date: '2024-01-16', visitors: 178, orders: 16 }
        ];
    }

    const labels = visitorData.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
    });

    const visitorsData = visitorData.map(item => item.visitors || 0);
    const ordersData = visitorData.map(item => item.orders || 0);

    visitorTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pengunjung',
                data: visitorsData,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.1
            }, {
                label: 'Pesanan',
                data: ordersData,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Jumlah'
                    }
                }
            }
        }
    });
}

function updateProductStatsTable(productStats) {
    const tbody = document.getElementById('productStatsTable');
    if (!tbody || !productStats || !Array.isArray(productStats)) return;

    tbody.innerHTML = productStats.slice(0, 10).map(product => `
        <tr>
            <td>${product.name || 'Unknown Product'}</td>
            <td>${product.sold || 0}</td>
            <td>${formatCurrency(product.revenue || 0)}</td>
            <td>${product.percentage || 0}%</td>
        </tr>
    `).join('');
}

function updateTopProductsList(topProducts) {
    const container = document.getElementById('topProductsList');
    if (!container || !topProducts || !Array.isArray(topProducts)) return;

    container.innerHTML = topProducts.slice(0, 10).map((product, index) => `
        <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
            <div>
                <span class="badge bg-primary me-2">#${index + 1}</span>
                <strong>${product.name || 'Unknown Product'}</strong>
            </div>
            <div class="text-end">
                <div class="fw-bold">${product.sold || 0} terjual</div>
                <small class="text-muted">${formatCurrency(product.revenue || 0)}</small>
            </div>
        </div>
    `).join('');
}

function updateVisitorStats(visitorStats) {
    if (!visitorStats) return;

    const visitorTodayEl = document.getElementById('visitorToday');
    const visitorWeekEl = document.getElementById('visitorWeek');
    const visitorMonthEl = document.getElementById('visitorMonth');
    const visitorAverageEl = document.getElementById('visitorAverage');
    const peakHourEl = document.getElementById('peakHour');

    if (visitorTodayEl) visitorTodayEl.textContent = visitorStats.today || 0;
    if (visitorWeekEl) visitorWeekEl.textContent = visitorStats.week || 0;
    if (visitorMonthEl) visitorMonthEl.textContent = visitorStats.month || 0;
    if (visitorAverageEl) visitorAverageEl.textContent = visitorStats.average || 0;
    if (peakHourEl) peakHourEl.textContent = visitorStats.peakHour || '-';
}

// Chart control functions
async function changeChartPeriod(period) {
    currentChartPeriod = period;
    
    // Update active button
    document.querySelectorAll('.btn-group button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Reload charts with new period
    try {
        const salesTrendData = await apiCall(`/api/analytics/sales-trend?period=${period}`);
        updateRevenueChart(salesTrendData.data);
    } catch (error) {
        console.error('Error updating chart period:', error);
    }
}

async function updateProductChart(limit) {
    try {
        const productSalesData = await apiCall(`/api/analytics/product-sales?limit=${limit}`);
        updateProductSalesChart(productSalesData.data);
    } catch (error) {
        console.error('Error updating product chart:', error);
    }
}

async function refreshAnalytics() {
    showNotification('Memuat ulang data analytics...', 'info');
    await loadAnalyticsData();
    showNotification('Data analytics berhasil dimuat ulang', 'success');
}

// Filter and control functions
function updateAnalyticsPeriod(period) {
    currentAnalyticsPeriod = period;
    currentChartPeriod = period;
    document.getElementById('analyticsTimePeriod').value = period;
    loadAnalyticsData();
}

function updateCategoryFilter(category) {
    currentCategoryFilter = category;
    loadAnalyticsData();
}

function updateChartType(type) {
    currentChartType = type;
    toggleChartVisibility(type);
}

function applyFilters() {
    const period = document.getElementById('analyticsTimePeriod').value;
    const category = document.getElementById('analyticsCategoryFilter').value;
    const chartType = document.getElementById('analyticsChartType').value;
    
    currentAnalyticsPeriod = period;
    currentCategoryFilter = category;
    currentChartType = chartType;
    
    loadAnalyticsData();
    toggleChartVisibility(chartType);
    showNotification('Filters applied successfully', 'success');
}

function resetFilters() {
    document.getElementById('analyticsTimePeriod').value = '7days';
    document.getElementById('analyticsCategoryFilter').value = 'all';
    document.getElementById('analyticsChartType').value = 'all';
    
    currentAnalyticsPeriod = '7days';
    currentCategoryFilter = 'all';
    currentChartType = 'all';
    
    loadAnalyticsData();
    toggleChartVisibility('all');
    showNotification('Filters reset', 'info');
}

function toggleChartVisibility(type) {
    const chartContainers = {
        'sales': ['revenueChart'],
        'products': ['productSalesChart', 'categoryChart'],
        'customers': ['visitorTrendChart'],
        'revenue': ['categoryRevenueChart']
    };
    
    // Show all charts if type is 'all'
    if (type === 'all') {
        document.querySelectorAll('.card').forEach(card => {
            if (card.querySelector('canvas')) {
                card.style.display = 'block';
            }
        });
        return;
    }
    
    // Hide all chart containers first
    document.querySelectorAll('.card').forEach(card => {
        if (card.querySelector('canvas')) {
            card.style.display = 'none';
        }
    });
    
    // Show only selected chart type
    if (chartContainers[type]) {
        chartContainers[type].forEach(chartId => {
            const chartElement = document.getElementById(chartId);
            if (chartElement) {
                chartElement.closest('.card').style.display = 'block';
            }
        });
    }
}

// Performance metrics chart
function loadPerformanceMetrics() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    if (performanceChart) {
        performanceChart.destroy();
    }
    
    const performanceData = {
        labels: ['Speed', 'Reliability', 'User Experience', 'Security', 'SEO'],
        datasets: [{
            label: 'Performance Score',
            data: [85, 92, 78, 95, 88],
            backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 205, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)',
                'rgba(153, 102, 255, 0.8)'
            ],
            borderWidth: 2,
            borderColor: '#fff'
        }]
    };
    
    performanceChart = new Chart(ctx, {
        type: 'radar',
        data: performanceData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Load top products table
function loadTopProductsTable() {
    const tableBody = document.querySelector('#topProductsTable tbody');
    if (!tableBody) return;
    
    // Mock data for top products
    const topProducts = [
        { rank: 1, name: 'iPhone 14 Pro', sales: 245, revenue: 'Rp 612,500,000' },
        { rank: 2, name: 'Samsung Galaxy S23', sales: 198, revenue: 'Rp 297,000,000' },
        { rank: 3, name: 'MacBook Air M2', sales: 156, revenue: 'Rp 468,000,000' },
        { rank: 4, name: 'AirPods Pro', sales: 324, revenue: 'Rp 162,000,000' },
        { rank: 5, name: 'iPad Air', sales: 189, revenue: 'Rp 283,500,000' }
    ];
    
    tableBody.innerHTML = topProducts.map(product => `
        <tr>
            <td><span class="badge bg-primary">#${product.rank}</span></td>
            <td>${product.name}</td>
            <td><strong>${product.sales}</strong></td>
            <td class="text-success fw-bold">${product.revenue}</td>
        </tr>
    `).join('');
}

// Load recent orders table
function loadRecentOrdersTable() {
    const tableBody = document.querySelector('#recentOrdersTable tbody');
    if (!tableBody) return;
    
    // Mock data for recent high-value orders
    const recentOrders = [
        { id: 'ORD-2024-001', customer: 'John Doe', amount: 'Rp 15,750,000', status: 'completed' },
        { id: 'ORD-2024-002', customer: 'Jane Smith', amount: 'Rp 8,900,000', status: 'processing' },
        { id: 'ORD-2024-003', customer: 'Bob Johnson', amount: 'Rp 12,300,000', status: 'shipped' },
        { id: 'ORD-2024-004', customer: 'Alice Brown', amount: 'Rp 6,750,000', status: 'completed' },
        { id: 'ORD-2024-005', customer: 'Charlie Wilson', amount: 'Rp 9,850,000', status: 'processing' }
    ];
    
    const statusColors = {
        'completed': 'success',
        'processing': 'warning',
        'shipped': 'info',
        'cancelled': 'danger'
    };
    
    tableBody.innerHTML = recentOrders.map(order => `
        <tr>
            <td><code>${order.id}</code></td>
            <td>${order.customer}</td>
            <td class="text-success fw-bold">${order.amount}</td>
            <td><span class="badge bg-${statusColors[order.status]}">${order.status}</span></td>
        </tr>
    `).join('');
}

// Update KPI cards with additional metrics
function updateKPICards() {
    // Update additional KPI cards
    const kpiUpdates = {
        'pageViews': '45,234',
        'conversionRate': '3.2%',
        'avgTime': '4m 32s',
        'bounceRate': '28.5%',
        'avgRating': '4.7',
        'avgDelivery': '2.3d'
    };
    
    Object.entries(kpiUpdates).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Export functionality
async function exportAnalytics(format) {
    if (format !== 'pdf' && format !== 'excel') return;

    try {
        const period = currentAnalyticsPeriod || document.getElementById('analyticsTimePeriod')?.value || '7days';
        showNotification(`Menyiapkan laporan Analytics (${format.toUpperCase()})...`, 'info');

        const data = await apiCall(`/api/analytics?period=${period}`);
        if (!data || !data.summary) {
            showNotification('Gagal memuat data analytics untuk export', 'error');
            return;
        }

        const now = new Date();
        const formattedDate = now.toLocaleString('id-ID', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const periodLabelMap = {
            '7days': '7 Hari Terakhir',
            '30days': '30 Hari Terakhir',
            '90days': '3 Bulan Terakhir',
            '365days': '12 Bulan Terakhir'
        };
        const periodLabel = periodLabelMap[period] || period;

        const summary = data.summary;
        const visitorStats = data.visitorStats || {};
        const topProducts = Array.isArray(data.topProducts) ? data.topProducts.slice(0, 10) : [];

        if (format === 'pdf') {
            const win = window.open('', '_blank');
            if (!win) {
                showNotification('Popup diblokir browser. Izinkan popup untuk export PDF.', 'warning');
                return;
            }
            win.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Laporan Analytics BismarShop</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; }
    h1, h2, h3 { margin: 0 0 8px 0; }
    .text-muted { color: #666; font-size: 12px; }
    .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
    .card { border: 1px solid #ddd; border-radius: 6px; padding: 10px 12px; }
    .card-title { font-weight: bold; margin-bottom: 4px; font-size: 13px; }
    .card-value { font-size: 16px; font-weight: bold; }
    .card-sub { font-size: 12px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; }
    .text-right { text-align: right; }
    .mt-16 { margin-top: 16px; }
  </style>
</head>
<body>
  <h1>Laporan Analytics Penjualan</h1>
  <div class="text-muted">Periode: ${periodLabel} &mdash; Dibuat: ${formattedDate}</div>

  <h2 class="mt-16">Ringkasan Penjualan</h2>
  <div class="summary-grid">
    <div class="card">
      <div class="card-title">Total Omzet</div>
      <div class="card-value">${formatCurrency(summary.totalSales.amount || 0)}</div>
      <div class="card-sub">Total unit terjual: ${summary.totalSales.count || 0}</div>
    </div>
    <div class="card">
      <div class="card-title">Pengunjung</div>
      <div class="card-value">${(summary.totalVisitors || 0).toLocaleString('id-ID')}</div>
      <div class="card-sub">Rata-rata /hari: ${(visitorStats.average || 0).toLocaleString('id-ID')}</div>
    </div>
    <div class="card">
      <div class="card-title">Produk Terlaris</div>
      <div class="card-value">${summary.topProduct?.name || '-'}</div>
      <div class="card-sub">Terjual: ${summary.topProduct?.sold || 0} unit</div>
    </div>
    <div class="card">
      <div class="card-title">Conversion Rate</div>
      <div class="card-value">${summary.conversionRate || 0}%</div>
      <div class="card-sub">Perbandingan pesanan vs pengunjung</div>
    </div>
  </div>

  <h2 class="mt-16">Top Produk Berdasarkan Penjualan</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 5%">No</th>
        <th>Produk</th>
        <th style="width: 18%">Kategori</th>
        <th style="width: 12%" class="text-right">Terjual</th>
        <th style="width: 20%" class="text-right">Pendapatan</th>
      </tr>
    </thead>
    <tbody>
      ${topProducts.map((p, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${p.name}</td>
          <td>${p.category || '-'}</td>
          <td class="text-right">${p.sold || 0}</td>
          <td class="text-right">${formatCurrency(p.revenue || 0)}</td>
        </tr>
      `).join('') || '<tr><td colspan="5">Tidak ada data produk untuk periode ini.</td></tr>'}
    </tbody>
  </table>

  <h2 class="mt-16">Statistik Pengunjung (Ringkas)</h2>
  <table>
    <tbody>
      <tr><th>Hari ini</th><td>${(visitorStats.today || 0).toLocaleString('id-ID')} pengunjung</td></tr>
      <tr><th>Total periode</th><td>${(visitorStats.week || 0).toLocaleString('id-ID')} pengunjung</td></tr>
      <tr><th>Rata-rata /hari</th><td>${(visitorStats.average || 0).toLocaleString('id-ID')} pengunjung</td></tr>
      <tr><th>Jam tersibuk (perkiraan)</th><td>${visitorStats.peakHour || '-'}</td></tr>
    </tbody>
  </table>

</body>
</html>`);

            win.document.close();
            win.focus();
            // Biarkan user pilih "Save as PDF" dari dialog print
            win.print();
        } else if (format === 'excel') {
            // Simple CSV export compatible with Excel
            const rows = [];
            rows.push(['Laporan Analytics Penjualan']);
            rows.push(['Periode', periodLabel, 'Dibuat', formattedDate]);
            rows.push([]);
            rows.push(['Ringkasan']);
            rows.push(['Total Omzet', summary.totalSales.amount || 0]);
            rows.push(['Total Unit Terjual', summary.totalSales.count || 0]);
            rows.push(['Total Pengunjung', summary.totalVisitors || 0]);
            rows.push(['Conversion Rate (%)', summary.conversionRate || 0]);
            rows.push([]);
            rows.push(['Top Produk Berdasarkan Penjualan']);
            rows.push(['No', 'Produk', 'Kategori', 'Terjual', 'Pendapatan']);
            topProducts.forEach((p, idx) => {
                rows.push([
                    idx + 1,
                    p.name || '-',
                    p.category || '-',
                    p.sold || 0,
                    p.revenue || 0,
                ]);
            });

            const csv = rows
                .map(cols => cols
                    .map(v => String(v).replace(/"/g, '""'))
                    .map(v => `"${v}"`)
                    .join(','))
                .join('\r\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics_${period}_${now.toISOString().slice(0,10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error('Error exporting analytics:', error);
        showNotification('Terjadi kesalahan saat export analytics', 'error');
    }
}

// Update product chart limit
function updateProductLimit(limit) {
    currentTopProductsLimit = parseInt(limit, 10) || 10;

    const limitBtn = document.getElementById('topProductsLimitBtn');
    if (limitBtn) {
        limitBtn.textContent = `Top ${currentTopProductsLimit}`;
    }

    apiCall(`/api/analytics/product-sales?limit=${currentTopProductsLimit}&period=${currentAnalyticsPeriod}`)
        .then(response => {
            if (response.success && response.data) {
                updateProductSalesChart(response.data);
            }
        })
        .catch(error => {
            console.error('Error updating product chart:', error);
        });
}

// Top Products Sales Chart (uses real analytics/product-sales data)
let topProductsSalesChart = null;
async function createTopProductsSalesChart() {
    const ctx = document.getElementById('topProductsSalesChart');
    if (!ctx) {
        console.error('Top products sales chart canvas not found');
        return;
    }

    try {
        const period = currentAnalyticsPeriod || currentChartPeriod || '7days';
        const limit = currentTopProductsLimit || 10;
        const response = await apiCall(`/api/analytics/product-sales?limit=${limit}&period=${period}`);
        const topProductsData = (response && response.data && Array.isArray(response.data)) ? response.data : [];

        if (topProductsSalesChart) {
            topProductsSalesChart.destroy();
        }

        if (!topProductsData.length) {
            console.warn('No top products data available for chart');
            return;
        }

        const labels = topProductsData.map(item => item.name || 'Unknown Product');
        const salesData = topProductsData.map(item => item.sold || item.sales || 0);

        topProductsSalesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Terjual',
                data: salesData,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)',
                    'rgba(199, 199, 199, 0.8)',
                    'rgba(83, 102, 255, 0.8)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 205, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(199, 199, 199, 1)',
                    'rgba(83, 102, 255, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const product = topProductsData[context.dataIndex];
                            const revenue = product.revenue || (context.parsed.y * (product.price || 0));
                            return [
                                `Terjual: ${context.parsed.y} unit`,
                                `Revenue: ${formatCurrency(revenue)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Jumlah Terjual'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Produk'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
    
    console.log('Top products sales chart created successfully');
    } catch (error) {
        console.error('Error creating top products sales chart:', error);
    }
}


// Product Comparison Chart
let productComparisonChart = null;
function createProductComparisonChart() {
    const ctx = document.getElementById('productComparisonChart');
    if (!ctx) {
        console.error('Product comparison chart canvas not found');
        return;
    }

    if (productComparisonChart) {
        productComparisonChart.destroy();
    }

    // Mock data for product comparison
    const comparisonData = [
        { category: 'Electronics', sales: 1245 },
        { category: 'Fashion', sales: 987 },
        { category: 'Books', sales: 654 },
        { category: 'Home & Garden', sales: 432 },
        { category: 'Sports', sales: 321 }
    ];

    const labels = comparisonData.map(item => item.category);
    const data = comparisonData.map(item => item.sales);
    const colors = [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 205, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)'
    ];

    productComparisonChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    console.log('Product comparison chart created successfully');
}

// Monthly Sales Trend Chart
let monthlySalesTrendChart = null;
function createMonthlySalesTrendChart() {
    const ctx = document.getElementById('monthlySalesTrendChart');
    if (!ctx) {
        console.error('Monthly sales trend chart canvas not found');
        return;
    }

    if (monthlySalesTrendChart) {
        monthlySalesTrendChart.destroy();
    }

    // Mock data for monthly sales trend by product
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const products = [
        { name: 'iPhone 14 Pro', data: [20, 25, 18, 32, 28, 35, 30, 38, 33, 40, 45, 42], color: 'rgba(255, 99, 132, 1)' },
        { name: 'Samsung Galaxy S23', data: [15, 18, 22, 19, 24, 21, 26, 23, 28, 25, 30, 32], color: 'rgba(54, 162, 235, 1)' },
        { name: 'MacBook Air M2', data: [12, 14, 16, 13, 18, 15, 20, 17, 22, 19, 24, 21], color: 'rgba(255, 205, 86, 1)' }
    ];

    const datasets = products.map(product => ({
        label: product.name,
        data: product.data,
        borderColor: product.color,
        backgroundColor: product.color.replace('1)', '0.2)'),
        tension: 0.4,
        fill: false
    }));

    monthlySalesTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Jumlah Terjual'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Bulan'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y} unit`;
                        }
                    }
                }
            }
        }
    });
    
    console.log('Monthly sales trend chart created successfully');
}

// Update Top Products Summary
function updateTopProductsSummary() {
    const container = document.getElementById('topProductsSummary');
    if (!container) return;
    
    const topProducts = [
        { rank: 1, name: 'iPhone 14 Pro', sales: 245, trend: '+15%' },
        { rank: 2, name: 'Samsung Galaxy S23', sales: 198, trend: '+8%' },
        { rank: 3, name: 'MacBook Air M2', sales: 156, trend: '+12%' },
        { rank: 4, name: 'AirPods Pro', sales: 324, trend: '+22%' },
        { rank: 5, name: 'iPad Air', sales: 189, trend: '+5%' }
    ];
    
    container.innerHTML = topProducts.map(product => `
        <div class="d-flex justify-content-between align-items-center mb-3 p-2 border rounded">
            <div class="d-flex align-items-center">
                <span class="badge bg-primary me-2">#${product.rank}</span>
                <div>
                    <strong class="d-block">${product.name}</strong>
                    <small class="text-muted">${product.sales} terjual</small>
                </div>
            </div>
            <span class="badge bg-success">${product.trend}</span>
        </div>
    `).join('');
}

// Update Profit Loss Summary
function updateProfitLossSummary() {
    const updates = {
        'totalProfit': 'Rp 750,000,000',
        'totalLoss': 'Rp 94,000,000',
        'netProfit': 'Rp 656,000,000',
        'profitMargin': '87.5%'
    };
    
    Object.entries(updates).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Period update functions
function updateTopProductsPeriod(period) {
    console.log(`Updating top products chart for period: ${period}`);
    createTopProductsSalesChart();
    showNotification(`Data produk terlaris diperbarui untuk periode ${period}`, 'success');
}

function updateProfitLossPeriod(period) {
    console.log(`Updating profit/loss chart for period: ${period}`);
    loadMonthlyProfitLoss();
    showNotification(`Data keuntungan/kerugian diperbarui untuk periode ${period}`, 'success');
}

// Monthly Analytics Functions
let monthlyBestsellersChart = null;
let monthlyProfitLossChart = null;

// Mock generators for monthly sections
function generateMockMonthlyBestsellers(month, year) {
    const names = ['Produk A', 'Produk B', 'Produk C', 'Produk D', 'Produk E', 'Produk F'];
    const products = names.slice(0, 5).map((name, i) => {
        const totalSold = Math.floor(200 - i * 20 + Math.random() * 40);
        const price = 80000 + Math.random() * 400000;
        const revenue = Math.round(totalSold * price);
        const costs = Math.round(revenue * (0.6 + Math.random() * 0.15));
        const profit = revenue - costs;
        return { name, totalSold, revenue, profit };
    });
    return { period: `${month}/${year}`, products };
}

function generateMockMonthlyProfitLoss(year) {
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const monthly = months.map((m) => {
        const revenue = 500000000 + Math.random() * 1000000000; // 0.5B - 1.5B
        const costs = revenue * (0.55 + Math.random() * 0.2);
        const profit = revenue - costs;
        const profitMargin = Math.round((profit / revenue) * 1000) / 10; // one decimal
        return { monthName: m, revenue: Math.round(revenue), costs: Math.round(costs), profit: Math.round(profit), profitMargin };
    });
    const best = monthly.reduce((a, b) => (a.profit > b.profit ? a : b));
    const yearly = {
        profit: monthly.reduce((s, x) => s + x.profit, 0),
        profitMargin: Math.round((monthly.reduce((s, x) => s + x.profit, 0) / monthly.reduce((s, x) => s + x.revenue, 0)) * 1000) / 10
    };
    return { year, monthly, summary: { bestMonth: best }, yearly };
}

// Load Monthly Best Selling Products
async function loadMonthlyBestsellers() {
    try {
        const month = document.getElementById('bestsellerMonth').value;
        const year = document.getElementById('bestsellerYear').value;
        if (USE_MOCK_ANALYTICS) {
            const data = generateMockMonthlyBestsellers(month, year);
            createMonthlyBestsellersChart({ products: data.products, period: data.period });
            updateTopSellingProduct(data.products[0]);
            return;
        }

        console.log('📊 Loading monthly bestsellers for:', { month, year });

        // Gunakan apiCall agar token dan fallback routing konsisten
        const result = await apiCall(`/api/analytics/monthly-bestsellers?month=${month}&year=${year}`);
        console.log('📡 Monthly bestsellers response:', result);

        if (result && result.success && result.data && Array.isArray(result.data.products)) {
            createMonthlyBestsellersChart(result.data);
            if (result.data.products.length > 0) {
                updateTopSellingProduct(result.data.products[0]);
            }
        } else {
            console.error('Failed to load monthly bestsellers', result);
            showNotification(result?.message || 'Gagal memuat data produk terlaris bulanan', 'error');
        }
    } catch (error) {
        console.error('Error loading monthly bestsellers:', error);
        showNotification('Error memuat data produk terlaris', 'error');
    }
}

// Create Monthly Best Sellers Chart
function createMonthlyBestsellersChart(data) {
    const ctx = document.getElementById('monthlyBestsellersChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (monthlyBestsellersChart) {
        monthlyBestsellersChart.destroy();
    }
    
    const products = data.products.slice(0, 5); // Top 5 products
    
    monthlyBestsellersChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: products.map(p => p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name),
            datasets: [{
                label: 'Jumlah Terjual',
                data: products.map(p => p.totalSold),
                backgroundColor: [
                    'rgba(255, 193, 7, 0.8)',   // Gold for #1
                    'rgba(108, 117, 125, 0.8)', // Silver for #2
                    'rgba(220, 53, 69, 0.8)',   // Bronze for #3
                    'rgba(13, 202, 240, 0.8)',  // Blue for #4
                    'rgba(25, 135, 84, 0.8)'    // Green for #5
                ],
                borderColor: [
                    'rgba(255, 193, 7, 1)',
                    'rgba(108, 117, 125, 1)',
                    'rgba(220, 53, 69, 1)',
                    'rgba(13, 202, 240, 1)',
                    'rgba(25, 135, 84, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Produk Terlaris - ${data.period}`
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const product = products[context.dataIndex];
                            return [
                                `Terjual: ${product.totalSold} unit`,
                                `Revenue: Rp ${product.revenue.toLocaleString('id-ID')}`,
                                `Profit: Rp ${product.profit.toLocaleString('id-ID')}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Jumlah Terjual (Unit)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: `Produk (Top ${currentTopProductsLimit || productData.length || 0})`
                    }
                }
            }
        }
    });
}

// Load Monthly Profit & Loss
async function loadMonthlyProfitLoss() {
    try {
        const year = document.getElementById('profitLossYear').value;
        if (USE_MOCK_ANALYTICS) {
            const data = generateMockMonthlyProfitLoss(year);
            createMonthlyProfitLossChart(data);
            updateProfitLossSummary(data);
            return;
        }

        console.log('📊 Loading monthly profit/loss for year:', year);

        // Gunakan apiCall agar token, base URL, dan fallback /index.php konsisten
        const result = await apiCall(`/api/analytics/monthly-profit-loss?year=${year}`);
        console.log('📡 Monthly profit/loss response:', result);

        if (result && result.success && result.data) {
            createMonthlyProfitLossChart(result.data);
            updateProfitLossSummary(result.data);
        } else {
            console.error('Failed to load monthly profit/loss', result);
            showNotification(result?.message || 'Gagal memuat data keuntungan/kerugian bulanan', 'error');
        }
    } catch (error) {
        console.error('Error loading monthly profit/loss:', error);
        showNotification('Error memuat data keuntungan/kerugian', 'error');
    }
}

// Create Monthly Profit & Loss Chart
function createMonthlyProfitLossChart(data) {
    const ctx = document.getElementById('monthlyProfitLossChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (monthlyProfitLossChart) {
        monthlyProfitLossChart.destroy();
    }
    
    const monthlyData = data.monthly;
    
    monthlyProfitLossChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthlyData.map(m => m.monthName.substring(0, 3)),
            datasets: [
                {
                    label: 'Revenue (Juta Rp)',
                    data: monthlyData.map(m => Math.round(m.revenue / 1000000)),
                    borderColor: 'rgba(13, 202, 240, 1)',
                    backgroundColor: 'rgba(13, 202, 240, 0.1)',
                    tension: 0.4,
                    fill: false
                },
                {
                    label: 'Biaya (Juta Rp)',
                    data: monthlyData.map(m => Math.round(m.costs / 1000000)),
                    borderColor: 'rgba(220, 53, 69, 1)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    tension: 0.4,
                    fill: false
                },
                {
                    label: 'Keuntungan (Juta Rp)',
                    data: monthlyData.map(m => Math.round(m.profit / 1000000)),
                    borderColor: 'rgba(25, 135, 84, 1)',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Analisis Keuntungan & Kerugian ${data.year}`
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const monthData = monthlyData[context.dataIndex];
                            if (context.datasetIndex === 0) {
                                return `Revenue: Rp ${monthData.revenue.toLocaleString('id-ID')}`;
                            } else if (context.datasetIndex === 1) {
                                return `Biaya: Rp ${monthData.costs.toLocaleString('id-ID')}`;
                            } else {
                                return `Keuntungan: Rp ${monthData.profit.toLocaleString('id-ID')} (${monthData.profitMargin}%)`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Nilai (Juta Rupiah)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Bulan'
                    }
                }
            }
        }
    });
}

// Update Monthly Summary Cards
function updateProfitLossSummary(data) {
    // Update yearly profit
    const totalYearlyProfit = document.getElementById('totalYearlyProfit');
    if (totalYearlyProfit) {
        totalYearlyProfit.textContent = `Rp ${Math.round(data.yearly.profit / 1000000).toLocaleString('id-ID')} Juta`;
    }
    
    // Update average profit margin
    const averageProfitMargin = document.getElementById('averageProfitMargin');
    if (averageProfitMargin) {
        averageProfitMargin.textContent = `${data.yearly.profitMargin}%`;
    }
    
    // Update best profit month
    const bestProfitMonth = document.getElementById('bestProfitMonth');
    if (bestProfitMonth) {
        bestProfitMonth.textContent = data.summary.bestMonth.monthName;
    }
}

// Update Top Selling Product
function updateTopSellingProduct(product) {
    const topSellingProduct = document.getElementById('topSellingProduct');
    if (topSellingProduct && product) {
        const shortName = product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name;
        topSellingProduct.textContent = shortName;
    }
}

// Initialize Monthly Analytics when analytics section is shown
function initializeMonthlyAnalytics() {
    // Set current month and year as default
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const monthSelect = document.getElementById('bestsellerMonth');
    const yearSelects = document.querySelectorAll('#bestsellerYear, #profitLossYear');
    
    if (monthSelect) {
        monthSelect.value = currentMonth;
    }
    
    yearSelects.forEach(select => {
        if (select) {
            select.value = currentYear;
        }
    });
    
    // Load initial data
    loadMonthlyBestsellers();
    loadMonthlyProfitLoss();
}

// ===== VOUCHERS MANAGEMENT =====

// Global variables for vouchers
let vouchers = [];
let currentVoucher = null;

// Load vouchers from API
async function loadVouchers() {
    try {
        const response = await apiCall('/api/vouchers');
        if (response && response.success) {
            vouchers = response.data || [];
            updateVouchersTable();
            updateVouchersStats();
        } else {
            console.error('Failed to load vouchers:', response);
            showNotification('Failed to load vouchers', 'error');
        }
    } catch (error) {
        console.error('Error loading vouchers:', error);
        showNotification('Error loading vouchers', 'error');
    }
}

// Update vouchers table
function updateVouchersTable() {
    const tbody = document.getElementById('vouchersTableBody');
    if (!tbody) return;

    if (!vouchers || vouchers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No vouchers found</td></tr>';
        return;
    }

    let html = '';
    vouchers.forEach(voucher => {
        const status = voucher.isActive ? 
            '<span class="badge bg-success">Active</span>' : 
            '<span class="badge bg-secondary">Inactive</span>';
        
        const usage = voucher.usageLimit ? 
            `${voucher.usedCount}/${voucher.usageLimit}` : 
            voucher.usedCount;

        const value = voucher.type === 'percentage' ? 
            `${voucher.value}%` : 
            formatCurrency(voucher.value);

        html += `
            <tr>
                <td><code>${voucher.code}</code></td>
                <td>${voucher.name}</td>
                <td><span class="badge ${voucher.type === 'percentage' ? 'bg-info' : 'bg-warning'}">${voucher.type}</span></td>
                <td>${value}</td>
                <td>${formatCurrency(voucher.minPurchase)}</td>
                <td>${usage}</td>
                <td>${formatDateTime(voucher.startDate)}</td>
                <td>${voucher.endDate ? formatDateTime(voucher.endDate) : 'No limit'}</td>
                <td>${status}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editVoucher(${voucher.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteVoucher(${voucher.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Update vouchers statistics
function updateVouchersStats() {
    if (!vouchers) return;

    const totalVouchers = vouchers.length;
    const activeVouchers = vouchers.filter(v => v.isActive).length;
    const totalUsage = vouchers.reduce((sum, v) => sum + (v.usedCount || 0), 0);
    
    // Calculate expiring soon (within 7 days)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    const expiringSoon = vouchers.filter(v => {
        if (!v.endDate) return false;
        const endDate = new Date(v.endDate);
        return endDate <= sevenDaysFromNow && endDate > now;
    }).length;

    // Update UI
    document.getElementById('totalVouchersCount').textContent = totalVouchers;
    document.getElementById('activeVouchersCount').textContent = activeVouchers;
    document.getElementById('totalVoucherUsage').textContent = totalUsage;
    document.getElementById('expiringSoonCount').textContent = expiringSoon;
}

// Show voucher modal
function showVoucherModal(voucherId = null) {
    currentVoucher = voucherId ? vouchers.find(v => v.id === voucherId) : null;
    
    const modal = new bootstrap.Modal(document.getElementById('voucherModal'));
    const title = document.getElementById('voucherModalTitle');
    const form = document.getElementById('voucherForm');
    
    title.textContent = currentVoucher ? 'Edit Voucher' : 'Add New Voucher';
    
    if (currentVoucher) {
        // Fill form with existing data
        document.getElementById('voucherId').value = currentVoucher.id;
        document.getElementById('voucherCode').value = currentVoucher.code;
        document.getElementById('voucherName').value = currentVoucher.name;
        document.getElementById('voucherDescription').value = currentVoucher.description || '';
        document.getElementById('voucherType').value = currentVoucher.type;
        document.getElementById('voucherValue').value = currentVoucher.value;
        document.getElementById('voucherMinPurchase').value = currentVoucher.minPurchase || '';
        document.getElementById('voucherMaxDiscount').value = currentVoucher.maxDiscount || '';
        document.getElementById('voucherUsageLimit').value = currentVoucher.usageLimit || '';
        document.getElementById('voucherStatus').value = currentVoucher.isActive ? '1' : '0';
        
        // Format dates for datetime-local input
        if (currentVoucher.startDate) {
            document.getElementById('voucherStartDate').value = formatDateTimeLocal(currentVoucher.startDate);
        }
        if (currentVoucher.endDate) {
            document.getElementById('voucherEndDate').value = formatDateTimeLocal(currentVoucher.endDate);
        }
    } else {
        // Reset form
        form.reset();
        document.getElementById('voucherId').value = '';
        document.getElementById('voucherStatus').value = '1';
    }
    
    modal.show();
}

// Save voucher
async function saveVoucher() {
    const form = document.getElementById('voucherForm');
    const saveBtn = document.getElementById('saveVoucherBtn');
    const spinner = document.getElementById('voucherSaveSpinner');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Show loading
    saveBtn.disabled = true;
    spinner.classList.remove('d-none');
    
    try {
        // Safe parse helpers to preserve 0 values
        const parseIntOrNull = (val) => {
            const n = parseInt(val, 10);
            return Number.isNaN(n) ? null : n;
        };
        const parseIntOrZero = (val) => {
            const n = parseInt(val, 10);
            return Number.isNaN(n) ? 0 : n;
        };
        const valCode = document.getElementById('voucherCode').value;
        const valName = document.getElementById('voucherName').value;
        const valDesc = document.getElementById('voucherDescription').value;
        const valType = document.getElementById('voucherType').value;
        const valValue = parseIntOrZero(document.getElementById('voucherValue').value);
        const valMinPurchase = parseIntOrZero(document.getElementById('voucherMinPurchase').value);
        const valMaxDiscount = parseIntOrNull(document.getElementById('voucherMaxDiscount').value);
        const valUsageLimit = parseIntOrNull(document.getElementById('voucherUsageLimit').value);
        const valStartDate = document.getElementById('voucherStartDate').value;
        const valEndDate = document.getElementById('voucherEndDate').value;

        const formData = {
            code: valCode,
            name: valName,
            description: valDesc ? valDesc : null,
            type: valType,
            value: valValue,
            minPurchase: valMinPurchase,
            maxDiscount: valMaxDiscount,
            usageLimit: valUsageLimit,
            startDate: valStartDate ? valStartDate : null,
            endDate: valEndDate ? valEndDate : null,
            isActive: document.getElementById('voucherStatus').value === '1'
        };
        
        const voucherId = document.getElementById('voucherId').value;
        const endpoint = voucherId ? `/api/vouchers/${voucherId}` : '/api/vouchers';
        const method = voucherId ? 'PUT' : 'POST';
        
        const response = await apiCall(endpoint, method, formData);
            if (response && response.success) {
            // Optimistically update local state so UI reflects changes instantly
            if (response.data) {
                const updated = response.data;
                if (voucherId) {
                    const idx = vouchers.findIndex(v => String(v.id) === String(updated.id));
                    if (idx !== -1) {
                        vouchers[idx] = updated;
                    }
                } else {
                    // newly created, add to top
                    vouchers.unshift(updated);
                }
            }
            // Re-render both paths to guarantee UI updates regardless of active renderer
            try { if (typeof updateVouchersTable === 'function') updateVouchersTable(); } catch {}
            try { if (typeof displayVouchers === 'function') displayVouchers(Array.isArray(vouchers) ? vouchers : []); } catch {}
            try { if (typeof updateVouchersStats === 'function') updateVouchersStats(); } catch {}
            showNotification(voucherId ? 'Voucher updated successfully!' : 'Voucher created successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('voucherModal')).hide();
            // Background refresh to ensure full sync with server
            setTimeout(() => { try { loadVouchers(); } catch(_){} }, 0);
        } else {
            showNotification(response?.message || 'Failed to save voucher', 'error');
        }
    } catch (error) {
        console.error('Error saving voucher:', error);
        showNotification('Error saving voucher', 'error');
    } finally {
        // Hide loading
        saveBtn.disabled = false;
        spinner.classList.add('d-none');
    }
}

// Edit voucher
function editVoucher(voucherId) {
    showVoucherModal(voucherId);
}

// Delete voucher
async function deleteVoucher(voucherId) {
    const voucher = vouchers.find(v => v.id === voucherId);
    if (!voucher) return;
    
    if (!confirm(`Are you sure you want to delete voucher "${voucher.code}"?`)) {
        return;
    }
    
    try {
        const response = await apiCall(`/api/vouchers/${voucherId}`, 'DELETE');
        
        if (response && response.success) {
            showNotification('Voucher deleted successfully!', 'success');
            loadVouchers(); // Reload the list
        } else {
            showNotification(response?.message || 'Failed to delete voucher', 'error');
        }
    } catch (error) {
        console.error('Error deleting voucher:', error);
        showNotification('Error deleting voucher', 'error');
    }
}

// ===== FLASH SALES MANAGEMENT =====

// Global variables for flash sales
let flashSales = [];
let currentFlashSale = null;

// Load flash sales from API (supports both raw array and {success,data}) and bust cache
async function loadFlashSales() {
    try {
        const ts = Date.now();
        const response = await apiCall(`/api/flash-sales?ts=${ts}`);
        const data = Array.isArray(response) ? response : (response?.data ?? null);

        if (Array.isArray(data)) {
            // Normalize field names for compatibility (camelCase, snake_case, alternative spellings)
            flashSales = data.map(s => {
                const maxUser = s.maxQuantityPerUser ?? s.maxPerUser ?? s.max_user_per ?? s.max_user ?? s.max_user_limit ?? 1;
                const parsed = typeof maxUser === 'number' ? maxUser : parseInt(maxUser);
                const safe = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
                return {
                    ...s,
                    maxQuantityPerUser: safe
                };
            });
            updateFlashSalesTable();
            updateFlashSalesStats();
        } else {
            console.error('Failed to load flash sales: unexpected response shape', response);
            showNotification('Failed to load flash sales', 'error');
        }
    } catch (error) {
        console.error('Error loading flash sales:', error);
        showNotification('Error loading flash sales', 'error');
    }
}

// Update flash sales table
function updateFlashSalesTable() {
    const tbody = document.getElementById('flashSalesTableBody');
    if (!tbody) return;

    if (!flashSales || flashSales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No flash sales found</td></tr>';
        return;
    }

    let html = '';
    flashSales.forEach(sale => {
        const now = new Date();
        const startDateTime = new Date(`${sale.startDate}T${sale.startTime}`);
        const endDateTime = new Date(`${sale.endDate || sale.startDate}T${sale.endTime}`);
        
        let status = '';
        if (!sale.isActive) {
            status = '<span class="badge bg-secondary">Inactive</span>';
        } else if (now < startDateTime) {
            status = '<span class="badge bg-warning">Scheduled</span>';
        } else if (now >= startDateTime && now <= endDateTime) {
            status = '<span class="badge bg-success">🔥 LIVE</span>';
        } else {
            status = '<span class="badge bg-info">Completed</span>';
        }

        const timePeriod = `
            <div class="small">
                <strong>${formatDateOnly(sale.startDate)}</strong>
                ${sale.endDate && sale.endDate !== sale.startDate ? ` - ${formatDateOnly(sale.endDate)}` : ''}
                <br>
                <span class="text-muted">${sale.startTime} - ${sale.endTime}</span>
            </div>
        `;

        const stockInfo = `
            <div class="small">
                <span class="text-success">${sale.remainingStock || 0}</span> / ${sale.totalStock || 0}
                <br><small class="text-muted">remaining</small>
            </div>
        `;

        const autoApplyBadge = sale.autoApply ? 
            '<span class="badge bg-success">✓ Auto</span>' : 
            '<span class="badge bg-warning">Manual</span>';

        html += `
            <tr>
                <td>
                    <strong>${sale.name}</strong>
                    ${sale.description ? `<br><small class="text-muted">${sale.description}</small>` : ''}
                </td>
                <td>${timePeriod}</td>
                <td><span class="badge bg-danger">${sale.discountPercentage}%</span></td>
                <td>${stockInfo}</td>
                <td>${autoApplyBadge}</td>
                <td>${status}</td>
                <td class="action-buttons">
                    <div class="btn-group btn-group-sm" role="group" aria-label="Flash sale actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="editFlashSale(${sale.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteFlashSale(${sale.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Update flash sales statistics
function updateFlashSalesStats() {
    if (!flashSales) return;

    const now = new Date();
    const activeFlashSales = flashSales.filter(sale => {
        if (!sale.isActive) return false;
        const startDate = new Date(sale.startDate);
        const endDate = sale.endDate ? new Date(sale.endDate) : null;
        return startDate <= now && (!endDate || endDate > now);
    }).length;

    const scheduledFlashSales = flashSales.filter(sale => {
        if (!sale.isActive) return false;
        const startDate = new Date(sale.startDate);
        return startDate > now;
    }).length;

    const completedFlashSales = flashSales.filter(sale => {
        if (!sale.endDate) return false;
        const endDate = new Date(sale.endDate);
        return endDate <= now;
    }).length;

    // Update UI
    document.getElementById('activeFlashSalesCount').textContent = activeFlashSales;
    document.getElementById('scheduledFlashSalesCount').textContent = scheduledFlashSales;
    document.getElementById('completedFlashSalesCount').textContent = completedFlashSales;
}

// Show flash sale modal
function showFlashSaleModal(flashSaleId = null) {
    currentFlashSale = flashSaleId ? flashSales.find(s => s.id === flashSaleId) : null;
    
    const modal = new bootstrap.Modal(document.getElementById('flashSaleModal'));
    const title = document.getElementById('flashSaleModalTitle');
    const form = document.getElementById('flashSaleForm');
    
    title.textContent = currentFlashSale ? 'Edit Flash Sale' : 'Add New Flash Sale';
    
    if (currentFlashSale) {
        // Fill form with existing data
        document.getElementById('flashSaleId').value = currentFlashSale.id;
        document.getElementById('flashSaleName').value = currentFlashSale.name;
        document.getElementById('flashSaleDescription').value = currentFlashSale.description || '';
        document.getElementById('flashSaleDiscount').value = currentFlashSale.discountPercentage;
        document.getElementById('flashSaleTotalStock').value = currentFlashSale.totalStock || 0;
        document.getElementById('flashSaleMaxPerUser').value = (currentFlashSale.maxQuantityPerUser ?? currentFlashSale.maxPerUser ?? currentFlashSale.max_user_per ?? currentFlashSale.max_user ?? currentFlashSale.max_user_limit ?? 1);
        document.getElementById('flashSaleAutoApply').checked = currentFlashSale.autoApply !== false;
        document.getElementById('flashSaleStatus').value = currentFlashSale.isActive ? '1' : '0';
        
        // Format dates for date input
        if (currentFlashSale.startDate) {
            document.getElementById('flashSaleStartDate').value = formatDateOnly(currentFlashSale.startDate);
        }
        if (currentFlashSale.endDate) {
            document.getElementById('flashSaleEndDate').value = formatDateOnly(currentFlashSale.endDate);
        }
        
        // Format times
        if (currentFlashSale.startTime) {
            document.getElementById('flashSaleStartTime').value = currentFlashSale.startTime;
        }
        if (currentFlashSale.endTime) {
            document.getElementById('flashSaleEndTime').value = currentFlashSale.endTime;
        }
    } else {
        // Reset form
        form.reset();
        document.getElementById('flashSaleId').value = '';
        document.getElementById('flashSaleStatus').value = '1';
        document.getElementById('flashSaleMaxPerUser').value = '1';
        document.getElementById('flashSaleStartTime').value = '12:00';
        document.getElementById('flashSaleEndTime').value = '14:00';
        document.getElementById('flashSaleAutoApply').checked = true;
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('flashSaleStartDate').value = today;
    }
    
    modal.show();
}

// Save flash sale
async function saveFlashSale() {
    const form = document.getElementById('flashSaleForm');
    const saveBtn = document.getElementById('saveFlashSaleBtn');
    const spinner = document.getElementById('flashSaleSaveSpinner');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Show loading
    saveBtn.disabled = true;
    spinner.classList.remove('d-none');
    
    try {
        const maxUserInput = parseInt(document.getElementById('flashSaleMaxPerUser').value);
        const maxUserVal = Number.isFinite(maxUserInput) ? Math.max(1, maxUserInput) : 1;
        const formData = {
            name: document.getElementById('flashSaleName').value,
            description: document.getElementById('flashSaleDescription').value || null,
            discountPercentage: parseInt(document.getElementById('flashSaleDiscount').value),
            startDate: document.getElementById('flashSaleStartDate').value,
            endDate: document.getElementById('flashSaleEndDate').value || null,
            startTime: document.getElementById('flashSaleStartTime').value,
            endTime: document.getElementById('flashSaleEndTime').value,
            totalStock: parseInt(document.getElementById('flashSaleTotalStock').value),
            maxQuantityPerUser: maxUserVal,
            // Send alternative naming for backend compatibility
            maxPerUser: maxUserVal,
            max_user_per: maxUserVal,
            max_user: maxUserVal,
            max_user_limit: maxUserVal,
            autoApply: document.getElementById('flashSaleAutoApply').checked,
            isActive: document.getElementById('flashSaleStatus').value === '1'
        };
        
        const flashSaleId = document.getElementById('flashSaleId').value;
        const endpoint = flashSaleId ? `/api/flash-sales/${flashSaleId}` : '/api/flash-sales';
        const method = flashSaleId ? 'PUT' : 'POST';
        
        const response = await apiCall(endpoint, method, formData);
        
        if (response && response.success) {
            showNotification(flashSaleId ? 'Flash sale updated successfully!' : 'Flash sale created successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('flashSaleModal')).hide();
            await loadFlashSales(); // Ensure UI reflects latest data
        } else {
            showNotification(response?.message || 'Failed to save flash sale', 'error');
        }
    } catch (error) {
        console.error('Error saving flash sale:', error);
        showNotification('Error saving flash sale', 'error');
    } finally {
        // Hide loading
        saveBtn.disabled = false;
        spinner.classList.add('d-none');
    }
}

// Edit flash sale (handle string/number id mismatch)
function editFlashSale(flashSaleId) {
    const idStr = String(flashSaleId);
    const exists = flashSales.some(s => String(s.id) === idStr);
    if (!exists) {
        // Data may be stale; attempt a quick reload before opening
        loadFlashSales().finally(() => showFlashSaleModal(flashSaleId));
    } else {
        showFlashSaleModal(flashSaleId);
    }
}

// Delete flash sale
async function deleteFlashSale(flashSaleId) {
    const flashSale = flashSales.find(s => s.id === flashSaleId);
    if (!flashSale) return;
    
    if (!confirm(`Are you sure you want to delete flash sale "${flashSale.name}"?`)) {
        return;
    }
    
    try {
        const response = await apiCall(`/api/flash-sales/${flashSaleId}`, 'DELETE');
        
        if (response && response.success) {
            showNotification('Flash sale deleted successfully!', 'success');
            loadFlashSales(); // Reload the list
        } else {
            showNotification(response?.message || 'Failed to delete flash sale', 'error');
        }
    } catch (error) {
        console.error('Error deleting flash sale:', error);
        showNotification('Error deleting flash sale', 'error');
    }
}

// ===== UTILITY FUNCTIONS =====

// Helper function to format date for datetime-local input
function formatDateTimeLocal(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
}

// Helper function to format date for date input (YYYY-MM-DD)
function formatDateOnly(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

// Format datetime for display
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return dateString.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ===== CATEGORIES MANAGEMENT =====

let categories = [];
let currentCategory = null;

// Load categories from API
async function loadCategories() {
    try {
        console.log('Loading categories...');
        
        // Show loading state
        const tbody = document.getElementById('categoriesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></td></tr>';
        }
        
        const response = await apiCall('/api/categories');
        console.log('Categories response:', response);
        
        if (response && response.success) {
            categories = response.data || [];
            
            // If no categories and got message about table not found, try to initialize
            if (categories.length === 0 && response.message && response.message.includes('table not found')) {
                console.log('Categories table not found, attempting to initialize...');
                await initializeCategoriesTable();
                return; // initializeCategoriesTable will call loadCategories again
            }
            
            updateCategoriesTable();
            updateCategoriesStats();
            loadParentCategoryOptions();
        } else {
            console.error('Failed to load categories:', response);
            // Show error in table
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td colspan="8" class="text-center text-danger">
                        Failed to load categories. 
                        <br><button class="btn btn-sm btn-primary mt-2" onclick="initializeCategoriesTable()">
                            <i class="fas fa-database me-1"></i>Initialize Categories Table
                        </button>
                    </td></tr>
                `;
            }
            showNotification('Failed to load categories', 'error');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        
        // Show error in table with initialization option
        const tbody = document.getElementById('categoriesTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="8" class="text-center text-danger">
                    Error loading categories. Please check your connection and try again.
                    <br><button class="btn btn-sm btn-primary mt-2" onclick="initializeCategoriesTable()">
                        <i class="fas fa-database me-1"></i>Initialize Categories Table
                    </button>
                </td></tr>
            `;
        }
        
        showNotification('Error loading categories: ' + error.message, 'error');
    }
}

// Test auth status
async function testAuthStatus() {
    try {
        console.log('Testing auth status...');
        showNotification('Checking authentication status...', 'info');
        
        const response = await apiCall('/api/auth/status');
        console.log('Auth status response:', response);
        
        if (response && response.authenticated) {
            console.log('User is authenticated:', response.user);
            showNotification(`✅ Authenticated as: ${response.user.username}`, 'success');
            return true;
        } else {
            console.log('User is not authenticated:', response.message);
            showNotification(`❌ Not authenticated: ${response.message}`, 'error');
            return false;
        }
    } catch (error) {
        console.error('Error testing auth status:', error);
        showNotification('❌ Auth check failed: ' + error.message, 'error');
        return false;
    }
}

// Test categories API connection
async function testCategoriesAPI() {
    try {
        console.log('Testing categories API connection...');
        showNotification('Testing API connection...', 'info');
        
        // First test basic API
        const response = await apiCall('/api/categories/test');
        console.log('API test response:', response);
        
        if (response && response.success) {
            console.log('Categories API is working properly');
            
            // Then test auth status
            const authOk = await testAuthStatus();
            if (authOk) {
                showNotification('API connection & authentication successful! ✓', 'success');
            } else {
                showNotification('API working but authentication failed. Please login again.', 'warning');
            }
            return true;
        } else {
            console.error('Categories API test failed:', response);
            showNotification('API test failed: ' + (response?.message || 'Unknown error'), 'error');
            return false;
        }
    } catch (error) {
        console.error('Error testing categories API:', error);
        showNotification('API connection error: ' + error.message, 'error');
        return false;
    }
}

// Initialize categories table
async function initializeCategoriesTable() {
    try {
        console.log('Initializing categories table...');
        
        // Show loading state
        const tbody = document.getElementById('categoriesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Initializing...</span></div></td></tr>';
        }
        
        // Check auth first
        const authOk = await testAuthStatus();
        if (!authOk) {
            throw new Error('Authentication failed. Please login again.');
        }
        
        console.log('Authentication OK, proceeding with initialization...');
        const response = await apiCall('/api/categories/init', 'POST');
        console.log('Initialize response:', response);
        
        if (response && response.success) {
            showNotification('Categories table initialized successfully!', 'success');
            // Reload categories after initialization
            setTimeout(() => {
                loadCategories();
            }, 1000);
        } else {
            console.error('Failed to initialize categories:', response);
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to initialize categories table.</td></tr>';
            }
            showNotification('Failed to initialize categories table: ' + (response?.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error initializing categories:', error);
        const tbody = document.getElementById('categoriesTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="8" class="text-center text-danger">
                    Error initializing categories table: ${error.message}
                    <br><small>Please check server logs for more details</small>
                    <br><button class="btn btn-sm btn-warning mt-2" onclick="window.location.href='/login'">
                        <i class="fas fa-sign-in-alt me-1"></i>Login Again
                    </button>
                </td></tr>
            `;
        }
        showNotification('Error initializing categories: ' + error.message, 'error');
    }
}

// Update categories table
function updateCategoriesTable() {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;

    if (!categories || categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No categories found</td></tr>';
        return;
    }

    let html = '';
    categories.forEach(category => {
        const status = category.is_active ? 
            '<span class="badge bg-success">Active</span>' : 
            '<span class="badge bg-secondary">Inactive</span>';
        
        const parentName = category.parent_name || '-';
        const createdDate = new Date(category.created_at).toLocaleDateString('id-ID');

        html += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        ${category.image_url ? `<img src="${category.image_url}" alt="${category.name}" class="me-2" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;">` : ''}
                        <div>
                            <strong>${category.name}</strong>
                            ${category.description ? `<br><small class="text-muted">${category.description.substring(0, 50)}${category.description.length > 50 ? '...' : ''}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td><code>${category.slug}</code></td>
                <td>${parentName}</td>
                <td><span class="badge bg-info">${category.products_count || 0}</span></td>
                <td>${category.sort_order}</td>
                <td>${status}</td>
                <td>${escapeHtml(category.meta_title || '')}</td>
                <td>${escapeHtml(category.meta_description ? (category.meta_description.length > 60 ? category.meta_description.substring(0,60) + '…' : category.meta_description) : '')}</td>
                <td>${createdDate}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editCategory(${category.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${category.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Update categories statistics
function updateCategoriesStats() {
    if (!categories) return;

    const totalCategories = categories.length;
    const activeCategories = categories.filter(c => c.is_active).length;
    const mainCategories = categories.filter(c => !c.parent_id).length;
    const subcategories = categories.filter(c => c.parent_id).length;

    // Update UI
    const totalEl = document.getElementById('totalCategoriesCount');
    const activeEl = document.getElementById('activeCategoriesCount');
    const mainEl = document.getElementById('mainCategoriesCount');
    const subEl = document.getElementById('subcategoriesCount');

    if (totalEl) totalEl.textContent = totalCategories;
    if (activeEl) activeEl.textContent = activeCategories;
    if (mainEl) mainEl.textContent = mainCategories;
    if (subEl) subEl.textContent = subcategories;
}

// Load parent category options for the modal
async function loadParentCategoryOptions() {
    const select = document.getElementById('categoryParent');
    if (!select) return;

    // Clear existing options except the first one
    select.innerHTML = '<option value="">None (Main Category)</option>';

    // Add main categories (those without parent_id)
    const mainCategories = categories.filter(c => !c.parent_id && c.is_active);
    mainCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

// Show category modal
function showCategoryModal(categoryId = null) {
    currentCategory = categoryId ? categories.find(c => c.id === categoryId) : null;
    
    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    const title = document.getElementById('categoryModalTitle');
    const form = document.getElementById('categoryForm');
    
    title.textContent = currentCategory ? 'Edit Category' : 'Add New Category';
    
    // Load parent category options
    loadParentCategoryOptions();
    
    if (currentCategory) {
        // Fill form with existing data
        document.getElementById('categoryId').value = currentCategory.id;
        document.getElementById('categoryName').value = currentCategory.name;
        document.getElementById('categorySlug').value = currentCategory.slug;
        document.getElementById('categoryDescription').value = currentCategory.description || '';
        document.getElementById('categoryParent').value = currentCategory.parent_id || '';
        document.getElementById('categorySortOrder').value = currentCategory.sort_order || 0;
        // File input cannot be pre-filled; keep empty to avoid security issues
        document.getElementById('categoryStatus').value = currentCategory.is_active ? '1' : '0';
        document.getElementById('categoryMetaTitle').value = currentCategory.meta_title || '';
        document.getElementById('categoryMetaDescription').value = currentCategory.meta_description || '';
    } else {
        // Reset form
        form.reset();
        document.getElementById('categoryId').value = '';
        document.getElementById('categoryStatus').value = '1';
        document.getElementById('categorySortOrder').value = '0';
    }
    
    modal.show();
}

// Save category with support for image file upload
async function saveCategory() {
    const form = document.getElementById('categoryForm');
    const saveBtn = document.getElementById('saveCategoryBtn');
    const spinner = document.getElementById('categorySaveSpinner');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Show loading
    saveBtn.disabled = true;
    spinner.classList.remove('d-none');
    
    try {
        const fd = new FormData();
        fd.append('name', document.getElementById('categoryName').value);
        const slug = document.getElementById('categorySlug').value;
        if (slug) fd.append('slug', slug);
        const desc = document.getElementById('categoryDescription').value;
        if (desc) fd.append('description', desc);
        const parentId = document.getElementById('categoryParent').value;
        if (parentId) fd.append('parent_id', parentId);
        fd.append('sort_order', String(parseInt(document.getElementById('categorySortOrder').value) || 0));
        fd.append('is_active', document.getElementById('categoryStatus').value === '1' ? '1' : '0');
        const metaTitle = document.getElementById('categoryMetaTitle').value;
        if (metaTitle) fd.append('meta_title', metaTitle);
        const metaDesc = document.getElementById('categoryMetaDescription').value;
        if (metaDesc) fd.append('meta_description', metaDesc);
        const fileInput = document.getElementById('categoryImageFile');
        if (fileInput && fileInput.files && fileInput.files[0]) {
            fd.append('image', fileInput.files[0]);
        }

        const categoryId = document.getElementById('categoryId').value;
        const endpoint = categoryId ? `/api/categories/${categoryId}` : '/api/categories';
        const method = categoryId ? 'PUT' : 'POST';

        console.log('Saving category (multipart):', { name: fd.get('name'), slug: fd.get('slug'), parent_id: fd.get('parent_id') });
        // Bypass apiCall to allow FormData without JSON headers
        const options = { method, body: fd, headers: {} };
        if (authToken) options.headers['Authorization'] = `Bearer ${authToken}`;
        const res = await fetch(endpoint, options);
        const response = await res.json().catch(() => ({ success: false }));
        console.log('Save response:', response);
        
        if (response && response.success) {
            showNotification(`Category ${categoryId ? 'updated' : 'created'} successfully!`, 'success');
            bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
            loadCategories(); // Reload the list
        } else {
            showNotification(response?.message || 'Failed to save category', 'error');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        showNotification('Error saving category', 'error');
    } finally {
        // Hide loading
        saveBtn.disabled = false;
        spinner.classList.add('d-none');
    }
}

// Edit category
function editCategory(categoryId) {
    showCategoryModal(categoryId);
}

// Delete category
async function deleteCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    if (!confirm(`Are you sure you want to delete category "${category.name}"?`)) {
        return;
    }
    
    try {
        const response = await apiCall(`/api/categories/${categoryId}`, 'DELETE');
        
        if (response && response.success) {
            showNotification('Category deleted successfully!', 'success');
            loadCategories(); // Reload the list
        } else {
            showNotification(response?.message || 'Failed to delete category', 'error');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('Error deleting category', 'error');
    }
}

// ===== FREE SHIPPING FUNCTIONS =====

let freeShippingPromotions = [];
let currentFreeShipping = null;

// Load free shipping promotions
async function loadFreeShipping() {
    try {
        console.log('Loading free shipping promotions...');
        
        // Show loading state
        const tbody = document.getElementById('freeShippingTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></td></tr>';
        }
        
        const response = await apiCall('/api/free-shipping');
        console.log('Free shipping response:', response);
        
        if (response && response.success) {
            freeShippingPromotions = response.data || [];
            updateFreeShippingTable();
            updateFreeShippingStats();
        } else {
            console.error('Failed to load free shipping promotions:', response);
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load free shipping promotions</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading free shipping promotions:', error);
        const tbody = document.getElementById('freeShippingTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error loading free shipping promotions</td></tr>';
        }
        showNotification('Error loading free shipping promotions', 'error');
    }
}

// Update free shipping table
function updateFreeShippingTable() {
    const tbody = document.getElementById('freeShippingTableBody');
    if (!tbody) return;

    if (!freeShippingPromotions || freeShippingPromotions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No free shipping promotions found</td></tr>';
        return;
    }

    let html = '';
    freeShippingPromotions.forEach(promo => {
        const now = new Date();
        const startDate = new Date(promo.startDate);
        const endDate = promo.endDate ? new Date(promo.endDate) : null;
        
        let status = '';
        if (!promo.isActive) {
            status = '<span class="badge bg-secondary">Inactive</span>';
        } else if (now < startDate) {
            status = '<span class="badge bg-warning">Scheduled</span>';
        } else if (now >= startDate && (!endDate || now <= endDate)) {
            status = '<span class="badge bg-success">Active</span>';
        } else {
            status = '<span class="badge bg-info">Expired</span>';
        }

        const period = `
            <div class="small">
                <strong>${formatDateOnly(promo.startDate)}</strong>
                ${promo.endDate ? ` - ${formatDateOnly(promo.endDate)}` : ' (No limit)'}
            </div>
        `;

        const usage = promo.usageLimit ? 
            `${promo.usageCount || 0} / ${promo.usageLimit}` : 
            `${promo.usageCount || 0} (Unlimited)`;

        html += `
            <tr>
                <td>
                    <strong>${promo.name}</strong>
                    ${promo.description ? `<br><small class="text-muted">${promo.description}</small>` : ''}
                </td>
                <td>Rp ${(promo.minAmount || 0).toLocaleString()}</td>
                <td>Rp ${(promo.maxDiscount || 0).toLocaleString()}</td>
                <td><span class="badge bg-info">${promo.coverageArea || 'All'}</span></td>
                <td>${period}</td>
                <td>${usage}</td>
                <td>${status}</td>
                <td class="action-buttons">
                    <div class="btn-group btn-group-sm" role="group" aria-label="Free shipping actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="editFreeShipping(${promo.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteFreeShipping(${promo.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Update free shipping statistics
function updateFreeShippingStats() {
    if (!freeShippingPromotions) return;

    const now = new Date();
    const activePromotions = freeShippingPromotions.filter(promo => {
        if (!promo.isActive) return false;
        const startDate = new Date(promo.startDate);
        const endDate = promo.endDate ? new Date(promo.endDate) : null;
        return startDate <= now && (!endDate || endDate >= now);
    });

    const totalSavings = freeShippingPromotions.reduce((sum, promo) => 
        sum + ((promo.usageCount || 0) * (promo.maxDiscount || 0)), 0);
    const totalUsage = freeShippingPromotions.reduce((sum, promo) => sum + (promo.usageCount || 0), 0);

    // Update stats cards
    const activeFreeShippingCount = document.getElementById('activeFreeShippingCount');
    const totalFreeShippingCount = document.getElementById('totalFreeShippingCount');
    const totalShippingSavings = document.getElementById('totalShippingSavings');
    const freeShippingUsageCount = document.getElementById('freeShippingUsageCount');

    if (activeFreeShippingCount) activeFreeShippingCount.textContent = activePromotions.length;
    if (totalFreeShippingCount) totalFreeShippingCount.textContent = freeShippingPromotions.length;
    if (totalShippingSavings) totalShippingSavings.textContent = `Rp ${totalSavings.toLocaleString()}`;
    if (freeShippingUsageCount) freeShippingUsageCount.textContent = totalUsage;
}

// Show free shipping modal
function showFreeShippingModal(freeShippingId = null) {
    currentFreeShipping = freeShippingId ? freeShippingPromotions.find(p => p.id === freeShippingId) : null;
    
    const modal = new bootstrap.Modal(document.getElementById('freeShippingModal'));
    const title = document.getElementById('freeShippingModalTitle');
    const form = document.getElementById('freeShippingForm');
    
    title.textContent = currentFreeShipping ? 'Edit Free Shipping' : 'Add New Free Shipping';
    
    if (currentFreeShipping) {
        // Fill form with existing data
        document.getElementById('freeShippingId').value = currentFreeShipping.id;
        document.getElementById('freeShippingName').value = currentFreeShipping.name;
        document.getElementById('freeShippingDescription').value = currentFreeShipping.description || '';
        document.getElementById('freeShippingMinAmount').value = currentFreeShipping.minAmount || 0;
        document.getElementById('freeShippingMaxDiscount').value = currentFreeShipping.maxDiscount || 0;
        document.getElementById('freeShippingCoverage').value = currentFreeShipping.coverageArea || 'all';
        document.getElementById('freeShippingUsageLimit').value = currentFreeShipping.usageLimit || '';
        document.getElementById('freeShippingStatus').value = currentFreeShipping.isActive ? '1' : '0';
        
        if (currentFreeShipping.startDate) {
            document.getElementById('freeShippingStartDate').value = formatDateOnly(currentFreeShipping.startDate);
        }
        if (currentFreeShipping.endDate) {
            document.getElementById('freeShippingEndDate').value = formatDateOnly(currentFreeShipping.endDate);
        }
    } else {
        // Reset form
        form.reset();
        document.getElementById('freeShippingId').value = '';
        document.getElementById('freeShippingStatus').value = '1';
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('freeShippingStartDate').value = today;
    }
    
    modal.show();
}

// Save free shipping
async function saveFreeShipping() {
    const form = document.getElementById('freeShippingForm');
    const saveBtn = document.getElementById('saveFreeShippingBtn');
    const spinner = document.getElementById('freeShippingSaveSpinner');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Show loading
    saveBtn.disabled = true;
    spinner.classList.remove('d-none');
    
    try {
        const coverageVal = document.getElementById('freeShippingCoverage').value;
        const formData = {
            name: document.getElementById('freeShippingName').value,
            description: document.getElementById('freeShippingDescription').value || null,
            // required by backend: 'type' must be 'location' or 'amount'
            type: (coverageVal && coverageVal !== 'all') ? 'location' : 'amount',
            minAmount: parseFloat(document.getElementById('freeShippingMinAmount').value),
            maxDiscount: parseFloat(document.getElementById('freeShippingMaxDiscount').value),
            coverageArea: coverageVal,
            usageLimit: document.getElementById('freeShippingUsageLimit').value ? parseInt(document.getElementById('freeShippingUsageLimit').value) : null,
            startDate: document.getElementById('freeShippingStartDate').value,
            endDate: document.getElementById('freeShippingEndDate').value || null,
            isActive: document.getElementById('freeShippingStatus').value === '1'
        };
        
        const freeShippingId = document.getElementById('freeShippingId').value;
        const endpoint = freeShippingId ? `/api/free-shipping/${freeShippingId}` : '/api/free-shipping';
        const method = freeShippingId ? 'PUT' : 'POST';
        
        const response = await apiCall(endpoint, method, formData);
        
        if (response && response.success) {
            showNotification(freeShippingId ? 'Free shipping updated successfully!' : 'Free shipping created successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('freeShippingModal')).hide();
            loadFreeShipping();
        } else {
            showNotification(response?.message || 'Failed to save free shipping', 'error');
        }
    } catch (error) {
        console.error('Error saving free shipping:', error);
        showNotification('Error saving free shipping', 'error');
    } finally {
        // Hide loading
        saveBtn.disabled = false;
        spinner.classList.add('d-none');
    }
}

// Edit free shipping
function editFreeShipping(freeShippingId) {
    showFreeShippingModal(freeShippingId);
}

// Delete free shipping
async function deleteFreeShipping(freeShippingId) {
    if (!confirm('Are you sure you want to delete this free shipping promotion?')) {
        return;
    }
    
    try {
        const response = await apiCall(`/api/free-shipping/${freeShippingId}`, 'DELETE');
        
        if (response && response.success) {
            showNotification('Free shipping deleted successfully!', 'success');
            loadFreeShipping();
        } else {
            showNotification(response?.message || 'Failed to delete free shipping', 'error');
        }
    } catch (error) {
        console.error('Error deleting free shipping:', error);
        showNotification('Error deleting free shipping', 'error');
    }
}

// ===== PRODUCT VOUCHERS FUNCTIONS =====

let productVouchers = [];
let currentProductVoucher = null;

// Load product vouchers
async function loadProductVouchers() {
    try {
        console.log('Loading product vouchers...');
        
        // Show loading state
        const tbody = document.getElementById('productVouchersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></td></tr>';
        }
        
        const response = await apiCall('/api/product-vouchers');
        console.log('Product vouchers response:', response);
        
        if (response && response.success) {
            productVouchers = response.data || [];
            updateProductVouchersTable();
            updateProductVouchersStats();
        } else {
            console.error('Failed to load product vouchers:', response);
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load product vouchers</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading product vouchers:', error);
        const tbody = document.getElementById('productVouchersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error loading product vouchers</td></tr>';
        }
        showNotification('Error loading product vouchers', 'error');
    }
}

// Update product vouchers table
function updateProductVouchersTable() {
    const tbody = document.getElementById('productVouchersTableBody');
    if (!tbody) return;

    if (!productVouchers || productVouchers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No product vouchers found</td></tr>';
        return;
    }

    let html = '';
    productVouchers.forEach(voucher => {
        const now = new Date();
        const startDate = new Date(voucher.startDate);
        const endDate = voucher.endDate ? new Date(voucher.endDate) : null;
        
        let status = '';
        if (!voucher.isActive) {
            status = '<span class="badge bg-secondary">Inactive</span>';
        } else if (now < startDate) {
            status = '<span class="badge bg-warning">Scheduled</span>';
        } else if (now >= startDate && (!endDate || now <= endDate)) {
            status = '<span class="badge bg-success">Active</span>';
        } else {
            status = '<span class="badge bg-info">Expired</span>';
        }

        const discount = voucher.type === 'percentage' ? 
            `${voucher.value}%` : 
            `Rp ${voucher.value.toLocaleString()}`;

        const target = `
            <div class="small">
                <span class="badge bg-${voucher.targetType === 'category' ? 'primary' : 'info'}">${voucher.targetType}</span>
                <br>${voucher.targetName || 'Unknown'}
            </div>
        `;

        const conditions = `
            <div class="small">
                ${voucher.minPurchase > 0 ? `Min: Rp ${voucher.minPurchase.toLocaleString()}<br>` : ''}
                ${voucher.maxDiscount ? `Max: Rp ${voucher.maxDiscount.toLocaleString()}<br>` : ''}
                Per user: ${voucher.userLimit}
            </div>
        `;

        const usage = voucher.usageLimit ? 
            `${voucher.usageCount || 0} / ${voucher.usageLimit}` : 
            `${voucher.usageCount || 0} (Unlimited)`;

        html += `
            <tr>
                <td><code>${voucher.code}</code></td>
                <td>
                    <strong>${voucher.name}</strong>
                    ${voucher.description ? `<br><small class="text-muted">${voucher.description}</small>` : ''}
                </td>
                <td><span class="badge bg-danger">${discount}</span></td>
                <td>${target}</td>
                <td>${conditions}</td>
                <td>${usage}</td>
                <td>${status}</td>
                <td class="action-buttons">
                    <div class="btn-group btn-group-sm" role="group" aria-label="Product voucher actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="editProductVoucher(${voucher.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteProductVoucher(${voucher.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Update product vouchers statistics
function updateProductVouchersStats() {
    if (!productVouchers) return;

    const now = new Date();
    const activeVouchers = productVouchers.filter(voucher => {
        if (!voucher.isActive) return false;
        const startDate = new Date(voucher.startDate);
        const endDate = voucher.endDate ? new Date(voucher.endDate) : null;
        return startDate <= now && (!endDate || endDate >= now);
    });

    const categoryVouchers = productVouchers.filter(v => v.targetType === 'category');
    const productSpecificVouchers = productVouchers.filter(v => v.targetType === 'product');
    const totalUsage = productVouchers.reduce((sum, voucher) => sum + (voucher.usageCount || 0), 0);

    // Update stats cards
    const activeProductVouchersCount = document.getElementById('activeProductVouchersCount');
    const categoryVouchersCount = document.getElementById('categoryVouchersCount');
    const productSpecificVouchersCount = document.getElementById('productSpecificVouchersCount');
    const productVoucherUsageCount = document.getElementById('productVoucherUsageCount');

    if (activeProductVouchersCount) activeProductVouchersCount.textContent = activeVouchers.length;
    if (categoryVouchersCount) categoryVouchersCount.textContent = categoryVouchers.length;
    if (productSpecificVouchersCount) productSpecificVouchersCount.textContent = productSpecificVouchers.length;
    if (productVoucherUsageCount) productVoucherUsageCount.textContent = totalUsage;
}

// Show product voucher modal
function showProductVoucherModal(productVoucherId = null) {
    currentProductVoucher = productVoucherId ? productVouchers.find(v => v.id === productVoucherId) : null;
    
    const modal = new bootstrap.Modal(document.getElementById('productVoucherModal'));
    const title = document.getElementById('productVoucherModalTitle');
    const form = document.getElementById('productVoucherForm');
    
    title.textContent = currentProductVoucher ? 'Edit Product Voucher' : 'Add New Product Voucher';
    
    if (currentProductVoucher) {
        // Fill form with existing data
        document.getElementById('productVoucherId').value = currentProductVoucher.id;
        document.getElementById('productVoucherCode').value = currentProductVoucher.code;
        document.getElementById('productVoucherName').value = currentProductVoucher.name;
        document.getElementById('productVoucherDescription').value = currentProductVoucher.description || '';
        document.getElementById('productVoucherType').value = currentProductVoucher.type;
        document.getElementById('productVoucherValue').value = currentProductVoucher.value;
        document.getElementById('productVoucherMaxDiscount').value = currentProductVoucher.maxDiscount || '';
        document.getElementById('productVoucherTargetType').value = currentProductVoucher.targetType;
        document.getElementById('productVoucherMinPurchase').value = currentProductVoucher.minPurchase || 0;
        document.getElementById('productVoucherUsageLimit').value = currentProductVoucher.usageLimit || '';
        document.getElementById('productVoucherUserLimit').value = currentProductVoucher.userLimit || 1;
        document.getElementById('productVoucherStatus').value = currentProductVoucher.isActive ? '1' : '0';
        
        if (currentProductVoucher.startDate) {
            document.getElementById('productVoucherStartDate').value = formatDateOnly(currentProductVoucher.startDate);
        }
        if (currentProductVoucher.endDate) {
            document.getElementById('productVoucherEndDate').value = formatDateOnly(currentProductVoucher.endDate);
        }
        
        // Load target options and set value
        toggleTargetFields();
        setTimeout(() => {
            document.getElementById('productVoucherTarget').value = currentProductVoucher.targetId;
        }, 100);
    } else {
        // Reset form
        form.reset();
        document.getElementById('productVoucherId').value = '';
        document.getElementById('productVoucherStatus').value = '1';
        document.getElementById('productVoucherUserLimit').value = '1';
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('productVoucherStartDate').value = today;
    }
    
    modal.show();
}

// Toggle discount fields based on type
function toggleDiscountFields() {
    const type = document.getElementById('productVoucherType').value;
    const valueHint = document.getElementById('discountValueHint');
    const maxDiscountField = document.getElementById('productVoucherMaxDiscount').parentElement;
    
    if (type === 'percentage') {
        valueHint.textContent = 'Enter percentage (e.g., 20 for 20%)';
        maxDiscountField.style.display = 'block';
    } else if (type === 'fixed_amount') {
        valueHint.textContent = 'Enter amount in Rupiah';
        maxDiscountField.style.display = 'none';
    } else {
        valueHint.textContent = 'Select discount type first';
        maxDiscountField.style.display = 'none';
    }
}

// Toggle target fields based on target type
async function toggleTargetFields() {
    const targetType = document.getElementById('productVoucherTargetType').value;
    const targetSelect = document.getElementById('productVoucherTarget');
    const targetHint = document.getElementById('targetHint');
    
    // Clear existing options
    targetSelect.innerHTML = '<option value="">Loading...</option>';
    
    if (targetType === 'category') {
        targetHint.textContent = 'Choose category for discount';
        try {
            const response = await apiCall('/api/categories');
            if (response && response.success) {
                let options = '<option value="">Select Category</option>';
                response.data.forEach(category => {
                    options += `<option value="${category.id}">${category.name}</option>`;
                });
                targetSelect.innerHTML = options;
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            targetSelect.innerHTML = '<option value="">Error loading categories</option>';
        }
    } else if (targetType === 'product') {
        targetHint.textContent = 'Choose specific product for discount';
        try {
            const response = await apiCall('/api/products');
            if (response && response.success) {
                let options = '<option value="">Select Product</option>';
                response.data.forEach(product => {
                    options += `<option value="${product.id}">${product.name}</option>`;
                });
                targetSelect.innerHTML = options;
            }
        } catch (error) {
            console.error('Error loading products:', error);
            targetSelect.innerHTML = '<option value="">Error loading products</option>';
        }
    } else {
        targetSelect.innerHTML = '<option value="">Select target type first</option>';
        targetHint.textContent = 'Choose category or product';
    }
}

// Save product voucher
async function saveProductVoucher() {
    const form = document.getElementById('productVoucherForm');
    const saveBtn = document.getElementById('saveProductVoucherBtn');
    const spinner = document.getElementById('productVoucherSaveSpinner');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Show loading
    saveBtn.disabled = true;
    spinner.classList.remove('d-none');
    
    try {
        const formData = {
            code: document.getElementById('productVoucherCode').value.toUpperCase(),
            name: document.getElementById('productVoucherName').value,
            description: document.getElementById('productVoucherDescription').value || null,
            type: document.getElementById('productVoucherType').value,
            value: parseFloat(document.getElementById('productVoucherValue').value),
            maxDiscount: document.getElementById('productVoucherMaxDiscount').value ? parseFloat(document.getElementById('productVoucherMaxDiscount').value) : null,
            targetType: document.getElementById('productVoucherTargetType').value,
            targetId: parseInt(document.getElementById('productVoucherTarget').value),
            minPurchase: parseFloat(document.getElementById('productVoucherMinPurchase').value) || 0,
            usageLimit: document.getElementById('productVoucherUsageLimit').value ? parseInt(document.getElementById('productVoucherUsageLimit').value) : null,
            userLimit: parseInt(document.getElementById('productVoucherUserLimit').value) || 1,
            startDate: document.getElementById('productVoucherStartDate').value,
            endDate: document.getElementById('productVoucherEndDate').value || null,
            isActive: document.getElementById('productVoucherStatus').value === '1'
        };
        
        const productVoucherId = document.getElementById('productVoucherId').value;
        const endpoint = productVoucherId ? `/api/product-vouchers/${productVoucherId}` : '/api/product-vouchers';
        const method = productVoucherId ? 'PUT' : 'POST';
        
        const response = await apiCall(endpoint, method, formData);
        
        if (response && response.success) {
            showNotification(productVoucherId ? 'Product voucher updated successfully!' : 'Product voucher created successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('productVoucherModal')).hide();
            loadProductVouchers();
        } else {
            showNotification(response?.message || 'Failed to save product voucher', 'error');
        }
    } catch (error) {
        console.error('Error saving product voucher:', error);
        showNotification('Error saving product voucher', 'error');
    } finally {
        // Hide loading
        saveBtn.disabled = false;
        spinner.classList.add('d-none');
    }
}

// Edit product voucher
function editProductVoucher(productVoucherId) {
    showProductVoucherModal(productVoucherId);
}

// Delete product voucher
async function deleteProductVoucher(productVoucherId) {
    if (!confirm('Are you sure you want to delete this product voucher?')) {
        return;
    }
    
    try {
        const response = await apiCall(`/api/product-vouchers/${productVoucherId}`, 'DELETE');
        
        if (response && response.success) {
            showNotification('Product voucher deleted successfully!', 'success');
            loadProductVouchers();
        } else {
            showNotification(response?.message || 'Failed to delete product voucher', 'error');
        }
    } catch (error) {
        console.error('Error deleting product voucher:', error);
        showNotification('Error deleting product voucher', 'error');
    }
}

// Debug function to test section loading
window.debugWidgetSection = function() {
    console.log('🔍 Debugging widget section...');
    
    // Check if section exists
    const section = document.getElementById('widgets');
    console.log('Widgets section exists:', !!section);
    
    if (section) {
        console.log('Section display:', section.style.display);
        console.log('Section HTML length:', section.innerHTML.length);
    }
    
    // Check table elements
    const table = document.getElementById('widgetsTable');
    const tbody = document.getElementById('widgetsTableBody');
    console.log('Table exists:', !!table);
    console.log('Table body exists:', !!tbody);
    
    // Force show section
    if (section) {
        section.style.display = 'block';
        console.log('✅ Forced section to show');
    }
    
    // Try to load widgets
    console.log('🔄 Attempting to load widgets...');
    loadWidgetsList();
};

// Force show widgets section
window.forceShowWidgets = function() {
    console.log('🎯 Force showing widgets section...');
    
    // Hide all sections first
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show widgets section
    const widgetsSection = document.getElementById('widgets');
    if (widgetsSection) {
        widgetsSection.style.display = 'block';
        console.log('✅ Widgets section shown');
        
        // Load data
        loadWidgets();
        loadWidgetsList();
    } else {
        console.error('❌ Widgets section not found');
    }
};
