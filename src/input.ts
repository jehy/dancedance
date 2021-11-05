import yargs from 'yargs/yargs';
import { cpus } from 'os';

type Server = 'jehy' | 'local';
type Album = 'folder' | 'none' | 'artist' | 'artistAlbum';

export type Input = {
  concurrency: number,
  token: string,
  inputDir: string,
  inputMask: string,
  outputDir: string,
  server: Server,
  album : Album,
  skipExisting: boolean,
  reuseSteps: boolean,
  customServer: string,
  addBackground: boolean,
  albumPrefix: string,
  progress: boolean,
};

const options = {
  concurrency: {
    alias: 'c',
    type: 'number',
    default: cpus().length,
    description: 'how many files to processed. Setting more then server concurrency will take no effect.',
  },
  token: {
    alias: 't',
    required: true,
    type: 'string',
    description: 'Auth token for conversion server',
  },
  inputDir: {
    alias: 'i',
    type: 'string',
    required: true,
  },
  inputMask: {
    alias: 'm',
    type: 'string',
    default: '**/*.mp3',
  },
  outputDir: {
    alias: 'o',
    type: 'string',
    required: true,
  },
  album: {
    alias: 'a',
    choices: ['folder', 'none', 'artist', 'artistAlbum'],
    default: 'artist',
    description: 'how to make albums for stepmania',
  },
  reuseSteps: {
    alias: 'r',
    type: 'boolean',
    default: false,
    description: 'don\'t generate SM files, just copy them to new folder structure',
  },
  server: {
    choices: ['jehy', 'local'],
    alias: 's',
    default: 'local',
  },
  skipExisting: {
    type: 'boolean',
    default: true,
    description: 'skip processing already processed',
  },
  customServer: {
    type: 'string',
    default: '',
  },
  albumPrefix: {
    type: 'string',
    default: '',
  },
  addBackground: {
    type: 'boolean',
    default: true,
  },
  progress: {
    type: 'boolean',
    default: true,
  },
};

export function getInput():Input {
  return yargs(process.argv.slice(2))
  // @ts-ignore
    .options(options)
    .help('help').parseSync() as unknown as Input;
}
