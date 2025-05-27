import {Boom} from "@hapi/boom";
import NodeCache from "@cacheable/node-cache";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  useMultiFileAuthState,
  WAMessageContent,
  WAMessageKey
} from "@whiskeysockets/baileys";
import P from "pino";
import QRCode from "qrcode";

/**
 * Creates an adapter for the WhatsApp. A QR code is printed to the console for log in
 * @param createHandleData A function to create a data handler
 * @param sendJid The jid of the chat to send to, could be the same as `receiveJid`
 * @param receiveJid The jid of the chat to listen from, could be the same as `sendJid`
 * @param authDir The directory to store auth data
 * @param logfile The path to the log file
 */
export default async function createWhatsappAdapter(
    createHandleData: (postMessage: (message: string) => Promise<void>) => ((str: string) => void),
    sendJid: string,
    receiveJid: string,
    authDir: string = `${process.env.HOME}/.http-over-text/whatsapp/baileys_auth_info`,
    logfile: string = `${process.env.HOME}/.http-over-text/whatsapp/wa-logs.txt`,
): Promise<void> {
  const logger = P({timestamp: () => `,"time":"${new Date().toJSON()}"`}, P.destination(logfile));
  logger.level = "trace";

  const msgRetryCounterCache = new NodeCache();

  let sock: ReturnType<typeof makeWASocket>;

  async function postMessage(message: string) {
    await sock.sendMessage(sendJid, {text: message});
  }

  const handleData = createHandleData(postMessage);

  async function getMessage(key: WAMessageKey): Promise<WAMessageContent | undefined> {
    // Implement a way to retreive messages that were upserted from messages.upsert
    // up to you

    // only if store is present
    return proto.Message.fromObject({});
  }

  async function startSock() {
    const {state, saveCreds} = await useMultiFileAuthState(authDir);
    // fetch latest version of WA Web
    const {version, isLatest} = await fetchLatestBaileysVersion();
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

    sock = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        /** caching makes the store faster to send/recv messages */
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      msgRetryCounterCache,
      generateHighQualityLinkPreview: true,
      // ignore all broadcast messages -- to receive the same
      // comment the line below out
      // shouldIgnoreJid: jid => isJidBroadcast(jid),
      // implement to handle retries & poll updates
      // getMessage,
      shouldIgnoreJid: jid => parseInt(jid) !== parseInt(receiveJid),
      shouldSyncHistoryMessage: () => false
    });

    // // Pairing code for Web clients
    // if (!sock.authState.creds.registered) {
    //   const code = await sock.requestPairingCode(num);
    //   console.log("Pairing code: %s", code);
    // }

    // the process function lets you process all events that just occurred
    // efficiently in a batch
    sock.ev.process(
        // events is a map for event name => event data
        async (events) => {
          // something about the connection changed
          // maybe it closed, or we received all offline message or connection opened
          if (events["connection.update"]) {
            const update = events["connection.update"];
            const {connection, lastDisconnect, qr} = update;
            if (qr) {
              // as an example, this prints the qr code to the terminal
              console.log(await QRCode.toString(qr, {
                type: "terminal",
                small: true
              }));
            }
            if (connection === "close") {
              // reconnect if not logged out
              if ((lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
                startSock();
              } else {
                console.log("Connection closed. You are logged out.");
              }
            }
          }

          // credentials updated -- save them
          if (events["creds.update"]) {
            await saveCreds();
          }

          // received a new message
          if (events["messages.upsert"]) {
            const upsert = events["messages.upsert"];
            console.log("recv messages %s", upsert);

            if (upsert?.type === "notify") {
              for (const msg of upsert.messages) {
                console.log(msg);
                if (/* !msg.key.fromMe && */ msg.key?.remoteJid! === receiveJid && (msg.message?.conversation || msg.message?.extendedTextMessage?.text)) {
                  handleData((msg.message?.conversation || msg.message?.extendedTextMessage?.text) ?? "");
                }
              }
            }
          }
        }
    );
  }

  await startSock();
}