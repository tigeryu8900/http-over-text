import {
  getHostPortFromString,
  IncomingData,
  OutgoingData,
  serializeIncomingData,
  ServerRecord,
  UUID
} from "./common";
import * as net from "node:net";
import {MinPriorityQueue} from "@datastructures-js/priority-queue";
import * as http from "node:http";
import * as base85 from "base85";

/**
 * Creates an outgoing data handler (a.k.a. server)
 * @param postMessage A function for posting messages
 * @param chunkSize Size of each chunk for subdividing packets, packets are not subdivided by default
 */
export default function createOutgoingDataHandler(postMessage: (message: string) => void | Promise<void>, chunkSize?: number): (data: OutgoingData) => void {
  const serverRecords: Record<UUID, ServerRecord> = {};

  return function outgoingDataHandler(data: IncomingData | OutgoingData) {
    if (data.direction === "outgoing") {
      const record = serverRecords[data.id] ??= {
        ssl: true,
        pipe: new net.Socket(),
        sendCount: 0,
        receiveCount: 0,
        queue: new MinPriorityQueue<OutgoingData>(data => data.order)
      };
      record.queue.enqueue(data);
      while ((record.queue.front()?.order ?? Infinity) == record.receiveCount) {
        const data = record.queue.dequeue() as OutgoingData;
        record.receiveCount++;
        switch (data.type) {
          case "connect":
            if (data.ssl) {
              const [domain, port] = getHostPortFromString(data.url, 443);
              (record.pipe as net.Socket).connect(port, domain, () => {
                record.pipe.write(base85.decode(data.data, "z85pad" as "z85") || Buffer.from(""));
                postMessage(serializeIncomingData({
                  id: data.id,
                  direction: "incoming",
                  order: record.sendCount++,
                  type: "connect",
                  ssl: true
                }));
              });
              record.pipe.on("data", chunkSize ? (buf: Buffer<ArrayBuffer>) => {
                const sendCount = record.sendCount;
                const messageCount = Math.ceil(buf.length / chunkSize);
                record.sendCount += messageCount;
                for (let i = 0, j = 0; i < messageCount; i++, j += chunkSize) {
                  postMessage(serializeIncomingData({
                    id: data.id,
                    direction: "incoming",
                    order: sendCount + i,
                    type: "data",
                    data: base85.encode(buf.subarray(j, j + chunkSize), "z85pad" as "z85")
                  }));
                }
              } : (buf: Buffer<ArrayBuffer>) => postMessage(serializeIncomingData({
                id: data.id,
                direction: "incoming",
                order: record.sendCount++,
                type: "data",
                data: base85.encode(buf, "z85pad" as "z85")
              })));
              record.pipe.on("close", () => postMessage(serializeIncomingData({
                id: data.id,
                direction: "incoming",
                order: record.sendCount++,
                type: "close"
              })));
              record.pipe.on("error", () => postMessage(serializeIncomingData({
                id: data.id,
                direction: "incoming",
                order: record.sendCount++,
                type: "error"
              })));
            } else {
              const urlObj = new URL(data.url);
              record.ssl = false;
              record.pipe = http.request({
                hostname: urlObj.hostname,
                port: urlObj.port ?? 80,
                path: urlObj.pathname,
                method: (data as any).method,
                headers: (data as any).headers
              }, (res) => {
                postMessage(serializeIncomingData({
                  id: data.id,
                  direction: "incoming",
                  type: "connect",
                  order: record.sendCount++,
                  ssl: false,
                  statusCode: res.statusCode ?? 20,
                  headers: res.headers
                }));
                res.on("data", chunkSize ? (buf: Buffer<ArrayBuffer>) => {
                  const sendCount = record.sendCount;
                  const messageCount = Math.ceil(buf.length / chunkSize);
                  record.sendCount += messageCount;
                  for (let i = 0, j = 0; i < messageCount; i++, j += chunkSize) {
                    postMessage(serializeIncomingData({
                      id: data.id,
                      direction: "incoming",
                      order: sendCount + i,
                      type: "data",
                      data: base85.encode(buf.subarray(j, j + chunkSize), "z85pad" as "z85")
                    }));
                  }
                } : (buf: Buffer<ArrayBuffer>) => postMessage(serializeIncomingData({
                  id: data.id,
                  direction: "incoming",
                  order: record.sendCount++,
                  type: "data",
                  data: base85.encode(buf, "z85pad" as "z85")
                })));
                res.on("close", () => postMessage(serializeIncomingData({
                  id: data.id,
                  direction: "incoming",
                  order: record.sendCount++,
                  type: "close"
                })));
                res.on("error", () => postMessage(serializeIncomingData({
                  id: data.id,
                  direction: "incoming",
                  order: record.sendCount++,
                  type: "error"
                })));
              });
            }
            break;
          case "data":
            record.pipe.write(base85.decode(data.data, "z85pad" as "z85") || Buffer.from(""));
            break;
          case "close":
            record.pipe.end();
            delete serverRecords[data.id];
            break;
          case "error":
            record.pipe.end();
            break;
        }
      }
    }
  }
}
