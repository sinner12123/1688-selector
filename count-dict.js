const fs = require('fs');
const src = fs.readFileSync('./translate.js', 'utf8');
// 统计含中文的键：形如 '中文...': 
const matches = src.match(/'[^']*[\u4e00-\u9fff][^']*'\s*:/g) || [];
console.log('词库条目数:', matches.length);
