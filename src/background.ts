import fse from 'fs-extra';
import type { PictureType } from 'jsmediatags/types';
import jsMediaTags from 'jsmediatags';
import path from 'path';
import sharp from 'sharp';
// @ts-ignore
import albumArt from 'album-art';
import { fromFile as fileMime } from 'file-type';
// eslint-disable-next-line import/no-extraneous-dependencies
import tmp from 'tmp';
import axios from 'axios';
import Debug from 'debug';
import { getSmFileFromDir, pipelineAsync } from './util';
import { getSongMeta } from './mp3Meta';

const debug = Debug('dancedance:background');

type AlbumImage = { imageFormat: string, imgPath: string };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore
async function exportPictureFromMp3(inputMp3: string, outputDir: string):
Promise<AlbumImage | null> {
  debug('reading mp3 picture from file');
  const tag: PictureType | undefined = await new Promise((resolve, reject) => {
    new jsMediaTags.Reader(inputMp3)
      .setTagsToRead(['picture'])
      .read({
        onSuccess(res) {
          resolve(res && res.tags && res.tags.picture);
        },
        onError(error) {
          console.log(':(', error.type, error.info);
          reject(new Error('cant read background from mp3'));
        },
      });
  });
  if (!tag) {
    debug('no picture found');
    return null;
  }
  debug('picture found');
  const imageBase64String = tag.data.map((char) => String.fromCharCode(char)).join('');
  const imageFormat = tag.format.replace('image/', '');
  const originalFileName = `background.original.${imageFormat}`;
  const imgPath = path.join(outputDir, originalFileName);
  await fse.writeFile(imgPath, imageBase64String, { encoding: 'binary' });
  debug('picture written to disk');
  return { imageFormat, imgPath };
}

async function getPictureFromNet(inputMp3: string, outputDir: string):Promise<AlbumImage | null> {
  debug('reading mp3 meta from file for picture');
  const { album, artist } = await getSongMeta(inputMp3);
  debug('fetching album art');
  const imageUrl = await albumArt(artist, { album, size: 'large' });
  // console.log(`Searching for album ${album} of artist ${artist}`);
  if (imageUrl instanceof Error) { // yup, that is either result or error
    debug('album art fail', imageUrl);
    return null;
  }
  debug('got album art, downloading', imageUrl);
  const tmpFile = tmp.fileSync();
  const res = await axios({ url: imageUrl, responseType: 'stream' });
  await pipelineAsync(res.data, fse.createWriteStream(tmpFile.name));
  debug('downloaded album art');
  const mimeRes = await fileMime(tmpFile.name);
  if (!mimeRes) {
    debug('smth wrong wih mime, exit');
    return null;
  }
  const { mime } = mimeRes;
  const imageFormat = mime.replace('image/', '');
  const originalFileName = `background.original.${imageFormat}`;
  const imgPath = path.join(outputDir, originalFileName);
  await fse.rename(tmpFile.name, imgPath);
  debug('written album art');
  return { imageFormat, imgPath };
}

async function resizeForStepMania(originalImagePath: string, imagePath: string): Promise<void> {
  debug('resizing album picture');
  await sharp(originalImagePath)
    .resize({ width: 2049, height: 640, fit: 'contain' })
    .toFile(imagePath);
  debug('album picture resized');
}

async function addBackgroundToSm(songDir:string, imageFileName: string): Promise<void> {
  const smFile = await getSmFileFromDir(songDir);
  if (!smFile) {
    console.log(`Sm file in ${songDir} not found!`);
    throw new Error('SM file not found');
  }
  const smData = (await fse.readFile(smFile, { encoding: 'utf8' })).split('\n');
  if (smData.some((line) => line.includes('#BACKGROUND:'))) {
    return;
  }
  smData.unshift(`#BACKGROUND:${imageFileName};`);
  await fse.writeFile(smFile, smData.join('\n'));
}

export async function maybeSetBackground(inputMp3: string, outputDir: string):Promise<void> {
  if (!await fse.pathExists(outputDir)) {
    console.log(`Dir ${outputDir} does not exists, nowhere to output! Did song convert?`);
    throw new Error('No directory');
  }
  let albumImage: AlbumImage | null = await exportPictureFromMp3(inputMp3, outputDir);
  if (!albumImage) {
    albumImage = await getPictureFromNet(inputMp3, outputDir);
  }
  if (!albumImage) {
    return;
  }
  const { imageFormat, imgPath: originalImagePath } = albumImage;
  const imageFileName = `background.${imageFormat}`;
  const imagePath = path.join(outputDir, imageFileName);
  await resizeForStepMania(originalImagePath, imagePath);
  await addBackgroundToSm(outputDir, imageFileName);
}
