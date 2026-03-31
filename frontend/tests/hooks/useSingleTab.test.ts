import { renderHook, act } from '@testing-library/react';
import { useSingleTab } from '@/hooks/useSingleTab';

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  readonly name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = jest.fn((_: string): void => undefined);
  close = jest.fn((): void => undefined);

  constructor(name: string) {
	this.name = name;
	MockBroadcastChannel.instances.push(this);
  }

  emitMessage(data: string): void {
	const event = new MessageEvent('message', { data }) as unknown as MessageEvent;
	this.onmessage?.(event);
  }

  static reset(): void {
	MockBroadcastChannel.instances = [];
  }
}

describe('useSingleTab', () => {
  const originalBroadcastChannel = globalThis.BroadcastChannel;

  beforeEach(() => {
	MockBroadcastChannel.reset();
	Object.defineProperty(globalThis, 'BroadcastChannel', {
	  value: MockBroadcastChannel,
	  configurable: true,
	  writable: true,
	});
  });

  afterEach(() => {
	Object.defineProperty(globalThis, 'BroadcastChannel', {
	  value: originalBroadcastChannel,
	  configurable: true,
	  writable: true,
	});
  });

  it('initializes once, announces NEW_TAB, and starts as non-duplicate', () => {
	const { result, rerender } = renderHook(() => useSingleTab());

	expect(result.current).toBe(false);
	expect(MockBroadcastChannel.instances).toHaveLength(1);
	expect(MockBroadcastChannel.instances[0]?.name).toBe('red_tetris_tab_channel');
	expect(MockBroadcastChannel.instances[0]?.postMessage).toHaveBeenCalledWith('NEW_TAB');

	rerender();
	expect(MockBroadcastChannel.instances).toHaveLength(1);
  });

  it('responds with TAB_ALREADY_ACTIVE when receiving NEW_TAB', () => {
	renderHook(() => useSingleTab());
	const channel = MockBroadcastChannel.instances[0];

	expect(channel).toBeDefined();

	act(() => {
	  channel?.emitMessage('NEW_TAB');
	});

	expect(channel?.postMessage).toHaveBeenCalledWith('TAB_ALREADY_ACTIVE');
  });

  it('marks tab as duplicate when TAB_ALREADY_ACTIVE is received', () => {
	const { result } = renderHook(() => useSingleTab());
	const channel = MockBroadcastChannel.instances[0];

	expect(result.current).toBe(false);

	act(() => {
	  channel?.emitMessage('TAB_ALREADY_ACTIVE');
	});

	expect(result.current).toBe(true);
  });

  it('ignores unrelated messages', () => {
	const { result } = renderHook(() => useSingleTab());
	const channel = MockBroadcastChannel.instances[0];

	act(() => {
	  channel?.emitMessage('IGNORED_MESSAGE');
	});

	expect(result.current).toBe(false);
  });

  it('closes the channel on unmount', () => {
	const { unmount } = renderHook(() => useSingleTab());
	const channel = MockBroadcastChannel.instances[0];

	unmount();

	expect(channel?.close).toHaveBeenCalledTimes(1);
  });
});
