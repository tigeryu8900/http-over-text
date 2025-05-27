import {Mutex} from "async-mutex";
import puppeteer from "puppeteer";

/**
 * Creates an adapter for Google Voice. You'll need to sign in with
 * Chrome first and then copy the user data directory.
 * @param createHandleData A function to create a data handler
 * @param num The number to send to and listen from. For the client, this is the server, and vice versa
 * @param userDataDir The user data directory used by Puppeteer
 */
export default async function createGoogleVoiceAdapter(
    createHandleData: (postMessage: (message: string) => Promise<void>) => ((str: string) => void),
    num: string,
    userDataDir: string = `${process.env.HOME}/.http-over-text/google-voice/userData`
): Promise<void> {
  const mutex = new Mutex();

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir,
  });

  const page = (await browser.pages())[0];

  function postMessage(message: string): Promise<void> {
    return mutex.runExclusive(() => page.evaluate((str: string) => {
      const textarea = document.querySelector<HTMLTextAreaElement>('div.message-input-container > textarea');
      const button = document.querySelector<HTMLButtonElement>('button[mattooltip="Send message"]');
      if (textarea && button) {
        textarea.value = str;
        textarea.dispatchEvent(new Event("input", {bubbles: false}));
        button.click();
      }
    }, message));
  }

  const handleData = createHandleData(postMessage);

  await page.goto(`https://voice.google.com/u/0/messages?itemId=${encodeURIComponent(`t.${num}`)}`, {
    waitUntil: 'networkidle2'
  });
  await page.exposeFunction("handleData", handleData);
  await page.evaluate(() => {
    new MutationObserver(mutationsList => {
      mutationsList.forEach(mutation => {
        for (const node of mutation.addedNodes) {
          const element = (node as Element).querySelector('div.message-row:not(.outgoing) > div.bubble > gv-annotation');
          if (element) {
            handleData(element.textContent as string);
          }
        }
      });
    }).observe(document.querySelector('div.messages-container > ul.list') as Node, {
      attributes: false,
      childList: true,
      subtree: false,
      characterData: false
    });
  });
}
