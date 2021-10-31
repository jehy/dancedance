import fse from 'fs-extra';
import path from 'path';
// import Debug from 'debug';
import glob from 'glob';
import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { promisify } from 'util';
import unzipper from 'unzipper';
import { pipeline } from 'stream';
import promiseMap from 'promise.map';
import { SingleBar, Presets } from 'cli-progress';
import jsMediaTags from 'jsmediatags';
import type { PictureType } from 'jsmediatags/types';
import FormData from 'form-data';
import sharp from 'sharp';
import type { Input } from './input';
import { argv } from './input';

async function getSmFiles(dir: string) {
  const searchArgs = path.join(dir, '/*.sm');
  return promisify(glob)(searchArgs);
}

// const log = Debug('dancedance:run');
function getAxiosInstance(args: Input): AxiosInstance {
  const url = args.customServer || args.server === 'jehy' ? 'dummy' : 'http://localhost:8888/';
  return axios.create({
    baseURL: url,
    timeout: 16 * 60 * 1000, // 16 minutes
    headers: { Authorization: args.token },
    maxContentLength: 1024 * 1024 * 30,
    maxBodyLength: 1024 * 1024 * 30,
    responseType: 'stream',
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function maybeSetBackground(inputMp3: string, outputDir: string):Promise<void> {
  if (!await fse.pathExists(outputDir)) {
    console.log(`Dir ${outputDir} does not exists, nowhere to output!`);
    throw new Error('No directory');
  }
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
    return;
  }
  const imageBase64String = tag.data.map((char) => String.fromCharCode(char)).join('');
  const imageFormat = tag.format.replace('image/', '');
  const originalFileName = `background.original.${imageFormat}`;
  const originalImagePath = path.join(outputDir, originalFileName);
  await fse.writeFile(originalImagePath, imageBase64String, { encoding: 'binary' });
  const imageFileName = `background.${imageFormat}`;
  const imagePath = path.join(outputDir, imageFileName);
  await sharp(originalImagePath)
    .resize({ width: 2049, height: 640, fit: 'contain' })
    .toFile(imagePath);
  // const searchArgs = path.join(outputDir, '/*.sm');
  // const smFiles = await fastGlob(searchArgs, { dot: false });
  const smFiles = await getSmFiles(outputDir);
  if (!smFiles.length) {
    console.log(`Sm file in ${outputDir} not found!`);
    throw new Error('SM file not found');
  }
  const smFile = smFiles[0];
  const smData = await fse.readFile(smFile, { encoding: 'utf8' });
  const newData = smData.split('\n');
  newData.unshift(`#${imageFileName};`);
  await fse.writeFile(smFile, newData.join('\n'));
}

type TrackPlan = {
  from: string,
  albumFromDir: string,
  toDir: string,
  toPath: string,
  songName: string,
  songPath: string,
  smFiles: boolean,
};

async function convertTrack(client: AxiosInstance, entry: TrackPlan, progress: SingleBar) {
  progress.update({ songName: entry.songName });
  const form = new FormData();
  // @ts-ignore formData не понимает что ему можно выдать стрим
  form.append('song', fse.createReadStream(entry.from));
  const response = await client.post('plain', form, {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${form.getBoundary()}`,
    },
  });
  const unzip = unzipper.Extract({ path: entry.songPath });
  await promisify(pipeline)(response.data, unzip);
  try {
    await maybeSetBackground(entry.from, entry.songPath);
  } catch (err) {
    console.log(err);
  }
}

async function getProcessPlan(args: Input):Promise<Array<TrackPlan>> {
  const searchPath = path.join(args.inputDir, args.inputMask);
  console.log(`searchPath: ${searchPath}`);
  const entries = await promisify(glob)(searchPath);
  const all = await promiseMap(entries, async (entry): Promise<TrackPlan> => {
    const from = entry;
    const albumFromDir = path.dirname(entry)
      .replace(args.inputDir, '')
      .split('/')
      .filter((el) => el)[0];
    const toDir = args.keepDirs ? albumFromDir : argv.album || '.';
    const toPath = path.join(args.outputDir, toDir);
    const songName = path.basename(entry).replace('.mp3', '');
    const songPath = path.join(toPath, songName);
    const smFiles = (await getSmFiles(songPath)).length !== 0;
    return {
      from, albumFromDir, toDir, toPath, songName, songPath, smFiles,
    };
  }, 3);
  if (args.skipExisting) {
    return all.filter((entry) => !entry.smFiles);
  }
  return all;
}

async function run(args: Input) {
  if (args.album && args.keepDirs) {
    throw new Error('Can not work when both album and keepDirs specified!');
  }
  if (!await fse.pathExists(args.outputDir)) {
    throw new Error(`Dir ${args.outputDir} does not exists, nowhere to output!`);
  }
  const plan = await getProcessPlan(args);
  // console.log(plan);
  // process.exit(0);
  const client = getAxiosInstance(args);
  const progress = new SingleBar({
    format: 'Converting {songName} [{bar}] {percentage}% '
        + '| ETA: {eta_formatted} | spent {duration} | done {value}/{total}',
  }, Presets.shades_classic);
  progress.start(plan.length, 0);

  await promiseMap(plan, async (entry) => {
    try {
      await convertTrack(client, entry, progress);
    } catch (err) {
      console.log(`Failed to convert ${entry.songName}`);
      console.log(err);
    }
    progress.increment();
  }, Number(args.concurrency)); // when using npm start, number get passed as a string
  progress.render();
  progress.stop();
  console.log('Processing finished');
}

run(argv);
