const { parentPort, threadId } = require("worker_threads");
const fs = require("fs").promises;
const { createFFmpeg } = require("@ffmpeg/ffmpeg");

const ffmpeg = createFFmpeg();
const decoder = new TextDecoder();

parentPort.on("message", task => {
  const filename = decoder.decode(task.filename);
  const filedata = task.filedata;
  console.log(`Thread ${threadId} => Converting file ${filename}`);
  makeGif(filename, filedata)
    .then(outputFileName => {
      console.log(`Thread ${threadId} => Converted successful into ${outputFileName}`);
      parentPort.postMessage(outputFileName);
    })
    .catch(error => {
      console.log(`Thread ${threadId} => Converted failure with error ${error.message}`);
      parentPort.emit("error");
    })
});

async function makeGif(filename, filedata) {
  const [rawFileName, fileExt] = filename.split(".");
  const writtenFiles = [];
  if (!ffmpeg.isLoaded()) await ffmpeg.load();
  ffmpeg.FS("writeFile", `input.${fileExt}`, filedata);
  writtenFiles.push(`input.${fileExt}`);
  await ffmpeg.run("-i", `input.${fileExt}`, "-filter_complex", "fps=24,scale=300:-1,setsar=1,palettegen", "palette.png");
  writtenFiles.push("palette.png");
  await ffmpeg.run("-i", `input.${fileExt}`, "-i", "palette.png", "-filter_complex", "[0]fps=24,scale=300:-1,setsar=1[x];[x][1:v]paletteuse", "-t", "3", "output.gif");
  writtenFiles.push("output.gif");
  await fs.writeFile(`${rawFileName}.gif`, ffmpeg.FS("readFile", "output.gif"));
  writtenFiles.forEach(file => ffmpeg.FS("unlink", file));
  return `${rawFileName}.gif`;
}