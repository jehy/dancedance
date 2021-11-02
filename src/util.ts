import path from 'path';
import { promisify } from 'util';
import glob from 'glob';

export async function getSmFile(dir: string):Promise<string | null> {
  const searchArgs = path.join(dir, path.sep, '*.sm');
  const res = await promisify(glob)(searchArgs);
  return res.length ? res[0] : null;
}
export async function getMp3File(dir: string):Promise<string | null> {
  const searchArgs = path.join(dir, path.sep, '*.mp3');
  const res = await promisify(glob)(searchArgs);
  return res.length ? res[0] : null;
}
