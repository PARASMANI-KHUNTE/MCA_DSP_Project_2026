# Frontend Redesign Instructions — Portfolio UI

## Objective

Redesign the existing frontend to closely follow the visual direction, layout, typography, spacing, and overall aesthetic of the attached reference image.

**Reference:** The uploaded screenshot of Aïdin Sahebi's Front-End Portfolio.

The goal is to create a premium, minimal, professional developer portfolio with a clean editorial aesthetic, inspired by the reference — while retaining the existing project's identity, content, technologies, and functionality.

This is a redesign of the existing application, NOT a request to build an entirely new project.

## 1. First: Analyze the Existing Project

Before making changes:

- Inspect the complete project structure.
- Identify the frontend framework, styling system, components, routes, and existing dependencies.
- Understand the current homepage and all existing sections.
- Identify existing functionality, interactions, animations, and integrations.
- Reuse existing components and dependencies wherever practical.
- Do not remove working features or break existing routes.

Do not start blindly replacing files. Understand the existing implementation first.

## 2. Visual Design Direction

Follow the reference image's design language.

**Overall aesthetic:**
- Minimalist, modern, elegant, and professional.
- Warm off-white / light ivory background.
- White content surfaces.
- Black and charcoal typography.
- Subtle crimson/red accent color.
- Thin neutral-grey borders.
- Soft shadows and restrained visual effects.
- Generous whitespace and balanced spacing.

**Suggested color palette:**
- Page background: #F5F5F2
- Main surface: #FFFFFF
- Primary text: #111111
- Secondary text: #666666
- Muted text: #999999
- Accent: #B51F3B
- Borders: #E5E5E5

Avoid excessive gradients, glassmorphism, colorful backgrounds, and unnecessary decorative elements.

## 3. Main Layout

### A. Browser-style Portfolio Container

Create a centered website container inspired by the reference screenshot.

- Generous outer margins.
- Large white content surface.
- Rounded corners (subtle, not excessive).
- Very subtle shadow.
- Responsive maximum width.
- Clean separation between navigation and content.

The website should feel like a carefully designed digital portfolio rather than a generic landing page template.

### B. Navigation Bar

Create a minimal horizontal navigation bar.

Requirements:
- Developer name or logo on the left.
- Navigation links on the right or centered, depending on available space.
- Minimal typography.
- Small red underline for the active navigation item.
- Smooth hover transitions.
- Responsive mobile navigation.

Keep the navbar clean and compact.

### C. Hero Section

Create a two-column hero section similar to the reference.

**Left column:**
- Large, bold developer name.
- Professional role/title.
- Short introduction describing expertise and development philosophy.
- Primary CTA button such as "Get in touch".
- Strong typographic hierarchy.

**Right column:**
- A visually interesting developer-themed code editor panel.
- Display a realistic code snippet containing relevant developer information, skills, or configuration.
- Use syntax highlighting with restrained colors.
- Thin border and subtle background.
- Include a small filename/header area.

The code panel should feel like a real development environment, not a random decorative card.

On smaller screens, stack both columns vertically.

### D. Technology Stack

Below the hero section, create a horizontal technology stack section.

Display technologies as compact bordered tags/chips.

Requirements:
- Small, consistent typography.
- Subtle light-grey backgrounds.
- Minimal red indicator or accent.
- Consistent padding and spacing.
- Horizontal wrapping on smaller screens.

Only display technologies actually used or known to be part of the existing developer profile.

### E. Statistics Section

Create a horizontal statistics section similar to the reference.

Display relevant professional metrics, such as:
- Projects completed.
- Live applications.
- Years of experience.
- Other meaningful achievements.

Design:
- Four-column layout on desktop.
- Individual columns separated by subtle vertical borders.
- Large numbers in the red accent color.
- Small descriptive labels underneath.

IMPORTANT: Never invent statistics, experience, clients, or achievements. Reuse verified information from the existing project.

### F. Remaining Portfolio Sections

Redesign all existing sections to follow the same visual language.

This includes whichever sections currently exist, such as:

- About Me
- Skills
- Experience
- Projects
- Education
- Contact

Maintain consistent typography, borders, spacing, and component styling throughout the entire application.

Projects should be presented using clean, structured cards rather than oversized colorful blocks.

## 4. Typography

Typography is one of the most important aspects of this redesign.

Use a modern sans-serif font such as:
- Inter
- Geist
- Manrope

Guidelines:
- Large, bold hero heading.
- Medium-weight section headings.
- Comfortable paragraph line height.
- Small muted metadata.
- Consistent font weights and sizes.
- Avoid unnecessary uppercase text.

Prioritize readability and strong visual hierarchy.

## 5. Interactions and Animations

Keep interactions subtle and purposeful.

Implement:
- Smooth scrolling.
- Subtle hover transitions.
- Active navigation indicators.
- Refined button hover states.
- Smooth appearance transitions where appropriate.
- Functional navigation and CTA buttons.

Avoid:
- Excessive scroll animations.
- Unnecessary parallax.
- Bouncing elements.
- Constantly moving decorative elements.
- Animations that reduce usability.

Performance and accessibility take priority over animation.

## 6. Responsive Design

The redesign must work properly across:

- Large desktop screens.
- Standard laptop screens.
- Tablets.
- Mobile devices.

Requirements:
- No horizontal overflow.
- Properly stacked hero columns.
- Responsive navigation.
- Adaptive typography.
- Properly wrapping technology tags.
- Responsive project cards.
- Comfortable mobile spacing.

Do not simply shrink the desktop layout. Design the mobile experience intentionally.

## 7. Technical Requirements

- Continue using the existing frontend framework.
- Maintain the existing backend/API integrations.
- Preserve existing application logic.
- Reuse existing dependencies where possible.
- Keep components modular and maintainable.
- Avoid unnecessary dependencies.
- Follow the existing coding conventions.
- Maintain accessibility and semantic HTML.
- Optimize images and rendering performance.
- Avoid introducing console errors or broken functionality.

Do not replace working functionality with static mockups.

## 8. Implementation Workflow

Follow this sequence:

1. Analyze the existing codebase.
2. Identify components and sections requiring redesign.
3. Establish global design tokens (colors, typography, spacing, borders).
4. Redesign the main layout and navigation.
5. Implement the hero section.
6. Implement technology tags and statistics.
7. Redesign the remaining portfolio sections.
8. Implement responsive layouts.
9. Add subtle interactions and transitions.
10. Test all routes, buttons, links, and existing functionality.
11. Fix visual inconsistencies and responsiveness issues.

After implementation, run the application and inspect it at desktop and mobile viewport sizes.

## 9. Final Quality Expectations

The final result should communicate:

- Professionalism.
- Technical competence.
- Attention to detail.
- Strong frontend engineering skills.
- A premium, understated visual identity.

The attached reference should be the primary visual inspiration.

However, do not blindly copy its content, identity, or branding. Adapt the design to the existing developer portfolio.

**Most importantly:** The result should look intentionally designed, not like a generic AI-generated portfolio template.

Prioritize visual quality, spacing precision, typography, consistency, and maintainability.

Complete the implementation rather than just providing suggestions or a design proposal.