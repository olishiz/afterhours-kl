# Luma design reference

Sampled live on 18 October 2026 (Asia/Kuala_Lumpur):

- https://luma.com/discover at 1280 × 720 and 390 × 844
- https://luma.com/kuala-lumpur at 1280 × 720 and 390 × 844

The user requested Luma as a design guide, customized for a black nightlife product. This is a bounded visual-reference study, not a certified full design-system extraction or a pixel-identical clone.

## Useful observations

Luma favors restrained system typography, 400/500/600 weights, compact controls, generous outer whitespace, and photography supplied by events. Cards are simple image-plus-content compositions. The event data remains visually dominant.

| Element | Desktop measurement | Mobile measurement |
|---|---|---|
| Discover reading width | 788 px, x=238.5 at 1280 viewport | 343 px with 16 px side inset |
| Discover heading | 28 px, 600, line-height 33.6 px | 22 px |
| Discover section heading | 20 px, 600, line-height 24 px | 18 px |
| Discover event title | 16 px, 500, line-height 19.2 px | 16 px |
| Discover event image | 80 × 80 px | 80 × 80 px |
| Discover event arrangement | Two columns; image, 16 px gap, date/title/venue | Horizontal paging of groups with three rows |
| KL reading width | About 948 px, x=168.5 | 343 px with 16 px side inset |
| KL hero heading | 52 px, 500, line-height 62.4 px | 32 px |
| KL hero subtitle | 28 px, 400 | 20 px |
| KL event title | 20 px, 500, line-height 24 px | 18 px |
| Small pill button | 30 px high; 14 px/500; 7 px 10 px padding; radius 15–16 px | Same compact control language |
| Medium pill button | 38 px high; 16 px/500; 10 px 14 px padding; radius 19 px | Same compact control language |
| Category card | 252 × 66 px, radius 24 px; 16 px grid gaps | Not separately measured |

Font stack measured: `-apple-system, BlinkMacSystemFont, "Apple Color Emoji", Inter, Roboto, "Segoe UI", "Helvetica Neue", Arial, "Noto Sans", sans-serif`.

## Color evidence

Both sampled pages render light page bodies by default. The KL city hero is dark with white text. Luma's downloaded stylesheet also declares a dark theme: page #151515, secondary surface #232323, tertiary surface #353535, primary text #fff, secondary #d4d4d4, muted #959595, white 4% card backgrounds and borders, white 16% hovered card borders. Dark colors were read from authored CSS; the full dark site was not rendered or behavior-tested.

Afterhours should adapt these neutral surfaces to its nightlife identity. Any lime accent, larger magazine-style event covers, or nightlife-specific category is an intentional product adaptation, not a claimed Luma measurement.

## Files and limits

- `*-desktop-1280.png` and `*-mobile-390.png`: real source viewport screenshots.
- `discover-measurements.txt`, `discover-mobile-measurements.txt`, and `kuala-lumpur-mobile-measurements.txt`: captured computed-style evidence.
- `kuala-lumpur-source.html` and `global-source.css`: raw source evidence, not application assets or implementation code.
- `../../../.design_systems/luma-com-20261018/`: compact token/component handoff.

No event detail page was required for the design sample. Firecrawl discovery, nine-stage automated component sweep, forced hover/focus screenshots, gallery comparison, design.md lint, and source fixture self-tests were not run. Do not report those gates as passed.
