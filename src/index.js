import { generateImage } from "./fal.js";
import { createFabricVideo, lipSyncVideo } from "./veed.js";
import { chatWithGrok } from "./openrouter.js";

const [command, ...args] = process.argv.slice(2);

const usage = `Usage:
  npm run fal:image -- "<prompt>"
  npm run veed:fabric -- <image-url> <audio-url> [480p|720p]
  npm run veed:lipsync -- <video-url> <audio-url>
  npm run grok -- "<prompt>" [model]`;

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
    case "grok": {
      // Optional trailing OpenRouter model id (contains "/"), rest is the prompt.
      let model;
      const parts = [...args];
      if (parts.length > 1 && parts[parts.length - 1].includes("/")) {
        model = parts.pop();
      }
      const result = await chatWithGrok({ prompt: parts.join(" "), model });
      console.log(result.content);
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
