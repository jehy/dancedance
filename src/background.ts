import fse from 'fs-extra';
import type { PictureType } from 'jsmediatags/types';
import jsMediaTags from 'jsmediatags';
import path from 'path';
import sharp from 'sharp';
import { getSmFiles } from './util';

async function exportPictoreFromMp3(inputMp3: string, outputDir: string):
Promise<{ imageFormat: string, imgPath: string } | null> {
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
    return null;
  }
  const imageBase64String = tag.data.map((char) => String.fromCharCode(char)).join('');
  const imageFormat = tag.format.replace('image/', '');
  const originalFileName = `background.original.${imageFormat}`;
  const imgPath = path.join(outputDir, originalFileName);
  await fse.writeFile(imgPath, imageBase64String, { encoding: 'binary' });
  return { imageFormat, imgPath };
}

async function resizeForStepMania(originalImagePath: string, imagePath: string): Promise<void> {
  await sharp(originalImagePath)
    .resize({ width: 2049, height: 640, fit: 'contain' })
    .toFile(imagePath);
}

async function addBackgroundToSm(songDir:string, imageFileName: string): Promise<void> {
  const smFiles = await getSmFiles(songDir);
  if (!smFiles.length) {
    console.log(`Sm file in ${songDir} not found!`);
    throw new Error('SM file not found');
  }
  const smFile = smFiles[0];
  const smData = await fse.readFile(smFile, { encoding: 'utf8' });
  const newData = smData.split('\n');
  newData.unshift(`#${imageFileName};`);
  await fse.writeFile(smFile, newData.join('\n'));
}

export async function maybeSetBackground(inputMp3: string, outputDir: string):Promise<void> {
  if (!await fse.pathExists(outputDir)) {
    console.log(`Dir ${outputDir} does not exists, nowhere to output! Did song convert?`);
    throw new Error('No directory');
  }
  const exportResult = await exportPictoreFromMp3(inputMp3, outputDir);
  if (!exportResult) {
    return;
  }
  const { imageFormat, imgPath: originalImagePath } = exportResult;
  const imageFileName = `background.${imageFormat}`;
  const imagePath = path.join(outputDir, imageFileName);
  await resizeForStepMania(originalImagePath, imagePath);
  await addBackgroundToSm(outputDir, imageFileName);
}
