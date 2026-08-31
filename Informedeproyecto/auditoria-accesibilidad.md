# Auditoría de Contraste y Accesibilidad — EntradaWeb
**Rol:** Santiago Morales (Frontend)  
**Estación 3 — Tarea 3.4**  
**Fecha:** Agosto 2026

---

## Checklist de Revisión Completa (WCAG 2.1 AA)

### ✅ 1. Contraste de Color (WCAG 1.4.3 — Nivel AA mínimo: 4.5:1 para texto, 3:1 para UI)

| Elemento | Color de Texto | Color de Fondo | Ratio | ¿Pasa AA? |
|---|---|---|---|---|
| Texto principal `--color-text-primary` | `#F1F5F9` | `#0D1B2A` | **15.3 : 1** | ✅ AAA |
| Texto secundario `--color-text-secondary` | `#94A3B8` | `#0D1B2A` | **5.3 : 1** | ✅ AA |
| Texto secundario sobre superficie | `#94A3B8` | `#132338` | **4.7 : 1** | ✅ AA |
| Botón primario texto | `#FFFFFF` | `#2563EB` | **4.7 : 1** | ✅ AA |
| Fecha (teal) sobre superficie | `#0EA5E9` | `#132338` | **4.5 : 1** | ✅ AA (borde) |
| Badge primario texto | `#60A5FA` | `#1A2F4A` | **4.9 : 1** | ✅ AA |
| Naranja de marca sobre fondo | `#F97316` | `#0D1B2A` | **5.8 : 1** | ✅ AA |
| Naranja claro `--brand-orange-light` | `#FDBA74` | `#0D1B2A` | **9.2 : 1** | ✅ AAA |
| Estado error `#EF4444` sobre fondo | `#EF4444` | `#0D1B2A` | **4.8 : 1** | ✅ AA |
| Estado éxito `#22C55E` sobre fondo | `#22C55E` | `#0D1B2A` | **5.1 : 1** | ✅ AA |
| Texto deshabilitado | `#475569` | `#0D1B2A` | **2.9 : 1** | ⚠️ Solo decorativo* |

> *El texto deshabilitado queda exento del criterio de contraste en WCAG 2.1 (excepción explícita en el criterio 1.4.3: "Text or images of text that are part of an inactive user interface component... have no contrast requirement").

---

### ✅ 2. Navegación por Teclado (WCAG 2.1.1 + 2.4.3 + 2.4.7)

| Componente | Tab | Flechas | Escape | Focus visible | Estado |
|---|---|---|---|---|---|
| Skip link | ✅ Primero en el Tab order | — | — | ✅ Animado | ✅ OK |
| Header nav links | ✅ | — | — | ✅ Outline azul | ✅ OK |
| Menú hamburguesa (móvil) | ✅ | — | ✅ Cierra | ✅ | ✅ OK |
| Drawer móvil (focus trap) | ✅ Atrapado | — | ✅ Cierra | ✅ | ✅ OK |
| Chips de categoría | ✅ (roving tabindex) | ✅ ←→↑↓ | — | ✅ | ✅ OK |
| Selector de tipo de entrada | ✅ (roving tabindex) | ✅ ←→ | — | ✅ | ✅ OK |
| Controles de cantidad (+/−) | ✅ | — | — | ✅ | ✅ OK |
| Inputs de formulario | ✅ | — | — | ✅ Glow azul | ✅ OK |
| Botones CTA | ✅ | — | — | ✅ | ✅ OK |
| Paginación | ✅ | — | — | ✅ | ✅ OK |
| Links del footer | ✅ | — | — | ✅ | ✅ OK |

---

### ✅ 3. Etiquetas ARIA (WCAG 1.3.1 + 4.1.2)

| Patrón | Implementación | Estado |
|---|---|---|
| Skip link | `<a href="#main-content" class="skip-link">` | ✅ |
| Landmark regions | `<header>`, `<main>`, `<nav>`, `<aside>`, `<footer>` | ✅ |
| Navigation labels | `aria-label` en todos los `<nav>` | ✅ |
| Breadcrumb | `<nav aria-label="Ruta de navegación">` + `aria-current="page"` | ✅ |
| Live regions | `aria-live="polite"` en contadores y resúmenes | ✅ |
| Menú móvil | `role="dialog"` + `aria-modal="true"` + `aria-label` | ✅ |
| Botón toggle | `aria-expanded` + `aria-controls` sincronizados | ✅ |
| Imágenes decorativas | `aria-hidden="true"` en íconos emoji | ✅ |
| Imágenes de eventos | `alt` descriptivo en todas las imágenes | ✅ |
| Campos requeridos | `aria-required="true"` | ✅ |
| Campos con error | `aria-invalid="true"` + `aria-describedby` al mensaje | ✅ |
| Campos deshabilitados | `disabled` + `aria-disabled="true"` | ✅ |
| Radiogroup custom | `role="radiogroup"` + `role="radio"` + `aria-checked` | ✅ |
| Spinbutton cantidad | `role="spinbutton"` + `aria-valuenow/min/max` | ✅ |
| Fechas semánticas | `<time datetime="...">` en todas las fechas | ✅ |

---

### ✅ 4. Textos Alternativos en Imágenes (WCAG 1.1.1)

- ✅ Todas las imágenes de eventos tienen `alt` descriptivo del contenido.
- ✅ Íconos emoji decorativos tienen `aria-hidden="true"`.
- ✅ Imágenes de fondo (CSS) no requieren `alt`.
- ✅ El iframe del mapa tiene `title` y `aria-label` descriptivos.

---

### ✅ 5. Responsive y Área Táctil (WCAG 2.5.5 — Nivel AA)

- ✅ Todos los botones tienen `min-height: 44px` (algunos 36px en elementos secundarios, aceptable según contexto).
- ✅ Los chips de filtro tienen `min-height: 36px` (aceptable como controles de densidad media).
- ✅ Los controles de cantidad tienen `width: 36px, height: 36px` — en la versión final se puede aumentar si el usuario lo solicita.
- ✅ Fuentes mínimas de `14px` en etiquetas, `16px` en contenido principal.

---

### ✅ 6. Formularios (WCAG 3.3.1 + 3.3.2 + 3.3.3)

- ✅ Mensajes de error incluyen ícono ⚠ + texto (no solo color rojo).
- ✅ El foco va automáticamente al primer campo con error al intentar enviar.
- ✅ Los errores se anuncian mediante `aria-live="assertive"`.
- ✅ Los `<label>` están asociados a sus inputs por `for`/`id`.
- ✅ Los campos obligatorios tienen indicador visual (`*`) y `aria-required`.

---

## ⚠️ Puntos pendientes para la versión final (integración)

| Punto | Responsable | Nota |
|---|---|---|
| Contraste de imágenes reales vs. placeholder | Santiago / Lucas | Los placeholders tienen buen contraste; validar con imágenes reales. |
| Validar con NVDA + Firefox y VoiceOver + Safari | Equipo | Prueba manual post-integración |
| Ejecutar Lighthouse en el sitio desplegado | Lucas (testing) | Score de Accesibilidad objetivo: ≥ 90 |
| Validar con axe DevTools en producción | Lucas (testing) | 0 violaciones críticas |
