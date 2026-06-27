import { openDB } from 'idb';

const DB_NAME = 'retrovault-db';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

// Initialize the database
export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
};

// Save a recording
export const saveRecording = async (recording) => {
  const db = await initDB();
  
  // Format fallback random assignment
  const formats = ['cassette', 'vinyl'];
  const randomFormat = formats[Math.floor(Math.random() * formats.length)];

  // Auto-generate title from first 5 words of transcript
  let title = 'Untitled Recording';
  if (recording.transcript && recording.transcript.trim()) {
    const words = recording.transcript.trim().split(/\s+/);
    title = words.slice(0, 5).join(' ');
    if (words.length > 5) {
      title += '...';
    }
  }

  const record = {
    id: recording.id || crypto.randomUUID(),
    type: recording.type || (recording.duration < 300 ? 'tape' : 'session'),
    title: recording.title || title,
    transcript: recording.transcript || '',
    duration: recording.duration || 0,
    tags: recording.tags || [],
    createdAt: recording.createdAt || new Date().toISOString(),
    format: recording.format || randomFormat,
    audioBlob: recording.audioBlob || null,
    status: recording.status || 'synced',
  };

  console.log('[DB] Saving record with audioBlob', record);
  await db.put(STORE_NAME, record);
  return record;
};

// Get all recordings
export const getRecordings = async () => {
  const db = await initDB();
  const recordings = await db.getAll(STORE_NAME);
  // Sort recordings by createdAt descending
  return recordings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// Delete a recording
export const deleteRecording = async (id) => {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
};
