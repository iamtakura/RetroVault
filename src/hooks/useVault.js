import { useState, useEffect, useMemo, useCallback } from 'react';
import { getRecordings, deleteRecording as dbDeleteRecording, saveRecording, initDB } from '../lib/db';
import { transcribeAudio } from '../lib/transcribe';
import { generateTags } from '../lib/tagging';

export function useVault() {
  const [rawRecordings, setRawRecordings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedRecording, setSelectedRecording] = useState(null);

  // Fetch all recordings from IndexedDB
  const fetchRecordings = useCallback(async () => {
    try {
      const list = await getRecordings();
      setRawRecordings(list);
    } catch (err) {
      console.error('Failed to fetch recordings in useVault:', err);
    }
  }, []);

  // Retry transcribing pending items if online
  const retryPendingTranscriptions = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      const list = await getRecordings();
      const pendingItems = list.filter((rec) => rec.status === 'pending');
      
      if (pendingItems.length === 0) return;

      console.log(`[OFFLINE RETRY] Found ${pendingItems.length} pending items to transcribe.`);

      for (const rec of pendingItems) {
        if (!rec.audioBlob) continue;
        try {
          console.log(`[OFFLINE RETRY] Transcribing record: ${rec.id}`);
          const transcript = await transcribeAudio(rec.audioBlob);
          const tags = await generateTags(transcript);
          
          await saveRecording({
            ...rec,
            transcript,
            tags,
            status: 'synced',
            audioBlob: null, // Clear the audio blob to free IndexedDB space
          });
          console.log(`[OFFLINE RETRY] Transcribed record: ${rec.id} successfully.`);
        } catch (err) {
          console.error(`[OFFLINE RETRY] Failed to transcribe pending item ${rec.id}:`, err);
        }
      }
      
      fetchRecordings();
    } catch (err) {
      console.error('Failed to retry pending transcriptions:', err);
    }
  }, [fetchRecordings]);

  // Initial load and connection listener
  useEffect(() => {
    fetchRecordings();

    const handleOnline = () => {
      retryPendingTranscriptions();
    };

    window.addEventListener('online', handleOnline);
    retryPendingTranscriptions();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchRecordings, retryPendingTranscriptions]);

  // Migrate existing records that have format: 'reel'
  useEffect(() => {
    const migrateReels = async () => {
      try {
        const db = await initDB();
        const all = await db.getAll('recordings');
        let migrated = false;
        for (const record of all) {
          if (record.format === 'reel') {
            record.format = record.type === 'session' ? 'vinyl' : 'cassette';
            await db.put('recordings', record);
            migrated = true;
          }
        }
        if (migrated) {
          fetchRecordings();
        }
      } catch (err) {
        console.error('Failed to migrate reels:', err);
      }
    };
    migrateReels();
  }, [fetchRecordings]);

  // Clear legacy untagged/reel recordings once to establish a clean slate
  useEffect(() => {
    const clearLegacy = async () => {
      try {
        const isCleared = localStorage.getItem('retrovault-legacy-cleared') === 'true';
        if (isCleared) return;
        
        const db = await initDB();
        await db.clear('recordings');
        localStorage.setItem('retrovault-legacy-cleared', 'true');
        fetchRecordings();
        console.log('[DB] Legacy untagged recordings cleared for tagging model update.');
      } catch (err) {
        console.error('Failed to clear database:', err);
      }
    };
    clearLegacy();
  }, [fetchRecordings]);

  // Compute all unique tags across saved memos
  const allTags = useMemo(() => {
    const tagsSet = new Set();
    rawRecordings.forEach((rec) => {
      if (rec.tags && Array.isArray(rec.tags)) {
        rec.tags.forEach((tag) => {
          if (tag && tag.trim()) {
            tagsSet.add(tag.toLowerCase().trim());
          }
        });
      }
    });
    return Array.from(tagsSet).sort();
  }, [rawRecordings]);

  // Compute search & tag filtered recordings
  const recordings = useMemo(() => {
    return rawRecordings.filter((rec) => {
      // 1. Tag selection filter
      if (selectedTag) {
        const hasTag = rec.tags && rec.tags.some(
          t => t.toLowerCase().trim() === selectedTag.toLowerCase().trim()
        );
        if (!hasTag) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = rec.title && rec.title.toLowerCase().includes(q);
        const matchTranscript = rec.transcript && rec.transcript.toLowerCase().includes(q);
        return matchTitle || matchTranscript;
      }

      return true;
    });
  }, [rawRecordings, searchQuery, selectedTag]);

  // Delete recording - updates state optimistically first
  const deleteRecording = useCallback(async (id) => {
    // Optimistic UI update
    setRawRecordings((prev) => prev.filter((rec) => rec.id !== id));
    
    // Clear selection if deleted
    if (selectedRecording && selectedRecording.id === id) {
      setSelectedRecording(null);
    }

    try {
      await dbDeleteRecording(id);
      fetchRecordings();
      window.dispatchEvent(new Event('retrovault-saved'));
    } catch (err) {
      console.error('Failed to delete recording from IndexedDB, rolling back:', err);
      // Rollback to database state on failure
      fetchRecordings();
    }
  }, [selectedRecording, fetchRecordings]);

  return {
    recordings,
    searchQuery,
    setSearchQuery,
    selectedTag,
    setSelectedTag,
    allTags,
    deleteRecording,
    selectedRecording,
    setSelectedRecording,
    refresh: fetchRecordings,
  };
}
