import fse from 'fs-extra';
import path from 'path';
import type { DirResult } from 'tmp';
import Tmp from 'tmp';
import type { Input } from './input';
import { run } from './process';

let expectedReply: string;

jest.mock('./http', () => ({
  getAxiosInstance: jest.fn().mockImplementation(() => ({
    post: async () => ({ data: fse.createReadStream(path.join(__dirname, expectedReply)) }),
  })),
}));

type DefaultArgs = Omit<Input, 'outputDir'>;

const defaultArgs: DefaultArgs = {
  concurrency: 1,
  token: 'dummy',
  inputDir: path.join(__dirname, 'test'),
  skipExisting: true,
  reuseSteps: false,
  server: 'local',
  inputMask: '**/*.mp3',
  addBackground: true,
  album: 'none',
  customServer: '',
  albumPrefix: '',
  progress: true,
};

type CheckFiles = {
  outputSongDir: string,
  mp3File: string,
  smFile: string,
  backgroundOriginalFile: string,
  backgroundFile : string,
};

function checkFiles(outputSongDir: string, songNameAndFile: string):void {
  const fileList: CheckFiles = {
    outputSongDir,
    mp3File: path.join(outputSongDir, `/${songNameAndFile}.mp3`),
    smFile: path.join(outputSongDir, `/${songNameAndFile}.sm`),
    backgroundOriginalFile: path.join(outputSongDir, '/background.original.jpeg'),
    backgroundFile: path.join(outputSongDir, '/background.jpeg'),
  };
  Object.entries(fileList).forEach(([type, filePath]) => {
    if (!fse.existsSync(filePath)) {
      throw new Error(`${type} does not exists - no ${filePath}`);
    }
  });
}

describe('processing test', () => {
  expectedReply = '/test/fine-zip/test.zip';
  describe('simple test', () => {
    let tempDir: DirResult;
    beforeEach(() => {
      tempDir = Tmp.dirSync({ unsafeCleanup: true });
    });
    afterEach(() => {
      tempDir.removeCallback();
    });

    it('should put mp3 in subdirs if specified', async () => {
      const songNameAndFile = 'Impact Moderato (Kevin MacLeod)';
      const albumName = 'folderName';
      const args: Input = {
        ...defaultArgs,
        album: 'folder',
        outputDir: tempDir.name,
      };
      await run(args);
      const outputSongDir = path.join(tempDir.name, albumName, songNameAndFile);
      checkFiles(outputSongDir, songNameAndFile);
    });

    it('should put mp3 in root folder if nothing specified', async () => {
      const songNameAndFile = 'Impact Moderato (Kevin MacLeod)';
      const args: Input = {
        ...defaultArgs,
        outputDir: tempDir.name,
        album: 'none',
      };
      await run(args);
      const outputSongDir = path.join(tempDir.name, songNameAndFile);
      checkFiles(outputSongDir, songNameAndFile);
    });

    it('should put mp3 in artist folder if artist specified', async () => {
      const songNameAndFile = 'Impact Moderato (Kevin MacLeod)';
      const albumName = 'Kevin MacLeod';
      const args: Input = {
        ...defaultArgs,
        outputDir: tempDir.name,
        album: 'artist',
      };
      await run(args);
      const outputSongDir = path.join(tempDir.name, albumName, songNameAndFile);
      checkFiles(outputSongDir, songNameAndFile);
    });
    it('should deal with bad archives', async () => {
      const songNameAndFile = 'Impact Moderato (Kevin MacLeod)';
      const albumName = 'Kevin MacLeod';
      expectedReply = '/test/empty-zip/empty.zip';
      const args: Input = {
        ...defaultArgs,
        outputDir: tempDir.name,
        album: 'artist',
      };
      await run(args);
      const outputSongDir = path.join(tempDir.name, albumName, songNameAndFile);
      const zipFile = path.join(outputSongDir, '/song.zip');
      if (!fse.existsSync(zipFile)) {
        throw new Error(`zip file does not exists - no ${zipFile}`);
      }
    });
  });
});
