// ================================================
// IMMEDIATE AUTH FIX SCRIPT
// ================================================
// Run this in browser console to fix auth issues

console.log('🔧 IMMEDIATE AUTH FIX STARTING...');

// Step 1: Clear all existing auth data
console.log('🧹 Clearing all auth data...');
localStorage.clear();
sessionStorage.clear();

// Clear cookies
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

console.log('✅ Auth data cleared');

// Step 2: Test login function
async function forceLogin() {
    console.log('🔐 Testing login...');
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin@bismarshop.com',
                email: 'admin@bismarshop.com',
                password: 'admin123',
                rememberMe: true
            })
        });
        
        console.log('📡 Response status:', response.status);
        
        const data = await response.json();
        console.log('📊 Response data:', data);
        
        if (data.success && data.token) {
            console.log('✅ Login successful!');
            
            // Store token
            localStorage.setItem('token', data.token);
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            console.log('💾 Token stored:', data.token.substring(0, 20) + '...');
            console.log('👤 User:', data.user.name);
            console.log('🔑 Permissions:', data.user.permissions.slice(0, 5));
            
            // Test auth
            console.log('🔍 Testing authentication...');
            
            const authTest = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${data.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const authData = await authTest.json();
            console.log('🛡️ Auth test:', authData);
            
            if (authData.success) {
                console.log('🎉 AUTHENTICATION WORKING!');
                console.log('🔄 Redirecting to admin panel...');
                
                // Force redirect
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 1000);
                
                return true;
            } else {
                console.log('❌ Auth test failed');
                return false;
            }
            
        } else {
            console.log('❌ Login failed:', data.message);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Login error:', error);
        return false;
    }
}

// Step 3: Check current page and redirect if needed
function checkAndRedirect() {
    const currentPath = window.location.pathname;
    console.log('📍 Current page:', currentPath);
    
    if (currentPath.includes('login') || currentPath === '/') {
        console.log('📝 On login page, attempting login...');
        forceLogin();
    } else {
        console.log('📋 On admin page, checking auth...');
        
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('❌ No token found, redirecting to login...');
            window.location.href = '/login.html';
        } else {
            console.log('✅ Token found, testing auth...');
            
            fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('✅ Auth working, staying on page');
                } else {
                    console.log('❌ Auth failed, redirecting to login...');
                    localStorage.clear();
                    window.location.href = '/login.html';
                }
            })
            .catch(error => {
                console.log('❌ Auth check error:', error);
                window.location.href = '/login.html';
            });
        }
    }
}

// Step 4: Add manual functions
window.forceLogin = forceLogin;
window.clearAuth = function() {
    localStorage.clear();
    sessionStorage.clear();
    console.log('🧹 Auth cleared, refresh page');
};

window.testAuth = async function() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('❌ No token found');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('🛡️ Auth test result:', data);
        
        return data.success;
    } catch (error) {
        console.log('❌ Auth test error:', error);
        return false;
    }
};

// Step 5: Run the fix
console.log('🚀 Running auth check and redirect...');
checkAndRedirect();

console.log('✅ AUTH FIX SCRIPT COMPLETE');
console.log('');
console.log('📋 MANUAL COMMANDS AVAILABLE:');
console.log('- forceLogin() - Force login attempt');
console.log('- clearAuth() - Clear all auth data');
console.log('- testAuth() - Test current authentication');
console.log('');
console.log('🎯 EXPECTED RESULT:');
console.log('- If on login page: Auto-login and redirect');
console.log('- If on admin page: Verify auth or redirect to login');
console.log('- No more redirect loops');

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { forceLogin, clearAuth, testAuth };
}
