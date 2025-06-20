import db from '@/lib/db';
import { chats } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/jwt';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export const GET = async (req: Request) => {
  try {
    // 验证用户身份
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
      return Response.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    // 只获取当前用户的聊天记录
    let userChats = await db.query.chats.findMany({
      where: eq(chats.userId, payload.id)
    });
    userChats = userChats.reverse();
    
    return Response.json({ chats: userChats }, { status: 200 });
  } catch (err) {
    console.error('Error in getting chats: ', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};
