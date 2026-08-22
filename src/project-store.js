import { randomUUID } from "node:crypto";

export class ProjectStore {
  #projects = new Map();

  create(project) {
    const now = new Date().toISOString();
    const saved = { id: randomUUID(), createdAt: now, updatedAt: now, feedback: [], packets: [], ...project };
    this.#projects.set(saved.id, saved);
    return saved;
  }

  get(id) {
    return this.#projects.get(id) || null;
  }

  list() {
    return [...this.#projects.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  update(id, changes) {
    const project = this.get(id);
    if (!project) return null;
    Object.assign(project, changes, { updatedAt: new Date().toISOString() });
    return project;
  }
}
