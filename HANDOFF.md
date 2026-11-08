# Wedding invitation site — handoff

**STATUS: sections 1–5 are built and tested** (`#hero`, `#film`, `#hello`, `#route`, `#rsvp`). The «Section 5» spec below is kept as the design reference; remaining work = owner feedback, fonts (`fonts/`), video file (`video/invitation.mp4`), real links (route addresses, QR/photo link, RSVP `data-href`), and any further sections.

Couple: Արկադի և Արփի · date 01.12.2026 · language: Armenian (hy) · static site (HTML/CSS/JS, no build step, no libraries).
Designs (1806×2560 px after removing the 8px frame): `design/1…5`. Each is one "screen" of a single scrolling page.

## Variant B (alternative opening)
- `index-b.html` = same page, but sections 1+2 (cover with hands + video) are replaced by one opening `#herob`: a white-silk curtain is pulled aside by a dove (SVG `img/dove.svg`, inline in the HTML; JS-driven timeline in `js/main.js` «ԲԱՑՈՒՄ»), revealing the autoplaying looping video; then «Արկադի և Արփի» is written and the date fades in over a frosted lower third. Tap during the intro = skip. Reduced-motion = no intro. Sections 3–5 are identical to `index.html`. Venue/church back buttons use history.back() when coming from the same site.

## Extra page
- `venue.html` (+ `css/venue.css`, `js/venue.js`, `img/venue.jpg`): venue «Մեծ Հայք» page. Opened from the route section's 3rd stop (`data-href="venue.html"`, link, icon, title). The address on it links to Yandex Maps; the back button goes to `index.html#route`. `img/venue.jpg` was cut from a low-res screenshot — replace with the original photo (portrait, wavy white bottom edge baked in, ratio ≈ 1192×1324) for better quality.
- `church.html` (same CSS/JS as venue, `img/church.jpg`, `--ph` = photo height/width ratio): opened from the church stop; address opens Google Maps (maps.app.goo.gl short link).
- The bride's-house stop has no page: its icon, title and address link open Google Maps directly (new tab). Pattern: `data-href` on the `.stop` + the same `href` on `.stop__link`; relative = same tab, `http(s)` = new tab.

## Hard requirements (from the owner)
- Fully responsive, **min width 240px, content max-width 1023px** (centred; on wider screens edges fade with a mask). Phones matter most.
- Must work when `index.html` is opened from `file://` → **never call getImageData / WebGL texture from local images** (canvas gets tainted). `drawImage` is fine.
- Fonts (user supplies the files later, fallbacks already in CSS): `fonts/Mhiora.woff2|ttf` (date on cover), `fonts/Montserrat-Armenian.woff2|ttf` (all body text, var `--sans`).
- Animations are the point of the project: smooth, elegant, `prefers-reduced-motion` respected (everything visible, no animation).
- Reply to the owner in Armenian.

## Files
- `index.html` — all sections in order: 1 cover (`#hero`), 2 video (`#film`), 3 «Սիրելի՛ հյուր» (`#hello`), 4 route (`#route`), **5 = TODO**.
- `css/style.css` — one file, sections commented. Conventions: `.js` class on `<html>` gates hidden "before" states; sections are `container-type:inline-size` so sizes use `cqw`; design pixel unit `--u: calc(100cqw / 1806)`; colours `--wine #842f31`, `--heart #b81f2f`; ease `--ease`.
- `js/main.js` — independent IIFEs: moving silk (canvas strips, `.silk[data-src]`), hello reveal, video autoplay/loop, route scroll-scrubbed dotted trail.
- Reveal pattern: IntersectionObserver adds `.is-in` / `.on`; CSS transitions/animations do the rest.
- Links that are not known yet use `href="#"` and `preventDefault` (route addresses). Same must be done for new links.

## Section 5 — spec (implemented in #rsvp)
Reference: `design/5-rsvp-love.jpg`. White background (no silk). Coordinates below are design px (1806 wide); convert with `calc(N * var(--u))`; text sizes `max(<cqw>, 13.5px)`; gaps may be multiplied on phones.
Text is Montserrat-like, dark `#141414`, wine red accents `--wine`.

1. Lead text, centred, 4 explicit lines (cap-top y ≈ 209 / 282 / 357 / 430, ≈ 52px ≈ 2.9cqw, line pitch 73):
   `Ձեր ներկայությունը մեր հարսանեկան օրը` / `մեզ համար մեծագույն նվերն է։` / `Խնդրում ենք հաստատել Ձեր ներկայությունը` / `մինչև 15 նոյեմբերի։`
2. Two options, left aligned block starting x≈444, y ≈ 610 and 685: `[ ] Մեծ սիրով կգամ / կգանք` and `[ ] Ափսոս, բայց չեմ / չենք կարողանա գալ`.
   Make them real buttons (radio behaviour, `role="radio"`/`aria-checked`), the `[ ]` gets an animated hand-drawn check (SVG stroke-dashoffset). Optional `data-href` on each (mailto/WhatsApp, empty for now → only toggles).
