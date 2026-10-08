import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { ProfileStepActions } from '../ProfileStepActions';

const renderActions = (
  profileExists: boolean,
  processing = false,
  busy = false,
) =>
  renderToString(
    createElement(ProfileStepActions, {
      step: 'consents',
      profileExists,
      processing,
      busy,
      onStepChange: vi.fn(),
    }),
  );

describe('consent step navigation', () => {
  it('allows continuing to an existing profile after processing is revoked', () => {
    expect(renderActions(true)).not.toContain('disabled=""');
    expect(renderActions(true)).toContain('Опыт и образование доступны');
  });
  it('requires processing consent before creating a new profile', () => {
    expect(renderActions(false)).toContain('disabled=""');
    expect(renderActions(false, true)).not.toContain('disabled=""');
  });
  it('blocks step navigation while a mutation is in progress', () => {
    expect(renderActions(true, true, true)).toContain('disabled=""');
  });
});
