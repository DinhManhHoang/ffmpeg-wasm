const { fetchFile } = require("@ffmpeg/ffmpeg");
const WorkerPool = require("./worker-pool");
const os = require("os");
const path = require("path");

const pool = new WorkerPool(os.cpus().length, path.resolve(__dirname, "worker.js"));

async function videoToGif(inputFilePathArr) {
  try {
    const encoder = new TextEncoder();
    const runners = inputFilePathArr.map(inputFilePath => fetchFile(inputFilePath)
        .then(filedata => {
          const filename = encoder.encode(inputFilePath.split("/").pop().toLowerCase());
          return Promise.resolve({ filename, filedata })
        })
        .then(({ filename, filedata }) => new Promise((resolve, reject) => {
          pool.runTask({ 
            filename,
            filedata 
          }, (err, result) => {
            if (err) return reject(err);
            return resolve(result);
          });
        }))
    );

    await Promise.all(runners);
  } catch (error) {
    console.error(error);
  } finally {
    return 0;
  }
}

videoToGif([
  "https://assets.curateapi.io/products/assets/50ebbb06-0dfb-411f-9689-6badae03d9a4.mp4",
  "https://assets.curateapi.io/products/assets/57e0f527-94fc-4f91-bfcc-80229458eb49.mp4",
  "https://assets.curateapi.io/products/assets/c6402f14-c580-4f39-8070-7121165f57a7.mp4",
  "https://assets.curateapi.io/products/assets/eee5b040-2f9f-4d56-80bb-0e7de28410d1.mp4",
  "https://assets.curateapi.io/products/assets/ab0bbc07-3971-4c3e-b101-54d71f76a5ba.mp4",
  "https://assets.curateapi.io/products/assets/d4dbac12-c035-441d-b70f-9e5f32090e5a.mp4",
  "https://assets.curateapi.io/products/assets/b157602a-d444-4afe-9b57-85151bccf391.mp4"
]).then(process.exit);