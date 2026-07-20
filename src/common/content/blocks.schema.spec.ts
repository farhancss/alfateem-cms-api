import { blocksSchema } from './blocks.schema';

describe('blocks schema (XSS-safe structured content)', () => {
  it('accepts a well-formed body', () => {
    const parsed = blocksSchema.parse([
      { type: 'h2', text: 'Heading' },
      { type: 'p', text: 'Paragraph' },
      { type: 'ul', items: ['one', 'two'] },
      { type: 'code', lang: 'ts', code: 'const x = 1;' },
    ]);
    expect(parsed).toHaveLength(4);
  });

  it('rejects an unknown block type', () => {
    expect(() => blocksSchema.parse([{ type: 'script', text: 'alert(1)' }])).toThrow();
  });

  it('rejects an empty body', () => {
    expect(() => blocksSchema.parse([])).toThrow();
  });

  it('rejects a list with no items', () => {
    expect(() => blocksSchema.parse([{ type: 'ul', items: [] }])).toThrow();
  });
});
