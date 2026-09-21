import fs from 'fs';

const html = fs.readFileSync('letter_data.html', 'utf8');
const trRegex = /<tr class="texttable">([\s\S]*?)<\/tr>/g;
let match;
const links = [];
while ((match = trRegex.exec(html)) !== null) {
  const rowHtml = match[1];
  const editMatch = rowHtml.match(/href="(letter_edit\.php\?id_guide=\d+)"/);
  if (editMatch) {
    links.push(editMatch[1]);
  }
}

console.log('Total edit links found:', links.length);
console.log('Sample links:', links.slice(0, 5));
