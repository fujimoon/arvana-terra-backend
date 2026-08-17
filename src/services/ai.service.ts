import { OpenAI } from 'openai';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class AIService {
  async suggestTasks(userId: string, context: {
    propertyId?: string;
    landId?: string;
  }): Promise<Array<{ title: string; description: string; priority: string; reason: string }>> {
    const contextParts: string[] = [];

    if (context.propertyId) {
      const property = await prisma.property.findFirst({
        where: { id: context.propertyId, ownerId: userId },
        include: {
          rooms: { include: { tenant: true } },
          equipment: { where: { status: { in: ['warning', 'broken'] } } },
        },
      });
      if (property) {
        const vacantRooms = property.rooms.filter((r) => r.status === 'vacant').length;
        const problematicEquipment = property.equipment.length;
        contextParts.push(
          `物件: ${property.name}\n` +
          `空室数: ${vacantRooms}\n` +
          `要対応設備数: ${problematicEquipment}\n` +
          `物件ステータス: ${property.status}`
        );
      }
    }

    if (context.landId) {
      const land = await prisma.land.findFirst({
        where: { id: context.landId, ownerId: userId },
      });
      if (land) {
        contextParts.push(`土地: ${land.name}, ステータス: ${land.status}`);
      }
    }

    // Get existing tasks
    const existingTasks = await prisma.task.findMany({
      where: { ownerId: userId, status: { in: ['todo', 'in_progress'] } },
      select: { title: true, status: true, priority: true },
      take: 20,
    });
    if (existingTasks.length > 0) {
      contextParts.push(
        `既存タスク:\n${existingTasks.map((t) => `- ${t.title} (${t.status}, ${t.priority})`).join('\n')}`
      );
    }

    const contextText = contextParts.join('\n\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは不動産管理の専門家AIアシスタントです。提供された物件・土地情報を分析し、オーナーが実施すべきタスクを日本語で提案してください。
          必ずJSON形式で返答: { "tasks": [{ "title": "", "description": "", "priority": "low|medium|high|urgent", "reason": "" }] }
          最大5件のタスクを提案してください。`,
        },
        {
          role: 'user',
          content: `以下の情報に基づいてタスクを提案してください:\n\n${contextText}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    try {
      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return result.tasks || [];
    } catch {
      logger.error('Failed to parse AI task suggestions');
      return [];
    }
  }

  async analyzeAssetValuation(userId: string, landIds: string[], propertyIds: string[]): Promise<{
    totalCurrentValue: number;
    aiPredictedValue: number;
    predictionYear: number;
    breakdown: Record<string, unknown>;
    aiAnalysis: string;
  }> {
    const [lands, properties] = await Promise.all([
      prisma.land.findMany({
        where: { id: { in: landIds }, ownerId: userId },
        select: { id: true, name: true, area: true, currentValue: true, address: true, status: true },
      }),
      prisma.property.findMany({
        where: { id: { in: propertyIds }, ownerId: userId },
        include: {
          rooms: { include: { tenant: true } },
        },
      }),
    ]);

    const totalCurrentValue =
      lands.reduce((sum, l) => sum + (l.currentValue || 0), 0) +
      properties.reduce((sum, p) => sum + (p.currentValue || 0), 0);

    const contextText = [
      `土地:\n${lands.map((l) => `- ${l.name}: 面積${l.area}㎡, 評価額${l.currentValue || '不明'}円, ${l.address}`).join('\n')}`,
      `物件:\n${properties.map((p) => {
        const occupiedRooms = p.rooms.filter((r) => r.status === 'occupied').length;
        const monthlyRent = p.rooms.reduce((sum, r) => sum + (r.rentPrice || 0), 0);
        return `- ${p.name}: 評価額${p.currentValue || '不明'}円, 稼働率${p.rooms.length > 0 ? Math.round((occupiedRooms / p.rooms.length) * 100) : 0}%, 月額賃料合計${monthlyRent}円`;
      }).join('\n')}`,
    ].join('\n\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは不動産資産評価の専門家です。提供された不動産情報を分析し、将来価値予測と分析レポートを日本語で作成してください。
          JSON形式で返答: { "aiPredictedValue": 数値, "predictionYear": 年, "breakdown": {}, "aiAnalysis": "詳細分析テキスト" }`,
        },
        {
          role: 'user',
          content: `以下の不動産ポートフォリオを分析してください:\n\n現在評価総額: ${totalCurrentValue}円\n\n${contextText}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    try {
      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return {
        totalCurrentValue,
        aiPredictedValue: result.aiPredictedValue || totalCurrentValue,
        predictionYear: result.predictionYear || new Date().getFullYear() + 5,
        breakdown: result.breakdown || {},
        aiAnalysis: result.aiAnalysis || '',
      };
    } catch {
      logger.error('Failed to parse AI valuation');
      return {
        totalCurrentValue,
        aiPredictedValue: totalCurrentValue,
        predictionYear: new Date().getFullYear() + 5,
        breakdown: {},
        aiAnalysis: '分析に失敗しました',
      };
    }
  }

  async analyzeOpportunity(opportunity: {
    title: string;
    description?: string;
    type: string;
    location?: string;
    estimatedValue?: number;
  }): Promise<string> {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは不動産投資分析の専門家です。ビジネスチャンスを分析し、リスク・メリット・推奨アクションを日本語でまとめてください。`,
        },
        {
          role: 'user',
          content: `以下のビジネスチャンスを分析してください:\n\nタイトル: ${opportunity.title}\n種類: ${opportunity.type}\n場所: ${opportunity.location || '不明'}\n概算価値: ${opportunity.estimatedValue ? opportunity.estimatedValue + '円' : '不明'}\n詳細: ${opportunity.description || 'なし'}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content || '';
  }
}

export const aiService = new AIService();
