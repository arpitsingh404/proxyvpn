/*
 * Generates dev/preview.html from the real popup.html + popup.css + popup.js,
 * injecting dev/preview-mock.js so the popup runs in a plain browser tab.
 *
 * This keeps the preview from drifting out of sync with the actual UI.
 *
 *   node dev/make-preview.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const popupHtml = fs.readFileSync(path.join(root, "popup.html"), "utf8");
const mock = fs.readFileSync(path.join(here, "preview-mock.js"), "utf8");

const bodyMatch = popupHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (!bodyMatch) throw new Error("Could not find <body> in popup.html");

// Strip the real popup.js script tag from the copied markup.
const popupBody = bodyMatch[1].replace(/\s*<script src="popup\.js"><\/script>\s*/i, "\n");

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ProxyVPN — UI preview</title>
    <link rel="stylesheet" href="../popup.css" />
    <style>
      /* Preview harness only — shows the 380px popup on a desktop backdrop. */
      body {
        width: auto !important;
        min-height: 100vh;
        background: radial-gradient(900px 480px at 50% -10%, #16233d, #060911 65%);
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 26px 16px 42px;
        gap: 14px;
      }
      .preview-note {
        max-width: 420px;
        margin: 0;
        text-align: center;
        color: #7c8bab;
        font: 12px/1.6 "Segoe UI", system-ui, sans-serif;
      }
      .preview-note strong {
        color: #e8eefc;
      }
      .preview-note code {
        color: #93c5fd;
        font-size: 11px;
      }
      .frame {
        width: 380px;
        border: 1px solid #1e2a44;
        border-radius: 16px;
        overflow: hidden;
        background: #070b14;
        box-shadow: 0 26px 70px rgba(0, 0, 0, 0.6);
      }
      .frame-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 9px 11px;
        background: #0b1324;
        border-bottom: 1px solid #1e2a44;
      }
      .frame-bar i {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .frame-bar i.r { background: #ef4444; }
      .frame-bar i.y { background: #f59e0b; }
      .frame-bar i.g { background: #10b981; }
      .frame-bar span {
        margin-left: 6px;
        color: #56658a;
        font: 11px "Segoe UI", system-ui, sans-serif;
      }
    </style>
  </head>
  <body>
    <p class="preview-note">
      <strong>ProxyVPN — live UI preview.</strong><br />
      Same <code>popup.html</code>, <code>popup.css</code> and <code>popup.js</code>
      as the extension, with a mocked <code>chrome.*</code> API and sample
      profiles. Safe to click around — nothing is installed or changed.
    </p>

    <div class="frame">
      <div class="frame-bar">
        <i class="r"></i><i class="y"></i><i class="g"></i>
        <span>chrome-extension://proxyvpn/popup.html</span>
      </div>
      <div class="frame-body">
${popupBody.replace(/^/gm, "        ").trimEnd()}
      </div>
    </div>

    <script>
${mock.replace(/^/gm, "      ").trimEnd()}
    </script>
    <script src="../popup.js"></script>
  </body>
</html>
`;

const out = path.join(here, "preview.html");
fs.writeFileSync(out, html);
console.log("wrote", out, "(" + html.length + " bytes)");
