import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const filePath = process.argv[2] || String.raw`c:\Users\Tiago\Downloads\AITAX\Calculadora Imbiliaria\simulação aluguel PJ.xlsx`;

const data = readFileSync(filePath);
const wb = XLSX.read(data, { type: 'buffer', cellFormula: true, cellDates: true });

console.log('=== ABAS ===');
console.log(wb.SheetNames.join(', '));

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  console.log(`\n=== ABA: ${sheetName} ===`);
  console.log(`Range: ${ws['!ref']}\n`);
  
  const output = [];
  for (let R = range.s.r; R <= range.e.r; R++) {
    const rowCells = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (cell) {
        if (cell.f) rowCells.push(`[${addr}] = ${cell.f}`);
        else if (cell.v !== undefined) rowCells.push(`[${addr}] = ${JSON.stringify(cell.v)}`);
      }
    }
    if (rowCells.length) output.push(rowCells.join(' | '));
  }
  console.log(output.join('\n'));
}
