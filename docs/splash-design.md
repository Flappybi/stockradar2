# Splash design and verification

Implemented 22 September 2026. The welcome screen introduces StockRadar through a deep emerald surface, mint radar mark and restrained serif headline. An explicit Enter StockRadar button opens the research dashboard. No timer or simulated loading state delays entry.

The home route remembers entry in session storage. If storage is unavailable, an in-memory fallback preserves navigation within the current document. The `/splash` route always previews the design; stock and other research deep links bypass the welcome gate. Keyboard entry moves focus into the dashboard. Reduced-motion preferences disable the sweep, arrival animation and button movement.

## Visual comparison

Compared `splash-concept.png` with the rendered production screen at 1536 × 1024, inspected the 375 × 812 mobile screen, and checked the compact in-app browser viewport.

1. **Composition:** the centered radar, wordmark, two-line headline and single call to action retain the concept's hierarchy.
2. **Typography:** sans-serif branding and controls contrast with the large serif headline and italic mint second line.
3. **Color:** deep emerald, ivory and mint preserve the concept's palette; low-contrast rings sit behind the content.
4. **Spacing:** the desktop button and footer closely follow the concept's vertical positions. Shorter viewports reduce logo size and spacing to keep the footer visible.
5. **Copy and controls:** all concept copy is implemented as selectable text, the synthetic-data label remains explicit, and the entry button is functional.

Intentional differences: the existing Lucide Radar mark preserves the application's identity, CSS rings use a simplified pattern, and the mobile layout wraps supporting text and stacks the footer. The raster concept is a reference only and is not loaded by the application.

## Browser coverage

Both desktop and mobile tests verify entry with the keyboard, focus transfer, remembered entry after reload, the dedicated splash preview, direct company links, reduced-motion CSS and absence of horizontal overflow. The existing research workflow and API rejection tests also pass with the welcome screen enabled.
