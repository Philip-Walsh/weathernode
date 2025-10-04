import { Transform } from 'stream';
import Transport from 'winston-transport';

interface RingBufferTransportOptions {
    size?: number;
}

export class RingBufferTransport extends Transport {
    private buffer: any[] = [];
    private readonly size: number;

    constructor(options: RingBufferTransportOptions = {}) {
        super();
        this.size = options.size || 1000;
    }

    log(info: any, callback: Function) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        // Add to ring buffer
        this.buffer.push(info);

        // Remove oldest entries if buffer is full
        if (this.buffer.length > this.size) {
            this.buffer.shift();
        }

        callback();
    }

    getLogs(limit?: number): any[] {
        const count = limit || this.buffer.length;
        return this.buffer.slice(-count);
    }

    clearLogs(): void {
        this.buffer = [];
    }

    getLogCount(): number {
        return this.buffer.length;
    }
}

// Singleton instance for monitoring
export const ringBufferTransport = new RingBufferTransport({ size: 1000 });
