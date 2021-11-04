import path from 'path';
import { promisify } from 'util';
import glob from 'glob';
import type { AxiosInstance } from 'axios';
import { Presets, SingleBar } from 'cli-progress';
import FormData from 'form-data';
import fse from 'fs-extra';
import unzip from 'unzip-stream';
import promiseMap from 'promise.map';
import type { Input } from './input';
import { maybeSetBackground } from './background';
import { getAxiosInstance } from './http';
import { getMp3FileFromDir, getSmFileFromDir, pipelineAsync } from './util';
import { getNewFolderName, getSongName } from './mp3Meta';

type TrackPlan = {
  from: string,
  toDir: string,
  toPath: string,
  songName: string,
  songPath: string,
  alreadyConverted: boolean,
  smExists: boolean,
  reuse: boolean,
};

async function convertViaServer(client: AxiosInstance, entry: TrackPlan) {
  const form = new FormData();
  // @ts-ignore formData не понимает что ему можно выдать стрим
  form.append('song', fse.createReadStream(entry.from), { filename: 'song.mp3' });
  const response = await client.post('plain', form, {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${form.getBoundary()}`,
    },
  });
  const unzipStream = unzip.Extract({ path: entry.songPath });
  await pipelineAsync(response.data, unzipStream);
  const mp3File = await getMp3FileFromDir(entry.songPath);
  const smFile = await getSmFileFromDir(entry.songPath);
  if (!mp3File) {
    throw new Error('No song mp3 file in reply from server');
  }
  if (!smFile) {
    throw new Error('No song SM file in reply from server');
  }
  const mp3NameShouldBe = `${entry.songName}.mp3`;
  if (path.basename(mp3File) !== mp3NameShouldBe) {
    await fse.rename(mp3File, path.join(entry.songPath, mp3NameShouldBe));
    await fse.rename(smFile, path.join(entry.songPath, `${entry.songName}.sm`));
  }
}

type CovertOptions = {
  client: AxiosInstance,
  entry: TrackPlan,
  progress: SingleBar,
  addBackground: boolean
};

async function convertTrack(covertOptions: CovertOptions) {
  const {
    client, entry, progress, addBackground,
  } = covertOptions;
  progress.update({ songName: entry.songName });
  if (entry.reuse) {
    await fse.ensureDir(entry.songPath);
    const mp3Path = path.join(entry.songPath, `${entry.songName}.mp3`);
    await fse.copy(entry.from, mp3Path);
    const smPath = mp3Path.replace('.mp3', '.sm');
    await fse.copy(entry.from.replace('.mp3', '.sm'), smPath);
  } else {
    await convertViaServer(client, entry);
  }
  if (!addBackground) {
    return;
  }
  try {
    await maybeSetBackground(entry.from, entry.songPath);
  } catch (err) {
    console.log('Failed to set background');
    console.log(err);
  }
}

async function getProcessPlan(args: Input):Promise<Array<TrackPlan>> {
  console.log(`Processing tracks in ${args.inputDir}`);
  const searchDir = path.normalize(args.inputDir) + path.sep;
  const entries = await promisify(glob)(args.inputMask, { cwd: searchDir, absolute: true });
  const all = await promiseMap(entries, async (entry): Promise<TrackPlan> => {
    const from = entry;
    const toDir = await getNewFolderName(entry, args);
    const toPath = path.join(args.outputDir, `${args.albumPrefix}${toDir}`);
    const songName = await getSongName(entry);
    const songPath = path.join(toPath, songName);
    const alreadyConverted = (await getSmFileFromDir(songPath)) !== null;
    const smExists = (fse.existsSync(from.replace('.mp3', '.sm')));
    const reuse = smExists && Boolean(args.reuseSteps);
    return {
      from, toDir, toPath, songName, songPath, alreadyConverted, smExists, reuse,
    };
  }, 3);
  if (args.skipExisting) {
    return all.filter((entry) => !entry.alreadyConverted);
  }
  return all;
}

export async function run(args: Input) {
  if (!await fse.pathExists(args.outputDir)) {
    throw new Error(`Dir ${args.outputDir} does not exists, nowhere to output!`);
  }
  if (args.albumPrefix && args.album === 'none') {
    throw new Error('albumPrefix can only be used with album!');
  }
  const plan = await getProcessPlan(args);
  const progress = new SingleBar({
    format: 'Converting {songName} [{bar}] {percentage}% '
            + '| ETA: {eta_formatted} | spent {duration_formatted} | done {value}/{total}',
  }, Presets.shades_classic);
  progress.start(plan.length, 0);
  const client = getAxiosInstance(args);

  await promiseMap(plan, async (entry) => {
    try {
      await convertTrack({
        client,
        entry,
        progress,
        addBackground: Boolean(args.addBackground),
      });
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
