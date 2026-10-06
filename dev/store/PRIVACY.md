# ProxyVPN — Privacy Policy

_Last updated: 6 October 2026_

ProxyVPN is a Chrome extension that switches Chrome's proxy settings between
profiles you save. This policy explains exactly what the extension does with
data — the short version is: **it stores your settings on your own device and
sends nothing to us.**

## What we collect

**Nothing.** ProxyVPN has no servers, no accounts, no analytics and no
telemetry. We do not collect, receive, sell or share any personal data.

## What is stored, and where

The extension stores the following **locally on your device**, using Chrome's
`chrome.storage.local` API:

- the proxy profiles you create (name, type, host, port);
- the username and password you optionally enter for a proxy;
- which profile is active, whether the switch is on, and your preferences.

This data never leaves your device through the extension. It is stored
unencrypted in your Chrome profile, which means anyone with access to your
computer's file system could read it. Use a dedicated proxy account if that
matters to you.

## Network requests

The extension itself makes **one** optional network request:

- **Check exit IP** — when you click the button, the extension requests
  `https://api.ipify.org?format=json`, which returns your current public IP
  address. This is used only to display the IP in the popup. It runs only on
  click, and only your IP is exchanged (as with any web request).

Apart from that, the extension does not contact any server. Your browsing
traffic follows the proxy configuration you set, exactly as Chrome would
normally route it.

## Permissions

| Permission | Why it is needed |
|---|---|
| `proxy` | To apply the proxy profile you selected to Chrome. |
| `storage` | To save your profiles and preferences locally. |
| `webRequest` + `webRequestAuthProvider` | To answer proxy authentication (HTTP 407) with the credentials you saved. |
| `<all_urls>` | Required by `webRequest` so proxy authentication can be handled for any host. Page content is never read or modified. |

## Third parties

We share no data with third parties, because we receive none. The only external
service the extension talks to is `api.ipify.org`, and only when you click
"Check exit IP".

## Children's privacy

The extension is not directed at children and collects no data from anyone.

## Changes

Any change to this policy will be published in this file in the public
repository, with an updated date above.

## Contact

Questions or concerns: open an issue at
https://github.com/arpitsingh404/proxyvpn/issues

---

_ProxyVPN only changes Chrome's proxy settings. Other applications and your
operating system keep their own network configuration._
