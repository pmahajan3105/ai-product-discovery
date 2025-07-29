// Zeda's actual color system - extracted from their theme/v2/colors.ts
export const Colors = {
  // Grays (Zeda's exact values)
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  grey25: '#FCFCFD',
  grey50: '#F9FAFB',
  grey100: '#F2F4F7',
  grey200: '#EAECF0',
  grey300: '#D0D5DD',
  grey400: '#98A2B3',
  grey500: '#667085',
  grey600: '#475467',
  grey700: '#344054',
  grey800: '#1D2939',
  grey900: '#101828',

  // Primary (Zeda's exact purple-blue)
  primary25: '#F6F7FF',
  primary50: '#DCE1F9',
  primary100: '#CBD2F6',
  primary200: '#BAC3F3',
  primary300: '#A8B3F0',
  primary400: '#96A3ED',
  primary500: '#8594EA',
  primary600: '#5E72E4',
  primary700: '#3F57DE',
  primary800: '#2E48DC',
  primary900: '#233ED1',

  // Success (Zeda's greens)
  success25: '#F6FEF9',
  success50: '#ECFDF3',
  success100: '#D1FADF',
  success200: '#A6F4C5',
  success300: '#6CE9A6',
  success400: '#32D583',
  success500: '#12B76A',
  success600: '#039855',
  success700: '#027A48',
  success800: '#05603A',
  success900: '#054F31',

  // Warning (Zeda's yellows/oranges)
  warning25: '#FFFCF5',
  warning50: '#FFFAEB',
  warning100: '#FEF0C7',
  warning200: '#FEDF89',
  warning300: '#FEC84B',
  warning400: '#FDB022',
  warning500: '#F79009',
  warning600: '#DC6803',
  warning700: '#B54708',
  warning800: '#93370D',
  warning900: '#7A2E0E',

  // Error (Zeda's reds)
  error25: '#FFFBFA',
  error50: '#FEF3F2',
  error100: '#FEE4E2',
  error200: '#FEE4E2',
  error300: '#FDA29B',
  error400: '#F97066',
  error500: '#F04438',
  error600: '#D92D20',
  error700: '#B42318',
  error800: '#912018',
  error900: '#7A271A',

  // Info (Zeda's blues)
  info25: '#F5FAFF',
  info50: '#EFF8FF',
  info100: '#D1E9FF',
  info200: '#B2DDFF',
  info300: '#84CAFF',
  info400: '#53B1FD',
  info500: '#2E90FA',
  info600: '#1570EF',
  info700: '#175CD3',
  info800: '#1849A9',
  info900: '#194185',

  // Orange (for high priority)
  orange25: '#FFFAF5',
  orange50: '#FFF6ED',
  orange100: '#FFEAD5',
  orange200: '#FDDCAB',
  orange300: '#FEB273',
  orange400: '#FD853A',
  orange500: '#FB6514',
  orange600: '#EC4A0A',
  orange700: '#C4320A',
  orange800: '#9C2A10',
  orange900: '#7E2410',

  // Purple (for other use cases)
  purple25: '#FAFAFF',
  purple50: '#F4F3FF',
  purple100: '#EBE9FE',
  purple200: '#D9D6FE',
  purple300: '#BDB4FE',
  purple400: '#9B8AFB',
  purple500: '#7A5AF8',
  purple600: '#6938EF',
  purple700: '#5925DC',
  purple800: '#4A1FB8',
  purple900: '#3E1C96',

  // Zeda-specific secondary colors
  successSecondary: '#ECF9F2',
  warningSecondary: '#FDFAED',
  errorSecondary: '#FAEEEC',
  infoSecondary: '#E2F3FF',
  
  textHeadline: '#333333',
} as const;

export enum ColorFamily {
  grey = 'grey',
  primary = 'primary',
  error = 'error',
  warning = 'warning',
  info = 'info',
  success = 'success',
  orange = 'orange',
  purple = 'purple',
}

export enum FontSize {
  xs = '12px',
  sm = '14px',
  base = '16px',
  lg = '18px',
  xl = '20px',
  '2xl' = '24px',
  '3xl' = '30px',
  '4xl' = '36px',
}

export enum FontWeight {
  light = '300',
  normal = '400',
  medium = '500',
  semibold = '600',
  bold = '700',
}

export type ColorKey = keyof typeof Colors;