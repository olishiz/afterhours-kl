# Component contracts

## Pill action

**Evidence:** View All on Discover; Subscribe on KL. **Confidence:** high for default geometry.

Root is an inline flex link or button, weight 500, full capsule radius. Small: 14 px type, 30 px height, 7 px 10 px padding. Medium: 16 px type, 38 px height, 10 px 14 px padding. Trailing arrow is conditional. Source transition is 200 ms cubic-bezier(.4,0,.2,1). Hover/focus computed deltas were not captured.

## Compact event

**File:** event-card.html. **Evidence:** six visible Discover event instances. **Confidence:** high for desktop anatomy.

Composition: clickable event root; 80 px square poster; 16 px image-to-text gap; metadata column ordered date/time, h3 title, venue. Title 16 px/500/19.2 px, metadata uses smaller muted text. Venue is conditional when the event supplies it. Desktop event cells are approximately 398 × 110 px including click target. Mobile poster remains 80 px and groups become horizontally paged. Source image corners are clipped by their wrapper; exact wrapper radius was not measured.

## City hero

**Evidence:** KL page. **Confidence:** high for typography, medium for composition details.

Composition: location contextual subtitle above a city h1, explanatory copy, subscription control. Desktop h1 52 px/500/1.2, subtitle 28 px/400. Mobile h1 32 px and subtitle 20 px. Hero uses white text over a dark colored background; Afterhours should choose its own city/nightlife art.

## Event section

**Evidence:** Discover Popular Events. **Confidence:** high.

Composition: section heading and optional location subtitle on the left; View All pill on the right; two columns of compact event items below; divider before next section. Measured section title 20 px/600/24 px. Desktop reading width 788 px. Mobile side inset 16 px; heading 18 px. Horizontal-pager behavior is a source observation, not a required Afterhours product behavior.
