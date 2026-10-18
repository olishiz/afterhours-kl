# Luma reference for Afterhours

This compact reference records the two authorized Luma discovery pages sampled on 18 October 2026. It guides a black nightlife adaptation; it is not a full extraction certification.

## Typography

Use the operating-system sans-serif stack. Body text is 16 px/24 px at weight 400, labels use 500, and section headings use 600. Discover titles use 28 px desktop and 22 px mobile. The Kuala Lumpur city hero uses 52 px desktop and 32 px mobile. Hero display weight is 500; avoid heavy 800/900 text when matching Luma's feel.

## Colors

Live default pages use #f8f8f8, #fff, #151515 text, #757575 secondary, and pale neutral dividers. Authored dark-theme tokens provide #151515 page, #232323 secondary surface, #353535 tertiary surface, #fff primary text, #d4d4d4 secondary text, and #959595 muted text. Dark cards and borders use white 4%, increasing borders to white 16% on hover. Nightlife accent colors are Afterhours choices rather than source measurements.

## Layout

Desktop Discover uses a 788 px reading column. The city calendar uses approximately 948 px with a broader event column and narrower subscription/map aside. Mobile content has 16 px side insets. Discover events form two columns of horizontal cards, each with an 80 px image and 16 px gap. Mobile Discover presents three-row groups as a horizontal pager. KL uses chronological event groups with a date line and square image. Generous section separation gives dense event data room to breathe.

## Controls

Small controls are 30 px high, 14 px/500, padding 7 px 10 px, radius 15–16 px. Medium actions are 38 px high, 16 px/500, padding 10 px 14 px, radius 19 px. Source transition token: `all .2s cubic-bezier(.4,0,.2,1)`.

## Component Catalog

| Component | Anatomy | Evidence | Contract |
|---|---|---|---|
| Pill action | Inline link/button, single line, optional trailing icon | Discover View All; KL Subscribe | components/COMPONENTS.md |
| Compact event | Square image, date, title, venue | Discover six visible events | components/event-card.html |
| City hero | Context subtitle, city h1, introduction, subscription | KL page | components/COMPONENTS.md |
| Event section | Heading/action row, repeated compact events | Discover Popular Events | components/COMPONENTS.md |

## Validation status

Desktop/mobile screenshots were captured and computed styles were measured. Dark colors were obtained from CSS declarations. Automated gallery validation, lint, interactive state captures, full component sweep, and source fixture tests were not performed. See docs/research/luma/README.md for provenance.
