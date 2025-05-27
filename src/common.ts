import type * as http from "node:http";
import type * as stream from "node:stream";
import type {MinPriorityQueue} from "@datastructures-js/priority-queue";
import type * as net from "node:net";
import * as readline from "node:readline";

export type UUID = `${string}-${string}-${string}-${string}-${string}`;

interface BaseData {
  id: UUID;
  order: number;
  type: string;
  direction: "outgoing" | "incoming";
}

export type OutgoingData = BaseData & {
  direction: "outgoing";
} & ({
  type: "connect";
  ssl: false;
  url: string;
  method: string;
  headers: http.OutgoingHttpHeaders | readonly string[];
} | {
  type: "connect";
  ssl: true;
  url: string;
  data: string;
} | {
  type: "data";
  ssl: boolean;
  data: string;
} | {
  type: "close";
  ssl: boolean;
} | {
  type: "error";
  ssl: boolean;
});

/**
 * Serializes outgoing data, currently just `JSON.stringify`
 * @param data
 */
export function serializeOutgoingData(data: OutgoingData): string {
  return JSON.stringify(data);
}

/**
 * Deserializes outgoing data, currently just `JSON.parse`
 * @param str
 */
export function deserializeOutgoingData(str: string): OutgoingData {
  return JSON.parse(str);
}

export type IncomingData = BaseData & {
  direction: "incoming";
} & ({
  type: "connect";
  ssl: boolean;
  statusCode?: number;
  headers?: http.IncomingHttpHeaders;
} | {
  type: "data";
  data: string;
} | {
  type: "close";
} | {
  type: "error";
});

/**
 * Serializes incoming data, currently just `JSON.stringify`
 * @param data
 */
export function serializeIncomingData(data: IncomingData): string {
  return JSON.stringify(data);
}

/**
 * Deserializes outgoing data, currently just `JSON.parse`
 * @param str
 */
export function deserializeIncomingData(str: string): IncomingData {
  return JSON.parse(str);
}

const regex_hostport = /^([^:]+)(:([0-9]+))?$/;

/**
 * Gets host and port from host string
 * @param hostString
 * @param defaultPort
 */
export function getHostPortFromString(hostString: string, defaultPort: number): [string, number] {
  let host = hostString;
  let port = defaultPort;

  const result = regex_hostport.exec(hostString);
  if (result != null) {
    host = result[1];
    if (result[2] != null) {
      port = parseInt(result[3]);
    }
  }

  return [host, port];
}

interface BaseRecord {
  ssl: boolean;
  pipe: stream.Stream.Writable;
  sendCount: number;
  receiveCount: number;
  queue: MinPriorityQueue<BaseData>;
}

export type ClientRecord = BaseRecord & ({
  ssl: false;
  pipe: http.ServerResponse<http.IncomingMessage>;
  queue: MinPriorityQueue<IncomingData>;
} | {
  ssl: true;
  pipe: stream.Duplex;
  queue: MinPriorityQueue<IncomingData>;
});

export type ServerRecord = BaseRecord & ({
  ssl: false;
  pipe: http.ClientRequest;
  queue: MinPriorityQueue<OutgoingData>;
} | {
  ssl: true;
  pipe: net.Socket;
  queue: MinPriorityQueue<OutgoingData>;
});

const rl = readline.createInterface({input: process.stdin, output: process.stdout});

/**
 * Creates a prompt for a value in the console
 * @param text
 */
export function question(text: string): Promise<string> {
  return new Promise<string>((resolve) => rl.question(text, resolve));
}
