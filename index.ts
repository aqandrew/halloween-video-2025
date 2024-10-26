import url from 'url';
import path from 'path';
import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';

const ASSETS_FOLDER = `input/'Creepy Crawlies 2' Decorations Collection - Horizontal`;
const OUTPUT_FILE = 'output/halloween-video.mp4';
const MIN_DURATION = 60 * 1; // 1 min
let assets = {};

async function main() {
  await findAssets();

  let duration = 0;
  let currentAnimal: string | undefined;
  let ffmpegCommand = ffmpeg();

  while (duration < MIN_DURATION) {
    const wallVideo = getRandomWallVideo(currentAnimal);
    ffmpegCommand.addInput(wallVideo);
    const wd = (await getVideoDuration(wallVideo)) as number;
    duration += wd;
    currentAnimal = getAnimal(wallVideo);
    console.log('picked wall', currentAnimal);

    const tvVideo = getRandomTvVideo(currentAnimal);
    ffmpegCommand.addInput(tvVideo);
    const td = (await getVideoDuration(tvVideo)) as number;
    duration += td;
    currentAnimal = getAnimal(tvVideo);
    console.log('picked TV', currentAnimal);
  }

  const durationFormatted = formatDuration(duration);
  console.log('\nrendering video...');
  ffmpegCommand
    .mergeToFile(OUTPUT_FILE, '/temp/')
    .on('progress', (progress) => {
      const { timemark } = progress;
      const timemarkFormatted = timemark.slice(
        timemark.indexOf(':') + 1,
        timemark.indexOf('.')
      );
      console.log(`${timemarkFormatted}/${durationFormatted}`);
    })
    .on('error', (err) => {
      console.error(err);
    })
    .on('end', () => {
      console.log('finished!');
    });
}

function formatDuration(duration: number) {
  const minutes = (duration / 60).toFixed(0);
  const seconds = (duration % 60).toFixed(0);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getVideoDuration(videoPath: string) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      }

      resolve(metadata.format.duration);
    });
  });
}

function getAnimal(videoPath: string) {
  return path.basename(videoPath).split('_')[1].toLowerCase();
}

async function findAssets() {
  const __filename = url.fileURLToPath(import.meta.url);
  const assetsPath = path.join(path.dirname(__filename), ASSETS_FOLDER);
  const folders = await fs.readdir(assetsPath);
  const tvPath = path.join(assetsPath, 'TV');
  assets[tvPath] = await fs.readdir(tvPath);

  for (const folder of folders) {
    const folderPath = path.join(assetsPath, folder);
    const stat = await fs.stat(folderPath);

    if (stat.isDirectory() && folder.includes('Wall')) {
      assets[folderPath] = await fs.readdir(folderPath);
    }
  }
}

function getRandomElement(array: Array<any>) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

function getRandomWallVideo(currentAnimal?: string) {
  const wallPaths = Object.keys(assets).filter((f) => f.includes('Wall'));
  const wallPath = getRandomElement(wallPaths);

  return path.join(
    wallPath,
    getRandomElement(
      (assets[wallPath] as Array<string>).filter(
        (v) => !v.includes(currentAnimal!)
      )
    )
  );
}

function getRandomTvVideo(currentAnimal?: string) {
  const tvPath = Object.keys(assets).find((f) => f.includes('TV'))!;
  const tvVideos = assets[tvPath] as Array<string>;

  return path.join(
    tvPath,
    getRandomElement(tvVideos.filter((v) => !v.includes(currentAnimal!)))
  );
}

await main();
