# Chrome Web Store listing — ProxyVPN

Copy/paste values for the Developer Dashboard.

## Store listing

**Name** (max 45)

```
ProxyVPN — Proxy Profile Switcher
```

**Short description** (max 132)

```
Save named HTTP, HTTPS and SOCKS proxies and toggle them on and off in one click — a lightweight VPN-style switch for Chrome.
```

**Category:** Productivity → also fits Developer Tools
**Language:** English

**Detailed description**

```
ProxyVPN turns Chrome's proxy settings into a simple on/off switch.

Save the proxy servers you use — HTTP, HTTPS, SOCKS4 or SOCKS5 — give each one a
name, and switch between them in a single click. Toggle the master switch on and
Chrome routes through your proxy; toggle it off and you're back to a direct
connection. It behaves like a VPN switch, because that's how it should feel.

WHY PEOPLE USE IT
  • One-click switching between named proxy profiles
  • Works with HTTP, HTTPS, SOCKS4 and SOCKS5 proxies
  • Optional username/password authentication, handled automatically
  • Per-profile bypass list (localhost, *.internal, and anything else you add)
  • Live "Check exit IP" and latency so you can confirm it's really working
  • Search to find a profile fast when you have lots of them
  • Auto-connect on startup so your proxy comes back with Chrome
  • Toolbar badge shows ON at a glance

PRIVATE BY DESIGN
  • No account, no sign-in
  • No analytics, no telemetry, no tracking
  • No remote code — the extension ships exactly what you review
  • Profiles and credentials are stored locally in Chrome, on your machine,
    and are never transmitted anywhere by the extension

NOTE: "Check exit IP" makes a request to api.ipify.org to read your public IP.
It only runs when you click the button, and nothing else is sent.

ProxyVPN only changes Chrome's proxy settings. Other applications and your
operating system keep their own network configuration.

Use only with proxies and networks you are authorised to use.
```

## Graphic assets

| Asset | Requirement | File |
|---|---|---|
| Store icon | 128×128 PNG | `icons/icon128.png` |
| Screenshot 1 | 1280×800 PNG | `dev/store/store-1-connect.png` |
| Screenshot 2 | 1280×800 PNG | `dev/store/store-2-profiles.png` |
| Screenshot 3 | 1280×800 PNG | `dev/store/store-3-privacy.png` |

Regenerate screenshots after UI changes with:

```powershell
powershell -ExecutionPolicy Bypass -File .\dev\store\make-store-shots.ps1
```

## Privacy practices (Dashboard → Privacy)

**Single purpose**

```
Switch Chrome's proxy settings between proxy profiles that the user saves.
```

**Justify each permission**

```
proxy — Required. The extension's single purpose is to change Chrome's proxy
configuration; chrome.proxy is how the selected profile is applied.

storage — Required. Stores the user's proxy profiles, the active selection and
preferences locally in the browser so they persist between sessions.

webRequest + webRequestAuthProvider — Required. Used only to answer proxy
authentication challenges (HTTP 407) with the username and password the user
saved for that proxy. No request content is read or modified.

<all_urls> host permission — Required by webRequest in order to handle proxy
authentication for any host. The extension does not read, collect or modify page
content.
```

**Are you using remote code?** No.

**What user data do you collect?** None. The extension does not collect or
transmit user data. Proxy profiles and credentials stay in `chrome.storage.local`
on the user's device.

**Data disclosures** — none of the "personal communications / health / financial
/ authentication / personal communications / location / web history / user
activity / website content" boxes apply.

## Publishing checklist

- [ ] Version in `manifest.json` bumped
- [ ] `node dev/make-preview.mjs` run (preview in sync)
- [ ] Screenshots regenerated
- [ ] ZIP contains only: `manifest.json`, `background.js`, `popup.html`,
      `popup.css`, `popup.js`, `icons/`
- [ ] Privacy policy URL = the `PRIVACY.md` in the public repo
- [ ] Test a fresh "Load unpacked" install once
