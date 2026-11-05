# Accessibility and language support

## Included

- Portuguese, English and Spanish UI, validation, status messages, review suggestions and Markdown exports. The document language changes with the selector. Real repository names and descriptions are preserved.
- Light, dark and system themes. Theme and language persist in browser-local storage, with graceful fallback when storage is unavailable.
- A keyboard-accessible skip link, semantic landmarks and heading hierarchy, native buttons, selects and disclosure controls.
- Visible focus indicators, unique repository checkbox/link names, and focus preservation when a project selection updates the list.
- A named native modal dialog with Escape dismissal and return to the opening button.
- Username instructions, associated validation errors and invalid-field state. Request errors receive focus and use an alert region.
- Live announcements for request status and filtered/selected results.
- Reduced-motion preference support and forced-colors styles.
- Responsive reflow checked at a 320 CSS-pixel viewport.

## Validation performed

Run `node --test tests/review.test.mjs tests/i18n.test.mjs tests/portfolio.test.mjs`.

Automated checks cover translation completeness and interpolation tokens, priority message translation, section recognition in three languages, unavailable README content and contrast ratios for the main text/control color tokens. Main text pairs meet 4.5:1 and control borders meet 3:1 in both palettes.

Browser checks cover language/theme switching, persistence after reload, selected projects surviving a language change, keyboard selection with focus restoration, modal dismissal and focus return, skip-link focus, invalid input, Spanish Markdown download, and the real GitHub request flow. A 320-pixel layout was inspected for horizontal overflow.

These are targeted improvements informed by WCAG 2.2, not a complete compliance certification. A full assistive-technology audit with screen readers such as NVDA, JAWS and VoiceOver remains to be performed. README section detection is heuristic and does not establish document accessibility or semantic content quality.

Reference: https://www.w3.org/WAI/WCAG22/quickref/.

The README generator uses a labelled native modal, associated labels and help text for all fields, an explicitly labelled editable Markdown area, a language attribute on generated Markdown and live status for generation/download. Escape returns focus to the project button. Search and language filters are labelled and announce updated result counts. Saved selections retain keyboard focus on checkbox updates; storage errors are disclosed in the interface.
