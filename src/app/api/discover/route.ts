import { searchSearxng } from '@/lib/searxng';

// 强制动态渲染
export const dynamic = 'force-dynamic';

const articleWebsites = [
  // 中文科技媒体
  '36kr.com',
  'ithome.com',
  'cnbeta.com',
  'pingwest.com',
  'huxiu.com',
  // 英文科技媒体
  'techcrunch.com',
  'wired.com',
  'theverge.com',
];

const topics = [
  // 中文关键词
  '人工智能', 'AI', '科技', '技术', '互联网',
  // 英文关键词
  'artificial intelligence', 'technology', 'tech'
]; /* TODO: Add UI to customize this */

export const GET = async (req: Request) => {
  try {
    console.log('=== DISCOVER API START ===');
    console.log('Article websites:', articleWebsites);
    console.log('Topics:', topics);
    
    // 获取用户语言偏好（从请求头或查询参数）
    const url = new URL(req.url);
    const userLang = url.searchParams.get('lang') || 'zh';
    const isChineseUser = userLang === 'zh' || userLang === 'zh-CN';
    
    console.log('User language preference:', userLang, 'Is Chinese:', isChineseUser);
    
    // 根据用户语言偏好筛选搜索主题
    const relevantTopics = isChineseUser 
      ? topics.filter(topic => /[\u4e00-\u9fff]/.test(topic)) // 仅中文主题
      : topics.filter(topic => !/[\u4e00-\u9fff]/.test(topic)); // 仅英文主题
    
    console.log('Selected topics for user:', relevantTopics);
    
    const searchPromises = relevantTopics.map(async (topic) => {
        // 根据关键词是否为中文调整搜索策略
        const isChinese = /[\u4e00-\u9fff]/.test(topic);
        const query = isChinese ? `${topic} 新闻 最新` : `${topic} news latest`;
        
        console.log(`Searching: ${query} (Chinese: ${isChinese})`);
        
        try {
          const result = await searchSearxng(query, {
            engines: ['google', 'duckduckgo', 'brave'],
            categories: ['news'],
            language: isChineseUser ? 'zh-CN' : 'en',
            pageno: 1,
          });
          console.log(`Results for "${query}":`, result.results?.length || 0, 'items');
          return result.results;
        } catch (error) {
          console.error(`Error searching "${query}":`, error);
          return [];
        }
      });
      
    const allResults = await Promise.all(searchPromises);
    let data = allResults
      .flat()
      .filter(result => {
        if (!result || !result.title || !result.url) return false;
        
        // 检查是否有有效的缩略图
        const hasThumbnail = result.thumbnail || result.thumbnail_src || result.img_src;
        if (!hasThumbnail) return false;
        
        // 规范化缩略图字段
        if (!result.thumbnail && result.thumbnail_src) {
          result.thumbnail = result.thumbnail_src;
        } else if (!result.thumbnail && result.img_src) {
          result.thumbnail = result.img_src;
        }
        
        // 验证缩略图URL
        try {
          if (result.thumbnail) {
            new URL(result.thumbnail);
            return true;
          }
          return false;
        } catch (error) {
          console.warn('Invalid thumbnail URL:', result.thumbnail);
          return false;
        }
      }); // 基本过滤 + 缩略图验证
      
    console.log('Total results before language filtering:', data.length);
    
    // 根据语言偏好严格过滤结果
    if (isChineseUser) {
      // 中文用户：仅显示包含中文的内容
      data = data.filter(result => {
        const title = result.title || '';
        const content = result.content || '';
        const hasChinese = /[\u4e00-\u9fff]/.test(title + content);
        return hasChinese;
      });
    } else {
      // 英文用户：仅显示英文内容
      data = data.filter(result => {
        const title = result.title || '';
        const content = result.content || '';
        const hasChinese = /[\u4e00-\u9fff]/.test(title + content);
        return !hasChinese; // 排除中文内容
      });
    }
    
    // 随机排序
    data = data.sort(() => Math.random() - 0.5);
      
    console.log('Total results after language filtering:', data.length);
    console.log('Sample result:', data[0]);

    return Response.json(
      {
        blogs: data,
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    console.error(`An error occurred in discover route: ${err}`);
    
    // 根据错误类型返回更具体的错误信息
    let errorMessage = 'An error has occurred';
    
    if (err.message?.includes('SearXNG API endpoint is not configured')) {
      errorMessage = 'SearXNG search service is not configured';
    } else if (err.message?.includes('Invalid SearXNG URL')) {
      errorMessage = 'SearXNG configuration is invalid';
    } else if (err.message?.includes('Network')) {
      errorMessage = 'Network connection failed';
    } else if (err.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to search service';
    }
    
    return Response.json(
      {
        message: errorMessage,
        details: err.message,
      },
      {
        status: 500,
      },
    );
  }
};
