-- ============================================================
-- ШАБЛОН: повна сторінка для нового курсу
-- ============================================================
-- Як використати:
--   1. Скопіюйте цей файл
--   2. Замініть {{SLUG}} на slug свого курсу (напр. 'course-betonna')
--   3. Замініть {{ТЕМАТИКА}} - короткий опис (свічковаріння / десерти / бетон)
--   4. Замініть {{N_УРОКІВ}} - кількість відеоуроків (напр. 14)
--   5. Замініть {{M_ТЕМ}} - кількість тем (напр. 6)
--   6. Замініть {{ВАГОВЕ_СЛОВО}} - звертання у CTA (напр. освоїти, створити)
--   7. Заповніть items блоків audience, info, program, outcomes, faq
--   8. Запустіть у Supabase SQL Editor
--
-- 📐 СТАНДАРТИ збережено - не змінюйте subtitle/title загальних блоків!
-- Курсо-специфічні поля помічено {{...}}
-- ============================================================

UPDATE landing_courses
SET
  page_enabled = TRUE,
  page_meta_description = '{{ОПИС_SEO_150_СИМВОЛІВ}}',
  page_blocks = '[
    {
      "id": "b-hero",
      "type": "hero",
      "visible": true,
      "data": {
        "badge": "{{БЕЙДЖ}}",
        "title": "{{НАЗВА_КУРСУ}}",
        "subtitle": "{{ОПИС_ДЛЯ_HERO_2_3_РЯДКИ}}",
        "button_text": "Обрати цей курс"
      }
    },
    {
      "id": "b-audience",
      "type": "audience",
      "visible": true,
      "data": {
        "title": "Цей курс",
        "title_accent": "для вас",
        "accent_position": "after",
        "subtitle": "Якщо ви впізнаєте себе хоча б у двох пунктах - курс точно ваш",
        "items": [
          { "icon": "🎯", "text": "{{БІЛЬ_1}}" },
          { "icon": "🎯", "text": "{{БІЛЬ_2}}" },
          { "icon": "🎯", "text": "{{БІЛЬ_3}}" },
          { "icon": "🎯", "text": "{{БІЛЬ_4}}" },
          { "icon": "🎯", "text": "{{БІЛЬ_5}}" },
          { "icon": "🎯", "text": "{{БІЛЬ_6}}" }
        ]
      }
    },
    {
      "id": "b-info",
      "type": "info",
      "visible": true,
      "data": {
        "title": "Що",
        "title_accent": "отримуєте",
        "accent_position": "after",
        "subtitle": "Все, щоб ви впевнено створювали свічки на продаж",
        "items": [
          { "icon": "📹", "text": "{{N_УРОКІВ}} відеоуроків у записі - навчаєтесь у власному темпі" },
          { "icon": "♾️", "text": "Доступ постійний - повертайтесь, скільки треба" },
          { "icon": "💬", "text": "Чат підтримки - допоможемо з будь-яким питанням" },
          { "icon": "🎯", "text": "Практичний підхід - без зайвої теорії, лише реальні технології" }
        ]
      }
    },
    {
      "id": "b-description",
      "type": "text",
      "visible": true,
      "data": {
        "title": "Опис",
        "title_accent": "курсу",
        "accent_position": "after",
        "subtitle": "Що саме ви опануєте за {{N_УРОКІВ}} відеоуроків",
        "body": "{{РОЗГОРНУТИЙ_ОПИС_MARKDOWN}}"
      }
    },
    {
      "id": "b-program",
      "type": "program",
      "visible": true,
      "data": {
        "title": "Програма",
        "title_accent": "курсу",
        "accent_position": "after",
        "subtitle": "{{N_УРОКІВ}} відеоуроків розділені на {{M_ТЕМ}} практичних тем",
        "items": [
          { "title": "{{ТЕМА_1}}", "details": "{{ДЕТАЛІ_1}}" }
        ]
      }
    },
    {
      "id": "b-works",
      "type": "works",
      "visible": true,
      "data": {
        "title": "Роботи учнів",
        "title_accent": "після курсу",
        "accent_position": "after",
        "subtitle": "У короткий термін наші учні навчаються якісно виготовляти свічки на продаж",
        "photos": []
      }
    },
    {
      "id": "b-outcomes",
      "type": "outcomes",
      "visible": true,
      "data": {
        "title": "Після курсу",
        "title_accent": "ви зможете",
        "accent_position": "after",
        "subtitle": "Конкретні навички та результати, які отримаєте за 2-4 тижні навчання",
        "items": [
          { "icon": "🎯", "text": "{{РЕЗУЛЬТАТ_1}}" },
          { "icon": "🎯", "text": "{{РЕЗУЛЬТАТ_2}}" },
          { "icon": "🎯", "text": "{{РЕЗУЛЬТАТ_3}}" },
          { "icon": "🎯", "text": "{{РЕЗУЛЬТАТ_4}}" },
          { "icon": "🎯", "text": "{{РЕЗУЛЬТАТ_5}}" },
          { "icon": "🎯", "text": "{{РЕЗУЛЬТАТ_6}}" }
        ]
      }
    },
    {
      "id": "b-video",
      "type": "video",
      "visible": true,
      "data": {
        "title": "Як проходить",
        "subtitle": "Подивіться короткий огляд курсу",
        "url": "",
        "caption": "",
        "aspect_ratio": "auto",
        "size": "medium",
        "object_fit": "contain",
        "autoplay": false,
        "loop": false,
        "muted": false,
        "controls": true
      }
    },
    {
      "id": "b-reviews",
      "type": "reviews",
      "visible": true,
      "data": {
        "title": "Сотні позитивних",
        "title_accent": "відгуків",
        "accent_position": "after",
        "subtitle": "Відгуки учнів попередніх потоків",
        "review_ids": []
      }
    },
    {
      "id": "b-author",
      "type": "author",
      "visible": true,
      "data": {
        "title": "Про",
        "title_accent": "автора",
        "accent_position": "after",
        "use_landing": true
      }
    },
    {
      "id": "b-faq",
      "type": "faq",
      "visible": true,
      "data": {
        "title": "Питання",
        "title_accent": "та відповіді",
        "accent_position": "after",
        "subtitle": "Все що ви хотіли запитати перед покупкою",
        "items": [
          { "question": "{{ПИТАННЯ_1}}", "answer": "{{ВІДПОВІДЬ_1}}" }
        ]
      }
    },
    {
      "id": "b-cta",
      "type": "cta",
      "visible": true,
      "data": {
        "title": "Готові {{ВАГОВЕ_СЛОВО}} {{ТЕМАТИКА}}?",
        "subtitle": "Долучайтесь до курсу - отримаєте всі {{N_УРОКІВ}} відеоуроків, доступ у записі і чат підтримки.",
        "button_text": "Так, хочу опанувати курс"
      }
    }
  ]'::jsonb,
  cta_text = 'Детальніше про курс →'
WHERE slug = '{{SLUG}}';

NOTIFY pgrst, 'reload schema';
