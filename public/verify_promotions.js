
// VERIFY PROMOTIONS FUNCTIONS
console.log('🔍 Verifying promotions functions...');

const functionsToCheck = [
    'loadVouchers',
    'saveProductDiscount',
    'saveFreeShipping', 
    'loadFreeShipping',
    'saveFlashSale',
    'loadFlashSales',
    'openProductDiscountModal',
    'refreshPromotions'
];

let workingFunctions = 0;
let totalFunctions = functionsToCheck.length;

functionsToCheck.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log('✅', funcName, '- Available');
        workingFunctions++;
    } else {
        console.log('❌', funcName, '- Missing');
    }
});

console.log('📊 Function Status:', workingFunctions + '/' + totalFunctions, 'working');

if (workingFunctions === totalFunctions) {
    console.log('🎉 All promotions functions are available!');
} else {
    console.log('⚠️  Some functions are missing. Try reloading the page.');
}

// Check for recursion by testing a safe call
if (typeof window.loadVouchers === 'function') {
    console.log('🧪 Testing loadVouchers for recursion...');
    
    let callCount = 0;
    const originalLoadVouchers = window.loadVouchers;
    
    window.loadVouchers = function() {
        callCount++;
        if (callCount > 5) {
            console.log('❌ Recursion detected! Stopping calls.');
            return;
        }
        return originalLoadVouchers.apply(this, arguments);
    };
    
    // Test call
    try {
        window.loadVouchers();
        setTimeout(() => {
            if (callCount <= 1) {
                console.log('✅ No recursion detected');
            } else {
                console.log('⚠️  Possible recursion detected:', callCount, 'calls');
            }
            // Restore original function
            window.loadVouchers = originalLoadVouchers;
        }, 1000);
    } catch (error) {
        console.log('❌ Error during recursion test:', error);
        window.loadVouchers = originalLoadVouchers;
    }
}
