function toCsvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const rows = [
  ['关键词', '平台', '标题', '价格', '链接'],
  ['手机壳', '1688', '跨境适用苹果手机壳', '¥4.2', 'https://detail.1688.com/offer/1.html'],
  ['phone case', 'Amazon', 'OtterBox, "Commuter" 系列', '$9.99', 'https://amazon.com/dp/xxx'],
  ['phone case', 'eBay', 'Clear Case for iPhone', '$8.99', 'https://ebay.com/itm/xxx'],
];
const csv = rows.map((r) => r.map(toCsvCell).join(',')).join('\r\n');
console.log(csv);
