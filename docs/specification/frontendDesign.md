# Frontend Design Guidelines

## Design Philosophy

The application should feel warm, personal, and approachable, similar to a personal journal rather than a corporate dashboard.

Target users are urban professionals who need a clean, organized, and intuitive experience.

---

## Responsive Design

The application must work seamlessly across:

* Mobile devices
* Tablets
* Desktop screens

Design should follow a mobile-first approach and progressively adapt to larger screens.

### Recommended Breakpoints

```css
Mobile: 0px - 767px
Tablet: 768px - 1023px
Desktop: 1024px+
```

Layouts, spacing, typography, and components should scale appropriately across all screen sizes.

---

## Design Consistency

All pages and components must follow a consistent design system.

Maintain consistency in:

* Colors
* Typography
* Spacing
* Border radius
* Shadows
* Buttons
* Forms
* Cards
* Icons
* Navigation patterns

Users should experience a unified interface throughout the application.

---

## Color System

Use a centralized color palette defined through CSS variables.

### Primary Color

```css
#2A6A35
```

Used for:

* Headers
* Navigation
* Primary actions
* Structural elements

### Accent Color

```css
#3A8A4A
```

Used for:

* Icons
* Active states
* Status indicators

### Supporting Colors

```css
#D4EFDA
#EDFAEF
#FFFFFF
```

Used for:

* Backgrounds
* Cards
* Badges
* Secondary surfaces

All colors should be referenced through design tokens or CSS variables.

---

## Typography

Typography should remain consistent across the application.

General guidelines:

* Clear visual hierarchy
* Readable font sizes
* Consistent font weights
* Accessible line heights
* Responsive scaling across devices

Avoid introducing component-specific typography systems.

---

## Spacing System

Use a consistent spacing scale throughout the application.

Examples:

```css
8px
12px
16px
20px
24px
32px
```

Avoid arbitrary spacing values unless absolutely necessary.

---

## Component Architecture

Frontend components should be modular and reusable.

Each component should:

* Be self-contained
* Have its own styling file
* Avoid affecting other components
* Be reusable across pages when appropriate

---

## CSS Structure

CSS folder structure must mirror the JSX/component structure.

Example:

```text
src/
├── components/
│
├── Header/
│   ├── Header.jsx
│   └── Header.css
│
├── Card/
│   ├── Card.jsx
│   └── Card.css
│
├── Button/
│   ├── Button.jsx
│   └── Button.css
```

This structure should be followed consistently throughout the project.

---

## CSS Isolation

Styles should be component-scoped whenever possible.

Guidelines:

* Use descriptive class names
* Avoid styling generic HTML elements globally
* Avoid deeply nested selectors
* Prevent style leakage between components

Example:

```css
.user-card {}
.user-card__title {}
.user-card__actions {}
```

Avoid:

```css
div {}
button {}
span {}
```

---

## Global Styles

Only application-wide styling should exist in global CSS files.

Examples:

```text
styles/
├── variables.css
├── typography.css
├── reset.css
└── globals.css
```

Global styles should contain:

* Design tokens
* CSS variables
* Typography definitions
* Utility classes
* CSS resets

Component-specific styles must remain inside their respective component folders.

---

## Functionality Separation

Styling changes must never impact application functionality.

CSS should only control:

* Visual appearance
* Layout
* Responsiveness
* Animations
* Transitions

CSS should not:

* Control business logic
* Modify application state
* Affect API behavior
* Depend on implementation-specific functionality

Frontend styling and application logic must remain clearly separated.

---

## Accessibility

All UI components should follow accessibility best practices.

Requirements:

* Keyboard accessibility
* Visible focus states
* Sufficient color contrast
* Semantic HTML
* Screen reader compatibility
* Touch-friendly interaction areas

Accessibility should be considered a core requirement rather than an enhancement.

---

## Scalability

The design system should support future growth without requiring major refactoring.

New pages, modules, and components should be able to adopt the existing design system with minimal additional styling.

Favor reusable patterns and centralized design tokens over one-off implementations.
