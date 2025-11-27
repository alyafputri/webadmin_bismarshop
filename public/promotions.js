// Promotions & Discounts JavaScript
// Initialize globals safely without redeclaration conflicts
if (!('currentEditingId' in window)) {
    window.currentEditingId = null;
}
if (!('products' in window)) {
    window.products = [];
}

// Define functions immediately and force override any existing fallbacks
window.openProductDiscountModal = function(id = null) {
    console.log('✅ Product Discount Modal called from promotions.js, ID:', id);
    // Force load modals and open immediately
    loadModals();
    setTimeout(() => {
        const modalElement = document.getElementById('productDiscountModal');
        if (!modalElement) {
            console.error('❌ Product discount modal not found after loadModals!');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        
        // Populate product dropdown
        const productSelect = document.getElementById('pdProductId');
        if (products && products.length > 0) {
            productSelect.innerHTML = products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        } else {
            productSelect.innerHTML = '<option value="">Loading products...</option>';
        }
        
        document.getElementById('productDiscountForm').reset();
        document.getElementById('productDiscountId').value = id || '';
        document.getElementById('pdStartDate').value = new Date().toISOString().slice(0,16);
        document.getElementById('pdIsActive').value = 'true';

        if (id) {
            const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
            fetch(`/api/product-discounts/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
              .then(r => r.json())
              .then(data => {
                const d = data.data || data;
                document.getElementById('productDiscountId').value = d.id;
                document.getElementById('pdProductId').value = d.productId || d.product_id;
                document.getElementById('pdType').value = d.discountType || d.discount_type;
                document.getElementById('pdValue').value = d.discountValue || d.discount_value;
                document.getElementById('pdIsActive').value = (d.isActive || d.is_active) ? 'true' : 'false';
                document.getElementById('pdReason').value = d.reason || '';
                document.getElementById('pdStartDate').value = d.startDate ? new Date(d.startDate).toISOString().slice(0,16) : '';
                document.getElementById('pdEndDate').value = d.endDate ? new Date(d.endDate).toISOString().slice(0,16) : '';
              })
              .catch(err => console.error('Error loading product discount:', err));
        }
        
        modal.show();
        console.log('✅ Product discount modal opened successfully');
    }, 200);
};

window.openFlashSaleModal = function(id = null) {
    console.log('✅ Flash Sale Modal called from promotions.js, ID:', id);
    loadModals();
    setTimeout(() => {
        const modalElement = document.getElementById('flashSaleModal');
        if (!modalElement) {
            console.error('❌ Flash sale modal not found!');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        document.getElementById('flashSaleForm').reset();
        document.getElementById('fsId').value = id || '';
        document.getElementById('fsStart').value = new Date().toISOString().slice(0,16);
        document.getElementById('fsActive').value = 'true';

        if (id) {
            const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
            fetch(`/api/flash-sales/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
              .then(r => r.json())
              .then(data => {
                const d = data.data || data;
                document.getElementById('fsId').value = d.id;
                document.getElementById('fsName').value = d.name || '';
                document.getElementById('fsDesc').value = d.description || '';
                document.getElementById('fsPercent').value = d.discountPercentage || d.discount_percentage || 0;
                document.getElementById('fsStart').value = d.startDate ? new Date(d.startDate).toISOString().slice(0,16) : '';
                document.getElementById('fsEnd').value = d.endDate ? new Date(d.endDate).toISOString().slice(0,16) : '';
                document.getElementById('fsActive').value = (d.isActive || d.is_active) ? 'true' : 'false';
              })
              .catch(err => console.error('Error loading flash sale:', err));
        }
        
        modal.show();
        console.log('✅ Flash sale modal opened successfully');
    }, 200);
};

window.openFreeShippingModal = function(id = null) {
    console.log('✅ Free Shipping Modal called from promotions.js, ID:', id);
    loadModals();
    setTimeout(() => {
        const modalElement = document.getElementById('freeShippingModal');
        if (!modalElement) {
            console.error('❌ Free shipping modal not found!');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        document.getElementById('freeShippingForm').reset();
        document.getElementById('fsfId').value = id || '';
        document.getElementById('fsfStart').value = new Date().toISOString().slice(0,16);
        document.getElementById('fsfActive').value = 'true';

        if (id) {
            const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
            fetch(`/api/free-shipping/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
              .then(r => r.json())
              .then(data => {
                const d = data.data || data;
                document.getElementById('fsfId').value = d.id;
                document.getElementById('fsfName').value = d.name || '';
                document.getElementById('fsfDesc').value = d.description || '';
                document.getElementById('fsfMinAmount').value = d.minAmount || d.min_amount || '';
                document.getElementById('fsfStart').value = d.startDate ? new Date(d.startDate).toISOString().slice(0,16) : '';
                document.getElementById('fsfEnd').value = d.endDate ? new Date(d.endDate).toISOString().slice(0,16) : '';
                document.getElementById('fsfActive').value = (d.isActive || d.is_active) ? 'true' : 'false';
              })
              .catch(err => console.error('Error loading free shipping:', err));
        }
        
        modal.show();
        console.log('✅ Free shipping modal opened successfully');
    }, 200);
};

console.log('🚀 Promotion modal functions registered globally and ready!');

// SweetAlert2 shim to prevent crashes if Swal isn't loaded on current page
if (typeof window.Swal === 'undefined') {
    window.Swal = {
        fire: function(options) {
            try {
                const icon = options && options.icon ? options.icon : 'info';
                const title = options && options.title ? options.title : '';
                const text = options && options.text ? options.text : '';
                const message = title ? `${title}${text ? ' - ' + text : ''}` : (text || '');
                promoNotify(message, icon === 'error' ? 'error' : (icon === 'success' ? 'success' : 'info'));
            } catch (_) { alert((options && (options.title || options.text)) || 'Info'); }
            return Promise.resolve({ isConfirmed: true });
        }
    };
}

// Force override any fallback functions that might exist
setTimeout(() => {
    window.openProductDiscountModal = window.openProductDiscountModal;
    window.openFlashSaleModal = window.openFlashSaleModal;
    window.openFreeShippingModal = window.openFreeShippingModal;
    console.log('🔄 Functions re-registered to override fallbacks');
}, 100);

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    checkAuth();
    loadModals();
    // Urutan: stats, vouchers, products, discounts, flash, free-shipping
    loadPromotionStats();
    loadVouchers();
    await loadProducts();
    await loadProductDiscounts();
    loadFlashSales();
    loadFreeShipping();
});

// Authentication check
function checkAuth() {
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken');
    window.location.href = 'login.html';
}

// Load promotion statistics
async function loadPromotionStats() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const response = await fetch('/api/promotions/analytics', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            displayStats(result.data);
        }
    } catch (error) {
        console.error('Error loading promotion stats:', error);
    }
}

// Display statistics
function displayStats(stats) {
    const statsCards = document.getElementById('statsCards');
    if (!statsCards) return; // Prevent null error if used on pages without stats container
    stats = stats || { vouchers:{active:0,total:0}, flashSales:{active:0}, productDiscounts:{active:0}, totalSavings:0 };
    statsCards.innerHTML = `
        <div class="col-md-3">
            <div class="stats-card">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">Voucher Aktif</h6>
                        <div class="stats-number">${stats.vouchers?.active ?? 0}</div>
                        <small>dari ${stats.vouchers?.total ?? 0} total</small>
                    </div>
                    <i class="fas fa-ticket-alt fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stats-card">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">Flash Sale</h6>
                        <div class="stats-number">${stats.flashSales?.active ?? 0}</div>
                        <small>sedang berlangsung</small>
                    </div>
                    <i class="fas fa-bolt fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stats-card">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">Diskon Produk</h6>
                        <div class="stats-number">${stats.productDiscounts?.active ?? 0}</div>
                        <small>produk dengan diskon</small>
                    </div>
                    <i class="fas fa-percent fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stats-card">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">Total Penghematan</h6>
                        <div class="stats-number">Rp ${formatCurrency(stats.totalSavings ?? 0)}</div>
                        <small>dari semua promo</small>
                    </div>
                    <i class="fas fa-coins fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    `;
}

// Load vouchers
async function loadVouchers() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const listEl = document.getElementById('vouchersList');
        if (listEl) {
            listEl.innerHTML = '<p class="text-center text-muted"><i class="fas fa-spinner fa-spin me-1"></i> Memuat voucher...</p>';
        }
        const response = await fetch('/api/vouchers', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('GET /api/vouchers failed:', response.status, response.statusText);
            displayVouchers([]);
            return;
        }
        const result = await response.json();
        const data = Array.isArray(result) ? result : (result.data || []);
        displayVouchers(data);
    } catch (error) {
        console.error('Error loading vouchers:', error);
        const listEl = document.getElementById('vouchersList');
        if (listEl) {
            listEl.innerHTML = '<p class="text-center text-danger">Gagal memuat voucher. Coba muat ulang halaman.</p>';
        }
    }
}

// Display vouchers
function displayVouchers(vouchers) {
    const vouchersList = document.getElementById('vouchersList');
    if (!vouchersList) return;
    
    if (vouchers.length === 0) {
        vouchersList.innerHTML = '<p class="text-muted text-center">Belum ada voucher yang dibuat.</p>';
        return;
    }

    vouchersList.innerHTML = vouchers.map(voucher => {
        const usageLimit = voucher.usageLimit ?? voucher.usage_limit ?? 0;
        const usedCount = voucher.usedCount ?? voucher.used_count ?? 0;
        const startDate = voucher.startDate ?? voucher.start_date;
        const endDate = voucher.endDate ?? voucher.end_date;
        const isActive = (voucher.isActive ?? voucher.is_active) === true;
        const type = voucher.type ?? voucher.voucher_type;
        const value = voucher.value ?? voucher.voucher_value ?? 0;
        const usagePercentage = usageLimit > 0 ? (usedCount / usageLimit) * 100 : 0;
        const isExpired = endDate ? (new Date(endDate) < new Date()) : false;
        const statusBadge = isActive && !isExpired ? 
            '<span class="badge bg-success">Aktif</span>' : 
            '<span class="badge bg-secondary">Tidak Aktif</span>';

        return `
            <div class="promotion-item">
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
                                    ${formatDate(startDate)} - ${formatDate(endDate)}
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
                            <div class="usage-progress mt-2">
                                <div class="usage-progress-bar" style="width: ${usagePercentage}%"></div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="mb-2">
                            <strong class="text-primary">
                                ${type === 'percentage' ? value + '%' : 'Rp ' + formatCurrency(value)}
                            </strong>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="editVoucher('${voucher.id || voucher.voucher_id || ''}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteVoucher('${voucher.id || voucher.voucher_id || ''}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Load product discounts
async function loadProductDiscounts() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const response = await fetch('/api/product-discounts', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Product discounts loaded:', result);
            displayProductDiscounts(result.data || result);
        } else {
            console.error('Failed to load product discounts:', response.status);
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
        const prod = (products || []).find(p => String(p.id) === String(discount.productId));
        const originalPrice = prod?.regular_price ?? prod?.price ?? null;
        let discountedPrice = null;
        if (originalPrice != null) {
            if (discount.discountType === 'percentage') {
                discountedPrice = Math.max(0, Math.floor(originalPrice * (1 - (discount.discountValue / 100))));
            } else {
                discountedPrice = Math.max(0, originalPrice - parseInt(discount.discountValue || 0));
            }
        }

        const isExpired = discount.endDate ? (new Date(discount.endDate) < new Date()) : false;
        const statusBadge = discount.isActive && !isExpired ? 
            '<span class="badge bg-success">Aktif</span>' : 
            '<span class="badge bg-secondary">Tidak Aktif</span>';

        return `
            <div class="promotion-item">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="d-flex align-items-center mb-2">
                            <h6 class="mb-0 me-3">${discount.productName || prod?.name || 'Produk'}</h6>
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
                                    ${discount.discountType === 'percentage' ? `${discount.discountValue}%` : `Hemat Rp ${formatCurrency(discount.discountValue)}`}
                                </small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="mb-2">
                            ${originalPrice != null ? `<div class="text-decoration-line-through text-muted">Rp ${formatCurrency(originalPrice)}</div>` : ''}
                            ${discountedPrice != null ? `<strong class="text-success">Rp ${formatCurrency(discountedPrice)}</strong>` : `<strong class="text-success">${discount.discountType === 'percentage' ? discount.discountValue + '%' : 'Rp ' + formatCurrency(discount.discountValue)}</strong>`}
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
        `;
    }).join('');
}

// Load flash sales
async function loadFlashSales() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const response = await fetch('/api/flash-sales', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Flash sales loaded:', result);
            displayFlashSales(result);
        } else {
            console.error('Failed to load flash sales:', response.status);
        }
    } catch (error) {
        console.error('Error loading flash sales:', error);
    }
}

// Display flash sales
function displayFlashSales(flashSales) {
    const flashSalesList = document.getElementById('flashSalesList');
    
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
            <div class="promotion-item">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="d-flex align-items-center mb-2">
                            <h6 class="mb-0 me-3">${flashSale.name}</h6>
                            ${statusBadge}
                            <span class="countdown ms-2">${flashSale.discountPercentage}% OFF</span>
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
                                    ${flashSale.products.length} produk terlibat
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
        `;
    }).join('');
}

// Load free shipping promotions
async function loadFreeShipping() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const response = await fetch('/api/free-shipping', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Free shipping loaded:', result);
            displayFreeShipping(result);
        } else {
            console.error('Failed to load free shipping:', response.status);
        }
    } catch (error) {
        console.error('Error loading free shipping:', error);
    }
}

// Display free shipping promotions
function displayFreeShipping(promotions) {
    const freeShippingList = document.getElementById('freeShippingList');
    
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
            <div class="promotion-item">
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
        `;
    }).join('');
}

// Load products for dropdown
async function loadProducts() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const response = await fetch('/api/products', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            // Backend mengirim array langsung; fallback jika ada wrapper {data}
            if (Array.isArray(result)) {
                products = result;
            } else if (Array.isArray(result.data)) {
                products = result.data;
            } else {
                products = [];
            }
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format datetime-local to 'YYYY-MM-DD HH:mm:ss'
function toSqlDatetime(dtStr) {
    if (!dtStr) return null;
    try {
        const d = new Date(dtStr);
        const pad = n => String(n).padStart(2, '0');
        const yyyy = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
    } catch (_) { return dtStr; }
}

// Load modals
function loadModals() {
    const modalsContainer = document.getElementById('modalsContainer');
    if (!modalsContainer) {
        console.error('modalsContainer not found');
        return;
    }
    modalsContainer.innerHTML = `
        <!-- Voucher Modal -->
        <div class="modal fade" id="voucherModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="fas fa-ticket-alt me-2"></i>Voucher Belanja</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
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

// Save voucher
async function saveVoucher() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const voucherId = document.getElementById('voucherId').value;
        
        const startLocal = document.getElementById('voucherStartDate').value;
        const endLocal = document.getElementById('voucherEndDate').value;
        const isActiveBool = document.getElementById('voucherIsActive').value === 'true';

        const voucherData = {
            // camelCase
            code: document.getElementById('voucherCode').value,
            name: document.getElementById('voucherName').value,
            description: document.getElementById('voucherDescription').value,
            type: document.getElementById('voucherType').value,
            value: parseInt(document.getElementById('voucherValue').value),
            minPurchase: document.getElementById('voucherMinPurchase').value ? parseInt(document.getElementById('voucherMinPurchase').value) : 0,
            maxDiscount: document.getElementById('voucherMaxDiscount').value ? parseInt(document.getElementById('voucherMaxDiscount').value) : 0,
            usageLimit: document.getElementById('voucherUsageLimit').value ? parseInt(document.getElementById('voucherUsageLimit').value) : 0,
            isActive: isActiveBool,
            startDate: toSqlDatetime(startLocal),
            endDate: endLocal ? toSqlDatetime(endLocal) : null,
            // snake_case duplicates for backend compatibility
            voucher_type: document.getElementById('voucherType').value,
            voucher_value: parseInt(document.getElementById('voucherValue').value),
            min_purchase: document.getElementById('voucherMinPurchase').value ? parseInt(document.getElementById('voucherMinPurchase').value) : 0,
            max_discount: document.getElementById('voucherMaxDiscount').value ? parseInt(document.getElementById('voucherMaxDiscount').value) : 0,
            usage_limit: document.getElementById('voucherUsageLimit').value ? parseInt(document.getElementById('voucherUsageLimit').value) : 0,
            is_active: isActiveBool ? 1 : 0,
            start_date: toSqlDatetime(startLocal),
            end_date: endLocal ? toSqlDatetime(endLocal) : null
        };

        const url = voucherId ? `/api/vouchers/${voucherId}` : '/api/vouchers';
        const method = voucherId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(voucherData)
        });

        if (response.ok) {
            const result = await response.json();
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: result.message,
                timer: 2000,
                showConfirmButton: false
            });
            
            bootstrap.Modal.getInstance(document.getElementById('voucherModal')).hide();
            loadVouchers();
            loadPromotionStats();
        } else {
            let msg = 'Failed to save voucher';
            try {
                const text = await response.text();
                msg = text || msg;
            } catch(_) {}
            throw new Error(msg);
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: error.message || 'Gagal menyimpan voucher'
        });
    }
}

