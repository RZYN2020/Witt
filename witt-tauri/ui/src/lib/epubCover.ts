import JSZip from 'jszip';
import { getBookFile, type BookRecord } from './commands';

function textFromZip(zip: JSZip, path: string) {
  const file = zip.file(path);
  return file?.async('text') ?? Promise.resolve('');
}

function resolvePath(basePath: string, href: string) {
  const base = basePath.split('/').slice(0, -1);
  for (const part of href.split('/')) {
    if (!part || part === '.') {
      continue;
    }
    if (part === '..') {
      base.pop();
      continue;
    }
    base.push(part);
  }
  return base.join('/');
}

function parseXml(raw: string) {
  return new DOMParser().parseFromString(raw, 'application/xml');
}

function coverHref(opf: Document) {
  const metaCover = opf.querySelector('metadata meta[name="cover"]')?.getAttribute('content');
  const coverItem =
    (metaCover &&
      Array.from(opf.querySelectorAll('manifest item')).find(
        (item) => item.getAttribute('id') === metaCover
      )) ||
    opf.querySelector('manifest item[properties~="cover-image"]') ||
    Array.from(opf.querySelectorAll('manifest item')).find((item) =>
      item.getAttribute('media-type')?.startsWith('image/')
    );
  return coverItem?.getAttribute('href') ?? '';
}

export async function loadEpubCoverUrl(book: BookRecord) {
  const bytes = await getBookFile(book.id);
  const zip = await JSZip.loadAsync(new Uint8Array(bytes));
  const container = parseXml(await textFromZip(zip, 'META-INF/container.xml'));
  const opfPath = container.querySelector('rootfile[full-path]')?.getAttribute('full-path') ?? '';
  if (!opfPath) {
    return '';
  }
  const opf = parseXml(await textFromZip(zip, opfPath));
  const href = coverHref(opf);
  if (!href) {
    return '';
  }
  const coverPath = resolvePath(opfPath, href);
  const coverFile = zip.file(coverPath);
  if (!coverFile) {
    return '';
  }
  const blob = await coverFile.async('blob');
  return URL.createObjectURL(blob);
}
