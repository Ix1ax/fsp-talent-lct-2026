#!/usr/bin/env python3
"""Генерирует синтетическое резюме в макете hh.ru для тестов (выдуманный человек).

Макет повторяет реальный PDF hh.ru: левая колонка x=42.5 (заголовки размером 11, подписи размером 8: периоды, годы,
уровни образования), правая колонка x=127.6 (компания и должность размером 12, описание размером 9), чипы навыков в одной
строке, запись об образовании переходит на следующую страницу.

Запуск: python3 gen_fixture.py "/System/Library/Fonts/Supplemental/Arial Unicode.ttf" resume_hh.pdf
Нужны PyMuPDF и fontTools (pip install pymupdf fonttools). Реальные данные сюда не попадают.
"""
import sys

import fitz

font_path, out = sys.argv[1], sys.argv[2]
doc = fitz.open()
FOOTER = "Иванов Иван  •  Резюме обновлено 01 января 2026 в 12:00"
LEFT, RIGHT = 42.5, 127.6


def new_page():
    page = doc.new_page(width=595, height=842)
    page.insert_font(fontname="F0", fontfile=font_path)
    return page


def put(page, x, y, text, size=9):
    # y считается сверху страницы, как в PyMuPDF.
    page.insert_text((x, y), text, fontname="F0", fontsize=size)


def footer(page):
    put(page, LEFT, 820, FOOTER, 8)


# Страница 1: шапка, желаемая должность, первое место работы, начало образования.
p = new_page()
put(p, LEFT, 60, "Иванов Иван", 25)
put(p, LEFT, 80, "Мужчина, 30 лет, родился 1 января 1996")
put(p, LEFT, 106, "+7 (900) 000-00-00")
put(p, LEFT, 119, "ivan.ivanov@example.test — предпочитаемый способ связи")
put(p, LEFT, 132, "telegram: @ivanov")
put(p, LEFT, 158, "Проживает: Тверь")
put(p, LEFT, 171, "Гражданство: Россия, есть разрешение на работу: Россия")
put(p, LEFT, 184, "Готов работать удалённо, готов к командировкам")
put(p, LEFT, 223, "Желаемая должность и зарплата", 11)
put(p, LEFT, 244, "Backend разработчик (Go)", 12)
put(p, LEFT, 260, "Специализации:")
put(p, LEFT + 14, 273, "—  Программист, разработчик")
put(p, LEFT, 286, "Тип занятости: полная занятость")
put(p, LEFT, 299, "Формат работы: удалённо, гибрид")
put(p, LEFT, 312, "Желательное время в пути до работы: не имеет значения")
put(p, LEFT, 364, "Опыт работы — 3 года 11 месяцев", 11)
put(p, LEFT, 382, "Ноябрь 2022 —", 8)
put(p, LEFT, 393, "настоящее время", 8)
put(p, LEFT, 404, "3 года 11", 8)
put(p, LEFT, 415, "месяцев", 8)
put(p, RIGHT, 385, "ООО Пример", 12)
put(p, RIGHT, 405, "Go-разработчик", 12)
put(p, RIGHT, 424, "Разработка и поддержка backend-части на Go: проектирование")
put(p, RIGHT, 437, "REST API для продукта.")
put(p, RIGHT, 450, "- Написание автотестов для ключевых сценариев и регресс-")
put(p, RIGHT, 463, "проверок.")
put(p, RIGHT, 476, "- Интеграция с внешними сервисами.")
put(p, LEFT, 520, "Март 2020 —", 8)
put(p, LEFT, 531, "Октябрь 2022", 8)
put(p, LEFT, 542, "2 года 8", 8)
put(p, LEFT, 553, "месяцев", 8)
put(p, RIGHT, 523, "Студия Альфа", 12)
put(p, RIGHT, 543, "Программист", 12)
put(p, RIGHT, 562, "Поддержка веб-приложений на PHP.")
put(p, LEFT, 740, "Образование", 11)
put(p, LEFT, 760, "Высшее", 11)
put(p, LEFT, 784, "2027", 8)
put(p, RIGHT, 787, "Университет «Дубна» (государственный университет «Дубна»),", 12)
put(p, LEFT, 795, "Высшее", 8)
put(p, RIGHT, 801, "Дубна (Московская область)", 12)
footer(p)

# Страница 2: продолжение образования, навыки, языки, «Обо мне».
p = new_page()
put(p, RIGHT, 56, "Институт системного анализа и управления, ПРОГРАММНАЯ ИНЖЕНЕРИЯ")
put(p, LEFT, 80, "2024", 8)
put(p, RIGHT, 83, "Колледж информационных технологий", 12)
put(p, LEFT, 91, "Среднее", 8)
put(p, RIGHT, 96, "IT-College, Информационные системы и программирование")
put(p, LEFT, 102, "специальное", 8)
put(p, LEFT, 140, "Навыки", 11)
put(p, LEFT, 158, "Знание языков", 8)
put(p, RIGHT, 160, "Русский")
put(p, 162.6, 160, "— Родной")
put(p, RIGHT, 173, "Английский")
put(p, 181.6, 173, "— B1 — Средний")
put(p, LEFT, 204, "Навыки", 8)
for x, text in [(RIGHT, "Go"), (160, "PostgreSQL"), (240, "Docker"), (300, "Kubernetes")]:
    put(p, x, 204, text, 10)
for x, text in [(RIGHT, "Базы данных"), (210, "ASP.NET Core"), (300, "Git")]:
    put(p, x, 222, text, 10)
put(p, LEFT, 300, "Дополнительная информация", 11)
put(p, LEFT, 318, "Обо мне", 8)
put(p, RIGHT, 320, "Backend-разработчик с опытом разработки на Go и PHP.")
put(p, RIGHT, 333, "Специализируюсь на REST API и интеграциях.")
put(p, RIGHT, 359, "Ключевые навыки")
put(p, RIGHT, 385, "Ключевые навыки")
put(p, RIGHT, 398, "• Backend: Go, REST API")
put(p, RIGHT, 424, "Опыт работы")
put(p, RIGHT, 450, "Go-разработчик")
put(p, RIGHT, 463, "Разработка серверной части веб-приложений.")
put(p, RIGHT, 489, "Ключевые проекты")
footer(p)

# Страница 3: проекты и достижения (разбор их игнорирует).
p = new_page()
put(p, RIGHT, 56, "Система расписания колледжа. Разработал REST API.")
put(p, RIGHT, 82, "Достижения")
put(p, RIGHT, 108, "Хакатон — 3 место.")
footer(p)

doc.subset_fonts()  # оставляем в файле только использованные символы (нужен fontTools)
doc.save(out, garbage=4, deflate=True)
print("saved", out)

# Пустая страница без текста: для проверки «нет текстового слоя» (скан).
blank = fitz.open()
blank.new_page(width=200, height=200)
blank.save(out.rsplit("/", 1)[0] + "/blank.pdf" if "/" in out else "blank.pdf")
