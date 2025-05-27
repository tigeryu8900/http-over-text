declare module "better-osa-imessage" {
  import {EventEmitter} from "node:events";

  export interface Chat {
    id: `${'SMS' | 'iMessage'};-;${string}`;
    recipientId: string;
    serviceName: 'SMS' | 'iMessage';
    roomName?: string;
    displayName?: string;
  }

  export interface Message {
    guid: `${string}-${string}-${string}-${string}-${string}`;
    text: string;
    handle: string;
    group?: null;
    fromMe: boolean;
    date: Date;
    dateRead?: Date;
    file?: string,
    fileType?: string;
  }

  export function send(handle: string, message: string): Promise<void>;

  export function sendFile(handle: string, filepath: string): Promise<void>;

  export function listen(interval?: number): EventEmitter<{
    message: [Message];
  }>;

  export function handleForName(name: string): Promise<string>;

  export function nameForHandle(handle: string): Promise<string>;

  export function getRecentChats(limit?: number): Promise<Chat[]>;
}
