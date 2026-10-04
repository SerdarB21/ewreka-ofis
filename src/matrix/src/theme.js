// Ewreka teması: Univer'in varsayılan mavi birincil rengini Matrix yeşili (#2ECC8A) ile değiştirir.
import { defaultTheme } from '@univerjs/presets';

export const ewrekaTheme = {
  ...defaultTheme,
  primary: {
    50: '#EAFAF2',
    100: '#D3F5E5',
    200: '#A8EBCB',
    300: '#74DEAD',
    400: '#45D396',
    500: '#2ECC8A',
    600: '#1FAF74', // ana vurgu (düğmeler, seçim çerçevesi) — beyaz yazı için yeterli kontrast
    700: '#178F5E',
    800: '#12704A',
    900: '#0D5237',
  },
};
