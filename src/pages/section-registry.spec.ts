import { SectionType } from '@prisma/client';
import { SECTION_REGISTRY, SECTION_TYPES, validateSectionData } from './section-registry';

/**
 * Pure unit tests for the folds validation engine — no database required.
 * These guard the contract the admin and frontend both depend on.
 */
describe('section registry', () => {
  it('defines every SectionType enum value', () => {
    for (const t of Object.values(SectionType)) {
      expect(SECTION_REGISTRY[t]).toBeDefined();
      expect(SECTION_REGISTRY[t].type).toBe(t);
    }
    expect(SECTION_TYPES.length).toBe(Object.values(SectionType).length);
  });

  it('accepts a valid hero payload', () => {
    const data = validateSectionData(SectionType.hero, {
      titleLines: ['Learn Today.', 'Lead Tomorrow.'],
      body: 'copy',
      primaryCta: { label: 'Register', href: '/register/' },
    });
    expect((data as any).titleLines).toHaveLength(2);
    // default applied
    expect((data as any).eyebrow).toBe('');
  });

  it('rejects a hero missing required titleLines', () => {
    expect(() => validateSectionData(SectionType.hero, { body: 'x' })).toThrow();
  });

  it('validates faq items', () => {
    expect(() =>
      validateSectionData(SectionType.faq, { title: 'FAQ', items: [] }),
    ).toThrow(); // min 1 item
    const ok = validateSectionData(SectionType.faq, {
      title: 'FAQ',
      items: [{ q: 'Q?', a: 'A.' }],
    });
    expect((ok as any).items).toHaveLength(1);
  });

  it('validates richText blocks against the shared block schema', () => {
    expect(() =>
      validateSectionData(SectionType.richText, { blocks: [{ type: 'code', code: 'x' }] }),
    ).toThrow(); // code block requires lang
    const ok = validateSectionData(SectionType.richText, {
      blocks: [{ type: 'code', lang: 'php', code: 'echo 1;' }],
    });
    expect((ok as any).blocks).toHaveLength(1);
  });

  it('marks reference-type sections with their collections', () => {
    expect(SECTION_REGISTRY.coursesGrid.refs).toContain('courses');
    expect(SECTION_REGISTRY.graduatesWall.refs).toContain('graduates');
    expect(SECTION_REGISTRY.blogPreview.refs).toContain('posts');
    expect(SECTION_REGISTRY.hero.refs).toHaveLength(0);
  });
});
