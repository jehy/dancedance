import fse from 'fs-extra';
import path from 'path';
import type { DirResult } from 'tmp';
import Tmp from 'tmp';
import type { Input } from './input';
import { run } from './process';

jest.mock('./http', () => ({
  getAxiosInstance: jest.fn().mockImplementation(() => ({
    post: async () => ({ data: fse.createReadStream(path.join(__dirname, '/test/test.zip')) }),
  })),
}));

describe('processing test', () => {
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
        concurrency: 1,
        token: 'dummy',
        keepDirs: true,
        inputDir: path.join(__dirname, 'test'),
        outputDir: tempDir.name,
        server: 'local',
        inputMask: '**/*.mp3',
      };
      await run(args);
      const outputSongDir = path.join(tempDir.name, albumName, songNameAndFile);
      const mp3File = path.join(outputSongDir, `/${songNameAndFile}.mp3`);
      const smFile = path.join(outputSongDir, `/${songNameAndFile}.sm`);
      const backgroundOriginalFile = path.join(outputSongDir, '/background.original.jpeg');
      const backgroundFile = path.join(outputSongDir, '/background.jpeg');
      expect(fse.existsSync(outputSongDir)).toBeTruthy();
      expect(fse.existsSync(mp3File)).toBeTruthy();
      expect(fse.existsSync(smFile)).toBeTruthy();
      expect(fse.existsSync(backgroundFile)).toBeTruthy();
      expect(fse.existsSync(backgroundOriginalFile)).toBeTruthy();
    });

    it('should put mp3 in root folder if nothing specified', async () => {
      const songNameAndFile = 'Impact Moderato (Kevin MacLeod)';
      const args: Input = {
        concurrency: 1,
        token: 'dummy',
        keepDirs: false,
        inputDir: path.join(__dirname, 'test'),
        outputDir: tempDir.name,
        server: 'local',
        inputMask: '**/*.mp3',
      };
      await run(args);
      const outputSongDir = path.join(tempDir.name, songNameAndFile);
      const mp3File = path.join(outputSongDir, `/${songNameAndFile}.mp3`);
      const smFile = path.join(outputSongDir, `/${songNameAndFile}.sm`);
      const backgroundOriginalFile = path.join(outputSongDir, '/background.original.jpeg');
      const backgroundFile = path.join(outputSongDir, '/background.jpeg');
      expect(fse.existsSync(outputSongDir)).toBeTruthy();
      expect(fse.existsSync(mp3File)).toBeTruthy();
      expect(fse.existsSync(smFile)).toBeTruthy();
      expect(fse.existsSync(backgroundFile)).toBeTruthy();
      expect(fse.existsSync(backgroundOriginalFile)).toBeTruthy();
    });

    it('should put mp3 in album folder if nothing specified', async () => {
      const songNameAndFile = 'Impact Moderato (Kevin MacLeod)';
      const albumName = 'folderName';
      const args: Input = {
        concurrency: 1,
        token: 'dummy',
        keepDirs: false,
        inputDir: path.join(__dirname, 'test'),
        outputDir: tempDir.name,
        server: 'local',
        inputMask: '**/*.mp3',
        album: albumName,
      };
      await run(args);
      const outputSongDir = path.join(tempDir.name, albumName, songNameAndFile);
      const mp3File = path.join(outputSongDir, `/${songNameAndFile}.mp3`);
      const smFile = path.join(outputSongDir, `/${songNameAndFile}.sm`);
      const backgroundOriginalFile = path.join(outputSongDir, '/background.original.jpeg');
      const backgroundFile = path.join(outputSongDir, '/background.jpeg');
      expect(fse.existsSync(outputSongDir)).toBeTruthy();
      expect(fse.existsSync(mp3File)).toBeTruthy();
      expect(fse.existsSync(smFile)).toBeTruthy();
      expect(fse.existsSync(backgroundFile)).toBeTruthy();
      expect(fse.existsSync(backgroundOriginalFile)).toBeTruthy();
    });
  });
});
