/** Public assets (filenames include spaces). */
export const BACKGROUND_HOME = '/Background%201.webp'
export const BACKGROUND_HOME_COPY = '/Background%20copy.webp'
export const BACKGROUND_TOP = '/Background%202.webp'
export const BACKGROUND_CUSTOM = '/Background%203.webp'
export const BACKGROUND_MEALS = '/Meals.webp'

const PROFILE_PAGE_BACKGROUND = {
  src: BACKGROUND_HOME,
  overlay: 'bg-background/94',
  imageClassName: 'opacity-[0.08]',
}

/** Full-page background (workout, profile). */
export function getPageBackground(pathname) {
  if (pathname === '/profile' || pathname.startsWith('/profile/')) {
    return PROFILE_PAGE_BACKGROUND
  }
  return null
}

/** Top banner only (report, custom, meals). */
export function getPageTopBanner(pathname) {
  switch (pathname) {
    case '/':
      return BACKGROUND_HOME_COPY
    case '/report':
      return BACKGROUND_TOP
    case '/exercises':
      return BACKGROUND_CUSTOM
    case '/meal-plan':
      return BACKGROUND_MEALS
    default:
      return null
  }
}
