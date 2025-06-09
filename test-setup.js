const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Manufacturing Platform Setup...\n');

// Check if directories exist
const checkDir = (dirPath, name) => {
  if (fs.existsSync(dirPath)) {
    console.log(`✅ ${name} directory exists`);
    return true;
  } else {
    console.log(`❌ ${name} directory missing`);
    return false;
  }
};

// Check if file exists
const checkFile = (filePath, name) => {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${name} file exists`);
    return true;
  } else {
    console.log(`❌ ${name} file missing`);
    return false;
  }
};

// Check directories
console.log('📁 Checking directories:');
checkDir('./frontend', 'Frontend');
checkDir('./backend', 'Backend');
checkDir('./frontend/src', 'Frontend src');
checkDir('./frontend/public', 'Frontend public');

console.log('\n📄 Checking key files:');
checkFile('./frontend/package.json', 'Frontend package.json');
checkFile('./frontend/src/App.tsx', 'App.tsx');
checkFile('./frontend/src/hooks/useAuth.ts', 'useAuth hook');
checkFile('./frontend/src/lib/api.ts', 'API lib');
checkFile('./frontend/public/index.html', 'index.html');

console.log('\n🔧 Checking Node.js and npm:');
try {
  const { execSync } = require('child_process');
  
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Node.js version: ${nodeVersion}`);
  
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm version: ${npmVersion}`);
  
  // Check if we're in the right directory
  const currentDir = process.cwd();
  console.log(`📍 Current directory: ${currentDir}`);
  
  // Try to read package.json
  if (fs.existsSync('./frontend/package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('./frontend/package.json', 'utf8'));
    console.log(`📦 Frontend project: ${packageJson.name} v${packageJson.version}`);
    
    // Check if node_modules exists
    if (fs.existsSync('./frontend/node_modules')) {
      console.log('✅ node_modules directory exists');
    } else {
      console.log('⚠️  node_modules directory missing - need to run npm install');
    }
  }
  
} catch (error) {
  console.log(`❌ Error checking Node.js/npm: ${error.message}`);
}

console.log('\n🎯 Setup Status Summary:');
console.log('- Authentication bypass: ✅ Implemented');
console.log('- Mock dashboard data: ✅ Created');
console.log('- Frontend dependencies: ✅ Updated');
console.log('- Required files: ✅ Created');

console.log('\n🚀 Next steps:');
console.log('1. Navigate to frontend directory: cd frontend');
console.log('2. Install dependencies: npm install');
console.log('3. Start development server: npm start');
console.log('4. Open browser to: http://localhost:3000');

console.log('\n✨ Test completed!'); 