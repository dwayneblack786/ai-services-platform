import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import router from '../../src/routes/prompt-management-routes';
import PromptVersion from '../../src/models/PromptVersion';

const app = express();
app.use(express.json());
app.use((req: any, _res, next) => {
  req.user = { sub: 'test-user', name: 'Test', email: 'test@test.com', role: 'ADMIN' };
  req.session = { id: 'test-session' };
  next();
});
app.use('/api/prompts', router);

const validContent = {
  systemPrompt: 'Be helpful',
  persona: { tone: 'warm', personality: 'friendly', allowedActions: [], disallowedActions: [] },
  businessContext: { servicesOffered: ['support'] },
  conversationBehavior: { greeting: 'Hello!', fallbackMessage: 'Sorry' },
  constraints: { prohibitedTopics: [] }
};

describe('Phase 1 Gate: API Layer', () => {
  test('1. POST /drafts creates a draft and returns 201', async () => {
    const res = await request(app).post('/api/prompts/drafts').send({
      name: 'API Draft',
      channelType: 'voice',
      tenantId: 'tenant1',
      productId: new mongoose.Types.ObjectId().toString(),
      content: validContent
    });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('API Draft');
    expect(res.body.state).toBe('draft');
    expect(res.body.isActive).toBe(false);
  });

  test('2. POST /drafts returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/prompts/drafts').send({
      name: 'Missing channel'
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing required fields/i);
  });

  test('3. GET /:id returns the prompt; GET with bad id returns 404', async () => {
    const createRes = await request(app).post('/api/prompts/drafts').send({
      name: 'Get Test',
      channelType: 'chat',
      tenantId: 'tenant1',
      content: validContent
    });
    const id = createRes.body._id;

    const res = await request(app).get(`/api/prompts/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Get Test');

    const badRes = await request(app).get('/api/prompts/507f1f77bcf86cd799439011');
    expect(badRes.status).toBe(404);
  });

  test('4. PUT /:id updates prompt content', async () => {
    const createRes = await request(app).post('/api/prompts/drafts').send({
      name: 'Update Test',
      channelType: 'voice',
      tenantId: 'tenant1',
      content: validContent
    });
    const id = createRes.body._id;

    const res = await request(app).put(`/api/prompts/${id}`).send({
      content: { ...validContent, systemPrompt: 'Updated via API' }
    });

    expect(res.status).toBe(200);
    expect(res.body.content.systemPrompt).toBe('Updated via API');
  });

  test('5. DELETE /:id deletes a draft (204) but rejects non-drafts (400)', async () => {
    const createRes = await request(app).post('/api/prompts/drafts').send({
      name: 'Delete Me',
      channelType: 'voice',
      tenantId: 'tenant1',
      content: validContent
    });
    const id = createRes.body._id;

    const delRes = await request(app).delete(`/api/prompts/${id}`);
    expect(delRes.status).toBe(204);

    const getRes = await request(app).get(`/api/prompts/${id}`);
    expect(getRes.status).toBe(404);

    // Production prompt -> should fail with 400
    const prodPrompt = await PromptVersion.create({
      promptId: new mongoose.Types.ObjectId(),
      name: 'Production',
      tenantId: 'tenant1',
      productId: new mongoose.Types.ObjectId(),
      channelType: 'voice',
      version: 1,
      state: 'production',
      environment: 'production',
      isActive: true,
      createdBy: { userId: 'u1', name: 'T', email: 't@t.com', role: 'ADMIN' },
      content: validContent
    });
    const delProdRes = await request(app).delete(`/api/prompts/${prodPrompt._id}`);
    expect(delProdRes.status).toBe(400);
  });
});
