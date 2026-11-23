# Google Ads setup for habitabilitylaw.com

## Final URLs by ad group

| Ad group | English | Spanish |
|---|---|---|
| Habitability core (habitability lawyer, sue my landlord, slumlord lawyer, tenant lawyer) | /tenant-lawyer | /es/abogado-de-inquilinos |
| Code violations (order to comply, building cited, code enforcement) | /code-violations | /es/violaciones-de-codigo |
| Mold | /mold | /es/moho |
| Roaches | /roaches | /es/cucarachas |
| Bed bugs | /bed-bugs | /es/chinches |
| Rats and mice | /rats | /es/ratas |
| No heat or hot water | /no-heat-hot-water | /es/sin-calefaccion-agua-caliente |
| Sewage, leaks, plumbing | /sewage-plumbing | /es/drenaje-plomeria |
| Retaliation | /retaliation | /es/represalias |

Do not send ads to the homepage. It links out to the other pages; the landing pages do not.
`/tenant-lawyer` and its Spanish twin are marked noindex because they repeat the homepage. Ads still run to them.

## Tracking template (account level)

```
{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={adgroupid}&utm_term={keyword}
```

Turn auto-tagging on so Google appends `gclid` (or `gbraid` / `wbraid` on iOS). Every quiz lead stores
the UTMs and click IDs as hidden fields, and keeps the last ad click for 90 days on the visitor's device.
Those click IDs are what offline conversion import needs to tell Google which leads became signed cases.

## Turning on Google Tag Manager

Set `gtmId` in `content.mjs` to the container ID and deploy. Nothing loads while it is empty.

Events the pages push to `dataLayer`:

| Event | When | Extra fields |
|---|---|---|
| `quiz_start` | first answer chosen | |
| `quiz_step` | each new question shown | `step` |
| `lead_submit` | lead saved | `page`, `lang` |
| `phone_click` | any phone link tapped | `click_location` (header, bar, close, other) |

Every page also sets `page_lang` and `page_name` on load. Quiz answers and contact details are never pushed.

Suggested conversions in Google Ads: `lead_submit` as primary, `phone_click` as secondary until call
tracking is in place, signed case (offline import by click ID) as the one to bid toward once volume allows.

## Not done here

- Call tracking. The phone number is static. A Google forwarding number or a call-tracking number needs GTM first.
- Enhanced conversions. They send hashed phone and email to Google, which the privacy page currently says we do not do.
- Reviews and results on the pages. None exist yet.
