import CyrillicToTranslit from 'cyrillic-to-translit-js';
import { sanitize } from 'sanitize-filename-ts';
import jschardet from 'jschardet';
// @ts-ignore
import encoder from 'encoding';
import { parseFile } from 'music-metadata';
import path from 'path';

const convertToUtf = (text: string, textExtension: string) => {
  const probeString = `${text}${textExtension}`;
  const { encoding } = jschardet.detect(probeString);

  if (encoding === 'ascii' || encoding === 'UTF-8') {
    // Encoding is good to go
    return text;
  } if (
    encoding === 'windows-1251'
        || encoding === 'windows-1252'
        || encoding === 'KOI8-R'
  ) {
    // Seems to be OK
    return encoder.convert(text, 'UTF-8', encoding).toString();
  }

  // Let's probe manually

  if (
    jschardet.detect(
      encoder.convert(probeString, 'UTF-8', 'windows-1251').toString(),
    ).encoding === 'ascii'
  ) {
    // Looks like it's 1251
    return encoder.convert(text, 'UTF-8', 'windows-1251').toString();
  } if (
    jschardet.detect(
      encoder.convert(probeString, 'UTF-8', 'windows-1252').toString(),
    ).encoding === 'ascii'
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

export async function getSongName(inputMp3Path: string) {
  let { artist, title } = (await parseFile(inputMp3Path)).common;
  artist = convertToUtf(artist || '', title || '');
  title = convertToUtf(title || '', artist || '');
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

// TODO: fix X-MAC-CYRILLIC issue
