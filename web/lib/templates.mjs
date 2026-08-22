export const VIDEO_TEMPLATES = Object.freeze([
  Object.freeze({
    id: "parody",
    name: "Parody",
    eyebrow: "THE FOUNDER'S VERSION",
    description: "A confident first-person origin story whose own pitch reveals the joke.",
    perspective: "Write in first person as the product owner, performing an exaggerated origin story and pitch.",
    imagePath: "/templates/parody-presenter.png",
    imageFileName: "parody-presenter.png",
    voice: "Charlie",
  }),
  Object.freeze({
    id: "roast",
    name: "Roast",
    eyebrow: "THE OUTSIDE VERDICT",
    description: "A dry fictional awards host points at the evidence and says the quiet part out loud.",
    perspective: "Write as an external fictional British awards-show host delivering a concise product-first roast.",
    imagePath: "/templates/roast-presenter.png",
    imageFileName: "roast-presenter.png",
    voice: "George",
  }),
]);

export function getVideoTemplate(templateId) {
  const template = VIDEO_TEMPLATES.find((candidate) => candidate.id === templateId);
  if (!template) throw new Error("Choose either the Parody or Roast template.");
  return template;
}
