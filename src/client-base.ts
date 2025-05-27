import {ClientRecord, IncomingData, OutgoingData, serializeOutgoingData, UUID} from "./common";
import * as http from "node:http";
import {MinPriorityQueue} from "@datastructures-js/priority-queue";
import * as base85 from "base85";

/**
 * Creates an incoming data handler (a.k.a. client)
 * @param postMessage A function for posting messages
 * @param chunkSize Size of each chunk for subdividing packets, packets are not subdivided by default
 */
export default function createIncomingDataHandler(postMessage: (message: string) => void | Promise<void>, chunkSize?: number): (data: IncomingData) => void {
  const clientRecords: Record<UUID, ClientRecord> = {};

  const server = http.createServer((client_req, client_res) => {
    console.log("Proxy HTTP request for: %s", client_req.url);

    const id = crypto.randomUUID();

    const record = clientRecords[id] = {
      ssl: false,
      pipe: client_res,
      sendCount: 0,
      receiveCount: 0,
      queue: new MinPriorityQueue<IncomingData>(data => data.order)
    };

    postMessage(serializeOutgoingData({
      id: id,
      direction: "outgoing",
      type: "connect",
      order: record.sendCount++,
      ssl: false,
      url: client_req.url ?? "",
      method: client_req.method ?? "GET",
      headers: client_req.headers
    }));

    client_req.on("data", chunkSize ? (buf: Buffer<ArrayBuffer>) => {
      const sendCount = record.sendCount;
      const messageCount = Math.ceil(buf.length / chunkSize);
      record.sendCount += messageCount;
      for (let i = 0, j = 0; i < messageCount; i++, j += chunkSize) {
        postMessage(serializeOutgoingData({
          id: id,
          direction: "outgoing",
          order: sendCount + i,
          type: "data",
          ssl: false,
          data: base85.encode(buf.subarray(j, j + chunkSize), "z85pad" as "z85")
        }));
      }
    } : (buf: Buffer<ArrayBuffer>) => postMessage(serializeOutgoingData({
      id: id,
      direction: "outgoing",
      order: record.sendCount++,
      type: "data",
      ssl: false,
      data: base85.encode(buf, "z85pad" as "z85")
    })));
    client_req.on("close", () => postMessage(serializeOutgoingData({
      id: id,
      direction: "outgoing",
      order: record.sendCount++,
      type: "close",
      ssl: false
    })));
    client_req.on("error", () => postMessage(serializeOutgoingData({
      id: id,
      direction: "outgoing",
      order: record.sendCount++,
      type: "error",
      ssl: false
    })));
  });

  server.on("connect", (client_req, duplex, bodyhead) => {
    console.log("Proxying HTTPS request for: %s", client_req.url);

    const id = crypto.randomUUID();
    const record = clientRecords[id] = {
      ssl: true,
      pipe: duplex,
      sendCount: 0,
      receiveCount: 0,
      queue: new MinPriorityQueue<IncomingData>(data => data.order)
    };

    postMessage(serializeOutgoingData({
      id: id,
      direction: "outgoing",
      type: "connect",
      order: record.sendCount++,
      ssl: true,
      url: client_req.url ?? "",
      data: base85.encode(bodyhead, "z85pad" as "z85")
    }));

    duplex.on("data", chunkSize ? (buf: Buffer<ArrayBuffer>) => {
      const sendCount = record.sendCount;
      const messageCount = Math.ceil(buf.length / chunkSize);
      record.sendCount += messageCount;
      for (let i = 0, j = 0; i < messageCount; i++, j += chunkSize) {
        postMessage(serializeOutgoingData({
          id: id,
          direction: "outgoing",
          order: sendCount + i,
          type: "data",
          ssl: true,
          data: base85.encode(buf.subarray(j, j + chunkSize), "z85pad" as "z85")
        }));
      }
    } : (buf: Buffer<ArrayBuffer>) => postMessage(serializeOutgoingData({
      id: id,
      direction: "outgoing",
      order: record.sendCount++,
      type: "data",
      ssl: true,
      data: base85.encode(buf, "z85pad" as "z85")
    })));
    duplex.on("close", () => postMessage(serializeOutgoingData({
      id: id,
      direction: "outgoing",
      order: record.sendCount++,
      type: "close",
      ssl: true
    })));
    duplex.on("error", () => postMessage(serializeOutgoingData({
      id: id,
      direction: "outgoing",
      order: record.sendCount++,
      type: "error",
      ssl: true
    })));
  });

  server.listen(12345);

  return function incomingDataHandler(data: IncomingData | OutgoingData) {
    if (data.direction === "incoming") {
      const record = clientRecords[data.id];
      if (record) {
        record.queue.enqueue(data);
        while ((record.queue.front()?.order ?? Infinity) == record.receiveCount) {
          data = record.queue.dequeue() as IncomingData;
          record.receiveCount++;
          switch (data.type) {
            case "connect":
              if (record.ssl) {
                record.pipe.write("HTTP/1.1 200 Connection established\r\n\r\n");
              } else {
                (record.pipe as http.ServerResponse<http.IncomingMessage>).writeHead(data.statusCode ?? 200, data.headers ?? []);
              }
              break;
            case "data":
              record.pipe.write(base85.decode(data.data, "z85pad" as "z85"));
              break;
            case "close":
              record.pipe.end();
              delete clientRecords[data.id];
              break;
            case "error":
              if (record.ssl) {
                record.pipe.write("HTTP/1.1 500 Connection error\r\n\r\n");
              }
              record.pipe.end();
              break;
          }
        }
      }
    }
  }
}
