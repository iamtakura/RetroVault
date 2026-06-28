import { useState, useRef, useEffect, useCallback } from 'react';
import { transcribeAudio } from '../lib/transcribe';
import { saveRecording, deleteRecording } from '../lib/db';
import { generateTags } from '../lib/tagging';

export function useRecorder({ onStart, onStop, playClick, startHiss, stopHiss, onTranscriptReady, mode, language = 'auto' } = {}) {
  // States: 'idle' | 'recording' | 'processing' | 'done' | 'error'
  const [status, setStatus] = useState('idle');
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [pendingRecording, setPendingRecording] = useState(null);

  const chunksRef = useRef([]);
  const transcriptRef = useRef('');
  const tagsRef = useRef([]);
  const startTimeRef = useRef(null);
  const blobRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const timerIdRef = useRef(null);
  const streamRef = useRef(null);

  // Clean up timer
  const stopTimer = useCallback(() => {
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, []);

  // Clean up all resources
  const cleanup = useCallback(() => {
    stopTimer();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, [stopTimer]);

  const durationRef = useRef(0);

  // Keep durationRef in sync with duration state to prevent startRecording callback recreation
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (playClick) playClick();
    setError(null);
    setTranscript('');
    setDuration(0);
    
    chunksRef.current = [];
    transcriptRef.current = '';
    tagsRef.current = [];
    blobRef.current = null;
    startTimeRef.current = Date.now();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/ogg;codecs=opus';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Confirmed recording start event handler
      mediaRecorder.onstart = () => {
        setStatus('recording');
        // Trigger GSAP callback
        if (onStart) onStart();

        // Start timer only when recording has officially commenced
        timerIdRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      };

      mediaRecorder.onstop = async () => {
        // Trigger processing state
        setStatus('processing');
        if (stopHiss) stopHiss();

        try {
          // Assemble blob FIRST
          const blob = new Blob(chunksRef.current, { type: mimeType });
          
          // Set ref IMMEDIATELY — before any awaits
          blobRef.current = blob;
          
          console.log('[BLOB] Size:', blob.size, 'Ref set:', !!blobRef.current);

          if (blob.size === 0) {
            console.error('[BLOB] Empty');
            setStatus('idle');
            return;
          }

          let transcriptText = '';
          let tags = ['pending'];
          let offline = false;

          try {
            transcriptText = await transcribeAudio(blob, language);
            console.log('[TRANSCRIPT]', transcriptText);
            transcriptRef.current = transcriptText;

            tags = await generateTags(transcriptText);
            console.log('[TAGS]', tags);
            tagsRef.current = tags;
          } catch (err) {
            // Check if network error
            const isNetworkError = !navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError');
            if (isNetworkError) {
              console.warn('[OFFLINE] Transcription failed due to connection. Saving raw audio blob temporarily.');
              offline = true;
              transcriptText = 'Transcription pending (offline)...';
              transcriptRef.current = transcriptText;
              tags = ['pending'];
              tagsRef.current = tags;
            } else {
              throw err;
            }
          }

          const durationVal = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const type = mode === 'session' ? 'session' : 'tape';
          const format = type === 'session' ? 'vinyl' : 'cassette';

          // Pass blob directly — do NOT use blobRef.current here
          // Pass the local variable to avoid any ref timing issues
          const saved = await saveRecording({
            id: crypto.randomUUID(),
            type,
            format,
            title: transcriptText.split(' ').slice(0, 5).join(' '),
            transcript: transcriptText,
            tags,
            duration: durationVal,
            createdAt: new Date().toISOString(),
            audioBlob: blob,
            status: offline ? 'pending' : 'synced'
          });

          console.log('[DB] Saved with blob size:', blob.size);

          // Now update UI state to show the confirm card
          setTranscript(transcriptText);
          setPendingRecording(saved);
          setStatus('done');
          if (onStop) onStop();

          if (onTranscriptReady) {
            onTranscriptReady({
              transcript: transcriptText,
              tags,
              blob
            });
          }
        } catch (err) {
          console.error('[SAVE PIPELINE] Failed:', err);
          setError(err.message || 'Failed to transcribe audio.');
          setStatus('error');
          if (onStop) onStop();
        }
      };

      // Play start click & start tape hiss
      if (startHiss) startHiss();

      // Start actual MediaRecorder with 250ms timeslice to flush buffers frequently
      mediaRecorder.start(250);

    } catch (err) {
      console.error('Microphone access denied or audio issue:', err);
      setError('Microphone access denied. Please check site permissions.');
      setStatus('error');
      if (stopHiss) stopHiss();
    }
  }, [onStart, onStop, playClick, startHiss, stopHiss, onTranscriptReady]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (playClick) playClick();
    stopTimer();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [playClick, stopTimer]);

  // Save the pending recording
  const saveCurrentRecording = useCallback(async (customTitle, tagsOverride) => {
    if (playClick) playClick();

    try {
      const duration = startTimeRef.current 
        ? Math.floor((Date.now() - startTimeRef.current) / 1000) 
        : durationRef.current;
      
      const type = mode === 'session' ? 'session' : 'tape';
      const format = type === 'session' ? 'vinyl' : 'cassette';

      const tags = tagsOverride || tagsRef.current || pendingRecording?.tags || [];
      const title = customTitle || (transcriptRef.current ? transcriptRef.current.split(' ').slice(0, 5).join(' ') : (pendingRecording?.title || 'Untitled Recording'));

      const saved = await saveRecording({
        id: pendingRecording?.id || crypto.randomUUID(),
        type,
        format,
        title,
        transcript: transcriptRef.current || pendingRecording?.transcript || '',
        tags,
        duration,
        createdAt: pendingRecording?.createdAt || new Date().toISOString(),
        audioBlob: pendingRecording?.audioBlob || null,
        status: pendingRecording?.status || 'synced'
      });

      // Reset refs after confirmed save
      chunksRef.current = [];
      transcriptRef.current = '';
      tagsRef.current = [];
      blobRef.current = null;
      startTimeRef.current = null;

      console.log('[DB] Save complete');
      window.dispatchEvent(new Event('retrovault-saved'));

      // Clear pending and reset state
      setPendingRecording(null);
      setStatus('idle');
      setDuration(0);
      setTranscript('');
      return saved;
    } catch (err) {
      console.error(err);
      setError('Failed to save recording locally.');
      setStatus('error');
    }
  }, [playClick, mode, pendingRecording]);

  // Discard the pending recording
  const discardCurrentRecording = useCallback(async () => {
    if (playClick) playClick();
    if (pendingRecording?.id) {
      try {
        await deleteRecording(pendingRecording.id);
        window.dispatchEvent(new Event('retrovault-saved'));
      } catch (err) {
        console.error('Failed to discard recording from DB:', err);
      }
    }
    chunksRef.current = [];
    transcriptRef.current = '';
    tagsRef.current = [];
    blobRef.current = null;
    startTimeRef.current = null;
    setPendingRecording(null);
    setStatus('idle');
    setDuration(0);
    setTranscript('');
  }, [playClick, pendingRecording]);

  // Reset errors back to idle
  const resetRecorder = useCallback(() => {
    cleanup();
    setStatus('idle');
    setError(null);
    setDuration(0);
    setTranscript('');
    setPendingRecording(null);
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    status,
    duration,
    transcript,
    transcriptRef,
    error,
    pendingRecording,
    startRecording,
    stopRecording,
    saveCurrentRecording,
    discardCurrentRecording,
    resetRecorder,
  };
}
