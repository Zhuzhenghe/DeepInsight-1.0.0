import axios from 'axios';
import { getSearxngApiEndpoint } from './config';

interface SearxngSearchOptions {
  categories?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
}

interface SearxngSearchResult {
  title: string;
  url: string;
  img_src?: string;
  thumbnail_src?: string;
  thumbnail?: string;
  content?: string;
  author?: string;
  iframe_src?: string;
}

export const searchSearxng = async (
  query: string,
  opts?: SearxngSearchOptions,
) => {
  const searxngURL = getSearxngApiEndpoint();
  
  console.log('=== SEARXNG SEARCH ===');
  console.log('SearXNG URL from config:', searxngURL);
  console.log('Query:', query);
  console.log('Options:', opts);

  // 验证 URL 是否有效
  if (!searxngURL) {
    console.error('SearXNG API endpoint is not configured');
    throw new Error('SearXNG API endpoint is not configured');
  }

  // 确保 URL 有效
  let url: URL;
  try {
    // 如果 searxngURL 没有协议，添加 http://
    const urlString = searxngURL.startsWith('http') ? searxngURL : `http://${searxngURL}`;
    url = new URL(`${urlString}/search?format=json`);
    console.log('Final search URL:', url.toString());
  } catch (error) {
    console.error('Invalid SearXNG URL:', searxngURL, error);
    throw new Error(`Invalid SearXNG URL: ${searxngURL}`);
  }

  url.searchParams.append('q', query);

  if (opts) {
    Object.keys(opts).forEach((key) => {
      const value = opts[key as keyof SearxngSearchOptions];
      if (Array.isArray(value)) {
        url.searchParams.append(key, value.join(','));
        return;
      }
      url.searchParams.append(key, value as string);
    });
  }

  try {
    console.log('Making request to:', url.toString());
    const res = await axios.get(url.toString(), {
      timeout: 10000, // 10 second timeout
    });
    
    console.log('Response status:', res.status);
    console.log('Response data keys:', Object.keys(res.data));
    console.log('Results count:', res.data.results?.length || 0);
    
    const results: SearxngSearchResult[] = res.data.results || [];
    const suggestions: string[] = res.data.suggestions || [];

    // 检查结果中是否有缩略图
    const resultsWithThumbnails = results.filter(r => r.thumbnail || r.thumbnail_src || r.img_src);
    console.log('Results with thumbnails:', resultsWithThumbnails.length);
    
    if (resultsWithThumbnails.length > 0) {
      console.log('Sample result with thumbnail:', resultsWithThumbnails[0]);
    }

    return { results, suggestions };
  } catch (error) {
    console.error('SearXNG request failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        code: error.code,
        message: error.message,
        response: error.response?.status,
        responseData: error.response?.data
      });
    }
    throw error;
  }
};
