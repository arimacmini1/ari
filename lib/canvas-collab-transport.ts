export interface CollabTransport {
  postMessage: (message: unknown) => void
  setOnMessage: (handler: ((message: unknown) => void) | null) => void
  close: () => void
}

class BroadcastChannelTransport implements CollabTransport {
  private readonly channel: BroadcastChannel

  constructor(name: string) {
    this.channel = new BroadcastChannel(name)
  }

  postMessage(message: unknown) {
    this.channel.postMessage(message)
  }

  setOnMessage(handler: ((message: unknown) => void) | null) {
    this.channel.onmessage = handler
      ? ((event: MessageEvent<unknown>) => {
          handler(event.data)
        })
      : null
  }

  close() {
    this.channel.close()
  }
}

class NoopTransport implements CollabTransport {
  postMessage(_message: unknown) {
    // Intentionally empty: allows collaboration hook to run without runtime transport support.
  }

  setOnMessage(_handler: ((message: unknown) => void) | null) {
    // Intentionally empty.
  }

  close() {
    // Intentionally empty.
  }
}

export function createCanvasCollabTransport(channelName: string): CollabTransport {
  if (typeof window === "undefined") return new NoopTransport()
  if (typeof BroadcastChannel === "undefined") return new NoopTransport()
  return new BroadcastChannelTransport(channelName)
}
