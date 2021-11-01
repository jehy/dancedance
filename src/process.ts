import path from 'path';
import { promisify } from 'util';
import glob from 'glob';
import type { AxiosInstance } from 'axios';
import { Presets, SingleBar } from 'cli-progress';
import FormData from 'form-data';
import fse from 'fs-extra';
import unzipper from 'unzipper';
import { pipeline } from 'stream';
import promiseMap from 'promise.map';
import type { Input } from './input';
import { argv } from './input';
import { maybeSetBackground } from './background';
import { getAxiosInstance } from './http';
import { getSmFiles } from './util';

// const log = Debug('dancedance:run');

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
    console.log('Failed to set background');
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

export async function run(args: Input) {
  if (args.album && args.keepDirs) {
    throw new Error('Can not work when both album and keepDirs specified!');
  }
  if (!await fse.pathExists(args.outputDir)) {
    throw new Error(`Dir ${args.outputDir} does not exists, nowhere to output!`);
  }
  const plan = await getProcessPlan(args);
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