3. `ՍՊԱՍՈՒՄ ԵՆՔ ՁԵԶ` — caps, letter-spaced, centred, y ≈ 855.
4. Thin light-grey divider, x 363–1444, y ≈ 1044 (draws from the centre outwards when revealed).
5. **Love group** (origin y = 1185):
   - `img/love-ink.png` (1017×471, black lettering "love♥" with transparent bg) at x=431, y=1179. **Animate it as hand-writing.** Data: `data/love-points.json` = `{w,h,T,p:[[x,y,r,t],…]}` — ordered pen path (skeleton points of the strokes with local stroke radius `r` and pen time `t`, `T`=1933 total, first stroke "lov", then a pen lift, then "e♥").
     Technique (no pixel reads): two canvases. `mask` canvas accumulates filled discs (x,y,r) for all points with `t ≤ now·speed`; the visible canvas is cleared each frame, draws `love-ink.png`, then `globalCompositeOperation='destination-in'` and draws the mask canvas. Duration ≈ 3 s, ease-out at the end, start when ≥40% visible, replay on click/tap. Keep the plain `<img>` as no-JS / reduced-motion fallback (hide it when the canvas runs).
   - `img/qr.png` (467×467, scan-safe, use `image-rendering:pixelated`) at x=878, y=1531. Wrap in `<a href="#">` placeholder like the route links.
   - `img/camera.png` (290×276) at x=540, y=1684, tiny "flash" pop-in.
6. Bottom text, centred: `ՄԻԱՍԻՆ ՀԱՎԱՔԵՆՔ ՄԵՐ ՕՐՎԱ ՀՈՒՇԵՐԸ` (caps, letter-spaced, ≈38px, y ≈ 2086) and below `սկանավորեք կոդը և վերբեռնեք ձեր արած բոլոր լուսանկարները` (≈37px, y ≈ 2141).
7. **Footer** (origin y = 2300) — the owner's request: *the rings come from both sides like the hands in the cover*:
   - `img/ring-left.png` (207×160) at x=540,y=2330 slides in from the left; `img/ring-right.png` (140×160) at x=746,y=2330 slides in from the right (they were cut from one line-drawing at column 206, so when they meet they form the original ornament exactly; give them a 1px overlap if a seam shows).
   - Two thin black lines (≈3px) at y≈2423: x 197→562 and x 861→1226; they grow from the outer ends inward while the rings travel.
   - `img/names-small.png` (368×190, red script "Արկադի և Արփի") at x=1310,y=2346, fades in last.
8. Phones (≤ 640px): stack — love full width; camera + QR in one row (QR ≥ 120px); footer scaled ×1.4 and centred; names centred under the rings. Section needs no more than ~1.6 screens tall.
9. Reveal choreography: lead → options → wait line → divider → love writing → camera/QR → bottom text → rings/lines → names.

## Done-check
Screenshot at 1023×1376, 390×844, 240×520 (Playwright/Chrome). No horizontal scroll, no console errors, works from `file://`, reduced-motion shows everything.

## Փոփոխություններ (նոյեմբերի 8)
- **Վիդեո**՝ `video/invitation.mov` (H.264+AAC, տես video/README.txt). Ձայնի կոճակը միշտ երևում է, առաջին հպումից ձայնը (երգը) միանում է։
- **iPhone 7 / Safari<16**՝ `cqw` միավորները փոխարինված են `var(--cqw)`-ով, `js/cq.js` պոլիֆիլը դնում է px հին զննարկիչներում (թեստ՝ `?nocq`)։
- **love** փոքրացվել է, QR/տեսախցիկը վերև են բարձրացվել և երևում են շատ շուտ (0.5–1.3 վ)։
- **Տարբերակ B**՝ նոր աղավնի (`img/dove.svg` + inline index-b.html-ում), կորագիծ եզրով ալիքվող վարագույր, ճոճվող ծալքեր։
- **Տարբերակ B v2**՝ նոր աղավնի (`img/dove.svg`՝ օգտատիրոջ CorelDRAW գծանկարից, սպիտակ լցվածքով, ձիթենու կանաչ տերևներով, թևերը թափահարում են՝ SMIL + mask), վարագույրը գծվում է `js/curtain.js`-ով (canvas)՝ ատլասե ծալքեր, ոսկե ձող օղակներով, ժանյակե եզր, ասեղնագործ սրտեր, tie-back ժապավեն ռոզաներով, վարդի թերթիկներ։ Հին վարագույրի կոդը հանվել է main.js-ից։ Կարգավորումներ՝ `curtain.js`-ի վերևում (END, DELAY, DUR)։

## Փոփոխություններ (նոյեմբերի 9)
- Աղավնին փոքրացվել է (`.hb__dove-box`՝ 58 → 44 cqw, max 280px)։
- Վիդեոն (index-b) այլևս ավտոմատ չի նվագում սկզբից. `js/curtain.js`-ը վարագույրը կիսով բացվելիս դնում է `.is-half` + event `hb:half`, և միայն հետո `main.js`-ը սկսում է վիդեոն 0-ից։ Պահեստային՝ 9 վ հետո ինքնուրույն կսկսի։ Բաց թողնելիս/reduced-motion-ում՝ անմիջապես։
- `video/invitation.mov`՝ անունը փոքրատառ (սերվերներն ու GitHub Pages-ը տարբերում են մեծ/փոքր տառերը), «faststart» (moov ֆայլի սկզբում)՝ սկսում է նվագել առանց ամբողջ ֆայլը բեռնելու։
- `.hb__dove-exit`-ում մնացած չմշակված `cqw/cqh` → `var(--cqw)`/vh (iPhone 7)։
