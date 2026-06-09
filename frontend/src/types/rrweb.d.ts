declare module 'rrweb' {
  export function record(options: {
    emit: (event: unknown) => void
    sampling?: { mousemove?: number; scroll?: number; input?: string }
    maskInputOptions?: { password?: boolean }
  }): (() => void) | undefined
}
