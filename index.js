const fs = require("fs").promises;
const { createFFmpeg, fetchFile } = require("@ffmpeg/ffmpeg");

const ffmpeg = createFFmpeg({ log: true });

async function videoToGif(inputFilePath) {
  try {
    const name = inputFilePath.split("/").pop();
    const ext = name.split(".").pop().toLowerCase();
    const writtenFiles = [];
    await ffmpeg.load();
    ffmpeg.FS("writeFile", `input.${ext}`, await fetchFile(inputFilePath));
    writtenFiles.push(`input.${ext}`);
    await ffmpeg.run("-i", `input.${ext}`, "-filter_complex", "fps=24,scale=300:-1,setsar=1,palettegen", "palette.png");
    writtenFiles.push("palette.png");
    await ffmpeg.run("-i", `input.${ext}`, "-i", "palette.png", "-filter_complex", "[0]fps=24,scale=300:-1,setsar=1[x];[x][1:v]paletteuse", "-t", "3", "output.gif");
    writtenFiles.push("output.gif");
    await fs.writeFile(name.replace(new RegExp(ext + "$"), "gif"), ffmpeg.FS("readFile", "output.gif"));
    writtenFiles.forEach(file => ffmpeg.FS("unlink", file));
  } catch (error) {
    console.error(error);
  } finally {
    return 0;
  }
}

videoToGif("https://file-examples-com.github.io/uploads/2018/04/file_example_MOV_1920_2_2MB.mov").then(process.exit);