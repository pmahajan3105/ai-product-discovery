// Layout constants for consistent styling

export enum FlexDirection {
  row = 'row',
  column = 'column',
  rowReverse = 'row-reverse',
  columnReverse = 'column-reverse',
}

export enum FlexJustify {
  start = 'flex-start',
  end = 'flex-end',
  center = 'center',
  between = 'space-between',
  around = 'space-around',
  evenly = 'space-evenly',
}

export enum FlexAlignItems {
  start = 'flex-start',
  end = 'flex-end',
  center = 'center',
  baseline = 'baseline',
  stretch = 'stretch',
}

export enum FlexWrap {
  nowrap = 'nowrap',
  wrap = 'wrap',
  wrapReverse = 'wrap-reverse',
}

export enum Position {
  static = 'static',
  relative = 'relative',
  absolute = 'absolute',
  fixed = 'fixed',
  sticky = 'sticky',
}

export enum Display {
  block = 'block',
  inline = 'inline',
  inlineBlock = 'inline-block',
  flex = 'flex',
  inlineFlex = 'inline-flex',
  grid = 'grid',
  none = 'none',
}