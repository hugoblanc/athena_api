import { classifyPlatform } from './client-platform';

/**
 * UA réels observés en prod (tronqués). Le WebView iOS est indistinguable de
 * Safari mobile par l'UA seule : seule l'origine `capacitor://localhost` permet
 * de trancher — d'où l'intérêt de lire l'en-tête `origin`.
 */
const UA = {
  androidWebview:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36; wv)',
  iosWebview:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  googlebot:
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  node: 'node',
  axios: 'axios/1.6.0',
};

describe('classifyPlatform', () => {
  describe('app native', () => {
    it('Android : origine https://localhost → android_app', () => {
      expect(
        classifyPlatform('https://localhost/', UA.androidWebview, 'https://localhost'),
      ).toBe('android_app');
    });

    it('Android : UA WebView `; wv)` sans referer → android_app', () => {
      expect(classifyPlatform('', UA.androidWebview, '')).toBe('android_app');
    });

    it('iOS : Origin capacitor://localhost SANS referer → ios_app (le fix)', () => {
      expect(
        classifyPlatform('', UA.iosWebview, 'capacitor://localhost'),
      ).toBe('ios_app');
    });

    it('iOS : referer capacitor:// (fallback) → ios_app', () => {
      expect(
        classifyPlatform('capacitor://localhost/', UA.iosWebview, ''),
      ).toBe('ios_app');
    });
  });

  describe('surfaces web connues', () => {
    it('PWA via origin athena-app.xyz → pwa', () => {
      expect(
        classifyPlatform('', UA.androidChrome, 'https://athena-app.xyz'),
      ).toBe('pwa');
    });

    it('PWA via referer athena-app.xyz → pwa', () => {
      expect(
        classifyPlatform('https://athena-app.xyz/feed', UA.desktopChrome, ''),
      ).toBe('pwa');
    });

    it('ancienne webapp Angular → webapp', () => {
      expect(
        classifyPlatform('https://webapp.athena-app.fr/', UA.desktopChrome, ''),
      ).toBe('webapp');
    });
  });

  describe('navigateur non rattaché (ex-« other »)', () => {
    it('mobile sans origine connue → mobile_web (plus « other »)', () => {
      expect(classifyPlatform('', UA.androidChrome, '')).toBe('mobile_web');
    });

    it('iPhone Safari sans origine capacitor → mobile_web', () => {
      // Indistinguable d'une app iOS qui ne renverrait ni origin ni referer :
      // ce résiduel est assumé, il n'est pas classé « other ».
      expect(classifyPlatform('', UA.iosWebview, '')).toBe('mobile_web');
    });

    it('desktop sans origine connue → desktop_web', () => {
      expect(classifyPlatform('', UA.desktopChrome, '')).toBe('desktop_web');
    });
  });

  describe('bots / outils / interne : jamais comptés', () => {
    it.each([
      ['Googlebot', UA.googlebot],
      ['node interne', UA.node],
      ['axios', UA.axios],
      ['UA vide', ''],
    ])('%s → null', (_label, ua) => {
      expect(classifyPlatform('', ua, '')).toBeNull();
    });
  });
});
