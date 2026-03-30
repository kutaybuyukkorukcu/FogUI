import {
  fogUIResponseSchema,
  fogUIStreamErrorSchema,
  fogUIStreamUsageSchema,
} from '../types/schema.zod';
import type {
  FogUIResponse,
  StreamDoneEvent,
  StreamErrorEvent,
  StreamEvent,
  StreamResultEvent,
  StreamUsageEvent,
} from '../types';

export interface SseFrame {
  readonly event: string;
  readonly data: string;
}

type SupportedEventType = StreamEvent['type'];

function parseJsonPayload(data: string): unknown {
  return JSON.parse(data);
}

function isSupportedEventType(value: string): value is SupportedEventType {
  return value === 'done' || value === 'error' || value === 'result' || value === 'usage';
}

function toResultEvents(frame: SseFrame): StreamEvent[] {
  try {
    const parsed = parseJsonPayload(frame.data);
    const validation = fogUIResponseSchema.safeParse(parsed);

    if (!validation.success) {
      return [{ type: 'error', data: { error: 'Stream validation failed', issues: validation.error.issues } }];
    }

    const event: StreamResultEvent = { type: 'result', data: validation.data as FogUIResponse };
    return [event];
  } catch {
    return [{ type: 'error', data: { error: 'Stream result payload could not be parsed' } }];
  }
}

function toUsageEvents(frame: SseFrame): StreamEvent[] {
  try {
    const parsed = parseJsonPayload(frame.data);
    const validation = fogUIStreamUsageSchema.safeParse(parsed);
    return validation.success
      ? [{ type: 'usage', data: validation.data as StreamUsageEvent['data'] }]
      : [];
  } catch {
    return [];
  }
}

function toErrorEvents(frame: SseFrame): StreamEvent[] {
  try {
    const parsed = parseJsonPayload(frame.data);
    const validation = fogUIStreamErrorSchema.safeParse(parsed);
    if (validation.success) {
      return [{ type: 'error', data: validation.data as StreamErrorEvent['data'] }];
    }

    return [{ type: 'error', data: { error: 'Stream processing failed', details: parsed } }];
  } catch {
    return [{ type: 'error', data: { error: 'Stream processing failed' } }];
  }
}

export function parseSseFrames(chunkBuffer: string): { frames: SseFrame[]; remainder: string } {
  const rawFrames = chunkBuffer.split('\n\n');
  const remainder = rawFrames.pop() ?? '';

  const frames = rawFrames
    .map((rawFrame): SseFrame | null => {
      const lines = rawFrame
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        return null;
      }

      let event = 'message';
      const dataParts: string[] = [];

      for (const line of lines) {
        if (line.startsWith('event:')) {
          event = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataParts.push(line.slice(5).trim());
        }
      }

      return {
        event,
        data: dataParts.join('\n'),
      };
    })
    .filter((frame): frame is SseFrame => frame !== null);

  return { frames, remainder };
}

export function toStreamEvents(frame: SseFrame): StreamEvent[] {
  if (frame.data === '[DONE]' || frame.event === 'done') {
    const doneEvent: StreamDoneEvent = { type: 'done', data: null };
    return [doneEvent];
  }

  if (!isSupportedEventType(frame.event) || frame.data.length === 0) {
    return [];
  }

  switch (frame.event) {
    case 'error':
      return toErrorEvents(frame);
    case 'result':
      return toResultEvents(frame);
    case 'usage':
      return toUsageEvents(frame);
    default:
      return [];
  }
}

function parseBufferedEvents(buffer: string): { events: StreamEvent[]; remainder: string } {
  const parsed = parseSseFrames(buffer);
  return {
    events: parsed.frames.flatMap((frame) => toStreamEvents(frame)),
    remainder: parsed.remainder,
  };
}

export async function* readSseResponse(response: Response): AsyncGenerator<StreamEvent> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parsed = parseBufferedEvents(buffer);
    buffer = parsed.remainder;

    for (const event of parsed.events) {
      yield event;
    }
  }

  if (buffer.trim().length > 0) {
    const parsed = parseBufferedEvents(`${buffer}\n\n`);
    for (const event of parsed.events) {
      yield event;
    }
  }
}