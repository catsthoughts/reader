import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';

interface EpubMetadata {
  title: string;
  author: string | null;
  coverPath: string | null;
}

interface EpubSpine {
  idref: string;
  linear: string;
}

interface EpubManifest {
  [key: string]: { href: string; mediaType: string };
}

function getXmlContent(xml: string, tag: string, attribute?: string): string | null {
  if (attribute) {
    const regex = new RegExp(`${tag}[^>]*?${attribute}=["']([^"']*)["']`, 'i');
    const m = regex.exec(xml);
    return m ? m[1] : null;
  }

  const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i');
  const m = regex.exec(xml);
  return m ? m[1].trim() : null;
}

function parseAttributes(str: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /(\w+)=["']([^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(str)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    default: return 'image/png';
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function loadZip(filePath: string): Promise<JSZip> {
  const base64 = await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const zip = await JSZip.loadAsync(bytes);
  return zip;
}

function resolveRelativePaths(html: string, dir: string): string {
  return html.replace(
    /(src|href)=["'](?!https?:\/\/|data:)([^"']+)["']/gi,
    (_, attr, path) => `${attr}="${dir}${path}"`
  );
}

async function embedImages(html: string, zip: JSZip, dir: string): Promise<string> {
  let result = html;
  const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;

  while ((m = imgRegex.exec(html)) !== null) {
    const src = m[1];
    if (src.startsWith('data:') || src.startsWith('http')) continue;

    const file = zip.file(src);
    if (!file) continue;

    try {
      const data = await file.async('arraybuffer');
      const ext = src.split('.').pop()?.toLowerCase() || 'png';
      const mime = getMimeType(`.${ext}`);
      const b64 = arrayBufferToBase64(data);
      const dataUri = `data:${mime};base64,${b64}`;
      result = result.replace(src, dataUri);
    } catch {}
  }

  return result;
}

export async function parseEpubMetadata(filePath: string): Promise<EpubMetadata> {
  const zip = await loadZip(filePath);

  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) throw new Error('Invalid EPUB: no container.xml');

  const rootFilePath = getXmlContent(containerXml, 'rootfile', 'full-path');
  if (!rootFilePath) throw new Error('Invalid EPUB: no rootfile path');

  const opfXml = await zip.file(rootFilePath)?.async('text');
  if (!opfXml) throw new Error(`Invalid EPUB: no ${rootFilePath}`);

  const title = getXmlContent(opfXml, 'dc:title') || getXmlContent(opfXml, 'title') || 'Unknown Title';
  const author = getXmlContent(opfXml, 'dc:creator') || getXmlContent(opfXml, 'creator') || null;

  const metaMatch = /<meta\s+([^>]*?)name=["']cover["']([^>]*?)>/i.exec(opfXml);
  let coverHref: string | null = null;

  if (metaMatch) {
    const contentMatch = /content=["']([^"']*)["']/i.exec(metaMatch[0]);
    if (contentMatch) {
      const coverId = contentMatch[1];
      const itemMatch = new RegExp(
        `<item\\s+[^>]*?id=["']${coverId}["'][^>]*?href=["']([^"']*)["']`,
        'i'
      ).exec(opfXml);
      if (itemMatch) coverHref = itemMatch[1];
    }
  }

  if (!coverHref) {
    const imgMatch = /<item\s+[^>]*?(?:id=["']cover["']|properties=["']cover-image["'])[^>]*?href=["']([^"']*)["']/i.exec(
      opfXml
    );
    if (imgMatch) coverHref = imgMatch[1];
  }

  let coverPath: string | null = null;
  if (coverHref) {
    const dir = rootFilePath.substring(0, rootFilePath.lastIndexOf('/') + 1);
    const coverFile = zip.file(dir + coverHref);
    if (coverFile) {
      const data = await coverFile.async('arraybuffer');
      const ext = coverHref.split('.').pop()?.toLowerCase() || 'png';
      const mime = getMimeType(`.${ext}`);
      coverPath = `data:${mime};base64,${arrayBufferToBase64(data)}`;
    }
  }

  return { title, author, coverPath };
}

export async function getEpubPages(
  filePath: string,
  position?: string
): Promise<{ html: string; positionId: string }[]> {
  const zip = await loadZip(filePath);

  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) throw new Error('Invalid EPUB: no container.xml');

  const rootFilePath = getXmlContent(containerXml, 'rootfile', 'full-path');
  if (!rootFilePath) throw new Error('Invalid EPUB: no rootfile path');

  const opfXml = await zip.file(rootFilePath)?.async('text');
  if (!opfXml) throw new Error(`Invalid EPUB: no ${rootFilePath}`);

  const manifest: EpubManifest = {};
  const manifestRegex = /<item\s+([^>]+)\s*\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = manifestRegex.exec(opfXml)) !== null) {
    const attrs = parseAttributes(match[1]);
    if (attrs.id && attrs.href) {
      manifest[attrs.id] = { href: attrs.href, mediaType: attrs['media-type'] || '' };
    }
  }

  const spine: EpubSpine[] = [];
  const spineRegex = /<itemref\s+([^>]+)\s*\/?>/gi;
  while ((match = spineRegex.exec(opfXml)) !== null) {
    const attrs = parseAttributes(match[1]);
    if (attrs.idref) {
      spine.push({ idref: attrs.idref, linear: attrs.linear || 'yes' });
    }
  }

  const dir = rootFilePath.substring(0, rootFilePath.lastIndexOf('/') + 1);
  const pages: { html: string; positionId: string }[] = [];

  for (let i = 0; i < spine.length; i++) {
    const item = manifest[spine[i].idref];
    if (!item) continue;

    const fullPath = dir + item.href;
    const entry = zip.file(fullPath);
    if (!entry) continue;

    let html = await entry.async('text');
    html = resolveRelativePaths(html, dir);
    html = await embedImages(html, zip, dir);

    pages.push({ html, positionId: spine[i].idref });
  }

  return pages;
}