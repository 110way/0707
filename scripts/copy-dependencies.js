const fs = require('fs');
const path = require('path');

const destDir = path.join(__dirname, '../static/js');
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const filesToCopy = [
    {
        src: path.join(__dirname, '../node_modules/alpinejs/dist/cdn.min.js'),
        dest: path.join(destDir, 'alpine.js')
    },
    {
        src: path.join(__dirname, '../node_modules/lucide/dist/umd/lucide.min.js'),
        dest: path.join(destDir, 'lucide.js')
    },
    {
        src: path.join(__dirname, '../node_modules/chart.js/dist/chart.umd.js'),
        dest: path.join(destDir, 'chart.js')
    }
];

filesToCopy.forEach(file => {
    if (fs.existsSync(file.src)) {
        fs.copyFileSync(file.src, file.dest);
        console.log(`Copied ${path.basename(file.src)} -> ${file.dest}`);
    } else {
        console.error(`Error: Source file not found: ${file.src}`);
    }
});
