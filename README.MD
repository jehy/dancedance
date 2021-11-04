# DanceDance


![test](https://github.com/jehy/dancedance/workflows/Test/badge.svg)

Stepmania SM file genarator CLI.

## Installation

```bash
npm i -g dancedance
```

## Options:
Use --help command to see details:

* `concurrency: number` - how many files to processed. Setting more then server concurrency will take no effect.
* `token: string` - Auth token for server
* `album: [choices: "folder", "none", "artist", "artistAlbum"] ` - how to make albums for stepmania
* `inputDir: string`
* `inputMask: string` - mask to search for mp3, default `*.mp3`
* `outputDir: string`
* `server: 'jehy' | 'local'`
* `skipExisting: boolean` skip processing already processed
* `customServer: string` custom server http url
* `reuseSteps: boolean` don't generate SM files, just copy them to new folder structure
* `addBackground: boolean` add background for tracks where available
## Sample usage
```bash
dancedance --inputDir ~/Downloads/step --outputDir /opt/stepmania/Songs/  --keepDirs true --concurrency 5 --token *** --skipExisting true
``` [boolean]
