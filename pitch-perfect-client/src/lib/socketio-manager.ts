import { Evt } from "evt";
import { io, type Socket } from "socket.io-client";
import { v4 } from "uuid";

// Socket message types from ElizaOS core
enum SOCKET_MESSAGE_TYPE {
  ROOM_JOINING = 1,
  SEND_MESSAGE = 2,
  MESSAGE = 3,
  ACK = 4,
  THINKING = 5,
  CONTROL = 6,
}

// Direct connection to ElizaOS server for Socket.IO
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
const USER_NAME = "User";

console.log("[SocketIO] Using server URL:", SOCKET_URL);

// Enhanced types for ElizaOS Socket.IO events
export type MessageBroadcastData = {
  senderId: string;
  senderName: string;
  text: string;
  channelId: string;
  roomId?: string;
  createdAt: number;
  source: string;
  name: string;
  attachments?: any[];
  thought?: string;
  actions?: string[];
  prompt?: string;
  [key: string]: any;
};

export type MessageCompleteData = {
  channelId: string;
  roomId?: string;
  [key: string]: any;
};

export type ControlMessageData = {
  action: "enable_input" | "disable_input";
  target?: string;
  channelId: string;
  roomId?: string;
  [key: string]: any;
};

// Event adapter for Socket.IO events
class EventAdapter {
  private events: Record<string, Evt<any>> = {};

  constructor() {
    this.events.messageBroadcast = Evt.create<MessageBroadcastData>();
    this.events.messageComplete = Evt.create<MessageCompleteData>();
    this.events.controlMessage = Evt.create<ControlMessageData>();
  }

  on(eventName: string, listener: (...args: any[]) => void) {
    if (!this.events[eventName]) {
      this.events[eventName] = Evt.create();
    }
    this.events[eventName].attach(listener);
    return this;
  }

  off(eventName: string, listener: (...args: any[]) => void) {
    if (this.events[eventName]) {
      const handlers = this.events[eventName].getHandlers();
      for (const handler of handlers) {
        if (handler.callback === listener) {
          handler.detach();
        }
      }
    }
    return this;
  }

  emit(eventName: string, ...args: any[]) {
    if (this.events[eventName]) {
      this.events[eventName].post(args.length === 1 ? args[0] : args);
    }
    return this;
  }

  once(eventName: string, listener: (...args: any[]) => void) {
    if (!this.events[eventName]) {
      this.events[eventName] = Evt.create();
    }
    this.events[eventName].attachOnce(listener);
    return this;
  }

  listenerCount(eventName: string): number {
    if (!this.events[eventName]) return 0;
    return this.events[eventName].getHandlers().length;
  }

  _getEvt(eventName: string): Evt<any> | undefined {
    return this.events[eventName];
  }
}

/**
 * SocketIOManager handles real-time communication with ElizaOS server
 */
class SocketIOManager extends EventAdapter {
  private static instance: SocketIOManager | null = null;
  private socket: Socket | null = null;
  private isConnected = false;
  private connectPromise: Promise<void> | null = null;
  private resolveConnect: (() => void) | null = null;
  private activeChannels: Set<string> = new Set();
  private activeSessionChannelId: string | null = null; // Current session for message filtering
  private entityId: string | null = null;
  private serverId: string | null = null;

  public get evtMessageBroadcast() {
    return this._getEvt("messageBroadcast") as Evt<MessageBroadcastData>;
  }

  public get evtMessageComplete() {
    return this._getEvt("messageComplete") as Evt<MessageCompleteData>;
  }

  public get evtControlMessage() {
    return this._getEvt("controlMessage") as Evt<ControlMessageData>;
  }

  private constructor() {
    super();
  }

  public static getInstance(): SocketIOManager {
    if (!SocketIOManager.instance) {
      SocketIOManager.instance = new SocketIOManager();
    }
    return SocketIOManager.instance;
  }

