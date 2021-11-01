import path from 'path';
import { promisify } from 'util';
import glob from 'glob';

export async function getSmFiles(dir: string) {
  const searchArgs = path.join(dir, '/*.sm');
  return promisify(glob)(searchArgs);
}
