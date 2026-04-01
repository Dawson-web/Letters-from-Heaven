import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const lucideIconDir = join(rootDir, 'node_modules', 'lucide-static', 'icons');
const outputDir = join(rootDir, 'src', 'assets', 'tabbar');
const tempDir = mkdtempSync(join(tmpdir(), 'lucide-tabbar-'));

const COLORS = {
  default: '#5E6E7B',
  active: '#C85A58',
};

const TAB_ICONS = [
  { output: 'home', source: 'house' },
  { output: 'write', source: 'square-pen' },
  { output: 'inbox', source: 'inbox' },
  { output: 'memorial', source: 'book-heart' },
  { output: 'profile', source: 'circle-user-round' },
];

function paintSvg(svg, color) {
  return svg
    .replace(/width="24"/, 'width="256"')
    .replace(/height="24"/, 'height="256"')
    .replace(/stroke="currentColor"/, `stroke="${color}"`);
}

function renderIcon(sourceName, outputName, colorName) {
  const sourceSvg = readFileSync(join(lucideIconDir, `${sourceName}.svg`), 'utf8');
  const tempSvgPath = join(tempDir, `${outputName}.svg`);
  const tempPngPath = `${tempSvgPath}.png`;
  const targetPath = join(outputDir, `${outputName}.png`);

  writeFileSync(tempSvgPath, paintSvg(sourceSvg, COLORS[colorName]));

  execFileSync('qlmanage', ['-t', '-s', '256', '-o', tempDir, tempSvgPath], {
    stdio: 'pipe',
  });

  execFileSync('sips', ['-z', '81', '81', tempPngPath, '--out', targetPath], {
    stdio: 'pipe',
  });
}

try {
  TAB_ICONS.forEach(({ output, source }) => {
    renderIcon(source, output, 'default');
    renderIcon(source, `${output}-active`, 'active');
  });

  console.log(
    `Generated ${TAB_ICONS.length * 2} Lucide tabBar icons into ${outputDir}`
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