// Load voucher data for edit
async function loadVoucherData(id) {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const resp = await fetch(`/api/vouchers/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) throw new Error('Gagal memuat data voucher');
        const result = await resp.json();
        const v = result.data || result;
        document.getElementById('voucherId').value = v.id || '';
        document.getElementById('voucherCode').value = v.code || '';
        document.getElementById('voucherName').value = v.name || '';
        document.getElementById('voucherDescription').value = v.description || '';
        document.getElementById('voucherType').value = v.type || v.voucher_type || 'percentage';
        document.getElementById('voucherValue').value = v.value ?? v.voucher_value ?? 0;
        document.getElementById('voucherMinPurchase').value = v.minPurchase ?? v.min_purchase ?? 0;
        document.getElementById('voucherMaxDiscount').value = v.maxDiscount ?? v.max_discount ?? 0;
        document.getElementById('voucherUsageLimit').value = v.usageLimit ?? v.usage_limit ?? 0;
        document.getElementById('voucherIsActive').value = (v.isActive ?? v.is_active) ? 'true' : 'false';
        // Parse dates to datetime-local format
        document.getElementById('voucherStartDate').value = v.startDate ? new Date(v.startDate).toISOString().slice(0,16) : (v.start_date ? new Date(v.start_date).toISOString().slice(0,16) : '');
        document.getElementById('voucherEndDate').value = v.endDate ? new Date(v.endDate).toISOString().slice(0,16) : (v.end_date ? new Date(v.end_date).toISOString().slice(0,16) : '');
    } catch (e) {
        Swal.fire({ icon:'error', title:'Error', text: e.message || 'Gagal memuat data voucher' });
    }
}

// Delete voucher
async function deleteVoucher(id) {
    try {
        const result = await Swal.fire({
            title: 'Hapus Voucher?',
            text: 'Voucher yang dihapus tidak dapat dikembalikan!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
            const response = await fetch(`/api/vouchers/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: 'Voucher berhasil dihapus',
                    timer: 2000,
                    showConfirmButton: false
                });
                
                loadVouchers();
                loadPromotionStats();
            }
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Gagal menghapus voucher'
        });
    }
}

