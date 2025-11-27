
// BROWSER FIX FOR PROMOTIONS RECURSION
console.log('🔧 Applying promotions recursion fix...');

// Clear any existing problematic functions
if (window.loadVouchers && typeof window.loadVouchers === 'function') {
    console.log('🧹 Clearing existing loadVouchers function');
    delete window.loadVouchers;
}

// Redefine loadVouchers properly
window.loadVouchers = async function() {
    try {
        console.log('📡 Loading vouchers from API...');
        const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        
        if (!token) {
            console.log('❌ No auth token found');
            return;
        }
        
        const response = await fetch('/api/vouchers', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Vouchers loaded:', result.data?.length || 0, 'items');
            
            // Display vouchers if display function exists
            if (typeof displayVouchers === 'function') {
                displayVouchers(result.data || []);
            } else {
                console.log('⚠️  displayVouchers function not found');
            }
        } else {
            console.log('❌ Failed to load vouchers:', response.status);
        }
    } catch (error) {
        console.error('❌ Error loading vouchers:', error);
    }
};

// Test the fix
console.log('🧪 Testing loadVouchers function...');
if (typeof window.loadVouchers === 'function') {
    console.log('✅ loadVouchers function is properly defined');
    
    // Test call (only if we're on the right page)
    if (document.getElementById('vouchersList') || document.querySelector('[data-section="vouchers"]')) {
        console.log('🔄 Testing loadVouchers call...');
        try {
            window.loadVouchers();
            console.log('✅ loadVouchers call successful');
        } catch (error) {
            console.log('❌ loadVouchers call failed:', error);
        }
    }
} else {
    console.log('❌ loadVouchers function not properly defined');
}

console.log('✅ Promotions recursion fix applied');
