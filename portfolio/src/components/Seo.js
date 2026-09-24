import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import projectData from '../projectData.json';

const SITE_URL = 'https://hillmanchan.com';
const DEFAULT_IMAGE = `${SITE_URL}/port_logo.png`;
const HOME_DESCRIPTION = 'Hillman Chan is a junior software engineer specialising in AI and full-stack development, with hands-on industry experience developing software and working with clients.';

const PAGE_METADATA = {
  '/': {
    title: 'Hillman Chan | Junior Software Engineer',
    description: HOME_DESCRIPTION,
  },
  '/about': {
    title: 'About | Hillman Chan',
    description: 'Learn about Hillman Chan, a junior software engineer with industry and client experience in AI and full-stack development.',
  },
  '/projects': {
    title: 'Projects | Hillman Chan',
    description: 'Explore software engineering projects by Hillman Chan across AI, full-stack applications, websites, and games.',
  },
  '/contact': {
    title: 'Contact | Hillman Chan',
    description: 'Contact Hillman Chan about software engineering opportunities, projects, and collaboration.',
  },
  '/my-offer': {
    title: 'My Offer | Hillman Chan',
    description: 'Explore ways to work with Hillman Chan on software development and learning.',
  },
  '/my-offer/coffee': {
    title: 'Buy Coffee | Hillman Chan',
    description: 'Support the work of software engineer Hillman Chan.',
  },
  '/my-offer/coaching': {
    title: 'Coaching | Hillman Chan',
    description: 'Learn about programming coaching from Hillman Chan.',
  },
  '/my-offer/services': {
    title: 'Services | Hillman Chan',
    description: 'Learn about software development services offered by Hillman Chan.',
  },
};

function setHeadElement(selector, create, attribute, value, restore) {
  const existing = document.head.querySelector(selector);
  const element = existing || create();
  const previous = existing?.getAttribute(attribute);
  if (!existing) document.head.appendChild(element);
  element.setAttribute(attribute, value);
  restore.push(() => {
    if (!existing) element.remove();
    else if (previous === null) element.removeAttribute(attribute);
    else element.setAttribute(attribute, previous);
  });
}

function setMeta(attribute, name, content, restore) {
  setHeadElement(
    `meta[${attribute}="${name}"]`,
    () => {
      const element = document.createElement('meta');
      element.setAttribute(attribute, name);
      return element;
    },
    'content',
    content,
    restore
  );
}

function Seo() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, '') || '/';
  const projectMatch = path.match(/^\/project\/([^/]+)$/);
  const project = projectMatch && projectData.find(({ id }) => String(id) === projectMatch[1]);
  const missingProject = Boolean(projectMatch && !project);
  const noindex = missingProject || project?.category === 'none' || path === '/my-offer';
  const metadata = project
    ? { title: `${project.title} | Hillman Chan`, description: project.shortDescription }
    : missingProject
      ? { title: 'Project Not Found | Hillman Chan', description: 'This project could not be found.' }
      : PAGE_METADATA[path] || PAGE_METADATA['/'];

  useEffect(() => {
    const previousTitle = document.title;
    const restore = [];
    const url = `${SITE_URL}${path}`;

    document.title = metadata.title;
    setMeta('name', 'description', metadata.description, restore);
    setMeta('property', 'og:title', metadata.title, restore);
    setMeta('property', 'og:description', metadata.description, restore);
    setMeta('property', 'og:type', 'website', restore);
    setMeta('property', 'og:url', url, restore);
    setMeta('property', 'og:image', DEFAULT_IMAGE, restore);
    setMeta('name', 'twitter:card', 'summary', restore);
    setMeta('name', 'twitter:title', metadata.title, restore);
    setMeta('name', 'twitter:description', metadata.description, restore);
    setMeta('name', 'twitter:image', DEFAULT_IMAGE, restore);
    setHeadElement(
      'link[rel="canonical"]',
      () => {
        const element = document.createElement('link');
        element.rel = 'canonical';
        return element;
      },
      'href',
      url,
      restore
    );
    if (noindex) setMeta('name', 'robots', 'noindex', restore);

    return () => {
      document.title = previousTitle;
      restore.reverse().forEach((undo) => undo());
    };
  }, [path, metadata.title, metadata.description, noindex]);

  return null;
}

export default Seo;