// Placeholder functions for other features
function openProductDiscountModal(id = null) {
    currentEditingId = id;
    // Isi dropdown produk
    const select = document.getElementById('pdProductId');
    select.innerHTML = (products || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    if (id) {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        fetch(`/api/product-discounts/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(r => r.json())
          .then(result => {
              const d = result.data || result;
              document.getElementById('productDiscountId').value = d.id;
              document.getElementById('pdProductId').value = d.productId;
              document.getElementById('pdType').value = d.discountType;
              document.getElementById('pdValue').value = d.discountValue;
              document.getElementById('pdIsActive').value = d.isActive ? 'true' : 'false';
              document.getElementById('pdReason').value = d.reason || '';
              document.getElementById('pdStartDate').value = d.startDate ? new Date(d.startDate).toISOString().slice(0,16) : '';
              document.getElementById('pdEndDate').value = d.endDate ? new Date(d.endDate).toISOString().slice(0,16) : '';
          });
    } else {
        document.getElementById('productDiscountForm').reset();
        document.getElementById('productDiscountId').value = '';
        document.getElementById('pdStartDate').value = new Date().toISOString().slice(0,16);
        document.getElementById('pdIsActive').value = 'true';
    }

    const modal = new bootstrap.Modal(document.getElementById('productDiscountModal'));
    modal.show();
}

async function saveProductDiscount() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const id = document.getElementById('productDiscountId').value;
        const payload = {
            productId: document.getElementById('pdProductId').value,
            discountType: document.getElementById('pdType').value,
            discountValue: parseInt(document.getElementById('pdValue').value),
            startDate: document.getElementById('pdStartDate').value,
            endDate: document.getElementById('pdEndDate').value || null,
            isActive: document.getElementById('pdIsActive').value === 'true',
            reason: document.getElementById('pdReason').value || null
        };

        const url = id ? `/api/product-discounts/${id}` : '/api/product-discounts';
        const method = id ? 'PUT' : 'POST';

        const resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) throw new Error('Gagal menyimpan diskon produk');
        const result = await resp.json();

        Swal.fire({ icon: 'success', title: 'Berhasil', text: result.message || 'Diskon produk tersimpan', timer: 1800, showConfirmButton: false });
        bootstrap.Modal.getInstance(document.getElementById('productDiscountModal')).hide();
        await loadProductDiscounts();
        await loadPromotionStats();
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: e.message || 'Gagal menyimpan diskon produk' });
    }
}

function openFlashSaleModal(id = null) {
    document.getElementById('flashSaleForm').reset();
    document.getElementById('fsId').value = id ? id : '';
    // default
    document.getElementById('fsStart').value = new Date().toISOString().slice(0,16);
    document.getElementById('fsActive').value = 'true';

    if (id) {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        fetch(`/api/flash-sales/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => {
            const d = data.data || data;
            document.getElementById('fsName').value = d.name || '';
            document.getElementById('fsDesc').value = d.description || '';
            document.getElementById('fsPercent').value = d.discountPercentage || d.discount_percentage || 0;
            document.getElementById('fsStart').value = d.startDate ? new Date(d.startDate).toISOString().slice(0,16) : '';
            document.getElementById('fsEnd').value = d.endDate ? new Date(d.endDate).toISOString().slice(0,16) : '';
            document.getElementById('fsActive').value = d.isActive ? 'true' : 'false';
          });
    }
}

function editVoucher(id) {
    openVoucherModal(id);
}

// Product Discount Functions - Implementation moved to top of file

async function saveProductDiscount() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const id = document.getElementById('productDiscountId').value;
        const payload = {
            productId: parseInt(document.getElementById('pdProductId').value),
            discountType: document.getElementById('pdType').value,
            discountValue: parseInt(document.getElementById('pdValue').value),
            startDate: document.getElementById('pdStartDate').value,
            endDate: document.getElementById('pdEndDate').value || null,
            isActive: document.getElementById('pdIsActive').value === 'true',
            reason: document.getElementById('pdReason').value || null
        };

        const url = id ? `/api/product-discounts/${id}` : '/api/product-discounts';
        const method = id ? 'PUT' : 'POST';

        const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error('Gagal menyimpan diskon produk');
        promoNotify('Diskon produk tersimpan', 'success');
        bootstrap.Modal.getInstance(document.getElementById('productDiscountModal')).hide();
        await loadProductDiscounts();
        await loadPromotionStats();
    } catch (e) {
        promoNotify(e.message || 'Gagal menyimpan diskon produk', 'error');
    }
}

