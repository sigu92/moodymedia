# Moody Media Minimalist Design System

## 🎨 Design Principer

### Färgpalett
```css
/* Base Colors */
--background: #FFFFFF; /* Pure white background */
--foreground: #1A1A1A; /* Near black for text */

/* Primary Accent - Single Strong Color */
--accent-primary: #10B981; /* Green - primary accent color */
--accent-primary-light: #D1FAE5; /* Light green for success states */
--accent-primary-dark: #059669; /* Darker green for hover states */

/* Button Colors - Black/White Contrast */
--button-primary: #000000; /* Black for primary buttons */
--button-primary-hover: #374151; /* Dark gray for hover */
--button-secondary: #FFFFFF; /* White for secondary buttons */
--button-secondary-border: #E5E7EB; /* Gray border for secondary */

/* Status Colors - Functional Only */
--status-success: #10B981; /* Green for success */
--status-success-light: #D1FAE5; /* Light green for success backgrounds */
--status-warning: #F59E0B; /* Amber for warnings */
--status-warning-light: #FEF3C7; /* Light amber for warning backgrounds */
--status-error: #EF4444; /* Red for errors */
--status-error-light: #FEE2E2; /* Light red for error backgrounds */
--status-neutral: #6B7280; /* Gray for neutral info */

/* Typography Colors */
--text-primary: #1A1A1A; /* Dark gray for headings */
--text-secondary: #6B7280; /* Light gray for subheadings */
--text-muted: #9CA3AF; /* Very light gray for hints */

/* Borders & Shadows */
--border-subtle: #E5E7EB; /* Subtle borders */
--shadow-subtle: 0 1px 3px 0 rgba(0, 0, 0, 0.1); /* Subtle shadows */
```

### Typografi
- **Font Family:** Inter, sans-serif
- **Headings:** Stora, feta (text-4xl/text-5xl, font-bold, text-gray-800)
- **Subheadings:** Ljusgrå, tunnare (text-lg/text-xl, font-normal, text-gray-600)
- **Body:** text-base, font-normal, text-gray-700

### Knappar
- **Primary:** Svart bakgrund (#000000), vit text, hover inverterar färger
- **Secondary:** Vit bakgrund, svart text, tunn border, hover inverterar
- **Padding:** 12px 24px
- **Border Radius:** 8px
- **Transition:** all 0.2s ease

### Layout Principer
- **Centrerade layouter** med max-width: 1200px
- **Generösa marginaler** (5rem för sektioner)
- **Mycket whitespace** för ren känsla
- **Balanserad spacing** mellan element

### Skuggor & Effekter
- **Subtila skuggor** för djup
- **Minimal visual noise**
- **Clean borders** (#E5E5E5)
- **Rounded corners** (8px standard, 12px för kort)

## CSS Classes

### Layout Classes
```css
.minimal-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.minimal-section {
  padding: 5rem 0;
  background: #FFFFFF;
}

.minimal-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.minimal-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-color: #D1D5DB;
}
```

### Typography Classes
```css
.heading-primary {
  font-size: 3rem;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.2;
  margin-bottom: 1.5rem;
}

.text-subtitle {
  font-size: 1.25rem;
  font-weight: 400;
  color: #6B7280;
  line-height: 1.6;
  margin-bottom: 2rem;
}
```

### Button Classes
```css
.btn-minimal-primary {
  background: #000000;
  color: #FFFFFF;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  border: 1px solid #000000;
  transition: all 0.2s ease;
  cursor: pointer;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.btn-minimal-primary:hover {
  background: #374151;
  color: #FFFFFF;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.btn-minimal-secondary {
  background: #FFFFFF;
  color: #000000;
  padding: 0.75rem 2rem;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.btn-minimal-secondary:hover {
  background: #F9FAFB;
  color: #000000;
  border-color: #D1D5DB;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.btn-accent {
  background: #10B981;
  color: #FFFFFF;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  border: 1px solid #10B981;
  transition: all 0.2s ease;
  cursor: pointer;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.btn-accent:hover {
  background: #059669;
  color: #FFFFFF;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

## Användning

Detta designsystem ska användas genomgående på hela sajten för:
- Ren vit bakgrund med mycket whitespace
- Stora, feta rubriker i mörk grå
- Ljusgrå underrubriker med tunnare vikt
- Svarta primärknappar som inverterar på hover
- Vita sekundärknappar med border som inverterar
- Centrerade layouter med balanserad spacing
- Subtila skuggor för djup
- Modern, skarp känsla med kvalitetsfokus

## Komponenter som följer detta tema:
- ✅ AppSidebar (uppdaterad - svart accent för knappar och badges)
- ✅ TopNav (uppdaterad - svart bas med vit kontrast, vit cart, dold role badge, extra spacing, Dashboard pekar nu på /dashboard/marketplace)
- ✅ Index.tsx hero section
- ✅ Floating icons hero
- ✅ Dashboard (grön accent för brand highlights)
- ✅ Marketplace (komplett redesign med minimalistisk tema + flytande ikoner i bakgrunden - 6 ikoner: Facebook, X, Google, YouTube, Globe, LinkedIn - positionerade symmetriskt runt hero-sektionen med 2% margin från kanterna)
- 🔄 Andra komponenter ska uppdateras successivt

## Färganvändning per komponent:
- **Sidebar:** Svart accent för knappar och badges (clean, minimalistisk)
- **TopNav:** Svart accent för aktiva länkar, grå för inaktiva
- **Dashboard:** Grön accent för brand highlights och success states
- **Hero sections:** Grön accent för brand highlights
- **Marketplace:** Grön accent för brand highlights, svart för CTA-knappar
- **Status:** Grön för success, röd för errors, gul för warnings
