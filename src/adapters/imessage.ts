import * as imessage from 'better-osa-imessage';
import {Mutex} from "async-mutex";

/**
 * Creates an adapter for the Messages app on macOS. The chat being used must be open, or we can't
 * get the message text.
 * @param createHandleData A function to create a data handler
 * @param num The number to send to and listen from. For the client, this is the server, and vice versa
 */
export default function createImessageAdapter(
    createHandleData: (postMessage: (message: string) => Promise<void>) => ((str: string) => void),
    num: string
): void {
  const mutex = new Mutex();

  function postMessage(message: string): Promise<void> {
    return mutex.runExclusive(() => imessage.send(num, message));
  }

  const handleData = createHandleData(postMessage);

  imessage.listen().on("message", msg => {
    if (msg.handle === num && !msg.fromMe) {
      handleData(msg.text);
    }
  });
}