function editProductDiscount(id) {
    window.openProductDiscountModal(id);
}

// Flash Sale Functions - Implementation moved to top of file

function editFlashSale(id) {
    window.openFlashSaleModal(id);
}

// This section is handled by openFreeShippingModalImpl below

async function saveFreeShipping() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const id = document.getElementById('fsfId').value;
        const payload = {
            name: document.getElementById('fsfName').value,
            description: document.getElementById('fsfDesc').value || null,
            minAmount: document.getElementById('fsfMinAmount').value ? parseInt(document.getElementById('fsfMinAmount').value) : null,
            startDate: document.getElementById('fsfStart').value,
            endDate: document.getElementById('fsfEnd').value || null,
            isActive: document.getElementById('fsfActive').value === 'true'
        };

        const url = id ? `/api/free-shipping/${id}` : '/api/free-shipping';
        const method = id ? 'PUT' : 'POST';
        const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error('Gagal menyimpan gratis ongkir');
        Swal.fire({ icon:'success', title:'Berhasil', text:'Gratis ongkir tersimpan', timer:1700, showConfirmButton:false });
        bootstrap.Modal.getInstance(document.getElementById('freeShippingModal')).hide();
        await loadFreeShipping();
        await loadPromotionStats();
    } catch (e) {
        Swal.fire({ icon:'error', title:'Error', text:e.message || 'Gagal menyimpan gratis ongkir' });
    }
}

