repo: careyconnor-weaver/Weaver-v1
branch: main
path: (root — index.html + styles.css + assets/)

## Last sync
date: 2026-08-05T04:00:00Z

### Updated in this project
- Ported the redesign into the REAL production files (index.html + styles.css), not just the DC preview.
- Hero 2D `.network-circle` replaced with a true three.js 3D network (#net3d + inline init, badge center = assets/weaver-badge.png).
- Added stock photos to assets/: hero-network.jpg (hero bg), student-laptop.jpg (features band), networking-event.jpg (why section).
- Brand renamed Weaver → Student Weaver; headings unified to Poppins; primary CTAs navy; final-cta + footer to consistent dark charcoal.

## Screen map
| Project screen | Repo source files |
| --- | --- |
| index.html (#landing-page) | index.html, styles.css (landing section + appended redesign block), assets/weaver-badge.png, assets/hero-network.jpg, assets/student-laptop.jpg, assets/networking-event.jpg |
| Landing.dc.html (design preview) | mirrors index.html #landing-page |

## Notes
- api.js / script.js referenced by index.html live in the repo (server + client logic) and were not copied here — they 404 in this preview only; the landing renders and the 3D network runs regardless.
- 3D network accent left as original purple (#7c6df0); change the node `colors` array + glass color in the inline script, or `--accent`, to retint.

## Sync history
- 2026-08-05T03:48Z — initial recreation of landing as Landing.dc.html.
