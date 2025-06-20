interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * 统一的 API 请求客户端
 * 自动添加认证头和处理错误
 */
export async function apiClient(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipAuth = false, headers = {}, ...restOptions } = options;

  // 默认请求头（如果没有提供 headers 或 headers 中没有 Content-Type）
  const defaultHeaders: Record<string, string> = {};

  // 处理传入的 headers
  if (headers) {
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        defaultHeaders[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        defaultHeaders[key] = value;
      });
    } else {
      Object.assign(defaultHeaders, headers);
    }
  }

  // 如果不跳过认证，添加 Authorization 头
  if (!skipAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...restOptions,
    headers: defaultHeaders,
  });

  // 如果是 401 错误，可能是 token 过期，跳转到登录页
  if (response.status === 401 && !skipAuth) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  return response;
}

/**
 * 便捷方法：GET 请求
 */
export async function apiGet(url: string, options?: FetchOptions) {
  return apiClient(url, { ...options, method: 'GET' });
}

/**
 * 便捷方法：POST 请求
 */
export async function apiPost(url: string, body?: any, options?: FetchOptions) {
  // 如果 body 是 FormData，不要设置 Content-Type，让浏览器自动设置
  const isFormData = body instanceof FormData;
  const headers = isFormData 
    ? { ...options?.headers } 
    : { 'Content-Type': 'application/json', ...options?.headers };
  
  return apiClient(url, {
    ...options,
    method: 'POST',
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  });
}

/**
 * 便捷方法：PUT 请求
 */
export async function apiPut(url: string, body?: any, options?: FetchOptions) {
  return apiClient(url, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * 便捷方法：DELETE 请求
 */
export async function apiDelete(url: string, options?: FetchOptions) {
  return apiClient(url, { ...options, method: 'DELETE' });
} 