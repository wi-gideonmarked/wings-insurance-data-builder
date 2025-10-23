#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import HTMLDocx from 'html-docx-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const DOCS_OUT_DIR = path.join(projectRoot, 'dist', 'docs');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function listTopLevelMarkdownFiles() {
  const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));
}

function readFilesMarkdown(filenames) {
  return filenames.map((name) => {
    const full = path.join(projectRoot, name);
    const content = fs.readFileSync(full, 'utf8');
    const heading = `\n\n# ${name.replace(/_/g, ' ')}\n\n`;
    return heading + content.trim() + '\n';
  });
}

function buildHtmlFromMarkdown(md) {
  const body = marked.parse(md);
  const css = `
    body { font-family: Arial, Helvetica, sans-serif; line-height: 1.4; }
    pre { background: #f5f5f5; padding: 8px; overflow-x: auto; }
    code { background: #f5f5f5; padding: 2px 4px; }
    h1, h2, h3 { page-break-after: avoid; }
    table { border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 6px; }
  `;
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>${css}</style>
    </head>
    <body>${body}</body>
  </html>`;
}

async function main() {
  ensureDir(DOCS_OUT_DIR);
  const files = listTopLevelMarkdownFiles();
  if (files.length === 0) {
    console.log('[docs] No top-level .md files found');
    return;
  }
  // Convert each file individually to HTML and DOCX
  for (const name of files) {
    const base = path.basename(name, path.extname(name));
    const srcPath = path.join(projectRoot, name);
    const raw = fs.readFileSync(srcPath, 'utf8');
    const md = `# ${name.replace(/_/g, ' ')}\n\n${raw.trim()}\n`;
    const html = buildHtmlFromMarkdown(md);
    const htmlPath = path.join(DOCS_OUT_DIR, `${base}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    const perBlob = HTMLDocx.asBlob(html);
    const perArrayBuffer = await perBlob.arrayBuffer();
    const docxPath = path.join(DOCS_OUT_DIR, `${base}.docx`);
    fs.writeFileSync(docxPath, Buffer.from(perArrayBuffer));
    console.log(`[docs] Wrote ${htmlPath} and ${docxPath}`);
  }
  const parts = readFilesMarkdown(files);
  const combinedMd = parts.join('\n');

  const mdPath = path.join(DOCS_OUT_DIR, 'combined.md');
  fs.writeFileSync(mdPath, combinedMd, 'utf8');
  console.log(`[docs] Wrote ${mdPath}`);

  const html = buildHtmlFromMarkdown(combinedMd);
  const htmlPath = path.join(DOCS_OUT_DIR, 'combined.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`[docs] Wrote ${htmlPath}`);

  const blob = HTMLDocx.asBlob(html);
  const arrayBuffer = await blob.arrayBuffer();
  const docxPath = path.join(DOCS_OUT_DIR, 'combined.docx');
  fs.writeFileSync(docxPath, Buffer.from(arrayBuffer));
  console.log(`[docs] Wrote ${docxPath}`);
}

main().catch((err) => {
  console.error('[docs] ERROR', err);
  process.exit(1);
});


