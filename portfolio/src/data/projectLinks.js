const GAME_SUBDOMAIN_SLUGS = new Set(['chat-box', 'prompt-hunter', 'card-game', 'dream-record', 'casino-game', 'system-design', 'connect4', 'card-drawer', 'da-siu-yan', 'math-memory', 'siu-hei-bou', 'rubiks-cube-practice']);

/**
 * Builds the subdomain URL for a game based on current hostname.
 * In development (localhost), returns path-based URL as fallback.
 * In production, returns full subdomain URL (e.g., prompt-hunter.hillmanchan.com)
 */
const buildGameSubdomainUrl = (gameSlug) => {
  if (typeof window === 'undefined') {
    return `/${gameSlug}`;
  }

  const hostname = window.location.hostname.toLowerCase();
  const protocol = window.location.protocol;

  // Development mode: use path-based routing
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `/${gameSlug}`;
  }

  // Check if we're already on a game subdomain
  const hostParts = hostname.split('.');
  if (hostParts.length > 2 && GAME_SUBDOMAIN_SLUGS.has(hostParts[0])) {
    // Already on a subdomain, extract base domain (e.g., hillmanchan.com)
    const baseDomain = hostParts.slice(1).join('.');
    return `${protocol}//${gameSlug}.${baseDomain}`;
  }

  // On main domain (e.g., hillmanchan.com), build subdomain URL
  return `${protocol}//${gameSlug}.${hostname}`;
};

const buildContactDemoUrl = (projectName) => {
  const name = projectName.trim();
  const message = `Hi Hillman, I'd like to try the demo for "${name}". Could you let me know how I can access it? Thanks!`;
  const params = new URLSearchParams({ project: name, message });
  return `/contact?${params.toString()}`;
};

export const resolveDemoLink = (demoUrl) => {
  const empty = { url: null, isInternal: false, isGameSubdomain: false, subdomainUrl: null, isContactLink: false };

  if (!demoUrl || demoUrl === 'no-demo-url') {
    return empty;
  }

  const trimmed = demoUrl.trim();
  if (!trimmed) {
    return empty;
  }

  if (trimmed.toLowerCase().startsWith('contact:')) {
    const projectName = trimmed.slice('contact:'.length).trim();
    if (!projectName) {
      return empty;
    }
    return {
      url: buildContactDemoUrl(projectName),
      isInternal: true,
      isGameSubdomain: false,
      subdomainUrl: null,
      isContactLink: true,
    };
  }

  if (trimmed.startsWith('/')) {
    const normalized = trimmed.slice(1);
    if (GAME_SUBDOMAIN_SLUGS.has(normalized)) {
      return {
        url: trimmed,
        isInternal: true,
        isGameSubdomain: true,
        subdomainUrl: buildGameSubdomainUrl(normalized),
        isContactLink: false,
      };
    }
    return { url: trimmed, isInternal: true, isGameSubdomain: false, subdomainUrl: null, isContactLink: false };
  }

  const normalized = trimmed;
  if (GAME_SUBDOMAIN_SLUGS.has(normalized)) {
    return {
      url: `/${normalized}`,
      isInternal: true,
      isGameSubdomain: true,
      subdomainUrl: buildGameSubdomainUrl(normalized),
      isContactLink: false,
    };
  }

  return { url: trimmed, isInternal: false, isGameSubdomain: false, subdomainUrl: null, isContactLink: false };
};
