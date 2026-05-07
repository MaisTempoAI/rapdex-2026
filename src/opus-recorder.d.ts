declare module 'opus-recorder' {
  interface RecorderConfig {
    encoderPath?: string;
    encoderApplication?: number;
    encoderSampleRate?: number;
    encoderBitRate?: number;
    streamPages?: boolean;
    numberOfChannels?: number;
  }
  class Recorder {
    constructor(config?: RecorderConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    close(): Promise<void>;
    ondataavailable: (data: Uint8Array) => void;
    onstop: () => void;
  }
  export default Recorder;
}

declare module 'opus-recorder/dist/encoderWorker.min.js?url' {
  const url: string;
  export default url;
}
