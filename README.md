# UiTM Sunday Studio

This is now a mobile-ready Progressive Web App (PWA). It keeps working offline after its first successful load and stores planner data in the browser. Google Sheets is an optional personal backup/sync layer.

## Use it on your phone — no app store needed

The best route is to put this folder on a simple HTTPS host such as **GitHub Pages**. Open that web address on your phone, then use **Add to Home Screen** (Safari) or **Install app** (Chrome). It will open like a normal standalone app, without publishing to the Play Store or App Store.

For temporary testing only, serve the folder from your laptop and open its LAN address on your phone. That needs your phone and laptop on the same Wi-Fi; it will not install as an offline PWA unless the address is HTTPS. For day-to-day use, GitHub Pages is the better choice.

## Connect a Google Sheet

1. Make a new, private Google Sheet and copy its ID from the URL (the part between `/d/` and `/edit`).
2. In that sheet choose **Extensions → Apps Script**.
3. Replace the default code with [`google-apps-script/Code.gs`](google-apps-script/Code.gs), pasting your Sheet ID into `SHEET_ID`.
4. Click **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone with the link**, then deploy and authorize it.
5. Copy the deployment URL ending in `/exec`. In the planner, tap **Sync Sheet**, paste it, tap **Save connection**, then tap **Sync Sheet** once more.

The Sheet stores one backup row per device, containing your planner data as JSON. The latest version wins: if the Sheet has a newer backup when you sync, it restores that data to the app.

Keep the Apps Script URL private: anyone holding that URL can access the endpoint. The app does not contain your Google account credentials or the spreadsheet ID.
