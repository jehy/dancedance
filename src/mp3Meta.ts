import CyrillicToTranslit from 'cyrillic-to-translit-js';
import { sanitize } from 'sanitize-filename-ts';
import jschardet from 'jschardet';
// @ts-ignore
import encoder from 'encoding';
import { parseFile } from 'music-metadata';
import path from 'path';
import type { Input } from './input';

const convertToUtf = (text: string, textExtension: string) => {
  const probeString = `${text}${textExtension}`;
  const { encoding } = jschardet.detect(probeString);

  if (['ascii', 'UTF-8'].includes(encoding)) {
    // Encoding is good to go
    return text;
  }
  if (['windows-1251', 'windows-1252', 'KOI8-R'].includes(encoding)) {
    // Seems to be OK
    return encoder.convert(text, 'UTF-8', encoding).toString();
  }

  // Let's probe manually

  if (
    jschardet.detect(encoder.convert(probeString, 'UTF-8', 'windows-1251').toString()).encoding === 'ascii'
  ) {
    // Looks like it's 1251
    return encoder.convert(text, 'UTF-8', 'windows-1251').toString();
  } if (
    jschardet.detect(encoder.convert(probeString, 'UTF-8', 'windows-1252').toString()).encoding === 'ascii'
  ) {
    // Looks like it's 1252
    return encoder.convert(text, 'UTF-8', 'windows-1252').toString();
  }
  try {
    // Dunno, lets detector to decide
    return encoder.convert(text, 'UTF-8', encoding).toString();
  } catch (error) {
    return text;
  }
};

const convertLanguage = (text: string) => new CyrillicToTranslit().transform(text).trim();

const validFileName = (text: string) => sanitize(convertLanguage(text)).replace(/\./g, '_');

// TODO: fix X-MAC-CYRILLIC issue

export async function getSongMeta(inputMp3Path: string) {
  let { artist, title, album } = (await parseFile(inputMp3Path)).common;
  artist = convertToUtf(artist || '', title || '');
  title = convertToUtf(title || '', artist || '');
  album = convertToUtf(album || '', artist || '');
  return { artist, title, album };
}

export async function getSongName(inputMp3Path: string) {
  const { artist, title } = (await getSongMeta(inputMp3Path));
  let name = path.basename(inputMp3Path);
  if (title && artist) {
    name = `${title} (${artist})`;
  } else if (title) {
    name = title;
  } else if (artist) {
    name = artist;
  }
  return validFileName(name);
}

export async function getNewFolderName(entry: string, options: Input): Promise<string> {
  if (options.album === 'folder') {
    const name = path.dirname(entry)
      .split('/')
      .filter((el) => el)
      .reverse()[0];
    return validFileName(name);
  }
  if (options.album === 'none') {
    return '.';
  }

  const { artist, album } = (await getSongMeta(entry));
  const fallback = 'unknown';
  if (options.album === 'artist') {
    return validFileName(artist || fallback);
  }
  if (options.album === 'artistAlbum') {
    const title = [artist || fallback, album || fallback];
    return validFileName(title.join(' - '));
  }
  throw new Error(`Unknown value of options.album = ${options.album}`);
}
