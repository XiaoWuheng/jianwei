import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export function openStore(directory) {
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(join(directory, 'jianwei.sqlite'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS thoughts(id TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS memories(id TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS preferences(key TEXT PRIMARY KEY, value TEXT NOT NULL);');
  return {
    list() { return db.prepare('SELECT value FROM projects').all().map(r=>JSON.parse(r.value)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)); },
    get(id) { const r=db.prepare('SELECT value FROM projects WHERE id=?').get(id); return r ? JSON.parse(r.value) : null; },
    put(project) { db.prepare('INSERT INTO projects VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(project.id,JSON.stringify(project)); return project; },
    remove(id) { db.prepare('DELETE FROM projects WHERE id=?').run(id); },
    thoughts() { return db.prepare('SELECT value FROM thoughts').all().map(r=>JSON.parse(r.value)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)); },
    thought(id) { const r=db.prepare('SELECT value FROM thoughts WHERE id=?').get(id); return r ? JSON.parse(r.value) : null; },
    putThought(value) { db.prepare('INSERT INTO thoughts VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(value.id,JSON.stringify(value)); return value; },
    removeThought(id) { db.prepare('DELETE FROM thoughts WHERE id=?').run(id); },
    memories() { return db.prepare('SELECT value FROM memories').all().map(r=>JSON.parse(r.value)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); },
    putMemory(value) { db.prepare('INSERT INTO memories VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(value.id,JSON.stringify(value)); return value; },
    removeMemory(id) { db.prepare('DELETE FROM memories WHERE id=?').run(id); },
    preferences() { const r=db.prepare('SELECT value FROM preferences WHERE key=?').get('settings'); return { depth:'standard', region:'中国与全球', name:'探索者', memoryAuto:true, memoryDays:7, ...(r ? JSON.parse(r.value) : {}) }; },
    savePreferences(value) { db.prepare('INSERT INTO preferences VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('settings',JSON.stringify(value)); return value; },
    close() { db.close(); }
  };
}
