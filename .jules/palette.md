## 2025-02-12 - ARIA Expand Button and Icon-only ARIA Labels
**Learning:** Found multiple "copy to clipboard" icon-only buttons missing `aria-label` attributes. Also added `aria-expanded={isOpen}` to the accordion toggle button, and applied `focus-visible` styles to it for better keyboard accessibility in the API Docs component.
**Action:** Always ensure that icon-only interactive elements contain accessible labels, state indicators like `aria-expanded` and interactive visible feedback like `focus-visible` to support keyboard navigation.
