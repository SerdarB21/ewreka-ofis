import { createRequire } from 'module'; const sharp = createRequire(import.meta.url)('/opt/npm-tools/node_modules/sharp');
import fs from 'fs';
for (const n of ['app','nota','matrix','vista','carta']) {
  const svg = fs.readFileSync(`${n}.svg`);
  for (const s of [16,24,32,48,64,128,256,512,1024]) await sharp(svg,{density:300}).resize(s,s).png().toFile(`${n}-${s}.png`);
}
