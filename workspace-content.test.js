const test = require('node:test');
const assert = require('node:assert/strict');
const { createDefaultWorkspaceContent, validateWorkspaceContent } = require('./workspace-content');

test('accepts the default content and valid owner edits', () => {
  const content = createDefaultWorkspaceContent();
  content.brand.name = 'My workspace';
  content.about.paragraph = 'Words written by the account owner.';

  assert.equal(validateWorkspaceContent(content), true);
});

test('rejects keys that are not part of the content contract', () => {
  const content = createDefaultWorkspaceContent();
  content.untrustedMarkup = '<script>alert(1)</script>';

  assert.equal(validateWorkspaceContent(content), false);
});

test('rejects missing, blank, and overlong content', () => {
  const missing = createDefaultWorkspaceContent();
  delete missing.brand.name;
  const blank = createDefaultWorkspaceContent();
  blank.brand.name = '  ';
  const overlong = createDefaultWorkspaceContent();
  overlong.brand.name = 'x'.repeat(501);

  assert.equal(validateWorkspaceContent(missing), false);
  assert.equal(validateWorkspaceContent(blank), false);
  assert.equal(validateWorkspaceContent(overlong), false);
});
