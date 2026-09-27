# Ma-Doh Interface Style Guide

Status: Draft 0.1

Scope: Responsive web application
Last updated: 27 September 2026

This document defines the visual rules for the Ma-Doh hackathon MVP. It gives
the team one shared styling language while leaving room to refine the product
after the main workflows are functional.

## 1. Design Direction

Ma-Doh should feel:

- Clear enough for repeated financial tasks
- Trustworthy without resembling a traditional bank portal
- Friendly without becoming playful or childish
- Calm when displaying financial position
- Direct when showing warnings, missing information, or failed extraction
- Familiar to users working with M-Pesa, bank records, receipts, and cash

The interface should prioritize legibility, evidence, and user control. Styling
must never make an AI-generated result look more certain than it is.

### Product principles

1. Put financial information before decoration.
2. Use color to communicate meaning, not to fill empty space.
3. Keep confirmed data visually distinct from drafts and AI suggestions.
4. Make primary actions obvious and destructive actions deliberate.
5. Preserve readable density on desktop and comfortable touch targets on mobile.
6. Use the same transaction language across capture, review, history, dashboard,
   and Ask My Money.

## 2. Color Palette

### Supplied brand colors

| Token | Hex | Recommended role |
| --- | --- | --- |
| `sky-100` | `#d0e2ed` | Quiet information backgrounds and selected table rows |
| `sky-300` | `#a5bcd6` | Borders, inactive chart values, and secondary illustration color |
| `lime-300` | `#c0f181` | Positive highlights, chart accents, and progress indicators |
| `mint-400` | `#5adf9f` | Success backgrounds, confirmed-state accents, and income charts |
| `amber-300` | `#ffce50` | Review-required and pending-state backgrounds |
| `green-500` | `#53af32` | Brand accent, positive data, and non-text graphics |
| `coral-400` | `#ff5550` | Error backgrounds and negative chart accents |
| `green-700` | `#167818` | Primary actions, links, active navigation, and success text |
| `orange-500` | `#eb5128` | Warning emphasis and unusual-spending indicators |
| `indigo-700` | `#404084` | Ask My Money, AI activity, and intelligence features |
| `plum-900` | `#3f2354` | Deep emphasis, premium detail, and selected AI surfaces |

### Supporting neutrals

The supplied palette needs neutral colors for readable text, surfaces, and
layout structure.

| Token | Hex | Role |
| --- | --- | --- |
| `neutral-0` | `#ffffff` | Main surface and text on dark colors |
| `neutral-50` | `#f5f7f6` | Application background |
| `neutral-100` | `#eef2ef` | Secondary surface and disabled background |
| `neutral-300` | `#d8e0db` | Default border and divider |
| `neutral-500` | `#68736d` | Secondary text and icons |
| `neutral-700` | `#344039` | Strong secondary text |
| `neutral-900` | `#17211c` | Primary text and dark surface |

Do not replace primary body text with a brand color. Financial amounts and form
labels should remain readable even when color meaning is unavailable.

## 3. Semantic Color Tokens

Components should use semantic tokens instead of raw palette values.

```css
:root {
  --color-canvas: #f5f7f6;
  --color-surface: #ffffff;
  --color-surface-muted: #eef2ef;
  --color-border: #d8e0db;

  --color-text: #17211c;
  --color-text-secondary: #68736d;
  --color-text-inverse: #ffffff;

  --color-primary: #167818;
  --color-primary-hover: #126514;
  --color-primary-soft: #c0f181;

  --color-information: #404084;
  --color-information-soft: #d0e2ed;
  --color-ai: #3f2354;

  --color-success: #167818;
  --color-success-soft: #5adf9f;
  --color-warning: #eb5128;
  --color-warning-soft: #ffce50;
  --color-danger: #b52f2b;
  --color-danger-soft: #ff5550;
}
```

`#b52f2b` is introduced as a dark danger text color because `#ff5550` is not
dark enough for small white text. Use the supplied coral as a background or
graphic accent.

## 4. Color Usage Rules

### Safe text pairings

| Background | Text | Usage |
| --- | --- | --- |
| `#167818` | `#ffffff` | Primary buttons and active navigation |
| `#404084` | `#ffffff` | Intelligence actions and selected AI controls |
| `#3f2354` | `#ffffff` | Deep AI or account emphasis |
| `#d0e2ed` | `#17211c` | Information banners and selected rows |
| `#a5bcd6` | `#17211c` | Secondary blue surfaces |
| `#c0f181` | `#17211c` | Positive highlights |
| `#5adf9f` | `#17211c` | Confirmed and success surfaces |
| `#ffce50` | `#17211c` | Pending review and warning surfaces |
| `#53af32` | `#17211c` | Accent surfaces when text is necessary |
| `#ff5550` | `#17211c` | Error surfaces |
| `#eb5128` | `#17211c` | Warning surfaces; reserve white for large text only |

### Rules

- Do not place normal white text on `#d0e2ed`, `#a5bcd6`, `#c0f181`,
  `#5adf9f`, `#ffce50`, `#53af32`, `#ff5550`, or `#eb5128`.
