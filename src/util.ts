import path from 'path';
import { promisify } from 'util';
import glob from 'glob';
import { pipeline } from 'stream';

export async function getSmFileFromDir(dir: string):Promise<string | null> {
  const searchArgs = path.join(dir, path.sep, '*.sm');
  const res = await promisify(glob)(searchArgs);
  return res.length ? res[0] : null;
}
export async function getMp3FileFromDir(dir: string):Promise<string | null> {
  const searchArgs = path.join(dir, path.sep, '*.mp3');
  const res = await promisify(glob)(searchArgs);
  return res.length ? res[0] : null;
}

export const pipelineAsync = promisify(pipeline);
