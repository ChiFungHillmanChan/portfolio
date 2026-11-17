import { experience } from './career';
import projectData from '../projectData.json';

const textOf = (role) => [role.title, role.company, role.location, ...role.description, ...role.skills].join(' ');

describe('career content', () => {
  const clientRole = experience.find((role) => role.company === 'Client Projects');

  test('lists the client projects entry with the combined project value', () => {
    expect(clientRole).toMatchObject({
      title: 'Freelance Software Engineer',
      start_date: 'October 2025',
      end_date: 'Present',
    });
    expect(textOf(clientRole)).toContain('HK$500,000');
    expect(textOf(clientRole)).toContain('5+');
  });

  test('keeps client work generic: no confidentiality labels or links', () => {
    const text = textOf(clientRole);
    expect(text).not.toMatch(/\bNDA\b/);
    expect(text).not.toMatch(/https?:|www\.|\.com\b|\.co\.uk\b/);
  });

  test('gives every role a unique company, which the 3D room uses as its list key', () => {
    const companies = experience.map((role) => role.company);
    expect(new Set(companies).size).toBe(companies.length);
  });

  test('describes the JARVIS AI Limited programme stages without the unsupported credit figure', () => {
    const jarvis = experience.find((role) => role.company === 'JARVIS AI Limited');
    const jarvisProject = projectData.find((project) => project.id === 17);

    expect(textOf(jarvis)).toMatch(/Gold/);
    expect(textOf(jarvis)).toMatch(/Incubation/);
    expect(jarvisProject.fullDescription).toMatch(/Incubation/);
    experience.forEach((role) => expect(textOf(role)).not.toContain('US$25,000'));
    expect(JSON.stringify(projectData)).not.toContain('US$25,000');
  });
});
