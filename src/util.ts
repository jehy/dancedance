import { promisify } from 'util';
import glob from 'glob';
import { pipeline } from 'stream';
import path from 'path';

export async function getSmFileFromDir(dir: string):Promise<string | null> {
  const res = await promisify(glob)('*.sm', { cwd: path.normalize(dir) + path.sep, absolute: true });
  return res.length ? res[0] : null;
}
export async function getMp3FileFromDir(dir: string):Promise<string | null> {
  const res = await promisify(glob)('*.mp3', { cwd: path.normalize(dir) + path.sep, absolute: true });
  return res.length ? res[0] : null;
}

export const pipelineAsync = promisify(pipeline);