  public initialize(entityId: string, serverId?: string): void {
    this.entityId = entityId;
    this.serverId = serverId || "00000000-0000-0000-0000-000000000000";

    console.log(
      "[SocketIO] Initializing with entity:",
      entityId,
      "server:",
      this.serverId,
    );

    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      timeout: 20000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("[SocketIO] Connected to server");
      this.isConnected = true;
      if (this.resolveConnect) {
        this.resolveConnect();
        this.resolveConnect = null;
      }
    });

    this.socket.on("disconnect", () => {
      console.log("[SocketIO] Disconnected from server");
      this.isConnected = false;
    });

    this.socket.on("messageBroadcast", (data: MessageBroadcastData) => {
      console.log("[SocketIO] Received message broadcast:", data);
      this.emit("messageBroadcast", data);
    });

    this.socket.on("messageComplete", (data: MessageCompleteData) => {
      console.log("[SocketIO] Message complete:", data);
      this.emit("messageComplete", data);
    });

    this.socket.on("controlMessage", (data: ControlMessageData) => {
      console.log("[SocketIO] Control message:", data);
      this.emit("controlMessage", data);
    });

    this.socket.on("connect_error", (error) => {
      console.error("[SocketIO] Connection error:", error);
      this.isConnected = false;
    });
  }

  public async joinChannel(
    channelId: string,
    serverId?: string,
  ): Promise<void> {
    if (!this.socket) {
      console.error("[SocketIO] Cannot join channel: socket not initialized");
      return;
    }

    if (!this.isConnected) {
      await this.connectPromise;
    }

    console.log(`[SocketIO] Joining channel: ${channelId}`);

    this.socket.emit("message", {
      type: SOCKET_MESSAGE_TYPE.ROOM_JOINING,
      payload: {
        entityId: this.entityId,
        channelId: channelId,
        serverId: serverId || this.serverId,
      },
    });

    this.activeChannels.add(channelId);
  }

  public async sendChannelMessage(
    message: string,
    channelId: string,
    source: string,
    sessionChannelId?: string,
    serverId?: string,
    attachments?: any[],
    metadata?: any,
  ): Promise<void> {
    if (!this.socket) {
      console.error(
        "[SocketIO] Cannot send channel message: socket not initialized",
      );
      return;
    }

    if (!this.isConnected) {
      await this.connectPromise;
    }

    const messageId = v4();
    const finalChannelId = sessionChannelId || channelId;

    console.info(`[SocketIO] Sending message to channel ${channelId}`);

    this.socket.emit("message", {
      type: SOCKET_MESSAGE_TYPE.SEND_MESSAGE,
      payload: {
        senderId: this.entityId,
        senderName: USER_NAME,
        message,
        channelId: finalChannelId,
        roomId: finalChannelId,
        serverId: serverId || this.serverId,
        messageId,
        source,
        attachments: attachments || [],
        metadata: metadata || {},
      },
    });

    // Broadcast locally for immediate UI update
    this.emit("messageBroadcast", {
      senderId: this.entityId || "",
      senderName: USER_NAME,
      text: message,
      channelId: finalChannelId,
      roomId: finalChannelId,
      createdAt: Date.now(),
      source,
      name: USER_NAME,
      attachments: attachments || [],
      metadata: metadata || {},
    });
  }

  public getActiveChannels(): Set<string> {
    return new Set(this.activeChannels);
  }

  public isSocketConnected(): boolean {
    return this.isConnected;
  }

  public getEntityId(): string | null {
    return this.entityId;
  }

  public getServerId(): string | null {
    return this.serverId;
  }

  /**
   * Set the active session channel ID for message filtering (following official client pattern)
   * @param sessionChannelId The session channel ID to filter messages by
   */
  public setActiveSessionChannelId(sessionChannelId: string): void {
    this.activeSessionChannelId = sessionChannelId;
    console.info(
      `[SocketIO] Active session channel set to: ${sessionChannelId}`,
    );
  }

  /**
   * Get the current active session channel ID
   */
  public getActiveSessionChannelId(): string | null {
    return this.activeSessionChannelId;
  }

  /**
   * Clear the active session channel ID
   */
  public clearActiveSessionChannelId(): void {
    this.activeSessionChannelId = null;
    console.info(`[SocketIO] Active session channel cleared`);
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.activeChannels.clear();
  }
}

export default SocketIOManager;