- Do not communicate income, expense, warning, or confirmation through color
  alone. Pair color with an icon, label, sign, or status text.
- Use green for confirmed, positive, or primary action states.
- Use indigo and plum for Ask My Money and AI-specific states.
- Use amber for review required, uncertainty, or pending action.
- Use coral and dark red for errors, failed processing, and destructive actions.
- Use orange sparingly for warnings or unusual activity, not standard expenses.
- Keep charts readable in monochrome by using labels, patterns, or direct values.

## 5. Typography

### Provisional font pairing

- **Headings and financial display values:** Space Grotesk
- **Body, forms, navigation, tables, and controls:** Roboto
- **Technical values and transaction references:** Roboto Mono, only when needed

Space Grotesk is the initial grotesk-family candidate. It should be tested in
the working interface before becoming permanent. Suitable alternatives include
Geist, IBM Plex Sans, and Satoshi. Do not combine more than two primary type
families in the MVP.

### Font stacks

```css
--font-display: "Space Grotesk", "Arial", sans-serif;
--font-body: "Roboto", "Arial", sans-serif;
--font-mono: "Roboto Mono", "Consolas", monospace;
```

### Type scale

| Style | Size | Line height | Weight | Typeface |
| --- | ---: | ---: | ---: | --- |
| Page title | 32px | 40px | 600 | Space Grotesk |
| Mobile page title | 26px | 34px | 600 | Space Grotesk |
| Section heading | 22px | 30px | 600 | Space Grotesk |
| Card heading | 17px | 24px | 600 | Space Grotesk |
| Financial display | 30px | 38px | 650 | Space Grotesk |
| Body | 16px | 24px | 400 | Roboto |
| Compact body | 14px | 20px | 400 | Roboto |
| Button and navigation | 14px | 20px | 500 | Roboto |
| Label | 13px | 18px | 500 | Roboto |
| Supporting text | 12px | 17px | 400 | Roboto |

### Typography rules

- Use zero letter spacing unless a specific accessibility test supports a
  change.
- Do not use all caps for financial values, form labels, or buttons.
- Small uppercase eyebrows may be used sparingly at 12px with normal tracking.
- Use tabular numerals for aligned transaction amounts and financial tables.
- Show currency as `KES 12,450`, not `12,450/-`.
- Use a plus sign for income and a minus sign for expenses in transaction lists.
- Never rely on font weight alone to distinguish draft and confirmed data.

## 6. Spacing and Layout

Use a 4px base spacing system.

```text
4px   micro gap
8px   related icon and label
12px  compact control gap
16px  standard internal padding
20px  comfortable card padding
24px  component group spacing
32px  section spacing
48px  major page separation
```

### Layout rules

- Desktop sidebar: 224px to 248px.
- Main content width: fluid, with a practical maximum of 1440px.
- Desktop page padding: 32px to 64px.
- Mobile page padding: 16px.
- Dashboard columns must collapse to one column before content becomes cramped.
- Fixed navigation and toolbars must reserve their space in the page layout.
- Do not place cards inside cards.
- Use full-width page sections and cards only for individual data groups,
  repeated records, or contained tools.

### Breakpoints

| Name | Width | Intended behaviour |
| --- | ---: | --- |
| Mobile | below 700px | Bottom navigation, stacked content, touch-first controls |
| Tablet | 700px to 959px | Compact sidebar or simplified navigation, reduced columns |
| Desktop | 960px and above | Persistent sidebar and multi-column workspace |

Test at minimum at 375px, 768px, 1280px, and 1440px widths.

## 7. Shape, Borders, and Elevation

- Small controls: 6px radius.
- Cards, panels, and modals: 8px radius maximum.
- Circular shapes are reserved for avatars, status dots, and icon-only actions.
- Standard border: 1px solid `#d8e0db`.
- Active border: 1px solid `#167818`.
- Error border: 1px solid `#b52f2b`.
- Use shadows only for menus, dialogs, raised toolbars, and temporary overlays.
- Default cards should use borders rather than shadows.

```css
--shadow-menu: 0 8px 24px rgba(23, 33, 28, 0.12);
--shadow-dialog: 0 16px 48px rgba(23, 33, 28, 0.18);
```

Do not use gradient backgrounds, decorative color blobs, or glass effects in
the operational interface.

## 8. Buttons and Interactive Controls

### Primary button

- Background: `#167818`
- Text and icon: white
- Hover: `#126514`
- Minimum height: 44px
- Radius: 6px
- Use for one main action per view

### Secondary button

- Background: white or transparent
- Border and text: `#167818`
- Hover background: `#c0f181`
- Use for alternative commands and review actions

### AI action

- Background: `#404084`
- Text and icon: white
- Use only for Ask My Money or explicit AI processing actions

### Destructive button

- Default: white background with `#b52f2b` text and border
- Confirmation state: `#b52f2b` background with white text
- Require explicit wording such as `Delete transaction`

### Icon use

