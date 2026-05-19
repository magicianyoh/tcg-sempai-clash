import { WS_EVENTS } from '../../../../../packages/shared/constants';

type Handler = (data: any) => void;

export class NetworkSystem {
    private ws: WebSocket | null = null;
    private handlers: Map<string, Handler[]> = new Map();

    connect(url: string) {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('Connected to Game Server');
            this.emit('CONNECTED', {});
        };

        this.ws.onmessage = (msg) => {
            const payload = JSON.parse(msg.data);
            this.emitLocal(payload.event, payload.data);
        };
    }

    send(event: string, data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ event, data }));
        }
    }

    findMatch() {
        this.send(WS_EVENTS.JOIN_LOBBY, { userId: 'player-' + Math.random() }); // Mock ID
        this.send('FIND_MATCH', {});
    }

    // Subscribe to network events
    on(event: string, handler: Handler) {
        if (!this.handlers.has(event)) this.handlers.set(event, []);
        this.handlers.get(event)?.push(handler);
    }

    // Internal emit
    private emitLocal(event: string, data: any) {
        this.handlers.get(event)?.forEach(fn => fn(data));
    }

    // Emit purely local events
    emit(event: string, data: any) {
        this.emitLocal(event, data);
    }
}
