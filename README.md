# Лендинг "Крафт-свічки та арома-професія з нуля"

Готова single-page для редагування. Відкривається у будь-якому браузері і редакторі коду.

## Структура

```
dist-for-designer/
├── index.html         ← основний файл (HTML + CSS, ~75 КБ, читабельний)
└── assets/            ← 14 зображень (фото, букет, пелюстки)
    ├── hero-bouquet-*.png
    ├── benefits-photo-*.jpg
    ├── howto-photo-*.jpg
    ├── author-photo-*.png
    ├── course-*.jpg              (5 шт., обкладинки курсів)
    ├── gives-center-*.jpg
    ├── bouquet-bg.png            (декор hero)
    └── petals-{1,2}.png          (пелюстки на всіх секціях)
```

Усі зображення тепер як окремі файли (раніше були base64 в HTML — щоб вийшло 2.4 МБ і нічого не редагувалось).

## Як швидко переглянути

Просто двічі клікни `index.html` — відкриється у браузері без жодних серверів.

## Як редагувати

### У веб-редакторі (CodeSandbox / StackBlitz / VS Code Web)

1. Закинь усю папку (drag&drop) у [codesandbox.io](https://codesandbox.io) → "Static" template, або у [stackblitz.com](https://stackblitz.com).
2. Файл `index.html` — єдиний, у ньому HTML і CSS.
3. Превʼю оновлюється автоматично.

### У Webflow / Tilda / Figma Sites

`index.html` — рідний HTML+CSS без фреймворків і JS. Можна імпортувати як custom code, або скопіювати окремі секції (`<section class="hero">`, `.audience`, `.benefits` …) у блоки конструктора.

### Локально у VS Code / Sublime

Відкрий папку, ред редагуй `index.html`. Live-Server розширення дасть hot-reload.

## Дизайн-система (CSS-змінні на початку файлу)

```css
:root {
  --color-text: #262626;        /* текст */
  --color-accent: #38A30D;      /* зелений акцент */
  --gradient-cta: linear-gradient(#49C318, #38A30D);
  --gradient-soft: linear-gradient(#FFFCFC, #FFF0F0);
  --gradient-pink: linear-gradient(#FFE5E0, #FFD9D2);
  --color-bg: #A69D97;          /* сірий фон секцій */
  --color-author-border: #F5D9D0;
}
```

**Шрифти:** Cormorant Garamond (заголовки, uppercase, 600) + Inter (текст). Підтягується з Google Fonts.

## Секції (порядок у HTML)

| Клас             | Що це                                            |
|------------------|--------------------------------------------------|
| `.hero`          | Заголовок + інфо + CTA + букет PNG               |
| `.audience`      | "Для кого ці курси" — сітка 5 пунктів            |
| `.benefits`      | "Головна користь навчання" — фото + переваги     |
| `.howto`         | "Як проходить навчання" — список + фото          |
| `.author`        | "Про автора" — заголовок + овальне фото + текст  |
| `.courses`       | 5 карток курсів з фото та спойлерами             |
| `.results`       | "Було → Стало" — 4 плашки                        |
| `.gives`         | "Що ти отримуєш" — hub-композиція + ціна + CTA   |
| `.reviews`       | 5 Telegram-bubbles                               |
| `.faq`           | Акордеон, native `<details>`                     |

## Адаптив

- ≥1024px — повна композиція
- ≤768px — стек по вертикалі, всередині `@media` блоків

## Декоративні пелюстки

`<img class="petal-decor" style="position:absolute; top:…; left:…; transform:rotate(…)">` — 9 шт. розкидані поза секціями, координати в inline-style. Можна тягати-міняти будь-як.

## Технічні нотатки

- Без JavaScript — `<details>/<summary>` для FAQ
- Без іконок-емодзі — тільки SVG inline
- Без зовнішніх фреймворків (немає Tailwind, Bootstrap)

## Контакти / питання

Бриф клієнтки + всі вихідні: у Telegram-чаті проекту.
