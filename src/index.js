import { generateImage } from "./fal.js";
import { createFabricVideo, lipSyncVideo } from "./veed.js";

const [command, ...args] = process.argv.slice(2);

const usage = `Usage:
  npm run fal:image -- "<prompt>"
  npm run veed:fabric -- <image-url> <audio-url> [480p|720p]
  npm run veed:lipsync -- <video-url> <audio-url>`;

async function main() {
  switch (command) {
    case "fal:image": {
      const result = await generateImage(args.join(" "));
      console.log(result.data);
      return;
    }
    case "veed:fabric": {
      const [imageUrl, audioUrl, resolution] = args;
      const result = await createFabricVideo({ imageUrl, audioUrl, resolution });
      console.log(result.data);
      return;
    }
    case "veed:lipsync": {
      const [videoUrl, audioUrl] = args;
      const result = await lipSyncVideo({ videoUrl, audioUrl });
      console.log(result.data);
      return;
    }
    default:
      console.error(usage);
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
