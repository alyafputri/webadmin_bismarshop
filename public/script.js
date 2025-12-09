// Main JavaScript for BismarShop Admin Dashboard

// Global variables
let currentSection = 'dashboard';
let products = [];

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
    // Safety: Remove any leftover "view" eye icons that may persist in the Orders section
    try { document.querySelectorAll('#orders .fa-eye').forEach(el => el.remove()); } catch(_) {}
}

function renderOrderRow(o) {
    const id = o.id ?? '';
    const customer = o.customer_name ?? '';
    const email = o.customer_email ?? '';
    const address = (o.shipping_address ?? o.address) ?? '';
    const tracking = (o.tracking_number ?? o.tracking) ?? '-';
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
            <td>
                <span id="tracking-display-${id}">${escapeHtml(tracking)}</span>
                <button class="btn btn-sm btn-link text-decoration-none" title="Edit tracking" onclick="editOrderTracking(${id})">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
            <td>${escapeHtml(total)}</td>
            <td>
                <select class="form-select form-select-sm" onchange="updateOrderStatus(${id}, this.value)">
                    ${statusOptions}
                </select>
            </td>
            <td>${escapeHtml(date)}</td>
            <td>
                <button class="btn btn-sm btn-outline-success" onclick="printReceipt(${id})">Cetak</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteOrder(${id})">Hapus</button>
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

// Edit tracking information for an order (resi / status pengiriman)
window.editOrderTracking = async function editOrderTracking(id) {
    try {
        const idStr = String(id);
        // Cari order baik di allOrdersCache maupun di array orders (fallback lama)
        const fromCache = (typeof allOrdersCache !== 'undefined' && Array.isArray(allOrdersCache))
            ? allOrdersCache.find(o => String(o.id) === idStr)
            : null;
        const fromOrders = (typeof orders !== 'undefined' && Array.isArray(orders))
            ? orders.find(o => String(o.id) === idStr)
            : null;
        const order = fromCache || fromOrders || null;

        const current = order ? (order.tracking_number || order.tracking || '') : '';
        const tracking = prompt('Masukkan informasi tracking (resi / status pengiriman):', current);
        if (tracking === null) return; // user batal

        const payload = { tracking };
        const result = await apiCall(`/api/orders/${idStr}/tracking`, 'PUT', payload);
        console.log('Update tracking response:', result);

        if (result && result.success) {
            showNotification('Tracking berhasil diperbarui', 'success');
            // Update objek order di kedua sumber bila ada
            if (fromCache) {
                fromCache.tracking_number = tracking;
                fromCache.tracking = tracking;
            }
            if (fromOrders && fromOrders !== fromCache) {
                fromOrders.tracking_number = tracking;
                fromOrders.tracking = tracking;
            }
            // Update tampilan span di kedua kemungkinan ID
            const span1 = document.getElementById(`tracking-display-${idStr}`);
            const span2 = document.getElementById(`trk-${idStr}`);
            const text = tracking || '-';
            if (span1) span1.textContent = text;
            if (span2) span2.textContent = text;
        } else {
            showNotification(result?.message || 'Gagal memperbarui tracking', 'error');
        }
    } catch (e) {
        console.error('editOrderTracking error', e);
        showNotification('Terjadi kesalahan saat memperbarui tracking', 'error');
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
function capitalizeFirst(s){ return capitalize(s); } // Alias for backward compatibility

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
            // Start lightweight live polling so new customer reviews appear automatically
            // when an admin is viewing the reviews page.
            startReviewsLive();
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
            <td class="action-buttons text-end">
                <div class="btn-group" role="group" aria-label="Actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="editProduct('${product.id}')" title="Edit Product">
                        <i class="fas fa-edit"></i>
                    </button>
                    <!-- View button removed per request -->
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

// viewProduct removed per request (product view icon/functionality deprecated)

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
            <td>
                <span id="trk-${order.id}">${escapeHtml(order.tracking_number || '-')}</span>
                <button class="btn btn-sm btn-link text-decoration-none" onclick="editOrderTracking('${order.id}')" title="Edit tracking">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
            <td class="currency">${formatCurrency(order.total_amount)}</td>
            <td>
                <select class="form-select form-select-sm" data-current="${String(order.status || '')}" onchange="updateOrderStatus('${order.id}', this.value, this)">
                    <option value="pending" ${String(order.status).toLowerCase()==='pending' ? 'selected' : ''}>Pending</option>
                    <option value="processing" ${String(order.status).toLowerCase()==='processing' ? 'selected' : ''}>Processing</option>
                    <option value="shipped" ${String(order.status).toLowerCase()==='shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="completed" ${String(order.status).toLowerCase()==='completed' ? 'selected' : ''}>Completed</option>
                    <option value="canceled" ${String(order.status).toLowerCase()==='canceled' ? 'selected' : ''}>Canceled</option>
                </select>
            </td>
            <td>${formatDate(order.created_at)}</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-outline-success" onclick="printReceipt('${order.id}')" title="Print Receipt">Cetak</button>
                <button class="btn btn-sm btn-outline-danger" onclick="forceCancelOrder('${order.id}')" title="Cancel Order">Batal</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    // Safety: ensure any leftover "view" icons inside the orders area are removed
    try { document.querySelectorAll('#orders .fa-eye').forEach(el => el.remove()); } catch(_) {}
// Fungsi untuk cancel order secara paksa
async function forceCancelOrder(orderId) {
    if (!orderId) return;
    if (!confirm('Yakin ingin membatalkan pesanan ini?')) return;
    try {
        const resp = await apiCall(`/api/orders/${orderId}`, 'PUT', { status: 'canceled' });
        if (resp && resp.success) {
            showNotification('Pesanan berhasil dibatalkan!', 'success');
            // Update status di local array dan refresh tabel
            const idx = Array.isArray(orders) ? orders.findIndex(o => String(o.id) === String(orderId)) : -1;
            if (idx >= 0) {
                orders[idx].status = 'canceled';
                updateOrdersTable();
            }
            // Refresh data dari server
            loadDashboardData();
        } else {
            showNotification(resp && resp.message ? 'Gagal membatalkan pesanan: ' + resp.message : 'Gagal membatalkan pesanan', 'error');
        }
    } catch (e) {
        showNotification('Terjadi kesalahan saat membatalkan pesanan', 'error');
        console.error('forceCancelOrder error', e);
    }
}
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

// Order detail modal and legacy view handlers removed per request.
// All runtime shims and modal UI for viewing orders/products have been deleted.
// This file no longer exposes `viewOrder`, `viewOrderDetails`, `showOrderDetailModal`, or `viewProduct`.

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
    
    // Determine store name - use fallback if not set or is "Laravel"
    const storeName = (store && store.name && String(store.name).trim() !== '' && String(store.name).trim().toLowerCase() !== 'laravel') 
        ? store.name 
        : 'PT Indo Bismar';
    
    // Format dates and times for receipt
    const receiptDate = new Date(printDate).toLocaleDateString('id-ID', { 
        year: 'numeric', month: '2-digit', day: '2-digit' 
    });
    const receiptTime = new Date(printDate).toLocaleTimeString('id-ID', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    });
    const orderDate = new Date(order.created_at).toLocaleDateString('id-ID', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const itemTotal = (item.price || 0) * (item.quantity || 0);
            itemsHtml += `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; width: 40%;">${escapeHtml(item.product_name || item.name || '-')}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; width: 15%;">${item.quantity || 0}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; width: 22%;">Rp ${formatCurrencySimple(item.price || 0)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; width: 23%;">Rp ${formatCurrencySimple(itemTotal)}</td>
                </tr>
            `;
        });
    }
    
    return `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nota Pembelian - Order #${order.id}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', 'Arial', sans-serif;
                    background: white;
                    color: #000;
                    line-height: 1.5;
                    padding: 20px;
                    font-size: 13px;
                }
                .receipt-container {
                    max-width: 750px;
                    margin: 0 auto;
                    border: 1px solid #999;
                    padding: 30px 25px;
                    background: #fff;
                }
                .header {
                    text-align: center;
                    border-bottom: 3px double #000;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }
                .store-name {
                    font-size: 26px;
                    font-weight: bold;
                    margin-bottom: 8px;
                    letter-spacing: 0.5px;
                    color: #1a1a1a;
                }
                .store-info {
                    font-size: 11px;
                    margin: 3px 0;
                    color: #333;
                }
                .divider-line {
                    border-bottom: 1px solid #000;
                    margin: 15px 0;
                }
                .receipt-header-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 15px;
                    font-size: 12px;
                }
                .receipt-info-block {
                    padding: 8px 0;
                }
                .receipt-label {
                    font-weight: bold;
                    font-size: 11px;
                    color: #555;
                }
                .receipt-value {
                    font-size: 13px;
                    color: #000;
                }
                .customer-info {
                    margin-bottom: 20px;
                    padding: 12px;
                    border: 1px solid #ccc;
                    background: #f9f9f9;
                    font-size: 12px;
                }
                .customer-info-title {
                    font-weight: bold;
                    margin-bottom: 10px;
                    text-decoration: underline;
                    font-size: 12px;
                }
                .customer-info-row {
                    margin: 4px 0;
                    display: grid;
                    grid-template-columns: 100px 1fr;
                }
                .customer-info-row strong {
                    font-weight: 600;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                    font-size: 12px;
                }
                .items-table th {
                    background: #f0f0f0;
                    padding: 10px 8px;
                    border-top: 1px solid #000;
                    border-bottom: 2px solid #000;
                    text-align: left;
                    font-weight: bold;
                    font-size: 11px;
                }
                .items-table td {
                    padding: 8px;
                    border-bottom: 1px solid #ddd;
                }
                .items-table tbody tr:last-child td {
                    border-bottom: 2px solid #000;
                }
                .totals-section {
                    border-top: 2px solid #000;
                    padding-top: 12px;
                    margin-top: 10px;
                    font-size: 12px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 6px 0;
                    border-bottom: 1px dotted #ccc;
                }
                .total-row.subtotal { font-weight: normal; }
                .total-row.tax { font-weight: normal; }
                .total-row.shipping { font-weight: normal; }
                .total-row.grand-total {
                    font-weight: bold;
                    font-size: 14px;
                    border-top: 2px solid #000;
                    border-bottom: 2px solid #000;
                    padding: 10px 0;
                    margin: 10px 0;
                    background: #f5f5f5;
                }
                .grand-total-label { font-size: 14px; }
                .grand-total-value { font-size: 16px; }
                .footer {
                    text-align: center;
                    margin-top: 25px;
                    padding-top: 15px;
                    border-top: 1px solid #000;
                    font-size: 11px;
                }
                .footer-text {
                    margin: 5px 0;
                    line-height: 1.5;
                    color: #333;
                }
                .footer-thank {
                    font-weight: bold;
                    margin: 10px 0;
                    font-size: 12px;
                }
                @media print {
                    body { margin: 0; padding: 5px; background: white; }
                    .receipt-container { border: none; box-shadow: none; }
                    @page { margin: 8mm; size: auto; }
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <!-- Header -->
                <div class="header">
                    <div class="store-name">${escapeHtml(storeName)}</div>
                    <div class="store-info">${escapeHtml(store?.address || 'Jl. Bismarck, Jakarta')}</div>
                    <div class="store-info">📞 ${escapeHtml(store?.phone || '(021) 555-0123')} | 📧 ${escapeHtml(store?.email || 'info@bismarshop.com')}</div>
                </div>
                
                <!-- Receipt & Order Info -->
                <div class="receipt-header-row">
                    <div class="receipt-info-block">
                        <div class="receipt-label">No. Nota:</div>
                        <div class="receipt-value">${escapeHtml(receiptNumber || '-')}</div>
                    </div>
                    <div class="receipt-info-block">
                        <div class="receipt-label">Tanggal Cetak:</div>
                        <div class="receipt-value">${receiptDate} ${receiptTime}</div>
                    </div>
                </div>
                
                <div class="receipt-header-row">
                    <div class="receipt-info-block">
                        <div class="receipt-label">No. Order:</div>
                        <div class="receipt-value">#${order.id}</div>
                    </div>
                    <div class="receipt-info-block">
                        <div class="receipt-label">Tgl. Order:</div>
                        <div class="receipt-value">${orderDate}</div>
                    </div>
                </div>
                
                <div class="divider-line"></div>
                
                <!-- Customer Info -->
                <div class="customer-info">
                    <div class="customer-info-title">INFORMASI PELANGGAN</div>
                    <div class="customer-info-row">
                        <strong>Nama:</strong>
                        <span>${escapeHtml(order.customer_name || '-')}</span>
                    </div>
                    <div class="customer-info-row">
                        <strong>Email:</strong>
                        <span>${escapeHtml(order.customer_email || '-')}</span>
                    </div>
                    <div class="customer-info-row">
                        <strong>Alamat:</strong>
                        <span>${escapeHtml(order.shipping_address || '-')}</span>
                    </div>
                    <div class="customer-info-row">
                        <strong>Status:</strong>
                        <span>${capitalizeFirst(normalizeOrderStatus(order.status || ''))}</span>
                    </div>
                </div>
                
                <!-- Items Table -->
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Produk</th>
                            <th style="text-align: center; width: 15%;">Qty</th>
                            <th style="text-align: right; width: 22%;">Harga</th>
                            <th style="text-align: right; width: 23%;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <!-- Totals -->
                <div class="totals-section">
                    <div class="total-row subtotal">
                        <span>Subtotal:</span>
                        <span style="text-align: right;">Rp ${formatCurrencySimple(subtotal || 0)}</span>
                    </div>
                    <div class="total-row tax">
                        <span>Pajak (10%):</span>
                        <span style="text-align: right;">Rp ${formatCurrencySimple(tax || 0)}</span>
                    </div>
                    <div class="total-row shipping">
                        <span>Pengiriman:</span>
                        <span style="text-align: right;">Rp ${formatCurrencySimple(shipping || 0)}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span class="grand-total-label">TOTAL PEMBAYARAN:</span>
                        <span class="grand-total-value">Rp ${formatCurrencySimple(grandTotal || 0)}</span>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="footer">
                    <div class="footer-thank">🙏 Terima Kasih atas Pembelian Anda!</div>
                    <div class="footer-text">Untuk pertanyaan pesanan, hubungi kami di ${escapeHtml(store?.phone || '(021) 555-0123')}</div>
                    <div class="footer-text">Nota ini adalah bukti pembelian yang sah dan dapat digunakan untuk klaim garansi</div>
                    <div style="margin-top: 15px; font-size: 10px; color: #999;">Dicetak oleh: Sistem BismarShop | ${new Date().toLocaleString('id-ID')}</div>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Helper functions for receipt formatting
function formatCurrencySimple(amount) {
    return (Number(amount) || 0).toLocaleString('id-ID', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
