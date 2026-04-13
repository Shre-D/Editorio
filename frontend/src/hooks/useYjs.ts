import { useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import type * as Monaco from 'monaco-editor';

const YJS_URL = import.meta.env.VITE_YJS_URL || 'ws://localhost:1234';

interface UseYjsOptions {
  roomId: string;
  editor: Monaco.editor.IStandaloneCodeEditor | null;
  username: string;
  cursorColor: string;
}

interface YjsState {
  doc: Y.Doc | null;
  provider: WebsocketProvider | null;
  binding: MonacoBinding | null;
}

export function useYjs({ roomId, editor, username, cursorColor }: UseYjsOptions) {
  const stateRef = useRef<YjsState>({
    doc: null,
    provider: null,
    binding: null,
  });

  const cleanup = useCallback(() => {
    const state = stateRef.current;
    if (state.binding) {
      state.binding.destroy();
      state.binding = null;
    }
    if (state.provider) {
      state.provider.disconnect();
      state.provider.destroy();
      state.provider = null;
    }
    if (state.doc) {
      state.doc.destroy();
      state.doc = null;
    }
  }, []);

  useEffect(() => {
    if (!editor || !roomId) return;

    // Cleanup previous instance
    cleanup();

    // Create new Y.Doc
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(YJS_URL, roomId, doc, {
      connect: true,
    });

    // Set awareness (cursor info)
    provider.awareness.setLocalStateField('user', {
      name: username,
      color: cursorColor,
    });

    // Get the shared text type
    const yText = doc.getText('monaco');

    // Create Monaco binding
    const model = editor.getModel();
    if (model) {
      const binding = new MonacoBinding(
        yText,
        model,
        new Set([editor]),
        provider.awareness
      );
      stateRef.current.binding = binding;
    }

    stateRef.current.doc = doc;
    stateRef.current.provider = provider;

    // Connection status logging
    provider.on('status', (event: { status: string }) => {
      console.log('YJS connection status:', event.status);
    });

    return cleanup;
  }, [roomId, editor, username, cursorColor, cleanup]);

  return stateRef.current;
}
