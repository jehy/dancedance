import yargs from 'yargs/yargs';
import { cpus } from 'os';

export type Input = {
  concurrency: number,
  token: string,
  keepDirs?: boolean,
  inputDir: string,
  inputMask: string,
  outputDir: string,
  server: 'jehy' | 'local',
  album? : string,
  skipExisting?: boolean,
  customServer?: string,
};

export function getInput() {
  return yargs(process.argv.slice(2))
    .options({
      concurrency: {
        alias: 'c',
        type: 'number',
        required: false,
        default: cpus().length,
      },
      token: {
        alias: 't',
        required: true,
        type: 'string',
      },
      keepDirs: {
        alias: 'k',
        required: false,
        type: 'string',
      },
      inputDir: {
        alias: 'i',
        type: 'string',
      },
      inputMask: {
        alias: 'm',
        type: 'string',
        default: '**/*.mp3',
      },
      outputDir: {
        alias: 'o',
        type: 'string',
      },
      album: {
        alias: 'a',
        type: 'string',
      },
      server: {
        choices: ['jehy', 'local'],
        alias: 's',
        default: 'local',
      },
      skipExisting: {
        type: 'boolean',
        default: false,
      },
      customServer: {
        type: 'string',
        default: '',
      },
    })
    .help('help').parseSync() as Input;
}
