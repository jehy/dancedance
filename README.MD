# DanceDance


![test](https://github.com/jehy/dancedance/workflows/Test/badge.svg)

Stepmania SM file genarator CLI.

## Installation

```bash
npm i -g dancedance
```

## Options:

* `concurrency: number | string` - how many files to processed. Setting more then server concurrency will take no effect.
* `token: string` - Auth token for server
* `keepDirs?: boolean` - Keep directory structure, use last song dir as album name
* `inputDir: string`
* `inputMask: string` - mask to search for mp3, default `*.mp3`
* `outputDir: string`
* `server: 'jehy' | 'local'`
* `album? : string`
* `skipExisting?: boolean`
* `customServer?: string` custom server http url

## Sample usage
```bash
dancedance --inputDir ~/Downloads/step --outputDir /opt/stepmania/Songs/  --keepDirs true --concurrency 5 --token *** --skipExisting true
```