- Use Lucide icons already installed in the frontend.
- Use familiar icons for camera, microphone, upload, edit, delete, close, and
  navigation commands.
- Pair unfamiliar icons with text or an accessible tooltip.
- Icon-only buttons require an accessible name and at least a 44px target.

## 9. Forms and Transaction Review

- Labels appear above fields and remain visible while typing.
- Required fields use text, not only an asterisk or color.
- Inputs have a minimum height of 44px.
- Use native date, time, number, checkbox, and select behaviours where reliable.
- Use a segmented control for `Expense`, `Income`, `Transfer`, and `Refund` when
  space permits.
- Use checkboxes or switches only for binary settings such as recurring status.
- Display amount fields with a visible `KES` prefix.
- Highlight uncertain AI fields with an amber background or border and the text
  `Review required`.
- Never save AI-extracted values automatically.
- Keep the input source available during review when practical.
- Put the primary confirmation action after all editable fields.

### Field states

| State | Border | Background | Supporting treatment |
| --- | --- | --- | --- |
| Default | `#d8e0db` | White | Neutral label |
| Focus | `#167818` | White | Visible 3px focus ring |
| AI suggestion | `#404084` | `#d0e2ed` | AI label and confidence |
| Review required | `#eb5128` | `#ffce50` | Warning icon and text |
| Confirmed | `#167818` | `#5adf9f` | Check icon and confirmation text |
| Error | `#b52f2b` | Light coral tint | Error icon and correction text |
| Disabled | `#d8e0db` | `#eef2ef` | Reduced emphasis, readable text |

## 10. Financial Data Presentation

- Income uses green text or an incoming-arrow icon.
- Expenses use neutral text with a minus sign; reserve red for errors or serious
  negative states rather than every purchase.
- Transfers use indigo and must be labelled `Transfer` so they are not mistaken
  for expenses.
- Refunds use green with a `Refund` label.
- Drafts use amber and a visible `Draft` or `Review required` status.
- Confirmed records use a green confirmation mark without tinting the full row.
- Align amounts to the right in tables and transaction lists.
- Always show the period attached to a total, for example `This month`.
- Ask My Money answers must show the total, period, transaction count, and a way
  to inspect supporting records.

## 11. Charts

Use charts only when they improve comparison. Always provide the underlying
value or an accessible table.

Recommended series order:

1. `#167818` primary financial series
2. `#404084` comparison or AI series
3. `#ffce50` pending or secondary series
4. `#5adf9f` positive supporting series
5. `#eb5128` warning or unusual activity
6. `#a5bcd6` inactive or historical values

Do not place red and green beside each other without direct labels. Avoid pie
charts with more than five categories; group smaller values into `Other`.

## 12. Motion and Feedback

- Use motion to confirm cause and effect, not for decoration.
- Standard transition duration: 150ms to 220ms.
- Modal or drawer transition: up to 280ms.
- Respect `prefers-reduced-motion`.
- Use skeletons only for data that is genuinely loading.
- Show a clear processing state for receipt and voice extraction.
- Keep the user on the review screen when extraction fails and provide manual
  correction or retry.
- Toasts must not be the only place where an error or saved state is shown.

## 13. Accessibility Baseline

- Meet WCAG AA contrast for normal text at a minimum ratio of 4.5:1.
- Meet a minimum ratio of 3:1 for large text and meaningful UI graphics.
- Preserve visible keyboard focus.
- Use semantic headings in order.
- Give every field a programmatic label.
- Give icon-only actions an accessible name.
- Keep touch targets at least 44px by 44px.
- Do not disable zoom.
- Support keyboard operation for all capture and review actions except hardware
  functions that inherently require a camera or microphone.
- Test at 200 percent zoom and at the four required viewport widths.

## 14. Voice and Content Style

- Use plain, specific language.
- Prefer `Add transaction` over `Create financial record entry`.
- Prefer `Review required` over `Low confidence result` in primary UI.
- Prefer `Could not read this receipt` over `Inference failed`.
- State what happened and what the user can do next.
- Do not call AI output `verified`, `correct`, or `confirmed` before user review.
- Do not present financial information as investment, lending, or tax advice.

## 15. Implementation Notes

- Store these decisions as CSS custom properties or Tailwind theme tokens.
- Components should consume semantic tokens such as `primary`, `warning`, and
  `surface`, not raw hex codes.
- Keep color and typography changes centralized in the global theme.
- Use Next.js font optimization when the final typefaces are approved.
- Keep current interaction and accessibility behaviour while visual styling is
  refined from the Figma reference.
- Update this file when the team changes a token, typeface, breakpoint, or
  component rule. Do not let Figma, CSS, and this guide drift independently.

## 16. Open Decisions

- Confirm Space Grotesk after testing headings and large KES values.
- Confirm whether Roboto remains the body face after mobile readability testing.
- Select the final logo and favicon treatment.
- Confirm the database and deployment-provider status colors.
- Review chart colors with a color-vision accessibility simulator.
- Decide whether dark mode is required after the hackathon. It is not part of
  the current MVP.
