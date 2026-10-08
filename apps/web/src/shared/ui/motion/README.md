# Анимации интерфейса

Компоненты экспортируются из `@/shared/ui`, хуки — из `@/shared/hooks`.
Framer Motion подключён пока только в кабинете кандидата. Все обёртки учитывают
`prefers-reduced-motion`. Общие длительность, easing и spring находятся в
`shared/contants/motion.ts`.

## Появление и списки

```tsx
import { FadeIn, Reveal, Stagger, StaggerItem } from '@/shared/ui';

<FadeIn>Содержимое появляется при монтировании</FadeIn>
<Reveal inView>Появление при прокрутке, один раз</Reveal>
<Stagger className="grid gap-4 sm:grid-cols-2">
  {items.map((item) => (
    <StaggerItem key={item.id}>{item.title}</StaggerItem>
  ))}
</Stagger>
```

`FadeIn` поддерживает `visible`, `distance`, `delay`, `inView`, `once` и обычные
motion-props. `Stagger` поддерживает `interval`, `inView` и `once`. В кабинетах
с формами используйте `visible` и `initial={false}`, сохраняя компоненты
смонтированными. Каскад предназначен для небольших списков карточек.

## Раскрытие и переход содержимого

```tsx
import { Collapse, PageTransition } from '@/shared/ui';

<Button aria-expanded={open} aria-controls="details" onClick={toggle}>
  Подробности
</Button>
<Collapse id="details" open={open}>Содержимое</Collapse>
<PageTransition transitionKey={section}>Содержимое раздела</PageTransition>
```

`Collapse` сохраняет дочерние компоненты; закрытый блок имеет `inert` и
`aria-hidden`. Управление фокусом и кнопкой раскрытия остаётся у вызывающего
компонента. Высота анимируется только в этой локальной обёртке.

`PageTransition` повторяет появление при изменении ключа без пересоздания
дочерних компонентов. Он не управляет роутером или прокруткой. Оборачивайте
контент, а не sticky-sidebar или общий layout. Если сам роутер размонтирует
форму, обёртка не сможет сохранить её состояние.

## Индикатор, счётчик, прогресс

```tsx
import { LayoutGroup } from 'framer-motion';
import { AnimatedCounter, AnimatedIndicator, ScrollProgress } from '@/shared/ui';

<LayoutGroup id="profile-tabs">
  {tabs.map((tab) => (
    <Button key={tab.id} className="relative" onClick={() => select(tab.id)}>
      {active === tab.id && (
        <AnimatedIndicator layoutId="active-tab" className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
      )}
      {tab.label}
    </Button>
  ))}
</LayoutGroup>
<AnimatedCounter value={count} className="tabular-nums" />
<ScrollProgress />
```

Каждой независимой группе вкладок нужен свой `LayoutGroup id`. Число сразу
доступно скринридеру в конечном значении; промежуточные цифры декоративные.
Счётчик анимирует обновления, а не отсчёт от нуля при первой загрузке.
Прогресс по умолчанию фиксирован сверху — при sticky-header задайте `top`
через `className` или `style`.

## Хуки

| Хук                             | Возвращает                                                     |
| ------------------------------- | -------------------------------------------------------------- |
| `useMotionSettings()`           | `reducedMotion`, общий `transition`                            |
| `useSmoothScrollProgress()`     | MotionValue прогресса страницы; не меняет саму прокрутку       |
| `useParallax(distance)`         | `ref`, MotionValue `y` для `style={{ y }}`                     |
| `useMouseOffset()`              | MotionValues `x/y`, `onPointerMove`, `onPointerLeave`, `reset` |
| `useScrollDirection(threshold)` | `'up'` или `'down'`                                            |
| `useInViewOnce()`               | `ref`, `inView`                                                |

Параллакс и положение курсора обновляют MotionValue без React-рендера на
каждое движение. Хук курсора игнорирует touch-события. Для собственных эффектов
используйте `useMotionSettings`; не добавляйте движение при reduced motion.

`useMediaQuery(query, serverValue)` отслеживает media-query и предоставляет
стабильный fallback для SSR. Изменение reduced motion применяется без перезагрузки.

`LoadingText` показывает волну букв и пульсирующие точки. Скринридеру доступен
исходный текст целиком, при reduced motion надпись статична.

Dialog, Sheet и toast уже используют анимации shadcn/Radix/Sonner — второй
слой переходов им не нужен. Marquee, CustomCursor, MagneticButton, TextReveal
и TiltCard можно добавить отдельно, когда появится конкретное применение.