async function deleteFreeShipping(id) {
    try {
        const ask = await Swal.fire({
            title: 'Hapus Gratis Ongkir?',
            text: 'Tindakan ini tidak dapat dibatalkan',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });
        if (!ask.isConfirmed) return;
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const resp = await fetch(`/api/free-shipping/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) throw new Error('Gagal menghapus gratis ongkir');
        Swal.fire({ icon:'success', title:'Berhasil', text:'Gratis ongkir dihapus', timer:1400, showConfirmButton:false });
        await loadFreeShipping();
        await loadPromotionStats();
    } catch (e) {
        Swal.fire({ icon:'error', title:'Error', text:e.message || 'Gagal menghapus gratis ongkir' });
    }
}

async function loadFreeShipping() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const resp = await fetch('/api/free-shipping', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) throw new Error('Gagal memuat gratis ongkir');
        const data = await resp.json();
        displayFreeShipping(data.data || data);
    } catch (e) {
        console.error('loadFreeShipping error:', e);
    }
}

function displayFreeShipping(items) {
    const el = document.getElementById('freeShippingList');
    if (!el) return;
    if (!items || !items.length) {
        el.innerHTML = '<p class="text-muted text-center">Belum ada promo gratis ongkir.</p>';
        return;
    }
    el.innerHTML = items.map(p => {
        const isExpired = p.endDate ? (new Date(p.endDate) < new Date()) : false;
        const badge = p.isActive && !isExpired ? '<span class="badge bg-info text-dark">Aktif</span>' : '<span class="badge bg-secondary">Tidak Aktif</span>';
        const min = (p.minAmount ?? p.min_amount) ? `Min. Rp ${formatCurrency(p.minAmount ?? p.min_amount)}` : 'Tanpa minimal';
        return `
        <div class="promotion-item">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <div class="d-flex align-items-center mb-2">
                        <h6 class="mb-0 me-3">${p.name || 'Gratis Ongkir'}</h6>
                        ${badge}
                    </div>
                    <p class="text-muted mb-2">${p.description || ''}</p>
                    <small class="text-muted"><i class="fas fa-calendar me-1"></i>${formatDate(p.startDate)} - ${formatDate(p.endDate)} | ${min}</small>
                </div>
                <div class="col-md-4 text-end">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editFreeShipping('${p.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteFreeShipping('${p.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

async function deleteProductDiscount(id) {
    if (!confirm('Hapus diskon produk ini?')) return;
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const resp = await fetch(`/api/product-discounts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) throw new Error('Gagal menghapus diskon');
        promoNotify('Diskon produk dihapus', 'success');
        await loadProductDiscounts();
        await loadPromotionStats();
    } catch (e) {
        promoNotify(e.message || 'Gagal menghapus diskon', 'error');
    }
}

async function deleteFlashSale(id) {
    if (!confirm('Hapus flash sale ini?')) return;
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const resp = await fetch(`/api/flash-sales/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) throw new Error('Gagal menghapus flash sale');
        promoNotify('Flash sale dihapus', 'success');
        await loadFlashSales();
        await loadPromotionStats();
    } catch (e) {
        promoNotify(e.message || 'Gagal menghapus flash sale', 'error');
    }
}

async function saveFlashSale() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const id = document.getElementById('fsId').value;
        // read optional fields safely if exist in modal
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };
        const dtStart = getVal('fsStart');
        const dtEnd = getVal('fsEnd');
        const toTime = (dt) => {
            if (!dt) return '';
            try { const d = new Date(dt); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`; } catch (_) { return ''; }
        };
        const payload = {
            name: document.getElementById('fsName').value,
            description: document.getElementById('fsDesc').value || null,
            discountPercentage: parseInt(document.getElementById('fsPercent').value),
            startDate: dtStart,
            endDate: dtEnd || null,
            startTime: toTime(dtStart) || getVal('fsStartTime') || '00:00:00',
            endTime: toTime(dtEnd) || getVal('fsEndTime') || '23:59:59',
            totalStock: parseInt(getVal('fsTotal')) || 0,
            maxQuantityPerUser: parseInt(getVal('fsMaxPerUser')) || 1,
            autoApply: (function(){ const v = getVal('fsAuto'); return v ? (v === 'true' || v === '1' || v === 'on') : true; })(),
            isActive: document.getElementById('fsActive').value === 'true'
        };

        const url = id ? `/api/flash-sales/${id}` : '/api/flash-sales';
        const method = id ? 'PUT' : 'POST';

        const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        if (!resp.ok) {
            let t = '';
            try { t = await resp.text(); } catch(_) {}
            throw new Error(t || 'Gagal menyimpan flash sale');
        }
        promoNotify('Flash sale tersimpan', 'success');
        bootstrap.Modal.getInstance(document.getElementById('flashSaleModal')).hide();
        await loadFlashSales();
        await loadPromotionStats();
    } catch (e) {
        promoNotify(e.message || 'Gagal menyimpan flash sale', 'error');
    }
}

async function loadFlashSales() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const resp = await fetch('/api/flash-sales', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) throw new Error('Gagal memuat flash sale');
        const data = await resp.json();
        displayFlashSales(data.data || data);
    } catch (e) {
        console.error('loadFlashSales error:', e);
    }
}

function displayFlashSales(items) {
    const el = document.getElementById('flashSalesList');
    if (!el) return;
    if (!items || !items.length) {
        el.innerHTML = '<p class="text-muted text-center">Belum ada flash sale.</p>';
        return;
    }
    el.innerHTML = items.map(fs => {
        const isExpired = fs.endDate ? (new Date(fs.endDate) < new Date()) : false;
        const badge = fs.isActive && !isExpired ? '<span class="badge bg-warning text-dark">Aktif</span>' : '<span class="badge bg-secondary">Tidak Aktif</span>';
        return `
        <div class="promotion-item">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <div class="d-flex align-items-center mb-2">
                        <h6 class="mb-0 me-3">${fs.name || 'Flash Sale'}</h6>
                        ${badge}
                    </div>
                    <p class="text-muted mb-2">${fs.description || ''}</p>
                    <small class="text-muted"><i class="fas fa-calendar me-1"></i>${formatDate(fs.startDate)} - ${formatDate(fs.endDate)}</small>
                </div>
                <div class="col-md-4 text-end">
                    <div class="mb-2"><strong class="text-danger">${fs.discountPercentage || fs.discount_percentage || 0}%</strong></div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editFlashSale('${fs.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteFlashSale('${fs.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Free Shipping Functions - Implementation moved to top of file

async function saveFreeShipping() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const id = document.getElementById('fsfId').value;
        const payload = {
            name: document.getElementById('fsfName').value,
            description: document.getElementById('fsfDesc').value || null,
            minAmount: document.getElementById('fsfMinAmount').value ? parseInt(document.getElementById('fsfMinAmount').value) : null,
            startDate: document.getElementById('fsfStart').value,
            endDate: document.getElementById('fsfEnd').value || null,
            isActive: document.getElementById('fsfActive').value === 'true'
        };

        const url = id ? `/api/free-shipping/${id}` : '/api/free-shipping';
        const method = id ? 'PUT' : 'POST';

        const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error('Gagal menyimpan gratis ongkir');
        promoNotify('Gratis ongkir tersimpan', 'success');
        bootstrap.Modal.getInstance(document.getElementById('freeShippingModal')).hide();
        await loadFreeShipping();
        await loadPromotionStats();
    } catch (e) {
        promoNotify(e.message || 'Gagal menyimpan gratis ongkir', 'error');
    }
}

async function loadFreeShipping() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const resp = await fetch('/api/free-shipping', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) throw new Error('Gagal memuat gratis ongkir');
        const data = await resp.json();
        displayFreeShipping(data.data || data);
    } catch (e) {
        console.error('loadFreeShipping error:', e);
    }
}

function displayFreeShipping(items) {
    const el = document.getElementById('freeShippingList');
    if (!el) return;
    if (!items || !items.length) {
        el.innerHTML = '<p class="text-muted text-center">Belum ada promo gratis ongkir.</p>';
        return;
    }
    el.innerHTML = items.map(fs => {
        const isExpired = fs.endDate ? (new Date(fs.endDate) < new Date()) : false;
        const badge = fs.isActive && !isExpired ? '<span class="badge bg-info">Aktif</span>' : '<span class="badge bg-secondary">Tidak Aktif</span>';
        const minText = (fs.minAmount || fs.min_amount) ? `Min. Rp ${formatCurrency(fs.minAmount || fs.min_amount)}` : 'Tanpa minimal';
        return `
        <div class="promotion-item">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <div class="d-flex align-items-center mb-2">
                        <h6 class="mb-0 me-3">${fs.name || 'Gratis Ongkir'}</h6>
                        ${badge}
                    </div>
                    <p class="text-muted mb-2">${fs.description || ''}</p>
                    <small class="text-muted"><i class="fas fa-calendar me-1"></i>${formatDate(fs.startDate)} - ${formatDate(fs.endDate)}</small>
                    <br><small class="text-muted"><i class="fas fa-info-circle me-1"></i>${minText}</small>
                </div>
                <div class="col-md-4 text-end">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editFreeShipping('${fs.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteFreeShipping('${fs.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function editFreeShipping(id) {
    window.openFreeShippingModal(id);
}

async function deleteFreeShipping(id) {
    if (!confirm('Hapus promo gratis ongkir ini?')) return;
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const resp = await fetch(`/api/free-shipping/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) throw new Error('Gagal menghapus');
        promoNotify('Gratis ongkir dihapus', 'success');
        await loadFreeShipping();
        await loadPromotionStats();
    } catch (e) {
        promoNotify(e.message || 'Gagal menghapus gratis ongkir', 'error');
    }
}

// Utility function for notifications
function promoNotify(message, type = 'info') {
    // Gunakan notifikasi global dari script.js jika ada
    if (typeof window.showNotification === 'function') {
        try { window.showNotification(message, type); return; } catch (_) {}
    }
    // Fallback sederhana
    try {
        const level = type === 'error' ? 'error' : (type === 'success' ? 'log' : 'warn');
        console[level](message);
    } catch (_) {}
    alert(message);
}

// Remove proxy voucher functions to avoid conflicts and recursion.

// Refresh all promotions data
function refreshPromotions() {
    loadPromotionStats();
    loadVouchers();
    loadProductDiscounts();
    loadFlashSales();
    loadFreeShipping();
    promoNotify('Data promosi berhasil diperbarui', 'success');
}

// Additional global assignments for edit/delete functions
window.editProductDiscount = editProductDiscount;
window.editFlashSale = editFlashSale;
window.editFreeShipping = editFreeShipping;
window.deleteProductDiscount = deleteProductDiscount;
window.deleteFlashSale = deleteFlashSale;
window.deleteFreeShipping = deleteFreeShipping;
window.saveProductDiscount = saveProductDiscount;
window.saveFlashSale = saveFlashSale;
window.saveFreeShipping = saveFreeShipping;
window.refreshPromotions = refreshPromotions;

console.log('Promotions.js loaded successfully - All functions are now available globally');
