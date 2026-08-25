---
name: Harmonious Living
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
typography:
  display-financial:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  container-max: 1200px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is centered on the concept of "Financial Harmony." It targets individuals in shared living arrangements, where money can often be a source of friction. The UI is designed to be a "calm mediator"—neutral, clear, and reassuring.

The aesthetic follows a **Modern Corporate** style with a soft, **Minimalist** touch. It prioritizes clarity and breathing room to reduce the cognitive load of financial management. High whitespace, subtle elevation, and a systematic approach to information density ensure that users feel in control and at ease.

## Colors

The color system uses a high-contrast foundation for legibility, paired with a functional semantic palette. 

- **Primary Blue**: Used for actions, progress indicators, and branding to establish trust.
- **Semantic Palette**: Success (Green), Warning (Amber), and Danger (Red) are strictly reserved for financial status indicators (e.g., payment status, budget health).
- **Neutral Grays**: The background is a cool off-white to prevent screen glare, while the deep slate text ensures AA/AAA accessibility.
- **Tints**: Each semantic color should have a 10% opacity version used for background fills in status badges and progress track backgrounds.

## Typography

This design system utilizes **Inter** for its exceptional legibility and neutral character. 

- **Financial Data**: Use `display-financial` for primary balances. The negative letter spacing ensures large numbers feel tight and professional.
- **Hierarchy**: Headers use Semi-Bold (600) weights to stand out against the light surface.
- **Micro-copy**: Use `label-sm` for status badges and categories, applying a 0.05em letter spacing for better readability at small scales.

## Layout & Spacing

The design system employs a **8pt grid system** to maintain vertical rhythm. 

- **Mobile**: A single-column fluid layout with `margin-mobile` safe areas. Bottom navigation is fixed.
- **Desktop**: A 12-column grid with a fixed 280px sidebar on the left. The main content area uses a `container-max` width to prevent line lengths from becoming too long for comfortable reading.
- **Stacking**: Use `lg` (24px) spacing between cards and `sm` (12px) spacing for elements within cards.

## Elevation & Depth

Depth is signaled through **Ambient Shadows** rather than heavy borders.

- **Level 0 (Background)**: `#f9fafb`.
- **Level 1 (Cards/Surface)**: White background with a soft shadow: `0px 1px 3px rgba(0,0,0,0.05), 0px 1px 2px rgba(0,0,0,0.03)`.
- **Level 2 (Interactive/Floating)**: Used for buttons on hover and active dropdowns: `0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -2px rgba(0,0,0,0.05)`.
- **Level 3 (Modals)**: Heavily diffused to focus attention: `0px 20px 25px -5px rgba(0,0,0,0.1), 0px 10px 10px -5px rgba(0,0,0,0.04)`.

## Shapes

The shape language is friendly and approachable. 
- **Standard Radius**: 12px for small components like inputs and buttons.
- **Large Radius**: 16px for primary containers and cards.
- **Full Radius**: 9999px for status badges and progress bar caps to emphasize the "Pill" shape.

## Components

### Buttons & Inputs
- **Primary Button**: 12px radius, Solid Primary Blue fill, White text. Minimum tap target 48px.
- **Input Fields**: 1px border (#e2e8f0) with 12px radius. Focus state uses a 2px Primary Blue ring.

### Cards
- **Financial Cards**: White background, 16px radius, 24px padding. Headline financial data should be top-left aligned.
- **Actionable Lists**: List items should have 16px vertical padding and subtle bottom dividers (#f1f5f9).

### Status Badges
- **Structure**: Small caps text with a background color at 10% opacity of the text color.
- **Colors**:
  - *Paid*: Success Green
  - *Upcoming*: Warning Amber
  - *Overdue*: Danger Red

### Progress Bars
- Height: 8px.
- Track: 10% opacity of the semantic color.
- Indicator: 100% opacity of the semantic color.
- Rounding: Fully rounded (caps).

### Navigation
- **Mobile**: Bottom bar with 4-5 items. Active state uses the Primary Blue for the icon and label.
- **Desktop Sidebar**: 280px width, Slate text, Primary Blue accent for the active state background (at 10% opacity) and a 4px left-border indicator.