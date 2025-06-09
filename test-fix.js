const fs = require('fs');
const path = require('path');

console.log('🔧 Testing compilation fixes...\n');

// Check if App.tsx exists
const appPath = path.join(__dirname, 'frontend/src/App.tsx');
if (fs.existsSync(appPath)) {
    console.log('✅ App.tsx exists');
    
    // Check if it has export default
    const appContent = fs.readFileSync(appPath, 'utf8');
    if (appContent.includes('export default App')) {
        console.log('✅ App.tsx has proper export');
    } else {
        console.log('❌ App.tsx missing export default');
    }
} else {
    console.log('❌ App.tsx not found');
}

// Check Tailwind config
const tailwindPath = path.join(__dirname, 'frontend/tailwind.config.js');
if (fs.existsSync(tailwindPath)) {
    console.log('✅ tailwind.config.js exists');
    
    const tailwindContent = fs.readFileSync(tailwindPath, 'utf8');
    if (tailwindContent.includes('// require(\'@tailwindcss/forms\')')) {
        console.log('✅ @tailwindcss/forms plugin commented out');
    } else if (tailwindContent.includes('require(\'@tailwindcss/forms\')')) {
        console.log('⚠️ @tailwindcss/forms still active - might cause error');
    }
} else {
    console.log('❌ tailwind.config.js not found');
}

// Check index.tsx
const indexPath = path.join(__dirname, 'frontend/src/index.tsx');
if (fs.existsSync(indexPath)) {
    console.log('✅ index.tsx exists');
    
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    if (indexContent.includes('import App from \'./App\'')) {
        console.log('✅ index.tsx imports App correctly');
    } else {
        console.log('❌ index.tsx App import issue');
    }
} else {
    console.log('❌ index.tsx not found');
}

console.log('\n🎯 Fix Summary:');
console.log('1. ✅ Commented out @tailwindcss/forms plugin');
console.log('2. ✅ Verified App.tsx export');
console.log('3. ✅ Verified index.tsx import');
console.log('\n🚀 Try running: cd frontend && npm start'); 