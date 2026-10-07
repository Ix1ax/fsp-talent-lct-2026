import { describe, expect, it } from 'vitest';

import { createEmployerDemoGateway } from '../createEmployerDemoGateway';
const companyId = '00000000-0000-4000-8000-000000000001';
const needId = '00000000-0000-4000-8000-000000000014';
describe('изолированный адаптер демонстрации', () => {
  it('редактирование одной демо-сессии не меняет другую', async () => {
    const first = createEmployerDemoGateway();
    const second = createEmployerDemoGateway();
    await first.updateNeed(companyId, needId, {
      title: 'Изменённый бриф',
      salaryFromRub: 0,
      salaryToRub: null,
    });
    expect(await first.need(companyId, needId)).toMatchObject({
      title: 'Изменённый бриф',
      salaryFromRub: 0,
      salaryToRub: null,
    });
    expect((await second.need(companyId, needId)).title).toBe(
      'Frontend-разработчик в команду платформы',
    );
  });
  it('архив и восстановление отражаются в списках моков', async () => {
    const api = createEmployerDemoGateway();
    await api.archiveNeed(companyId, needId);
    expect(
      (await api.needs(companyId, 'active', 0)).items.some(
        (need) => need.id === needId,
      ),
    ).toBe(false);
    expect(
      (await api.needs(companyId, 'archived', 0)).items.some(
        (need) => need.id === needId,
      ),
    ).toBe(true);
    await api.updateNeed(companyId, needId, { status: 'draft' });
    expect(
      (await api.needs(companyId, 'draft', 0)).items.some(
        (need) => need.id === needId,
      ),
    ).toBe(true);
  });
  it('ошибка сохранения не меняет мок и при перезагрузке фабрика восстанавливает данные', async () => {
    const api = createEmployerDemoGateway('save-error');
    await expect(
      api.updateNeed(companyId, needId, { title: 'Не сохранилось' }),
    ).rejects.toThrow('Демонстрация ошибки сохранения');
    expect((await api.need(companyId, needId)).title).toBe(
      'Frontend-разработчик в команду платформы',
    );
  });
});
